// Komenda /recydywa — sprawdź historię kryminalną gracza
// Wyświetla mandaty, grzywny, areszty, warny i BOLO
// Dostępna dla: Policja, Straż Miejska, Staff

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recydywa')
    .setDescription('Sprawdź historię kryminalną gracza (wywiad policyjny)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz którego historię sprawdzasz')
        .setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    const isPolicja = member.roles.cache.some(r =>
      r.name === ROLES.POLICJA || r.name === 'Policja On-Duty'
    );
    const isSM = member.roles.cache.some(r => r.name === ROLES.STRAZ_MIEJSKA);

    if (!isPolicja && !isSM && !isStaff(member)) {
      return interaction.editReply({ content: '❌ Tylko Policja, Straż Miejska lub Staff może sprawdzać historię kryminalną.' });
    }

    const targetUser = interaction.options.getUser('gracz');

    const user = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
      include: {
        character: true,
        finesReceived: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { issuer: { select: { discordUsername: true } } },
        },
        arrests: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { officer: { select: { discordUsername: true } } },
        },
        casesAsTarget: {
          where: { type: 'WARN', status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { moderator: { select: { discordUsername: true } } },
        },
        licenses: true,
      },
    });

    if (!user) {
      return interaction.editReply({ content: `❌ Gracz <@${targetUser.id}> nie jest zarejestrowany w systemie RP.` });
    }

    // ── Zlicz aktywne kary ────────────────────────────────────────
    const activeFines    = user.finesReceived.filter(f => f.active);
    const countMandaty   = activeFines.filter(f => f.type === 'MANDAT').length;
    const countGrzywny   = activeFines.filter(f => f.type === 'GRZYWNA').length;
    const countAreszty   = activeFines.filter(f => f.type === 'ARESZT').length;
    const activeArrests  = user.arrests.filter(a => a.active).length;
    const activeWarns    = user.casesAsTarget.length;

    // ── Sprawdź BOLO ──────────────────────────────────────────────
    const char = user.character;
    const charFullName = char ? `${char.firstName} ${char.lastName}` : null;
    let boloRecords = [];
    if (charFullName) {
      boloRecords = await prisma.cadWarrant.findMany({
        where: { targetName: { contains: charFullName, mode: 'insensitive' }, active: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });
    }

    // ── Prawo jazdy ───────────────────────────────────────────────
    const activeLicenses   = user.licenses.filter(l => l.status === 'ACTIVE');
    const suspendedLic     = user.licenses.filter(l => l.status === 'SUSPENDED');
    const licStatus        = suspendedLic.length > 0
      ? `⛔ ZAWIESZONE (${suspendedLic.length} kat.)`
      : activeLicenses.length > 0
        ? `✅ Aktywne (${activeLicenses.map(l => `Kat. ${l.kategoria}`).join(', ')})`
        : '❌ Brak prawa jazdy';

    // ── Historia mandatów ─────────────────────────────────────────
    const fineHistory = activeFines.length > 0
      ? activeFines.slice(0, 6).map(f =>
          `• **${f.type}** — ${f.reason.slice(0, 50)}${f.amount ? ` (${f.amount.toLocaleString('pl-PL')}$)` : ''} — <t:${Math.floor(f.createdAt.getTime()/1000)}:d>`
        ).join('\n')
      : '*Brak aktywnych mandatów*';

    // ── Buduj embed ───────────────────────────────────────────────
    const isHighRisk = countMandaty >= 7 || countGrzywny >= 4 || countAreszty >= 4 || activeArrests > 0 || boloRecords.length > 0;

    const embed = new EmbedBuilder()
      .setColor(isHighRisk ? COLORS.error : COLORS.warning)
      .setTitle(`🔍 Wywiad policyjny — ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        {
          name: '🪪 Dane postaci',
          value: char
            ? `**${charFullName}**\nPESEL: ||${char.peselRp}||\nDowód: \`${char.documentId}\``
            : '❌ Brak postaci RP',
          inline: true,
        },
        {
          name: '🚗 Prawo jazdy',
          value: licStatus,
          inline: true,
        },
        {
          name: '📊 Historia karna',
          value: [
            `🚔 Mandaty aktywne: **${countMandaty}/10**`,
            `💸 Grzywny aktywne: **${countGrzywny}/5**`,
            `⛓️ Areszty aktywne: **${countAreszty}/5**`,
            `🔒 Zatrzymania:  **${activeArrests}**`,
            `⚠️ Warny (Discord): **${activeWarns}**`,
          ].join('\n'),
          inline: false,
        },
        {
          name: '📜 Ostatnie mandaty/grzywny',
          value: fineHistory,
          inline: false,
        },
      )
      .setFooter({ text: `AURORA Greenville RP — Wywiad Policyjny • ${new Date().toLocaleDateString('pl-PL')}` })
      .setTimestamp();

    // BOLO
    if (boloRecords.length > 0) {
      embed.addFields({
        name: '🚨 AKTYWNE BOLO',
        value: boloRecords.map(b =>
          `• **${b.targetName}** — ${b.reason.slice(0, 80)} — <t:${Math.floor(b.createdAt.getTime()/1000)}:d>`
        ).join('\n'),
        inline: false,
      });
    }

    // Banner wysokiego ryzyka
    if (isHighRisk) {
      embed.setDescription('⚠️ **UWAGA: Osoba figuruje w rejestrach jako potencjalnie niebezpieczna. Zachowaj ostrożność.**');
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
