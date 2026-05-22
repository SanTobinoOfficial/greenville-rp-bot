// Treść regulaminu AURORA Greenville RP jako embedy Discord
// Wysyłany na kanał #regulamin podczas /setup

const { EmbedBuilder } = require('discord.js');

const COLOR = 0xE74C3C;
const FOOTER = { text: 'AURORA Greenville RP — Regulamin Serwera' };

// URL zdjęcia pojazdu administracji — wgraj na Imgur lub Discord CDN i podmień URL:
const ADMIN_VEHICLE_IMAGE_URL = 'https://i.imgur.com/PLACEHOLDER_ADMIN_CAR.png';

function buildRegulaminEmbeds() {
  const embeds = [];

  // ==================== EMBED 1: POSTANOWIENIA OGÓLNE ====================
  embeds.push(
    new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('📜 REGULAMIN SERWERA DISCORD — AURORA Greenville RP')
      .setDescription(
        '> Witaj na serwerze **AURORA Greenville RP**! Przed rozpoczęciem rozgrywki zapoznaj się z poniższym regulaminem.\n> Dołączając do serwera, automatycznie akceptujesz wszystkie poniższe zasady.'
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
          '**2.5.** Ubiór i pojazdy mają wyglądać realistycznie (kolor, felgi).',
          '**2.6.** "Auto Flip" w ustawieniach gry musi być wyłączony.',
          '**2.7.** Prędkość FRP wynosi **131 mph**.',
          '**2.8.1.** Obowiązek rejestracji pojazdów/przyczep na kanale #rejestracja-pojazdów.',
          '**2.8.2.** Autobusy szkolne i pojazdy poczty nie wymagają rejestracji.',
          '**2.9.** Exploiting → permanentny ban.',
        ].join('\n'),
      })
      .setFooter(FOOTER)
  );

  // ==================== EMBED 4: ZASADY SESJI RP (cd.) ====================
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
            '**2.13.** OOC na czacie piszemy w nawiasach: (Zaraz wracam). Zakaz długich konwersacji OOC.',
            '**2.17.** Akcje RP może Voidować tylko Staff.',
            '**2.19.** Wypadek powyżej 35 mph → obowiązek odgrywania obrażeń i wezwania EMS.',
            '**2.21.1.** Peacetime 1° — zakaz akcji Crime i ucieczki przed policją.',
            '**2.21.2.** Peacetime 2° — j.w. + Void wypadków + limit FRP 70 mph.',
          ].join('\n'),
        },
        {
          name: '§5. Zasady komunikacji IC/OOC',
          value: [
            '**1.** Komunikacja IC (In Character) — mówisz i działasz jako postać.',
            '**2.** OOC (Out of Character) — zawsze w nawiasach: (muszę wyjść na chwilę).',
            '**3.** Zakaz używania informacji z OOC w IC (metagaming).',
            '**4.** Komendy RP: **/me** — opis czynności, **/do** — opis otoczenia.',
          ].join('\n'),
        },
        {
          name: '§6. Zasady służb',
          value: [
            '**1.** Wejście na służbę komendą `/duty` — obowiązkowe.',
            '**2.** Pojazdy służb dostępne **wyłącznie** dla danej służby.',
            '**3.** Policja: zakaz nadużywania "Laser Blaster" — to paralizator RP, nie broń śmiertelna.',
            '**4.** EMS/Straż: priorytet pojazdów uprzywilejowanych na drodze.',
            '**5.** DOT: wyłącznie pojazdy DOT do obsługi infrastruktury.',
          ].join('\n'),
        }
      )
      .setFooter(FOOTER)
  );

  // ==================== EMBED 5: §7 ZASADY POJAZDÓW ====================
  embeds.push(
    new EmbedBuilder()
      .setColor(COLOR)
      .addFields(
        {
          name: '§7. Zasady dotyczące pojazdów (1–5)',
          value: [
            '**1.** 👤 **Mieszkaniec** — maks. **5 pojazdów** (łącznie wartość każdego do **90 000$**).',
            '   ↳ Nie dotyczy pojazdów limitowanych i kolekcjonerskich *(wyjątki — otwórz ticket)*.',
            '**2.** 💜 **Wspierający** — do **9** zarejestrowanych pojazdów + przywileje.',
            '**3.** 💎 **Discord Nitro Booster** — do **10** pojazdów + wszystkie przywileje Wspierających.',
            '**4.** Rejestracja na kanale **#rejestracja-auta** obowiązkowa **przed** wyjazdem w ruch.',
            '**5.** Zakaz nierealistycznego modyfikowania zawieszenia pojazdu.',
          ].join('\n'),
        },
        {
          name: '§7. Zasady dotyczące pojazdów (6–10)',
          value: [
            '**6.** "Laser Blaster" policji = **paralizator RP** — obowiązek odgrywania jego efektu.',
            '**7.** Po **10 mandatach / 5 grzywnach / 5 aresztach** → PJ zatrzymane na **30 dni**.',
            '   ↳ Po 30 dniach możliwy egzamin przywracający uprawnienia.',
            '**8.** Pojazdy służb (radiowozy, karetki, wozy strażackie, lawety DOT) dostępne **wyłącznie** dla danej służby.',
            '**9.** 🔴 **Pojazd Administracji:** Czerwony Falcon Scavenger WSP \\[unmarked\\] 2021',
            '   ↳ Tablice: **Admin-[numer]** — traktowany jak radiowóz.',
            '   ↳ ⛔ Podszywanie się pod administrację = **permanentny ban**.',
            '**10.** Zakaz nadawania "blacklist" na własny dom innym graczom podczas trwającej akcji RP.',
          ].join('\n'),
        }
      )
      .setFooter(FOOTER)
  );

  // ==================== EMBED 6: POJAZD ADMINISTRACJI (ze zdjęciem) ====================
  embeds.push(
    new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('🔴 Pojazd Administracji AURORA Greenville RP')
      .setDescription(
        '**Czerwony Falcon Scavenger WSP \\[unmarked\\] 2021**\n' +
        'Tablice: **Admin-[numer]**\n\n' +
        '> Pojazd używany **wyłącznie** przez członków Administracji serwera.\n' +
        '> Traktowany jak **radiowóz policyjny** — ucieczka i podszywanie się **zabronione**.\n\n' +
        '⛔ **Podszywanie się pod Administrację = PERMANENTNY BAN** ⛔'
      )
      .setImage(ADMIN_VEHICLE_IMAGE_URL)
      .setFooter({ text: 'AURORA Greenville RP — Pojazdy Administracji' })
      .setTimestamp()
  );

  return embeds;
}

function buildPojeciaRpEmbed() {
  return new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('📚 Pojęcia Roleplay — AURORA Greenville RP')
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
    .setFooter({ text: 'AURORA Greenville RP — Pojęcia RP' })
    .setTimestamp();
}

module.exports = { buildRegulaminEmbeds, buildPojeciaRpEmbed };
