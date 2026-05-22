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
      '**Czerwony Durant Camion PPV**\n' +
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

// ─── main ────────────────────────────────────────────────────────────────────

client.once('ready', async () => {
  log(`Zalogowano jako ${client.user.tag}`);
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    await guild.channels.fetch();
    log(`Serwer: ${guild.name}`);

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

    log('\n🎉 Wszystkie kanały wypełnione!');
  } catch (e) {
    console.error('❌ Błąd:', e);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
