// Komenda /historia — historia przypadków moderacyjnych gracza
// Paginowany embed pokazujący warn/ban/kick/mute
// Dostępna dla: Helper+

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { isStaff, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embed');

// Liczba case'ów na jedną stronę
const CASES_PER_PAGE = 5;

// Mapowanie typów na emoji i kolory
const CASE_CONFIG = {
  WARN:   { emoji: '⚠️', label: 'Ostrzeżenie', color: COLORS.mod_warn },
  BAN:    { emoji: '🔨', label: 'Ban',          color: COLORS.mod_ban },
  KICK:   { emoji: '👢', label: 'Kick',         color: COLORS.mod_kick },
  MUTE:   { emoji: '🔇', label: 'Wyciszenie',   color: COLORS.mod_mute },
  UNBAN:  { emoji: '✅', label: 'Unban',        color: COLORS.mod_unban },
  UNMUTE: { emoji: '🔊', label: 'Odciszenie',   color: COLORS.mod_unban },
};

// Status case'a
const STATUS_LABELS = {
  ACTIVE:   '🟢 Aktywny',
  EXPIRED:  '⏱️ Wygasły',
  REMOVED:  '🗑️ Usunięty',
  APPEALED: '⚖️ Odwołany',
};

// Formatowanie czasu trwania w sekundach → czytelny tekst
function formatDurationSec(seconds) {
  if (!seconds) return 'N/A';
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(' ') || '< 1m';
}

// Budowanie embeda dla danej strony
function buildPageEmbed(cases, page, totalPages, targetUser, totalCases) {
  const start = page * CASES_PER_PAGE;
  const pageCases = cases.slice(start, start + CASES_PER_PAGE);

  // Zliczenie typów
  const counts = {};
  for (const c of cases) {
    counts[c.type] = (counts[c.type] || 0) + 1;
  }

  const summaryParts = Object.entries(counts).map(([type, count]) => {
    const cfg = CASE_CONFIG[type] || { emoji: '📋', label: type };
    return `${cfg.emoji} ${cfg.label}: **${count}**`;
  });

  const embed = new EmbedBuilder()
    .setColor(COLORS.neutral)
    .setTitle(`📋 Historia moderacji — ${targetUser.tag}`)
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
    .setDescription(
      summaryParts.length > 0
        ? `**Podsumowanie:** ${summaryParts.join(' | ')}\n\n**Łącznie case'ów:** ${totalCases}`
        : `Brak wpisów moderacyjnych dla tego gracza.`
    )
    .setFooter({ text: `Strona ${page + 1}/${totalPages} • Greenville RP — Moderacja` })
    .setTimestamp();

  // Dodanie case'ów dla bieżącej strony
  for (const c of pageCases) {
    const cfg = CASE_CONFIG[c.type] || { emoji: '📋', label: c.type };
    const statusLabel = STATUS_LABELS[c.status] || c.status;
    const date = `<t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:d>`;

    let fieldValue = `**Powód:** ${c.reason}\n**Moderator:** <@${c.moderator.discordId}>\n**Status:** ${statusLabel}\n**Data:** ${date}`;

    if (c.duration) {
      fieldValue += `\n**Czas:** ${formatDurationSec(c.duration)}`;
    }
    if (c.expiresAt) {
      fieldValue += `\n**Wygasa:** <t:${Math.floor(new Date(c.expiresAt).getTime() / 1000)}:R>`;
    }

    embed.addFields({
      name: `${cfg.emoji} Case #${c.caseNumber} — ${cfg.label}`,
      value: fieldValue,
      inline: false,
    });
  }

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historia')
    .setDescription('Wyświetl historię moderacji gracza (Staff+)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz którego historię chcesz sprawdzić')
        .setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;

    // Tylko Staff (Helper+)
    if (!isStaff(member)) {
      return interaction.editReply(noPermissionReply('Staff (Helper+)'));
    }

    const targetUser = interaction.options.getUser('gracz');

    // Pobranie gracza z bazy
    const targetDbUser = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
    });

    if (!targetDbUser) {
      return interaction.editReply({
        content: `❌ Gracz ${targetUser} nie jest zarejestrowany w systemie.`,
      });
    }

    // Pobranie wszystkich case'ów gracza
    const allCases = await prisma.case.findMany({
      where: { targetId: targetDbUser.id },
      orderBy: { caseNumber: 'desc' },
      include: { moderator: true },
    });

    if (allCases.length === 0) {
      return interaction.editReply({
        content: `✅ Gracz **${targetUser.tag}** nie ma żadnych wpisów moderacyjnych.`,
      });
    }

    const totalPages = Math.ceil(allCases.length / CASES_PER_PAGE);
    let currentPage = 0;

    // Budowanie przycisków paginacji
    function buildButtons(page) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('hist_first')
          .setLabel('⏮️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('hist_prev')
          .setLabel('◀️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('hist_page')
          .setLabel(`${page + 1}/${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('hist_next')
          .setLabel('▶️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= totalPages - 1),
        new ButtonBuilder()
          .setCustomId('hist_last')
          .setLabel('⏭️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages - 1),
      );
    }

    const initialEmbed = buildPageEmbed(allCases, currentPage, totalPages, targetUser, allCases.length);
    const initialRow = buildButtons(currentPage);

    const reply = await interaction.editReply({
      embeds: [initialEmbed],
      components: totalPages > 1 ? [initialRow] : [],
    });

    // Obsługa paginacji — tylko dla wywołującego, przez 2 minuty
    if (totalPages > 1) {
      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === interaction.user.id,
        time: 120_000,
      });

      collector.on('collect', async i => {
        switch (i.customId) {
          case 'hist_first': currentPage = 0; break;
          case 'hist_prev':  currentPage = Math.max(0, currentPage - 1); break;
          case 'hist_next':  currentPage = Math.min(totalPages - 1, currentPage + 1); break;
          case 'hist_last':  currentPage = totalPages - 1; break;
        }

        await i.update({
          embeds: [buildPageEmbed(allCases, currentPage, totalPages, targetUser, allCases.length)],
          components: [buildButtons(currentPage)],
        });
      });

      collector.on('end', async () => {
        // Wyłącz przyciski po wygaśnięciu kolektora
        try {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('hist_first').setLabel('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('hist_prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('hist_page').setLabel(`${currentPage + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('hist_next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('hist_last').setLabel('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(true),
          );
          await interaction.editReply({ components: [disabledRow] });
        } catch {
          // Interakcja mogła wygasnąć — ignorujemy błąd
        }
      });
    }
  },
};
