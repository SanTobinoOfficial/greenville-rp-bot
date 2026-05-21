// Przycisk "Włącz / Wyłącz powiadomienia" — toggluje rolę 🔔 Powiadomienia

module.exports = {
  async execute(interaction) {
    const roleName = '🔔 Powiadomienia';
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const role = interaction.guild.roles.cache.find(r => r.name === roleName);

    if (!role) {
      return interaction.reply({
        content: '❌ Rola powiadomień nie istnieje. Skontaktuj się z administracją.',
        ephemeral: true,
      });
    }

    const hasRole = member.roles.cache.has(role.id);

    if (hasRole) {
      await member.roles.remove(role);
      return interaction.reply({
        content: '🔕 Wyłączyłeś powiadomienia o sesjach. Możesz je włączyć z powrotem w każdej chwili.',
        ephemeral: true,
      });
    } else {
      await member.roles.add(role);
      return interaction.reply({
        content: '🔔 Włączyłeś powiadomienia o sesjach! Będziesz oznaczany przy każdym ogłoszeniu.',
        ephemeral: true,
      });
    }
  },
};
