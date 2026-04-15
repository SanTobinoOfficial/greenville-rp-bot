// quizEngine.js — silnik quizu weryfikacyjnego in-Discord (pytania zamknięte A/B/C/D)
// Używa in-memory Map do przechowywania stanu quizu (ephemeral wiadomości)
// Pytania otwarte dostępne są wyłącznie w quizie webowym (/quiz/{token})

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('./logger');

// Mapa stanu quizu: discordId → { questionIndex, score, questions, startTime }
const quizSessions = new Map();

// ─────────────────────────────────────────────────────────────────────────────
//  BAZA PYTAŃ — 25 pytań zamkniętych (losujemy 10 do każdego podejścia)
// ─────────────────────────────────────────────────────────────────────────────
const ALL_QUESTIONS = [
  // ── Podstawowe pojęcia RP ─────────────────────────────────────────────────
  {
    q: 'Co oznacza skrót **FRP** (Fail Role Play)?',
    options: ['Zachowanie niezgodne z realiami RP', 'Typ pojazdu w AURORA', 'Komenda bota do sesji', 'Nazwa służby na serwerze'],
    answer: 0,
    tip: 'FRP = zachowanie łamiące realizm RP, np. ignorowanie obrażeń, skakanie z dachu bez konsekwencji.',
  },
  {
    q: 'Co to jest **NLR** (New Life Rule)?',
    options: ['Nowy regulamin serwera', 'Zasada zapominania wszystkiego po śmierci postaci', 'Komenda resetu postaci', 'Nazwa dzielnicy w AURORA'],
    answer: 1,
    tip: 'NLR = po śmierci postaci zapominasz wszystko — kto cię zabił, gdzie i dlaczego.',
  },
  {
    q: 'Co to jest **metagaming**?',
    options: ['Granie kilkoma postaciami naraz', 'Używanie informacji z zewnątrz (np. Discord) w grze RP', 'Zbieranie punktów doświadczenia', 'Hackowanie serwera Roblox'],
    answer: 1,
    tip: 'Metagaming = twoja postać wie tylko to, co sama odkryła w grze.',
  },
  {
    q: 'Co to jest **powergaming**?',
    options: ['Granie wyłącznie po nagrody', 'Narzucanie innym akcji bez możliwości reakcji, działanie ponad własne możliwości', 'Szybka jazda pojazdem uprzywilejowanym', 'Zbieranie wszystkich dostępnych prac'],
    answer: 1,
    tip: 'Powergaming = np. "/me unieruchamia gracza" bez dania mu szansy na odpowiedź.',
  },
  {
    q: 'Co to jest **RDM** (Random Death Match)?',
    options: ['Dozwolony tryb walki w strefy PvP', 'Zabijanie graczy bez uzasadnionego powodu RP', 'Błąd techniczny serwera Roblox', 'Nazwa misji policyjnej'],
    answer: 1,
    tip: 'RDM = atak bez scenariusza RP — skutkuje warnem lub banem.',
  },
  {
    q: 'Co to jest **VDM** (Vehicle Death Match)?',
    options: ['Wyścigi uliczne w strefie auto', 'Celowe potrącanie graczy pojazdem bez powodu fabularnego', 'Zlecenie przewozu dla taksówkarzy', 'System kolizji pojazdów'],
    answer: 1,
    tip: 'VDM = trącenie/rozjechanie gracza bez podstawy RP. Karane tak samo jak RDM.',
  },

  // ── Zasady zachowania ─────────────────────────────────────────────────────
  {
    q: 'Czego NIE wolno robić podczas sesji RP w IC?',
    options: ['Jeździć zgodnie z przepisami', 'Używać nicków Discord i mówić o Roblox w rozmowie IC', 'Zgłaszać problemów przez ticket', 'Wykonywać zleceń swojej służby'],
    answer: 1,
    tip: 'IC = rozmawiasz jako postać. Wyrwanie się z roli niszczy immersję.',
  },
  {
    q: 'Czym jest zasada **Fear RP**?',
    options: ['Zakaz agresywnego RP', 'Zasada nakazująca postaci zachowywać się ze strachem w sytuacjach zagrożenia życia', 'System zarządzania ryzykiem dla policji', 'Wyjście z sesji gdy boisz się konsekwencji'],
    answer: 1,
    tip: 'Fear RP = gdy ktoś przyłożył ci broń do głowy, twoja postać się boi i nie atakuje.',
  },
  {
    q: 'Kiedy zasada Fear RP przestaje obowiązywać?',
    options: ['Nigdy', 'Gdy kupisz pancerz lub tarczę', 'Gdy bezpośrednie zagrożenie dla postaci minie', 'Gdy wejdziesz do pojazdu'],
    answer: 2,
    tip: 'Fear RP wygasa gdy broń nie jest wycelowana lub napastnik odszedł.',
  },
  {
    q: 'Jakie działanie jest przykładem naruszenia **NLR**?',
    options: ['Powrót do domu po zakończeniu scenariusza', 'Powrót na miejsce własnej śmierci, żeby zemścić się lub odzyskać rzeczy', 'Używanie nowego pojazdu po utracie poprzedniego', 'Kontaktowanie się ze staffem przez ticket'],
    answer: 1,
    tip: 'NLR zakazuje powrotu w to samo miejsce i zemsty — twoja postać nie pamięta zdarzenia.',
  },
  {
    q: 'W jakim języku należy rozmawiać podczas sesji RP na AURORA Greenville RP?',
    options: ['Angielskim', 'Polskim', 'Angielskim lub polskim do wyboru', 'Dowolnym europejskim'],
    answer: 1,
    tip: 'AURORA Greenville RP to polskojęzyczny serwer — obowiązuje język polski IC i OOC.',
  },

  // ── Służby i role ─────────────────────────────────────────────────────────
  {
    q: 'Czym jest rola **Mieszkaniec** na serwerze Discord?',
    options: ['Rola VIP za Nitro Boost', 'Rola nadawana automatycznie po dołączeniu', 'Pełna weryfikacja — połączony Roblox + zdany quiz', 'Rola moderatora z ograniczonymi uprawnieniami'],
    answer: 2,
    tip: 'Mieszkaniec = weryfikacja ukończona. Masz dostęp do kanałów sesji i pełne prawa gracza AURORA.',
  },
  {
    q: 'Jakie uprawnienia mają pojazdy **uprzywilejowane** (policja, EMS, straż)?',
    options: ['Mogą jeździć bez ograniczeń prędkości zawsze', 'Mogą przekraczać przepisy tylko podczas aktywnej interwencji z włączonymi sygnałami', 'Nie mają żadnych szczególnych uprawnień', 'Mogą parkować w każdym miejscu na stałe'],
    answer: 1,
    tip: 'Służby uprzywilejowane używają sygnałów (kogut, syrena) podczas realnej interwencji — nie bez powodu.',
  },
  {
    q: 'Co grozi za użycie komendy moderacyjnej w złej wierze przez osobę ze staffu?',
    options: ['Nic, staff może używać komend swobodnie', 'Upomnienie lub degradacja ze stanowiska staffu', 'Tymczasowe zawieszenie w prawach gracza', 'Automatyczne usunięcie komendy'],
    answer: 1,
    tip: 'Staff działa zgodnie z regulaminem — nadużycie uprawnień skutkuje konsekwencjami dyscyplinarnymi.',
  },
  {
    q: 'Co to jest **OOC** (Out of Character)?',
    options: ['Specjalna strefa RP poza miastem', 'Komunikacja lub zachowanie jako gracz, a nie jako postać', 'Komenda do wyjścia z sesji', 'Nazwa kanału głosowego dla obserwatorów'],
    answer: 1,
    tip: 'OOC = poza postacią. Np. "//" lub nawiasy kwadratowe [tak] oznaczają, że mówisz jako ty, nie jako postać.',
  },

  // ── System i zasady administracyjne ──────────────────────────────────────
  {
    q: 'Co powinieneś/powinnaś zrobić, gdy inny gracz poważnie łamie regulamin?',
    options: ['Kłócić się z nim publicznie na kanale ogólnym', 'Opuścić serwer i nie wracać', 'Zignorować', 'Otworzyć ticket i opisać sytuację z dowodem'],
    answer: 3,
    tip: 'Regulaminowe problemy zgłasza się zawsze przez ticket — publiczne oskarżenia są zabronione.',
  },
  {
    q: 'Ile mandatów RP może maksymalnie otrzymać postać przed wezwaniem na przesłuchanie?',
    options: ['3', '5', '10', 'Brak limitu'],
    answer: 2,
    tip: 'Limit mandatów to 10 — po przekroczeniu postać trafia na wezwanie sądowe.',
  },
  {
    q: 'Czy wolno reklamować inne serwery RP na kanałach AURORA?',
    options: ['Tak, na kanale #offtopic', 'Tak, jeśli masz rangę Mieszkaniec', 'Nie — reklama innych serwerów jest zakazana', 'Tak, ale tylko przez wiadomość prywatną z adminem'],
    answer: 2,
    tip: 'Reklama innych serwerów Discord/Roblox jest całkowicie zakazana i skutkuje banem.',
  },
  {
    q: 'Co to jest **combat logging**?',
    options: ['Zapisywanie przebiegu walki w notatniku', 'Opuszczenie gry/sesji w trakcie aktywnej interakcji RP by uniknąć konsekwencji', 'Specjalna technika bojowa policji', 'System rejestracji incydentów w CAD'],
    answer: 1,
    tip: 'Combat logging = wychodzenie z sesji gdy coś ci grozi. Skutkuje karą tak jak gdybyś pozostał/a.',
  },
  {
    q: 'Co to jest **stream sniping**?',
    options: ['Oglądanie streamu gry w celu zdobycia przewagi RP (np. lokalizacji gracza)', 'Kradnięcie transmisji wideo innego streamera', 'Specjalny tryb obserwatora w sesji', 'Nagrywanie sesji bez zgody innych graczy'],
    answer: 0,
    tip: 'Stream sniping = metagaming przez stream. Zakazane — postać nie może wiedzieć tego, co widzi kamera.',
  },

  // ── Praktyczne sytuacje ────────────────────────────────────────────────────
  {
    q: 'Czy wolno ci przełączyć się na inną postać w trakcie trwającej interakcji RP?',
    options: ['Tak, zawsze', 'Nie — zmiana postaci w trakcie aktywnego RP to naruszenie regulaminu', 'Tak, jeśli masz dwie zatwierdzone postacie', 'Tak, po uzyskaniu zgody od streamera'],
    answer: 1,
    tip: 'Zmiana postaci w połowie scenariusza to ucieczka od konsekwencji — niedozwolone.',
  },
  {
    q: 'Jak należy oznaczyć rozmowę **Out of Character** (OOC) podczas sesji?',
    options: ['Słowem "OOC" lub podwójnym ukośnikiem // przed wiadomością', 'Caps Lockiem', 'Wykrzyknikiem na początku zdania', 'Specjalną komendą /ooc'],
    answer: 0,
    tip: '// lub [nawiasy kwadratowe] sygnalizują OOC. Przykład: // przepraszam, rozłączyło mnie',
  },
  {
    q: 'Czy wolno nagrywać i publikować nagrania z sesji RP?',
    options: ['Tak, bez żadnych ograniczeń', 'Tak, ale tylko za zgodą wszystkich nagrywanych graczy i staffu', 'Nie — nagrywanie sesji jest całkowicie zakazane', 'Tak, ale tylko własna gra (nie innych graczy)'],
    answer: 1,
    tip: 'Publikowanie nagrań z rozpoznawalnymi postaciami innych graczy wymaga ich zgody.',
  },
  {
    q: 'Co powinieneś/powinnaś zrobić gdy usterka techniczna (bug, crash) przerwie twój scenariusz RP?',
    options: ['Udawać, że nic się nie stało i kontynuować', 'Natychmiast poinformować pozostałych graczy OOC i ustalić jak wznowić RP', 'Opuścić serwer bez słowa', 'Wymagać anulowania całego scenariusza'],
    answer: 1,
    tip: 'Bugi są nieplanowane — uczciwe OOC wyjaśnienie i porozumienie to właściwe postępowanie.',
  },
  {
    q: 'Gdzie znajdziesz aktualne zasady serwera AURORA Greenville RP?',
    options: ['Wyłącznie na stronie internetowej', 'Na kanale #regulamin na serwerze Discord', 'W grze Roblox w menu opcji', 'Musisz zapytać admina przez ticket'],
    answer: 1,
    tip: 'Aktualny regulamin zawsze jest na kanale #regulamin — warto go regularnie sprawdzać.',
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
    .setFooter({ text: `Wynik: ${score}/${questionIndex} • Wymagane: 8/10 • AURORA Greenville RP` })
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

// Rozpoczyna quiz (wywoływane po weryfikacji formularza)
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
          `Witaj w **AURORA Greenville RP**! 🎊`
        : `Uzyskałeś **${score}/10** punktów.\n\n` +
          `Wymagane minimum to **8/10**.\n` +
          `📖 Przeczytaj dokładnie kanał **#regulamin** i spróbuj ponownie za 24 godziny.`
    )
    .setFooter({ text: 'AURORA Greenville RP — Weryfikacja' })
    .setTimestamp();

  await interaction.editReply({
    embeds: [feedbackLast, resultEmbed],
    components: [],
  }).catch(() => {});

  logger.info(`Quiz zakończony: ${interaction.user.tag} — ${score}/10 — ${passed ? 'ZALICZONY' : 'NIEZALICZONY'}`);
}

module.exports = { startQuiz, handleQuizAnswer };
