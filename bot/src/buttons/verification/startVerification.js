// Przycisk "Zweryfikuj się" — pierwszy krok weryfikacji
// Otwiera rozbudowany modal z polem na nick Roblox + pytania weryfikacyjne

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

module.exports = {
  async execute(interaction, client, prisma) {
    // Sprawdź czy już w pełni zweryfikowany (ma Mieszkaniec)
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const hasMieszkaniee = member.roles.cache.some(r => r.name === 'Mieszkaniec');
    if (hasMieszkaniee) {
      return interaction.reply({
        content: '✅ Jesteś już zweryfikowany! Masz rolę **Mieszkaniec**.',
        ephemeral: true,
      });
    }

    // Sprawdź czy nick Roblox już powiązany — jeśli tak, przejdź od razu do quizu
    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (user?.robloxId) {
      const { startQuiz } = require('../../utils/quizEngine');
      return startQuiz(interaction, client, prisma, user);
    }

    // Brak nicku — pokaż rozbudowany modal weryfikacyjny
    const modal = new ModalBuilder()
      .setCustomId('modal_verification')
      .setTitle('Weryfikacja — AURORA Greenville RP');

    // Pole 1: Nick Roblox
    const nickInput = new TextInputBuilder()
      .setCustomId('roblox_nick')
      .setLabel('Nick Roblox (dokładny, uwzględnij wielkość liter)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Wpisz swój dokładny nick na Roblox...')
      .setMinLength(3)
      .setMaxLength(30)
      .setRequired(true);

    // Pole 2: Wiek gracza
    const ageInput = new TextInputBuilder()
      .setCustomId('wiek')
      .setLabel('Ile masz lat? (wiek gracza, nie postaci)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('np. 16')
      .setMinLength(1)
      .setMaxLength(3)
      .setRequired(true);

    // Pole 3: Skąd znasz serwer
    const sourceInput = new TextInputBuilder()
      .setCustomId('skad_znasz')
      .setLabel('Skąd dowiedziałeś/aś się o serwerze? (min. 20 znaków)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('np. Od znajomego, TikTok, YouTube, szukałem serwera Roblox RP...')
      .setMinLength(20)
      .setMaxLength(300)
      .setRequired(true);

    // Pole 4: Doświadczenie RP
    const expInput = new TextInputBuilder()
      .setCustomId('doswiadczenie')
      .setLabel('Opisz swoje doświadczenie z roleplay (min. 50 znaków)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Opisz swoją historię z RP: jakie serwery znasz, jak długo grasz w RP, co lubisz w RP...')
      .setMinLength(50)
      .setMaxLength(600)
      .setRequired(true);

    // Pole 5: Dlaczego chcesz dołączyć
    const whyInput = new TextInputBuilder()
      .setCustomId('dlaczego')
      .setLabel('Dlaczego chcesz dołączyć do AURORA? (min. 80 znaków)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Opisz własnymi słowami dlaczego właśnie ten serwer Cię przyciągnął i co planujesz robić...')
      .setMinLength(80)
      .setMaxLength(800)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nickInput),
      new ActionRowBuilder().addComponents(ageInput),
      new ActionRowBuilder().addComponents(sourceInput),
      new ActionRowBuilder().addComponents(expInput),
      new ActionRowBuilder().addComponents(whyInput),
    );

    await interaction.showModal(modal);
  },
};
