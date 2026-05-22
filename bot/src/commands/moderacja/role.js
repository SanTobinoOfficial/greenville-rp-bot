// Komenda /role — dodaj lub usuń rolę od gracza
// Dostępna dla: Administrator+

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

// Role których nie można dotykać komendą
const PROTECTED_ROLES = ['Owner', 'Co-Owner', 'Administrator', '@everyone'];

const ADMIN_ROLES = ['Administrator', 'Co-Owner', 'Owner'];
function isAdmin(member) {
  return member.roles.cache.some(r => ADMIN_ROLES.includes(r.name)) ||
    member.permissions.has(PermissionFlagsBits.Administrator);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Dodaj lub usuń rolę od gracza (Administrator+)')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Dodaj rolę graczowi')
        .addUserOption(opt => opt.setName('gracz').setDescription('Gracz').setRequired(true))
        .addRoleOption(opt => opt.setName('rola').setDescription('Rola do dodania').setRequired(true))
        .addStringOption(opt => opt.setName('powod').setDescription('Powód').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Usuń rolę od gracza')
        .addUserOption(opt => opt.setName('gracz').setDescription('Gracz').setRequired(true))
        .addRoleOption(opt => opt.setName('rola').setDescription('Rola do usunięcia').setRequired(true))
        .addStringOption(opt => opt.setName('powod').setDescription('Powód').setRequired(false))
    ),

  async execute(interaction, client, prisma) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Tylko Administrator+ może zarządzać rolami.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('gracz');
    const role = interaction.options.getRole('rola');
    const powod = interaction.options.getString('powod') ?? 'Brak powodu';

    if (PROTECTED_ROLES.includes(role.name)) {
      return interaction.reply({ content: `❌ Rola **${role.name}** jest chroniona i nie można nią zarządzać tą komendą.`, ephemeral: true });
    }

    if (role.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ content: '❌ Nie możesz zarządzać rolą wyższą lub równą swojej.', ephemeral: true });
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({ content: '❌ Nie znaleziono gracza na serwerze.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const action = sub === 'add' ? 'add' : 'remove';
      const label = sub === 'add' ? 'dodana' : 'usunięta';

      await targetMember.roles[action](role, `${interaction.user.tag}: ${powod}`);

      const embed = new EmbedBuilder()
        .setColor(sub === 'add' ? 0x57F287 : 0xED4245)
        .setTitle(`${sub === 'add' ? '✅' : '❌'} Rola ${label}`)
        .addFields(
          { name: '👤 Gracz', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
          { name: '🏷️ Rola', value: `${role}`, inline: true },
          { name: '📝 Powód', value: powod, inline: false },
          { name: '👮 Administrator', value: `<@${interaction.user.id}>`, inline: true },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      const logCh = interaction.guild.channels.cache.find(
        c => c.isTextBased() && c.name.includes('logi-moderacji')
      );
      if (logCh) await logCh.send({ embeds: [embed] }).catch(() => {});

      logger.info(`/role ${sub}: ${role.name} → ${targetUser.tag} przez ${interaction.user.tag}`);
    } catch (e) {
      await interaction.editReply({ content: `❌ Błąd: ${e.message}` });
    }
  },
};
