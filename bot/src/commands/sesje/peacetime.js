// Komenda slash /peacetime
// Ustawia tryb peacetime na serwerze RP
// Dostępna tylko dla Host+

const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');
const logger = require('../../utils/logger');
const { hasRole, ROLES, noPermissionReply } = require('../../utils/permissions');

// Nazwy kanałów
const RP_ANNOUNCEMENTS_CHANNEL = 'ogłoszenia-roleplay';

// Konfiguracja trybów peacetime
const PEACETIME_CONFIG = {
  '1': {
    level:       1,
    topic:       '⚠️ PEACETIME 1° — Zakaz akcji Crime i ucieczki przed policją',
    label:       '⚠️ PEACETIME 1°',
    color:       0xFEE75C, // Żółty
    description: '**Zakaz akcji Crime** oraz **ucieczki przed policją**.\nWszystkie inne zasady RP obowiązują normalnie.',
    rules: [
      '🚫 Zakaz organizowania akcji kryminalnych (napady, rozboje itp.)',
      '🚫 Zakaz ucieczki przed funkcjonariuszami policji',
      '✅ Normalny ruch drogowy i inne aktywności RP dozwolone',
    ],
  },
  '2': {
    level:       2,
    topic:       '🚨 PEACETIME 2° — PEACETIME 1° + Void wypadków + limit FRP 70 mph',
    label:       '🚨 PEACETIME 2°',
    color:       0xED4245, // Czerwony
    description: 'Wszystkie zasady **PEACETIME 1°** oraz dodatkowo:\n**Void wypadków** i **limit prędkości FRP 70 mph**.',
    rules: [
      '🚫 Zakaz akcji kryminalnych (jak w PT 1°)',
      '🚫 Zakaz ucieczki przed policją (jak w PT 1°)',
      '🚫 Wypadki drogowe są void (nie mają skutków RP)',
      '🚫 Limit prędkości FRP: maksymalnie **70 mph**',
    ],
  },
  'off': {
    level:       0,
    topic:       '✅ Normalny tryb — Brak Peacetime',
    label:       '✅ Normalny tryb',
    color:       0x57F287, // Zielony
    description: 'Brak Peacetime — **normalny tryb RP**.\nWszystkie mechaniki gry są aktywne zgodnie z regulaminem.',
    rules: [
      '✅ Akcje kryminalne dozwolone zgodnie z zasadami',
      '✅ Pościgi i ucieczki przed policją dozwolone',
      '✅ Wypadki mają pełne skutki RP',
      '✅ Normalny limit prędkości FRP',
    ],
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('peacetime')
    .setDescription('Ustawia tryb peacetime na serwerze RP')
    .addStringOption(opt =>
      opt
        .setName('poziom')
        .setDescription('Poziom peacetime do ustawienia')
        .setRequired(true)
        .addChoices(
          { name: '⚠️ Peacetime 1° — Zakaz Crime i ucieczki', value: '1'   },
          { name: '🚨 Peacetime 2° — PT1° + Void + limit 70mph', value: '2' },
          { name: '✅ Wyłącz Peacetime — Normalny tryb',        value: 'off' },
        )
    ),

  async execute(interaction, client, prisma) {
    // Sprawdź uprawnienia — tylko Host+ może zmieniać peacetime
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member || !hasRole(member, ROLES.HOST)) {
      return interaction.reply(noPermissionReply('Host'));
    }

    await interaction.deferReply({ ephemeral: true });

    const poziom = interaction.options.getString('poziom');
    const config = PEACETIME_CONFIG[poziom];

    if (!config) {
      return interaction.editReply({
        content: '❌ Nieznany poziom peacetime.',
      });
    }

    // ==================== AKTUALIZACJA TOPIC KANAŁU ====================

    const rpChannel = interaction.guild.channels.cache.find(
      c => c.name === RP_ANNOUNCEMENTS_CHANNEL && c.isTextBased()
    );

    if (rpChannel) {
      try {
        await rpChannel.setTopic(config.topic, `Peacetime zmieniony przez ${interaction.user.tag}`);
        logger.info(`Topic kanału #${RP_ANNOUNCEMENTS_CHANNEL} zaktualizowany: "${config.topic}"`);
      } catch (err) {
        logger.warn(`Nie udało się zmienić topic kanału #${RP_ANNOUNCEMENTS_CHANNEL}:`, err.message);
      }
    } else {
      logger.warn(`Nie znaleziono kanału "${RP_ANNOUNCEMENTS_CHANNEL}"`);
    }

    // ==================== AKTUALIZACJA W BAZIE ====================

    // Znajdź aktywną sesję (UPCOMING lub ONGOING) i zapisz poziom peacetime
    const activeSession = await prisma.session.findFirst({
      where: {
        status: { in: ['UPCOMING', 'ONGOING'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeSession) {
      await prisma.session.update({
        where: { id: activeSession.id },
        data: { peacetime: config.level },
      });
      logger.info(`Peacetime sesji ${activeSession.id} zaktualizowany na poziom ${config.level}`);
    } else {
      logger.warn('Brak aktywnej sesji — peacetime nie zapisany do sesji w DB');
    }

    // ==================== EMBED OGŁOSZENIA ====================

    // Zbuduj listę zasad jako string
    const rulesText = config.rules.map(r => `• ${r}`).join('\n');

    const embed = new EmbedBuilder()
      .setColor(config.color)
      .setTitle(`${config.label} — Zmiana trybu serwera`)
      .setDescription(
        `${config.description}\n\n` +
        `**Obowiązujące zasady:**\n${rulesText}`
      )
      .addFields(
        { name: '👤 Zmienił', value: `${interaction.user}`, inline: true },
        { name: '🕐 Kiedy',   value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
      )
      .setFooter({ text: 'Greenville RP — System Peacetime' })
      .setTimestamp();

    // Wyślij ogłoszenie do kanału RP
    if (rpChannel) {
      await rpChannel.send({ embeds: [embed] }).catch(err =>
        logger.warn('Nie udało się wysłać embeda peacetime:', err.message)
      );
    }

    // Potwierdź hostowi (ephemeral)
    const topicInfo = rpChannel
      ? `\n📌 Topic kanału <#${rpChannel.id}> zaktualizowany.`
      : `\n⚠️ Nie znaleziono kanału **#${RP_ANNOUNCEMENTS_CHANNEL}**.`;

    await interaction.editReply({
      content: `✅ Peacetime zmieniony na **${config.label}**.${topicInfo}`,
    });

    logger.info(`Peacetime zmieniony na "${poziom}" przez ${interaction.user.tag}`);
  },
};
