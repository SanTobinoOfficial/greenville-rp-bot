// Komenda /pomoc — lista wszystkich dostępnych komend
// Dostępna dla: wszystkich

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');

const COMMANDS = [
  // Postać
  { cmd: '/dowod',         opis: 'Wyświetl swój dowód osobisty',                    kategoria: '🪪 Postać RP' },
  { cmd: '/profil',        opis: 'Pełny profil gracza RP',                          kategoria: '🪪 Postać RP' },
  { cmd: '/statystyki',    opis: 'Statystyki RP (warny, mandaty, pojazdy...)',       kategoria: '🪪 Postać RP' },
  // Pojazdy
  { cmd: '/moje-pojazdy',  opis: 'Lista Twoich zarejestrowanych pojazdów',          kategoria: '🚗 Pojazdy' },
  { cmd: '/pojazd-info',   opis: 'Informacje o konkretnym pojeździe',               kategoria: '🚗 Pojazdy' },
  { cmd: '/usun-pojazd',   opis: 'Usuń pojazd z rejestru',                          kategoria: '🚗 Pojazdy' },
  // Prawo jazdy
  { cmd: '/sprawdz-prawo-jazdy', opis: 'Sprawdź swoje prawa jazdy',                kategoria: '🪪 Prawo jazdy' },
  // Mandaty
  { cmd: '/historia-mandatow', opis: 'Historia Twoich mandatów i grzywien',        kategoria: '📜 Mandaty' },
  // Telefon
  { cmd: '/moj-numer',     opis: 'Sprawdź swój numer RP',                           kategoria: '📱 Telefon RP' },
  { cmd: '/numer-info',    opis: 'Sprawdź właściciela numeru',                      kategoria: '📱 Telefon RP' },
  { cmd: '/sms',           opis: 'Wyślij SMS do innego gracza',                     kategoria: '📱 Telefon RP' },
  { cmd: '/zadzwon',       opis: 'Zadzwoń do innego gracza',                        kategoria: '📱 Telefon RP' },
  // Muzyka
  { cmd: '/play',          opis: 'Odtwórz muzykę (YouTube)',                        kategoria: '🎵 Muzyka' },
  { cmd: '/radio',         opis: 'Włącz radio serwera',                             kategoria: '🎵 Muzyka' },
  { cmd: '/queue',         opis: 'Kolejka utworów',                                 kategoria: '🎵 Muzyka' },
  { cmd: '/skip',          opis: 'Pomiń aktualny utwór',                            kategoria: '🎵 Muzyka' },
  { cmd: '/stop',          opis: 'Zatrzymaj muzykę',                                kategoria: '🎵 Muzyka' },
  // Służby
  { cmd: '/duty',          opis: 'Wejście/wyjście ze służby',                       kategoria: '🚔 Służby (Staff/Służby)' },
  { cmd: '/zatrzymaj',     opis: 'Zatrzymaj gracza (Policja)',                       kategoria: '🚔 Służby (Staff/Służby)' },
  { cmd: '/zwolnij',       opis: 'Zwolnij zatrzymanego (Policja)',                  kategoria: '🚔 Służby (Staff/Służby)' },
  { cmd: '/sprawdz-tablice', opis: 'Sprawdź właściciela tablicy (Policja)',          kategoria: '🚔 Służby (Staff/Służby)' },
  // Sesje
  { cmd: '/sesja',         opis: 'Stwórz sesję RP',                                 kategoria: '🎪 Sesje RP (Host+)' },
  { cmd: '/sesja-start',   opis: 'Rozpocznij sesję',                                kategoria: '🎪 Sesje RP (Host+)' },
  { cmd: '/sesja-koniec',  opis: 'Zakończ sesję',                                   kategoria: '🎪 Sesje RP (Host+)' },
  { cmd: '/peacetime',     opis: 'Ustaw czas pokoju',                               kategoria: '🎪 Sesje RP (Host+)' },
  // Praca
  { cmd: '/wybierz-prace', opis: 'Wybierz lub zmień swoją pracę RP (76 dostępnych prac)', kategoria: '💼 Praca RP' },
  // Ogólne
  { cmd: '/zglos',         opis: 'Szybkie zgłoszenie / ticket',                     kategoria: '📋 Ogólne' },
  { cmd: '/czas',          opis: 'Aktualny czas RP na serwerze',                    kategoria: '📋 Ogólne' },
  { cmd: '/pomoc',         opis: 'Lista komend bota',                               kategoria: '📋 Ogólne' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pomoc')
    .setDescription('Lista wszystkich komend bota AURORA Greenville RP'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    // Grupuj po kategorii
    const grouped = {};
    for (const c of COMMANDS) {
      if (!grouped[c.kategoria]) grouped[c.kategoria] = [];
      grouped[c.kategoria].push(c);
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('📖 Pomoc — AURORA Greenville RP Bot')
      .setDescription('Lista wszystkich dostępnych komend. Użyj `/` aby zobaczyć szczegóły danej komendy.')
      .setFooter({ text: 'AURORA Greenville RP — Pomoc' })
      .setTimestamp();

    for (const [kategoria, cmds] of Object.entries(grouped)) {
      embed.addFields({
        name: kategoria,
        value: cmds.map(c => `\`${c.cmd}\` — ${c.opis}`).join('\n'),
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
