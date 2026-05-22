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
    .setColor(0x5865F2)
    .setTitle('📚 Słownik pojęć Roleplay — AURORA Greenville RP')
    .setDescription(
      'Poniższe pojęcia obowiązują każdego uczestnika sesji. ' +
      'Nieznajomość ich znaczenia nie zwalnia z przestrzegania zasad.'
    )
    .addFields(
      {
        name: '🔴 Naruszenia — zakaz bezwzględny',
        value: [
          '**FRP** *(Fail Roleplay)* — scena lub zachowanie niemożliwe w rzeczywistości, psujące klimat sesji.',
          '**NLR** *(New Life Rule)* — po śmierci twoja postać traci pamięć. Zakaz powrotu w to samo miejsce przez **5 min**.',
          '**MG** *(Metagaming)* — przenoszenie wiedzy spoza gry (Discord, stream) do świata IC.',
          '**PG** *(Powergaming)* — wymuszanie na innej postaci działań bez jej zgody lub odgrywanie niemożliwych czynności.',
          '**RDM** *(Random Death Match)* — atak lub zabójstwo gracza bez fabularnego uzasadnienia.',
          '**VDM** *(Vehicle Death Match)* — celowe taranowanie graczy pojazdem.',
          '**CL** *(Combat Logging)* — rozłączenie z grą w trakcie aktywnej akcji RP, by uniknąć konsekwencji.',
        ].join('\n'),
      },
      {
        name: '🟡 Zasady sytuacyjne',
        value: [
          '**Fear RP** — broń przy głowie = twoja postać boi się o życie. Walka i ucieczka są wykluczone.',
          '**Void** — cofnięcie i unieważnienie akcji RP. Prawo wyłącznie Staffu — gracze nie mogą go stosować.',
          '**Peacetime** — Pt1°: zakaz całkowity akcji kryminalnych. Pt2°: dodatkowo limit 70 mph + auto-Void wypadków.',
          '**Hostage RP** — wzięcie zakładnika wymaga jego zgody OOC i obecności aktywnego Hosta sesji.',
        ].join('\n'),
      },
      {
        name: '🟢 Komunikacja IC / OOC',
        value: [
          '**IC** *(In Character)* — jesteś swoją postacią, mówisz i działasz w świecie RP.',
          '**OOC** *(Out of Character)* — wychodzisz z roli; pisz w nawiasach () lub komendą /b.',
          '**`/me`** — opisuje czynność twojej postaci (np. /me otwiera bagażnik). Obowiązkowe przy kluczowych akcjach.',
          '**`/do`** — opisuje otoczenie lub sytuację (np. /do widać ślady hamowania).',
        ].join('\n'),
      },
      {
        name: '🔵 Kody radiowe służb',
        value: [
          '**BOLO** — Be On Look Out, poszukiwana osoba lub pojazd.',
          '**10-4** — Potwierdzam / Odbiór.',
          '**10-33** — Alarm najwyższego priorytetu — natychmiastowa pomoc.',
          '**10-70** — Pościg w toku.',
        ].join('\n'),
      },
      {
        name: '🚗 Ograniczenia drogowe',
        value: [
          '**Prędkość FRP** — jazda powyżej **131 mph** bez uzasadnienia fabularnego = FRP.',
          '**Wypadek 35 mph+** — obowiązek odegrania obrażeń przez /me i wezwania EMS.',
          '**CB** *(Cop Baiting)* — celowe prowokowanie policji bez powodu fabularnego = FRP.',
          '**FD** *(Fail Driving)* — jazda w sposób nierealistyczny, łamanie podstawowych zasad ruchu bez RP.',
        ].join('\n'),
      },
      {
        name: '💼 Rodzaje pracy',
        value: [
          '**Publiczne** — dostępne dla każdego Mieszkańca od ręki, bez podania.',
          '**Służbowe** — wymagają złożenia podania i akceptacji przez Komisję Rekrutacyjną.',
          '**Prywatne** *(Właściciel Firmy)* — prowadzone przez gracza z rolą Właściciel Firmy:',
          '   ↳ Właściciel może tworzyć **własny regulamin wewnętrzny** firmy *(zatwierdza HR/Admin)*.',
          '   ↳ Właściciel może układać **własne testy rekrutacyjne** *(wymagają akceptacji HR/Admin)*.',
        ].join('\n'),
      }
    )
    .setFooter({ text: 'AURORA Greenville RP — Słownik RP' })
    .setTimestamp();
}

module.exports = { buildRegulaminEmbeds, buildPojeciaRpEmbed };
