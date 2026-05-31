// Komenda /odliczanie — live countdown timer dla hostów sesji
// Wysyła publiczny embed z czasem Discord <t:UNIX:R>, który odlicza się
// automatycznie w każdym kliencie Discord bez żadnego pollingu.
// Przydatne podczas aktywnych scenariuszy: napad, pościg, koniec sesji itp.
// Dostępna dla: Host+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasRole, ROLES, noPermissionReply } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

const MAX_MINUTES = 120;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('odliczanie')
    .setDescription('Uruchom live-countdown widoczny dla wszystkich (automatycznie odlicza w Discordzie)')
    .addIntegerOption(opt =>
      opt
        .setName('minuty')
        .setDescription('Za ile minut timer ma się zakończyć (1–120)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_MINUTES)
    )
    .addStringOption(opt =>
      opt
        .setName('etykieta')
        .setDescription('Tytuł odliczania (np. "Koniec napadu", "Start sesji", "Peacetime ends")')
        .setRequired(false)
        .setMinLength(2)
        .setMaxLength(80)
    ),

  async execute(interaction, client, prisma) {
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member || !hasRole(member, ROLES.HOST)) {
      return interaction.reply(noPermissionReply('Host'));
    }

    const minuty   = interaction.options.getInteger('minuty');
    const etykieta = interaction.options.getString('etykieta')?.trim() ?? null;

    const endsAt  = Math.floor(Date.now() / 1000) + minuty * 60;
    const label   = etykieta ?? 'Odliczanie';

    const embed = new EmbedBuilder()
      .setColor(minuty <= 5 ? COLORS.error : minuty <= 15 ? 0xFF6B00 : COLORS.success)
      .setTitle(`⏱️ ${label}`)
      .setDescription(
        `Czas kończy się <t:${endsAt}:R> — dokładnie <t:${endsAt}:T>.\n` +
        `> *Odliczanie automatycznie aktualizuje się w każdym kliencie Discord.*`
      )
      .addFields(
        { name: '⏳ Czas trwania', value: `${minuty} min`,           inline: true },
        { name: '🏁 Koniec',       value: `<t:${endsAt}:R>`,         inline: true },
        { name: '👤 Ustawił/a',    value: `${interaction.user}`,     inline: true },
      )
      .setFooter({ text: 'AURORA Greenville RP — Timer sesji' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    logger.info(
      `/odliczanie | ${interaction.user.tag} | "${label}" | ${minuty} min | ` +
      `ends at ${new Date(endsAt * 1000).toISOString()}`
    );
  },
};
