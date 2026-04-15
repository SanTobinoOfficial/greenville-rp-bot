// Komenda /patrol — start/stop patrolu (log dla Policji, EMS, Straży)
// Dostępna dla: Policja | EMS | Straż | Staff

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');

// Mapa trwających patroli (in-memory: serviceKey → Map<userId, startTime>)
const activePatrols = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('patrol')
    .setDescription('Zarządzaj patrolem (Policja/EMS/Straż)')
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Rozpocznij patrol')
        .addStringOption(opt =>
          opt.setName('rejon')
            .setDescription('Rejon patrolu (np. Centrum, Port, Śródmieście)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('stop')
        .setDescription('Zakończ patrol i podsumuj')
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Aktualne patrole na serwerze')
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    const member = interaction.member;
    const isSluzba = member.roles.cache.some(r =>
      [ROLES.POLICJA, ROLES.EMS, ROLES.STRAZ, ROLES.DOT, ROLES.STRAZ_MIEJSKA,
       'Policja On-Duty', 'EMS On-Duty', 'Straż On-Duty'].includes(r.name)
    );

    if (!isSluzba && !isStaff(member)) {
      return interaction.editReply({ content: '❌ Tylko funkcjonariusze służb mogą używać tej komendy.' });
    }

    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === 'start') {
      const rejon = interaction.options.getString('rejon') || 'Cały serwer';

      if (activePatrols.has(userId)) {
        return interaction.editReply({ content: '❌ Już masz aktywny patrol. Użyj `/patrol stop` aby go zakończyć.' });
      }

      activePatrols.set(userId, { startTime: Date.now(), rejon, user: interaction.user.tag });

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('🚔 Patrol ROZPOCZĘTY')
            .addFields(
              { name: '👮 Funkcjonariusz', value: `<@${userId}>`, inline: true },
              { name: '📍 Rejon', value: rejon, inline: true },
              { name: '🕐 Start', value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true },
            )
            .setFooter({ text: 'AURORA Greenville RP — System Patroli' })
            .setTimestamp(),
        ],
      });
    }

    else if (sub === 'stop') {
      if (!activePatrols.has(userId)) {
        return interaction.editReply({ content: '❌ Nie masz aktywnego patrolu. Użyj `/patrol start` aby go rozpocząć.' });
      }

      const patrol = activePatrols.get(userId);
      activePatrols.delete(userId);

      const durationMs = Date.now() - patrol.startTime;
      const hours   = Math.floor(durationMs / 3_600_000);
      const minutes = Math.floor((durationMs % 3_600_000) / 60_000);
      const durationStr = `${hours > 0 ? `${hours}h ` : ''}${minutes}min`;

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.error)
            .setTitle('🚔 Patrol ZAKOŃCZONY')
            .addFields(
              { name: '👮 Funkcjonariusz', value: `<@${userId}>`, inline: true },
              { name: '📍 Rejon', value: patrol.rejon, inline: true },
              { name: '⏱️ Czas trwania', value: durationStr, inline: true },
            )
            .setFooter({ text: 'AURORA Greenville RP — System Patroli' })
            .setTimestamp(),
        ],
      });
    }

    else if (sub === 'status') {
      if (activePatrols.size === 0) {
        return interaction.editReply({ content: 'ℹ️ Brak aktywnych patroli na serwerze.' });
      }

      const list = [...activePatrols.entries()].map(([uid, p]) => {
        const elapsed = Math.floor((Date.now() - p.startTime) / 60_000);
        return `• <@${uid}> — **${p.rejon}** (${elapsed} min)`;
      }).join('\n');

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle(`🚔 Aktywne patrole (${activePatrols.size})`)
            .setDescription(list)
            .setFooter({ text: 'AURORA Greenville RP — System Patroli' })
            .setTimestamp(),
        ],
      });
    }
  },
};
