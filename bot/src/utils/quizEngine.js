// quizEngine.js — silnik quizu weryfikacyjnego in-Discord
// Używa in-memory Map do przechowywania stanu quizu (ephemeral wiadomości)

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('./logger');

// Mapa stanu quizu: discordId → { questionIndex, score, questions, startTime }
const quizSessions = new Map();

// Pytania quizu — regulamin Greenville RP
const ALL_QUESTIONS = [
  {
    q: 'Co oznacza skrót **FRP** (Fail Role Play)?',
    options: ['Zachowanie niezgodne z realiami RP', 'Typ pojazdu w Greenville', 'Komenda bota do sesji', 'Nazwa służby na serwerze'],
    answer: 0,
    tip: 'FRP = zachowanie łamiące realizm RP, np. ignorowanie śmierci, teleportowanie się itp.',
  },
  {
    q: 'Co to jest **NLR** (New Life Rule)?',
    options: ['Nowy regulamin serwera', 'Zasada zapominania wszystkiego po śmierci postaci', 'Komenda resetu postaci', 'Nazwa dzielnicy w Greenville'],
    answer: 1,
    tip: 'NLR = po śmierci postaci zapominasz wszystko co zdarzyło się przed śmiercią.',
  },
  {
    q: 'Co to jest **metagaming**?',
    options: ['Granie kilkoma postaciami naraz', 'Używanie informacji z zewnątrz (np. Discord) w grze RP', 'Zbieranie punktów doświadczenia', 'Hackowanie serwera Roblox'],
    answer: 1,
    tip: 'Metagaming = korzystanie z wiedzy zdobytej poza postacią (np. z czatu na Discord) podczas sesji.',
  },
  {
    q: 'Jakie minimum punktów musisz uzyskać w quizie weryfikacyjnym?',
    options: ['5 na 10', '6 na 10', '7 na 10', '8 na 10'],
    answer: 3,
    tip: 'Wymagane minimum to 8/10 punktów.',
  },
  {
    q: 'Czego NIE wolno robić podczas sesji RP?',
    options: ['Jeździć samochodem zgodnie z przepisami', 'Używać nicków i języka pozaRP w rozmowach IC', 'Zgłaszać problemów przez ticket', 'Wykonywać zleceń swojej służby'],
    answer: 1,
    tip: 'IC (In Character) = rozmawiasz jako postać, nie jako ty. Używanie nicków i OOC-mowy łamie immersję.',
  },
  {
    q: 'Co powinnaś/powinieneś zrobić, jeśli masz problem z innym graczem podczas sesji?',
    options: ['Kłócić się z nim na kanale głosowym', 'Wyjść z serwera', 'Zignorować i nie reagować', 'Otworzyć ticket lub zgłosić staffowi'],
    answer: 3,
    tip: 'Problemy między graczami rozwiązuje się przez system ticketów lub kontakt ze staffem.',
  },
  {
    q: 'Czym jest rola **Mieszkaniec**?',
    options: ['Rola VIP dla boosterów', 'Rola staffu serwera', 'Rola uzyskiwana po pozytywnym przejściu weryfikacji', 'Rola automatyczna dla każdego kto wejdzie na serwer'],
    answer: 2,
    tip: 'Mieszkaniec = pełna weryfikacja — połączyłeś Roblox i zdałeś quiz. Masz dostęp do kanałów RP.',
  },
  {
    q: 'Jakiego języka należy używać na serwerze Discord Greenville RP?',
    options: ['Angielskiego', 'Polskiego', 'Dowolnego europejskiego', 'Polskiego lub angielskiego'],
    answer: 1,
    tip: 'Greenville RP to polski serwer — obowiązuje język polski.',
  },
  {
    q: 'Co grozi za **rdm** (Random Death Match) — zabijanie bez powodu RP?',
    options: ['Nic, to dozwolone', 'Ostrzeżenie lub ban', 'Tylko kick z sesji', 'Tylko usunięcie roli'],
    answer: 1,
    tip: 'RDM jest poważnym naruszeniem regulaminu i może skutkować warnem lub banem.',
  },
  {
    q: 'Ile kanałów głosowych ma kategoria **Głosowe** dostępna dla wszystkich mieszkańców?',
    options: ['2', '4', '8', '12'],
    answer: 2,
    tip: 'Kategoria Głosowe zawiera: Lobby, Ogólny 1-3, Prywatny 2os, Prywatny 4os, Radio RMF MAXX, AFK = 8 kanałów.',
  },
];

