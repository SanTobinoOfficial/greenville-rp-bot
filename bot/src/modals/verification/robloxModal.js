// Modal weryfikacji nicku Roblox
// Odpytuje Roblox API i zapisuje dane do bazy

const { EmbedBuilder } = require('discord.js');
const { getUserByUsername, isInGroup } = require('../../utils/robloxApi');
const { generateUniquePhone } = require('../../utils/tableRejestracyjna');
const logger = require('../../utils/logger');

module.exports = {
  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const robloxNick = interaction.fields.getTextInputValue('roblox_nick').trim();

    try {
      // Krok 1: Sprawdź czy nick istnieje na Roblox
      const robloxUser = await getUserByUsername(robloxNick);

      if (!robloxUser) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('❌ Nick nie znaleziony')
              .setDescription(
                `Nick **${robloxNick}** nie istnieje na Roblox.\n\n` +
                'Upewnij się, że:\n' +
                '• Wpisałeś dokładną nazwę użytkownika (wielkość liter ma znaczenie)\n' +
                '• Twoje konto Roblox jest aktywne i ma 13+ lat'
              )
          ],
        });
      }

      // Krok 2: Sprawdź czy nick nie jest już użyty
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
                'Jeśli uważasz, że to błąd, skontaktuj się ze staffem przez ticket.'
              )
          ],
        });
      }

      // Krok 3: Sprawdź przynależność do grupy Roblox (opcjonalne)
      const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
      const groupId = settings?.robloxGroupId;

      if (groupId && groupId !== '') {
        const inGroup = await isInGroup(robloxUser.id, groupId);
        if (!inGroup) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('❌ Brak w grupie Roblox')
                .setDescription(
                  `Twoje konto Roblox **${robloxNick}** nie należy do grupy serwera AURORA Greenville RP.\n` +
                  `Dołącz do grupy i spróbuj ponownie.`
                )
            ],
          });
        }
      }

      // Krok 4: Wygeneruj numer telefonu
      const phoneNumber = await generateUniquePhone(prisma);

      // Krok 5: Zapisz dane do bazy
      await prisma.user.upsert({
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
          phoneNumber: phoneNumber,
          discordUsername: interaction.user.tag,
        },
      });

      // Krok 6: Nadaj rolę Niezweryfikowany (jeśli jeszcze nie ma)
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const niezwerRole = interaction.guild.roles.cache.find(r => r.name === 'Niezweryfikowany');
      if (niezwerRole && !member.roles.cache.has(niezwerRole.id)) {
        await member.roles.add(niezwerRole).catch(() => {});
      }

      // Krok 7: Log na #logi-weryfikacji
      const verifyLogChannel = interaction.guild.channels.cache.find(
        c => c.name === '🪪│logi-weryfikacji' && c.isTextBased()
      );
      if (verifyLogChannel) {
        await verifyLogChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('🪪 Nick Roblox zweryfikowany')
              .addFields(
                { name: 'Discord', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                { name: 'Nick Roblox', value: robloxUser.name, inline: true },
                { name: 'ID Roblox', value: String(robloxUser.id), inline: true },
                { name: 'Telefon RP', value: phoneNumber, inline: true },
              )
              .setTimestamp()
          ],
        });
      }

      // Sukces
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Nick Roblox zweryfikowany!')
            .setDescription(
              `Pomyślnie powiązałeś konto Discord z kontem Roblox!\n\n` +
              `👤 **Nick Roblox:** ${robloxUser.name}\n` +
              `📱 **Twój numer telefonu RP:** \`${phoneNumber}\`\n\n` +
              `**Następny krok:** Kliknij przycisk **"📋 Przejdź do quizu"** aby dokończyć weryfikację.`
            )
            .setFooter({ text: 'AURORA Greenville RP — Weryfikacja' })
        ],
      });

      logger.info(`Roblox zweryfikowany: ${interaction.user.tag} → ${robloxUser.name}`);

    } catch (error) {
      logger.error('Błąd weryfikacji Roblox:', error);
      await interaction.editReply({
        content: '❌ Wystąpił błąd podczas weryfikacji. Spróbuj ponownie za chwilę.',
      });
    }
  },
};
