// Komenda /apel — IC apel służby (roll call)
// Przełożony otwiera apel, dyżurni meldują gotowość, prowadzący zamyka i publikuje podsumowanie
// Jedno aktywne zgromadzenie na serwer (in-memory, reset po restarcie bota)
// Dostępna dla: on-duty member danej służby lub Staff (Helper+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Aktywne apele: guildId → { serviceKey, serviceLabel, serviceEmoji, serviceColor,
//                            supervisorId, supervisorIcName,
//                            responses: Map(userId, { icName, timestamp }),
//                            startedAt }
const activeApels = new Map();

const SERVICE_CONFIG = {
  policja:       { label: 'Policja',        onDutyRole: 'Policja On-Duty',       emoji: '🚔', color: 0x003087 },
  ems:           { label: 'EMS',            onDutyRole: 'EMS On-Duty',           emoji: '🚑', color: 0xED4245 },
  straz:         { label: 'Straż Pożarna',  onDutyRole: 'Straż On-Duty',         emoji: '🚒', color: 0xFEE75C },
  dot:           { label: 'DOT',            onDutyRole: 'DOT On-Duty',           emoji: '🚧', color: 0xFF7F00 },
  straz_miejska: { label: 'Straż Miejska',  onDutyRole: 'Straż Miejska On-Duty', emoji: '🛡️', color: 0x2ECC71 },
};

const SERVICE_CHANNEL_HINTS = {
  policja:       'policja-czat',
  ems:           'ems-czat',
  straz:         'straz-czat',
  dot:           'dot-czat',
  straz_miejska: 'sm-czat',
};

const norm = s =>
  s.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');

