// Handler: giveaway_join — dołącz do losowania
const { EmbedBuilder } = require('discord.js');
const { activeGiveaways } = require('../../commands/moderacja/giveaway');

module.exports = {
  async execute(interaction, client, prisma) {
    // Identyfikuj losowanie po ID wiadomości
    const gw = activeGiveaways.get(interaction.message.id);

    if (!gw || gw.ended) {
      return interaction.reply({ content: '❌ To losowanie już się zakończyło.', ephemeral: true });
    }

    if (gw.participants.has(interaction.user.id)) {
      // Już bierze udział — wycofaj
      gw.participants.delete(interaction.user.id);
      await updateParticipantCount(interaction, gw);
      return interaction.reply({ content: '❌ Wycofałeś/aś swoje zgłoszenie z losowania.', ephemeral: true });
    }

    // Sprawdź czy użytkownik jest w bazie (opcjonalna weryfikacja)
    const dbUser = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    if (!dbUser || !dbUser.robloxId) {
      return interaction.reply({
        content: '❌ Musisz być zweryfikowany, aby wziąć udział w losowaniu.\nUżyj `/zacznij-tutaj` lub przejdź na kanał weryfikacji.',
        ephemeral: true,
      });
    }

    gw.participants.add(interaction.user.id);
    await updateParticipantCount(interaction, gw);

    return interaction.reply({
      content: `✅ Dołączyłeś/aś do losowania **${gw.nagroda}**! 🎉 Powodzenia!`,
      ephemeral: true,
    });
  },
};

async function updateParticipantCount(interaction, gw) {
  try {
    const msg   = interaction.message;
    const embed = EmbedBuilder.from(msg.embeds[0]);
    const fields = embed.data.fields ?? [];
    const idx = fields.findIndex(f => f.name === '👥 Uczestnicy');
    if (idx !== -1) {
      fields[idx] = { name: '👥 Uczestnicy', value: String(gw.participants.size), inline: true };
      embed.setFields(fields);
      await msg.edit({ embeds: [embed] });
    }
  } catch {}
}
