// Komenda /szukaj-pojazd — wyszukaj pojazd po marce, modelu lub kolorze
// Dostępna dla: Służby (Policja, EMS, Straż, DOT, SM) | Staff (Helper+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isService, isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('szukaj-pojazd')
    .setDescription('Wyszukaj pojazd po marce, modelu lub kolorze (Służby/Staff)')
    .addStringOption(opt =>
      opt
        .setName('marka')
        .setDescription('Marka pojazdu (częściowe dopasowanie, np. "Ford")')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt
        .setName('model')
        .setDescription('Model pojazdu (częściowe dopasowanie, np. "Mustang")')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt
        .setName('kolor')
        .setDescription('Kolor pojazdu (częściowe dopasowanie, np. "czerwony")')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isService(interaction.member) && !isStaff(interaction.member)) {
      return interaction.editReply({
        content: '❌ Brak uprawnień — komenda dostępna tylko dla służb i staffu.',
      });
    }

    const marka = interaction.options.getString('marka')?.trim() ?? null;
    const model = interaction.options.getString('model')?.trim() ?? null;
    const kolor = interaction.options.getString('kolor')?.trim() ?? null;

    if (!marka && !model && !kolor) {
      return interaction.editReply({
        content: '❌ Podaj co najmniej **markę**, **model** lub **kolor** do wyszukania.',
      });
    }

    const where = {};
    if (marka) where.marka = { contains: marka, mode: 'insensitive' };
    if (model) where.model = { contains: model, mode: 'insensitive' };
    if (kolor) where.kolor = { contains: kolor, mode: 'insensitive' };

    let vehicles;
    try {
      vehicles = await prisma.vehicle.findMany({
        where,
        include: {
          user: {
            select: {
              discordId:      true,
              robloxUsername: true,
              phoneNumber:    true,
              currentJob:     true,
              arrests: { where: { active: true }, select: { id: true } },
              licenses: {
                where: { status: 'ACTIVE' },
                select: { kategoria: true },
              },
            },
            include: {
              character: {
                select: { firstName: true, lastName: true, peselRp: true },
              },
            },
          },
        },
        take: 5,
        orderBy: [{ marka: 'asc' }, { model: 'asc' }],
      });
    } catch (err) {
      logger.error('szukaj-pojazd: błąd bazy:', err.message);
      return interaction.editReply({ content: '❌ Błąd podczas przeszukiwania bazy danych.' });
    }

    const queryParts = [
      marka && `marka: "${marka}"`,
      model && `model: "${model}"`,
      kolor && `kolor: "${kolor}"`,
    ].filter(Boolean);
    const queryLabel = queryParts.join(', ');

    if (vehicles.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('🚗 Baza Pojazdów — Brak wyników')
            .setDescription(`Nie znaleziono pojazdu pasującego do: **${queryLabel}**`)
            .setFooter({ text: 'AURORA Greenville RP — System Służb' })
            .setTimestamp(),
        ],
      });
    }

    const lines = vehicles.map((v, i) => {
      const owner      = v.user;
      const char       = owner.character;
      const isArrested = owner.arrests.length > 0;
      const arrestTag  = isArrested ? ' 🚨' : '';
      const ownerName  = char
        ? `${char.firstName} ${char.lastName}`
        : `<@${owner.discordId}>`;
      const phone      = owner.phoneNumber ? `📱 \`${owner.phoneNumber}\`` : '📱 brak';
      const hasLicense = owner.licenses.length > 0;
      const licTag     = hasLicense ? '' : ' ⚠️ bez PJ';

      return [
        `**${i + 1}.** ${v.marka} ${v.model} ${v.rok} — **${v.kolor}**${arrestTag}${licTag}`,
        `> 🔢 Tabl.: \`${v.tablica}\`  •  👤 ${ownerName}`,
        `> ${phone}${owner.robloxUsername ? `  •  🎮 @${owner.robloxUsername}` : ''}`,
        char ? `> 🪪 PESEL: ||${char.peselRp}||` : '',
      ].filter(Boolean).join('\n');
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.rp)
      .setTitle(`🚗 Wyniki wyszukiwania: ${queryLabel}`)
      .setDescription(lines.join('\n\n'))
      .setFooter({
        text: `${vehicles.length} wynik(i) • AURORA Greenville RP — System Służb`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    if (vehicles.length === 5) {
      embed.addFields({
        name: '⚠️ Uwaga',
        value: 'Wyświetlono maks. 5 wyników. Zawęź zapytanie podając dokładniejsze dane.',
        inline: false,
      });
    }

    logger.info(
      `szukaj-pojazd | ${interaction.user.tag} | query="${queryLabel}" | wyniki=${vehicles.length}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
