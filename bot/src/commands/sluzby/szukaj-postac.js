// Komenda /szukaj-postac — wyszukaj gracza po imieniu/nazwisku postaci RP
// Dostępna dla: Służby (Policja, EMS, Straż, DOT, SM) | Staff (Helper+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isService, isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('szukaj-postac')
    .setDescription('Wyszukaj gracza po imieniu lub nazwisku postaci RP (Służby/Staff)')
    .addStringOption(opt =>
      opt
        .setName('imie')
        .setDescription('Imię postaci (częściowe dopasowanie)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt
        .setName('nazwisko')
        .setDescription('Nazwisko postaci (częściowe dopasowanie)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isService(interaction.member) && !isStaff(interaction.member)) {
      return interaction.editReply({
        content: '❌ Brak uprawnień — komenda dostępna tylko dla służb i staffu.',
      });
    }

    const imie     = interaction.options.getString('imie')?.trim()    ?? null;
    const nazwisko = interaction.options.getString('nazwisko')?.trim() ?? null;

    if (!imie && !nazwisko) {
      return interaction.editReply({
        content: '❌ Podaj co najmniej **imię** lub **nazwisko** do wyszukania.',
      });
    }

    const where = {};
    if (imie)     where.firstName = { contains: imie,     mode: 'insensitive' };
    if (nazwisko) where.lastName  = { contains: nazwisko, mode: 'insensitive' };

    let characters;
    try {
      characters = await prisma.character.findMany({
        where,
        include: {
          user: {
            select: {
              discordId:       true,
              robloxUsername:  true,
              phoneNumber:     true,
              currentJob:      true,
              arrests: { where: { active: true }, select: { id: true } },
            },
          },
        },
        take: 5,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
    } catch (err) {
      logger.error('szukaj-postac: błąd bazy:', err.message);
      return interaction.editReply({ content: '❌ Błąd podczas przeszukiwania bazy danych.' });
    }

    const query = [imie, nazwisko].filter(Boolean).join(' ');

    if (characters.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('🔍 Brak wyników')
            .setDescription(`Nie znaleziono postaci pasującej do zapytania: **${query}**`)
            .setFooter({ text: 'AURORA Greenville RP — System Służb' })
            .setTimestamp(),
        ],
      });
    }

    const lines = characters.map((char, i) => {
      const owner      = char.user;
      const isArrested = owner.arrests.length > 0;
      const arrestTag  = isArrested ? ' 🚨' : '';
      const phone      = owner.phoneNumber ? `📱 \`${owner.phoneNumber}\`` : '📱 brak numeru';
      const job        = owner.currentJob ?? '—';
      const roblox     = owner.robloxUsername ? ` *(Roblox: @${owner.robloxUsername})*` : '';

      return [
        `**${i + 1}.** ${char.firstName} ${char.lastName}${arrestTag}`,
        `> 👤 <@${owner.discordId}>${roblox}`,
        `> ${phone}  •  💼 ${job}`,
        `> 🔢 PESEL: ||${char.peselRp}||  •  🪪 Doc: ||${char.documentId}||`,
      ].join('\n');
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.rp)
      .setTitle(`🔍 Wyniki wyszukiwania: „${query}"`)
      .setDescription(lines.join('\n\n'))
      .setFooter({
        text: `${characters.length} wynik(i) • AURORA Greenville RP — System Służb`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    if (characters.length === 5) {
      embed.addFields({
        name: '⚠️ Uwaga',
        value: 'Wyświetlono maks. 5 wyników. Zawęź zapytanie podając pełniejsze imię/nazwisko.',
        inline: false,
      });
    }

    logger.info(
      `szukaj-postac | ${interaction.user.tag} | query="${query}" | wyniki=${characters.length}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
