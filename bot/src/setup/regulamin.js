// Treść regulaminu Greenville RP jako embedy Discord
// Wysyłany na kanał #regulamin podczas /setup

const { EmbedBuilder } = require('discord.js');

const COLOR = 0xE74C3C;
const FOOTER = { text: 'Greenville RP — Regulamin Serwera' };

function buildRegulaminEmbeds() {
  const embeds = [];

  // ==================== EMBED 1: POSTANOWIENIA OGÓLNE ====================
  embeds.push(
    new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('📜 REGULAMIN SERWERA DISCORD — Greenville RP')
      .setDescription(
        '> Witaj na serwerze **Greenville RP**! Przed rozpoczęciem rozgrywki zapoznaj się z poniższym regulaminem.\n> Dołączając do serwera, automatycznie akceptujesz wszystkie poniższe zasady.'
      )
      .addFields({
        name: '§1. Postanowienia ogólne',
        value: [
          '**1.** Wchodząc na serwer Discord, akceptujesz niniejszy regulamin.',
          '**2.** Nieznajomość regulaminu nie zwalnia z obowiązku jego przestrzegania.',
          '**3.** Administracja ma prawo ukarać użytkownika za zachowania nieujęte w regulaminie.',
          '**4.** Administracja zastrzega sobie prawo do zbanowania użytkownika bez podania przyczyny.',
          '**5.** Na serwerze obowiązuje regulamin Discord ToS.',
          '**6.** Korzystanie z serwera jest całkowicie darmowe.',
          '**7.** Administracja nie ponosi odpowiedzialności za problemy techniczne.',
        ].join('\n'),
      })
      .setFooter(FOOTER)
      .setTimestamp()
  );

  // ==================== EMBED 2: ZASADY KANAŁÓW ====================
  embeds.push(
    new EmbedBuilder()
      .setColor(COLOR)
      .addFields(
        {
          name: '§2. Zasady kanałów tekstowych',
          value: [
            '**1.** Zakaz spamowania wiadomości.',
            '**2.** Zakaz pisania wielkimi literami (Caps Lock).',
            '**3.** Zakaz prowokowania kłótni i dyskusji negatywnie wpływających na atmosferę.',
            '**4.** Trolling i zachowania antyspołeczne są zabronione.',
            '**5.** Wszyscy użytkownicy zobowiązani są do wzajemnego szacunku.',
            '**6.** Nadmierne używanie wulgaryzmów → upomnienie, następnie ban.',
            '**7.** Reklamowanie bez zgody administracji jest zabronione.',
            '**8.** Zakaz poruszania tematów: polityka, Holocaust, LGBT itp.',
            '**9.** Treści pornograficzne/+18 → natychmiastowy ban.',
          ].join('\n'),
        },
        {
          name: '§3. Zasady kanałów głosowych',
          value: 'Wszystkie zasady kanałów tekstowych obowiązują również na kanałach głosowych.',
        }
      )
      .setFooter(FOOTER)
  );

  // ==================== EMBED 3: REGULAMIN SESJI RP ====================
  embeds.push(
    new EmbedBuilder()
      .setColor(COLOR)
      .addFields({
        name: '§4. Regulamin Sesji Roleplay',
        value: [
          '**2.1.** Obowiązek przestrzegania pojęć RP z kanału #pojęcia-rp.',
          '**2.2.** Zakaz odgrywania 2 postaci.',
          '**2.3.** Pojazdy spawnować tylko na: spawnie, własnym domu, DMV, miejscu pracy.',
          '**2.4.1.** Team "Criminal" i napady wymagają zgody Hosta sesji.',
          '**2.4.2.** Napad na bank: min. 2, maks. 3 osoby.',
          '**2.4.3.** Ucieczka przed policją bez teamu "Heist Crew" dozwolona jeśli nie jesteś poszukiwany.',
          '**2.4.4.** Obowiązek odgrywania czynności na czacie podczas napadu (/me rozwierca zamek).',
          '**2.5.** Wymagane konto Roblox 13+.',
          '**2.6.** Ubiór i pojazdy mają wyglądać realistycznie (kolor, felgi).',
          '**2.7.** "Auto Flip" w ustawieniach gry musi być wyłączony.',
          '**2.8.** Prędkość FRP wynosi **131 mph**.',
          '**2.9.1.** Obowiązek rejestracji pojazdów/przyczep na kanale #rejestracja-pojazdów.',
          '**2.9.2.** Autobusy szkolne i pojazdy poczty nie wymagają rejestracji.',
          '**2.10.** Exploiting → permanentny ban.',
        ].join('\n'),
      })
      .setFooter(FOOTER)
  );

  // ==================== EMBED 4: POJAZDY I STAFF ====================
  embeds.push(
    new EmbedBuilder()
      .setColor(COLOR)
      .addFields(
        {
          name: '§4. Regulamin Sesji RP (cd.)',
          value: [
            '**2.11.1.** Pojazd Staff: jasnozielony Dodge Charger (BullHorn Prancer), czarne tablice.',
            '**2.11.2.** Pojazd HR: pomarańczowy Dodge Charger (BullHorn Prancer), czarne tablice. Ucieczka przed tymi pojazdami jest zabroniona.',
            '**2.11.3.** Staff i HR w pojeździe służbowym nie uczestniczą w akcjach RP.',
            '**2.12.1.** 10 mandatów / 5 grzywien / 5 aresztów → prawo jazdy zatrzymane na **1 miesiąc**. Po zatrzymaniu PJ możesz jeździć przez 10 minut.',
            '**2.12.2.** Po miesiącu możliwość zdania egzaminu przywracającego uprawnienia.',
            '**2.13.** OOC na czacie piszemy w nawiasach: (Zaraz wracam). Zakaz długich konwersacji OOC.',
            '**2.14.1.** Wspierający — do 9 zarejestrowanych pojazdów + dostęp do kanałów Wspierających.',
            '**2.14.2.** Boosterzy — do 10 zarejestrowanych pojazdów + wszystkie przywileje Wspierających.',
            '**2.15.** Staff może wybrać 1 pojazd z zakazanych (za zgodą właściciela).',
            '**2.16.** Pojazdy służb przeznaczone tylko dla nich (radiowozy → policja, lawety DOT → tylko DOT).',
            '**2.17.** Akcje RP może Voidować tylko Staff.',
            '**2.18.** Zakaz nierealistycznego modyfikowania zawieszenia.',
            '**2.19.** Wypadek powyżej 35 mph → obowiązek odgrywania obrażeń i wezwania EMS.',
            '**2.20.** "Laser Blaster" policji = paralizator RP.',
            '**2.21.1.** Peacetime 1° — zakaz akcji Crime i ucieczki przed policją.',
            '**2.21.2.** Peacetime 2° — j.w. + Void wypadków + limit FRP 70 mph.',
            '**2.22.** Zakaz nadawania "blacklist" innym graczom na własny dom.',
          ].join('\n'),
        },
        {
          name: '§5. Zasady dotyczące pojazdów',
          value: [
            '**1.** Mieszkaniec może zarejestrować maks. **5 pojazdów** (łącznie do 90 000$). Nie dotyczy pojazdów limitowanych, eventowych i kolekcjonerskich.',
            '**2.** Pojazd Administracji: fioletowy Durant Camion PPV, tablice Admin-[numer]. Traktowany jak pojazd policyjny.',
            '**3.** Pojazdy można respawnować wyłącznie: obok własnego domu, na spawnie, w miejscu pracy.',
          ].join('\n'),
        }
      )
      .setFooter(FOOTER)
  );

  return embeds;
}

