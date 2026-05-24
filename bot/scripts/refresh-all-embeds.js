// refresh-all-embeds.js
// Wypełnia wszystkie kanały informacyjne serwera embedami.
// Bezpieczny do ponownego uruchomienia — usuwa stare wiadomości bota przed wysłaniem.

const path = require('path');
const dotenv = require('dotenv');
for (const p of [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
  path.join(process.cwd(), '../.env'),
  path.join(process.cwd(), '.env'),
]) {
  const r = dotenv.config({ path: p });
  if (!r.error && process.env.DISCORD_TOKEN) break;
}

const {
  Client, GatewayIntentBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { buildRegulaminEmbeds, buildPojeciaRpEmbed } = require('../src/setup/regulamin');

const ADMIN_CAR_IMG = process.env.ADMIN_CAR_IMAGE_URL || null;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const delay  = ms => new Promise(r => setTimeout(r, ms));
const log    = msg => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${msg}`);
const norm   = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

// ─── helpers ────────────────────────────────────────────────────────────────

async function purge(ch) {
  try {
    const msgs   = await ch.messages.fetch({ limit: 100 });
    const botMsg = msgs.filter(m => m.author.id === client.user.id);
    for (const [, m] of botMsg) { await m.delete().catch(() => {}); await delay(250); }
    if (botMsg.size) log(`  🗑️  usunięto ${botMsg.size} wiadomości`);
  } catch {}
}

async function send(ch, embeds, components) {
  await purge(ch);
  for (const embed of embeds) {
    const opts = { embeds: [embed] };
    if (components) opts.components = components;
    await ch.send(opts).catch(e => log(`  ⚠️  błąd wysyłki: ${e.message}`));
    await delay(400);
  }
}

function find(guild, ...fragments) {
  return guild.channels.cache.find(
    c => c.isTextBased() && fragments.some(f => norm(c.name).includes(norm(f)))
  );
}

// ─── embed builders ─────────────────────────────────────────────────────────

function adminCarEmbed() {
  const e = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('🔴 Pojazd Administracji — AURORA Greenville RP')
    .setDescription(
      '**Czerwony Falcon Scavenger WSP [unmarked] 2021**\n' +
      'Tablice: **Admin-[numer]**\n\n' +
      '> Pojazd zarezerwowany **wyłącznie** dla członków Administracji.\n' +
      '> Traktowany na drodze jak **radiowóz policyjny** — ucieczka i podszywanie się są **zakazane**.\n\n' +
      '⛔ **Podszywanie się pod Administrację = PERMANENTNY BAN** ⛔'
    )
    .setFooter({ text: 'AURORA Greenville RP — Pojazdy Administracji' })
    .setTimestamp();
  if (ADMIN_CAR_IMG) e.setImage(ADMIN_CAR_IMG);
  return e;
}

function oAuroraEmbed() {
  return new EmbedBuilder()
    .setColor(0x22C55E)
    .setTitle('🗺️ O mapie AURORA Greenville RP')
    .setDescription(
      'Witaj na mapie **Greenville** — wiernym odwzorowaniu prawdziwego miasta Greenville w stanie Wisconsin (USA)!\n\n' +
      '**Kluczowe lokacje:**\n' +
      '> 🚔 **Komisariat Fox Valley Police** — centrum miasta, ul. główna\n' +
      '> 🚑 **Szpital Fox Mountain Medical** — północna część miasta\n' +
      '> 🚒 **Remiza Greenville Fire Rescue** — zachodnia dzielnica\n' +
      '> 🏛️ **Ratusz Greenville Town Hall** — ścisłe centrum\n' +
      '> 🚗 **DMV** — rejestracja pojazdów i prawo jazdy\n' +
      '> ✈️ **Lotnisko** — południowy wschód mapy\n' +
      '> 🏪 **Centrum Handlowe** — śródmieście\n' +
      '> 🌲 **Park Narodowy** — tereny północno-zachodnie\n\n' +
      '**Zasady terytorialne:**\n' +
      '> Każda lokacja ma przypisaną służbę lub właściciela.\n' +
      '> Respektuj prywatność prywatnych posesji — zakaz wchodzenia bez zaproszenia.\n' +
      '> Komisariat, szpital i remiza są strefami ochronnymi — zakaz akcji kryminalnych.'
    )
    .setFooter({ text: 'AURORA Greenville RP — Mapa' })
    .setTimestamp();
}

function taryfikatorEmbed() {
  return new EmbedBuilder()
    .setColor(0xF59E0B)
    .setTitle('⚖️ Taryfikator kar — AURORA Greenville RP')
    .addFields(
      {
        name: '🟡 Kary Discord',
        value: [
          '**Upomnienie** — drobne naruszenia regulaminu (spam, OT, caps lock)',
          '**Mute 1h** — powtarzające się naruszenia komunikacji lub po 3 warnach',
          '**Mute 24h** — poważniejsze naruszenia, obraźliwe zachowanie',
          '**Kick** — notoryczne łamanie zasad po ostrzeżeniach',
          '**Ban 3 dni** — trolling, prowokacja, niestosowne treści',
          '**Ban 7 dni** — poważne naruszenia, 5 aktywnych warnów',
          '**Ban permanentny** — exploiting, cheaty, ban evasion, doxxing, NSFW',
        ].join('\n'),
        inline: false,
      },
      {
        name: '🔴 Kary RP (w grze)',
        value: [
          '**Mandat** — do **5 000$** — wykroczenia drogowe, drobne naruszenia',
          '**Grzywna sądowa** — do **50 000$** — poważniejsze przestępstwa',
          '**Areszt** — do **24h RP** — ciężkie przestępstwa, napad, napaść',
          '**Zawieszenie PJ** — **30 dni** — po 10 mandatach / 5 grzywnach / 5 aresztach',
          '**FRP/RDM/VDM** — ostrzeżenie RP → kick z sesji → ban z serwera',
          '**Combat Logging** — natychmiastowy ban czasowy lub permanentny',
          '**Exploiting/Cheaty** — permanentny ban bez odwołania',
        ].join('\n'),
        inline: false,
      },
      {
        name: '📋 Ścieżka odwoławcza',
        value: [
          '> Odwołania od kar wyłącznie przez 🎫 **#otwórz-ticket** (kategoria: Odwołanie od kary)',
          '> Recydywa w ciągu 30 dni = podwójna kara',
          '> Fałszywe zgłoszenia = kara dla zgłaszającego',
          '> Dyskusja o karach na kanałach ogólnych jest zakazana',
        ].join('\n'),
        inline: false,
      }
    )
    .setFooter({ text: 'AURORA Greenville RP — Taryfikator v6.0' })
    .setTimestamp();
}

function mandatyEmbed() {
  return new EmbedBuilder()
    .setColor(0xEF4444)
    .setTitle('📜 Twoje mandaty i grzywny')
    .setDescription(
      'Sprawdź historię swoich mandatów, grzywien i aresztów.\n\n' +
      '**Dostępne komendy:**\n' +
      '> `/mandaty lista` — pełna lista aktywnych mandatów\n' +
      '> `/profil` — pełny profil RP z historią kar\n\n' +
      '**Limity skutkujące zawieszeniem PJ:**\n' +
      '> 🔴 **10 mandatów** — zawieszenie prawa jazdy\n' +
      '> 🔴 **5 grzywien sądowych** — zawieszenie prawa jazdy\n' +
      '> 🔴 **5 aresztowań** — zawieszenie prawa jazdy\n\n' +
      '*Zawieszenie PJ trwa **30 dni**. Po tym czasie możliwy egzamin przywracający uprawnienia.*'
    )
    .setFooter({ text: 'AURORA Greenville RP — System Mandatów' })
    .setTimestamp();
}

function telefonEmbed() {
  return new EmbedBuilder()
    .setColor(0x6366F1)
    .setTitle('📱 System telefoniczny RP')
    .setDescription(
      'Każda postać posiada unikalny **numer telefonu RP** przydzielany przy tworzeniu postaci.\n\n' +
      '**Dostępne komendy:**\n' +
      '> `/sms [numer] [wiadomość]` — wyślij SMS do innego gracza\n' +
      '> `/zadzwon [numer]` — zadzwoń do gracza (aktywna sesja)\n' +
      '> `/moj-numer` — sprawdź swój numer RP\n' +
      '> `/numer-info [numer]` — znajdź właściciela numeru\n\n' +
      '**Zasady:**\n' +
      '> • Rozmowy telefoniczne liczą się jako **IC** — treść może być podsłuchana przez służby\n' +
      '> • Zakaz dzwonienia poza sesją w celach metagamingowych\n' +
      '> • Logi SMS są widoczne dla Staffu\n\n' +
      '*Historia SMS i połączeń jest archiwizowana w tym kanale.*'
    )
    .setFooter({ text: 'AURORA Greenville RP — Telefon RP' })
    .setTimestamp();
}

function wynikEgzaminowEmbed() {
  return new EmbedBuilder()
    .setColor(0xF59E0B)
    .setTitle('🎓 Wyniki egzaminów na prawo jazdy')
    .setDescription(
      'W tym kanale publikowane są automatycznie wyniki egzaminów na prawo jazdy.\n\n' +
      '**Format wpisu:**\n' +
      '> 👤 Gracz | 📋 Kategoria | ✅/❌ Wynik | 📊 Punkty\n\n' +
      '**Jak zdać egzamin?**\n' +
      '> 1. Wejdź na kanał <#prawo-jazdy>\n' +
      '> 2. Kliknij **Przystąp do egzaminu**\n' +
      '> 3. Wybierz kategorię prawa jazdy\n' +
      '> 4. Odpowiedz na **10 pytań** (min. 8/10 do zaliczenia)\n\n' +
      '*Nieudana próba — odczekaj **1 godzinę** przed kolejnym podejściem.*'
    )
    .setFooter({ text: 'AURORA Greenville RP — Egzaminy PJ' })
    .setTimestamp();
}

function rankingEmbed() {
  return new EmbedBuilder()
    .setColor(0xEAB308)
    .setTitle('🏆 Rankingi AURORA Greenville RP')
    .setDescription(
      'Tutaj prezentowane są aktualne rankingi graczy i służb.\n\n' +
      '**Kategorie rankingów:**\n' +
      '> 👮 **Najaktywniejsze służby** — liczba sesji, dyżurów, interwencji\n' +
      '> 🚗 **Najbezpieczniejsi kierowcy** — zero mandatów, brak wypadków\n' +
      '> ⭐ **Gracze miesiąca** — wybór społeczności i Staffu\n' +
      '> 💼 **Najlepsi pracodawcy** — aktywność firm prywatnych\n\n' +
      '*Rankingi aktualizowane po każdej sesji przez Staffa.*'
    )
    .setFooter({ text: 'AURORA Greenville RP — Rankingi' })
    .setTimestamp();
}

function ankietyEmbed() {
  return new EmbedBuilder()
    .setColor(0x8B5CF6)
    .setTitle('🗳️ Ankiety i głosowania')
    .setDescription(
      'W tym kanale pojawiają się ankiety dotyczące rozwoju serwera.\n\n' +
      '**Twój głos ma znaczenie!**\n' +
      '> Regularne ankiety dotyczą:\n' +
      '> • Nowych funkcji i mechanik RP\n' +
      '> • Zmian w regulaminie\n' +
      '> • Planowania wydarzeń specjalnych\n' +
      '> • Oceny pracy Staffu\n\n' +
      '*Masz pomysł na ankietę? Zgłoś go przez 🎫 #otwórz-ticket lub kanał #sugestie.*'
    )
    .setFooter({ text: 'AURORA Greenville RP — Ankiety' })
    .setTimestamp();
}

function wynikPodanEmbed() {
  return new EmbedBuilder()
    .setColor(0x10B981)
    .setTitle('📊 Wyniki podań o pracę')
    .setDescription(
      'W tym kanale publikowane są wyniki rozpatrzonych podań o stanowiska służbowe.\n\n' +
      '**Dostępne służby i stanowiska:**\n' +
      '> 🚔 Fox Valley Police / Outagamie Sheriff / Wisconsin State Patrol\n' +
      '> 🚑 Fox Mountain Medical (EMS)\n' +
      '> 🚒 Greenville Fire Rescue / Brookmere Fire\n' +
      '> 📡 Outagamie Communications (Dyspozytornia)\n' +
      '> 🛣️ Wisconsin DOT\n' +
      '> 🔐 Security Guard / 🌲 Park Ranger\n\n' +
      '**Jak złożyć podanie?**\n' +
      '> Wejdź na kanał **#aplikuj** i wypełnij formularz dla wybranej służby.\n\n' +
      '*Wyniki ogłaszane są w ciągu **48–72 godzin** od złożenia podania.*'
    )
    .setFooter({ text: 'AURORA Greenville RP — Rekrutacja' })
    .setTimestamp();
}

function ofertPrywatneEmbed() {
  return new EmbedBuilder()
    .setColor(0xF59E0B)
    .setTitle('🏢 Oferty prywatnych pracodawców')
    .setDescription(
      'Tu właściciele firm publikują ogłoszenia rekrutacyjne dla swoich przedsiębiorstw.\n\n' +
      '**Jak ubiegać się o pracę prywatną?**\n' +
      '> 1. Przeczytaj ogłoszenie pracodawcy poniżej\n' +
      '> 2. Spełnij wymogi (min. rola **Mieszkaniec**, postać RP)\n' +
      '> 3. Przejdź ewentualny **test rekrutacyjny** pracodawcy\n' +
      '> 4. Skontaktuj się z właścicielem przez DM lub ticket\n\n' +
      '**Właściciele firm:**\n' +
      '> Chcesz zatrudnić pracowników? Napisz ogłoszenie w tym kanale.\n' +
      '> Możesz też stworzyć **własny test rekrutacyjny** — zgłoś go do Staffu.\n' +
      '> Pamiętaj: regulamin firmy wymaga akceptacji HR/Administracji.\n\n' +
      '*Kanał tylko dla ogłoszeń — dyskusje przenieś do <#właściciele-firm>.*'
    )
    .setFooter({ text: 'AURORA Greenville RP — Praca Prywatna' })
    .setTimestamp();
}

function ticketEmbed() {
  return new EmbedBuilder()
    .setColor(0x00C8FF)
    .setTitle('🎫 System ticketów — AURORA Greenville RP')
    .setDescription(
      'Potrzebujesz pomocy staffu? Masz pytanie, skargę lub problem?\n\n' +
      '**Dostępne kategorie:**\n' +
      '> 🆘 **Problem techniczny** — błąd, crash, lag, problem z grą\n' +
      '> ❓ **Pytanie do staffu** — zapytaj o cokolwiek\n' +
      '> ⚖️ **Apelacja od kary** — odwołanie od bana, muta lub ostrzeżenia\n' +
      '> 🚗 **Problem z pojazdem / PJ** — błąd pojazdu lub postaci\n' +
      '> 💼 **Sprawa dot. pracy / służby** — kwestie zatrudnienia\n' +
      '> 😡 **Skarga na gracza lub staffa** — naruszenie regulaminu\n' +
      '> 🚘 **Prośba o dostęp do limited** — poproś o rolę dostępu do limited\n\n' +
      '**Jak to działa:**\n' +
      '> 1️⃣ Kliknij przycisk poniżej\n' +
      '> 2️⃣ Wybierz kategorię zgłoszenia\n' +
      '> 3️⃣ Opisz dokładnie problem\n' +
      '> 4️⃣ Poczekaj na odpowiedź staffu\n\n' +
      '*Nie nadużywaj ticketów — służą do poważnych spraw.*'
    )
    .setFooter({ text: 'AURORA Greenville RP — Support' })
    .setTimestamp();
}

function sluzbyEmbed() {
  return new EmbedBuilder()
    .setColor(0x3B82F6)
    .setTitle('🚔 Podania do służb — AURORA Greenville RP')
    .setDescription(
      'Chcesz służyć mieszkańcom Greenville? Dołącz do jednej ze służb mundurowych!\n\n' +
      '**Dostępne służby:**\n' +
      '> 🚔 **Fox Valley Metro Police Dept.** — patrol, interwencje, pościgi\n' +
      '> ⭐ **Outagamie County Sheriff\'s Office** — obszary wiejskie i powiatu\n' +
      '> 🛣️ **Wisconsin State Patrol** — autostrady i drogi stanowe\n' +
      '> 📡 **Outagamie County Communications** — dyspozytornia 911\n' +
      '> 🚒 **Greenville Fire Rescue** — pożary, wypadki, ratownictwo\n' +
      '> 🔥 **Brookmere Fire Department** — straż dzielnicy Brookmere\n' +
      '> 🚑 **Fox Mountain Medical** — EMS, karetki, SOR\n' +
      '> 🚧 **Wisconsin DOT** — drogi, lawety, sygnalizacja\n' +
      '> 🌲 **National Park Service** — Park Ranger, ochrona przyrody\n' +
      '> 🔐 **Security Guard** — ochrona obiektów prywatnych\n' +
      '> 🚕 **Taxi Driver** — transport miejski na zlecenie\n\n' +
      '**Jak złożyć podanie?**\n' +
      '> **1️⃣ Kliknij przycisk** poniżej i wybierz kategorię służby\n' +
      '> **2️⃣ Wybierz konkretną jednostkę** z listy\n' +
      '> **3️⃣ Przeczytaj wymagania i regulamin** danej służby\n' +
      '> **4️⃣ Wypełnij formularz rekrutacyjny** (podanie tekstowe)\n' +
      '> **5️⃣ Poczekaj na decyzję HR** — do **48–72 godzin**\n\n' +
      '**Wymagania ogólne:**\n' +
      '> ✅ Rola **Mieszkaniec** (weryfikacja Discord + Roblox)\n' +
      '> ✅ Aktywna **postać RP** (imię, dowód, telefon)\n' +
      '> ✅ Prawo jazdy odpowiedniej kategorii (dla większości służb)\n' +
      '> ✅ Czysta historia — brak aktywnych banów i wielu warnów\n' +
      '> ✅ Aktywność na sesjach — min. kilka godzin historii RP\n\n' +
      '*Podania rozpatruje Komisja Rekrutacyjna (HR). Wyniki publikowane są na <#wyniki-podań>.*'
    )
    .setFooter({ text: 'AURORA Greenville RP — Rekrutacja do Służb' })
    .setTimestamp();
}

function zatrudnienieEmbed() {
  return new EmbedBuilder()
    .setColor(0x22C55E)
    .setTitle('💼 System zatrudnienia — AURORA Greenville RP')
    .setDescription(
      'Szukasz pracy w Greenville? Zatrudnij się w jednej z dostępnych firm!\n\n' +
      '**Jak przebiega rekrutacja?**\n' +
      '> **1️⃣ Wybierz stanowisko** — kliknij przycisk i wybierz pracę z listy\n' +
      '> **2️⃣ Zapoznaj się z regulaminem** — przeczytaj zasady pracy na danym stanowisku\n' +
      '> **3️⃣ Wypełnij test wiedzy** — odpowiedz na pytania dotyczące pracy\n' +
      '> **4️⃣ Uzyskaj min. 80%** — zdaj test i zdobądź automatycznie rolę pracownika\n\n' +
      '**Ważne informacje:**\n' +
      '> ⏳ **Cooldown 24 godziny** — po nieudanej próbie odczekaj dobę\n' +
      '> 📋 Każde stanowisko ma **własny regulamin** — zapoznaj się przed testem\n' +
      '> 👤 Wymagana rola **Mieszkaniec** oraz aktywna postać RP\n' +
      '> 🔄 Zmiana pracy możliwa po **złożeniu rezygnacji** przez ticket\n\n' +
      '**Rodzaje dostępnych prac:**\n' +
      '> 🍔 Gastronomia (restauracje, kawiarnie, fast-food)\n' +
      '> 🛒 Handel i sklepy\n' +
      '> 🚗 Motoryzacja (salony, warsztaty, myjnie)\n' +
      '> 🏥 Służba zdrowia i finanse\n' +
      '> 🎓 Edukacja i usługi\n' +
      '> 🎭 Rozrywka i hotelarstwo\n\n' +
      '*Na służby mundurowe (policja, EMS, straż) złóż podanie na <#podania-o-służbę>.*'
    )
    .setFooter({ text: 'AURORA Greenville RP — Zatrudnienie' })
    .setTimestamp();
}

function erlcInfoEmbed() {
  return new EmbedBuilder()
    .setColor(0x0EA5E9)
    .setTitle('🎮 ER:LC — Wisconsin RP | AURORA')
    .setDescription(
      'Witaj w sekcji **Emergency Response: Liberty County** na serwerze AURORA!\n\n' +
      'Nasz RP bazuje na **stanie Wisconsin** — obszarze **Outagamie County** i aglomeracji **Fox Valley**.\n\n' +
      '**Dostępne agencje:**\n' +
      '> 🚔 **Wisconsin State Patrol (WSP)** — patrol stanowych tras i autostrad\n' +
      '> 🏛️ **Outagamie County Sheriff (OCSD)** — patrol hrabstwa\n' +
      '> 🚓 **Appleton Police Department (APD)** — policja miejska\n' +
      '> 🚑 **Fox Valley EMS** — Gold Cross Ambulance, ratownictwo\n' +
      '> 🚒 **Appleton Fire Department (AFD)** — Stacja #1\n\n' +
      '**Jak dołączyć?**\n' +
      '> 1. Przejdź na 📝 **#dołącz-do-agencji**\n' +
      '> 2. Uzyskaj rolę **ER:LC Member** + rola agencji\n' +
      '> 3. Sesje zarządzane przez **Melonly** — link w #linki-erlc\n\n' +
      '**Obszar działania:** Outagamie County, Wisconsin | Fox Valley | I-41 / US-10'
    )
    .addFields(
      { name: '📡 Kanały radiowe IC', value: '**WSP:** Kanał 1 | **OCSD:** Kanał 2 | **APD:** Kanał 3 | **EMS/Fire:** Kanał 4', inline: false }
    )
    .setFooter({ text: 'AURORA Greenville RP — Sekcja ER:LC Wisconsin' })
    .setTimestamp();
}

function erlcRegulamiEmbed() {
  return new EmbedBuilder()
    .setColor(0xEF4444)
    .setTitle('❗ Regulamin ER:LC — Wisconsin RP')
    .addFields(
      {
        name: '§1 — Zasady ogólne',
        value: '1. Obowiązuje pełny RP — FRP, NLR, metagaming są zakazane.\n2. Radio IC używaj wyłącznie w służbie.\n3. Szanuj innych graczy — trolling = ban.',
        inline: false,
      },
      {
        name: '§2 — Pojazdy służbowe',
        value: '1. Używaj wyłącznie pojazdów swojej agencji.\n2. Liwerki muszą być zgodne z Wisconsin.\n3. Nie zostawiaj pojazdu bez IC powodu.',
        inline: false,
      },
      {
        name: '§3 — Zasady agencji',
        value: '**WSP:** tylko drogi stanowe i I-41\n**OCSD:** drogi hrabstwa poza Appleton\n**APD:** Appleton city limits\n**EMS/Fire:** priorytet ratownictwa — nie ścigaj się z LEO',
        inline: false,
      },
      {
        name: '§4 — Melonly',
        value: '1. Sesje zarządzane przez Melonly — wymagane konto.\n2. Nieaktywność >14 dni bez urlopu = usunięcie z agencji.',
        inline: false,
      }
    )
    .setFooter({ text: 'AURORA Greenville RP — Regulamin ER:LC' })
    .setTimestamp();
}

function erlcLiveryGuideEmbed() {
  return new EmbedBuilder()
    .setColor(0xF59E0B)
    .setTitle('🎨 Liwerki ER:LC — Gotowe Decal ID + Instrukcja Wisconsin')
    .setDescription(
      '**Jak dodać liwerek w ER:LC?**\n```\n1. Wejdź do pojazdu → Customize\n2. Wybierz zakładkę Liveries\n3. Wpisz ID grafiki Roblox (Decal ID) dla każdej strony\n4. Zatwierdź\n```\n⚠️ Wymagany **Custom Livery Pack** w prywatnym serwerze'
    )
    .addFields(
      {
        name: '🆓 Gotowe Decal ID — State Patrol (PRC Community Free)',
        value: [
          '**🔵 Maine SP** `#6088AB` — L: `13010157577` R: `13010143746` B: `13010225906`',
          '**⚫ Montana SP** `#181818` — L: `12990072173` R: `12990064077` B: `12990121056`',
          '**⚫ North Dakota SP** `#202020` — L: `13345703068` R: `13345693998` B: `13345762825`',
          '**⚪ Indiana SP** `#FFFFFF` — L: `12561017000` R: `12561016360` B: `12561017403`',
          '**⚫ Tennessee SP** — L: `12992202755` R: `12992187484` B: `12992298497` T: `12992451009`',
          '**🩶 Colorado SP** `#919191` — L: `12999118403` R: `12999291310` B: `12999340063` T: `12999202744`',
          '**🩶 Alabama SP** `#9C9C9C` — L: `12576321190` R: `12576322372` B: `12576325467` T: `12576326987`',
        ].join('\n'),
        inline: false,
      },
      {
        name: '🎯 Rekomendacja dla Wisconsin RP',
        value: [
          '> Brak publicznych ID dla WSP/OCSD/APD — użyj jako tymczasowego zamiennika:',
          '> 🚔 **WSP** → **Montana SP** (ciemny + srebro, wizualnie najbliższy WSP)',
          '> 🏛️ **OCSD** → **North Dakota SP** (ciemny odcień, pasuje do stylu Sheriff)',
          '> 🚓 **APD** → **Maine SP** (niebieski #6088AB, zbliżony do granatowego APD)',
          '> 🚑 **EMS / Fire** → stwórz własny decal wg instrukcji poniżej',
        ].join('\n'),
        inline: false,
      },
      {
        name: '🗂️ Wzorce do stworzenia własnego Wisconsin Decala',
        value: [
          '> 🚔 [WSP livery pack](https://www.lcpdfr.com/downloads/gta5mods/vehiclestextures/52396-wisconsin-state-patrol-livery-pack/) — oficjalne kolory i logo',
          '> 🏛️ [Outagamie Sheriff pack](https://www.lcpdfr.com/downloads/gta5mods/vehiclestextures/46925-outagamie-county-sheriff-wisconsin-2k-4k-livery-pack/)',
          '> 🚓 [Appleton Police pack](https://www.lcpdfr.com/downloads/gta5mods/vehiclestextures/46857-appleton-police-wisconsin-2k4k-livery-pack/)',
          '> 📖 [WSP w Greenville Wiki (Roblox)](https://greenville-wisconsin.fandom.com/wiki/Wisconsin_State_Patrol)',
          '> 🛒 [ERLCX.com](https://erlcx.com/?category=liveries) — szukaj: Wisconsin / State Patrol',
        ].join('\n'),
        inline: false,
      },
      {
        name: '✅ Wymagania kolorystyczne naszego serwera',
        value: [
          '**WSP:** ciemny granat/srebro + logo WSP | **OCSD:** tan/khaki + herb Outagamie',
          '**APD:** granatowy + "APPLETON POLICE" | **EMS:** biały/czerwony + Gold Cross',
          '**Fire:** czerwony + numer jednostki AFD #1',
        ].join('\n'),
        inline: false,
      }
    )
    .setFooter({ text: 'AURORA ER:LC — Liwerki | ID źródło: PRC Community Free Liveries' })
    .setTimestamp();
}

