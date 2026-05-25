// Komenda /pomoc — lista komend bota (dynamiczna, zawsze aktualna)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');

// Kategorie komend i ich opisy — mapowanie nazwy komendy → opis + kategoria
const CMD_META = {
  // ── Postać RP ──
  'me':                  { opis: 'Opisz czynność swojej postaci (akcja IC/RP)',          kat: '🪪 Postać RP' },
  'do':                  { opis: 'Opisz otoczenie lub stan sceny (środowisko RP)',        kat: '🪪 Postać RP' },
  'dowod':               { opis: 'Wyświetl swój dowód osobisty',                        kat: '🪪 Postać RP' },
  'profil':              { opis: 'Pełny profil gracza RP',                              kat: '🪪 Postać RP' },
  'statystyki':          { opis: 'Statystyki RP (warny, mandaty, pojazdy...)',           kat: '🪪 Postać RP' },
  // ── Pojazdy ──
  'moje-pojazdy':        { opis: 'Lista Twoich pojazdów',                               kat: '🚗 Pojazdy' },
  'pojazd-info':         { opis: 'Informacje o konkretnym pojeździe',                   kat: '🚗 Pojazdy' },
  'usun-pojazd':         { opis: 'Usuń pojazd z rejestru',                              kat: '🚗 Pojazdy' },
  'sprawdz-prawo-jazdy': { opis: 'Sprawdź swoje prawa jazdy',                           kat: '🪪 Prawo jazdy' },
  // ── Mandaty ──
  'historia-mandatow':   { opis: 'Historia Twoich mandatów i grzywien',                 kat: '📜 Mandaty' },
  // ── Telefon RP ──
  'moj-numer':           { opis: 'Sprawdź swój numer RP',                               kat: '📱 Telefon RP' },
  'numer-info':          { opis: 'Sprawdź właściciela numeru',                          kat: '📱 Telefon RP' },
  'sms':                 { opis: 'Wyślij SMS do gracza',                                kat: '📱 Telefon RP' },
  'zadzwon':             { opis: 'Zadzwoń do gracza',                                   kat: '📱 Telefon RP' },
  // ── Praca RP ──
  'wybierz-prace':       { opis: 'Wybierz lub zmień swoją pracę RP',                   kat: '💼 Praca RP' },
  'moja-praca':          { opis: 'Sprawdź swoją aktualną pracę',                        kat: '💼 Praca RP' },
  'lista-prac':          { opis: 'Przeglądaj wszystkie dostępne prace',                 kat: '💼 Praca RP' },
  'ranking-prac':        { opis: 'Ranking najpopularniejszych prac',                    kat: '💼 Praca RP' },
  'anuluj-podanie':      { opis: 'Anuluj oczekujące podanie o służbę',                  kat: '💼 Praca RP' },
  // ── Muzyka ──
  'play':                { opis: 'Odtwórz muzykę (YouTube)',                            kat: '🎵 Muzyka' },
  'radio':               { opis: 'Włącz radio serwera',                                kat: '🎵 Muzyka' },
  'queue':               { opis: 'Kolejka utworów',                                    kat: '🎵 Muzyka' },
  'skip':                { opis: 'Pomiń aktualny utwór',                               kat: '🎵 Muzyka' },
  'stop':                { opis: 'Zatrzymaj muzykę',                                   kat: '🎵 Muzyka' },
  // ── Sesje RP ──
  'sesja':               { opis: 'Stwórz nową sesję RP',                               kat: '🎪 Sesje RP' },
  'sesja-start':         { opis: 'Rozpocznij sesję',                                   kat: '🎪 Sesje RP' },
  'sesja-koniec':        { opis: 'Zakończ sesję',                                      kat: '🎪 Sesje RP' },
  'peacetime':           { opis: 'Ustaw czas pokoju na sesji',                         kat: '🎪 Sesje RP' },
  'taryfikator':         { opis: 'Pokaż taryfikator kar RP',                           kat: '🎪 Sesje RP' },
  // ── Służby ──
  'duty':                { opis: 'Wejdź/wyjdź ze służby',                              kat: '🚔 Służby' },
  'patrol':              { opis: 'Zacznij/zakończ patrol',                             kat: '🚔 Służby' },
  'zatrzymaj':           { opis: 'Zatrzymaj gracza (Policja)',                          kat: '🚔 Służby' },
  'zwolnij':             { opis: 'Zwolnij zatrzymanego (Policja)',                      kat: '🚔 Służby' },
  'sprawdz-tablice':     { opis: 'Sprawdź właściciela tablic (Policja)',                kat: '🚔 Służby' },
  'bolo':                { opis: 'Wystaw BOLO (Policja)',                               kat: '🚔 Służby' },
  'kod-10':              { opis: 'Wyślij kod radiowy (Służby)',                         kat: '🚔 Służby' },
  'recydywa':            { opis: 'Sprawdź recydywę gracza',                            kat: '🚔 Służby' },
  // ── Ogólne ──
  'pomoc':               { opis: 'Lista komend bota',                                  kat: '📋 Ogólne' },
  'ping':                { opis: 'Sprawdź opóźnienie bota',                            kat: '📋 Ogólne' },
  'czas':                { opis: 'Aktualny czas RP na serwerze',                       kat: '📋 Ogólne' },
  'pogoda':              { opis: 'Aktualna pogoda RP w Greenville (spójna dla sesji)',  kat: '📋 Ogólne' },
  'userinfo':            { opis: 'Info o użytkowniku Discord i profilu RP',             kat: '📋 Ogólne' },
  'avatar':              { opis: 'Wyświetl avatar gracza',                              kat: '📋 Ogólne' },
  'serwer-info':         { opis: 'Informacje o serwerze Discord',                      kat: '📋 Ogólne' },
  'regulamin':           { opis: 'Pokaż regulamin serwera',                            kat: '📋 Ogólne' },
  'slownik':             { opis: 'Słownik terminologii RP (FRP, MG, BOLO...)',          kat: '📋 Ogólne' },
  'zglos':               { opis: 'Zgłoś problem lub otwórz ticket',                    kat: '📋 Ogólne' },
};

