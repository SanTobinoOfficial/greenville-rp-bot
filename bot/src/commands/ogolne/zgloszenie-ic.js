// Komenda /zgloszenie-ic — IC skarga na funkcjonariusza służb
// Mieszkańcy mogą formalnie zgłosić IC naruszenie przez funkcjonariusza.
// Skarga trafia do kanału czatu danej służby + DM do funkcjonariusza.
// Cooldown 24h na osobę, żeby zapobiec nadużyciom.
// Symetria do /pochwala (pozytywna → skarga, negatywna).

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 godziny
const cooldowns = new Map();

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
    .setName('zgloszenie-ic')
    .setDescription('Złóż IC skargę na funkcjonariusza służb (Policja, EMS, Straż, DOT, SM)')
    .addUserOption(opt =>
      opt.setName('funkcjonariusz')
        .setDescription('Funkcjonariusz, na którego składasz skargę')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('opis')
        .setDescription('Opisz zdarzenie szczegółowo (min. 30 znaków)')
        .setRequired(true)
        .setMinLength(30)
        .setMaxLength(400)
    )
    .addStringOption(opt =>
      opt.setName('miejsce')
        .setDescription('Gdzie i kiedy doszło do zdarzenia? (opcjonalnie)')
        .setMaxLength(100)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby złożyć zgłoszenie IC.',
      });
    }

    const targetUser = interaction.options.getUser('funkcjonariusz');
    const opis       = interaction.options.getString('opis');
    const miejsce    = interaction.options.getString('miejsce') ?? null;
    const senderId   = interaction.user.id;

    if (targetUser.id === senderId) {
      return interaction.editReply({ content: '❌ Nie możesz złożyć skargi na samego siebie.' });
    }

    if (targetUser.bot) {
      return interaction.editReply({ content: '❌ Nie można złożyć skargi na bota.' });
    }

    // Cooldown — 24h
    const lastUsed = cooldowns.get(senderId);
    if (lastUsed && Date.now() - lastUsed < COOLDOWN_MS) {
      const remainingMs = COOLDOWN_MS - (Date.now() - lastUsed);
      const remainingH  = Math.floor(remainingMs / 3_600_000);
      const remainingM  = Math.ceil((remainingMs % 3_600_000) / 60_000);
      const timeStr     = remainingH > 0 ? `${remainingH}h ${remainingM}min` : `${remainingM}min`;
      return interaction.editReply({
        content: `⏳ Możesz złożyć kolejne zgłoszenie IC za **${timeStr}**.`,
      });
    }

    // Pobierz GuildMember celu
    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(targetUser.id);
    } catch {
      return interaction.editReply({ content: '❌ Nie udało się znaleźć tego użytkownika na serwerze.' });
    }

    // Wykryj służbę funkcjonariusza
    const service = SERVICES.find(s => targetMember.roles.cache.some(r => r.name === s.role));
    if (!service) {
      return interaction.editReply({
        content: '❌ Wskazany gracz nie jest członkiem żadnej służby mundurowej (Policja, EMS, Straż Pożarna, DOT, Straż Miejska).',
      });
    }

    // Pobierz IC imiona obu stron
    const [senderIcName, targetIcName] = await Promise.all([
      getIcName(prisma, senderId, interaction.member),
      getIcName(prisma, targetUser.id, targetMember),
    ]);

    // Ustaw cooldown dopiero po walidacji, przed wysyłaniem
    cooldowns.set(senderId, Date.now());

    // Buduj embed skargi
    const embedFields = [
      { name: '📝 Opis zdarzenia', value: opis,        inline: false },
      { name: '👤 Składający',     value: senderIcName, inline: true  },
      { name: `${service.emoji} Służba`,    value: service.label, inline: true  },
    ];
    if (miejsce) {
      embedFields.push({ name: '📍 Miejsce / czas', value: miejsce, inline: false });
    }

    const publicEmbed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setTitle(`📋 Zgłoszenie IC — ${service.label}`)
      .setDescription(
        `Mieszkaniec **${senderIcName}** (<@${senderId}>) złożył(a) formalną skargę IC` +
        ` na funkcjonariusza **${targetIcName}** (<@${targetUser.id}>).`
      )
      .addFields(embedFields)
      .setFooter({ text: 'AURORA Greenville RP — Zgłoszenia IC | Do rozpatrzenia przez przełożonych' })
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
        logger.warn(`/zgloszenie-ic: nie udało się wysłać do #${channelName}: ${err.message}`);
      }
    }

    // DM do funkcjonariusza (graceful fail — DM może być zablokowane)
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('📋 Otrzymałeś/aś zgłoszenie IC')
        .setDescription(
          `Mieszkaniec **${senderIcName}** złożył(a) formalną skargę IC` +
          ` na Twoje działanie jako funkcjonariusz **${service.label}**.`
        )
        .addFields({ name: '📝 Treść skargi', value: opis })
        .setFooter({ text: 'AURORA Greenville RP — Skontaktuj się z przełożonym w celu wyjaśnienia.' })
        .setTimestamp();
      await targetUser.send({ embeds: [dmEmbed] });
    } catch { /* DM zablokowane — cicho ignorujemy */ }

    logger.info(
      `/zgloszenie-ic: ${interaction.user.tag} (${senderIcName}) → ${targetUser.tag} (${targetIcName}) [${service.label}]`
    );

    await interaction.editReply({
      content:
        `✅ Zgłoszenie IC na funkcjonariusza **${targetIcName}** (${service.emoji} ${service.label})` +
        ` zostało przesłane do kanału służby i zostanie rozpatrzone przez przełożonych.`,
    });
  },
};
