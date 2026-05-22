// update-regulamin.js — aktualizuje regulamin w server-config.json do v6.0
const fs = require('fs');
const path = require('path');
const cfgPath = path.join(__dirname, '..', 'server-config.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

cfg.regulamin.footer = 'AURORA Greenville RP — Regulamin Serwera v6.0';

cfg.regulamin.sections = [
  {
    embed: 1,
    title: '📜 REGULAMIN SERWERA AURORA Greenville RP — v6.0',
    intro: 'Witaj w **AURORA Greenville RP** — największej polskiej społeczności RP na Roblox! Poniższy regulamin obowiązuje wszystkich użytkowników serwera Discord oraz uczestników sesji. Dołączając, potwierdzasz że zapoznałeś/aś się z każdym punktem i zobowiązujesz się ich przestrzegać.',
    fields: [
      {
        name: '§1. Zasady ogólne',
        rules: [
          'Rejestracja na serwerze jest równoznaczna z akceptacją niniejszego regulaminu oraz Warunków Korzystania z Discord.',
          'Nieznajomość zasad nie stanowi usprawiedliwienia dla ich łamania — obowiązuje każdego bez wyjątku.',
          'Staff ma prawo nałożyć karę za działania godzące w atmosferę serwera, nawet jeśli nie zostały dosłownie wymienione w regulaminie.',
          'Treść regulaminu może ulec zmianie w każdej chwili — aktualizacje publikowane są w #ogłoszenia.',
          'Administracja może wykluczyć użytkownika z serwera bez szczegółowego uzasadnienia, jeśli wymaga tego bezpieczeństwo społeczności.',
          'Serwer jest bezpłatny. Wszelkie formy wsparcia finansowego są dobrowolne i nie gwarantują przywilejów w grze.',
          'Staff nie odpowiada za problemy sprzętowe, sieciowe ani programowe po stronie gracza.',
          'Tworzenie kont zastępczych w celu obejścia bana skutkuje permanentnym banem na wszystkich kontach.',
          'Aktywność na serwerze jest automatycznie rejestrowana przez system logów bota.',
          'Odwołania od decyzji Administracji przyjmowane są wyłącznie przez system ticketów — decyzje są ostateczne.'
        ]
      }
    ]
  },
  {
    embed: 2,
    fields: [
      {
        name: '§2. Kultura komunikacji na Discordzie',
        rules: [
          'Spamowanie wiadomościami, emotkami, nalepkami i zbędnymi znakami jest zakazane.',
          'Pisanie WYŁĄCZNIE CAPS LOCKIEM jest traktowane jako agresja — skutkuje upomnieniem lub mute\'m.',
          'Zakazane jest trollowanie, prowokowanie oraz wszelkie działania wymierzone w innych użytkowników.',
          'Wyzwiska, obelgi i poniżanie innych są niedopuszczalne — grozi mute lub trwały ban.',
          'Każdy użytkownik zobowiązany jest traktować pozostałych z szacunkiem i kulturą.',
          'Promocja zewnętrznych serwerów, platform, stron i kanałów bez zgody Administracji jest zakazana.',
          'Tematy religijne, polityczne, historyczne (w tym Holokaust) oraz treści NSFW są zakazane jako temat sporu.',
          'Publikowanie materiałów pornograficznych lub drastycznych skutkuje natychmiastowym permanentnym banem.',
          'Ujawnianie prywatnych danych osobowych innych użytkowników (doxxing) jest bezwzględnie zakazane.',
          'Treści pisane na kanałach powinny odpowiadać ich tematyce — posty OT mogą zostać usunięte przez Staffa.',
          'Wzmianki @everyone i @here są zarezerwowane wyłącznie dla Administracji.',
          'Komendy bota uruchamiaj tylko na dedykowanym kanale #komendy-bota lub kanałach wskazanych przez Staff.'
        ]
      },
      {
        name: '§3. Kanały głosowe',
        rules: [
          'Na kanałach głosowych obowiązują wszystkie zasady §2.',
          'Odtwarzanie muzyki, dźwięków ani innych materiałów przez mikrofon jest zakazane.',
          'Celowe zakłócanie wypowiedzi innych uczestników jest niedopuszczalne.',
          'Nagrywanie lub streamowanie rozmów wymaga wyraźnej zgody wszystkich obecnych.',
          'Wejście na kanał głosowy danej służby bez przynależności do niej jest zakazane.'
        ]
      }
    ]
  },
  {
    embed: 3,
    fields: [
      {
        name: '§4. Słownik pojęć RP (znajomość obowiązkowa)',
        rules: [
          '**FRP (Fail Roleplay)** — odgrywanie sytuacji niemożliwych w realnym życiu lub sprzecznych z logiką fabularną.',
          '**NLR (New Life Rule)** — śmierć postaci = reset jej pamięci. Powrót w to samo miejsce przed upływem 5 minut jest zakazany.',
          '**Metagaming (MG)** — korzystanie z informacji spoza gry (Discord, stream, OOC) wewnątrz RP. Bezwzględny zakaz.',
          '**Powergaming (PG)** — wymuszanie akcji na innych graczach bez ich zgody lub odgrywanie fizycznie niemożliwych czynności.',
          '**RDM (Random Death Match)** — atakowanie lub zabijanie graczy bez żadnego uzasadnienia fabularnego.',
          '**VDM (Vehicle Death Match)** — celowe użycie pojazdu jako broni do potrącania graczy.',
          '**Combat Logging (CL)** — rozłączenie z grą podczas aktywnej akcji RP w celu uniknięcia konsekwencji. Surowy ban.',
          '**Fear RP** — postać musi odgrywać strach o życie — broń przy głowie wyklucza walkę i ucieczkę.',
          '**OOC (Out of Character)** — komunikat poza postacią, pisany w nawiasach () lub przez /b.',
          '**IC (In Character)** — działanie i mówienie w imieniu postaci podczas aktywnego RP.',
          '**Void** — unieważnienie akcji RP — prawo wyłącznie Staffu serwera.',
          '**Peacetime** — tryb ograniczonych akcji kryminalnych — szczegóły w §6.',
          '**/me** — opis wykonywanej czynności (np. /me wyjmuje dowód). Obowiązkowe przy kluczowych akcjach RP.',
          '**Hostage RP** — wzięcie zakładnika wymaga jego zgody OOC i obecności aktywnego Hosta sesji.'
        ]
      }
    ]
  },
  {
    embed: 4,
    fields: [
      {
        name: '§5. Przebieg sesji Roleplay',
        rules: [
          'Host ogłasza zasady każdej sesji przed jej startem (Peacetime, aktywne służby, limity, eventy).',
          'Udział w sesji wymaga znajomości słownika z §4 — nieznajomość nie zwalnia z odpowiedzialności.',
          'Zakaz jednoczesnego odgrywania kilku postaci w trakcie jednej sesji.',
          'Wygląd postaci, ubiór i pojazdy muszą być realistyczne i zgodne z zasadami RP.',
          'Wymagane aktywne konto Roblox z weryfikacją wiekową 13+.',
          'Pojazd można zrespawnować jedynie: przy własnym domu, na spawnie serwera, w DMV lub w miejscu pracy.',
          'Opcja "Auto Flip" musi być wyłączona przez cały czas trwania sesji.',
          'Jazda powyżej **131 mph** bez uzasadnienia fabularnego stanowi FRP.',
          'Rozmowy OOC podczas sesji prowadzimy wyłącznie w nawiasach (). Długie dyskusje OOC są zakazane.',
          'Zderzenie z prędkością powyżej **35 mph** wymaga odegrania obrażeń przez /me i wezwania EMS.',
          'Staff jedzie jasnozielonym BullHorn Prancerem, HR — pomarańczowym BullHorn Prancerem. Ucieczka przed nimi jest zakazana.',
          'Exploiting, cheaty i celowy bug abuse = permanentny ban bez możliwości odwołania.',
          'Tylko Staff może ogłosić Void — gracze nie mają tego uprawnienia.',
          'Autobusy szkolne i pojazdy pocztowe nie wymagają rejestracji w systemie pojazdów.'
        ]
      }
    ]
  },
  {
    embed: 5,
    fields: [
      {
        name: '§6. Działalność kryminalna',
        rules: [
          'Wszelkie akcje kryminalne oraz wybór teamu "Criminal" wymagają **zgody Hosta sesji** — bez niej to FRP.',
          'Napad na bank: min. **2**, maks. **3** uczestników z obowiązkowym RP Momentem przez /me.',
          'Napad na sklep: maks. **2** osoby; ten sam sklep nie może być napadnięty ponownie przez **30 minut**.',
          'Atakowanie cywilów bez fabularnego uzasadnienia (RDM) jest surowo zabronione.',
          'Zakaz brania zakładników na terenie komisariatu, szpitala oraz remizy strażackiej.',
          'Hostage RP: ofiara musi wyrazić zgodę OOC; na miejscu musi być przynajmniej jeden czynny funkcjonariusz.',
          'W pościgu może uczestniczyć maks. **3 pojazdy** po stronie uciekających; blokowanie dróg bez powodu = FRP.',
          'Ucieczka przed policją bez teamu "Heist Crew" jest dozwolona, o ile nie posiadasz aktywnego listu gończego.',
          'Peacetime 1° — całkowity zakaz akcji kryminalnych i ucieczek przed policją.',
          'Peacetime 2° — j.w. + limit FRP 70 mph + automatyczny Void wypadków + zakaz wszelkich konfrontacji.',
          'Obrót nielegalnymi dobrami w miejscach publicznych lub na widoku jest zakazany.'
        ]
      },
      {
        name: '§7. Pojazdy',
        rules: [
          'Mieszkaniec: maks. **5 pojazdów** o łącznej wartości do 90 000$ (z wyłączeniem pojazdów limitowanych).',
          'Wspierający: do **9** pojazdów wraz z dodatkowymi przywilejami.',
          'Nitro Booster: do **10** pojazdów i pełne przywileje Wspierającego.',
          'Każdy pojazd musi być zarejestrowany w #rejestracja-auta przed wyjazdem na sesję.',
          'Nierealistyczne modyfikacje zawieszenia (np. jazda na ogonie) są zakazane.',
          'Trafienie "Laser Blasterem" policji = efekt paralizatora — obowiązkowe odegranie przez /me.',
          'Po 10 mandatach, 5 grzywnach lub 5 aresztach prawo jazdy zostaje zawieszone na **30 dni** — możliwy egzamin przywracający.',
          'Pojazdy służbowe (radiowozy, karetki, wozy strażackie, lawety DOT) zarezerwowane wyłącznie dla odpowiednich służb.',
          'Fioletowy Durant Camion PPV z tablicą Admin-[numer] należy do Administracji — traktowany jak radiowóz.',
          'Zakaz nadawania "blacklist" na teren innego gracza podczas aktywnej akcji RP.'
        ]
      }
    ]
  },
  {
    embed: 6,
    fields: [
      {
        name: '§8. Służby mundurowe',
        rules: [
          'Dołączenie do służby wymaga złożenia i pozytywnego rozpatrzenia podania przez Komisję Rekrutacyjną.',
          'Podczas służby obowiązuje strój i pojazd służbowy — użycie prywatnego wymaga zgody przełożonego.',
          'Polecenia przełożonych i dowódców muszą być bezwzględnie wykonywane.',
          'Nadużycie uprawnień (bezzasadne zatrzymanie, mandat bez powodu) skutkuje postępowaniem dyscyplinarnym.',
          'Operacje specjalne (SWAT, pościg śmigłowcem, kordony) wymagają autoryzacji oficera prowadzącego.',
          'Komunikacja służbowa odbywa się wyłącznie przez system CAD lub dedykowany kanał radiowy.',
          'Nieobecność należy zgłosić przynajmniej **24 godziny** wcześniej na kanale #nieobecności.',
          'Trzecia nieusprawiedliwiona nieobecność na sesji = automatyczne usunięcie ze służby.',
          'Każde zgłoszenie w systemie CAD musi zostać obsłużone przez Policję.',
          'EMS i Straż Pożarna pełnią funkcje pomocnicze — nie angażują się w akcje zbrojne po stronie służb.',
          'DOT kontroluje ruch drogowy i egzekwuje przepisy — użycie broni wyłącznie w samoobronie.',
          'Security Guard i Park Ranger działają w wyznaczonych strefach — pościgi poza jurysdykcją są zakazane.'
        ]
      }
    ]
  },
  {
    embed: 7,
    fields: [
      {
        name: '§9. Prywatni pracodawcy — testy i regulaminy firm',
        rules: [
          'Rola **Właściciel Firmy** przyznawana jest wyłącznie przez Administrację na wniosek złożony przez system ticketów.',
          'Właściciel Firmy prowadzi własną działalność (sklep, usługi, gastronomia, edukacja itp.) w ramach świata RP.',
          'Każdy Właściciel Firmy ma prawo opracować **własny regulamin wewnętrzny** obowiązujący pracowników jego firmy.',
          'Regulamin firmy nie może być sprzeczny z §§1–8 tego regulaminu — w przypadku konfliktu obowiązują zasady serwera.',
          'Właściciel Firmy może stworzyć **własny test rekrutacyjny** dla kandydatów na stanowiska w swojej firmie.',
          'Test rekrutacyjny musi zostać zatwierdzony przez HR lub Administrację przed pierwszym użyciem.',
          'Wyniki testów i decyzje o zatrudnieniu Właściciel zgłasza Staffowi przez dedykowany kanał lub ticket.',
          'Właściciel Firmy odpowiada za zachowanie swoich pracowników wykonujących czynności w imieniu firmy.',
          'Manipulacja wynikami testów, faworyzowanie bez uzasadnienia lub dyskryminacja skutkuje odebraniem roli.',
          'Firma może zostać zawieszona lub rozwiązana przez Administrację w razie naruszenia zasad serwera.',
          'Każda aktualizacja regulaminu firmy wymaga zgłoszenia do Staffu — niezatwierdzone zmiany są nieważne.',
          'Właściciel Firmy może korzystać z kanału **#właściciele-firm** do ogłoszeń rekrutacyjnych i kontaktu z innymi pracodawcami.'
        ]
      }
    ]
  },
  {
    embed: 8,
    fields: [
      {
        name: '§10. System ekonomii RP',
        rules: [
          'Każdy Mieszkaniec dysponuje **portfelem** (gotówka) oraz **kontem bankowym** (przelewy, automatyczne potrącenia).',
          'Wynagrodzenia naliczane są automatycznie zgodnie ze stawką danego stanowiska.',
          'Mandaty i grzywny sądowe potrącane są automatycznie z konta bankowego.',
          'Kaucja za zwolnienie z aresztu pobierana jest automatycznie.',
          'Transakcje między graczami (sprzedaż, usługi, wynajem) należy odgrywać przez /me z podaniem kwoty.',
          'Korumpowanie funkcjonariuszy policji jest FRP — kara dotyczy obu stron transakcji.',
          'Bug abuse w celu pomnożenia środków = permanentny ban.',
          'Majątek postaci powinien wynikać z jej historii RP i wykonywanej pracy.',
          'Wypłata i przelew bankowy możliwe przez komendy /portfel i /przelew.'
        ]
      },
      {
        name: '§11. Kary i sankcje Discord',
        rules: [
          'Standardowa ścieżka kar: **Upomnienie → Mute → Kick → Ban czasowy → Ban permanentny**.',
          'Poważne naruszenia (exploit, VDM, Combat Logging) = natychmiastowy ban bez ostrzeżenia.',
          '**3 aktywne ostrzeżenia** → automatyczny mute na 1 godzinę.',
          '**5 aktywnych ostrzeżeń** → automatyczny ban o czasie określonym przez Administratora.',
          'Kary RP: mandat (maks. 5 000$), grzywna sądowa (maks. 50 000$), areszt (maks. 24h RP), zawieszenie PJ (30 dni).',
          'Odwołania od kar rozpatrywane są wyłącznie przez ticket w kategorii "Odwołanie od kary".',
          'Recydywa w ciągu 30 dni od poprzedniej kary skutkuje podwojonym wymiarem sankcji.',
          'Składanie fałszywych zgłoszeń przez ticket jest karane.',
          'Komentowanie decyzji Administracji na kanałach ogólnych jest zakazane — wyłącznie przez ticket.'
        ]
      }
    ]
  },
  {
    embed: 9,
    fields: [
      {
        name: '§12. Postanowienia końcowe',
        rules: [
          'Regulamin v6.0 wchodzi w życie z chwilą publikacji i zastępuje wszystkie wcześniejsze wersje.',
          'Administracja zastrzega sobie prawo do modyfikacji regulaminu w dowolnym czasie.',
          'Wszelkie znaczące zmiany ogłaszane są w #ogłoszenia z wyprzedzeniem minimum 24 godzin.',
          'Uwagi i propozycje zmian kieruj przez #sugestie lub system ticketów.',
          'Kwestie nieuwzględnione w regulaminie rozstrzyga Administracja kierując się zasadami fair play.',
          'Niniejszy regulamin stanowi wewnętrzne zasady wspólnoty Discord i nie ma charakteru prawnie wiążącego.',
          'Dziękujemy za przeczytanie regulaminu — miłej zabawy w **AURORA Greenville RP**! 🏙️'
        ]
      }
    ]
  }
];

fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
console.log('Zaktualizowano regulamin do v6.0 — ' + cfg.regulamin.sections.length + ' sekcji');
cfg.regulamin.sections.forEach(s => {
  const names = (s.fields || []).map(f => f.name).join(', ');
  console.log(`  embed ${s.embed}: ${names}`);
});
