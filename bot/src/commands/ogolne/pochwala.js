// Komenda /pochwala — IC pochwała dla funkcjonariusza służb
// Zweryfikowani gracze mogą publicznie pochwalić funkcjonariusza za wzorowe prowadzenie RP.
// Pochwała trafia na kanał czatu danej służby oraz (opcjonalnie) do DM funkcjonariusza.
// Cooldown 6h na osobę, żeby zapobiec spamowi.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// In-memory cooldown: discordId → timestamp ostatniej pochwały
const cooldowns = new Map();
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 godzin

// Mapowanie nazwy służby → kanał czatu służby (nazwy z server-config.json)
const SERVICE_CHANNELS = {
  'Policja':       '💬│policja-czat',
  'EMS':           '💬│ems-czat',
  'Straż Pożarna': '💬│straż-czat',
  'DOT':           '💬│dot-czat',
  'Straż Miejska': '💬│sm-czat',
};

const SERVICES = [
  { role: ROLES.POLICJA,       label: 'Policja',       emoji: '🚔' },
  { role: ROLES.EMS,           label: 'EMS',           emoji: '🚑' },
  { role: ROLES.STRAZ,         label: 'Straż Pożarna', emoji: '🚒' },
  { role: ROLES.DOT,           label: 'DOT',           emoji: '🚧' },
  { role: ROLES.STRAZ_MIEJSKA, label: 'Straż Miejska', emoji: '🛡️' },
];

async function getIcName(prisma, discordId, fallbackMember) {
  try {
    const user = await prisma.user.findUnique({
      where: { discordId },
      include: { character: true },
    });
    if (user?.character) return `${user.character.firstName} ${user.character.lastName}`;
  } catch { /* cicho — fallback poniżej */ }
  return fallbackMember?.displayName ?? fallbackMember?.user?.username ?? 'Nieznana postać';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pochwala')
    .setDescription('Pochwal funkcjonariusza za wzorowe prowadzenie RP (IC)')
    .addUserOption(opt =>
      opt.setName('funkcjonariusz')
        .setDescription('Funkcjonariusz, którego chcesz pochwalić')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('opis')
        .setDescription('Co zrobił(a) wzorowo? (min. 20 znaków)')
        .setRequired(true)
        .setMinLength(20)
        .setMaxLength(300)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby wystawić pochwałę.',
      });
    }

    const targetUser = interaction.options.getUser('funkcjonariusz');
    const opis       = interaction.options.getString('opis');
    const senderId   = interaction.user.id;

    if (targetUser.id === senderId) {
      return interaction.editReply({ content: '❌ Nie możesz pochwalić samego siebie.' });
    }

    // Cooldown
    const lastUsed = cooldowns.get(senderId);
    if (lastUsed && Date.now() - lastUsed < COOLDOWN_MS) {
      const remainingMin = Math.ceil((COOLDOWN_MS - (Date.now() - lastUsed)) / 60000);
      const remainingH   = Math.floor(remainingMin / 60);
      const remainingM   = remainingMin % 60;
      const timeStr      = remainingH > 0
        ? `${remainingH}h ${remainingM}min`
        : `${remainingMin}min`;
      return interaction.editReply({
        content: `⏳ Możesz wystawić kolejną pochwałę za **${timeStr}**.`,
      });
    }

    // Pobierz GuildMember celu
    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(targetUser.id);
    } catch {
      return interaction.editReply({ content: '❌ Nie udało się znaleźć tego użytkownika na serwerze.' });
    }

    // Wykryj służbę
    const service = SERVICES.find(s => targetMember.roles.cache.some(r => r.name === s.role));
    if (!service) {
      return interaction.editReply({
        content: '❌ Wskazany gracz nie jest członkiem żadnej służby (Policja, EMS, Straż Pożarna, DOT, Straż Miejska).',
      });
    }

    // IC imiona obu stron
    const [senderIcName, targetIcName] = await Promise.all([
      getIcName(prisma, senderId, interaction.member),
      getIcName(prisma, targetUser.id, targetMember),
    ]);

    // Ustaw cooldown dopiero po walidacji, przed wysyłaniem
    cooldowns.set(senderId, Date.now());

    // Embed pochwały do kanału służby
    const publicEmbed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle(`${service.emoji} Pochwała IC — ${service.label}`)
      .setDescription(
        `Mieszkaniec **${senderIcName}** (<@${senderId}>) wystawił(a) pochwałę dla funkcjonariusza **${targetIcName}** (<@${targetUser.id}>).`
      )
      .addFields(
        { name: '📝 Treść pochwały', value: opis },
        { name: '👤 Wystawił(a)',     value: `${senderIcName}`,    inline: true },
        { name: '⭐ Służba',          value: `${service.emoji} ${service.label}`, inline: true }
      )
      .setFooter({ text: 'AURORA Greenville RP — Pochwały IC' })
      .setTimestamp();

    // Wyślij do kanału służby (fallback: ogólny)
    const channelName   = SERVICE_CHANNELS[service.label];
    const targetChannel =
      interaction.guild.channels.cache.find(c => c.name === channelName) ??
      interaction.guild.channels.cache.find(c => c.name === '💬│ogólny');

    if (targetChannel?.isTextBased()) {
      try {
        await targetChannel.send({ embeds: [publicEmbed] });
      } catch (err) {
        logger.warn(`/pochwala: nie udało się wysłać do #${channelName}: ${err.message}`);
      }
    }

    // DM do funkcjonariusza (opcjonalne — graceful fail)
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(COLORS.gold)
        .setTitle('⭐ Otrzymałeś/aś pochwałę IC!')
        .setDescription(
          `Mieszkaniec **${senderIcName}** pochwalił(a) Twoje działanie jako **${service.label}**.`
        )
        .addFields({ name: '📝 Treść', value: opis })
        .setFooter({ text: 'AURORA Greenville RP' })
        .setTimestamp();
      await targetUser.send({ embeds: [dmEmbed] });
    } catch { /* DM zablokowane — cicho ignorujemy */ }

    logger.info(
      `/pochwala: ${interaction.user.tag} → ${targetUser.tag} (${service.label})`
    );

    await interaction.editReply({
      content: `✅ Pochwała dla **${targetIcName}** (${service.emoji} ${service.label}) została wysłana na kanał służby!`,
    });
  },
};
