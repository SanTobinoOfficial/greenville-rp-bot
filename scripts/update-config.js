// Script to update server-config.json with comprehensive regulamin + quiz
// Run: node scripts/update-config.js

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'server-config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// ====== COMPREHENSIVE REGULAMIN (11 paragraphs, 8 embeds) ======
config.regulamin = {
  channel: '❗│regulamin',
  color: '#E74C3C',
  footer: 'AURORA Greenville RP — Regulamin Serwera v5.0',
  sections: [
    {
      embed: 1,
      title: '📜 REGULAMIN SERWERA AURORA Greenville RP — v5.0',
      intro: 'Witaj na serwerze **AURORA Greenville RP**! Zapoznaj się z regulaminem przed rozpoczęciem rozgrywki. Dołączając do serwera akceptujesz **wszystkie** poniższe zasady bez wyjątku.',
      fields: [
        {
          name: '§1. Postanowienia ogólne',
          rules: [
            'Wchodząc na serwer akceptujesz niniejszy regulamin oraz regulamin Discord ToS.',
            'Nieznajomość regulaminu nie zwalnia z obowiązku jego przestrzegania.',
            'Administracja ma prawo ukarać za zachowania sprzeczne z duchem serwera, nawet jeśli nie są tu wprost wymienione.',
            'Administracja zastrzega sobie prawo do modyfikacji regulaminu — zmiany ogłaszane są na #ogłoszenia.',
            'Administracja może zbanować użytkownika bez podania przyczyny w uzasadnionych przypadkach.',
            'Korzystanie z serwera jest całkowicie darmowe. Wszelkie wsparcie finansowe ma charakter dobrowolny.',
            'Administracja nie ponosi odpowiedzialności za problemy techniczne po stronie graczy.',
            'Zakaz tworzenia kont zastępczych (ban evasion) — permanentny ban.',
            'Wszystkie działania na serwerze podlegają monitorowaniu przez system logów bota.',
            'Decyzje Administracji są ostateczne. Odwołania wyłącznie przez system ticketów.'
          ]
        }
      ]
    },
    {
      embed: 2,
      fields: [
        {
          name: '§2. Zasady komunikacji na Discordzie',
          rules: [
            'Zakaz spamowania wiadomości, znaków, emoji i naklejek.',
            'Zakaz pisania CAPS LOCKIEM — traktowane jako zachowanie agresywne.',
            'Zakaz prowokowania, trollowania i zachowań antyspołecznych.',
            'Zakaz używania wulgaryzmów i obraźliwych słów pod adresem innych — mute lub ban.',
            'Wszyscy użytkownicy zobowiązani są do wzajemnego szacunku i kultury wypowiedzi.',
            'Zakaz reklamy innych serwerów Discord, stron, kanałów YouTube bez zgody administracji.',
            'Zakaz poruszania tematów religijnych, politycznych, Holokaustu, treści NSFW jako tematu kłótni.',
            'Zakaz udostępniania treści pornograficznych lub graficznych — natychmiastowy permanentny ban.',
            'Zakaz doxxowania (udostępniania danych osobowych innych osób).',
            'Na każdym kanale obowiązuje jego tematyka — OT może być usunięte przez Staff.',
            'Zakaz oznaczania @everyone / @here bez pozwolenia Administracji.',
            'Komendy bota używaj wyłącznie na wyznaczonych kanałach (np. #komendy-bota).'
          ]
        },
        {
          name: '§3. Zasady kanałów głosowych',
          rules: [
            'Wszystkie zasady §2 obowiązują na kanałach głosowych.',
            'Zakaz odtwarzania głośnej muzyki lub dźwięków przez mikrofon.',
            'Zakaz celowego zagłuszania innych uczestników.',
            'Zakaz nagrywania lub streamowania rozmów bez zgody wszystkich uczestników.',
            'Zakaz wchodzenia na kanały służbowe bez przynależności do danej służby.'
          ]
        }
      ]
    },
    {
      embed: 3,
      fields: [
        {
          name: '§4. Słownik pojęć Roleplay (znajomość obowiązkowa)',
          rules: [
            '**FRP (Fail Roleplay)** — zachowanie niezgodne z realizmem, niemożliwe w prawdziwym życiu.',
            '**NLR (New Life Rule)** — po śmierci postaci zapominasz WSZYSTKO z poprzedniego życia. Zakaz powrotu w to samo miejsce przez 5 minut.',
            '**Metagaming (MG)** — używanie informacji z poza gry (Discord, stream, OOC) w IC. Surowo zabronione.',
            '**Powergaming (PG)** — narzucanie innym graczom czynności bez ich zgody lub odgrywanie niewykonalnych akcji.',
            '**RDM (Random Death Match)** — atakowanie/zabijanie graczy bez uzasadnionego powodu fabularnego.',
            '**VDM (Vehicle Death Match)** — używanie pojazdu jako broni do potrącania graczy bez uzasadnienia RP.',
            '**Combat Logging (CL)** — wyjście z gry lub serwera podczas trwającej akcji RP celem uniknięcia konsekwencji. Surowy ban.',
            '**Fear RP** — obowiązek odgrywania strachu o życie postaci w realnie zagrażających sytuacjach (broń przy głowie = zakaz walki, zakaz ucieczki).',
            '**OOC (Out of Character)** — rozmowa poza postacią, dozwolona wyłącznie przez nawiasy () lub /b.',
            '**IC (In Character)** — rozmowa i działanie jako postać w trakcie aktywnego RP.',
            '**Void** — anulowanie akcji RP, może wykonać wyłącznie Staff serwera.',
            '**Peacetime** — tryb bez akcji kryminalnych. Szczegóły w §7.',
            '**/me** — komenda opisująca czynność postaci (np. /me wyciąga dokumenty). Obowiązkowa przy kluczowych akcjach.',
            '**Hostage RP** — akcja wzięcia zakładnika — wymaga zgody celu (OOC) i aktywnego Hosta sesji.'
          ]
        }
      ]
    },
    {
      embed: 4,
      fields: [
        {
          name: '§5. Zasady sesji Roleplay',
          rules: [
            'Przed każdą sesją Host ogłasza warunki (Peacetime level, aktywne służby, limity, ew. eventy).',
            'Obowiązuje pełna znajomość słownika pojęć z §4.',
            'Zakaz odgrywania dwóch postaci jednocześnie na jednej sesji.',
            'Ubiór i pojazdy muszą wyglądać realistycznie — kolor, felgi, modyfikacje w normach RP.',
            'Wymagane konto Roblox z weryfikacją wiekową 13+.',
            'Pojazdy respawnujemy wyłącznie: obok własnego domu, na spawnie serwera, w DMV lub miejscu pracy.',
            '"Auto Flip" w ustawieniach gry musi być WYŁĄCZONY przez cały czas trwania sesji.',
            'Prędkość FRP wynosi **131 mph** — jazda powyżej bez uzasadnienia fabularnego = FRP.',
            'OOC na czacie piszemy w nawiasach: (tekst). Zakaz długich rozmów OOC podczas sesji.',
            'Wypadek powyżej **35 mph** → obowiązek odgrywania obrażeń przez /me i wezwania EMS.',
            'Staff w jasnozielonym BullHorn Prancer i HR w pomarańczowym BullHorn Prancer — zakaz ucieczki przed tymi pojazdami.',
            'Exploiting, cheating, bug abuse → permanentny ban bez ostrzeżenia i bez możliwości odwołania.',
            'Akcje RP może Voidować wyłącznie Staff serwera — gracze nie mają tej możliwości.',
            'Autobusy szkolne i pojazdy poczty nie wymagają rejestracji w systemie.'
          ]
        }
      ]
    },
    {
      embed: 5,
      fields: [
        {
          name: '§6. Zasady działalności kryminalnej',
          rules: [
            'Team "Criminal" i akcje napadów wymagają **uprzedniej zgody Hosta sesji** — bez zgody = FRP.',
            'Napad na bank: minimum **2**, maksimum **3** osoby. Obowiązkowy RP Moment przez /me.',
            'Napad na sklep: maksimum **2** osoby. Zakaz napadu na ten sam sklep 2× w ciągu 30 minut.',
            'Zakaz strzelania do cywilów bez uzasadnienia fabularnego (RDM).',
            'Zakaz brania zakładników z terenu komisariatu policji, szpitala i remizy straży.',
            'Hostage RP: cel musi wyrazić zgodę OOC. Minimum 1 aktywny funkcjonariusz na miejscu zdarzenia.',
            'Pościg: maksimum 3 pojazdy uciekające. Zakaz blokowania korytarzy i tunelów bez odgrywanego powodu.',
            'Ucieczka przed policją bez teamu "Heist Crew" dozwolona — jeśli nie posiadasz aktywnego listu gończego.',
            'Peacetime 1° — zakaz WSZELKICH akcji kryminalnych i ucieczek przed policją.',
            'Peacetime 2° — j.w. + limit FRP 70 mph + Void wypadków + zakaz wszelkich konfrontacji.',
            'Zakaz sprzedaży nielegalnych przedmiotów w miejscach publicznych lub na widoku NPC.'
          ]
        },
        {
          name: '§7. Zasady dotyczące pojazdów',
          rules: [
            'Mieszkaniec: maks. **5 pojazdów** (łącznie wartość do 90 000$). Nie dotyczy pojazdów limitowanych i kolekcjonerskich.',
            'Wspierający: do **9** zarejestrowanych pojazdów + przywileje.',
            'Booster Discord Nitro: do **10** pojazdów + wszystkie przywileje Wspierających.',
            'Rejestracja obowiązkowa na kanale #rejestracja-auta przed wyjazdem w ruch uliczny.',
            'Zakaz nierealistycznego modyfikowania zawieszenia (np. jazda na ogonie).',
            '"Laser Blaster" policji = paralizator RP — obowiązek odgrywania jego efektu.',
            'Po 10 mandatach / 5 grzywnach / 5 aresztach — PJ zatrzymane na **30 dni**. Możliwy egzamin przywracający.',
            'Pojazdy służb (radiowozy, karetki, wozy strażackie, lawety DOT) dostępne WYŁĄCZNIE dla danej służby.',
            'Pojazd Administracji: fioletowy Durant Camion PPV, tablice Admin-[numer] — traktowany jak radiowóz.',
            'Zakaz nadawania "blacklist" na własny dom innym graczom w trakcie trwającej akcji RP.'
          ]
        }
      ]
    },
    {
      embed: 6,
      fields: [
        {
          name: '§8. Zasady służb mundurowych',
          rules: [
            'Do służby dołącza się wyłącznie po złożeniu i przyjęciu podania przez Komisję Rekrutacyjną.',
            'W służbie obowiązuje **mundur i pojazd służbowy** — prywatne pojazdy wymagają zgody przełożonego.',
            'Bezwzględne wykonywanie poleceń przełożonych i dowódców służby.',
            'Zakaz nadużywania uprawnień: bezzasadne zatrzymanie, mandat bez powodu = kara dla funkcjonariusza.',
            'Akcje specjalne (SWAT, pościg helikopterem, kordony) wymagają zgody oficera prowadzącego.',
            'Komunikacja służbowa wyłącznie przez system CAD lub dedykowany kanał radiowy.',
            'Obowiązek zgłoszenia nieobecności min. **24h** wcześniej przez kanał #nieobecności.',
            'Trzecia nieusprawiedliwiona nieobecność na sesji = automatyczne usunięcie ze służby.',
            'Policja ma obowiązek reagować na każde zgłoszenie zarejestrowane w systemie CAD.',
            'EMS i Straż Pożarna to służby pomocnicze — zakaz udziału w akcjach przestępczych po służbowej stronie.',
            'DOT: kontrola ruchu drogowego, egzekucja przepisów drogowych — zakaz używania broni poza samoobroną.',
            'Straż Miejska: porządek w centrum — zakaz prowadzenia pościgów poza wyznaczoną jurysdykcją.'
          ]
        }
      ]
    },
    {
      embed: 7,
      fields: [
        {
          name: '§9. System ekonomii RP',
          rules: [
            'Każdy Mieszkaniec posiada **portfel** (gotówka) oraz **konto bankowe** (przelewy, automatyczne potrącenia).',
            'Wynagrodzenie z pracy wypłacane jest automatycznie według stawki godzinowej dla danego stanowiska.',
            'Mandaty i grzywny potrącane są automatycznie z konta bankowego gracza.',
            'Kaucja za zwolnienie z aresztu pobierana jest automatycznie z konta.',
            'Transakcje między graczami (sprzedaż pojazdów, usługi) muszą być odgrywane przez /me.',
            'Przekupstwo funkcjonariuszy policji = FRP — kara dla obu stron transakcji.',
            'Zakaz farm i duplikowania środków przez bug abuse — permanentny ban.',
            'Majętność postaci powinna być proporcjonalna do jej historii RP.',
            'Przelew i wypłata z banku jest możliwa przez komendę /portfel i /przelew.'
          ]
        },
        {
          name: '§10. System kar i sankcji Discord',
          rules: [
            'Standardowa ścieżka kar: **Upomnienie → Mute → Kick → Czasowy ban → Permanentny ban**.',
            'Poważne naruszenia (exploiting, VDM, CL) → natychmiastowy ban bez ostrzeżenia.',
            '**3 aktywne warny** = automatyczny mute na 1 godzinę.',
            '**5 aktywnych warnów** = automatyczny ban (czas decyzji Administratora).',
            'Kary RP: mandat (do 5 000$), grzywna sądowa (do 50 000$), areszt (do 24h RP), zawieszenie PJ (30 dni).',
            'Odwołania od kar Discord wyłącznie przez ticket — kategoria "Odwołanie od kary".',
            'Recydywa (ponowne naruszenie w ciągu 30 dni) = podwójna kara.',
            'Fałszywe zgłoszenia ticketowe = kara dla zgłaszającego.',
            'Decyzje Administracji są ostateczne. Dyskusja o karach na kanałach ogólnych jest zabroniona.'
          ]
        }
      ]
    },
    {
      embed: 8,
      fields: [
        {
          name: '§11. Postanowienia końcowe',
          rules: [
            'Regulamin v5.0 wchodzi w życie z dniem publikacji i zastępuje wszystkie poprzednie wersje.',
            'Administracja zastrzega sobie prawo do zmiany regulaminu w dowolnym momencie.',
            'Zmiany regulaminu ogłaszane są na kanale #ogłoszenia z min. 24-godzinnym wyprzedzeniem.',
            'Sugestie dotyczące regulaminu zgłaszaj przez #sugestie lub system ticketów.',
            'W sprawach nieuregulowanych decyzję podejmuje Administracja kierując się zdrowym rozsądkiem.',
            'Niniejszy regulamin stanowi wewnętrzne zasady serwera Discord i nie ma charakteru prawnie wiążącego.',
            'Dziękujemy za przeczytanie regulaminu! Życzymy świetnej zabawy w **AURORA Greenville RP** 🏙️'
          ]
        }
      ]
    }
  ]
};

