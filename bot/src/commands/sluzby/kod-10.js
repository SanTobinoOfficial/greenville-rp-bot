// Komenda /kod-10 — wyświetla kody radiowe policji (10-kody)
// Dostępna dla służb mundurowych i Staffu

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');

// Kompletna lista 10-kodów radiowych policji
const KODY = [
  { kod: '10-0',  opis: 'Ostrożnie — niebezpiecznie',              cat: 'STATUS' },
  { kod: '10-1',  opis: 'Słaby odbiór radiowy',                     cat: 'RADIO'  },
  { kod: '10-2',  opis: 'Dobry odbiór radiowy',                     cat: 'RADIO'  },
  { kod: '10-3',  opis: 'Stop transmisji',                          cat: 'RADIO'  },
  { kod: '10-4',  opis: 'Potwierdzam / Odbiór',                     cat: 'RADIO'  },
  { kod: '10-5',  opis: 'Przekaż wiadomość do...',                  cat: 'RADIO'  },
  { kod: '10-6',  opis: 'Zajęty — zadzwoń kiedy wolny',             cat: 'STATUS' },
  { kod: '10-7',  opis: 'Wyłączam się / Koniec służby',             cat: 'STATUS' },
  { kod: '10-8',  opis: 'Jestem dostępny / Gotowy do akcji',        cat: 'STATUS' },
  { kod: '10-9',  opis: 'Powtórz transmisję',                       cat: 'RADIO'  },
  { kod: '10-10', opis: 'Pauza w służbie',                          cat: 'STATUS' },
  { kod: '10-11', opis: 'Wysyłanie na stację',                      cat: 'STATUS' },
  { kod: '10-12', opis: 'Obecność wyższego stopnia',                cat: 'STATUS' },
  { kod: '10-13', opis: 'Warunki pogodowe i drogowe',               cat: 'INFO'   },
  { kod: '10-14', opis: 'Eskorta pojazdu',                          cat: 'AKCJA'  },
  { kod: '10-15', opis: 'Zatrzymany pasażer w radiowozie',          cat: 'AKCJA'  },
  { kod: '10-16', opis: 'Odbierz zatrzymanego',                     cat: 'AKCJA'  },
  { kod: '10-17', opis: 'Pilna sprawa',                             cat: 'AKCJA'  },
  { kod: '10-18', opis: 'Wykonaj niezwłocznie',                     cat: 'AKCJA'  },
  { kod: '10-19', opis: 'Wróć na stację',                           cat: 'STATUS' },
  { kod: '10-20', opis: 'Podaj swoje położenie',                    cat: 'LOC'    },
  { kod: '10-21', opis: 'Zadzwoń telefonicznie',                    cat: 'RADIO'  },
  { kod: '10-22', opis: 'Anuluj ostatnie rozkazy',                  cat: 'AKCJA'  },
  { kod: '10-23', opis: 'Stoję przy miejscu zdarzenia',             cat: 'LOC'    },
  { kod: '10-24', opis: 'Zakończono akcję',                         cat: 'STATUS' },
  { kod: '10-25', opis: 'Skontaktuj się ze mną',                    cat: 'RADIO'  },
  { kod: '10-26', opis: 'Sprawdzam tablice rejestracyjne',          cat: 'AKCJA'  },
  { kod: '10-27', opis: 'Sprawdzam prawo jazdy',                    cat: 'AKCJA'  },
  { kod: '10-28', opis: 'Sprawdzam pojazd w bazie',                 cat: 'AKCJA'  },
  { kod: '10-29', opis: 'Sprawdzam osobę w bazie NCIC',             cat: 'AKCJA'  },
  { kod: '10-30', opis: 'Fałszywy alarm',                           cat: 'INFO'   },
  { kod: '10-31', opis: 'Napad w toku',                             cat: 'ALARM'  },
  { kod: '10-32', opis: 'Uzbrojony przestępca',                     cat: 'ALARM'  },
  { kod: '10-33', opis: 'ALARM! Pilna pomoc potrzebna!',            cat: 'ALARM'  },
  { kod: '10-34', opis: 'Zamieszki',                                cat: 'ALARM'  },
  { kod: '10-35', opis: 'Poufna informacja',                        cat: 'INFO'   },
  { kod: '10-36', opis: 'Aktualny czas',                            cat: 'INFO'   },
  { kod: '10-37', opis: 'Podejrzany pojazd',                        cat: 'ALARM'  },
  { kod: '10-38', opis: 'Zatrzymanie pojazdu',                      cat: 'AKCJA'  },
  { kod: '10-39', opis: 'Użyj sygnalizacji alarmowej',              cat: 'AKCJA'  },
  { kod: '10-40', opis: 'Cicho — bez sygnałów',                     cat: 'AKCJA'  },
  { kod: '10-41', opis: 'Obejmij służbę',                           cat: 'STATUS' },
  { kod: '10-42', opis: 'Zakończ służbę',                           cat: 'STATUS' },
  { kod: '10-43', opis: 'Wypadek drogowy (bez rannych)',            cat: 'AKCJA'  },
  { kod: '10-44', opis: 'Wypadek drogowy (z rannymi)',              cat: 'ALARM'  },
  { kod: '10-50', opis: 'Wypadek drogowy',                          cat: 'AKCJA'  },
  { kod: '10-70', opis: 'Pościg',                                   cat: 'ALARM'  },
  { kod: '10-71', opis: 'Strzelanina',                              cat: 'ALARM'  },
  { kod: '10-80', opis: 'Pościg aktywny',                           cat: 'ALARM'  },
  { kod: '10-97', opis: 'Dotarłem na miejsce zdarzenia',            cat: 'LOC'    },
  { kod: '10-98', opis: 'Więzień zwolniony',                        cat: 'STATUS' },
  { kod: '10-99', opis: 'Funkcjonariusz w potrzebie — PILNE!',      cat: 'ALARM'  },
];

