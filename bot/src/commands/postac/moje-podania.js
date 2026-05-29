// Komenda /moje-podania — historia podań o pracę gracza
// Pokazuje wszystkie złożone podania z pełnym statusem, datą rozpatrzenia i uwagami staffu
// Dostępna dla: zweryfikowani gracze (własne podania) | Staff (może sprawdzić cudze)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const MAX_APPS = 8;

const STATUS_INFO = {
  PENDING:    { emoji: '🕐', label: 'Oczekujące',        color: COLORS.warning  },
  ACCEPTED:   { emoji: '✅', label: 'Zaakceptowane',      color: COLORS.success  },
  REJECTED:   { emoji: '❌', label: 'Odrzucone',          color: COLORS.error    },
  INCOMPLETE: { emoji: '📝', label: 'Do uzupełnienia',    color: 0xFF9F00        },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moje-podania')
    .setDescription('Sprawdź historię swoich podań o pracę — statusy, decyzje, uwagi staffu')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Sprawdź podania innego gracza (tylko Staff)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('status')
        .setDescription('Filtruj po statusie (domyślnie: wszystkie)')
        .setRequired(false)
        .addChoices(
          { name: '🕐 Oczekujące',       value: 'PENDING'    },
          { name: '✅ Zaakceptowane',     value: 'ACCEPTED'   },
          { name: '❌ Odrzucone',         value: 'REJECTED'   },
          { name: '📝 Do uzupełnienia',   value: 'INCOMPLETE' },
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Musisz być zweryfikowanym mieszkańcem, żeby używać tej komendy.',
      });
    }

    const targetDiscordUser = interaction.options.getUser('gracz');
    const checkingOther = !!targetDiscordUser;

    if (checkingOther && !isStaff(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko Staff może sprawdzać podania innych graczy.',
      });
    }

    const discordId = checkingOther ? targetDiscordUser.id : interaction.user.id;
    const displayUser = checkingOther ? targetDiscordUser : interaction.user;

    const user = await prisma.user.findUnique({ where: { discordId } }).catch(() => null);

    if (!user) {
      return interaction.editReply({
        content: checkingOther
          ? '❌ Ten gracz nie jest zarejestrowany w systemie.'
          : '❌ Nie znaleziono Twojego konta w systemie.',
      });
    }

    const statusFilter = interaction.options.getString('status');

    const whereClause = { userId: user.id };
    if (statusFilter) whereClause.status = statusFilter;

    let apps;
    try {
      apps = await prisma.jobApplication.findMany({
        where:   whereClause,
        orderBy: { appliedAt: 'desc' },
        take:    MAX_APPS,
      });
    } catch (err) {
      logger.error('moje-podania: błąd bazy danych:', err);
      return interaction.editReply({ content: '❌ Błąd podczas pobierania danych. Spróbuj ponownie.' });
    }

    if (apps.length === 0) {
      const filterLabel = statusFilter ? ` o statusie **${STATUS_INFO[statusFilter]?.label ?? statusFilter}**` : '';
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.neutral)
            .setTitle('📋 Brak podań')
            .setDescription(
              checkingOther
                ? `Gracz **${displayUser.tag}** nie złożył żadnych podań${filterLabel}.`
                : `Nie złożyłeś/aś jeszcze żadnych podań o pracę${filterLabel}.\n\nUżyj \`/wybierz-prace\`, aby złożyć podanie.`
            )
            .setFooter({ text: 'AURORA Greenville RP — System Pracy' })
            .setTimestamp(),
        ],
      });
    }

    // Podsumowanie statusów
    const counts = { PENDING: 0, ACCEPTED: 0, REJECTED: 0, INCOMPLETE: 0 };
    for (const a of apps) counts[a.status] = (counts[a.status] ?? 0) + 1;

    // Dominujący kolor — priorytet: ACCEPTED > PENDING > INCOMPLETE > REJECTED
    const embedColor = counts.ACCEPTED > 0
      ? COLORS.success
      : counts.PENDING > 0
        ? COLORS.warning
        : counts.INCOMPLETE > 0
          ? 0xFF9F00
          : COLORS.error;

    const ownerLabel = checkingOther
      ? `${displayUser.tag}`
      : 'Twoje';

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`📋 ${ownerLabel} podania o pracę`)
      .setThumbnail(displayUser.displayAvatarURL({ size: 64 }))
      .setFooter({ text: `Wyświetlono ${apps.length} podań • AURORA Greenville RP — System Pracy` })
      .setTimestamp();

    // Wiersz podsumowania
    const summaryParts = [];
    if (counts.PENDING    > 0) summaryParts.push(`🕐 Oczekujące: **${counts.PENDING}**`);
    if (counts.ACCEPTED   > 0) summaryParts.push(`✅ Zaakceptowane: **${counts.ACCEPTED}**`);
    if (counts.REJECTED   > 0) summaryParts.push(`❌ Odrzucone: **${counts.REJECTED}**`);
    if (counts.INCOMPLETE > 0) summaryParts.push(`📝 Do uzupełnienia: **${counts.INCOMPLETE}**`);
    if (summaryParts.length > 0) {
      embed.setDescription(summaryParts.join('  •  '));
    }

    // Każde podanie jako osobne pole embeda
    for (const app of apps) {
      const info   = STATUS_INFO[app.status] ?? { emoji: '❔', label: app.status };
      const appTs  = Math.floor(new Date(app.appliedAt).getTime() / 1000);

      const lines = [
        `📁 Kategoria: **${app.jobCategory}**`,
        `🕐 Złożone: <t:${appTs}:D> (<t:${appTs}:R>)`,
      ];

      if (app.reviewedAt) {
        const revTs = Math.floor(new Date(app.reviewedAt).getTime() / 1000);
        const reviewer = app.reviewedBy?.startsWith('PLAYER:')
          ? `*anulowane przez gracza*`
          : app.reviewedBy ?? 'Staff';
        lines.push(`🛡️ Rozpatrzył: **${reviewer}** · <t:${revTs}:D>`);
      }

      if (app.reviewNote) {
        const note = app.reviewNote.length > 120
          ? app.reviewNote.slice(0, 117) + '…'
          : app.reviewNote;
        lines.push(`💬 Uwagi: *${note}*`);
      }

      embed.addFields({
        name:   `${info.emoji} ${app.jobName} — ${info.label}`,
        value:  lines.join('\n'),
        inline: false,
      });
    }

    logger.info(
      `moje-podania | ${interaction.user.tag}${checkingOther ? ` → ${displayUser.tag}` : ''} | wyniki: ${apps.length}${statusFilter ? ` (filtr: ${statusFilter})` : ''}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
