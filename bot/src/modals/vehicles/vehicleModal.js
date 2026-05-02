// Modal rejestracji pojazdu RP
// customId: modal_vehicle_[vehicleId]
// Tablica wpisywana ręcznie przez gracza — sprawdza unikalność i format

const { EmbedBuilder } = require('discord.js');
const { getVehicleById, getRequiredRole, formatPrice } = require('../../data/greenvilleVehicles');
const logger = require('../../utils/logger');

// Format tablicy: litery/cyfry/spacje, 3–12 znaków, bez znaków specjalnych
const PLATE_REGEX = /^[A-Za-z0-9 \-]{3,12}$/;

module.exports = {
  async execute(interaction, client, prisma, args) {
    await interaction.deferReply({ ephemeral: true });

    // Wyciągnij vehicleId z customId: modal_vehicle_[vehicleId]
    const vehicleId = interaction.customId.replace('modal_vehicle_', '');
    const vehicle   = getVehicleById(vehicleId);

    if (!vehicle) {
      return interaction.editReply({ content: '❌ Błąd: nieznany pojazd. Spróbuj ponownie.' });
    }

    const tablicaRaw = interaction.fields.getTextInputValue('tablica').trim().toUpperCase();
    const kolor      = interaction.fields.getTextInputValue('kolor').trim();
    const opis       = interaction.fields.getTextInputValue('opis')?.trim() || null;

    // Walidacja formatu tablicy
    if (!PLATE_REGEX.test(tablicaRaw)) {
      return interaction.editReply({
        content: '❌ Nieprawidłowy format tablicy rejestracyjnej.\nDozwolone: litery, cyfry i spacja. Długość: 3–12 znaków.\nPrzykład: `GV 123 AB`',
      });
    }

    try {
      // Sprawdź użytkownika
      const user = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
        include: { vehicles: true },
      });

      if (!user) {
        return interaction.editReply({ content: '❌ Nie jesteś zarejestrowany. Zweryfikuj się w **#weryfikacja**.' });
      }

      // Sprawdź unikalność tablicy (case-insensitive — normalizujemy do uppercase)
      const existing = await prisma.vehicle.findUnique({ where: { tablica: tablicaRaw } });
      if (existing) {
        return interaction.editReply({
          content: `❌ Tablica \`${tablicaRaw}\` jest już zajęta. Podaj inną tablicę rejestracyjną.`,
        });
      }

      // Sprawdź limity pojazdów
      const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
      const member   = await interaction.guild.members.fetch(interaction.user.id);

      let maxVehicles = settings?.maxVehiclesBase || 5;
      if (member.roles.cache.some(r => r.name === 'Booster')) {
        maxVehicles = settings?.maxVehiclesBooster || 10;
      } else if (member.roles.cache.some(r => r.name === 'Wspierający')) {
        maxVehicles = settings?.maxVehiclesSupporter || 9;
      }

      if (user.vehicles.length >= maxVehicles) {
        return interaction.editReply({
          content: `❌ Osiągnąłeś limit rejestracji pojazdów (**${maxVehicles}**). Masz już ${user.vehicles.length} zarejestrowanych.`,
        });
      }

      // Podwójna walidacja roli (zabezpieczenie po stronie modala)
      const requiredRole = getRequiredRole(vehicle);
      if (requiredRole) {
        const hasRole = member.roles.cache.some(r => r.name === requiredRole);
        if (!hasRole) {
          return interaction.editReply({
            content: `❌ Pojazd **${vehicle.nazwa}** (${formatPrice(vehicle.cena)}) wymaga roli 🔒 **${requiredRole}**.`,
          });
        }
      }

      // Zapisz pojazd
      const saved = await prisma.vehicle.create({
        data: {
          userId:  user.id,
          marka:   vehicle.nazwa,   // całe "2023 Falcon Prime LX" jako marka
          model:   vehicle.kategoria,
          rok:     new Date().getFullYear(),
          kolor,
          tablica: tablicaRaw,
          opis,
        },
      });

      const currentCount = user.vehicles.length + 1;

      // Etykieta statusu
      const statusLabel = requiredRole ? `🔒 ${requiredRole}` : null;

      // Embed dowodu rejestracyjnego
      const dowodEmbed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('🚗 Dowód Rejestracyjny — AURORA Greenville RP')
        .addFields(
          { name: '🚗 Pojazd',      value: vehicle.nazwa,              inline: true },
          { name: '💰 Wartość RP',  value: formatPrice(vehicle.cena),  inline: true },
          { name: '🎨 Kolor',       value: kolor,                      inline: true },
          { name: '🪪 Tablica RP',  value: `\`${tablicaRaw}\``,        inline: true },
          { name: '👤 Właściciel',  value: `${interaction.user.tag}`,  inline: true },
          { name: '📊 Pojazd nr',   value: `${currentCount}/${maxVehicles}`, inline: true },
        )
        .setFooter({ text: `ID pojazdu: ${saved.id}` })
        .setTimestamp();

      if (opis) dowodEmbed.addFields({ name: '📝 Opis', value: opis, inline: false });
      if (statusLabel) {
        dowodEmbed.addFields({ name: '🔒 Status', value: statusLabel, inline: true });
      }

      // Wyślij na kanał #rejestracja-pojazdów
      const regChannel = interaction.guild.channels.cache.find(
        c => c.name === '🚗│rejestracja-pojazdów' && c.isTextBased()
      );
      if (regChannel) {
        await regChannel.send({
          content: `**Nowa rejestracja** — <@${interaction.user.id}>`,
          embeds: [dowodEmbed],
        });
      }

      // Log
      const logChannel = interaction.guild.channels.cache.find(
        c => c.name === '🚗│logi-pojazdów' && c.isTextBased()
      );
      if (logChannel) {
        await logChannel.send({ embeds: [dowodEmbed] });
      }

      // Odpowiedź graczowi
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Pojazd zarejestrowany!')
            .setDescription(
              `**${vehicle.nazwa}** został pomyślnie zarejestrowany.\n\n` +
              `🪪 **Tablica:** \`${tablicaRaw}\`\n` +
              `💰 **Wartość:** ${formatPrice(vehicle.cena)}\n` +
              `🎨 **Kolor:** ${kolor}\n` +
              `📊 **Pojazdy:** ${currentCount}/${maxVehicles}` +
              (statusLabel ? `\n\n🔒 *${statusLabel}*` : '')
            )
        ],
      });

      logger.info(`Pojazd zarejestrowany: ${tablicaRaw} — ${vehicle.nazwa} dla ${interaction.user.tag}`);

    } catch (error) {
      logger.error('Błąd rejestracji pojazdu:', error);
      await interaction.editReply({ content: `❌ Błąd: \`${error.message}\`` });
    }
  },
};