const STAFF_CMDS = [
  { cmd: '/warn',           opis: 'Ostrzeż gracza (auto-mute/ban)' },
  { cmd: '/ostrzezenia',    opis: 'Historia ostrzeżeń i kar gracza' },
  { cmd: '/ban',            opis: 'Zbanuj gracza' },
  { cmd: '/kick',           opis: 'Wyrzuć gracza' },
  { cmd: '/mute',           opis: 'Wycisz gracza' },
  { cmd: '/unban',          opis: 'Odbanuj gracza' },
  { cmd: '/unmute',         opis: 'Odcisz gracza' },
  { cmd: '/notatka',        opis: 'Dodaj notatkę moderacyjną' },
  { cmd: '/lookup',         opis: 'Szczegółowe info o graczu' },
  { cmd: '/historia',       opis: 'Historia moderacyjna gracza' },
  { cmd: '/clearwarns',     opis: 'Wyczyść warny gracza' },
  { cmd: '/clear',          opis: 'Usuń wiadomości z kanału' },
  { cmd: '/slowmode',       opis: 'Ustaw slowmode kanału' },
  { cmd: '/nick',           opis: 'Zmień pseudonim gracza' },
  { cmd: '/announce',       opis: 'Wyślij ogłoszenie (embed)' },
  { cmd: '/embed',          opis: 'Wyślij własny embed do kanału' },
  { cmd: '/poll',           opis: 'Utwórz ankietę z opcjami' },
  { cmd: '/role',           opis: 'Dodaj/usuń rolę graczowi' },
  { cmd: '/panel',          opis: 'Panel staffu — szybki przegląd' },
  { cmd: '/raport',         opis: 'Pełny raport aktywności serwera' },
  { cmd: '/giveaway',       opis: 'Zarządzaj losowaniami (start/end/reroll)' },
  { cmd: '/nagroda',        opis: 'Przyznaj nagrodę pieniężną graczowi' },
  { cmd: '/transfer-masowy', opis: 'Masowa wypłata dla graczy z rolą' },
  { cmd: '/sprawdz-dowod',  opis: 'Sprawdź dowód gracza' },
  { cmd: '/mandat',         opis: 'Wystaw mandat RP' },
  { cmd: '/cofnij-mandat',  opis: 'Cofnij mandat RP' },
  { cmd: '/ustaw-prace',    opis: 'Ręcznie ustaw pracę gracza' },
  { cmd: '/rozpatrz-podanie', opis: 'Rozpatrz podanie o pracę służbową' },
  { cmd: '/maintenance',    opis: 'Włącz/wyłącz tryb konserwacji' },
  { cmd: '/konfiguracja',   opis: 'Ustawienia bota (Co-Owner+)' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pomoc')
    .setDescription('Lista wszystkich dostępnych komend bota')
    .addBooleanOption(opt =>
      opt.setName('staff')
        .setDescription('Pokaż też komendy staffu (widoczne tylko dla Ciebie)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const showStaff = interaction.options.getBoolean('staff') ?? false;

    // Grupuj komendy po kategorii
    const grouped = {};
    for (const [name, meta] of Object.entries(CMD_META)) {
      if (!grouped[meta.kat]) grouped[meta.kat] = [];
      grouped[meta.kat].push(`\`/${name}\` — ${meta.opis}`);
    }

    const embeds = [];

    // Główny embed
    const mainEmbed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('📖 Pomoc — AURORA Greenville RP')
      .setDescription(
        '🏙️ Witaj w AURORA Greenville RP! Poniżej znajdziesz listę komend bota.\n' +
        'Użyj `/` w oknie wpisywania, aby zobaczyć wszystkie komendy z opisami.\n\n' +
        '**Legenda:** 🪪 Postać | 🚗 Pojazdy | 💰 Ekonomia | 💼 Praca | 🎪 Sesje | 🚔 Służby'
      )
      .setFooter({ text: `AURORA Greenville RP — ${client.commands.size} komend zarejestrowanych` })
      .setTimestamp();

    for (const [kat, cmds] of Object.entries(grouped)) {
      const value = cmds.join('\n');
      if (value.length <= 1024) {
        mainEmbed.addFields({ name: kat, value, inline: false });
      }
    }

    embeds.push(mainEmbed);

    // Staff embed (osobny)
    if (showStaff) {
      const staffEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🛡️ Komendy Staffu — AURORA Greenville RP')
        .setDescription('Dostępne wyłącznie dla Helper+ / Co-Owner+ / Owner')
        .addFields({
          name: '⚖️ Moderacja & Zarządzanie',
          value: STAFF_CMDS.map(c => `\`${c.cmd}\` — ${c.opis}`).join('\n'),
          inline: false,
        })
        .setFooter({ text: 'AURORA Greenville RP — Staff Commands' })
        .setTimestamp();

      embeds.push(staffEmbed);
    }

    await interaction.editReply({ embeds });
  },
};
