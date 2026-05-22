// drivingExamEngine.js — silnik egzaminu teoretycznego na prawo jazdy
// Zasady ruchu drogowego USA (Greenville to miasto w stanie USA)
// 15 pytań A/B/C/D, próg zaliczenia: 12/15 (80%), cooldown 6h
// Kategorie: AM, A1, A2, A, B, C, D

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('./logger');

// Mapa sesji: `${userId}_${kategoria}` → stan egzaminu
const examSessions = new Map();

const PASS_SCORE    = 12;   // wymagane poprawnych odpowiedzi
const TOTAL_Q       = 15;   // łączna liczba pytań
const COOLDOWN_H    = 6;    // cooldown w godzinach
const GENERAL_DRAW  = 10;   // ile pytań ogólnych losujemy
const SPECIFIC_DRAW = 5;    // ile pytań kategorialnych losujemy

// ─────────────────────────────────────────────────────────────────────────────
//  BAZA PYTAŃ OGÓLNYCH — przepisy ruchu drogowego USA (30 pytań)
// ─────────────────────────────────────────────────────────────────────────────
const GENERAL_QUESTIONS = [
  {
    q: 'Co oznacza czerwony znak w kształcie ośmiokąta (STOP)?',
    options: ['Zatrzymaj się całkowicie, ustąp pierwszeństwa, jedź dalej gdy bezpiecznie', 'Zwolnij i jedź ostrożnie', 'Zatrzymaj się tylko gdy jest ruch', 'Zatrzymaj się na 3 sekundy'],
    answer: 0,
    tip: 'Znak STOP = pełne zatrzymanie, sprawdzenie skrzyżowania, ruszenie gdy droga wolna.',
  },
  {
    q: 'Co oznacza trójkątny czerwono-biały znak YIELD?',
    options: ['Zakaz wjazdu', 'Zwolnij i ustąp pierwszeństwa pojazdom na drodze głównej', 'Koniec drogi pierwszeństwa', 'Zakaz wyprzedzania'],
    answer: 1,
    tip: 'YIELD = ustąp pierwszeństwa. Zwolnij lub zatrzymaj się, wpuść pojazdy z drogi głównej.',
  },
  {
    q: 'Na skrzyżowaniu bez znaków (4-way stop), kto jedzie pierwszy?',
    options: ['Pojazd jadący prosto ma zawsze pierwszeństwo', 'Pojazd, który pierwszy się zatrzymał; przy jednoczesnym dojechaniu — pojazd z prawej strony', 'Pojazd jadący z lewej strony', 'Pojazd większy (np. SUV przed sedanem)'],
    answer: 1,
    tip: 'Na 4-way stop: pierwszy przybyły = pierwszy jedzie. Przy remisie: prawy ma pierwszeństwo.',
  },
  {
    q: 'Czy w USA wolno skręcić w prawo na czerwonym świetle?',
    options: ['Nigdy — czerwone zawsze oznacza zatrzymanie', 'Tak, zawsze bez ograniczeń', 'Tak, po pełnym zatrzymaniu i gdy nie ma znaku zakazu — ale tylko za dnia', 'Tak, po pełnym zatrzymaniu i upewnieniu się, że droga jest wolna, chyba że znak zabrania'],
    answer: 3,
    tip: 'Prawy skręt na czerwonym: zatrzymaj się, sprawdź, jedź — o ile brak znaku "No Turn On Red".',
  },
  {
    q: 'Jaki jest typowy limit prędkości w strefie szkolnej (school zone) w USA?',
    options: ['45 mph', '35 mph', '15–25 mph', '30 mph'],
    answer: 2,
    tip: 'Strefa szkolna: 15–25 mph zależnie od stanu. Zawsze zwalniaj i bądź gotowy na dzieci!',
  },
  {
    q: 'Co oznaczają dwie ciągłe żółte linie na środku drogi?',
    options: ['Dozwolone wyprzedzanie w obie strony', 'Zakaz wyprzedzania z obu kierunków', 'Wyprzedzanie dozwolone tylko z lewej strony', 'Granica pasa HOV'],
    answer: 1,
    tip: 'Podwójna ciągła żółta = bezwzględny zakaz wyprzedzania w obie strony.',
  },
  {
    q: 'Co oznacza przerywana żółta linia na środku drogi?',
    options: ['Zakaz wyprzedzania', 'Jedź środkiem pasa', 'Wyprzedzanie dozwolone, gdy bezpiecznie i widoczność pozwala', 'Granica pasa autobusowego'],
    answer: 2,
    tip: 'Przerywana żółta = możesz wyprzedzać, jeśli jest widoczność i droga wolna.',
  },
  {
    q: 'Co powinieneś zrobić gdy widzisz migające czerwone światło na skrzyżowaniu?',
    options: ['Zwolnij i jedź ostrożnie', 'Zatrzymaj się, sprawdź, jedź gdy bezpiecznie (jak znak STOP)', 'Zatrzymaj się i czekaj na zielone', 'Jedź z normalną prędkością — to tylko sygnalizacja tymczasowa'],
    answer: 1,
    tip: 'Migające czerwone = traktuj jak znak STOP: zatrzymaj, sprawdź, jedź.',
  },
  {
    q: 'Co oznacza migające żółte światło na skrzyżowaniu?',
    options: ['Zakaz wjazdu', 'Zatrzymaj się i czekaj', 'Zwolnij i jedź ostrożnie przez skrzyżowanie', 'Ustąp pierwszeństwa pieszym na przejściu'],
    answer: 2,
    tip: 'Migające żółte = ostrzeżenie. Zwolnij, bądź ostrożny, jedź jeśli bezpiecznie.',
  },
  {
    q: 'Jaki jest dopuszczalny poziom alkoholu we krwi (BAC) dla dorosłych kierowców w USA?',
    options: ['0.05%', '0.10%', '0.08%', '0.12%'],
    answer: 2,
    tip: 'Federalny limit DUI: 0.08% BAC. Kierowcy komercyjni: 0.04%. Poniżej 21 lat: 0.00% w większości stanów.',
  },
  {
    q: 'Co powinieneś zrobić gdy zbliża się pojazd uprzywilejowany (policja, straż, karetka)?',
    options: ['Przyspieszyć i zjechać z drogi jak najszybciej', 'Zjechać na prawy pobocze i zatrzymać się', 'Zatrzymać się na środku pasa i czekać', 'Kontynuować jazdę z normalną prędkością'],
    answer: 1,
    tip: 'Emergency vehicle = pull to the right and stop. Dopiero gdy pojazd minie, możesz ruszać.',
  },
  {
    q: 'W jakiej sytuacji musisz zatrzymać się przed szkolnym autobusem ze świecącymi czerwonymi lampkami?',
    options: ['Tylko jadąc za autobusem', 'Tylko na drodze dwupasmowej', 'Zawsze — z obu kierunków — chyba że droga jest podzielona barierą/pasem zieleni', 'Tylko gdy widać wsiadające dzieci'],
    answer: 2,
    tip: 'Schoolbus z czerwonymi lampkami: STOP z obu kierunków na drodze bez bariery!',
  },
  {
    q: 'Jaka jest zasada "3-second rule" (3 sekundy) w ruchu drogowym?',
    options: ['Czekaj 3 sekundy po czerwonym zanim ruszysz', 'Utrzymuj co najmniej 3-sekundowy odstęp od pojazdu przed sobą', 'Hamuj płynnie przez 3 sekundy przed skrzyżowaniem', 'Sygnalizuj skręt 3 sekundy przed manewrem'],
    answer: 1,
    tip: '3-second rule: gdy pojazd przed tobą mija punkt stały, licz 3 sekundy — powinieneś minąć go po trzech.',
  },
  {
    q: 'Kto ma pierwszeństwo na niekontrolowanym skrzyżowaniu (brak znaków)?',
    options: ['Pojazd jadący prosto', 'Pojazd jadący z lewej', 'Pojazd jadący z prawej strony', 'Większy pojazd'],
    answer: 2,
    tip: 'Na skrzyżowaniu bez znaków: pojazd przyjeżdżający z prawej ma pierwszeństwo.',
  },
  {
    q: 'Co powinieneś zrobić gdy zaczyna się akwaplanacja (hydroplaning)?',
    options: ['Gwałtownie zahamuj, aby odzyskać przyczepność', 'Natychmiast skręć w lewo', 'Zdejmij nogę z gazu, trzymaj kierownicę pewnie, jedź prosto', 'Dodaj gazu, żeby przejechać przez wodę szybciej'],
    answer: 2,
    tip: 'Aquaplaning: nie hamuj gwałtownie! Zdejmij nogę z gazu, trzymaj kierownicę i czekaj na kontakt z asfaltem.',
  },
  {
    q: 'Co oznacza zielona strzałka w sygnalizacji świetlnej?',
    options: ['Możesz jechać w kierunku strzałki bez kolizji z innymi uczestnikami', 'Zwolnij — niedługo żółte', 'Strzałka dotyczy tylko pojazdów skręcających', 'Ustąp pierwszeństwa pieszym'],
    answer: 0,
    tip: 'Zielona strzałka (protected signal): droga wolna dla Twojego kierunku, inne ruch jest zatrzymany.',
  },
  {
    q: 'W jakiej odległości od hydrantu przeciwpożarowego nie wolno parkować?',
    options: ['10 stóp (3 m)', '15 stóp (ok. 4,5 m)', '20 stóp (6 m)', '25 stóp (7,5 m)'],
    answer: 1,
    tip: 'W USA zakaz parkowania 15 feet (ok. 4,5 m) od hydrantu — straż musi mieć szybki dostęp.',
  },
  {
    q: 'Co oznacza znak w kształcie proporczyka (pennant-shaped yellow sign)?',
    options: ['Ograniczenie prędkości na autostradzie', 'Strefa szkolna', 'Zakaz wyprzedzania (No Passing Zone)', 'Niebezpieczny zakręt'],
    answer: 2,
    tip: 'Proporczyk = No Passing Zone. Zakaz wyprzedzania — zwykle na wzniesieniu lub łuku.',
  },
  {
    q: 'Na ile sekund do przodu powinieneś patrzeć podczas jazdy po mieście?',
    options: ['2–3 sekundy', '5–7 sekund', '10–15 sekund', '20–25 sekund'],
    answer: 2,
    tip: 'Defensive driving: skanuj 10–15 sekund przed sobą. Na autostradzie — 15–30 sekund.',
  },
  {
    q: 'Gdy sygnalizacja świetlna nie działa, co powinieneś zrobić?',
    options: ['Kontynuować jazdę — masz pierwszeństwo jako kierowca na drodze z pierwszeństwem', 'Traktować skrzyżowanie jak 4-way stop', 'Zatrzymać się i czekać aż światła zadziałają', 'Używać klaksonu i jechać ostrożnie'],
    answer: 1,
    tip: 'Niedziałająca sygnalizacja = 4-way stop. Każdy musi się zatrzymać i sprawdzić.',
  },
  {
    q: 'Co oznaczają niebieskie znaki drogowe w USA?',
    options: ['Informacje o przepisach i zakazach', 'Ostrzeżenia o niebezpieczeństwach', 'Informacje o usługach: stacje paliw, restauracje, hotele, szpitale', 'Oznaczenia autostrad stanowych'],
    answer: 2,
    tip: 'Niebieskie znaki = serwisy i udogodnienia dla kierowców (gas, food, lodging, hospital).',
  },
  {
    q: 'Jakie jest prawo "Move Over" w USA?',
    options: ['Obowiązek zmiany pasa na wolniejszy dla pojazdów z przyczepą', 'Obowiązek zmiany pasa lub zwolnienia przy stojących pojazdach uprzywilejowanych na poboczu', 'Nakaz zjeżdżania na prawe pobocze na autostradzie', 'Zakaz przejeżdżania przez podwójną ciągłą linię'],
    answer: 1,
    tip: '"Move Over" law: gdy widzisz policję/karetkę/lawetę na poboczu, zmień pas lub zwolnij.',
  },
  {
    q: 'Na jaką odległość przed skrzyżowaniem powinieneś włączyć kierunkowskaz?',
    options: ['25 stóp (7,5 m)', '50 stóp (15 m)', '100 stóp (30 m)', '200 stóp (60 m)'],
    answer: 2,
    tip: 'Większość stanów USA: 100 feet (ok. 30 m) przed skrętem. Autostrady: 300+ feet.',
  },
  {
    q: 'W jakim kierunku obracasz kierownicę przy parkowaniu pod górę (bez krawężnika)?',
    options: ['W prawo — ku krawędzi drogi', 'W lewo — od krawędzi drogi', 'Prosto — bez obracania', 'Nie ma znaczenia'],
    answer: 0,
    tip: 'Pod górę BEZ krawężnika: koła w prawo (w stronę pobocza) — jeśli auto stoczy się, nie wyjedzie na jezdnię.',
  },
  {
    q: 'Co oznacza biała ciągła linia między pasami?',
    options: ['Absolutny zakaz zmiany pasa', 'Zakaz wyprzedzania', 'Zmiana pasa odradzona, ale nie zakazana', 'Granica pasa dla pojazdów uprzywilejowanych'],
    answer: 2,
    tip: 'Biała ciągła linia między pasami = zmiana pasa mocno odradzona (np. przy skrzyżowaniu, tunelu).',
  },
  {
    q: 'W jakiej odległości od skrzyżowania (od linii stopu) nie wolno parkować?',
    options: ['10 stóp (3 m)', '20 stóp (6 m)', '30 stóp (9 m)', '50 stóp (15 m)'],
    answer: 2,
    tip: '30 feet (ok. 9 m) od skrzyżowania — zakaz parkowania dla zachowania widoczności.',
  },
  {
    q: 'Kiedy należy przyciemnić długie światła (high beams)?',
    options: ['Zawsze na autostradzie', 'Gdy zbliżasz się do innego pojazdu z przodu na odległość 500 stóp lub jedziesz za nim w odległości 300 stóp', 'Tylko w mieście, poza miastem można jeździć na długich', 'Gdy pada deszcz'],
    answer: 1,
    tip: 'Zdejmij długie: 500 feet przed nadjeżdżającym pojazdem i 300 feet za pojazdem poprzedzającym.',
  },
  {
    q: 'Co to jest "right of way" (pierwszeństwo przejazdu)?',
    options: ['Prawo do jazdy po prawym pasie autostrady', 'Pierwszeństwo przejazdu przyznane przez przepisy lub znaki drogowe', 'Prawo do skrętu w prawo w każdej sytuacji', 'Pierwszeństwo pojazdu większego nad mniejszym'],
    answer: 1,
    tip: 'Right of way = pierwszeństwo przejazdu. Pamiętaj: przepisy mówią KTO ustępuje, a nie kto ma "prawo".',
  },
  {
    q: 'Co oznacza biała linia na krawędzi jezdni (edge line)?',
    options: ['Zakaz wyjazdu poza tę linię', 'Oznaczenie prawej krawędzi pasa ruchu / jezdni', 'Pas dla rowerów', 'Zakaz parkowania'],
    answer: 1,
    tip: 'Biała linia krawędziowa = granica jezdni. Nie zjeżdżaj poza nią bez powodu.',
  },
  {
    q: 'Co to jest "tailgating" (jazda w ogonie)?',
    options: ['Holowanie przyczepy', 'Jazda zbyt blisko za pojazdem poprzedzającym', 'Specjalna technika hamowania', 'Jazda z wyłączonymi tylnimi światłami'],
    answer: 1,
    tip: 'Tailgating = jazda zbyt blisko za innym pojazdem. Niebezpieczne — skraca czas reakcji.',
  },
  {
    q: 'Kiedy musisz ustąpić pierwszeństwa pieszym?',
    options: ['Tylko na pasach z sygnalizacją świetlną', 'Tylko gdy pieszy stoi na przejściu', 'Na wszystkich oznaczonych i nieoznaczonych przejściach dla pieszych', 'Tylko w strefach szkolnych'],
    answer: 2,
    tip: 'Pieszy ma pierwszeństwo na KAŻDYM przejściu — oznaczonym i nieoznaczonym (skrzyżowania).',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  PYTANIA KATEGORIALNE
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_QUESTIONS = {

  // ── AM / A1 / A2 / A — Motocykle i motorowery ────────────────────────────
  AM: [
    { q: 'Czy "lane splitting" (jazda między pasami ruchu) jest legalne w większości stanów USA?', options: ['Tak, wszędzie w USA', 'Tak, ale tylko na autostradach', 'Nie, w większości stanów jest nielegalne', 'Tak, jeśli prędkość jest poniżej 20 mph'], answer: 2, tip: 'Lane splitting jest legalny tylko w Kalifornii i kilku innych stanach — w większości USA to wykroczenie.' },
    { q: 'Które położenie w pasie ruchu jest najlepsze dla motoroweru/motocykla?', options: ['Prawy skraj pasa', 'Lewy skraj pasa (dla lepszej widoczności)', 'Środek pasa', 'Zmień co kilka sekund'], answer: 1, tip: 'Lewa część pasa = lepsza widoczność dla innych kierowców i ucieczka od krawężnika.' },
    { q: 'Co jest najczęstszą przyczyną wypadków z udziałem motocyklistów?', options: ['Prędkość motocyklisty', 'Kierowcy samochodów, którzy nie widzą motocyklisty', 'Zły stan nawierzchni', 'Brak kasku'], answer: 1, tip: 'Większość wypadków: "I didn\'t see the motorcycle." Bądź widoczny — odzież, pozycja, światła.' },
    { q: 'Jak powinieneś sygnalizować hamowanie ręką na motocyklu?', options: ['Lewa ręka wyciągnięta poziomo w lewo', 'Lewa ręka skierowana w górę pod kątem 45°', 'Lewa ręka opuszczona w dół pod kątem 45°', 'Prawa ręka opuszczona w dół'], answer: 2, tip: 'Sygnał hamowania ręką: lewa ręka skierowana w dół pod kątem 45° od ramienia.' },
    { q: 'Co powinieneś zrobić przed pokonaniem zakrętu na motocyklu?', options: ['Przyspieszyć na wejściu w zakręt', 'Zahamować w zakręcie gdy jest za szybko', 'Zwolnić przed zakrętem, utrzymuj stałą prędkość lub lekko przyspieszaj przez zakręt', 'Jechać środkiem zakrętu dla bezpieczeństwa'], answer: 2, tip: 'Motocykl w zakręcie: zwalniaj PRZED zakrętem, nie W nim. Przez zakręt: stała prędkość lub delikatne przyspieszenie.' },
    { q: 'Jaki rodzaj wyposażenia ochronnego jest najbardziej zalecany dla motocyklisty?', options: ['Tylko kask', 'Kask, kurtka skórzana lub tekstylna, rękawice, buty motocyklowe', 'Kask i kamizelka odblaskowa', 'Zwykłe ubranie — liczy się doświadczenie'], answer: 1, tip: 'ATGATT = All The Gear, All The Time. Kask, kurtka, rękawice, buty, spodnie ochronne.' },
    { q: 'Jak motocyklista powinien pokonywać tory kolejowe?', options: ['Jak najszybciej, żeby nie stracić przyczepności', 'Pod kątem prostym (90°) do szyn', 'Równolegle do szyn', 'Omijając szyny po lewej stronie'], answer: 1, tip: 'Tory pod kątem prostym (90°) — unikasz wpadnięcia kołem w rowek szyny.' },
    { q: 'Co grozi motocykliście jadącemu bez wymaganego kasku (w stanach, gdzie jest obowiązkowy)?', options: ['Upomnienie słowne', 'Mandat i możliwość zatrzymania pojazdu', 'Tylko ostrzeżenie przy pierwszym złapaniu', 'Nic — to wybór kierowcy'], answer: 1, tip: 'Brak kasku w stanie z obowiązkiem = mandat pieniężny, możliwe zatrzymanie motocykla.' },
    { q: 'Które warunki pogodowe są NAJGROŹNIEJSZE dla motocyklisty?', options: ['Upał powyżej 95°F (35°C)', 'Pierwsze godziny lekkiego deszczu po długiej suszy', 'Wiatr boczny powyżej 15 mph', 'Mgła ograniczająca widoczność do 500 m'], answer: 1, tip: 'Pierwsze krople deszczu mieszają się z olejem na asfalcie — nawierzchnia jest wtedy WYJĄTKOWO śliska.' },
    { q: 'Co powinieneś zrobić gdy podczas jazdy motocyklem złapiesz gumę (defekt opony)?', options: ['Gwałtownie zahamować obu hamulcami', 'Trzymać mocno kierownicę, powoli zdejmować nogę z gazu, delikatnie hamować nieuszkodzoną oponą', 'Przyspieszyć i zjechać na pobocze', 'Natychmiast nacisnąć hamulec awaryjny'], answer: 1, tip: 'Defekt na motocyklu: trzymaj kierownicę, zwalniaj powoli, nie hamuj gwałtownie — możesz stracić kontrolę.' },
  ],

  // ── B — Samochód osobowy ─────────────────────────────────────────────────
  B: [
    { q: 'Kto jest zobowiązany do zapięcia pasów bezpieczeństwa w samochodzie w USA?', options: ['Tylko kierowca', 'Kierowca i pasażer z przodu', 'Wszyscy pasażerowie (przepisy stanowe mogą się różnić)', 'Pasy są wymagane tylko na autostradach'], answer: 2, tip: 'Federalne i stanowe przepisy: pasy obowiązkowe dla wszystkich. Mandaty grożą kierowcy.' },
    { q: 'Kiedy dziecko może przesiąść się z fotelika z uprzężą do booster seat (podkładki)?', options: ['Po ukończeniu 1 roku', 'Gdy waży powyżej 20 lb i skończy 1 rok', 'Gdy przekroczy limit wagi/wzrostu fotelika z uprzężą (zwykle 40–65 lb)', 'Po ukończeniu 3 lat'], answer: 2, tip: 'Fotelik z uprzężą → booster: gdy dziecko wyrośnie z fotelika (waga/wzrost). Nie wcześniej!' },
    { q: 'Jak sprawdzić martwe punkty (blind spots) przed zmianą pasa?', options: ['Tylko przez lusterka boczne', 'Sprawdź lusterka, włącz kierunkowskaz, obejrzyj się przez ramię w stronę martwego punktu', 'Tylko przez lusterko wsteczne', 'Wystarczy włączyć kierunkowskaz'], answer: 1, tip: 'Zmiana pasa: lusterka → sygnał → spojrzenie przez ramię. Nie pomijaj żadnego kroku!' },
    { q: 'Kiedy wolno wykonać zawrócenie (U-turn)?', options: ['Zawsze, gdy droga jest wolna', 'Nigdy na drodze miejskiej', 'Gdy nie jest zakazane znakiem i można to zrobić bezpiecznie bez utrudnienia ruchu', 'Tylko na skrzyżowaniach z sygnalizacją'], answer: 2, tip: 'U-turn: legalny gdy brak zakazu i bezpieczny. W wielu stanach zakazany w centrum miast.' },
    { q: 'Co powinieneś zrobić gdy zawiodą ci hamulce podczas jazdy?', options: ['Gwałtownie obrócić kierownicę', 'Włączyć wsteczny bieg', 'Pompować hamulec, zmienić na niższy bieg, użyć hamulca awaryjnego', 'Wyłączyć silnik kluczykiem'], answer: 2, tip: 'Awaria hamulców: pompuj pedał, redukcja biegów (silnik hamuje), hamulec awaryjny płynnie.' },
    { q: 'Co jest zabronione w większości US stanów podczas prowadzenia pojazdu?', options: ['Słuchanie radia', 'Trzymanie telefonu i rozmowa/pisanie bez zestawu głośnomówiącego', 'Jedzenie podczas jazdy', 'Jazda z klimatyzacją'], answer: 1, tip: 'Distracted driving: telefon w ręku podczas jazdy = wykroczenie. Hands-free = dozwolone w większości stanów.' },
    { q: 'Ile cali głębokości bieżnika opony jest minimalnym wymaganiem w USA?', options: ['4/32 cala', '3/32 cala', '2/32 cala', '1/32 cala'], answer: 2, tip: 'Minimum: 2/32 cala (ok. 1,6 mm). Poniżej tego opona jest nielegalna i niebezpieczna.' },
    { q: 'Jaki jest typowy limit prędkości w alei (alley) lub na parkingu?', options: ['25 mph', '20 mph', '15 mph', '10 mph'], answer: 2, tip: 'Aleje i parkingi: 15 mph (ok. 24 km/h). Wolno — dużo pieszych i wychodzących zza rogów.' },
    { q: 'W jakiej kolejności sprawdzasz pasy ruchu przed zjazdem z autostrady?', options: ['Prawe lusterko → kierunkowskaz → martwy punkt przez ramię', 'Tylko lusterko wsteczne', 'Martwy punkt → lusterko → kierunkowskaz', 'Kierunkowskaz → pełne zatrzymanie → zmiana pasa'], answer: 0, tip: 'Zjazd: lusterko wsteczne + prawe → kierunkowskaz → spojrzenie przez ramię (martwy punkt).' },
    { q: 'Gdzie NIE wolno parkować samochodu osobowego?', options: ['Na płatnym parkingu po uiszczeniu opłaty', 'Przed wjazdem do garażu innej osoby (driveway)', 'W strefie płatnego parkowania z aktywnym parkomtrem', 'W wyznaczonej strefie parkowania przy metrze'], answer: 1, tip: 'Zakaz: przed cudzym wjazdem, przy hydrancie (15 ft), przy przejściu dla pieszych, w strefie zakazu.' },
  ],

  // ── C — Pojazdy ciężarowe ────────────────────────────────────────────────
  C: [
    { q: 'Jaka jest maksymalna dopuszczalna masa całkowita (GVWR) ciężarówki na autostradzie federalnej USA?', options: ['60 000 lb (27 215 kg)', '70 000 lb (31 750 kg)', '80 000 lb (36 287 kg)', '90 000 lb (40 823 kg)'], answer: 2, tip: 'Federal limit: 80,000 lbs (36,287 kg). Przekroczenie = wysoka kara i zakaz dalszej jazdy.' },
    { q: 'Co oznaczają "No-Zones" dla dużych ciężarówek?', options: ['Strefy zakazu wjazdu dla ciężarówek', 'Martwe punkty (blind spots) wokół ciężarówki, gdzie inne pojazdy nie są widoczne', 'Strefy zakazu postoju', 'Specjalne pasy dla pojazdów ciężkich'], answer: 1, tip: 'No-Zones = martwe punkty: przed ciągnikiem, za naczepą, po obu bokach. Unikaj tych stref!' },
    { q: 'Jaka jest bezpieczna odległość hamowania w pełni załadowanej ciężarówki jadącej 55 mph?', options: ['Około 100 stóp (30 m)', 'Około 200 stóp (60 m)', 'Około 400 stóp (120 m)', 'Około 600 stóp (180 m)'], answer: 2, tip: 'Załadowana ciężarówka w 55 mph potrzebuje ok. 400 stóp (120 m) do zatrzymania — 40% więcej niż auto!' },
    { q: 'Co kierowca ciężarówki powinien zrobić przed zjazdem ze stromego stoku (steep downgrade)?', options: ['Przyspieszyć na szczycie, żeby mieć impet', 'Nacisnąć mocno hamulec i utrzymywać', 'Wybrać odpowiedni niższy bieg PRZED zjazdem, nie na nim', 'Wyłączyć silnik dla zmniejszenia oporu'], answer: 2, tip: 'Steep downgrade: wybierz niższy bieg PRZED zjazdem. Hamulce + silnik = kontrola. Nie "na gorąco"!' },
    { q: 'Czym jest CDL (Commercial Driver\'s License)?', options: ['Certyfikat bezpiecznej jazdy dla wszystkich kierowców', 'Prawo jazdy wymagane do kierowania pojazdami komercyjnymi powyżej 26 000 lb GVWR', 'Specjalny kurs dla kierowców tirów', 'Licencja na przewóz towarów niebezpiecznych'], answer: 1, tip: 'CDL wymagany dla: pojazdów >26,001 lb GVWR, autobusy >15 pasażerów, pojazdy z materiałami niebezpiecznymi.' },
    { q: 'Jak często kierowca ciężarówki musi przeprowadzać pre-trip inspection?', options: ['Raz w tygodniu', 'Raz dziennie', 'Przed każdym wyjazdem', 'Co 500 mil'], answer: 2, tip: 'Pre-trip inspection: OBOWIĄZKOWA przed każdym wyjazdem. Prawo federalne FMCSA wymaga dokumentacji.' },
    { q: 'Kiedy jest NAJGROŹNIEJSZE wyprzedzanie ciężarówki przez auto osobowe?', options: ['W tunelu', 'Na wiadukcie', 'Podczas silnego bocznego wiatru — ciężarówka może gwałtownie zmienić tor', 'W nocy z włączonymi długimi światłami'], answer: 2, tip: 'Silny wiatr boczny może zepchnąć ciągnik z naczepą na sąsiedni pas. Wyprzedzaj ostrożnie lub poczekaj.' },
    { q: 'Co kierowca ciężarówki musi zrobić przy każdym przejeździe kolejowym?', options: ['Zwolnić do 15 mph', 'Zatrzymać się, jeśli nie widzi pociągu', 'Zatrzymać się, otworzyć okno (lub drzwi), nasłuchiwać i upewnić się, że nie jedzie pociąg', 'Jechać normalnie — prawa ciężarówki są takie same jak auta'], answer: 2, tip: 'Ciężarówki i autobusy MUSZĄ się zatrzymać przed każdym przejazdem kolejowym — zawsze, bez wyjątku.' },
    { q: 'Co powinieneś zrobić gdy w ciężarówce pęknie opona (blow-out)?', options: ['Gwałtownie wcisnąć hamulce i zjechać w prawo', 'Trzymać kierownicę mocno, zdjąć nogę z gazu, pozwolić zwolnić samochodowi — nie hamować gwałtownie', 'Natychmiast skręcić w prawo na pobocze', 'Zaciągnąć hamulec ręczny'], answer: 1, tip: 'Blow-out: nie panikuj, trzymaj kierownicę, zdejmij nogę z gazu. Gwałtowne hamowanie = utrata kontroli nad naczepą.' },
    { q: 'Co to jest "jake brake" (engine brake) i kiedy jest zakazany?', options: ['Specjalny rodzaj hamulca dla mokrych nawierzchni', 'Silnikowy hamulec kompresyjny — zakazany na obszarach zabudowanych ze względu na hałas', 'Hamulec pneumatyczny naczepy', 'Hamulec awaryjny aktywowany manualnie'], answer: 1, tip: 'Jake brake (engine retarder): skuteczny na zjazdach, ale bardzo głośny. Wiele miast go zakazuje w granicach.' },
  ],

  // ── D — Autobus ──────────────────────────────────────────────────────────
  D: [
    { q: 'Co musi zrobić kierowca szkolnego autobusu na każdym przejeździe kolejowym?', options: ['Zwolnić do 15 mph i jechać ostrożnie', 'Zatrzymać się na 15–50 stóp przed torami, otworzyć drzwi, nasłuchiwać i upewnić się, że pociąg nie jedzie', 'Zatrzymać się tylko gdy widzą nadjeżdżający pociąg', 'Zatrzymać się wyłącznie w nocy'], answer: 1, tip: 'Szkolny autobus ZAWSZE zatrzymuje się przed torami (15–50 ft). Drzwi otwarte = słuchanie. Obowiązkowe.' },
    { q: 'Kiedy kierowca szkolnego autobusu musi włączyć żółte (amber) migające lampki?', options: ['Tylko gdy dzieci wychodzą na jezdnię', 'Gdy zatrzymuje się w nagłym wypadku', 'Co najmniej 100–300 stóp przed planowanym zatrzymaniem w celu załadunku/wysiadania', 'Zawsze podczas jazdy po mieście'], answer: 2, tip: 'Amber lights: ostrzeżenie dla ruchu, że autobus ZARAZ się zatrzyma. Minimum 100–300 ft przed stopem.' },
    { q: 'Co kierowca autobusu musi sprawdzić po każdym kursie?', options: ['Poziom paliwa i oleju', 'Stan opon', 'Wnętrze pojazdu pod kątem pozostawionych dzieci i przedmiotów', 'Dokumentację pasażerów'], answer: 2, tip: 'Post-trip inspection autobusu szkolnego: przejdź przez cały autobus! Dzieci mogą zasnąć w środku.' },
    { q: 'Jaki jest "8-light system" szkolnego autobusu?', options: ['8 reflektorów z przodu dla jazdy nocnej', 'Zestaw 4 żółtych i 4 czerwonych lampek sygnalizujących fazy załadunku/wysiadania', 'System awaryjnego oświetlenia przy awarii silnika', '8 świateł pozycyjnych wokół nadwozia'], answer: 1, tip: '8-light system: 4 żółte (ostrzeżenie — za chwilę stop) + 4 czerwone (stop! dzieci wsiadają/wysiadają).' },
    { q: 'Co kierowca autobusu musi zrobić gdy złapie defekt opony podczas jazdy?', options: ['Natychmiast zatrzymać autobus gdzie stoi', 'Kontrolować kierownicę, zwalniać powoli, zjechać bezpiecznie na pobocze daleko od ruchu', 'Gwałtownie zahamować i otworzyć drzwi', 'Kontynuować jazdę do najbliższego przystanku'], answer: 1, tip: 'Defekt opony: trzymaj kierownicę, zwalniaj płynnie, jedź do bezpiecznego miejsca — nie zatrzymuj na pasie ruchu.' },
    { q: 'Kiedy kierowca autobusu może odmówić pasażerowi wjazdu?', options: ['Nigdy — autobus musi zabrać każdego', 'Gdy pasażer jest pod wpływem alkoholu i stwarza zagrożenie', 'Gdy autobus jedzie opóźniony', 'Gdy pasażer nie ma biletu'], answer: 1, tip: 'Prawo przewoźnika: odmowa zabrania osoby agresywnej lub pod wpływem środków odurzających — dla bezpieczeństwa.' },
    { q: 'Jak często kierowca autobusu musi przeprowadzać pre-trip inspection?', options: ['Co tydzień', 'Co miesiąc', 'Przed każdym wyjazdem', 'Wystarczy raz na tydzień przy normalnej eksploatacji'], answer: 2, tip: 'Pre-trip: OBOWIĄZKOWO przed każdym wyjazdem. Hamulce, oświetlenie, opony, układ kierowniczy i więcej.' },
    { q: 'Co kierowca autobusu musi zrobić gdy w autobusie wybuchnie pożar?', options: ['Jechać do najbliższej remizy', 'Otworzyć okna i kontynuować jazdę do bezpiecznego miejsca', 'Natychmiast ewakuować wszystkich pasażerów z dala od pojazdu', 'Ugasić ogień gaśnicą przed ewakuacją'], answer: 2, tip: 'Pożar w autobusie: natychmiastowa ewakuacja wszystkich! Bezpieczeństwo pasażerów > sprzęt.' },
    { q: 'Jaka jest właściwa procedura gdy pasażer autobusu mdleje?', options: ['Kontynuować jazdę do najbliższego szpitala', 'Natychmiast zatrzymać autobus w bezpiecznym miejscu, wezwać pomoc (911), udzielić pierwszej pomocy', 'Otworzyć okna i kontynuować trasę', 'Wysadzić pasażera na najbliższym przystanku'], answer: 1, tip: 'Pasażer nieprzytomny: stop, 911, pierwsza pomoc. Nie jedź dalej — liczy się życie, nie rozkład.' },
    { q: 'Co to jest "clearance" i dlaczego jest ważne dla kierowcy autobusu?', options: ['Dokument zezwalający na jazdę autobusem w nocy', 'Minimalna wysokość tunelu/mostu — autobus musi znać swoją wysokość i sprawdzać clearance', 'Odległość między autobusami na pętli', 'Termin przeglądu technicznego'], answer: 1, tip: 'Clearance = prześwit pionowy. Autobusy są wysokie! Sprawdź znaki na tunelach i mostach przed wjazdem.' },
  ],
};

// Dla kategorii, które są "podkategoriami" motocyklowymi
CATEGORY_QUESTIONS.A1 = CATEGORY_QUESTIONS.AM;
CATEGORY_QUESTIONS.A2 = CATEGORY_QUESTIONS.AM;
CATEGORY_QUESTIONS.A  = CATEGORY_QUESTIONS.AM;

// ─────────────────────────────────────────────────────────────────────────────
//  KOLORY EMBEDÓW
// ─────────────────────────────────────────────────────────────────────────────
const KATEGORIA_COLORS = {
  AM: 0x6B7280, A1: 0xF59E0B, A2: 0xF97316, A: 0xEF4444,
  B: 0x3B82F6,  C: 0x8B5CF6, D: 0x10B981,
};

const KATEGORIA_LABELS = {
  AM: 'AM — Motorower',    A1: 'A1 — Motocykl 125 cm³',
  A2: 'A2 — Motocykl 35 kW', A: 'A — Motocykl pełny',
  B: 'B — Samochód osobowy', C: 'C — Pojazd ciężarowy',
  D: 'D — Autobus',
};

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getExamQuestions(kategoria) {
  const general  = shuffle(GENERAL_QUESTIONS).slice(0, GENERAL_DRAW);
  const specific = shuffle(CATEGORY_QUESTIONS[kategoria] || CATEGORY_QUESTIONS.B).slice(0, SPECIFIC_DRAW);
  return shuffle([...general, ...specific]);
}

function buildQuestionEmbed(idx, question, score, kategoria) {
  const letters = ['A', 'B', 'C', 'D'];
  const opts = question.options.map((o, i) => `${letters[i]}. ${o}`).join('\n');
  const color = KATEGORIA_COLORS[kategoria] || 0x5865F2;
  const label = KATEGORIA_LABELS[kategoria] || kategoria;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`🚗 Egzamin Kat. ${kategoria} — Pytanie ${idx + 1}/${TOTAL_Q}`)
    .setDescription(`**${question.q}**\n\n${opts}`)
    .setFooter({
      text: `Wynik: ${score}/${idx} • Próg zaliczenia: ${PASS_SCORE}/${TOTAL_Q} • ${label} • AURORA Greenville RP`,
    })
    .setTimestamp();
}

function buildAnswerButtons(idx, kategoria) {
  const letters = ['A', 'B', 'C', 'D'];
  const buttons = letters.map(l =>
    new ButtonBuilder()
      .setCustomId(`driveexam_${l}_${idx}_${kategoria}`)
      .setLabel(l)
      .setStyle(ButtonStyle.Secondary)
  );
  return new ActionRowBuilder().addComponents(buttons);
}

// ─────────────────────────────────────────────────────────────────────────────
//  START EGZAMINU
// ─────────────────────────────────────────────────────────────────────────────
async function startDrivingExam(interaction, client, prisma, dbUser, kategoria) {
  const userId    = interaction.user.id;
  const sessionId = `${userId}_${kategoria}`;

  // Sprawdź cooldown w DB
  const cooldownField = `examCooldown_${kategoria}`;
  const lastAttempt   = dbUser[`licenseExamLastAttempt`] ?? null;
  const lastKat       = dbUser[`licenseExamLastKategoria`] ?? null;

  if (lastAttempt && lastKat === kategoria) {
    const elapsed    = Date.now() - new Date(lastAttempt).getTime();
    const cooldownMs = COOLDOWN_H * 3600 * 1000;
    if (elapsed < cooldownMs) {
      const next = Math.floor((new Date(lastAttempt).getTime() + cooldownMs) / 1000);
      const reply = {
        embeds: [
          new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('⏳ Cooldown egzaminu')
            .setDescription(
              `Nie zdałeś/aś egzaminu na prawo jazdy **kat. ${kategoria}**.\n` +
              `Możesz podejść ponownie <t:${next}:R>.\n\n` +
              `💡 Wykorzystaj ten czas na powtórzenie przepisów ruchu drogowego!`
            )
        ],
        ephemeral: true,
      };
      if (interaction.deferred && !interaction.replied) {
        return interaction.editReply(reply).catch(() => {});
      } else if (interaction.replied) {
        return interaction.followUp(reply).catch(() => {});
      }
      return interaction.reply(reply).catch(() => {});
    }
  }

  // Zaktualizuj datę ostatniej próby i kategorię w DB
  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      licenseExamLastAttempt:  new Date(),
      licenseExamLastKategoria: kategoria,
    },
  }).catch(e => logger.warn('Błąd aktualizacji cooldown egzaminu:', e.message));

  // Inicjalizuj sesję
  const questions = getExamQuestions(kategoria);
  examSessions.set(sessionId, {
    questionIndex: 0,
    score:         0,
    questions,
    startTime:     Date.now(),
    dbUserId:      dbUser.id,
    guildId:       interaction.guildId,
    kategoria,
  });

  const embed = buildQuestionEmbed(0, questions[0], 0, kategoria);
  const row   = buildAnswerButtons(0, kategoria);

  const introEmbed = new EmbedBuilder()
    .setColor(KATEGORIA_COLORS[kategoria] || 0x5865F2)
    .setTitle(`🚗 Egzamin Teoretyczny — Kat. ${kategoria}`)
    .setDescription(
      `**${KATEGORIA_LABELS[kategoria] || kategoria}**\n\n` +
      `Egzamin składa się z **${TOTAL_Q} pytań** z przepisów ruchu drogowego USA.\n` +
      `Próg zaliczenia: **${PASS_SCORE}/${TOTAL_Q} (${Math.round(PASS_SCORE / TOTAL_Q * 100)}%)** poprawnych odpowiedzi.\n` +
      `Czas: bez limitu — ale bez wracania do poprzednich pytań.\n\n` +
      `🏁 **Powodzenia!**`
    )
    .setFooter({ text: 'AURORA Greenville RP — Urząd Komunikacji' });

  const reply = { embeds: [introEmbed, embed], components: [row], ephemeral: true };
  if (interaction.deferred && !interaction.replied) {
    await interaction.editReply(reply).catch(() => {});
  } else if (interaction.replied) {
    await interaction.followUp(reply).catch(() => {});
  } else {
    await interaction.reply(reply).catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  OBSŁUGA ODPOWIEDZI
// ─────────────────────────────────────────────────────────────────────────────
// customId: driveexam_A_0_B
async function handleDrivingExamAnswer(interaction, client, prisma) {
  const parts     = interaction.customId.split('_');
  const letter    = parts[1];              // A/B/C/D
  const expIndex  = parseInt(parts[2], 10);
  const kategoria = parts[3];             // AM/A1/A2/A/B/C/D
  const userId    = interaction.user.id;
  const sessionId = `${userId}_${kategoria}`;

  const session = examSessions.get(sessionId);
  if (!session) {
    return interaction.reply({
      content: '❌ Sesja egzaminu wygasła. Wybierz kategorię ponownie na kanale **#prawo-jazdy**.',
      ephemeral: true,
    }).catch(() => {});
  }

  // Zabezpieczenie przed zdublowanymi kliknięciami
  if (session.questionIndex !== expIndex) {
    return interaction.deferUpdate().catch(() => {});
  }

  await interaction.deferUpdate().catch(() => {});

  const letters    = ['A', 'B', 'C', 'D'];
  const answerIdx  = letters.indexOf(letter);
  const question   = session.questions[expIndex];
  const isCorrect  = answerIdx === question.answer;

  if (isCorrect) session.score++;
  session.questionIndex++;

  if (session.questionIndex < TOTAL_Q) {
    const nextQ   = session.questions[session.questionIndex];
    const qEmbed  = buildQuestionEmbed(session.questionIndex, nextQ, session.score, kategoria);
    const fbEmbed = new EmbedBuilder()
      .setColor(isCorrect ? 0x57F287 : 0xED4245)
      .setDescription(
        isCorrect
          ? `✅ **Dobrze!** ${question.tip ?? ''}`
          : `❌ **Błąd.** Prawidłowa odpowiedź: **${letters[question.answer]}. ${question.options[question.answer]}**`
      );

    await interaction.editReply({
      embeds: [fbEmbed, qEmbed],
      components: [buildAnswerButtons(session.questionIndex, kategoria)],
    }).catch(() => {});

  } else {
    examSessions.delete(sessionId);
    await finishExam(interaction, client, prisma, session, isCorrect, question, letters, kategoria);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ZAKOŃCZENIE EGZAMINU
// ─────────────────────────────────────────────────────────────────────────────
async function finishExam(interaction, client, prisma, session, lastCorrect, lastQ, letters, kategoria) {
  const { score } = session;
  const passed    = score >= PASS_SCORE;
  const color     = KATEGORIA_COLORS[kategoria] || 0x5865F2;
  const label     = KATEGORIA_LABELS[kategoria] || kategoria;

  const fbEmbed = new EmbedBuilder()
    .setColor(lastCorrect ? 0x57F287 : 0xED4245)
    .setDescription(
      lastCorrect
        ? `✅ **Dobrze!** ${lastQ.tip ?? ''}`
        : `❌ **Błąd.** Prawidłowa odpowiedź: **${letters[lastQ.answer]}. ${lastQ.options[lastQ.answer]}**`
    );

  const resultEmbed = new EmbedBuilder()
    .setColor(passed ? 0x57F287 : 0xED4245)
    .setTitle(passed
      ? `🎉 Egzamin zaliczony! Prawo jazdy kat. ${kategoria}`
      : `❌ Egzamin nie zaliczony — kat. ${kategoria}`)
    .setDescription(passed
      ? `Uzyskałeś/aś **${score}/${TOTAL_Q}** punktów i zdałeś/aś egzamin teoretyczny!\n\n` +
        `🪪 Prawo jazdy **${label}** zostało automatycznie wydane.\n` +
        `Certyfikat pojawił się na kanale **#wyniki-egzaminów**.\n\n` +
        `🚗 Możesz teraz legalnie poruszać się pojazdami tej kategorii!`
      : `Uzyskałeś/aś **${score}/${TOTAL_Q}** punktów.\n\n` +
        `Wymagane minimum to **${PASS_SCORE}/${TOTAL_Q} (80%)**.\n` +
        `Możesz podejść ponownie za **${COOLDOWN_H} godzin**.\n\n` +
        `💡 Powtórz przepisy ruchu drogowego USA — skup się na znakach, pierwszeństwie i zasadach bezpieczeństwa.`
    )
    .addFields(
      { name: '📊 Wynik', value: `${score}/${TOTAL_Q} (${Math.round(score / TOTAL_Q * 100)}%)`, inline: true },
      { name: '⏱️ Czas', value: `${Math.round((Date.now() - session.startTime) / 1000)}s`, inline: true },
      { name: '🪪 Kategoria', value: label, inline: true },
    )
    .setFooter({ text: 'AURORA Greenville RP — Urząd Komunikacji' })
    .setTimestamp();

  await interaction.editReply({ embeds: [fbEmbed, resultEmbed], components: [] }).catch(() => {});

  if (passed) {
    await issueLicenseAfterExam(interaction, client, prisma, session, kategoria, score);
  } else {
    // Odnotuj nieudaną próbę w botlogu
    logger.info(`Egzamin PJ kat. ${kategoria}: ${interaction.user.tag} — ${score}/${TOTAL_Q} — NIEZALICZONY`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUTO-WYDANIE PRAWA JAZDY PO ZDANIU
// ─────────────────────────────────────────────────────────────────────────────
async function issueLicenseAfterExam(interaction, client, prisma, session, kategoria, score) {
  try {
    const guild    = client.guilds.cache.get(session.guildId) ?? await client.guilds.fetch(session.guildId);
    const member   = await guild.members.fetch(interaction.user.id);
    const dbUser   = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    if (!dbUser) return;

    // Utwórz lub reaktywuj licencję w bazie
    const existing = await prisma.license.findUnique({
      where: { userId_kategoria: { userId: dbUser.id, kategoria } },
    });

    let license;
    if (existing) {
      license = await prisma.license.update({
        where: { id: existing.id },
        data: {
          status:          'ACTIVE',
          suspendedAt:     null,
          suspendedUntil:  null,
          suspendedReason: null,
          examinatorId:    'EXAM_AUTO',
          issuedAt:        new Date(),
        },
      });
    } else {
      license = await prisma.license.create({
        data: {
          userId:      dbUser.id,
          kategoria,
          status:      'ACTIVE',
          examinatorId: 'EXAM_AUTO',
        },
      });
    }

    // Nadaj rolę @Kat. X
    const roleName = `Kat. ${kategoria}`;
    const color    = KATEGORIA_COLORS[kategoria] || 0x5865F2;
    let roleGiven  = false;

    try {
      let role = guild.roles.cache.find(r => r.name === roleName);
      if (!role) {
        role = await guild.roles.create({ name: roleName, color, reason: `Auto PJ kat. ${kategoria}` });
      }
      await member.roles.add(role, `Egzamin PJ kat. ${kategoria} — wynik ${score}/${TOTAL_Q}`);
      roleGiven = true;
    } catch (e) {
      logger.error(`Błąd nadawania roli ${roleName}:`, e.message);
    }

    // Certyfikat na #wyniki-egzaminów
    const certEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🪪 Prawo jazdy — Certyfikat zdania egzaminu')
      .setDescription('Poniższy gracz zdał **egzamin teoretyczny** i uzyskał prawo jazdy.')
      .addFields(
        { name: '👤 Kierowca',   value: `<@${interaction.user.id}> (\`${interaction.user.tag}\`)`, inline: true },
        { name: '🎮 Roblox',     value: dbUser.robloxUsername || `ID: ${dbUser.robloxId}`, inline: true },
        { name: '🪪 Kategoria',  value: `**${KATEGORIA_LABELS[kategoria] || kategoria}**`, inline: false },
        { name: '📊 Wynik',      value: `${score}/${TOTAL_Q} (${Math.round(score / TOTAL_Q * 100)}%)`, inline: true },
        { name: '📅 Data',       value: `<t:${Math.floor(Date.now() / 1000)}:D>`, inline: true },
        { name: '🏷️ Rola',      value: roleGiven ? `✅ \`${roleName}\`` : '⚠️ Nie udało się nadać roli', inline: true },
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'AURORA Greenville RP — Urząd Komunikacji' })
      .setTimestamp();

    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
    const wynikiCh = guild.channels.cache.find(
      c => c.isTextBased() && norm(c.name).includes('wyniki-egzamin')
    );
    if (wynikiCh) await wynikiCh.send({ embeds: [certEmbed] }).catch(() => {});

    // DM do gracza
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🎉 Zdałeś/aś egzamin na prawo jazdy!')
        .setDescription(
          `Gratulacje! Zdałeś/aś egzamin teoretyczny i otrzymałeś/aś prawo jazdy **${KATEGORIA_LABELS[kategoria] || kategoria}**!\n\n` +
          `Możesz teraz legalnie poruszać się pojazdami tej kategorii w **AURORA Greenville RP**. 🚗`
        )
        .addFields(
          { name: '🪪 Kategoria', value: `**${KATEGORIA_LABELS[kategoria] || kategoria}**`, inline: true },
          { name: '📊 Wynik',     value: `${score}/${TOTAL_Q}`, inline: true },
          { name: '📅 Data',      value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        )
        .setFooter({ text: 'AURORA Greenville RP — Urząd Komunikacji' })
        .setTimestamp();
      await interaction.user.send({ embeds: [dmEmbed] });
    } catch { /* DM zablokowane */ }

    logger.info(`Egzamin PJ kat. ${kategoria}: ${interaction.user.tag} — ${score}/${TOTAL_Q} — ZALICZONY`);

  } catch (e) {
    logger.error('Błąd auto-wydania PJ po egzaminie:', e.message);
  }
}

module.exports = { startDrivingExam, handleDrivingExamAnswer };
