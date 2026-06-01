// Komenda /rewizja — rewizja osoby lub pojazdu (RP)
// Publikuje sformatowany embed IC na kanale, widoczny publicznie
// Dostępna dla: Policja On-Duty | Straż Miejska On-Duty | Staff+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

const AUTHORIZED_ON_DUTY = ['Policja On-Duty', 'Straż Miejska On-Duty'];

// Zwraca true gdy wynik rewizji zawiera znaleziska (nie jest "czyste")
function hasFindings(wynik) {
  return !/nic\s*(podejrzanego|znalezion|nie\s*znalezion)/i.test(wynik);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rewizja')
    .setDescription('Przeprowadź rewizję osoby lub pojazdu (RP — widoczne publicznie)')
    .addSubcommand(sub =>
      sub.setName('osoba')
        .setDescription('Rewizja osoby — sprawdź kieszenie, odzież i ekwipunek')
        .addUserOption(opt =>
          opt.setName('gracz')
            .setDescription('Gracz którego rewizji dokonujesz')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('wynik')
            .setDescription('Co znaleziono podczas rewizji (np. "nic podejrzanego" lub opis znalezisk)')
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(300)
        )
        .addStringOption(opt =>
          opt.setName('podstawa')
            .setDescription('Podstawa prawna / powód rewizji (np. "podejrzenie posiadania…")')
            .setRequired(false)
            .setMaxLength(200)
        )
    )
    .addSubcommand(sub =>
      sub.setName('pojazd')
        .setDescription('Rewizja pojazdu — sprawdź wnętrze, bagażnik i dokumenty')
        .addStringOption(opt =>
          opt.setName('tablice')
            .setDescription('Numer rejestracyjny pojazdu (np. WA 12345)')
            .setRequired(true)
            .setMaxLength(10)
        )
        .addStringOption(opt =>
          opt.setName('wynik')
            .setDescription('Co znaleziono podczas rewizji (np. "nic podejrzanego" lub opis znalezisk)')
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(300)
        )
        .addUserOption(opt =>
          opt.setName('kierowca')
            .setDescription('Właściciel / kierowca pojazdu (opcjonalnie)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('podstawa')
            .setDescription('Podstawa prawna / powód rewizji (np. "podejrzenie posiadania…")')
            .setRequired(false)
            .setMaxLength(200)
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    const member = interaction.member;
    const isOnDuty = member.roles.cache.some(r => AUTHORIZED_ON_DUTY.includes(r.name));

    if (!isOnDuty && !isStaff(member)) {
      return interaction.editReply({
        content: '❌ Rewizja dostępna tylko dla **Policja On-Duty** lub **Straż Miejska On-Duty**. Użyj `/duty`, aby wejść na służbę.',
      });
    }

    // IC imię funkcjonariusza
    const userDb = await prisma.user
      .findUnique({ where: { discordId: interaction.user.id }, include: { character: true } })
      .catch(() => null);

    const officerChar = userDb?.character;
    const icOfficer = officerChar
      ? `${officerChar.firstName} ${officerChar.lastName}`
      : (member?.displayName ?? interaction.user.username);

    const sub = interaction.options.getSubcommand();

    // ── REWIZJA OSOBY ─────────────────────────────────────────────────────────
    if (sub === 'osoba') {
      const targetUser = interaction.options.getUser('gracz');
      const wynik      = interaction.options.getString('wynik').trim();
      const podstawa   = interaction.options.getString('podstawa')?.trim() ?? null;

      if (targetUser.id === interaction.user.id) {
        return interaction.editReply({ content: '❌ Nie możesz przeprowadzić rewizji samego siebie.' });
      }
      if (targetUser.bot) {
        return interaction.editReply({ content: '❌ Nie można przeprowadzić rewizji bota.' });
      }

      // IC imię rewizowanej osoby
      const targetDb = await prisma.user
        .findUnique({ where: { discordId: targetUser.id }, include: { character: true } })
        .catch(() => null);

      const targetChar = targetDb?.character;
      const icTarget = targetChar
        ? `${targetChar.firstName} ${targetChar.lastName}`
        : targetUser.username;

      const findings = hasFindings(wynik);

      const embed = new EmbedBuilder()
        .setColor(findings ? COLORS.error : COLORS.success)
        .setTitle('🔍 REWIZJA OSOBY')
        .setDescription(`*Funkcjonariusz **${icOfficer}** przeprowadza rewizję osoby **${icTarget}**.*`)
        .addFields(
          { name: '👤 Rewizowana osoba',  value: `<@${targetUser.id}> — ${icTarget}`, inline: true },
          { name: '👮 Funkcjonariusz',     value: icOfficer,                            inline: true },
          {
            name: findings ? '⚠️ Znalezione przedmioty' : '✅ Wynik rewizji',
            value: wynik,
            inline: false,
          },
        )
        .setFooter({
          text: `${interaction.user.tag} • ${interaction.channel.name} • /rewizja osoba`,
          iconURL: interaction.user.displayAvatarURL({ size: 32 }),
        })
        .setTimestamp();

      if (podstawa) {
        embed.addFields({ name: '⚖️ Podstawa prawna', value: podstawa, inline: false });
      }

      logger.info(
        `/rewizja osoba | ${interaction.user.tag} (${icOfficer}) → ${targetUser.tag} (${icTarget}) | "${wynik}"` +
        (podstawa ? ` | podstawa: ${podstawa}` : '')
      );

      return interaction.editReply({ embeds: [embed] });
    }

    // ── REWIZJA POJAZDU ───────────────────────────────────────────────────────
    if (sub === 'pojazd') {
      const tablice  = interaction.options.getString('tablice').toUpperCase().trim();
      const wynik    = interaction.options.getString('wynik').trim();
      const kierowca = interaction.options.getUser('kierowca') ?? null;
      const podstawa = interaction.options.getString('podstawa')?.trim() ?? null;

      const findings = hasFindings(wynik);

      const embed = new EmbedBuilder()
        .setColor(findings ? COLORS.error : COLORS.success)
        .setTitle('🚗 REWIZJA POJAZDU')
        .setDescription(
          `*Funkcjonariusz **${icOfficer}** przeprowadza rewizję pojazdu o tablicach rejestracyjnych **${tablice}**.*`
        )
        .addFields(
          { name: '🚗 Tablice rejestracyjne', value: `\`${tablice}\``, inline: true },
          { name: '👮 Funkcjonariusz',          value: icOfficer,        inline: true },
          {
            name: findings ? '⚠️ Znalezione przedmioty' : '✅ Wynik rewizji',
            value: wynik,
            inline: false,
          },
        )
        .setFooter({
          text: `${interaction.user.tag} • ${interaction.channel.name} • /rewizja pojazd`,
          iconURL: interaction.user.displayAvatarURL({ size: 32 }),
        })
        .setTimestamp();

      if (kierowca) {
        embed.addFields({ name: '🧑 Kierowca / Właściciel', value: `<@${kierowca.id}>`, inline: true });
      }
      if (podstawa) {
        embed.addFields({ name: '⚖️ Podstawa prawna', value: podstawa, inline: false });
      }

      logger.info(
        `/rewizja pojazd | ${interaction.user.tag} (${icOfficer}) → tablice: ${tablice} | "${wynik}"` +
        (kierowca ? ` | kierowca: ${kierowca.tag}` : '') +
        (podstawa ? ` | podstawa: ${podstawa}` : '')
      );

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
