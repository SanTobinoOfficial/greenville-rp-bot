// Komenda /rekord-ic — kompleksowy rekord IC postaci
// moje: własny rekord (Mieszkaniec+) | gracza: rekord innego gracza (Staff+)
// Agreguje: postać, licencje, aktywne mandaty, zatrzymania, nakazy CAD (Staff)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const LICENSE_EMOJI = {
  AM: '🛵', A1: '🏍️', A2: '🏍️', A: '🏍️',
  B1: '🚗', B: '🚗', BE: '🚗',
  C1: '🚛', C1E: '🚛', C: '🚛', CE: '🚛',
  D1: '🚌', D1E: '🚌', D: '🚌', DE: '🚌',
  T: '🚜',
};

const LICENSE_STATUS = {
  ACTIVE:    '🟢 Aktywne',
  SUSPENDED: '🟡 Zawieszone',
  REVOKED:   '🔴 Cofnięte',
};

const FINE_EMOJI = { MANDAT: '🚔', GRZYWNA: '💰', ARESZT: '⛓️' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rekord-ic')
    .setDescription('Kompleksowy podgląd rekordu IC: postać, licencje, mandaty, zatrzymania')
    .addSubcommand(sub =>
      sub.setName('moje')
        .setDescription('Twój własny rekord IC (Mieszkaniec+)')
    )
    .addSubcommand(sub =>
      sub.setName('gracza')
        .setDescription('Rekord IC wybranego gracza (Staff+)')
        .addUserOption(opt =>
          opt.setName('gracz')
            .setDescription('Gracz do sprawdzenia')
            .setRequired(true)
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const isStaffView = sub === 'gracza';

    if (isStaffView) {
      if (!isStaff(interaction.member)) {
        return interaction.editReply({
          content: '❌ Tylko Staff może przeglądać rekordy innych graczy.',
        });
      }
    } else {
      if (!isVerified(interaction.member)) {
        return interaction.editReply({
          content: '❌ Wymagana rola **Mieszkaniec** aby sprawdzić swój rekord IC.',
        });
      }
    }

    const targetDiscordUser = isStaffView
      ? interaction.options.getUser('gracz')
      : interaction.user;

    const dbUser = await prisma.user.findUnique({
      where: { discordId: targetDiscordUser.id },
      include: {
        character: true,
        licenses: { orderBy: { kategoria: 'asc' } },
        finesReceived: {
          where: { active: true },
          orderBy: { createdAt: 'desc' },
        },
        arrests: { where: { active: true } },
      },
    });

    if (!dbUser) {
      return interaction.editReply({
        content: `❌ Gracz <@${targetDiscordUser.id}> nie jest zarejestrowany w systemie RP.`,
      });
    }

    const char = dbUser.character;
    const licenses = dbUser.licenses;
    const activeFines = dbUser.finesReceived;
    const activeArrests = dbUser.arrests;

    // Nakazy z CAD — widoczne tylko dla Staff (metagaming prevention)
    let activeWarrant = null;
    if (isStaffView && char) {
      activeWarrant = await prisma.cadWarrant.findFirst({
        where: {
          active: true,
          OR: [
            { targetDiscordId: targetDiscordUser.id },
            { targetName: { contains: `${char.firstName} ${char.lastName}`, mode: 'insensitive' } },
          ],
        },
        select: { reason: true, issuedByName: true, createdAt: true },
      });
    }

    const embedColor = activeArrests.length > 0
      ? COLORS.error
      : activeFines.length > 0
        ? COLORS.warning
        : COLORS.success;

    const charName = char
      ? `${char.firstName} ${char.lastName}`
      : targetDiscordUser.displayName;

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`🪪 Rekord IC — ${charName}`)
      .setThumbnail(targetDiscordUser.displayAvatarURL())
      .setFooter({
        text: isStaffView
          ? `AURORA Greenville RP — sprawdził: ${interaction.user.tag}`
          : 'AURORA Greenville RP — Twój rekord IC • widoczne tylko dla Ciebie',
      })
      .setTimestamp();

    // ── Sekcja: Postać ───────────────────────────────────────────────────────
    if (char) {
      const ageYears = new Date().getFullYear() - new Date(char.birthDate).getFullYear();
      const birthTs  = Math.floor(new Date(char.birthDate).getTime() / 1000);
      embed.addFields({
        name: '👤 Postać',
        value: [
          `**Imię i nazwisko:** ${char.firstName} ${char.lastName}`,
          `**Data urodzenia:** <t:${birthTs}:D> *(${ageYears} lat)*`,
          `**Praca IC:** ${dbUser.currentJob ?? '*(brak przypisanej pracy)*'}`,
        ].join('\n'),
        inline: false,
      });
    } else {
      embed.addFields({
        name: '👤 Postać',
        value: '*(Brak stworzonej postaci — utwórz postać w #weryfikacja)*',
        inline: false,
      });
    }

    // ── Sekcja: Prawo jazdy ──────────────────────────────────────────────────
    if (licenses.length > 0) {
      const lines = licenses.map(l => {
        const emoji  = LICENSE_EMOJI[l.kategoria] ?? '📄';
        const status = LICENSE_STATUS[l.status] ?? l.status;
        return `${emoji} Kat. **${l.kategoria}** — ${status}`;
      });
      embed.addFields({
        name: `🪪 Prawo jazdy (${licenses.length})`,
        value: lines.join('\n'),
        inline: false,
      });
    } else {
      embed.addFields({
        name: '🪪 Prawo jazdy',
        value: '*(Brak wydanych kategorii)*',
        inline: false,
      });
    }

    // ── Sekcja: Aktywne wpisy karne ──────────────────────────────────────────
    const mandaty      = activeFines.filter(f => f.type === 'MANDAT').length;
    const grzywny      = activeFines.filter(f => f.type === 'GRZYWNA').length;
    const aresztyFines = activeFines.filter(f => f.type === 'ARESZT').length;

    let finesText = `🚔 Mandaty: **${mandaty}**  ·  💰 Grzywny: **${grzywny}**  ·  ⛓️ Areszty RP: **${aresztyFines}**\n`;

    if (activeFines.length === 0) {
      finesText += '✅ Brak aktywnych wpisów karnych';
    } else {
      const preview = activeFines.slice(0, 4).map(f => {
        const ts    = Math.floor(new Date(f.createdAt).getTime() / 1000);
        const emoji = FINE_EMOJI[f.type] ?? '📋';
        const kwota = f.amount ? ` — ${f.amount.toLocaleString('pl-PL')} zł` : '';
        const reas  = f.reason.length > 55 ? f.reason.slice(0, 52) + '…' : f.reason;
        return `${emoji} <t:${ts}:d>${kwota} — ${reas}`;
      });
      finesText += preview.join('\n');
      if (activeFines.length > 4) finesText += `\n*…i jeszcze ${activeFines.length - 4} wpisów*`;
    }

    embed.addFields({
      name: `📋 Aktywne wpisy karne (${activeFines.length})`,
      value: finesText,
      inline: false,
    });

    // ── Sekcja: Status IC ────────────────────────────────────────────────────
    const statusLines = [];

    if (activeArrests.length > 0) {
      statusLines.push('🔒 **Zatrzymany RP** — aktywne zatrzymanie w systemie');
    }

    if (activeWarrant) {
      const wTs = Math.floor(new Date(activeWarrant.createdAt).getTime() / 1000);
      statusLines.push(
        `⚠️ **Aktywny nakaz CAD** — wydany <t:${wTs}:R> przez ${activeWarrant.issuedByName}`
      );
    }

    if (statusLines.length === 0) {
      statusLines.push('✅ Brak aktywnych zatrzymań ani nakazów');
    }

    embed.addFields({
      name: '🚨 Status IC',
      value: statusLines.join('\n'),
      inline: false,
    });

    logger.info(
      `/rekord-ic ${sub}: ${interaction.user.tag}` +
      (isStaffView ? ` → ${targetDiscordUser.tag}` : '')
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
