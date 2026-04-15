// setupEmbeds.js — wysyła embedy startowe po setup serwera
// Weryfikacja (nowy system in-Discord), tickety, rejestracja pojazdów, prawo jazdy itd.

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const logger = require('../utils/logger');

// Pomocnik: znajdź kanał tekstowy po nazwie
function ch(guild, name) {
  return guild.channels.cache.find(c => c.name === name && c.isTextBased());
}

// ─── Embedy ───────────────────────────────────────────────────────────────────

async function setupEmbeds(guild) {
  logger.info('📨 setupEmbeds: start');

  // ── 1. #zacznij-tutaj — weryfikacja (formularz webowy) ──────────────────────
  const verifyChannel = ch(guild, '📋│zacznij-tutaj');
  if (verifyChannel) {
    const embed = new EmbedBuilder()
      .setColor(0x30d158)
      .setTitle('✅ Witaj w AURORA Greenville RP!')
      .setDescription(
        '**AURORA Greenville RP** to polski serwer Roleplay na Roblox.\n' +
        'Aby uzyskać dostęp do serwera, wypełnij formularz weryfikacyjny.\n\n' +
        '**Jak przebiega weryfikacja?**\n' +
        '> 📋 Wejdź na formularz pod linkiem poniżej\n' +
        '> 🔗 Podaj swój **Discord ID** oraz **nick Roblox**\n' +
        '> ❓ Odpowiedz na **10 pytań** z regulaminu serwera\n' +
        '> ✅ Uzyskaj minimum **8/10 punktów**\n' +
        '> 🏠 Rola **Mieszkaniec** zostanie nadana automatycznie!\n\n' +
        '**Jak znaleźć swoje Discord ID?**\n' +
        '> Ustawienia → Zaawansowane → włącz **Tryb dewelopera**\n' +
        '> Kliknij prawym na swój nick → **Kopiuj ID użytkownika**\n\n' +
        '**Zanim zaczniesz:**\n' +
        '• Przeczytaj regulamin na kanale <#regulamin>\n' +
        '• Zapoznaj się z pojęciami RP (FRP, NLR, metagaming)\n\n' +
        '*Kliknij przycisk poniżej, aby otworzyć formularz!*'
      )
      .setFooter({ text: 'AURORA Greenville RP — System weryfikacji' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setURL('https://greenville-rp-bot.vercel.app/weryfikacja')
        .setLabel('📋 Wypełnij formularz weryfikacyjny')
        .setStyle(ButtonStyle.Link)
    );

    await verifyChannel.send({ embeds: [embed], components: [row] }).catch(e =>
      logger.error('Błąd wysyłania embeda weryfikacji:', e)
    );
    logger.info('  ✅ #zacznij-tutaj');
  }

  // ── 2. #regulamin ────────────────────────────────────────────────────────────
  const regulaminChannel = ch(guild, '❗│regulamin');
  if (regulaminChannel) {
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('📜 Regulamin AURORA Greenville RP')
      .setDescription(
        '**§1 — Zasady ogólne**\n' +
        '> • Szanuj innych graczy i staff\n' +
        '> • Obowiązuje język polski\n' +
        '> • Zakaz reklamy innych serwerów\n' +
        '> • Zakaz spamu i floodowania\n\n' +
        '**§2 — Zasady Roleplay**\n' +
        '> • **FRP** (Fail RP) — zachowania niezgodne z realizmem są zabronione\n' +
        '> • **NLR** (New Life Rule) — po śmierci zapominasz wszystko z poprzedniego życia\n' +
        '> • **Metagaming** — używanie informacji z zewnątrz (Discord, stream) jest zabronione\n' +
        '> • **RDM** (Random Death Match) — zabijanie bez powodu RP jest zabronione\n' +
        '> • **VDM** (Vehicle Death Match) — potrącanie samochodem bez powodu jest zabronione\n\n' +
        '**§3 — Służby**\n' +
        '> • Wykonuj polecenia przełożonych\n' +
        '> • Nie nadużywaj uprawnień służbowych\n' +
        '> • Zgłoś nieobecność z wyprzedzeniem\n\n' +
        '**§4 — Sankcje**\n' +
        '> • Warn → Kick → Ban (czas do decyzji staffu)\n' +
        '> • Poważne naruszenia skutkują natychmiastowym banem\n\n' +
        '*Nieznajomość regulaminu nie zwalnia z odpowiedzialności.*'
      )
      .setFooter({ text: 'AURORA Greenville RP — Regulamin' })
      .setTimestamp();

    await regulaminChannel.send({ embeds: [embed] }).catch(e =>
      logger.error('Błąd wysyłania regulaminu:', e)
    );
    logger.info('  ✅ #regulamin');
  }

  // ── 3. #słownik-rp ───────────────────────────────────────────────────────────
  const slownikChannel = ch(guild, '📖│słownik-rp');
  if (slownikChannel) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📖 Słownik pojęć RP')
      .setDescription(
        '**Podstawowe skróty i pojęcia:**\n\n' +
        '🔴 **FRP** — Fail Role Play — zachowanie łamiące realizm RP\n' +
        '🔴 **RDM** — Random Death Match — zabójstwo bez powodu RP\n' +
        '🔴 **VDM** — Vehicle Death Match — potrącenie samochodem bez powodu\n' +
        '🔴 **NLR** — New Life Rule — po śmierci nie pamiętasz nic z poprzedniego życia\n' +
        '🔴 **Metagaming** — używanie wiedzy zdobytej poza postacią (np. z Discorda)\n\n' +
        '🟡 **IC** — In Character — rozmawiasz jako postać (nie jako ty)\n' +
        '🟡 **OOC** — Out of Character — rozmowa poza roleplay (np. przez /ooc)\n' +
        '🟡 **Powertaming** — narzucanie działań innej postaci siłą\n' +
        '🟡 **Godmodding** — granie niezniszczalną postacią\n\n' +
        '🟢 **IC imię** — imię twojej postaci RP\n' +
        '🟢 **PESEL** — numer identyfikacyjny postaci w RP\n' +
        '🟢 **Służby** — Policja, EMS, Straż Pożarna, DOT, Straż Miejska, Taksówkarz\n' +
        '🟢 **Sesja** — zorganizowany czas gry RP na serwerze Roblox'
      )
      .setFooter({ text: 'AURORA Greenville RP — Słownik RP' });

    await slownikChannel.send({ embeds: [embed] }).catch(e =>
      logger.error('Błąd wysyłania słownika:', e)
    );
    logger.info('  ✅ #słownik-rp');
  }

  // ── 4. #otwórz-ticket ────────────────────────────────────────────────────────
  const ticketChannel = ch(guild, '🎫│otwórz-ticket');
  if (ticketChannel) {
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

    await ticketChannel.send({ embeds: [embed], components: [row] }).catch(e =>
      logger.error('Błąd wysyłania ticketu:', e)
    );
    logger.info('  ✅ #otwórz-ticket');
  }

  // ── 5. #stwórz-postać ────────────────────────────────────────────────────────
  const postacChannel = ch(guild, '🪪│stwórz-postać');
  if (postacChannel) {
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

    await postacChannel.send({ embeds: [embed], components: [row] }).catch(e =>
      logger.error('Błąd wysyłania embeda postaci:', e)
    );
    logger.info('  ✅ #stwórz-postać');
  }

  // ── 6. #prawo-jazdy ──────────────────────────────────────────────────────────
  const prawoChannel = ch(guild, '📋│prawo-jazdy');
  if (prawoChannel) {
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
        '**Komenda:** `/prawojazdy egzamin [kategoria]`\n\n' +
        '*Egzamin składa się z 10 pytań — wymagane 8/10.*'
      )
      .setFooter({ text: 'AURORA Greenville RP — Prawo jazdy' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('license_apply')
        .setLabel('📋 Przystąp do egzaminu')
        .setStyle(ButtonStyle.Primary)
    );

    await prawoChannel.send({ embeds: [embed], components: [row] }).catch(e =>
      logger.error('Błąd wysyłania embeda prawa jazdy:', e)
    );
    logger.info('  ✅ #prawo-jazdy');
  }

  // ── 7. #rejestracja-auta ─────────────────────────────────────────────────────
  const autoChannel = ch(guild, '🚗│rejestracja-auta');
  if (autoChannel) {
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
        '**Komenda:** `/pojazd rejestruj`'
      )
      .setFooter({ text: 'AURORA Greenville RP — Pojazdy' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('vehicle_register')
        .setLabel('🚗 Zarejestruj pojazd')
        .setStyle(ButtonStyle.Secondary)
    );

    await autoChannel.send({ embeds: [embed], components: [row] }).catch(e =>
      logger.error('Błąd wysyłania embeda pojazdu:', e)
    );
    logger.info('  ✅ #rejestracja-auta');
  }

  // ── 8. #rola-powiadomień ─────────────────────────────────────────────────────
  const notifChannel = ch(guild, '🔔│rola-powiadomień');
  if (notifChannel) {
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

    await notifChannel.send({ embeds: [embed], components: [row] }).catch(e =>
      logger.error('Błąd wysyłania embeda powiadomień:', e)
    );
    logger.info('  ✅ #rola-powiadomień');
  }

  // ── 9. #faq ──────────────────────────────────────────────────────────────────
  const faqChannel = ch(guild, '❓│faq');
  if (faqChannel) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('❓ Najczęściej zadawane pytania')
      .setDescription(
        '**Jak dołączyć do serwera RP?**\n' +
        '> Wejdź na kanał <#zacznij-tutaj> i kliknij **Wypełnij formularz weryfikacyjny**.\n\n' +
        '**Ile mam czasu na formularz?**\n' +
        '> Nie ma limitu czasu. Po nieudanej próbie odczekaj 24 godziny.\n\n' +
        '**Jak zmienić nick Roblox?**\n' +
        '> Otwórz ticket — staff pomoże zmienić powiązanie.\n\n' +
        '**Kiedy są sesje?**\n' +
        '> Sprawdź kanał <#plan-sesji> lub włącz powiadomienia na <#rola-powiadomień>.\n\n' +
        '**Jak dołączyć do służb?**\n' +
        '> Złóż podanie na kanale <#podania-o-służbę>.\n\n' +
        '**Mam problem z botem — co robić?**\n' +
        '> Otwórz ticket na <#otwórz-ticket>.'
      )
      .setFooter({ text: 'AURORA Greenville RP — FAQ' });

    await faqChannel.send({ embeds: [embed] }).catch(e =>
      logger.error('Błąd wysyłania FAQ:', e)
    );
    logger.info('  ✅ #faq');
  }

  logger.info('✅ setupEmbeds: gotowe');
}

// Eksportuj obie nazwy dla kompatybilności
module.exports = { setupEmbeds, sendSetupEmbeds: setupEmbeds };
