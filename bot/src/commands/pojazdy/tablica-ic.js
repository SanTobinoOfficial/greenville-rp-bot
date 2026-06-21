// Komenda /tablica-ic — cywilne sprawdzenie tablicy rejestracyjnej
// Pokazuje tylko markę, model, rok i kolor pojazdu — BEZ danych właściciela.
// Właściciela pojazdu zna wyłącznie Policja (/sprawdz-tablice — tylko Służby).
// Zapobiega MG: gracz może dokładnie opisać widziany pojazd w /me bez zgadywania.
// Dostępna dla: Mieszkaniec+

'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tablica-ic')
    .setDescription('Sprawdź markę i model pojazdu po tablicy IC — bez danych właściciela (Mieszkaniec+)')
    .addStringOption(opt =>
      opt
        .setName('tablica')
        .setDescription('Numer rejestracyjny (np. GRP-12345 lub WX 9876C)')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(12)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą korzystać z rejestru DMV.',
      });
    }

    const tablica = interaction.options.getString('tablica').toUpperCase().trim();

    let vehicle;
    try {
      vehicle = await prisma.vehicle.findUnique({
        where: { tablica },
        select: {
          marka:   true,
          model:   true,
          rok:     true,
          kolor:   true,
          tablica: true,
          opis:    true,
        },
      });
    } catch (err) {
      logger.error(`/tablica-ic: błąd bazy danych dla tablicy "${tablica}":`, err.message);
      return interaction.editReply({
        content: '❌ Błąd bazy danych. Spróbuj ponownie.',
      });
    }

    if (!vehicle) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.error)
        .setTitle('🚗 DMV — Brak wyników')
        .setDescription(
          `Tablica **${tablica}** nie figuruje w publicznym rejestrze pojazdów.\n\n` +
          '> Pojazd może być niezarejestrowany lub wpisałeś/aś tablicę błędnie.\n' +
          '> Policja może sprawdzić niezarejestrowane pojazdy przez własne systemy.'
        )
        .setFooter({ text: 'AURORA Greenville RP — DMV Greenville' })
        .setTimestamp();

      logger.info(`/tablica-ic | ${interaction.user.tag} | tablica: ${tablica} → brak w rejestrze`);
      return interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.rp)
      .setTitle('🚗 DMV — Dane pojazdu IC')
      .setDescription(
        `Publiczne dane pojazdu o tablicy **${vehicle.tablica}** z rejestru DMV Greenville.\n` +
        '> *Dane właściciela dostępne wyłącznie dla Policji i służb.*'
      )
      .addFields(
        { name: '🏷️ Tablica',  value: vehicle.tablica,         inline: true },
        { name: '🚗 Marka',    value: vehicle.marka,           inline: true },
        { name: '🚘 Model',    value: vehicle.model,           inline: true },
        { name: '📅 Rok',      value: String(vehicle.rok),     inline: true },
        { name: '🎨 Kolor',    value: vehicle.kolor,           inline: true },
      )
      .setFooter({ text: 'AURORA Greenville RP — DMV | Dane właściciela: wyłącznie Policja' })
      .setTimestamp();

    if (vehicle.opis) {
      embed.addFields({ name: '📝 Opis pojazdu', value: vehicle.opis.slice(0, 300), inline: false });
    }

    logger.info(
      `/tablica-ic | ${interaction.user.tag} | tablica: ${tablica} → ${vehicle.marka} ${vehicle.model} ${vehicle.rok} (${vehicle.kolor})`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
