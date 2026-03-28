// Komenda /setup — inicjalizacja całego serwera Greenville RP
// Dostępna tylko dla właściciela serwera

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { setupServer } = require('../../setup/setupServer');
const { sendSetupEmbeds } = require('../../setup/setupEmbeds');
const { startStatsUpdater } = require('../../utils/statsUpdater');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Inicjalizuje cały serwer Greenville RP (tylko właściciel)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client, prisma) {
    // Sprawdź czy użytkownik jest właścicielem serwera
    if (interaction.guild.ownerId !== interaction.user.id) {
      return interaction.reply({
        content: '❌ Ta komenda jest dostępna **wyłącznie** dla właściciela serwera.',
        ephemeral: true,
      });
    }

    // Sprawdź czy setup był już wykonany
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    if (settings?.setupCompleted) {
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('⚠️ Setup już wykonany')
        .setDescription(
          'Setup serwera był już wcześniej przeprowadzony.\n\n' +
          'Czy na pewno chcesz uruchomić go ponownie? Istniejące kanały nie zostaną usunięte, ale embedy zostaną zaktualizowane.'
        );

      return interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    }

    // Rozpocznij setup
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('⚙️ Uruchamianie Setup...')
          .setDescription('Trwa inicjalizacja serwera Greenville RP. Proszę czekać...')
          .setFooter({ text: 'To może potrwać kilka minut' })
      ],
      ephemeral: true,
    });

    const progressMessages = [];

    const progress = async (message) => {
      progressMessages.push(message);
      const last5 = progressMessages.slice(-5);
      try {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle('⚙️ Setup w toku...')
              .setDescription(last5.map((m, i) => i === last5.length - 1 ? `**→ ${m}**` : `~~${m}~~`).join('\n'))
              .setFooter({ text: `${progressMessages.length} kroków wykonanych` })
          ],
        });
      } catch {}
    };

    try {
      // Krok 1: Tworzenie struktury serwera
      await progress('🎭 Tworzenie ról...');
      const { roles, channels } = await setupServer(interaction.guild, progress);

      // Krok 2: Wysyłanie embedów inicjalizujących
      await progress('📨 Wysyłanie embedów na kanały...');
      await sendSetupEmbeds(interaction.guild, channels);

      // Krok 3: Uruchomienie aktualizatora statystyk
      await progress('📊 Uruchamianie aktualizatora statystyk...');
      startStatsUpdater(client);

      // Krok 4: Zapis do bazy danych
      await prisma.settings.update({
        where: { id: 'global' },
        data: {
          setupCompleted: true,
          guildId: interaction.guild.id,
        },
      });

      // Inicjalizacja domyślnych pytań quizu
      const existingQuestions = await prisma.quizQuestion.count();
      if (existingQuestions === 0) {
        await prisma.quizQuestion.createMany({
          data: DEFAULT_QUIZ_QUESTIONS,
        });
        await progress('📋 Dodano domyślne pytania quizu...');
      }

      // Wynik końcowy
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Setup Zakończony!')
            .setDescription(
              '🎉 Serwer **Greenville RP** został pomyślnie skonfigurowany!\n\n' +
              '**Co zostało utworzone:**\n' +
              `• **${Object.keys(roles).length}** ról\n` +
              `• **${Object.keys(channels).length}** kanałów i kategorii\n` +
              '• Embedy weryfikacji, ticketów, pojazdów i więcej\n' +
              '• Aktualizator statystyk (co 10 min)\n\n' +
              '**Następne kroki:**\n' +
              '1. Użyj `/deploy` aby zarejestrować komendy slash\n' +
              '2. Ustaw bota jako najwyższą rolę w hierarchii\n' +
              '3. Skonfiguruj dashboard pod `/dashboard/ustawienia`'
            )
            .setFooter({ text: 'Greenville RP — Setup v2.0' })
            .setTimestamp()
        ],
      });

      logger.info(`Setup serwera ${interaction.guild.name} zakończony przez ${interaction.user.tag}`);

    } catch (error) {
      logger.error('Błąd podczas setup:', error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('❌ Błąd podczas setup')
            .setDescription(
              `Wystąpił błąd podczas konfiguracji serwera:\n\`\`\`${error.message}\`\`\`\n` +
              'Sprawdź czy bot ma odpowiednie uprawnienia (Administrator) i spróbuj ponownie.'
            )
        ],
      });
    }
  },
};

// ==================== DOMYŚLNE PYTANIA QUIZU ====================

const DEFAULT_QUIZ_QUESTIONS = [
  {
    question: 'Co oznacza skrót FRP?',
    answers: ['Fail Roleplay', 'Fast Roleplay', 'Free Roleplay', 'Fun Roleplay'],
    correct: 0,
    order: 1,
  },
  {
    question: 'Jaka jest prędkość FRP w Greenville RP?',
    answers: ['100 mph', '120 mph', '131 mph', '150 mph'],
    correct: 2,
    order: 2,
  },
  {
    question: 'Co oznacza VDM?',
    answers: ['Very Dangerous Move', 'Vehicle Deathmatch', 'Virtual Driver Mode', 'Violation During Mission'],
    correct: 1,
    order: 3,
  },
  {
    question: 'Ile pojazdów może zarejestrować zwykły Mieszkaniec?',
    answers: ['3', '5', '9', '10'],
    correct: 1,
    order: 4,
  },
  {
    question: 'Co to jest Combat Logging (CL)?',
    answers: [
      'Walka z innymi graczami',
      'Wyjście z gry podczas akcji RP aby uniknąć odpowiedzialności',
      'Logowanie do gry podczas walki',
      'Zakaz używania broni',
    ],
    correct: 1,
    order: 5,
  },
  {
    question: 'Ile mandatów prowadzi do automatycznego zatrzymania prawa jazdy?',
    answers: ['5', '8', '10', '15'],
    correct: 2,
    order: 6,
  },
  {
    question: 'Co oznacza komenda /me w RP?',
    answers: [
      'Opis danej chwili otoczenia',
      'Opis czynności postaci',
      'Wezwanie pomocy',
      'Wyjście z trybu RP',
    ],
    correct: 1,
    order: 7,
  },
  {
    question: 'Ile osób może brać udział w napadzie na bank?',
    answers: ['1-2', '2-3', '3-5', 'Brak limitu'],
    correct: 1,
    order: 8,
  },
  {
    question: 'Co to jest Meta Gaming (MG)?',
    answers: [
      'Granie na wielu serwerach jednocześnie',
      'Używanie informacji z OOC w IC',
      'Omijanie zasad serwera',
      'Korzystanie z modów',
    ],
    correct: 1,
    order: 9,
  },
  {
    question: 'Podczas Peacetime 1° co jest zakazane?',
    answers: [
      'Jazda pojazdami',
      'Rozmowy na czacie',
      'Akcje Crime i ucieczka przed policją',
      'Korzystanie z /me',
    ],
    correct: 2,
    order: 10,
  },
];
