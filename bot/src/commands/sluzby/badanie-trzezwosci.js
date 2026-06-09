// Komenda /badanie-trzezwosci — alkomat (test trzeźwości) — akcja IC Policji
// Dostępna dla: Policja On-Duty | Straż Miejska On-Duty | Staff+
// Generuje losowy wynik BAC i publikuje go publicznie jako embed RP

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

const AUTHORIZED_ON_DUTY = ['Policja On-Duty', 'Straż Miejska On-Duty'];

// Progi BAC według polskiego prawa drogowego
// < 0.2‰  → trzeźwy     (brak wykroczenia)
// 0.2-0.5‰ → po spożyciu (wykroczenie — art. 87 k.w.)
// ≥ 0.5‰   → stan wskazujący (przestępstwo — art. 178a k.k.)

const BAC_POOL = [
  // ── Trzeźwy — 65% ──────────────────────────────────────────────────────────
  { bac: '0.00', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },
  { bac: '0.00', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },
  { bac: '0.00', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },
  { bac: '0.00', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },
  { bac: '0.00', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },
  { bac: '0.00', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },
  { bac: '0.00', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },
  { bac: '0.00', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },
  { bac: '0.00', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },
  { bac: '0.00', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },
  { bac: '0.00', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },
  { bac: '0.00', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },
  { bac: '0.00', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },

  // ── Ślady (0.01–0.19‰) — 15% ───────────────────────────────────────────────
  { bac: '0.07', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },
  { bac: '0.11', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },
  { bac: '0.15', poziom: 'TRZEŹWY',   legal: null,          kolor: COLORS.success, emoji: '🟢' },

  // ── Po spożyciu (0.20–0.49‰) — 12% ────────────────────────────────────────
  { bac: '0.23', poziom: 'PO SPOŻYCIU',    legal: 'wykroczenie', kolor: COLORS.warning, emoji: '🟡' },
  { bac: '0.31', poziom: 'PO SPOŻYCIU',    legal: 'wykroczenie', kolor: COLORS.warning, emoji: '🟡' },
  { bac: '0.42', poziom: 'PO SPOŻYCIU',    legal: 'wykroczenie', kolor: COLORS.warning, emoji: '🟡' },

  // ── Stan wskazujący (0.50–0.79‰) — 6% ─────────────────────────────────────
  { bac: '0.58', poziom: 'STAN WSKAZUJĄCY', legal: 'przestępstwo', kolor: 0xFF6B00, emoji: '🟠' },
  { bac: '0.74', poziom: 'STAN WSKAZUJĄCY', legal: 'przestępstwo', kolor: 0xFF6B00, emoji: '🟠' },

  // ── Poważne upojenie (0.80–1.50‰) — 2% ────────────────────────────────────
  { bac: '1.12', poziom: 'STAN WSKAZUJĄCY', legal: 'przestępstwo', kolor: COLORS.error,   emoji: '🔴' },
];

function rollBac() {
  return BAC_POOL[Math.floor(Math.random() * BAC_POOL.length)];
}

function buildLegalNote(result) {
  if (!result.legal) return '✅ Wynik w normie — brak podstaw prawnych do dalszego działania.';
  if (result.legal === 'wykroczenie') {
    return '⚠️ **Wykroczenie** — art. 87 § 1 k.w. (prowadzenie po spożyciu alkoholu)\nMoże skutkować: mandat, zakaz prowadzenia, punkty karne.';
  }
  return '🚨 **Przestępstwo** — art. 178a § 1 k.k. (prowadzenie w stanie wskazującym)\nNależy **zatrzymać prawo jazdy** i sporządzić protokół.';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('badanie-trzezwosci')
    .setDescription('Przeprowadź badanie alkomatem (RP — wynik widoczny publicznie)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz poddawany badaniu trzeźwości')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('kontekst')
        .setDescription('Powód badania (np. "kontrola drogowa", "podejrzenie jazdy po alkoholu")')
        .setRequired(false)
        .setMaxLength(150)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    const member = interaction.member;
    const isOnDuty = member.roles.cache.some(r => AUTHORIZED_ON_DUTY.includes(r.name));

    if (!isOnDuty && !isStaff(member)) {
      return interaction.editReply({
        content: '❌ Badanie trzeźwości dostępne tylko dla **Policja On-Duty** lub **Straż Miejska On-Duty**. Użyj `/duty`, aby wejść na służbę.',
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser('gracz');
    const kontekst   = interaction.options.getString('kontekst')?.trim() ?? null;

    if (targetUser.bot) {
      return interaction.editReply({ content: '❌ Nie można przeprowadzić badania bota.' });
    }
    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({ content: '❌ Nie możesz badać samego siebie.' });
    }

    // IC imię funkcjonariusza
    const officerDb = await prisma.user
      .findUnique({ where: { discordId: interaction.user.id }, include: { character: true } })
      .catch(() => null);
    const officerChar = officerDb?.character;
    const icOfficer   = officerChar
      ? `${officerChar.firstName} ${officerChar.lastName}`
      : (member?.displayName ?? interaction.user.username);

    // IC imię badanej osoby
    const targetDb = await prisma.user
      .findUnique({ where: { discordId: targetUser.id }, include: { character: true } })
      .catch(() => null);
    const targetChar = targetDb?.character;
    const icTarget   = targetChar
      ? `${targetChar.firstName} ${targetChar.lastName}`
      : targetUser.username;

    const result    = rollBac();
    const legalNote = buildLegalNote(result);
    const isClean   = !result.legal;

    const embed = new EmbedBuilder()
      .setColor(result.kolor)
      .setTitle(`${result.emoji} BADANIE TRZEŹWOŚCI — ALKOMAT`)
      .setDescription(
        `*Funkcjonariusz **${icOfficer}** przeprowadza badanie trzeźwości alkomatem wobec osoby **${icTarget}**.*`
      )
      .addFields(
        { name: '👤 Badana osoba',   value: `<@${targetUser.id}> — **${icTarget}**`, inline: true },
        { name: '👮 Funkcjonariusz', value: icOfficer,                                  inline: true },
        {
          name:   `${result.emoji} Wynik badania`,
          value:  `**${result.bac}‰** — ${result.poziom}`,
          inline: false,
        },
        {
          name:  isClean ? '✅ Podstawa prawna' : '⚖️ Podstawa prawna',
          value: legalNote,
          inline: false,
        },
      )
      .setFooter({
        text:    `${interaction.user.tag} • ${interaction.channel.name} • /badanie-trzezwosci`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    if (kontekst) {
      embed.addFields({ name: '📋 Kontekst', value: kontekst, inline: false });
    }

    logger.info(
      `/badanie-trzezwosci | ${interaction.user.tag} (${icOfficer}) → ${targetUser.tag} (${icTarget}) | ${result.bac}‰ (${result.poziom})` +
      (kontekst ? ` | kontekst: ${kontekst}` : '')
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