// ====== COMPREHENSIVE QUIZ (25 questions — 10 drawn at random, 8/10 to pass) ======
config.quiz = {
  pass_threshold: 8,
  total_questions: 10,
  cooldown_hours: 24,
  questions: [
    { order: 1,  question: 'Co oznacza skrót FRP?',                                          answers: ['Fail Roleplay','Fast Roleplay','Free Roleplay','Fun Roleplay'],                                              correct: 0 },
    { order: 2,  question: 'Jaka jest prędkość FRP w AURORA Greenville RP?',                 answers: ['100 mph','120 mph','131 mph','150 mph'],                                                                      correct: 2 },
    { order: 3,  question: 'Co oznacza skrót VDM?',                                          answers: ['Very Dangerous Move','Vehicle Deathmatch','Virtual Driver Mode','Violation During Mission'],                 correct: 1 },
    { order: 4,  question: 'Ile pojazdów może zarejestrować zwykły Mieszkaniec?',            answers: ['3','5','9','10'],                                                                                             correct: 1 },
    { order: 5,  question: 'Co to jest Combat Logging (CL)?',                                answers: ['Walka z innymi graczami','Wyjście z gry podczas akcji RP','Logowanie podczas walki','Zakaz broni'],         correct: 1 },
    { order: 6,  question: 'Ile mandatów prowadzi do zatrzymania prawa jazdy?',              answers: ['5','8','10','15'],                                                                                            correct: 2 },
    { order: 7,  question: 'Co oznacza komenda /me w RP?',                                   answers: ['Opis otoczenia','Opis czynności postaci','Wezwanie pomocy','Wyjście z RP'],                                  correct: 1 },
    { order: 8,  question: 'Ile osób może brać udział w napadzie na bank?',                  answers: ['1-2','2-3','3-5','Brak limitu'],                                                                              correct: 1 },
    { order: 9,  question: 'Co to jest Metagaming (MG)?',                                    answers: ['Granie na wielu serwerach','Używanie informacji OOC w IC','Omijanie zasad','Korzystanie z modów'],          correct: 1 },
    { order: 10, question: 'Podczas Peacetime 1° co jest zakazane?',                         answers: ['Jazda pojazdami','Rozmowy na czacie','Akcje Crime i ucieczka przed policją','Korzystanie z /me'],            correct: 2 },
    { order: 11, question: 'Co oznacza NLR (New Life Rule)?',                                answers: ['Zakaz gry na nowym koncie','Po śmierci zapominasz wszystko z poprzedniego życia','Nowa postać co miesiąc','Nowe zasady życia RP'], correct: 1 },
    { order: 12, question: 'Co to jest Fear RP?',                                            answers: ['Odgrywanie strachu przy zagrożeniu życia','Granie straszydła','Zakaz atakowania słabszych','System reputacji'], correct: 0 },
    { order: 13, question: 'Ile pojazdów może zarejestrować Wspierający?',                   answers: ['5','7','9','10'],                                                                                             correct: 2 },
    { order: 14, question: 'Co oznacza OOC?',                                                answers: ['Only Official Commands','Out of Character — poza postacią','Operator On Call','Online Overwrite Command'],   correct: 1 },
    { order: 15, question: 'Co to jest Void i kto może go wykonać?',                         answers: ['Teleport — każdy gracz','Anulowanie akcji RP — wyłącznie Staff','Usunięcie postaci — Admin','Restart serwera — Owner'], correct: 1 },
    { order: 16, question: 'Przy jakim wypadku obowiązuje odgrywanie obrażeń i wezwanie EMS?', answers: ['Powyżej 20 mph','Powyżej 35 mph','Powyżej 50 mph','Tylko śmiertelny wypadek'],                            correct: 1 },
    { order: 17, question: 'Co oznacza RDM?',                                                answers: ['Random Death Match','Role Damage Multiplier','Real Dynamic Mode','Roleplay Death Mode'],                     correct: 0 },
    { order: 18, question: 'Co to jest Powergaming (PG)?',                                   answers: ['Granie na max sile','Narzucanie innym akcji bez zgody lub odgrywanie niemożliwości','Używanie silnego sprzętu','Dominowanie w quizie'], correct: 1 },
    { order: 19, question: 'Ile aktywnych warnów grozi automatycznym banem?',                answers: ['3','4','5','7'],                                                                                              correct: 2 },
    { order: 20, question: 'Jaki kolor ma pojazd Staffu (BullHorn Prancer)?',               answers: ['Czerwony','Jasnozielony','Pomarańczowy','Fioletowy'],                                                        correct: 1 },
    { order: 21, question: 'Ile osób MINIMUM musi brać udział w napadzie na bank?',         answers: ['1','2','3','4'],                                                                                              correct: 1 },
    { order: 22, question: 'Co to jest IC?',                                                 answers: ['Internal Command','In Character — działanie jako postać','International Communication','Immediate Contact'],   correct: 1 },
    { order: 23, question: 'Na ile dni zawiesza się prawo jazdy po przekroczeniu limitów?',  answers: ['7 dni','14 dni','30 dni','60 dni'],                                                                           correct: 2 },
    { order: 24, question: 'Jakie konto Roblox jest wymagane do sesji?',                     answers: ['Konto z weryfikacją 13+','Konto Premium','Konto w grupie serwera','Dowolne konto'],                          correct: 0 },
    { order: 25, question: 'Jak oznaczamy rozmowę OOC na czacie IC?',                       answers: ['// tekst','*tekst*','(tekst)','[tekst]'],                                                                     correct: 2 }
  ]
};

fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
console.log('Done!');
console.log('Regulamin sections:', config.regulamin.sections.length);
console.log('Quiz questions:', config.quiz.questions.length);
