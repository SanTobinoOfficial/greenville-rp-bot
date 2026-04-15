// Seed pytań quizu weryfikacyjnego — AURORA Greenville RP
// Uruchom: npx ts-node -r tsconfig-paths/register prisma/seed-quiz.ts
// LUB dodaj do package.json: "prisma": { "seed": "ts-node -r tsconfig-paths/register prisma/seed.ts" }
// i uruchom: npx prisma db seed

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// 15 pytań CLOSED (wybór A/B/C/D) + 5 pytań OPEN (odpowiedź tekstowa) = 20 łącznie
// passScore = 14 / 20 (70%)
// ─────────────────────────────────────────────────────────────────────────────

const questions = [
  // ══════════════════════════════════════════════════════════
  //  PYTANIA ZAMKNIĘTE (CLOSED) — 15 pytań
  // ══════════════════════════════════════════════════════════

  {
    type: 'CLOSED',
    order: 1,
    question: 'Co oznacza skrót **FRP** (Fail Role Play)?',
    answers: [
      'Zachowanie niezgodne z realiami i logiką RP',
      'Typ pojazdu uprzywilejowanego w AURORA',
      'Komenda bota do zarządzania sesją',
      'Nazwa drużyny policyjnej SWAT',
    ],
    correct: 0,
    keywords: [],
    tip: 'FRP = zachowanie łamiące realizm RP, np. skakanie z budynku bez konsekwencji, ignorowanie obrażeń.',
  },
  {
    type: 'CLOSED',
    order: 2,
    question: 'Co to jest **NLR** (New Life Rule)?',
    answers: [
      'Nowy regulamin serwera AURORA obowiązujący od 2024 r.',
      'Zasada mówiąca, że po śmierci postaci zapominasz wszystko, co wydarzyło się przed śmiercią',
      'Komenda do resetu postaci i pojazdu',
      'Nazwa dzielnicy przemysłowej w Greenville',
    ],
    correct: 1,
    keywords: [],
    tip: 'NLR = po śmierci twoja postać zaczyna nowe życie — nie pamiętasz kto cię zabił ani gdzie to się stało.',
  },
  {
    type: 'CLOSED',
    order: 3,
    question: 'Co to jest **metagaming**?',
    answers: [
      'Granie kilkoma postaciami jednocześnie na tym samym koncie',
      'Używanie informacji zdobytych poza postacią (np. z Discorda, rozmowy OOC) w grze RP',
      'Zbieranie punktów doświadczenia przez wykonywanie zleceń',
      'Rodzaj zaawansowanego scenariusza kryminalnego',
    ],
    correct: 1,
    keywords: [],
    tip: 'Metagaming = twoja postać wie tylko to, co sama odkryła w grze — nie możesz przenosić wiedzy z Discorda ani rozmów OOC.',
  },
  {
    type: 'CLOSED',
    order: 4,
    question: 'Co to jest **powergaming**?',
    answers: [
      'Granie wyłącznie w celu zdobycia jak najwyższej rangi',
      'Narzucanie innym graczom akcji bez możliwości reakcji, działanie ponad swoje możliwości',
      'Korzystanie z cheatów w grze Roblox',
      'Szybkie poruszanie się pojazdami uprzywilejowanymi',
    ],
    correct: 1,
    keywords: [],
    tip: 'Powergaming = np. wpisanie "/me unieruchamia przeciwnika" bez dania mu szansy na reakcję.',
  },
  {
    type: 'CLOSED',
    order: 5,
    question: 'Co to jest **RDM** (Random Death Match)?',
    answers: [
      'Specjalny tryb walki dozwolony podczas sesji RP',
      'Zabijanie innych graczy bez uzasadnionego powodu fabularnego',
      'Błąd techniczny powodujący wyrzucenie z serwera',
      'Rodzaj misji policyjnej w Greenville',
    ],
    correct: 1,
    keywords: [],
    tip: 'RDM = atakowanie lub zabijanie graczy bez scenariusza RP — jest poważnym naruszeniem regulaminu skutkującym karą.',
  },
  {
    type: 'CLOSED',
    order: 6,
    question: 'Co to jest **VDM** (Vehicle Death Match)?',
    answers: [
      'Wyścigi uliczne dozwolone w strefie industrial',
      'Zabijanie lub rażenie graczy pojazdem bez powodu fabularnego',
      'Komenda teleportacji pojazdu do garażu',
      'System zarządzania flotą pojazdów policji',
    ],
    correct: 1,
    keywords: [],
    tip: 'VDM = celowe potrącanie gracza pojazdem bez scenariusza RP. Tak samo karane jak RDM.',
  },
  {
    type: 'CLOSED',
    order: 7,
    question: 'Czego NIE wolno robić podczas sesji RP?',
    answers: [
      'Używać pojazdu zgodnie z przepisami ruchu drogowego',
      'Używać nicków Discord, mówić o grze Roblox ani łamać immersji OOC wewnątrz IC',
      'Zgłaszać problemów przez kanał ticketów',
      'Odgrywać postać z własnym charakterem i historią',
    ],
    correct: 1,
    keywords: [],
    tip: 'IC (In Character) = rozmawiasz i działasz JAKO postać. Wychodzenie z roli (OOC) podczas sesji to naruszenie.',
  },
  {
    type: 'CLOSED',
    order: 8,
    question: 'Co grozi za **naruszenie NLR** (powrót na miejsce własnej śmierci)?',
    answers: [
      'Nic — NLR nie obowiązuje w AURORA',
      'Ostrzeżenie (warn), a przy powtórzeniu tymczasowy ban',
      'Tylko upomnienie słowne na kanale ogólnym',
      'Automatyczne usunięcie roli Mieszkańca',
    ],
    correct: 1,
    keywords: [],
    tip: 'Złamanie NLR to poważne naruszenie — normalnie skutkuje warnem, a wielokrotne powtórzenie — banem.',
  },
  {
    type: 'CLOSED',
    order: 9,
    question: 'Jakim językiem należy używać podczas sesji RP (w IC)?',
    answers: [
      'Angielskim, bo Greenville to miasto w USA',
      'Polskim — serwer jest polskojęzyczny',
      'Dowolnym europejskim językiem',
      'Angielskim lub polskim do wyboru',
    ],
    correct: 1,
    keywords: [],
    tip: 'AURORA Greenville RP jest polskim serwerem — obowiązuje język polski zarówno IC jak i OOC.',
  },
  {
    type: 'CLOSED',
    order: 10,
    question: 'Co powinieneś/powinnaś zrobić, gdy masz poważny problem z zachowaniem innego gracza?',
    answers: [
      'Wyzwać go na kłótnię na kanale głosowym',
      'Wyjść z sesji bez słowa',
      'Otworzyć ticket lub skontaktować się ze staffem',
      'Napisać o tym na kanale #ogólny i czekać',
    ],
    correct: 2,
    keywords: [],
    tip: 'Problemy zgłasza się przez system ticketów lub bezpośredni kontakt z moderatorem — nigdy przez publiczne kanały.',
  },
  {
    type: 'CLOSED',
    order: 11,
    question: 'W jakim przypadku wolno używać broni palnej w RP?',
    answers: [
      'Zawsze, gdy gracz chce',
      'Tylko gdy wynika to z uzasadnionego scenariusza RP i nie ma innej możliwości',
      'Broń jest całkowicie zakazana na serwerze',
      'Tylko członkowie służb mogą używać broni w dowolnym momencie',
    ],
    correct: 1,
    keywords: [],
    tip: 'Broń używana jest tylko w uzasadnionych sytuacjach fabularnych. Bezpodstawne użycie = RDM.',
  },
  {
    type: 'CLOSED',
    order: 12,
    question: 'Co to jest **Fear RP** (strach postaci)?',
    answers: [
      'Zasada nakazująca zachowywać się ze strachem w sytuacjach zagrożenia życia',
      'Specjalny tryb gry dla graczy z rolą Przestępca',
      'System oceny ryzyka przez służby mundurowe',
      'Kanał na Discordzie dla graczy bojących się RP',
    ],
    correct: 0,
    keywords: [],
    tip: 'Fear RP = twoja postać BOJI się śmierci. Gdy ktoś przyłożył ci broń do głowy — nie uciekasz, nie atakujesz.',
  },
  {
    type: 'CLOSED',
    order: 13,
    question: 'Kiedy kończy się obowiązek Fear RP?',
    answers: [
      'Nigdy — Fear RP obowiązuje zawsze',
      'Gdy gracz ochroni się tarczą lub pancerzem',
      'Gdy zagrożenie dla postaci minie (np. napastnik odszedł lub broń nie jest wymierzona)',
      'Fear RP nie istnieje w regulaminie AURORA',
    ],
    correct: 2,
    keywords: [],
    tip: 'Fear RP wygasa gdy bezpośrednie zagrożenie ustąpi — np. napastnik odwrócił się lub oddalił.',
  },
  {
    type: 'CLOSED',
    order: 14,
    question: 'Co oznacza rola **Mieszkaniec** na serwerze Discord?',
    answers: [
      'Rola VIP dla osób wspierających serwer Nitro',
      'Rola tymczasowa nadawana po dołączeniu, przed weryfikacją',
      'Pełna weryfikacja — połączony nick Roblox + zdany quiz z regulaminu',
      'Rola moderatora z ograniczonymi uprawnieniami',
    ],
    correct: 2,
    keywords: [],
    tip: 'Mieszkaniec = weryfikacja zakończona. Masz dostęp do kanałów sesji i pełne prawa gracza AURORA.',
  },
  {
    type: 'CLOSED',
    order: 15,
    question: 'Ile **mandatów / ostrzeżeń RP** może maksymalnie otrzymać postać zanim zostanie zatrzymana na wezwanie sądu?',
    answers: [
      '3',
      '5',
      '10',
      'Nie ma limitu',
    ],
    correct: 2,
    keywords: [],
    tip: 'Zgodnie z regulaminem RP maksymalna liczba mandatów to 10 — po przekroczeniu postać otrzymuje wezwanie na przesłuchanie.',
  },

  // ══════════════════════════════════════════════════════════
  //  PYTANIA OTWARTE (OPEN) — 5 pytań
  // ══════════════════════════════════════════════════════════

  {
    type: 'OPEN',
    order: 16,
    question: 'Wyjaśnij własnymi słowami czym jest **roleplay** i jak należy się zachowywać na serwerze AURORA Greenville RP.',
    answers: [],
    correct: -1,
    keywords: [
      'postać', 'rola', 'odgrywać', 'fikcja', 'realnie', 'zachowanie',
      'immersja', 'scenariusz', 'zasady', 'regulamin', 'fabula',
    ],
    tip: 'Kluczowe pojęcia: wcielanie się w postać, trzymanie się realiów, immersja, brak OOC w IC.',
  },
  {
    type: 'OPEN',
    order: 17,
    question: 'Czym jest **metagaming** i dlaczego jest zakazany? Podaj przykład metagamingu.',
    answers: [],
    correct: -1,
    keywords: [
      'informacja', 'discord', 'poza grą', 'ooc', 'postać nie wie', 'niesprawiedliwy',
      'przykład', 'wiem', 'zewnątrz', 'wiedza', 'zakazany', 'przewaga',
    ],
    tip: 'Dobra odpowiedź: opis + przykład (np. "zobaczyłem na Discordzie gdzie jest wróg i poleciałem tam").',
  },
  {
    type: 'OPEN',
    order: 18,
    question: 'Opisz jak powinna zachować się Twoja postać, gdy policja wydaje jej polecenie zatrzymania się. Uwzględnij zasadę **Fear RP**.',
    answers: [],
    correct: -1,
    keywords: [
      'zatrzymać', 'ręce', 'posłuszeństwo', 'broń', 'strach', 'fear rp',
      'zagrożenie', 'nie uciekać', 'spokojnie', 'nakaz', 'polecenie',
    ],
    tip: 'Poprawna odpowiedź: postać zatrzymuje się, podnosi ręce, nie ucieka gdy grozi jej broń (Fear RP).',
  },
  {
    type: 'OPEN',
    order: 19,
    question: 'Co to jest **New Life Rule (NLR)** i jak wpływa na Twoje postępowanie po śmierci postaci? Opisz na przykładzie.',
    answers: [],
    correct: -1,
    keywords: [
      'śmierć', 'nowe życie', 'zapomnieć', 'kto zabił', 'miejsce', 'nie wracać',
      'pamięć', 'postać', 'restart', 'przykład', 'nie pamiętam',
    ],
    tip: 'Kluczowe: po śmierci postać nie pamięta kto ją zabił, gdzie to się stało, nie wraca w to samo miejsce.',
  },
  {
    type: 'OPEN',
    order: 20,
    question: 'Zostałeś/łaś ofiarą **RDM** — ktoś zaatakował Cię bez powodu RP. Opisz krok po kroku co powinieneś/powinnaś zrobić.',
    answers: [],
    correct: -1,
    keywords: [
      'ticket', 'zgłosić', 'staff', 'dowód', 'screenshot', 'zapis', 'nie kłócić',
      'moderator', 'regulamin', 'spokojnie', 'zgłoszenie', 'opis sytuacji',
    ],
    tip: 'Prawidłowa odpowiedź: zebranie dowodów (screenshot/nagranie), otwarcie ticketu, opisanie sytuacji staffowi.',
  },
];