function erlcJoinAgencyEmbed() {
  return new EmbedBuilder()
    .setColor(0x0EA5E9)
    .setTitle('📝 Dołącz do agencji ER:LC')
    .setDescription(
      'Aby dołączyć do agencji Wisconsin RP, otwórz ticket w kategorii **💼 Sprawa dot. pracy / służby** i napisz:\n\n' +
      '> • Wybrana agencja (WSP / OCSD / APD / EMS / Fire)\n' +
      '> • Nick Roblox\n' +
      '> • Doświadczenie w ER:LC (opcjonalnie)\n\n' +
      '**Agencje i ich kompetencje:**\n' +
      '> 🚔 **Wisconsin State Patrol (WSP)** — autostrady stanowe, I-41\n' +
      '> 🏛️ **Outagamie County Sheriff (OCSD)** — patrol hrabstwa\n' +
      '> 🚓 **Appleton Police Department (APD)** — miasto Appleton\n' +
      '> 🚑 **Fox Valley EMS** — ratownictwo medyczne (Gold Cross)\n' +
      '> 🚒 **Appleton Fire Department (AFD)** — stacja #1, Central\n\n' +
      '**Po zatwierdzeniu przez staff:**\n' +
      '✅ Rola **ER:LC Member** + rola agencji\n' +
      '✅ Dostęp do kanałów agencji i Melonly'
    )
    .setFooter({ text: 'AURORA ER:LC — Rekrutacja do agencji Wisconsin' })
    .setTimestamp();
}

