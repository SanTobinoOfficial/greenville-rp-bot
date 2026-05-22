// Standalone embed runner — sends all channel embeds programmatically
// Usage: node scripts/run-embeds.js
// Replicates /setup-embeds command without needing Discord interaction

require(require('path').join(__dirname, '../bot/node_modules/dotenv')).config({
  path: require('path').join(__dirname, '../bot/.env'),
});

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } =
  require(require('path').join(__dirname, '../bot/node_modules/discord.js'));
const serverConfig = require(require('path').join(__dirname, '../server-config.json'));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Normalize Polish chars so ASCII searches match diacritic channel names */
function normalize(s) {
  return s.normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics (ó→o, ą→a, ę→e, ś→s, ź→z, ż→z, ć→c, ń→n)
    .replace(/ł/g, 'l')             // ł has no NFD decomposition
    .replace(/Ł/g, 'L');
}

/** Find a text channel by a (Polish-safe) fragment of its name */
function ch(guild, fragment) {
  const normFrag = normalize(fragment.toLowerCase());
  return guild.channels.cache.find(
    c => c.isTextBased() && normalize(c.name.toLowerCase()).includes(normFrag)
  );
}

function splitFieldText(text, limit = 1020) {
  if (text.length <= limit) return [text];
  const lines = text.split('\n');
  const chunks = [];
  let current = '';
  for (const line of lines) {
    if ((current + '\n' + line).length > limit) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function buildRegulamEmbedsFromConfig() {
  const reg = serverConfig.regulamin;
  const color = parseInt(reg.color.replace('#', ''), 16);

  return reg.sections.map((section, sIdx) => {
    const embed = new EmbedBuilder()
      .setColor(color)
      .setFooter({ text: reg.footer })
      .setTimestamp();

    if (sIdx === 0 && section.title) {
      embed.setTitle(section.title);
      if (section.intro) embed.setDescription(section.intro);
    }

    for (const field of (section.fields || [])) {
      const value = field.rules.map((r, i) => `${i + 1}. ${r}`).join('\n');
      const chunks = splitFieldText(value, 1020);
      chunks.forEach((chunk, ci) => {
        embed.addFields({
          name: ci === 0 ? field.name : `${field.name} (cd.)`,
          value: chunk,
          inline: false,
        });
      });
    }

    return embed;
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function sendEmbeds(guild) {
  const sent = [];
  const failed = [];

  async function tryChannel(fragment, label, fn) {
    const channel = ch(guild, fragment);
    if (!channel) {
      console.log(`   ⏭️  Kanał "${fragment}" nie znaleziony — pomijam`);
      return;
    }
    try {
      await fn(channel);
      sent.push(`✅ #${channel.name}`);
      console.log(`   ✅ #${channel.name}`);
    } catch (e) {
      failed.push(`❌ ${label}: ${e.message}`);
      console.error(`   ❌ ${label}: ${e.message}`);
    }
  }

  // ── 1. #zacznij-tutaj ──────────────────────────────────────────────────────
  console.log('\n📨 [1/12] #zacznij-tutaj — weryfikacja...');
  await tryChannel('zacznij-tutaj', 'zacznij-tutaj', async (c) => {
    const embed = new EmbedBuilder()
      .setColor(0x30d158)
      .setTitle('✅ Witaj w AURORA Greenville RP!')
      .setDescription(
        '**AURORA Greenville RP** to polski serwer Roleplay na Roblox.\n' +
        'Aby uzyskać pełny dostęp do serwera, zweryfikuj swoje konto Roblox!\n\n' +
        '**Jak przebiega weryfikacja?**\n' +
        '> 📋 Kliknij **Zweryfikuj się** poniżej\n' +
        '> 👤 Podaj swój **nick Roblox** i odpowiedz na kilka pytań\n' +
        '> ❓ Odpowiedz poprawnie na **min. 8/10 pytań** z regulaminu\n' +
        '> 🏠 Rola **Mieszkaniec** zostanie nadana **automatycznie**!\n\n' +
        '**Zanim zaczniesz:**\n' +
        '> 📖 Przeczytaj regulamin na kanale **#regulamin**\n' +
        '> 📚 Zapoznaj się z pojęciami RP (FRP, NLR, metagaming)\n' +
        '> ⏳ Po nieudanej próbie odczekaj **24 godziny** przed następną\n\n' +
        '*Weryfikacja zajmuje ok. 5 minut. Masz pytania? Otwórz ticket!*'
      )
      .setFooter({ text: 'AURORA Greenville RP — System weryfikacji v2.0' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_start')
        .setLabel('✅ Zweryfikuj się!')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('ticket_create')
        .setLabel('❓ Mam problem')
        .setStyle(ButtonStyle.Secondary),
    );
    await c.send({ embeds: [embed], components: [row] });
  });

  // ── 2. #regulamin — każdy embed osobno (limit 6000 znaków/wiadomość) ───────
  console.log('\n📨 [2/12] #regulamin — pełny regulamin...');
  await tryChannel('regulamin', 'regulamin', async (c) => {
    const regEmbeds = buildRegulamEmbedsFromConfig();
    // Send ONE embed per message to avoid 6000-char-per-message Discord limit
    for (const emb of regEmbeds) {
      await c.send({ embeds: [emb] });
    }
    // Override sent entry to include count
    sent.pop();
    sent.push(`✅ #${c.name} (${regEmbeds.length} wiadomości)`);
    console.log(`      (${regEmbeds.length} embedów po jednym na wiadomość)`);
  });

  // ── 3. #słownik-rp ────────────────────────────────────────────────────────
  // normalize('slownik-rp') matches normalize('słownik-rp') since ł→l
  console.log('\n📨 [3/12] #słownik-rp...');
  await tryChannel('slownik-rp', 'słownik-rp', async (c) => {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📖 Słownik pojęć Roleplay — AURORA Greenville RP')
      .setDescription('**Znajomość poniższych pojęć jest obowiązkowa** przed przystąpieniem do sesji RP.\nNiezrozumienie pojęć nie zwalnia z odpowiedzialności za ich naruszenie.')
      .addFields(
        {
          name: '🔴 Zakazy absolutne (ban)',
          value: [
            '**FRP** (Fail Roleplay) — zachowanie sprzeczne z realizmem RP',
            '**RDM** (Random Death Match) — atakowanie bez powodu RP',
            '**VDM** (Vehicle Death Match) — taranowanie pojazdem bez powodu',
            '**Metagaming** — używanie wiedzy z poza gry (Discord/stream) w IC',
            '**Powergaming** — narzucanie innym akcji bez ich zgody',
            '**Combat Logging** — wyjście z gry podczas trwającej akcji RP',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🟡 Zasady kluczowe',
          value: [
            '**NLR** — po śmierci zapominasz wszystko z poprzedniego życia',
            '**Fear RP** — odgrywaj strach przy zagrożeniu życia',
            '**Void** — anulowanie akcji RP (tylko Staff)',
            '**Peacetime** — tryb bez akcji kryminalnych (Pt1°/Pt2°)',
            '**Hostage RP** — wymaga zgody OOC celu + aktywnego Hosta',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🟢 Podstawy komunikacji',
          value: [
            '**IC** — In Character: mówisz jako postać',
            '**OOC** — Out of Character: rozmowa poza RP w nawiasach ()',
            '**/me** — opisujesz czynność postaci, np. /me wyciąga dokumenty',
            '**/do** — opisujesz otoczenie (scena, przedmioty)',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🔵 Kody i systemy',
          value: [
            '**10-4** — Potwierdzam (kod radiowy)',
            '**10-33** — ALARM! Pilna pomoc! (najwyższy priorytet)',
            '**10-70** — Pościg w toku',
            '**BOLO** — Be On Look Out: ogłoszenie o poszukiwanej osobie',
            'Pełna lista: `/kod-10`',
          ].join('\n'),
          inline: false,
        },
      )
      .setFooter({ text: 'AURORA Greenville RP — Słownik RP v5.0' })
      .setTimestamp();
    await c.send({ embeds: [embed] });
  });

  // ── 4. #otwórz-ticket ─────────────────────────────────────────────────────
  // Use 'otworz-ticket' (not just 'ticket') to avoid matching #logi-ticketow
  console.log('\n📨 [4/12] #otwórz-ticket...');
  await tryChannel('otworz-ticket', 'otwórz-ticket', async (c) => {
    const embed = new EmbedBuilder()
      .setColor(0x00c8ff)
      .setTitle('🎫 System ticketów')
      .setDescription(
        'Potrzebujesz pomocy staffu? Masz pytanie, skargę lub problem?\n\n' +
        '**Kiedy otworzyć ticket:**\n' +
        '> • Problem z weryfikacją lub kontem\n' +
        '> • Skarga na gracza lub staff\n' +
        '> • Błąd bota lub systemu\n' +
        '> • Pytanie do administracji\n' +
        '> • Podanie o rolę specjalną\n\n' +
        '**Jak to działa:**\n' +
        '> 1️⃣ Kliknij przycisk poniżej\n' +
        '> 2️⃣ Wybierz kategorię ticketu\n' +
        '> 3️⃣ Opisz swój problem\n' +
        '> 4️⃣ Poczekaj na odpowiedź staffu\n\n' +
        '*Nie nadużywaj ticketów — służą do poważnych spraw.*'
      )
      .setFooter({ text: 'AURORA Greenville RP — Support' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_create')
        .setLabel('🎫 Otwórz ticket')
        .setStyle(ButtonStyle.Primary)
    );
    await c.send({ embeds: [embed], components: [row] });
  });

  // ── 5. #stwórz-postać ─────────────────────────────────────────────────────
  // normalize('stworz-postac') matches normalize('stwórz-postać')
  console.log('\n📨 [5/12] #stwórz-postać...');
  await tryChannel('stworz-postac', 'stwórz-postać', async (c) => {
    const embed = new EmbedBuilder()
      .setColor(0x30d158)
      .setTitle('🪪 Tworzenie postaci RP')
      .setDescription(
        'Zanim zaczniesz grać, stwórz swoją postać!\n\n' +
        '**Co otrzymasz:**\n' +
        '> 👤 Imię i nazwisko IC\n' +
        '> 🆔 Numer PESEL\n' +
        '> 📱 Unikalny numer telefonu RP\n' +
        '> 🪪 Dowód osobisty\n\n' +
        '**Wymagania:**\n' +
        '> • Musisz mieć rolę **Mieszkaniec**\n' +
        '> • Imię i nazwisko muszą brzmieć realistycznie\n\n' +
        '**Komenda:** `/postac stworz`'
      )
      .setFooter({ text: 'AURORA Greenville RP — Postacie' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('character_create')
        .setLabel('👤 Stwórz postać')
        .setStyle(ButtonStyle.Success)
    );
    await c.send({ embeds: [embed], components: [row] });
  });

  // ── 6. #prawo-jazdy ───────────────────────────────────────────────────────
  console.log('\n📨 [6/12] #prawo-jazdy...');
  await tryChannel('prawo-jazdy', 'prawo-jazdy', async (c) => {
    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle('🚗 Prawo jazdy — egzaminy')
      .setDescription(
        'Aby prowadzić pojazdy w RP, potrzebujesz prawa jazdy!\n\n' +
        '**Dostępne kategorie:**\n' +
        '> 🛵 **Kat. AM** — motorower (do 45 km/h)\n' +
        '> 🏍️ **Kat. A1** — motocykl do 125 cm³\n' +
        '> 🏍️ **Kat. A2** — motocykl do 35 kW\n' +
        '> 🏍️ **Kat. A** — każdy motocykl\n' +
        '> 🚗 **Kat. B** — samochód osobowy (wymagane do rejestracji auta)\n' +
        '> 🚛 **Kat. C** — pojazd ciężarowy\n' +
        '> 🚌 **Kat. D** — autobus\n' +
        '> 🚜 **Kat. T** — ciągnik rolniczy\n\n' +
        '**Komenda:** `/sprawdź-prawo-jazdy`\n\n' +
        '*Egzamin zdajesz przez formularz weryfikacyjny lub u Staffu.*'
      )
      .setFooter({ text: 'AURORA Greenville RP — Prawo jazdy' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('license_apply')
        .setLabel('📋 Przystąp do egzaminu')
        .setStyle(ButtonStyle.Primary)
    );
    await c.send({ embeds: [embed], components: [row] });
  });

  // ── 7. #rejestracja-auta ──────────────────────────────────────────────────
  console.log('\n📨 [7/12] #rejestracja-auta...');
  await tryChannel('rejestracja-auta', 'rejestracja-auta', async (c) => {
    const embed = new EmbedBuilder()
      .setColor(0x94A3B8)
      .setTitle('🚗 Rejestracja pojazdu')
      .setDescription(
        'Zarejestruj swój pojazd RP!\n\n' +
        '**Wymagania:**\n' +
        '> • Rola **Mieszkaniec**\n' +
        '> • Prawo jazdy kategorii odpowiedniej do pojazdu\n' +
        '> • Stworzony dowód osobisty\n\n' +
        '**Limity pojazdów:**\n' +
        '> 👤 Mieszkaniec — do **5** pojazdów\n' +
        '> 💜 Wspierający — do **9** pojazdów\n' +
        '> 💎 Nitro Booster — do **10** pojazdów\n\n' +
        '**Komenda:** `/moje-pojazdy`'
      )
      .setFooter({ text: 'AURORA Greenville RP — Pojazdy' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('vehicle_register')
        .setLabel('🚗 Zarejestruj pojazd')
        .setStyle(ButtonStyle.Secondary)
    );
    await c.send({ embeds: [embed], components: [row] });
  });

  // ── 8. #rola-powiadomień ──────────────────────────────────────────────────
  // normalize('rola-powiadomien') matches normalize('rola-powiadomień')
  console.log('\n📨 [8/12] #rola-powiadomień...');
  await tryChannel('rola-powiadomien', 'rola-powiadomień', async (c) => {
    const embed = new EmbedBuilder()
      .setColor(0xFFFFFF)
      .setTitle('🔔 Powiadomienia o sesjach')
      .setDescription(
        'Chcesz być informowany o nadchodzących sesjach RP?\n\n' +
        'Kliknij przycisk poniżej aby przypisać/zdjąć sobie rolę ' +
        '**🔔 Powiadomienia** — będziesz oznaczany przy ogłoszeniach sesji!\n\n' +
        '*Możesz w każdej chwili usunąć rolę klikając ponownie.*'
      )
      .setFooter({ text: 'AURORA Greenville RP — Powiadomienia' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('toggle_notifications')
        .setLabel('🔔 Włącz / Wyłącz powiadomienia')
        .setStyle(ButtonStyle.Secondary)
    );
    await c.send({ embeds: [embed], components: [row] });
  });

  // ── 9. #faq ───────────────────────────────────────────────────────────────
  console.log('\n📨 [9/12] #faq...');
  await tryChannel('faq', 'faq', async (c) => {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('❓ Najczęściej zadawane pytania')
      .setDescription(
        '**Jak dołączyć do serwera RP?**\n' +
        '> Wejdź na kanał z weryfikacją i kliknij **Wypełnij formularz weryfikacyjny**.\n\n' +
        '**Ile mam czasu na formularz?**\n' +
        '> Nie ma limitu czasu. Po nieudanej próbie odczekaj 24 godziny.\n\n' +
        '**Jak zmienić nick Roblox?**\n' +
        '> Otwórz ticket — staff pomoże zmienić powiązanie.\n\n' +
        '**Kiedy są sesje?**\n' +
        '> Sprawdź kanał z planem sesji lub włącz powiadomienia.\n\n' +
        '**Jak dołączyć do służb?**\n' +
        '> Złóż podanie na kanale podań o służbę.\n\n' +
        '**Mam problem z botem — co robić?**\n' +
        '> Otwórz ticket w dedykowanym kanale.'
      )
      .setFooter({ text: 'AURORA Greenville RP — FAQ' });

    await c.send({ embeds: [embed] });
  });

  // ── 10. #ekonomia-info ────────────────────────────────────────────────────
  console.log('\n📨 [10/12] #ekonomia-info...');
  await tryChannel('ekonomia-info', 'ekonomia-info', async (c) => {
    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle('💰 System Ekonomii RP — AURORA Greenville RP')
      .setDescription('Witaj w systemie ekonomii! Zarządzaj swoimi środkami i zarabiaj pracując na sesjach.')
      .addFields(
        { name: '👛 Portfel (Gotówka)', value: 'Gotówka przy sobie — może zostać skradziona.\nKomenda: `/portfel`', inline: true },
        { name: '🏦 Konto bankowe',     value: 'Bezpieczne środki. Wpłaty/wypłaty przez `/bank`.\nPrzelewy: `/przelew`', inline: true },
        { name: '💼 Wynagrodzenia',      value: 'Zarabiasz pracując na sesjach. Stawki różnią się wg pracy.\nSprawdź: `/zarobki stawka`', inline: false },
        {
          name: '📋 Komendy ekonomii',
          value: '`/portfel` — stan portfela i konta\n`/bank` — operacje bankowe\n`/przelew` — przelew do gracza\n`/zarobki` — wypłata / stawka\n`/daily` — dzienna nagroda (co 22h + streak!)\n`/taryfikator` — lista kar finansowych',
          inline: false,
        },
        {
          name: '🔥 Dzienna nagroda!',
          value: 'Użyj `/daily` co 22h aby otrzymać **500$** bazowej nagrody!\nGraj codziennie aby budować serię — każdy dzień to **+100$** więcej (do 7 dni = **1 100$/dzień**)!',
          inline: false,
        },
        {
          name: '⚠️ Zasady',
          value: 'Zakaz duplikowania środków i bug abuse → permanentny ban.\nMandaty i grzywny potrącane automatycznie z konta bankowego.',
          inline: false,
        },
      )
      .setFooter({ text: 'AURORA Greenville RP — System Ekonomii' })
      .setTimestamp();
    await c.send({ embeds: [embed] });
  });

  // ── 11. #taryfikator ──────────────────────────────────────────────────────
  console.log('\n📨 [11/12] #taryfikator...');
  await tryChannel('taryfikator', 'taryfikator', async (c) => {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('⚖️ TARYFIKATOR KAR — AURORA Greenville RP')
      .setDescription('Kompletny taryfikator kar Discord i RP. Recydywa (w ciągu 30 dni) = kara x2.\nPełna lista komendą: `/taryfikator`')
      .addFields(
        { name: '🟦 NIEBIESKA — Minimalna', value: 'Spam, caps, off-topic → **Warn / Mute 1h**', inline: true },
        { name: '🟩 ZIELONA — Niska',        value: 'FRP 1×, Metagaming → **Warn + Kick**',      inline: true },
        { name: '🟧 POMARAŃCZOWA — Wysoka',  value: 'RDM, VDM, CL → **Ban 3–14 dni**',          inline: true },
        { name: '🟥 CZERWONA — Krytyczna',   value: 'Exploit, dox, NSFW → **Permanentny ban**',  inline: true },
        {
          name: '💸 Mandaty RP (przykłady)',
          value: '🚦 Przekroczenie prędkości: **500$–2 000$**\n🍺 Jazda pod wpływem: **3 000$**\n🔫 Posiadanie broni bez zezwolenia: **5 000$**\n🚗 Brak prawa jazdy: **1 500$**',
          inline: false,
        },
      )
      .setFooter({ text: 'AURORA Greenville RP — Taryfikator v5.0' })
      .setTimestamp();
    await c.send({ embeds: [embed] });
  });

  // ── 12. #dostępne-stanowiska ──────────────────────────────────────────────
  console.log('\n📨 [12/12] #dostępne-stanowiska...');
  await tryChannel('dostepne-stanowiska', 'dostępne-stanowiska', async (c) => {
    const embed = new EmbedBuilder()
      .setColor(0x1D4ED8)
      .setTitle('💼 Dostępne Stanowiska & Służby — AURORA Greenville RP')
      .setDescription('Dołącz do służb i RP organizacji! Każda służba wymaga złożenia podania i przejścia przez HR.\n\n*Złóż podanie na kanale **#📝│podania-o-służbę***')
      .addFields(
        {
          name: '🚔 Policja',
          value: 'Dbaj o porządek w mieście. Patrole, aresztowania, pościgi.\n**Wymagania:** Mieszkaniec | Wiek 15+',
          inline: true,
        },
        {
          name: '🚑 EMS — Ratownictwo Medyczne',
          value: 'Ratuj życie graczy. Jesteś niezbędny po każdej akcji!\n**Wymagania:** Mieszkaniec | Wiek 14+',
          inline: true,
        },
        {
          name: '🚒 Straż Pożarna',
          value: 'Gaszenie pożarów, akcje ratownicze. Ważna i ceniona służba.\n**Wymagania:** Mieszkaniec | Wiek 14+',
          inline: true,
        },
        {
          name: '🛡️ Straż Miejska',
          value: 'Pilnowanie porządku, mandatowanie. Dobry start dla nowych!\n**Wymagania:** Mieszkaniec | Wiek 13+',
          inline: true,
        },
        {
          name: '🚧 DOT — Departament Transportu',
          value: 'Infrastruktura drogowa, znaki, naprawy. Praca techniczna.\n**Wymagania:** Mieszkaniec | Prawo jazdy Kat. C',
          inline: true,
        },
        {
          name: '💼 Praca cywilna',
          value: 'Taksówkarz, mechanik, biznesmen i 70+ innych zawodów!\n**Komenda:** `/wybierz-prace`',
          inline: true,
        },
        {
          name: '📝 Jak złożyć podanie?',
          value: '1️⃣ Użyj komendy `/lista-prac` lub `/wybierz-prace`\n2️⃣ Przejdź do kanału **#podania-o-służbę**\n3️⃣ Wybierz służbę i wypełnij formularz\n4️⃣ Poczekaj na decyzję HR (max 48h)',
          inline: false,
        },
      )
      .setFooter({ text: 'AURORA Greenville RP — Praca i Służby' })
      .setTimestamp();
    await c.send({ embeds: [embed] });
  });

  return { sent, failed };
}

// ── Entry ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📨 AURORA Greenville RP — Standalone Embed Runner');
  console.log('='.repeat(50));

  client.once('ready', async () => {
    try {
      console.log(`✅ Bot zalogowany jako: ${client.user.tag}`);

      const guildId = process.env.DISCORD_GUILD_ID;
      const guild = await client.guilds.fetch(guildId).catch(() => null);

      if (!guild) {
        console.error(`❌ Nie znaleziono serwera: ${guildId}`);
        process.exit(1);
      }

      await guild.channels.fetch();
      console.log(`📡 Serwer: ${guild.name} | Kanały: ${guild.channels.cache.size}`);

      const { sent, failed } = await sendEmbeds(guild);

      console.log('\n' + '='.repeat(50));
      if (failed.length === 0) {
        console.log(`🎉 GOTOWE! Wysłano embedy do ${sent.length}/12 kanałów.`);
      } else {
        console.log(`⚠️  Wysłano ${sent.length}/12 — ${failed.length} błędów:`);
        failed.forEach(f => console.log('  ', f));
      }
      console.log('='.repeat(50));
      if (sent.length > 0) {
        console.log('\nWysłano:');
        sent.forEach(s => console.log(' ', s));
      }
    } catch (e) {
      console.error('❌ Błąd:', e.message);
      console.error(e.stack);
      process.exitCode = 1;
    } finally {
      client.destroy();
    }
  });

  client.on('error', err => console.error('❌ Discord error:', err.message));

  console.log('🔌 Łączenie z Discord...');
  await client.login(process.env.DISCORD_TOKEN);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