async function main() {
  console.log('🌱 Seeding pytań quizu AURORA Greenville RP...\n');

  // Usuń poprzednie pytania
  const deleted = await prisma.quizQuestion.deleteMany({});
  console.log(`🗑️  Usunięto ${deleted.count} poprzednich pytań.`);

  // Dodaj nowe pytania
  let created = 0;
  for (const q of questions) {
    await prisma.quizQuestion.create({ data: q });
    const label = q.type === 'OPEN' ? '📝' : '❓';
    console.log(`${label} [${q.order.toString().padStart(2, '0')}] ${q.question.slice(0, 60)}…`);
    created++;
  }

  // Zaktualizuj ustawienia — pass score na 14/20
  await prisma.settings.upsert({
    where: { id: 'global' },
    create: {
      id: 'global',
      quizPassScore: 14,
      quizTotalQuestions: 20,
      quizCooldownHours: 24,
    },
    update: {
      quizPassScore: 14,
      quizTotalQuestions: 20,
    },
  });

  console.log(`\n✅ Dodano ${created} pytań (${questions.filter(q => q.type === 'CLOSED').length} zamkniętych + ${questions.filter(q => q.type === 'OPEN').length} otwartych).`);
  console.log('⚙️  Zaktualizowano ustawienia: passScore=14, totalQuestions=20.');
}

main()
  .catch((e) => {
    console.error('❌ Błąd seedowania:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
