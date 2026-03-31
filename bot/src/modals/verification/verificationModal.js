// Modal weryfikacji — krok 1: powiązanie konta Roblox
// Po sukcesie od razu startuje quiz in-Discord

const { EmbedBuilder } = require('discord.js');
const { getUserByUsername, isInGroup } = require('../../utils/robloxApi');
const { generateUniquePhone } = require('../../utils/tableRejestracyjna');
const { startQuiz } = require('../../utils/quizEngine');
const logger = require('../../utils/logger');

module.exports = {
  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const robloxNick = interaction.fields.getTextInputValue('roblox_nick').trim();

    try {
      // 1. Sprawdź nick na Roblox
      const robloxUser = await getUserByUsername(robloxNick);
      if (!robloxUser) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('❌ Nick nie znaleziony')
              .setDescription(
                `Nick **${robloxNick}** nie istnieje na Roblox.\n\n` +
                '• Upewnij się, że wpisałeś dokładną nazwę użytkownika\n' +
                '• Wielkość liter ma znaczenie\n' +
                '• Konto musi być aktywne'
              )
          ],
        });
      }

      // 2. Czy nick nie jest już zajęty przez kogoś innego
      const existingUser = await prisma.user.findUnique({
        where: { robloxId: String(robloxUser.id) },
      });
      if (existingUser && existingUser.discordId !== interaction.user.id) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('❌ Nick już zarejestrowany')
              .setDescription(
                `Nick **${robloxNick}** jest już powiązany z innym kontem Discord.\n` +
                'Jeśli uważasz, że to błąd, otwórz ticket ze staffem.'
              )
          ],
        });
      }

      // 3. Opcjonalne: sprawdź grupę Roblox
      const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
      if (settings?.robloxGroupId) {
        const inGroup = await isInGroup(robloxUser.id, settings.robloxGroupId);
        if (!inGroup) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('❌ Brak w grupie Roblox')
                .setDescription(
                  `Twoje konto **${robloxNick}** nie należy do grupy Greenville RP.\n` +
                  'Dołącz do grupy i spróbuj ponownie.'
                )
            ],
          });
        }
      }

      // 4. Generuj numer telefonu i zapisz do bazy
      const phoneNumber = await generateUniquePhone(prisma);
      const dbUser = await prisma.user.upsert({
        where: { discordId: interaction.user.id },
        create: {
          discordId: interaction.user.id,
          discordUsername: interaction.user.tag,
          robloxId: String(robloxUser.id),
          robloxUsername: robloxUser.name,
          phoneNumber,
        },
        update: {
          robloxId: String(robloxUser.id),
          robloxUsername: robloxUser.name,
          discordUsername: interaction.user.tag,
          phoneNumber,
        },
      });

      // 5. Nadaj rolę Niezweryfikowany
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const niezwerRole = interaction.guild.roles.cache.find(r => r.name === 'Niezweryfikowany');
      if (niezwerRole && !member.roles.cache.has(niezwerRole.id)) {
        await member.roles.add(niezwerRole).catch(() => {});
      }

      // 6. Log na #logi-weryfikacji
      const logCh = interaction.guild.channels.cache.find(
        c => c.name === '🪪│logi-weryfikacji' && c.isTextBased()
      );
      if (logCh) {
        await logCh.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('🪪 Nick Roblox powiązany')
              .addFields(
                { name: 'Discord', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: 'Roblox', value: robloxUser.name, inline: true },
                { name: 'ID Roblox', value: String(robloxUser.id), inline: true },
                { name: 'Telefon RP', value: phoneNumber, inline: true },
              )
              .setTimestamp()
          ],
        });
      }

      logger.info(`Roblox powiązany: ${interaction.user.tag} → ${robloxUser.name}`);

      // 7. Potwierdź i od razu uruchom quiz
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Konto Roblox powiązane!')
            .setDescription(
              `Pomyślnie powiązałeś konto Discord z Roblox!\n\n` +
              `👤 **Nick Roblox:** ${robloxUser.name}\n` +
              `📱 **Numer telefonu RP:** \`${phoneNumber}\`\n\n` +
              `⏳ **Za chwilę zaczyna się quiz weryfikacyjny...**\n` +
              `📋 10 pytań • musisz uzyskać min. **8/10** punktów`
            )
            .setFooter({ text: 'Greenville RP — Weryfikacja' })
        ],
      });

      // Odczekaj chwilę i uruchom quiz (jako follow-up)
      await new Promise(r => setTimeout(r, 1500));
      await startQuiz(interaction, client, prisma, dbUser);

    } catch (error) {
      logger.error('Błąd modala weryfikacji:', error);
      const reply = {
        content: '❌ Wystąpił błąd podczas weryfikacji. Spróbuj ponownie za chwilę.',
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply).catch(() => {});
      } else {
        await interaction.reply({ ...reply, ephemeral: true }).catch(() => {});
      }
    }
  },
};
