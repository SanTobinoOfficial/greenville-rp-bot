// Komenda /taryfikator — wyświetla taryfikator kar serwera (kary Discord i kary RP)
// Dostępna dla wszystkich zweryfikowanych graczy

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('taryfikator')
    .setDescription('Wyświetl taryfikator kar serwera AURORA Greenville RP'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const embeds = [
      // ── Kary Discord ──────────────────────────────────────────
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('⚖️ TARYFIKATOR KAR — AURORA Greenville RP')
        .setDescription(
          'Poniżej znajdziesz kompletny taryfikator kar obowiązujący na serwerze. ' +
          'Kary RP i kary Discord są od siebie niezależne.\n\n' +
          '**Recydywa** (ponowne naruszenie w ciągu 30 dni) = kara x2.'
        )
        .addFields(
          {
            name: '🟦 Kategoria NIEBIESKA — Minimalna szkodliwość',
            value: [
              '• Spam, caps lock, OT na kanale → **Upomnienie**',
              '• Pierwsze drobne naruszenie zasad komunikacji → **Mute 1h**',
              '• Niekulturalne zachowanie → **Warn**',
            ].join('\n'),
            inline: false,
          },
          {
            name: '🟩 Kategoria ZIELONA — Niska szkodliwość',
            value: [
              '• FRP (Fail Roleplay) — pierwsze → **Warn + Kick**',
              '• Metagaming jednorazowy → **Warn + Mute 24h**',
              '• Reklama serwera bez zgody → **Kick + Warn**',
              '• Trolling podczas sesji → **Warn + Kick z sesji**',
            ].join('\n'),
            inline: false,
          },
          {
            name: '🟧 Kategoria POMARAŃCZOWA — Wysoka szkodliwość',
            value: [
              '• RDM (jednorazowy) → **Ban 3–7 dni + Warn**',
              '• VDM (jednorazowy) → **Ban 7 dni + Warn**',
              '• Powergaming → **Ban 3 dni + Warn**',
              '• Combat Logging → **Ban 7 dni**',
              '• Metagaming systemowy → **Ban 14 dni**',
              '• 3 aktywne warny → **Auto-mute 1h**',
            ].join('\n'),
            inline: false,
          },
          {
            name: '🟥 Kategoria CZERWONA — Krytyczna szkodliwość',
            value: [
              '• Exploiting / Cheating → **Permanentny ban**',
              '• Ban Evasion (obejście bana) → **Permanentny ban**',
              '• Doxxing → **Permanentny ban**',
              '• Treści NSFW/+18 → **Permanentny ban**',
              '• 5 aktywnych warnów → **Auto-ban** (czas decyzji Admina)',
              '• Nagminne naruszenia → **Permanentny ban**',
            ].join('\n'),
            inline: false,
          },
        )
        .setFooter({ text: 'AURORA Greenville RP — Taryfikator v5.0' })
        .setTimestamp(),

      // ── Kary RP ───────────────────────────────────────────────
      new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🚔 TARYFIKATOR KAR RP — System mandatów')
        .addFields(
          {
            name: '🚗 Wykroczenia drogowe — Mandaty',
            value: [
              '• Przekroczenie prędkości (do 20 mph ponad limit) → **200–500$**',
              '• Przekroczenie prędkości (20–50 mph ponad limit) → **500–2 000$**',
              '• Przekroczenie prędkości (ponad 50 mph) → **2 000–5 000$**',
              '• Jazda pod wpływem alkoholu → **5 000$**',
              '• Brak rejestracji pojazdu → **1 000$**',
              '• Jazda bez prawa jazdy → **3 000$ + konfiskata pojazdu**',
              '• Niezatrzymanie się do kontroli → **2 000$**',
              '• Parkowanie w zakazie → **500$**',
              '• Brak OC pojazdu → **1 500$**',
            ].join('\n'),
            inline: false,
          },
          {
            name: '⚖️ Przestępstwa — Grzywny i Areszty',
            value: [
              '• Zakłócenie porządku publicznego → **Grzywna 2 000$**',
              '• Atak na funkcjonariusza → **Grzywna 10 000$ + Areszt 2h**',
              '• Napad na osobę → **Grzywna 8 000$ + Areszt 4h**',
              '• Napad na sklep → **Grzywna 25 000$ + Areszt 8h**',
              '• Udział w napadzie na bank → **Grzywna 50 000$ + Areszt 24h**',
              '• Nielegalne posiadanie broni → **Grzywna 15 000$ + Areszt 6h**',
              '• Handel narkotykami → **Grzywna 30 000$ + Areszt 12h**',
              '• Ucieczka przed policją → **Grzywna 5 000$**',
            ].join('\n'),
            inline: false,
          },
          {
            name: '🚘 Konsekwencje skumulowane',
            value: [
              '**10 mandatów** aktywnych → Zawieszenie PJ na **30 dni**',
              '**5 grzywien** aktywnych → Zawieszenie PJ na **30 dni**',
              '**5 aresztów** aktywnych → Zawieszenie PJ na **30 dni**',
              'Po zawieszeniu PJ możliwy egzamin przywracający uprawnienia.',
            ].join('\n'),
            inline: false,
          },
        )
        .setFooter({ text: 'AURORA Greenville RP — Taryfikator RP v5.0 | Mandaty mogą być negocjowane przez adwokata RP' })
        .setTimestamp(),
    ];

    await interaction.editReply({ embeds });
  },
};