async function getIcName(prisma, discordId, fallbackMember) {
  try {
    const userDb = await prisma.user.findUnique({
      where: { discordId },
      include: { character: true },
    });
    if (userDb?.character) {
      return `${userDb.character.firstName} ${userDb.character.lastName}`;
    }
  } catch {
    // fallback poniżej
  }
  return fallbackMember?.displayName ?? fallbackMember?.user?.username ?? 'Nieznana postać';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apel')
    .setDescription('Apel służby IC — otwórz, zamelduj się lub zamknij apel')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Rozpocznij apel służby (musisz być On-Duty lub Staff)')
        .addStringOption(opt =>
          opt
            .setName('sluzba')
            .setDescription('Służba, dla której rozpoczynasz apel')
            .setRequired(true)
            .addChoices(
              { name: '🚔 Policja',        value: 'policja'       },
              { name: '🚑 EMS',            value: 'ems'           },
              { name: '🚒 Straż Pożarna',  value: 'straz'         },
              { name: '🚧 DOT',            value: 'dot'           },
              { name: '🛡️ Straż Miejska',  value: 'straz_miejska' },
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('meldunek')
        .setDescription('Zamelduj się na aktywnym apelu — potwierdź gotowość')
    )
    .addSubcommand(sub =>
      sub
        .setName('lista')
        .setDescription('Sprawdź stan aktywnego apelu — kto już się zameldował')
    )
    .addSubcommand(sub =>
      sub
        .setName('zamknij')
        .setDescription('Zamknij apel i opublikuj podsumowanie na kanale służby')
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą używać tej komendy.',
      });
    }

    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const userId  = interaction.user.id;
    const member  = interaction.member;

    // ── START ──────────────────────────────────────────────────────────────────
    if (sub === 'start') {
      if (activeApels.has(guildId)) {
        const existing = activeApels.get(guildId);
        return interaction.editReply({
          content:
            `❌ Apel jest już aktywny dla służby **${existing.serviceLabel}** ` +
            `(prowadzi: ${existing.supervisorIcName}).\n` +
            `Użyj \`/apel zamknij\` aby zakończyć bieżący apel.`,
        });
      }

      const serviceKey = interaction.options.getString('sluzba');
      const svc        = SERVICE_CONFIG[serviceKey];

      const onDutyRole  = interaction.guild.roles.cache.find(r => r.name === svc.onDutyRole);
      const isOnDuty    = onDutyRole ? member.roles.cache.has(onDutyRole.id) : false;

      if (!isOnDuty && !isStaff(member)) {
        return interaction.editReply({
          content:
            `❌ Musisz być **On-Duty** w służbie **${svc.label}** ` +
            `lub mieć uprawnienia **Staff (Helper+)** aby rozpocząć apel.`,
        });
      }

      const supervisorIcName = await getIcName(prisma, userId, member);

      activeApels.set(guildId, {
        serviceKey,
        serviceLabel:      svc.label,
        serviceEmoji:      svc.emoji,
        serviceColor:      svc.color,
        supervisorId:      userId,
        supervisorIcName,
        responses:         new Map(),
        startedAt:         Date.now(),
      });

      logger.info(`/apel start | ${interaction.user.tag} (${supervisorIcName}) | ${svc.label}`);

      const pingContent = onDutyRole
        ? `<@&${onDutyRole.id}> 🎖️ **APEL SŁUŻBY — ZAMELDUJ SIĘ!** Użyj \`/apel meldunek\``
        : `🎖️ **APEL SŁUŻBY ${svc.label.toUpperCase()} — ZAMELDUJ SIĘ!** Użyj \`/apel meldunek\``;

      await interaction.channel.send({
        content: pingContent,
        embeds: [
          new EmbedBuilder()
            .setColor(svc.color)
            .setTitle(`${svc.emoji} Apel Służby — ${svc.label}`)
            .setDescription(
              'Apel został rozpoczęty. Użyj `/apel meldunek` aby potwierdzić gotowość.\n' +
              'Prowadzący zamknie apel komendą `/apel zamknij` — wtedy zostanie opublikowane podsumowanie.'
            )
            .addFields(
              { name: '👮 Prowadzący',    value: supervisorIcName,                                 inline: true },
              { name: '🕐 Rozpoczęto',    value: `<t:${Math.floor(Date.now() / 1000)}:T>`,         inline: true },
              { name: '👥 Zameldowanych', value: '0',                                               inline: true },
            )
            .setFooter({ text: 'AURORA Greenville RP — System Apeli' })
            .setTimestamp(),
        ],
      }).catch(() => {});

      return interaction.editReply({
        content: `✅ Apel służby **${svc.label}** rozpoczęty. Oczekuj meldunków od dyżurnych.`,
      });
    }

    // ── MELDUNEK ───────────────────────────────────────────────────────────────
    if (sub === 'meldunek') {
      const apel = activeApels.get(guildId);
      if (!apel) {
        return interaction.editReply({
          content:
            '❌ Brak aktywnego apelu.\n' +
            'Poczekaj aż prowadzący służbę rozpocznie apel komendą `/apel start`.',
        });
      }

      const svc        = SERVICE_CONFIG[apel.serviceKey];
      const onDutyRole = interaction.guild.roles.cache.find(r => r.name === svc.onDutyRole);
      const isOnDuty   = onDutyRole ? member.roles.cache.has(onDutyRole.id) : false;

      if (!isOnDuty && !isStaff(member)) {
        return interaction.editReply({
          content:
            `❌ Ten apel dotyczy służby **${apel.serviceLabel}**.\n` +
            `Musisz być **On-Duty** w tej służbie aby się zameldować.`,
        });
      }

      if (apel.responses.has(userId)) {
        const existing = apel.responses.get(userId);
        return interaction.editReply({
          content: `✅ Jesteś już zameldowany/a jako **${existing.icName}**.`,
        });
      }

      const icName = await getIcName(prisma, userId, member);
      apel.responses.set(userId, { icName, timestamp: Date.now() });

      logger.info(`/apel meldunek | ${interaction.user.tag} (${icName}) | ${apel.serviceLabel}`);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(apel.serviceColor)
            .setTitle(`${apel.serviceEmoji} Meldunek przyjęty`)
            .setDescription(`**${icName}** — zameldowany/a na apelu służby **${apel.serviceLabel}**.`)
            .addFields(
              { name: '👥 Zameldowanych łącznie', value: `${apel.responses.size}`, inline: true },
            )
            .setFooter({ text: 'AURORA Greenville RP — System Apeli' })
            .setTimestamp(),
        ],
      });
    }

    // ── LISTA ──────────────────────────────────────────────────────────────────
    if (sub === 'lista') {
      const apel = activeApels.get(guildId);
      if (!apel) {
        return interaction.editReply({ content: '❌ Brak aktywnego apelu.' });
      }

      const responseLines = [...apel.responses.values()]
        .map((r, i) => `${i + 1}. **${r.icName}** — <t:${Math.floor(r.timestamp / 1000)}:T>`)
        .join('\n') || '*Nikt się jeszcze nie zameldował*';

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(apel.serviceColor)
            .setTitle(`${apel.serviceEmoji} Apel — ${apel.serviceLabel} | Aktualny stan`)
            .addFields(
              { name: '👮 Prowadzący',      value: apel.supervisorIcName,                            inline: true  },
              { name: '🕐 Czas trwania',    value: `<t:${Math.floor(apel.startedAt / 1000)}:R>`,     inline: true  },
              { name: '✅ Zameldowanych',    value: `${apel.responses.size}`,                          inline: true  },
              { name: '📋 Lista meldunków', value: responseLines,                                      inline: false },
            )
            .setFooter({ text: 'AURORA Greenville RP — System Apeli' })
            .setTimestamp(),
        ],
      });
    }

    // ── ZAMKNIJ ────────────────────────────────────────────────────────────────
    if (sub === 'zamknij') {
      const apel = activeApels.get(guildId);
      if (!apel) {
        return interaction.editReply({ content: '❌ Brak aktywnego apelu do zamknięcia.' });
      }

      if (apel.supervisorId !== userId && !isStaff(member)) {
        return interaction.editReply({
          content:
            `❌ Tylko prowadzący apel (**${apel.supervisorIcName}**) lub Staff może go zamknąć.`,
        });
      }

      const durationSec = Math.floor((Date.now() - apel.startedAt) / 1000);
      const durMin      = Math.floor(durationSec / 60);
      const durSec      = durationSec % 60;
      const durLabel    = durMin > 0 ? `${durMin} min ${durSec} sek` : `${durSec} sek`;

      const responseLines = [...apel.responses.values()]
        .map((r, i) => `${i + 1}. **${r.icName}**`)
        .join('\n') || '*Nikt się nie zameldował*';

      const summaryEmbed = new EmbedBuilder()
        .setColor(apel.serviceColor)
        .setTitle(`${apel.serviceEmoji} Apel Służby — ${apel.serviceLabel} | ZAKOŃCZONY`)
        .addFields(
          { name: '👮 Prowadzący',       value: apel.supervisorIcName,  inline: true  },
          { name: '⏱️ Czas trwania',     value: durLabel,               inline: true  },
          { name: '✅ Zameldowanych',     value: `${apel.responses.size}`, inline: true },
          { name: '📋 Lista obecności',  value: responseLines,          inline: false },
        )
        .setFooter({ text: 'AURORA Greenville RP — System Apeli' })
        .setTimestamp();

      // Opublikuj podsumowanie na kanale służby
      const channelHint    = SERVICE_CHANNEL_HINTS[apel.serviceKey] ?? 'ogolny';
      const serviceChannel = interaction.guild.channels.cache.find(
        c => c.isTextBased() && norm(c.name).includes(channelHint)
      );
      if (serviceChannel && serviceChannel.id !== interaction.channel.id) {
        await serviceChannel.send({ embeds: [summaryEmbed] }).catch(() => {});
      }

      // Opublikuj też na bieżącym kanale
      await interaction.channel.send({ embeds: [summaryEmbed] }).catch(() => {});

      activeApels.delete(guildId);

      logger.info(
        `/apel zamknij | ${interaction.user.tag} (${apel.supervisorIcName}) | ` +
        `${apel.serviceLabel} | zameldowanych: ${apel.responses.size} | czas: ${durLabel}`
      );

      return interaction.editReply({
        content:
          `✅ Apel służby **${apel.serviceLabel}** zakończony.\n` +
          `Zameldowanych: **${apel.responses.size}** funkcjonariuszy przez **${durLabel}**.`,
      });
    }
  },
};
