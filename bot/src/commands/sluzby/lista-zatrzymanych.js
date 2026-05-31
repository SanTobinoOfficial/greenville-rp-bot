// Komenda /lista-zatrzymanych — podgląd wszystkich aktywnych zatrzymań
// Odpowiednik /lista-bolo dla systemu zatrzymań (Arrest).
// Wyświetla kto jest aktualnie w areszcie, od kiedy, przez kogo i za co.
// Dostępna dla: Policja, Straż Miejska, Staff (Helper+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const MAX_RESULTS = 20;
const CHUNK_SIZE  = 5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lista-zatrzymanych')
    .setDescription('Wyświetl wszystkich graczy aktualnie zatrzymanych (aktywne areszty)'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    const isPolicja = member.roles.cache.some(
      r => r.name === ROLES.POLICJA || r.name === 'Policja On-Duty'
    );
    const isSM = member.roles.cache.some(r => r.name === ROLES.STRAZ_MIEJSKA);

    if (!isPolicja && !isSM && !isStaff(member)) {
      return interaction.editReply({
        content: '❌ Tylko Policja, Straż Miejska lub Staff może przeglądać listę zatrzymanych.',
      });
    }

    let arrests;
    try {
      arrests = await prisma.arrest.findMany({
        where:   { active: true },
        orderBy: { createdAt: 'asc' },
        take:    MAX_RESULTS,
        include: {
          target: {
            select: {
              discordId:      true,
              discordUsername: true,
              character:       { select: { firstName: true, lastName: true } },
            },
          },
          officer: {
            select: { discordId: true, discordUsername: true },
          },
        },
      });
    } catch (err) {
      logger.error('lista-zatrzymanych: błąd bazy danych:', err.message);
      return interaction.editReply({
        content: '❌ Błąd podczas pobierania danych. Spróbuj ponownie.',
      });
    }

    if (arrests.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('✅ Lista zatrzymanych — Areszt pusty')
            .setDescription('Brak aktywnych zatrzymań. Żaden gracz nie jest aktualnie w areszcie.')
            .setFooter({ text: 'AURORA Greenville RP — Policja' })
            .setTimestamp(),
        ],
      });
    }

    // Formatuj każdy wpis
    const lines = arrests.map((a, i) => {
      const char     = a.target.character;
      const icName   = char ? `${char.firstName} ${char.lastName}` : '*Brak postaci*';
      const since    = `<t:${Math.floor(new Date(a.createdAt).getTime() / 1000)}:R>`;
      const sinceAbs = `<t:${Math.floor(new Date(a.createdAt).getTime() / 1000)}:T>`;
      const reason   = a.reason.length > 80 ? a.reason.slice(0, 77) + '…' : a.reason;

      return [
        `**${i + 1}.** 🔵 <@${a.target.discordId}> — *${icName}*`,
        `> 📝 **Powód:** ${reason}`,
        `> 🚔 **Funkcjonariusz:** <@${a.officer.discordId}>`,
        `> 🕐 **Zatrzymano:** ${sinceAbs} (${since})`,
        `> 🆔 \`${a.id.slice(-8)}\``,
      ].join('\n');
    });

    // Podziel na chunki (limit Discord: 1024 znaków na pole)
    const chunks = [];
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      let chunk = lines.slice(i, i + CHUNK_SIZE).join('\n\n');
      if (chunk.length > 1020) chunk = chunk.slice(0, 1017) + '…';
      chunks.push(chunk);
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.mod_ban)
      .setTitle(`🚔 Lista zatrzymanych — ${arrests.length} aktywnych`)
      .setDescription(
        `Łącznie w areszcie: **${arrests.length}** ${arrests.length >= MAX_RESULTS ? `(pokazano max ${MAX_RESULTS})` : ''}`
      )
      .setFooter({
        text: 'AURORA Greenville RP — Policja  |  /zwolnij aby zwolnić  |  /zatrzymaj aby zatrzymać',
      })
      .setTimestamp();

    chunks.forEach((chunk, ci) => {
      const fieldName = chunks.length > 1
        ? `📋 Zatrzymani (${ci + 1}/${chunks.length})`
        : '📋 Zatrzymani';
      embed.addFields({ name: fieldName, value: chunk, inline: false });
    });

    logger.info(
      `/lista-zatrzymanych | ${interaction.user.tag} | ${arrests.length} aktywnych zatrzymań`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
