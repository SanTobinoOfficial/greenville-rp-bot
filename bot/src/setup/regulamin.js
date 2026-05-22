// Treść regulaminu AURORA Greenville RP jako embedy Discord
// Czytane dynamicznie z server-config.json — wystarczy edytować config bez zmiany kodu.

const { EmbedBuilder } = require('discord.js');
const path = require('path');

// Wczytaj config dynamicznie (bez cache — zawsze świeże dane)
function getConfig() {
  delete require.cache[require.resolve(path.join(__dirname, '../../../server-config.json'))];
  return require(path.join(__dirname, '../../../server-config.json'));
}

/** Dzieli długi tekst na kawałki mieszczące się w limicie 1024 znaków pola embed */
function splitField(text, limit = 1020) {
  if (text.length <= limit) return [text];
  const lines = text.split('\n');
  const chunks = [];
  let cur = '';
  for (const line of lines) {
    const joined = cur ? cur + '\n' + line : line;
    if (joined.length > limit) {
      if (cur) chunks.push(cur);
      cur = line;
    } else {
      cur = joined;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/**
 * Buduje listę embedów regulaminu na podstawie server-config.json → regulamin.sections
 * Każda sekcja config odpowiada jednemu embedowi Discord.
 */
function buildRegulaminEmbeds() {
  const cfg   = getConfig();
  const reg   = cfg.regulamin;
  const color = parseInt(reg.color.replace('#', ''), 16);

  return reg.sections.map((section, idx) => {
    const embed = new EmbedBuilder()
      .setColor(color)
      .setFooter({ text: reg.footer })
      .setTimestamp();

    // Tytuł i intro tylko na pierwszym embedzie
    if (idx === 0) {
      if (section.title) embed.setTitle(section.title);
      if (section.intro) embed.setDescription(section.intro);
    }

    for (const field of (section.fields ?? [])) {
      const value  = field.rules.map((r, i) => `**${i + 1}.** ${r}`).join('\n');
      const chunks = splitField(value, 1020);
      chunks.forEach((chunk, ci) => {
        embed.addFields({
          name:   ci === 0 ? field.name : `${field.name} (cd.)`,
          value:  chunk,
          inline: false,
        });
      });
    }

    return embed;
  });
}

/** Embed pojęć RP do kanału #słownik-rp */
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
          '**RDM** (Random Deathmatch) — Strzelanie do przypadkowych osób bez powodu fabularnego.',
          '**PG** (Power Gaming) — Zmuszanie innych do akcji RP bez ich zgody.',
          '**MG** (Meta Gaming) — Wykorzystywanie informacji z OOC w IC.',
          '**NLR** (New Life Rule) — Po śmierci postaci zapominasz poprzednie życie.',
          '**Fear RP** — Obowiązek odgrywania strachu o życie w zagrażających sytuacjach.',
        ].join('\n'),
      },
      {
        name: '🚗 Pojęcia drogowe',
        value: [
          '**CB** (Cop Baiting) — Prowokowanie policji bez wyraźnego powodu.',
          '**FD** (Fail Driving) — Jazda w sposób nierealistyczny.',
          '**Prędkość FRP** — **131 mph** (przekroczenie uznawane jako FRP).',
          '**Imersja** — Wczucie się w postać i otoczenie.',
          '**Nieposzanowanie życia** — Narażanie postaci na śmierć lub obrażenia bez uzasadnienia RP.',
        ].join('\n'),
      },
      {
        name: '💬 Komendy RP',
        value: [
          '**`/me`** — Opis czynności postaci (np. /me wyjmuje dokumenty).',
          '**`/do`** — Opis otoczenia / sytuacji (np. /do widać otarcia na karoserii).',
          '**`/b`** lub **(tekst)** — Komunikat OOC podczas sesji.',
        ].join('\n'),
      },
      {
        name: '💼 Rodzaje pracy',
        value: [
          '**Prace publiczne** — dostępne dla każdego Mieszkańca bez aplikowania.',
          '**Prace służbowe** — wymagają złożenia podania i akceptacji przez Komisję Rekrutacyjną.',
          '**Prace prywatne (Właściciel Firmy)** — prowadzone przez graczy z rolą Właściciel Firmy;',
          '   ↳ Właściciel może stworzyć **własny regulamin wewnętrzny** firmy (zatwierdzany przez HR/Admin).',
          '   ↳ Właściciel może przygotować **własny test rekrutacyjny** dla kandydatów (wymaga akceptacji HR/Admin).',
          '   ↳ Regulamin firmy nie może być sprzeczny z regulaminem serwera.',
        ].join('\n'),
      }
    )
    .setFooter({ text: 'AURORA Greenville RP — Pojęcia RP' })
    .setTimestamp();
}

module.exports = { buildRegulaminEmbeds, buildPojeciaRpEmbed };