function erlcLinksEmbed() {
  return new EmbedBuilder()
    .setColor(0x6366F1)
    .setTitle('🔗 Ważne linki — ER:LC Wisconsin RP')
    .addFields(
      { name: '🎮 Gra i platforma', value: '[ER:LC na Roblox](https://www.roblox.com/games/2534724415) — Emergency Response: Liberty County\n[Melonly](https://melonly.xyz) — platforma zarządzania sesjami ER:LC', inline: false },
      { name: '🎨 Liwerki', value: '[PRC Discord](https://discord.gg/policeroleplaying) — Police Roleplay Community\n[Roblox Library](https://www.roblox.com/catalog) — szukaj: Wisconsin livery', inline: false },
      { name: '📖 Zasoby ER:LC', value: '[ER:LC Official Discord](https://discord.gg/erlc) — oficjalny serwer\n[ER:LC Wiki](https://er-lc.fandom.com) — pojazdy, mechaniki', inline: false },
      { name: '🚔 Agencje Wisconsin', value: '[WSP](https://wsp.wi.gov) | [OCSD](https://outagamie.org) | [APD](https://appletonpd.org) | [Gold Cross EMS](https://goldcrossambulance.com) | [AFD](https://appleton.org/fire)', inline: false }
    )
    .setFooter({ text: 'AURORA ER:LC — Linki Wisconsin RP' })
    .setTimestamp();
}

