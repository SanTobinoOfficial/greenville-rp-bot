// jobQuizEngine.js — silnik testu rekrutacyjnego dla prac cywilnych (PUBLIC)
// 15 pytań, losuje 10 na sesję, próg zaliczenia 80% (8/10), cooldown 24h przy oblanym

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Mapa sesji: userId → stan quizu
const quizSessions = new Map();

const PASS_SCORE   = 8;    // minimalna liczba poprawnych odpowiedzi
const TOTAL_Q      = 10;   // pytań w sesji
const COOLDOWN_H   = 24;   // cooldown w godzinach przy nieudanym teście

// ─── Baza pytań ──────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    q: 'Co oznacza skrót "IC" w kontekście pracy RP?',
    options: ['"Internet Connection" — połączenie z serwerem', '"In Character" — zachowujesz się jako Twoja postać RP', '"Identification Card" — legitymacja pracownicza', '"Instant Cash" — wynagrodzenie'],
    answer: 1,
    tip: 'IC (In Character) = działasz i mówisz jako Twoja postać. Wszystko co robisz "w grze" to IC.',
  },
  {
    q: 'Twój pracodawca (właściciel firmy) wydaje Ci polecenie IC. Jak reagujesz?',
    options: ['Ignorujesz je — jesteś niezależny', 'Wykonujesz je, o ile nie łamie regulaminu serwera i firmy', 'Zawsze wykonujesz każde polecenie bez wyjątku, nawet nielegalne', 'Otwierasz ticket do Staffu'],
    answer: 1,
    tip: 'Polecenia pracodawcy IC obowiązują w ramach regulaminu. Nielegalne działania nadal są zakazane.',
  },
  {
    q: 'Rozmawiasz z kolegą przez Discord o aktualnej sesji RP. Co to jest i co grozi?',
    options: ['Normalna rozmowa — bez konsekwencji', 'Metagaming — surowe naruszenie regulaminu, grozi karą', 'OOC — dozwolone poza sesją', 'Combat Logging — tylko jeśli opuszczasz grę'],
    answer: 1,
    tip: 'Metagaming = przenoszenie wiedzy OOC (Discord, stream) do świata IC. Zabronione bezwzględnie.',
  },
  {
    q: 'W trakcie pracy widzisz sytuację FRP (Fail Roleplay) innego gracza. Co robisz?',
    options: ['Reagujesz agresją — odgrywasz zemstę IC', 'Ignorujesz — nie twoja sprawa', 'Zapisujesz dowody i zgłaszasz przez ticket lub Staffa na sesji', 'Przerywasz sesję i wychodzisz z gry'],
    answer: 2,
    tip: 'Naruszenia regulaminu zgłaszaj przez ticket. Samosąd IC grozi własną karą.',
  },
  {
    q: 'Kiedy możesz zdjąć mundur pracowniczy podczas aktywnej zmiany IC?',
    options: ['Zawsze gdy masz ochotę', 'Tylko za zgodą przełożonego lub zgodnie z regulaminem firmy', 'Nigdy — mundur jest stały', 'Tylko po zakończeniu obsługi klienta'],
    answer: 1,
    tip: 'Mundur to element Roleplay. Zdjęcie go bez uzasadnienia to FRP. Każda firma ma własne zasady.',
  },
  {
    q: 'Co to jest komenda /me w komunikacji IC?',
    options: ['Prywatna wiadomość do gracza', 'Sprawdzenie statystyk postaci', 'Opis czynności Twojej postaci (np. /me otwiera drzwi)', 'Wyjście z roli — przejście do OOC'],
    answer: 2,
    tip: '/me opisuje czynność Twojej postaci. Wymagane przy kluczowych akcjach (przeszukanie, naprawa, itp.).',
  },
  {
    q: 'Co oznacza Peacetime 1° (Pt1°) na sesji?',
    options: ['Wolno wykonywać akcje kryminalne za zgodą moderatora', 'Bezwzględny zakaz wszelkich akcji kryminalnych na sesji', 'Limit prędkości 70 mph i void wypadków', 'Koniec sesji — powrót do lobby'],
    answer: 1,
    tip: 'Pt1° = pełen zakaz kryminalny. Pt2° = dodatkowo limit 70 mph i auto-void wypadków.',
  },
  {
    q: 'Właściciel firmy stworzył własny regulamin wewnętrzny. Czy obowiązuje pracowników?',
    options: ['Nie — liczy się tylko regulamin główny serwera', 'Tak, jeśli został zatwierdzony przez Administrację/HR', 'Tylko kierowników — zwykłych pracowników nie dotyczy', 'Tylko podczas eventów specjalnych'],
    answer: 1,
    tip: 'Regulamin firmy jest wiążący po akceptacji Administracji. To rozszerzenie regulaminu serwera.',
  },
  {
    q: 'Jak długo obowiązuje cooldown jeśli oblałeś test rekrutacyjny?',
    options: ['1 godzina', '2 godziny', '24 godziny', '7 dni'],
    answer: 2,
    tip: 'Cooldown 24h po nieudanym teście. Wykorzystaj ten czas, by lepiej zapoznać się z mini-regulaminem pracy.',
  },
  {
    q: 'Twój kolega z pracy bije klienta bez żadnego powodu fabularnego. To jest...',
    options: ['Normalna scena akcji RP', 'Fear RP — klient się bał', 'RDM i/lub FRP — naruszenie regulaminu serwera', 'Dozwolone, jeśli klient wyraził zgodę OOC'],
    answer: 2,
    tip: 'RDM = atak bez uzasadnienia fabularnego. FRP = zachowanie niemożliwe w rzeczywistości. Oba są zakazane.',
  },
  {
    q: 'Które zachowanie jest właściwe przy obsłudze klienta IC?',
    options: ['Używasz telefonu IC przez całą zmianę i ignorujesz klientów', 'Sprzedajesz towar firmy "na boku" za własny zysk', 'Obsługujesz klienta z etykietą IC, dbasz o atmosferę RP', 'Zapraszasz klientów do prywatnych transakcji poza firmą'],
    answer: 2,
    tip: 'Pracownik reprezentuje firmę. Działanie na szkodę pracodawcy IC = naruszenie regulaminu firmy.',
  },
  {
    q: 'Twoja postać zostaje aresztowana podczas zmiany w pracy. Co powinieneś zrobić IC?',
    options: ['Nic — sytuacja jest odizolowana i nie ma wpływu na pracę', 'Kontynuujesz pracę od razu po wyjściu z aresztu, bez informowania nikogo', 'Zawiadamiasz pracodawcę IC i stosujesz się do regulaminu firmy dotyczącego absencji', 'Automatycznie tracisz pracę — musisz złożyć nowe podanie'],
    answer: 2,
    tip: 'Areszt to sytuacja IC. Informuj pracodawcę IC i zachowuj spójność fabularna.',
  },
  {
    q: 'Po zakończeniu sesji RP Twoja praca i historia zatrudnienia...',
    options: ['Kasują się — każda sesja zaczyna od zera', 'Pozostają — praca, mandaty i historia są trwałe między sesjami', 'Są zawieszane do następnej sesji', 'Zależą od decyzji Staffu po każdej sesji'],
    answer: 1,
    tip: 'System RP AURORA to persistent world — postać, praca, pojazdy i historia są stałe.',
  },
  {
    q: 'Co to jest "OOC" i kiedy go stosować?',
    options: ['"Out of Character" — wychodzisz z roli; używaj w nawiasach () lub przez /b', '"Over-Optimized Content" — skrót graficzny', '"Official Order Command" — polecenie służbowe', '"Open Online Chat" — publiczny czat'],
    answer: 0,
    tip: 'OOC: piszesz jako gracz, nie postać. Używaj oszczędnie, np. przy realnym problemie technicznym.',
  },
  {
    q: 'Co to jest "NLR" (New Life Rule)?',
    options: ['Zakaz zmiany pracy częściej niż raz dziennie', 'Po śmierci postać traci pamięć — zakaz powrotu w to samo miejsce przez 5 minut', 'Nowa postać nie może pracować przez pierwsze 24 godziny', 'Zakaz rozmowy z graczniem, który Cię zabił'],
    answer: 1,
    tip: 'NLR: śmierć = reset pamięci. 5 minut zakaz powrotu. Pamiętanie okoliczności śmierci = łamanie NLR.',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LABELS = ['A', 'B', 'C', 'D'];

function buildQuestionEmbed(session, qIdx) {
  const q = session.questions[qIdx];
  const progress = `Pytanie ${qIdx + 1} / ${TOTAL_Q}`;
  const correct  = session.correct;

  return new EmbedBuilder()
    .setColor(0x22C55E)
    .setTitle(`💼 Test rekrutacyjny — ${session.jobName}`)
    .setDescription(`**${progress}** | ✅ Poprawnych: ${correct}\n\n**${q.q}**`)
    .setFooter({ text: `AURORA Greenville RP • Min. ${PASS_SCORE}/${TOTAL_Q} (80%) by zdać` })
    .setTimestamp();
}

function buildAnswerRow(session, qIdx) {
  const q = session.questions[qIdx];
  return new ActionRowBuilder().addComponents(
    q.options.map((opt, i) =>
      new ButtonBuilder()
        .setCustomId(`jobquiz_${LABELS[i]}_${qIdx}_${session.jobId}`)
        .setLabel(`${LABELS[i]}: ${opt.slice(0, 77)}`)
        .setStyle(ButtonStyle.Secondary)
    )
  );
}

// ─── Publiczne API ────────────────────────────────────────────────────────────

function startSession(userId, jobId, jobName) {
  const questions = shuffle(QUESTIONS).slice(0, TOTAL_Q);
  const session = { userId, jobId, jobName, questions, current: 0, correct: 0, wrong: 0 };
  quizSessions.set(userId, session);
  return session;
}

function getSession(userId) {
  return quizSessions.get(userId) ?? null;
}

function clearSession(userId) {
  quizSessions.delete(userId);
}

/** Zwraca { correct, passed, tip } po odpowiedzi gracza */
function answerQuestion(session, answerLabel) {
  const q = session.questions[session.current];
  const idx = LABELS.indexOf(answerLabel);
  const isCorrect = idx === q.answer;
  if (isCorrect) session.correct++;
  else session.wrong++;
  session.current++;
  return { isCorrect, tip: q.tip };
}

function isFinished(session) {
  return session.current >= TOTAL_Q;
}

function hasPassed(session) {
  return session.correct >= PASS_SCORE;
}

/** Buduje embed wyniku końcowego */
function buildResultEmbed(session) {
  const passed = hasPassed(session);
  const pct    = Math.round((session.correct / TOTAL_Q) * 100);

  return new EmbedBuilder()
    .setColor(passed ? 0x22C55E : 0xEF4444)
    .setTitle(passed
      ? `✅ Gratulacje! Zdałeś test — ${session.jobName}`
      : `❌ Nie zdałeś testu — ${session.jobName}`
    )
    .setDescription(passed
      ? `Zdobyłeś **${session.correct}/${TOTAL_Q}** punktów (**${pct}%**) — próg 80% zaliczony!\n\nRola pracownika została przydzielona. Zapoznaj się z pełnym mini-regulaminem przed pierwszą zmianą.`
      : `Zdobyłeś **${session.correct}/${TOTAL_Q}** punktów (**${pct}%**).\nWymagane minimum: **${PASS_SCORE}/${TOTAL_Q} (80%)**.\n\n⏳ Następna próba możliwa za **24 godziny**.\nPrzeczytaj dokładnie mini-regulamin pracy i spróbuj ponownie.`
    )
    .addFields(
      { name: '✅ Poprawne', value: `${session.correct}`, inline: true },
      { name: '❌ Błędne',   value: `${session.wrong}`,   inline: true },
      { name: '📊 Wynik',    value: `${pct}%`,             inline: true },
    )
    .setFooter({ text: 'AURORA Greenville RP • System Zatrudnienia' })
    .setTimestamp();
}

/** Buduje embed pytania z opcjami */
function buildNextQuestion(session) {
  const qIdx = session.current;
  return {
    embeds: [buildQuestionEmbed(session, qIdx)],
    components: [buildAnswerRow(session, qIdx)],
  };
}

module.exports = {
  startSession,
  getSession,
  clearSession,
  answerQuestion,
  isFinished,
  hasPassed,
  buildNextQuestion,
  buildResultEmbed,
  COOLDOWN_H,
  PASS_SCORE,
  TOTAL_Q,
};
