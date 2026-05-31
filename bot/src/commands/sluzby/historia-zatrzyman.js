// Komenda /historia-zatrzyman — historia zatrzymań gracza
// Pokazuje listę wszystkich zatrzymań: kiedy, kto, za co, kiedy/kto zwolnił
// Dostępna dla: Policja | Staff (Helper+) | sam gracz (własna historia)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const PAGE_SIZE = 5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historia-zatrzyman')
    .setDescription('Sprawdź historię zatrzymań gracza')
    .addUserOption(opt =>
      opt
        .setName('gracz')
        .setDescription('Gracz którego historię chcesz sprawdzić')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('strona')
        .setDescription('Numer strony wyników (domyślnie 1)')
        .setMinValue(1)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    const targetUser = interaction.options.getUser('gracz');
    const page = interaction.options.getInteger('strona') ?? 1;

    const isSelf = targetUser.id === interaction.user.id;
    const isPolicja = member.roles.cache.some(
      r => r.name === ROLES.POLICJA || r.name === 'Policja On-Duty'
    );

    if (!isSelf && !isPolicja && !isStaff(member)) {
      return interaction.editReply({
        content:
          '❌ Możesz sprawdzać tylko swoją własną historię zatrzymań. ' +
          'Wymagana rola **Policja** lub **Staff (Helper+)** do sprawdzania innych graczy.',
      });
    }

    if (targetUser.bot) {
      return interaction.editReply({ content: '❌ Boty nie mają historii zatrzymań.' });
    }

    const targetDb = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
    });

    if (!targetDb) {
      return interaction.editReply({
        content: `❌ Gracz ${targetUser} nie jest zarejestrowany w systemie RP.`,
      });
    }

    const allArrests = await prisma.arrest.findMany({
      where: { targetId: targetDb.id },
      orderBy: { createdAt: 'desc' },
      include: { officer: { select: { discordId: true, discordUsername: true } } },
    });

    const totalCount = allArrests.length;
    const activeArrest = allArrests.find(a => a.active) ?? null;

    if (totalCount === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('📋 Historia zatrzymań — brak wpisów')
            .setDescription(`Gracz **${targetUser.tag}** nie ma żadnych zatrzymań w systemie.`)
            .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
            .setFooter({ text: 'AURORA Greenville RP — Policja' })
            .setTimestamp(),
        ],
      });
    }

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    const safePage = Math.min(page, totalPages);
    const slice = allArrests.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const lines = slice.map((a, i) => {
      const num = (safePage - 1) * PAGE_SIZE + i + 1;
      const detained = `<t:${Math.floor(new Date(a.createdAt).getTime() / 1000)}:f>`;
      const officerMention = `<@${a.officer.discordId}>`;
      const statusIcon = a.active ? '🟠' : '✅';

      let line = `**${num}.** ${statusIcon} ${detained}\n` +
        `> 📝 **Powód:** ${a.reason}\n` +
        `> 🚔 **Funkcjonariusz:** ${officerMention}`;

      if (!a.active && a.releasedAt) {
        const relTs = Math.floor(new Date(a.releasedAt).getTime() / 1000);
        line += `\n> ✅ **Zwolniony:** <t:${relTs}:f>`;
        if (a.releasedBy) {
          line += ` przez \`${a.releasedBy}\``;
        }
      }

      return line;
    });

    const statusSummary = activeArrest
      ? `🟠 **Aktualnie zatrzymany/a** (od <t:${Math.floor(new Date(activeArrest.createdAt).getTime() / 1000)}:R>)`
      : '✅ Nie jest aktualnie zatrzymany/a';

    const embed = new EmbedBuilder()
      .setColor(activeArrest ? COLORS.mod_ban : COLORS.rp)
      .setTitle(`🚔 Historia zatrzymań — ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
      .setDescription(
        `**Status:** ${statusSummary}\n\n` +
        lines.join('\n\n')
      )
      .addFields({
        name: '📊 Podsumowanie',
        value: [
          `Łącznie zatrzymań: **${totalCount}**`,
          `Zakończonych: **${allArrests.filter(a => !a.active).length}**`,
          `Aktywnych: **${allArrests.filter(a => a.active).length}**`,
        ].join(' · '),
        inline: false,
      })
      .setFooter({
        text:
          `AURORA Greenville RP — Policja • Strona ${safePage}/${totalPages}` +
          (safePage < totalPages ? ` • Użyj /historia-zatrzyman strona:${safePage + 1} po więcej` : ''),
      })
      .setTimestamp();

    logger.info(
      `/historia-zatrzyman | ${interaction.user.tag} sprawdza ${targetUser.tag} ` +
      `| ${totalCount} wpisów | strona ${safePage}`
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
