// Modal rejestracji pojazdu RP
// Sprawdza limity, generuje tablicę, zapisuje do bazy

const { EmbedBuilder } = require('discord.js');
const { generateUniquePlate } = require('../../utils/tableRejestracyjna');
const logger = require('../../utils/logger');

module.exports = {
  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const markaModel = interaction.fields.getTextInputValue('marka_model').trim();
    const rokStr     = interaction.fields.getTextInputValue('rok').trim();
    const kolor      = interaction.fields.getTextInputValue('kolor').trim();
    const opis       = interaction.fields.getTextInputValue('opis')?.trim() || null;

    // Walidacja roku
    const rok = parseInt(rokStr);
    if (isNaN(rok) || rok < 1900 || rok > new Date().getFullYear() + 1) {
      return interaction.editReply({ content: '❌ Podaj prawidłowy rok produkcji (1900–teraz).' });
    }

    // Podziel markę i model
    const [marka, ...modelParts] = markaModel.split(' ');
    const model = modelParts.join(' ') || marka;

    try {
      // Sprawdź użytkownika w bazie
      const user = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
        include: { vehicles: true },
      });

      if (!user) {
        return interaction.editReply({ content: '❌ Nie jesteś zarejestrowany. Zweryfikuj się w **#weryfikacja**.' });
      }

      // Pobierz ustawienia limitów
      const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
      const member = await interaction.guild.members.fetch(interaction.user.id);

      let maxVehicles = settings?.maxVehiclesBase || 5;
      if (member.roles.cache.some(r => r.name === 'Booster')) {
        maxVehicles = settings?.maxVehiclesBooster || 10;
      } else if (member.roles.cache.some(r => r.name === 'Wspierający')) {
        maxVehicles = settings?.maxVehiclesSupporter || 9;
      }

      const currentCount = user.vehicles.length;
      if (currentCount >= maxVehicles) {
        return interaction.editReply({
          content: `❌ Osiągnąłeś limit rejestracji pojazdów (**${maxVehicles}**). Masz już ${currentCount} zarejestrowanych pojazdów.\n\nAby zarejestrować więcej, zostań Wspierającym lub Boosterem.`,
        });
      }

      // Generuj unikalną tablicę
      const tablica = await generateUniquePlate(prisma);

      // Zapisz pojazd
      const vehicle = await prisma.vehicle.create({
        data: {
          userId: user.id,
          marka: marka || markaModel,
          model: model || markaModel,
          rok,
          kolor,
          tablica,
          opis,
        },
      });

      // Embed pojazdu
      const vehicleEmbed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('🚗 Dowód Rejestracyjny — Greenville RP')
        .addFields(
          { name: '🚗 Pojazd', value: `${marka} ${model} (${rok})`, inline: true },
          { name: '🎨 Kolor', value: kolor, inline: true },
          { name: '🪪 Tablica RP', value: `\`${tablica}\``, inline: true },
          { name: '👤 Właściciel', value: `${interaction.user.tag}`, inline: true },
          { name: '📊 Pojazd nr', value: `${currentCount + 1}/${maxVehicles}`, inline: true },
        )
        .setFooter({ text: `ID pojazdu: ${vehicle.id}` })
        .setTimestamp();

      if (opis) vehicleEmbed.addFields({ name: '📝 Opis', value: opis, inline: false });

      // Wyślij embed na kanał #rejestracja-pojazdów
      const regChannel = interaction.guild.channels.cache.find(
        c => c.name === '🚗│rejestracja-pojazdów' && c.isTextBased()
      );
      if (regChannel) {
        await regChannel.send({
          content: `**Nowa rejestracja** — <@${interaction.user.id}>`,
          embeds: [vehicleEmbed],
        });
      }

      // Log na #logi-pojazdów
      const logChannel = interaction.guild.channels.cache.find(
        c => c.name === '🚗│logi-pojazdów' && c.isTextBased()
      );
      if (logChannel) {
        await logChannel.send({ embeds: [vehicleEmbed] });
      }

      // Sukces
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Pojazd zarejestrowany!')
            .setDescription(
              `**${marka} ${model}** został pomyślnie zarejestrowany.\n\n` +
              `🪪 **Tablica rejestracyjna:** \`${tablica}\`\n` +
              `📊 **Pojazdy:** ${currentCount + 1}/${maxVehicles}`
            )
        ],
      });

      logger.info(`Pojazd zarejestrowany: ${tablica} — ${marka} ${model} dla ${interaction.user.tag}`);

    } catch (error) {
      logger.error('Błąd rejestracji pojazdu:', error);
      await interaction.editReply({ content: `❌ Błąd: \`${error.message}\`` });
    }
  },
};