const CATEGORIES = {
  STATUS: { label: '🟢 Statusy służby',   color: 0x57F287 },
  RADIO:  { label: '📻 Komunikacja radio', color: 0x5865F2 },
  AKCJA:  { label: '🚔 Akcje terenowe',    color: 0xFEE75C },
  LOC:    { label: '📍 Lokalizacja',        color: 0x3498DB },
  INFO:   { label: 'ℹ️ Informacje',          color: 0xEB459E },
  ALARM:  { label: '🚨 Alarmy',             color: 0xED4245 },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kod-10')
    .setDescription('Wyświetl kody radiowe policji (10-kody)')
    .addStringOption(opt =>
      opt.setName('kategoria')
        .setDescription('Wybierz kategorię kodów')
        .setRequired(false)
        .addChoices(
          { name: '📋 Wszystkie kody', value: 'all' },
          { name: '🚨 Alarmy (priorytet)',  value: 'ALARM'  },
          { name: '🚔 Akcje terenowe',      value: 'AKCJA'  },
          { name: '🟢 Statusy służby',      value: 'STATUS' },
          { name: '📻 Komunikacja radio',   value: 'RADIO'  },
          { name: '📍 Lokalizacja',          value: 'LOC'    },
        )
    )
    .addStringOption(opt =>
      opt.setName('szukaj')
        .setDescription('Szukaj konkretnego kodu (np. "10-33" lub "pościg")')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const kategoria = interaction.options.getString('kategoria') ?? 'all';
    const szukaj    = interaction.options.getString('szukaj');

    let filtered = [...KODY];

    if (szukaj) {
      const q = szukaj.toLowerCase();
      filtered = KODY.filter(k =>
        k.kod.toLowerCase().includes(q) ||
        k.opis.toLowerCase().includes(q)
      );

      if (filtered.length === 0) {
        return interaction.editReply({
          content: `❌ Nie znaleziono kodu dla frazy: **${szukaj}**`,
        });
      }
    } else if (kategoria !== 'all') {
      filtered = KODY.filter(k => k.cat === kategoria);
    }

    const embeds = [];

    if (kategoria === 'all' && !szukaj) {
      // Grupuj po kategoriach
      for (const [catKey, catData] of Object.entries(CATEGORIES)) {
        const codes = filtered.filter(k => k.cat === catKey);
        if (!codes.length) continue;

        const lines = codes.map(k => `\`${k.kod}\` — ${k.opis}`).join('\n');
        embeds.push(
          new EmbedBuilder()
            .setColor(catData.color)
            .setTitle(catData.label)
            .setDescription(lines)
            .setFooter({ text: 'AURORA Greenville RP — Kody Radiowe Policji' })
        );
      }
    } else {
      const catData = CATEGORIES[kategoria] ?? CATEGORIES.STATUS;
      const lines = filtered.map(k => `\`${k.kod}\` — ${k.opis}`).join('\n');
      embeds.push(
        new EmbedBuilder()
          .setColor(catData.color)
          .setTitle(szukaj ? `🔍 Wyniki dla: "${szukaj}"` : catData.label)
          .setDescription(lines)
          .setFooter({ text: 'AURORA Greenville RP — Kody Radiowe Policji' })
          .setTimestamp()
      );
    }

    // Max 10 embedów na raz
    await interaction.editReply({ embeds: embeds.slice(0, 10) });
  },
};