// Wylosuj 10 pytań w losowej kolejności
function getRandomQuestions() {
  const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 10);
}

// Tworzy embed z pytaniem
function buildQuestionEmbed(questionIndex, question, score) {
  const letters = ['A', 'B', 'C', 'D'];
  const optionsText = question.options
    .map((opt, i) => `${letters[i]}. ${opt}`)
    .join('\n');

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📋 Quiz weryfikacyjny — Pytanie ${questionIndex + 1}/10`)
    .setDescription(`**${question.q}**\n\n${optionsText}`)
    .setFooter({ text: `Wynik: ${score}/${questionIndex} • Wymagane: 8/10` })
    .setTimestamp();
}

// Tworzy przyciski A/B/C/D
function buildAnswerButtons(questionIndex) {
  const letters = ['A', 'B', 'C', 'D'];
  const buttons = letters.map(letter =>
    new ButtonBuilder()
      .setCustomId(`quiz_${letter}_${questionIndex}`)
      .setLabel(letter)
      .setStyle(ButtonStyle.Secondary)
  );
  return new ActionRowBuilder().addComponents(buttons);
}

// Rozpoczyna quiz (wywoływane po weryfikacji Roblox)
async function startQuiz(interaction, client, prisma, dbUser) {
  const userId = interaction.user.id;

  // Sprawdź cooldown (24h)
  const settings = await prisma.settings.findUnique({ where: { id: 'global' } }).catch(() => null);
  const cooldownHours = settings?.quizCooldownHours ?? 24;

  if (dbUser.quizLastAttempt) {
    const elapsed = Date.now() - dbUser.quizLastAttempt.getTime();
    const cooldownMs = cooldownHours * 3600 * 1000;
    if (elapsed < cooldownMs) {
      const nextAttempt = Math.floor((dbUser.quizLastAttempt.getTime() + cooldownMs) / 1000);
      const reply = {
        embeds: [
          new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('⏳ Cooldown quizu')
            .setDescription(`Możesz podejść do quizu ponownie <t:${nextAttempt}:R>.`)
        ],
        ephemeral: true,
      };
      if (interaction.deferred || interaction.replied) {
        return interaction.followUp(reply).catch(() => {});
      }
      return interaction.reply(reply).catch(() => {});
    }
  }

  // Zaktualizuj datę ostatniej próby
  await prisma.user.update({
    where: { id: dbUser.id },
    data: { quizLastAttempt: new Date() },
  }).catch(() => {});

  // Inicjalizuj sesję
  const questions = getRandomQuestions();
  quizSessions.set(userId, {
    questionIndex: 0,
    score: 0,
    questions,
    startTime: Date.now(),
    dbUserId: dbUser.id,
    guildId: interaction.guildId,
  });

  const embed = buildQuestionEmbed(0, questions[0], 0);
  const row = buildAnswerButtons(0);

  const reply = { embeds: [embed], components: [row], ephemeral: true };
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(reply).catch(() => {});
  } else {
    await interaction.reply(reply).catch(() => {});
  }
}

// Obsługuje odpowiedź na pytanie quizu
// customId format: quiz_A_0, quiz_B_2, itd.
async function handleQuizAnswer(interaction, client, prisma) {
  const parts = interaction.customId.split('_');
  const letter = parts[1]; // A/B/C/D
  const expectedIndex = parseInt(parts[2], 10);
  const userId = interaction.user.id;

  const session = quizSessions.get(userId);
  if (!session) {
    return interaction.reply({
      content: '❌ Sesja quizu wygasła. Kliknij ponownie przycisk **Zweryfikuj się**.',
      ephemeral: true,
    });
  }

  // Zabezpieczenie przed zdublowanymi kliknięciami
  if (session.questionIndex !== expectedIndex) {
    return interaction.deferUpdate().catch(() => {});
  }

  await interaction.deferUpdate().catch(() => {});

  const letters = ['A', 'B', 'C', 'D'];
  const answerIndex = letters.indexOf(letter);
  const question = session.questions[expectedIndex];
  const isCorrect = answerIndex === question.answer;

  if (isCorrect) session.score++;
  session.questionIndex++;

  // Wciąż trwa quiz?
  if (session.questionIndex < 10) {
    const nextQ = session.questions[session.questionIndex];
    const embed = buildQuestionEmbed(session.questionIndex, nextQ, session.score);
    // Pokaż krótki feedback przed następnym pytaniem
    const feedbackEmbed = new EmbedBuilder()
      .setColor(isCorrect ? 0x57F287 : 0xED4245)
      .setDescription(
        isCorrect
          ? `✅ **Dobrze!** ${question.tip ?? ''}`
          : `❌ **Błąd.** Prawidłowa odpowiedź: **${letters[question.answer]}. ${question.options[question.answer]}**`
      );

    const row = buildAnswerButtons(session.questionIndex);

    await interaction.editReply({
      embeds: [feedbackEmbed, embed],
      components: [row],
    }).catch(() => {});

  } else {
    // Koniec quizu
    quizSessions.delete(userId);
    await finishQuiz(interaction, client, prisma, session, isCorrect, question, letters);
  }
}

// Koniec quizu — sprawdź wynik i nadaj rolę
async function finishQuiz(interaction, client, prisma, session, lastCorrect, lastQuestion, letters) {
  const { score } = session;
  const passed = score >= 8;

  if (passed) {
    // Nadaj rolę Mieszkaniec, usuń Niezweryfikowany
    try {
      const guild = client.guilds.cache.get(session.guildId) ?? await client.guilds.fetch(session.guildId);
      const member = await guild.members.fetch(interaction.user.id);

      const mieszkaniecRole = guild.roles.cache.find(r => r.name === 'Mieszkaniec');
      const niezwerRole = guild.roles.cache.find(r => r.name === 'Niezweryfikowany');

      if (mieszkaniecRole) await member.roles.add(mieszkaniecRole).catch(() => {});
      if (niezwerRole) await member.roles.remove(niezwerRole).catch(() => {});

      // Log na #logi-weryfikacji
      const logCh = guild.channels.cache.find(c => c.name === '🪪│logi-weryfikacji' && c.isTextBased());
      if (logCh) {
        await logCh.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('✅ Weryfikacja zakończona pomyślnie')
              .addFields(
                { name: 'Gracz', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: 'Wynik', value: `${score}/10`, inline: true },
                { name: 'Czas', value: `${Math.round((Date.now() - session.startTime) / 1000)}s`, inline: true },
              )
              .setTimestamp()
          ],
        }).catch(() => {});
      }
    } catch (e) {
      logger.error('Błąd nadawania roli po quizie:', e);
    }
  }

  const feedbackLast = new EmbedBuilder()
    .setColor(lastCorrect ? 0x57F287 : 0xED4245)
    .setDescription(
      lastCorrect
        ? `✅ **Dobrze!** ${lastQuestion.tip ?? ''}`
        : `❌ **Błąd.** Prawidłowa odpowiedź: **${letters[lastQuestion.answer]}. ${lastQuestion.options[lastQuestion.answer]}**`
    );

  const resultEmbed = new EmbedBuilder()
    .setColor(passed ? 0x57F287 : 0xED4245)
    .setTitle(passed ? '🎉 Gratulacje! Weryfikacja zakończona!' : '❌ Nie udało się — spróbuj ponownie')
    .setDescription(
      passed
        ? `Uzyskałeś **${score}/10** punktów i pomyślnie zdałeś quiz!\n\n` +
          `🏠 Otrzymujesz rolę **Mieszkaniec** — masz teraz dostęp do wszystkich kanałów RP!\n` +
          `Witaj w **Greenville RP**! 🎊`
        : `Uzyskałeś **${score}/10** punktów.\n\n` +
          `Wymagane minimum to **8/10**.\n` +
          `Przeczytaj dokładnie <#regulamin> i spróbuj ponownie za 24 godziny.`
    )
    .setFooter({ text: 'Greenville RP — Weryfikacja' })
    .setTimestamp();

  await interaction.editReply({
    embeds: [feedbackLast, resultEmbed],
    components: [],
  }).catch(() => {});

  logger.info(`Quiz zakończony: ${interaction.user.tag} — ${score}/10 — ${passed ? 'ZALICZONY' : 'NIEZALICZONY'}`);
}

module.exports = { startQuiz, handleQuizAnswer };