// ─── main ────────────────────────────────────────────────────────────────────

client.once('ready', async () => {
  log(`Zalogowano jako ${client.user.tag}`);
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    await guild.channels.fetch();
    log(`Serwer: ${guild.name}`);

    // ── #otwórz-ticket ───────────────────────────────────────────────────────
    const ticketCh = find(guild, 'otworz-ticket', 'otwórz-ticket', 'ticket');
    if (ticketCh) {
      log(`Tickety → ${ticketCh.name}`);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_create')
          .setLabel('🎫 Otwórz ticket')
          .setStyle(ButtonStyle.Primary)
      );
      await purge(ticketCh);
      await ticketCh.send({ embeds: [ticketEmbed()], components: [row] })
        .catch(e => log(`  ⚠️  błąd wysyłki: ${e.message}`));
      log('  ✅ #otwórz-ticket');
    }

    // ── Regulamin + pojazd admina ────────────────────────────────────────────
    const regCh = find(guild, 'regulamin');
    if (regCh && !norm(regCh.name).includes('staffu')) {
      log(`Regulamin → ${regCh.name}`);
      await send(regCh, [...buildRegulaminEmbeds(), adminCarEmbed()]);
      log('  ✅ #regulamin (9 sekcji + pojazd admina)');
    }

    // ── Słownik RP ───────────────────────────────────────────────────────────
    const slownikCh = find(guild, 'slownik', 'pojecia');
    if (slownikCh) {
      log(`Słownik RP → ${slownikCh.name}`);
      await send(slownikCh, [buildPojeciaRpEmbed()]);
      log('  ✅ #słownik-rp');
    }

    // ── #o-aurora ────────────────────────────────────────────────────────────
    const auroraCh = find(guild, 'o-aurora', 'aurora');
    if (auroraCh) {
      log(`O-Aurora → ${auroraCh.name}`);
      await send(auroraCh, [oAuroraEmbed()]);
      log('  ✅ #o-aurora');
    }

    // ── #taryfikator ─────────────────────────────────────────────────────────
    const tarCh = find(guild, 'taryfikator');
    if (tarCh) {
      log(`Taryfikator → ${tarCh.name}`);
      await send(tarCh, [taryfikatorEmbed()]);
      log('  ✅ #taryfikator');
    }

    // ── #moje-mandaty ────────────────────────────────────────────────────────
    const mandatyCh = find(guild, 'mandaty', 'moje-mandaty');
    if (mandatyCh) {
      log(`Mandaty → ${mandatyCh.name}`);
      await send(mandatyCh, [mandatyEmbed()]);
      log('  ✅ #moje-mandaty');
    }

    // ── #telefon ─────────────────────────────────────────────────────────────
    const telefonCh = find(guild, 'telefon');
    if (telefonCh) {
      log(`Telefon → ${telefonCh.name}`);
      await send(telefonCh, [telefonEmbed()]);
      log('  ✅ #telefon');
    }

    // ── #wyniki-egzaminów ────────────────────────────────────────────────────
    const egzaminCh = find(guild, 'wyniki-egzamin');
    if (egzaminCh) {
      log(`Wyniki egzaminów → ${egzaminCh.name}`);
      await send(egzaminCh, [wynikEgzaminowEmbed()]);
      log('  ✅ #wyniki-egzaminów');
    }

    // ── #rankingi ────────────────────────────────────────────────────────────
    const rankingCh = find(guild, 'rankingi');
    if (rankingCh) {
      log(`Rankingi → ${rankingCh.name}`);
      await send(rankingCh, [rankingEmbed()]);
      log('  ✅ #rankingi');
    }

    // ── #ankiety ─────────────────────────────────────────────────────────────
    const ankietyCh = find(guild, 'ankiety');
    if (ankietyCh) {
      log(`Ankiety → ${ankietyCh.name}`);
      await send(ankietyCh, [ankietyEmbed()]);
      log('  ✅ #ankiety');
    }

    // ── #wyniki-podań ────────────────────────────────────────────────────────
    const wynikPodanCh = find(guild, 'wyniki-podan');
    if (wynikPodanCh) {
      log(`Wyniki podań → ${wynikPodanCh.name}`);
      await send(wynikPodanCh, [wynikPodanEmbed()]);
      log('  ✅ #wyniki-podań');
    }

    // ── #oferty-prywatne ─────────────────────────────────────────────────────
    const ofertyCh = find(guild, 'oferty-prywatne', 'oferty');
    if (ofertyCh) {
      log(`Oferty prywatne → ${ofertyCh.name}`);
      await send(ofertyCh, [ofertPrywatneEmbed()]);
      log('  ✅ #oferty-prywatne');
    }

    // ── #dostępne-stanowiska — prace cywilne (quiz 80%) ─────────────────────
    const stanowiskaCh = find(guild, 'dostepne-stanowiska', 'stanowiska', 'zatrudnienie');
    if (stanowiskaCh) {
      log(`Zatrudnienie → ${stanowiskaCh.name}`);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('job_apply')
          .setLabel('💼 Wybierz pracę i aplikuj')
          .setStyle(ButtonStyle.Success)
      );
      await purge(stanowiskaCh);
      await stanowiskaCh.send({ embeds: [zatrudnienieEmbed()], components: [row] })
        .catch(e => log(`  ⚠️  błąd wysyłki: ${e.message}`));
      log('  ✅ #dostępne-stanowiska');
    }

    // ── #podania-o-służbę — służby mundurowe ─────────────────────────────────
    const sluzbyPodaniaCh = find(guild, 'podania-o-sluzbe', 'podania-o-sl');
    if (sluzbyPodaniaCh) {
      log(`Podania o służbę → ${sluzbyPodaniaCh.name}`);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('job_apply')
          .setLabel('🚔 Wybierz służbę i aplikuj')
          .setStyle(ButtonStyle.Primary)
      );
      await purge(sluzbyPodaniaCh);
      await sluzbyPodaniaCh.send({ embeds: [sluzbyEmbed()], components: [row] })
        .catch(e => log(`  ⚠️  błąd wysyłki: ${e.message}`));
      log('  ✅ #podania-o-służbę');
    }

    // ── ER:LC — #erlc-info ───────────────────────────────────────────────────
    const erlcInfoCh = find(guild, 'erlc-info');
    if (erlcInfoCh) {
      log(`ER:LC Info → ${erlcInfoCh.name}`);
      await send(erlcInfoCh, [erlcInfoEmbed()]);
      log('  ✅ #erlc-info');
    }

    // ── ER:LC — #erlc-regulamin ──────────────────────────────────────────────
    const erlcRegCh = find(guild, 'erlc-regulamin');
    if (erlcRegCh) {
      log(`ER:LC Regulamin → ${erlcRegCh.name}`);
      await send(erlcRegCh, [erlcRegulamiEmbed()]);
      log('  ✅ #erlc-regulamin');
    }

    // ── ER:LC — #liwerki-instrukcja ──────────────────────────────────────────
    const erlcLiveryCh = find(guild, 'liwerki-instrukcja', 'liwerki');
    if (erlcLiveryCh && !norm(erlcLiveryCh.name).includes('galeria')) {
      log(`ER:LC Liwerki → ${erlcLiveryCh.name}`);
      await send(erlcLiveryCh, [erlcLiveryGuideEmbed()]);
      log('  ✅ #liwerki-instrukcja');
    }

    // ── ER:LC — #dołącz-do-agencji ───────────────────────────────────────────
    const erlcJoinCh = find(guild, 'dolacz-do-agencji', 'dołącz-do-agencji');
    if (erlcJoinCh) {
      log(`ER:LC Dołącz → ${erlcJoinCh.name}`);
      await send(erlcJoinCh, [erlcJoinAgencyEmbed()]);
      log('  ✅ #dołącz-do-agencji');
    }

    // ── ER:LC — #linki-erlc ──────────────────────────────────────────────────
    const erlcLinksCh = find(guild, 'linki-erlc');
    if (erlcLinksCh) {
      log(`ER:LC Linki → ${erlcLinksCh.name}`);
      await send(erlcLinksCh, [erlcLinksEmbed()]);
      log('  ✅ #linki-erlc');
    }

    log('\n🎉 Wszystkie kanały wypełnione!');
  } catch (e) {
    console.error('❌ Błąd:', e);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