function buildPojeciaRpEmbed() {
  return new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('📚 Pojęcia Roleplay — Greenville RP')
    .setDescription('Znajomość poniższych pojęć jest **obowiązkowa** podczas sesji RP!')
    .addFields(
      {
        name: '📖 Pojęcia podstawowe',
        value: [
          '**FRP** (Fail Roleplay) — Nieprawidłowe odegranie lub brak odegrania akcji RP.',
          '**IC** (In Character) — Wszystko dziające się w rozgrywce roleplay.',
          '**OOC** (Out Of Character) — Wszystko poza grą, w realnym świecie.',
          '**CL** (Combat Logging) — Wyjście z gry podczas akcji RP, aby uniknąć odpowiedzialności.',
          '**VDM** (Vehicle Deathmatch) — Umyślne przejeżdżanie osób pojazdem.',
          '**RDM** (Random Deathmatch) — Strzelanie do przypadkowych osób prowadzące do BW.',
          '**PG** (Power Gaming) — Zmuszanie innych do akcji RP (np. /me bije Wojtka, a on umiera).',
          '**MG** (Meta Gaming) — Wykorzystywanie informacji z OOC w IC.',
        ].join('\n'),
      },
      {
        name: '🚗 Pojęcia drogowe',
        value: [
          '**CB** (Cop Baiting) — Prowokowanie policji bez wyraźnego powodu.',
          '**FD** (Fail Driving) — Jazda w sposób nierealistyczny.',
          '**Prędkość FRP** — **131 mph** (przekroczenie uznawane jako FRP).',
          '**Imersja** — Wczucie się w postać i otoczenie.',
          '**Nieposzanowanie życia** — Narażanie postaci na śmierć lub obrażenia.',
        ].join('\n'),
      },
      {
        name: '💬 Komendy RP',
        value: [
          '**`/me`** — Opis czynności postaci (np. /me pije wodę).',
          '**`/do`** — Opis danej chwili (np. /do widać otarcia na prawej stronie auta).',
        ].join('\n'),
      },
      {
        name: '💼 Rodzaje pracy',
        value: [
          '**Prace publiczne** — dostępne dla każdego, bez zarządcy.',
          '**Prace prywatne** — tylko po zatwierdzeniu formularza przez zarządcę.',
        ].join('\n'),
      }
    )
    .setFooter({ text: 'Greenville RP — Pojęcia RP' })
    .setTimestamp();
}

module.exports = { buildRegulaminEmbeds, buildPojeciaRpEmbed };
