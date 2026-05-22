// update-pojecia.js — przeformułowanie słownika RP we wszystkich miejscach
const fs   = require('fs');
const path = require('path');
const cfgPath = path.join(__dirname, '..', 'server-config.json');
const cfg  = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

// ── 1. slownik_rp.terms ──────────────────────────────────────────────────────
cfg.slownik_rp.terms = [
  {
    term:  'FRP — Fail Roleplay',
    color: '🔴',
    desc:  'Odgrywanie scen lub zachowań, które byłyby niemożliwe lub absurdalne w rzeczywistości. Narusza klimat serwera.'
  },
  {
    term:  'NLR — New Life Rule',
    color: '🔴',
    desc:  'Twoja postać nie pamięta nic z chwili przed śmiercią — nowe życie, brak zemsty. Zakaz powrotu w to samo miejsce przez 5 minut od śmierci.'
  },
  {
    term:  'Metagaming (MG)',
    color: '🔴',
    desc:  'Przenoszenie wiedzy z poza gry (Discord, stream, czat OOC) do świata IC. Ciężkie naruszenie zasad fair play.'
  },
  {
    term:  'Powergaming (PG)',
    color: '🔴',
    desc:  'Wymuszanie na innej postaci działań bez jej zgody lub odgrywanie rzeczy fizycznie niemożliwych do wykonania.'
  },
  {
    term:  'RDM — Random Death Match',
    color: '🔴',
    desc:  'Atak lub zabójstwo gracza bez żadnego uzasadnienia w fabule RP. Zakaz.'
  },
  {
    term:  'VDM — Vehicle Death Match',
    color: '🔴',
    desc:  'Celowe taranowanie lub rozjeżdżanie graczy pojazdem bez fabularnego powodu. Zakaz.'
  },
  {
    term:  'Combat Logging (CL)',
    color: '🔴',
    desc:  'Celowe rozłączenie się z grą w trakcie konfliktu RP, aby uniknąć konsekwencji. Skutkuje surowym banem.'
  },
  {
    term:  'Fear RP',
    color: '🟡',
    desc:  'Gdy ktoś przystawia ci broń do głowy — twoja postać boi się o życie. Walka ani ucieczka nie są możliwe.'
  },
  {
    term:  'IC — In Character',
    color: '🟢',
    desc:  'Jesteś swoją postacią — wszystko, co mówisz i robisz, dzieje się w świecie RP.'
  },
  {
    term:  'OOC — Out of Character',
    color: '🟢',
    desc:  'Wychodzisz z roli — piszesz poza postacią. Używaj nawiasów () lub komendy /b.'
  },
  {
    term:  'Void',
    color: '🟡',
    desc:  'Cofnięcie i unieważnienie akcji RP — decyzja należy wyłącznie do Staffu serwera, nie graczy.'
  },
  {
    term:  'Peacetime',
    color: '🟡',
    desc:  'Pt1°: całkowity zakaz akcji kryminalnych i ucieczek. Pt2°: dodatkowo limit 70 mph i automatyczny Void wypadków.'
  },
  {
    term:  '/me',
    color: '🟢',
    desc:  'Komenda do opisania czynności twojej postaci (np. /me otwiera drzwi). Obowiązkowa przy kluczowych momentach.'
  },
  {
    term:  'Hostage RP',
    color: '🟡',
    desc:  'Wzięcie zakładnika — wymaga jego wyraźnej zgody OOC oraz obecności co najmniej jednego aktywnego funkcjonariusza.'
  },
  {
    term:  'BOLO',
    color: '🔵',
    desc:  'Be On Look Out — komunikat służb o osobie lub pojeździe, którego należy poszukiwać.'
  },
  {
    term:  '10-4',
    color: '🔵',
    desc:  'Potwierdzam / Zrozumiałem — standardowy zwrot radiowy oznaczający odbiór komunikatu.'
  },
  {
    term:  '10-33',
    color: '🔴',
    desc:  'Kod alarmowy najwyższego priorytetu — natychmiastowa pomoc potrzebna na miejscu zdarzenia.'
  },
  {
    term:  '10-70',
    color: '🔴',
    desc:  'Pościg w toku — wszystkie dostępne jednostki proszone o wsparcie.'
  }
];

// ── 2. Regulamin §4 — Słownik pojęć RP ──────────────────────────────────────
cfg.regulamin.sections[2].fields[0].rules = [
  '**FRP (Fail Roleplay)** — scena lub zachowanie niemożliwe w rzeczywistości, psujące klimat RP.',
  '**NLR (New Life Rule)** — po śmierci postać traci pamięć. Zakaz powrotu w to samo miejsce przez **5 minut** od śmierci.',
  '**Metagaming (MG)** — przenoszenie wiedzy z zewnątrz gry (Discord, stream, OOC) do świata IC. Ciężkie naruszenie.',
  '**Powergaming (PG)** — wymuszanie akcji na innym graczu bez zgody lub odgrywanie fizycznie niemożliwych czynności.',
  '**RDM (Random Death Match)** — atak lub zabójstwo gracza bez żadnego uzasadnienia fabularnego.',
  '**VDM (Vehicle Death Match)** — celowe taranowanie lub rozjeżdżanie graczy pojazdem.',
  '**Combat Logging (CL)** — celowe rozłączenie z grą podczas aktywnego konfliktu RP. Skutkuje surowym banem.',
  '**Fear RP** — broń przy głowie = twoja postać boi się o życie — walka i ucieczka są wykluczone.',
  '**OOC (Out of Character)** — komunikat poza postacią; używaj nawiasów () lub komendy /b.',
  '**IC (In Character)** — jesteś swoją postacią — mówisz i działasz w świecie RP.',
  '**Void** — unieważnienie akcji RP — uprawnienie wyłącznie Staffu serwera.',
  '**Peacetime** — tryb z ograniczonymi akcjami kryminalnymi — szczegóły w §6.',
  '**/me** — opis czynności postaci (np. /me wyjmuje legitymację). Obowiązkowe przy kluczowych akcjach.',
  '**Hostage RP** — wzięcie zakładnika wymaga jego zgody OOC oraz obecności aktywnego Hosta sesji.'
];

fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
console.log('slownik_rp zaktualizowany:', cfg.slownik_rp.terms.length, 'pojęć');
console.log('§4 zaktualizowany:', cfg.regulamin.sections[2].fields[0].rules.length, 'zasad');
