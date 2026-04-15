// Komenda /sprawdz-tablice — sprawdź właściciela pojazdu po numerze rejestracyjnym
// Dostępna dla: Policja | Staff+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sprawdz-tablice')
    .setDescription('Sprawdź właściciela pojazdu po tablicy rejestracyjnej (Policja)')
    .addStringOption(opt =>
      opt.setName('tablica')
        .setDescription('Numer rejestracyjny (np. GRP 12345)')
        .setRequired(true)
        .setMaxLength(10)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    const isPolicja = member.roles.cache.some(r => r.name === ROLES.POLICJA || r.name === 'Policja On-Duty');

    if (!isPolicja && !isStaff(member)) {
      return interaction.editReply({ content: '❌ Tylko Policja lub Staff może sprawdzać tablice rejestracyjne.' });
    }

    const tablica = interaction.options.getString('tablica').toUpperCase().trim();

    const vehicle = await prisma.vehicle.findUnique({
      where: { tablica },
      include: {
        user: {
          include: {
            character: true,
            licenses: { where: { status: 'ACTIVE' } },
            arrests:  { where: { active: true } },
            casesAsTarget: {
              where: { type: 'BAN', status: 'ACTIVE' },
            },
          },
        },
      },
    });

    if (!vehicle) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.error)
            .setTitle('🚗 Baza Pojazdów — Brak wyników')
            .setDescription(`Nie znaleziono pojazdu z tablicą **${tablica}** w rejestrze.`)
            .setFooter({ text: 'AURORA Greenville RP — System Policyjny' })
            .setTimestamp(),
        ],
      });
    }

    const owner = vehicle.user;
    const char = owner.character;
    const isArrested = owner.arrests.length > 0;
    const isBanned   = owner.casesAsTarget.length > 0;

    const embed = new EmbedBuilder()
      .setColor(isArrested || isBanned ? COLORS.mod_ban : COLORS.rp)
      .setTitle(`🚗 Wyniki dla tablicy: ${tablica}`)
      .addFields(
        { name: '🚗 Pojazd', value: `${vehicle.marka} ${vehicle.model} ${vehicle.rok}\nKolor: **${vehicle.kolor}**`, inline: true },
        {
          name: '👤 Właściciel',
          value: char
            ? `${char.firstName} ${char.lastName}\nPESEL: ||${char.peselRp}||`
            : `<@${owner.discordId}>`,
          inline: true,
        },
        {
          name: '🪪 Prawa jazdy',
          value: owner.licenses.length > 0
            ? owner.licenses.map(l => `✅ Kat. **${l.kategoria}**`).join('\n')
            : '❌ Brak aktywnych praw jazdy',
          inline: true,
        },
      )
      .setFooter({ text: 'AURORA Greenville RP — System Policyjny' })
      .setTimestamp();

    const alerts = [];
    if (isArrested) alerts.push('🚨 **OSOBA ZATRZYMANA**');
    if (isBanned)   alerts.push('⛔ **AKTYWNY BAN NA SERWERZE**');
    if (owner.licenses.length === 0) alerts.push('⚠️ **BRAK UPRAWNIEŃ DO KIEROWANIA**');

    if (alerts.length > 0) {
      embed.addFields({ name: '🚨 ALERTY', value: alerts.join('\n'), inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
