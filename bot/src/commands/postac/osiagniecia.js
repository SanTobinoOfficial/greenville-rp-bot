// Komenda /osiagniecia — dynamiczne kamienie milowe postępu gracza RP
// Obliczane w czasie rzeczywistym z istniejących danych bez dodatkowych tabel.
// Dostępna dla: Mieszkaniec+ (własne); Staff+ może sprawdzić dowolnego gracza.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Definicje osiągnięć — kolejność wyznacza "ścieżkę postępu"
const ACHIEVEMENTS = [
  {
    id: 'verified',
    emoji: '✅',
    name: 'Mieszkaniec Greenville',
    desc: 'Zalicz quiz weryfikacyjny i dołącz do serwera RP',
    check: (u) => !!u.verifiedAt,
  },
  {
    id: 'character',
    emoji: '🪪',
    name: 'Tożsamość RP',
    desc: 'Stwórz postać i uzyskaj dowód osobisty IC',
    check: (u) => !!u.character,
  },
  {
    id: 'vehicle',
    emoji: '🚗',
    name: 'Zmotoryzowany',
    desc: 'Zarejestruj pierwszy pojazd w systemie',
    check: (u) => (u._count.vehicles ?? 0) >= 1,
  },
  {
    id: 'vehicle3',
    emoji: '🚘',
    name: 'Kolekcjoner pojazdów',
    desc: 'Posiadaj 3 lub więcej zarejestrowanych pojazdów',
    check: (u) => (u._count.vehicles ?? 0) >= 3,
  },
  {
    id: 'license',
    emoji: '📋',
    name: 'Prawo jazdy',
    desc: 'Zdaj egzamin i uzyskaj pierwszą kategorię prawa jazdy',
    check: (u) => (u._count.licenses ?? 0) >= 1,
  },
  {
    id: 'license3',
    emoji: '🏅',
    name: 'Wielokategoryjny',
    desc: 'Posiadaj 3 lub więcej kategorii prawa jazdy',
    check: (u) => (u._count.licenses ?? 0) >= 3,
  },
  {
    id: 'job',
    emoji: '💼',
    name: 'Pracownik RP',
    desc: 'Uzyskaj pierwszą pracę IC',
    check: (u) => !!u.currentJob,
  },
  {
    id: 'session1',
    emoji: '📅',
    name: 'Uczestnik',
    desc: 'Weź udział w co najmniej 1 sesji RP',
    check: (u) => (u._count.sessionSignups ?? 0) >= 1,
  },
  {
    id: 'session5',
    emoji: '🌟',
    name: 'Stały bywalec',
    desc: 'Weź udział w 5 lub więcej sesjach RP',
    check: (u) => (u._count.sessionSignups ?? 0) >= 5,
  },
  {
    id: 'session15',
    emoji: '🏆',
    name: 'Weteran sesji',
    desc: 'Weź udział w 15 lub więcej sesjach RP',
    check: (u) => (u._count.sessionSignups ?? 0) >= 15,
  },
  {
    id: 'clean',
    emoji: '🕊️',
    name: 'Nieskażona kartoteka',
    desc: 'Posiadaj zweryfikowane konto i żadnych aktywnych mandatów',
    check: (u) => !!u.verifiedAt && (u._count.activeFines ?? 0) === 0,
  },
  {
    id: 'application',
    emoji: '📝',
    name: 'Ambitny',
    desc: 'Złóż podanie na stanowisko w służbie lub pracy',
    check: (u) => (u._count.jobApplications ?? 0) >= 1,
  },
  {
    id: 'ticket',
    emoji: '🎫',
    name: 'Użytkownik supportu',
    desc: 'Otwórz przynajmniej jeden ticket wsparcia',
    check: (u) => (u._count.tickets ?? 0) >= 1,
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('osiagniecia')
    .setDescription('Sprawdź osiągnięcia RP — kamienie milowe Twojego postępu')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Sprawdź osiągnięcia innego gracza (Staff+)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const targetOption = interaction.options.getUser('gracz');
    const isCheckingOther = !!targetOption;

    if (isCheckingOther && !isStaff(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko Staff może przeglądać osiągnięcia innych graczy.',
      });
    }

    if (!isCheckingOther && !isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Musisz być zweryfikowanym **Mieszkańcem** aby sprawdzić osiągnięcia.',
      });
    }

    const discordId = isCheckingOther ? targetOption.id : interaction.user.id;
    const displayUser = isCheckingOther ? targetOption : interaction.user;

    const user = await prisma.user.findUnique({
      where: { discordId },
      include: {
        character: { select: { firstName: true, lastName: true } },
      },
    }).catch(() => null);

    if (!user) {
      return interaction.editReply({
        content: `❌ ${isCheckingOther ? 'Ten gracz nie jest' : 'Nie jesteś'} zarejestrowany/a w systemie RP.`,
      });
    }

    // Pobierz liczniki w jednym zapytaniu
    const [vehicleCount, licenseCount, sessionCount, fineActiveCount, jobAppCount, ticketCount] =
      await Promise.all([
        prisma.vehicle.count({ where: { userId: user.id } }),
        prisma.license.count({ where: { userId: user.id, status: 'ACTIVE' } }),
        prisma.sessionSignup.count({ where: { userId: user.id } }),
        prisma.fine.count({ where: { targetId: user.id, active: true } }),
        prisma.jobApplication.count({ where: { userId: user.id } }),
        prisma.ticket.count({ where: { userId: user.id } }),
      ]);

    // Wbuduj liczniki w obiekt gracza dla check()
    user._count = {
      vehicles:        vehicleCount,
      licenses:        licenseCount,
      sessionSignups:  sessionCount,
      activeFines:     fineActiveCount,
      jobApplications: jobAppCount,
      tickets:         ticketCount,
    };

    // Sprawdź które osiągnięcia są odblokowane
    const results = ACHIEVEMENTS.map(a => ({ ...a, unlocked: a.check(user) }));
    const unlocked = results.filter(a => a.unlocked).length;
    const total = results.length;
    const pct = Math.round((unlocked / total) * 100);

    // Pasek postępu tekstowy
    const barFilled = Math.round((unlocked / total) * 10);
    const progressBar = `\`${'█'.repeat(barFilled)}${'░'.repeat(10 - barFilled)}\` ${unlocked}/${total}`;

    const charName = user.character
      ? `${user.character.firstName} ${user.character.lastName}`
      : displayUser.username;

    const embed = new EmbedBuilder()
      .setColor(unlocked === total ? COLORS.gold : pct >= 50 ? COLORS.success : COLORS.primary)
      .setTitle(`🏅 Osiągnięcia RP — ${charName}`)
      .setThumbnail(displayUser.displayAvatarURL())
      .setDescription(
        `**Postęp:** ${progressBar}\n` +
        `Odblokowano **${unlocked}** z **${total}** osiągnięć *(${pct}%)*`
      )
      .setFooter({
        text: isCheckingOther
          ? `AURORA Greenville RP — sprawdził: ${interaction.user.tag}`
          : 'AURORA Greenville RP — Twoje osiągnięcia • widoczne tylko dla Ciebie',
      })
      .setTimestamp();

    // Grupuj: odblokowane na górze, zablokowane na dole
    const unlockedList = results.filter(a => a.unlocked);
    const lockedList   = results.filter(a => !a.unlocked);

    if (unlockedList.length > 0) {
      embed.addFields({
        name: `✅ Odblokowane (${unlockedList.length})`,
        value: unlockedList.map(a => `${a.emoji} **${a.name}**\n> *${a.desc}*`).join('\n'),
        inline: false,
      });
    }

    if (lockedList.length > 0) {
      embed.addFields({
        name: `🔒 Zablokowane (${lockedList.length})`,
        value: lockedList.map(a => `~~${a.emoji} ${a.name}~~\n> *${a.desc}*`).join('\n'),
        inline: false,
      });
    }

    if (unlocked === total) {
      embed.addFields({
        name: '🎉 Gratulacje!',
        value: 'Odblokowano **wszystkie osiągnięcia**. Jesteś prawdziwym weteranem Greenville RP!',
        inline: false,
      });
    }

    logger.info(
      `/osiagniecia | ${interaction.user.tag}${isCheckingOther ? ` → ${displayUser.tag}` : ''} | ${unlocked}/${total}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
