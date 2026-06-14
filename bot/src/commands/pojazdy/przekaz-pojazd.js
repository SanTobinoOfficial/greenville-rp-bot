// Komenda /przekaz-pojazd — transfer własności pojazdu do innego gracza
// Właściciel przekazuje swój pojazd zweryfikowanemu graczowi,
// który ma wolny slot w swoim limicie pojazdów.
// Dostępna dla: Mieszkaniec+ (właściciel pojazdu)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const ROLE_SLOTS = [
  { name: 'Booster',     slots: 10 },
  { name: 'Wspierający', slots: 9  },
];
const BASE_SLOTS_FALLBACK = 5;

function getMaxVehicles(member, settings) {
  for (const { name, slots } of ROLE_SLOTS) {
    if (member.roles.cache.some(r => r.name === name)) return slots;
  }
  return settings?.maxVehiclesBase ?? BASE_SLOTS_FALLBACK;
}

const norm = s =>
  s.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('przekaz-pojazd')
    .setDescription('Przekaż własność swojego pojazdu innemu zweryfikowanemu graczowi')
    .addStringOption(opt =>
      opt
        .setName('tablica')
        .setDescription('Tablica rejestracyjna pojazdu do przekazania')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(10)
    )
    .addUserOption(opt =>
      opt
        .setName('nowy-wlasciciel')
        .setDescription('Gracz, któremu przekazujesz pojazd')
        .setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby przekazywać pojazdy.',
      });
    }

    const tablica    = interaction.options.getString('tablica').toUpperCase().trim();
    const targetUser = interaction.options.getUser('nowy-wlasciciel');

    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({ content: '❌ Nie możesz przekazać pojazdu samemu sobie.' });
    }
    if (targetUser.bot) {
      return interaction.editReply({ content: '❌ Nie można przekazać pojazdu botowi.' });
    }

    // Pobierz właściciela z bazy
    const ownerDb = await prisma.user.findUnique({
      where:  { discordId: interaction.user.id },
      select: { id: true },
    });
    if (!ownerDb) {
      return interaction.editReply({
        content: '❌ Nie jesteś zarejestrowany/a w systemie. Przejdź weryfikację.',
      });
    }

    // Znajdź pojazd i potwierdź własność
    const vehicle = await prisma.vehicle.findUnique({ where: { tablica } });
    if (!vehicle) {
      return interaction.editReply({
        content: `❌ Pojazd z tablicą **${tablica}** nie istnieje w systemie.`,
      });
    }
    if (vehicle.userId !== ownerDb.id) {
      return interaction.editReply({
        content: `❌ Pojazd **${tablica}** nie należy do Ciebie.`,
      });
    }

    // Sprawdź czy odbiorca jest na serwerze i zweryfikowany
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return interaction.editReply({ content: '❌ Nie znaleziono tego gracza na serwerze.' });
    }
    if (!isVerified(targetMember)) {
      return interaction.editReply({
        content: `❌ <@${targetUser.id}> nie jest jeszcze zweryfikowanym **Mieszkańcem** i nie może przyjąć pojazdu.`,
      });
    }

    // Pobierz konto docelowego gracza i jego pojazdy
    const targetDb = await prisma.user.findUnique({
      where:  { discordId: targetUser.id },
      select: { id: true, vehicles: { select: { id: true } } },
    });
    if (!targetDb) {
      return interaction.editReply({
        content: `❌ <@${targetUser.id}> nie ma jeszcze konta w systemie RP.`,
      });
    }

    // Sprawdź wolny slot
    const settings    = await prisma.settings.findUnique({ where: { id: 'global' } });
    const targetMax   = getMaxVehicles(targetMember, settings);
    const targetCount = targetDb.vehicles.length;

    if (targetCount >= targetMax) {
      return interaction.editReply({
        content:
          `❌ <@${targetUser.id}> ma już **${targetCount}/${targetMax}** pojazdów — brak wolnego slotu.\n` +
          `Gracz musi najpierw wyrejestrować pojazd lub zdobyć rolę **Wspierający** / **Booster**.`,
      });
    }

    // Wykonaj transfer
    await prisma.vehicle.update({
      where: { tablica },
      data:  { userId: targetDb.id },
    });

    logger.info(
      `/przekaz-pojazd | ${interaction.user.tag} → ${targetUser.tag} | ` +
      `${vehicle.marka} ${vehicle.model} | tablica=${tablica}`
    );

    // Log do kanału pojazdów
    const logChannel = interaction.guild.channels.cache.find(
      c => c.isTextBased() && norm(c.name).includes('logi-pojazd')
    );
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🔄 Transfer pojazdu')
            .addFields(
              {
                name:   '🚗 Pojazd',
                value:  `${vehicle.marka} ${vehicle.model} (${vehicle.rok}) — \`${tablica}\``,
                inline: false,
              },
              { name: '📤 Poprzedni właściciel', value: `<@${interaction.user.id}>`, inline: true },
              { name: '📥 Nowy właściciel',      value: `<@${targetUser.id}>`,       inline: true },
              { name: '📊 Sloty odbiorcy',       value: `${targetCount + 1}/${targetMax}`, inline: true },
            )
            .setFooter({ text: 'AURORA Greenville RP — Transfer pojazdów' })
            .setTimestamp(),
        ],
      }).catch(() => null);
    }

    // Potwierdzenie dla właściciela
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('✅ Pojazd przekazany!')
          .setDescription(
            `Pomyślnie przekazałeś/aś pojazd do <@${targetUser.id}>.`
          )
          .addFields(
            {
              name:   '🚗 Pojazd',
              value:  `${vehicle.marka} ${vehicle.model} (${vehicle.rok}) — kolor: ${vehicle.kolor}`,
              inline: false,
            },
            { name: '🔑 Tablica',         value: `\`${tablica}\``,       inline: true },
            { name: '📥 Nowy właściciel', value: `<@${targetUser.id}>`,  inline: true },
          )
          .setFooter({ text: 'AURORA Greenville RP — Rejestracja pojazdów' })
          .setTimestamp(),
      ],
    });
  },
};
