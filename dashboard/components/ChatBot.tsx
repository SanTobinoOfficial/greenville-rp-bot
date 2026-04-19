'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Ikony SVG inline ─────────────────────────────────────────────────────────

function IconMessageCircle() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

function IconBot() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

// ─── Baza wiedzy ─────────────────────────────────────────────────────────────

type Answer = { text: string; followUps?: string[] };
type Topic  = { id: string; keywords: string[]; question: string; answer: Answer };

const TOPICS: Topic[] = [
  { id:'greeting', keywords:['cześć','hej','siema','witaj','hello','hi','dzień dobry','dobry wieczór'], question:'Powitanie',
    answer:{ text:'Hej! Jestem wirtualnym asystentem Greenville RP 👋\n\nMogę Ci pomóc z pytaniami o dołączenie, weryfikację, pojazdy, prawa jazdy, sesje, służby i wiele więcej.\n\nW czym mogę pomóc?', followUps:['Jak dołączyć?','Co to jest sesja RP?','Jak zdobyć pracę?'] }},
  { id:'join', keywords:['dołączyć','dołącz','jak zacząć','zacząć grać','nowy','rejestracja','jak wejść','jak grać','pierwszy krok','zacząć'], question:'Jak dołączyć?',
    answer:{ text:'Aby dołączyć do Greenville RP wykonaj te kroki:\n\n**1.** Wejdź na nasz serwer Discord\n**2.** Przejdź na kanał **#weryfikacja**\n**3.** Użyj komendy `/weryfikacja` i podaj swoją nazwę w Roblox\n**4.** Poczekaj na akceptację przez staffa\n\nPo weryfikacji otrzymasz rolę **Mieszkaniec** i dostęp do wszystkich kanałów serwera.', followUps:['Ile trwa weryfikacja?','Jak stworzyć postać?','Jakie są zasady?'] }},
  { id:'verification_time', keywords:['ile trwa weryfikacja','kiedy zweryfikują','czas weryfikacji','długo czekać na weryfikację','oczekiwanie na weryfikację'], question:'Ile trwa weryfikacja?',
    answer:{ text:'Weryfikacja odbywa się ręcznie przez staffa serwera.\n\nZwykle trwa **od kilku minut do kilku godzin** w zależności od aktywności staffu.\n\nNie wysyłaj wielu zgłoszeń — wystarczy jedno. Możesz sprawdzić status na kanale **#weryfikacja**.', followUps:['Jak stworzyć postać?','Co to jest sesja RP?'] }},
  { id:'character', keywords:['postać','stwórz postać','tworzenie postaci','dowód osobisty','imię postaci','nazwisko postaci','pesel','dokument tożsamości','kim jestem w grze'], question:'Jak stworzyć postać?',
    answer:{ text:'Postać tworzysz przez kanał **#tworzenie-postaci** na Discordzie.\n\nPostać to Twoje RP-owe "ja" — masz:\n- **Imię i nazwisko** (wymyślone)\n- **Numer PESEL RP** i numer dokumentu\n- **Wiek i płeć**\n\nBez postaci nie możesz aktywnie uczestniczyć w sesjach. Stwórz ją zanim przyjdzie pierwsza sesja!', followUps:['Jak zdobyć prawo jazdy?','Jak zarejestrować pojazd?','Co to jest sesja RP?'] }},
  { id:'session', keywords:['sesja','sesje','kiedy sesja','kiedy gram','kiedy można grać','harmonogram sesji','event rp','godziny sesji'], question:'Co to jest sesja RP?',
    answer:{ text:'Sesja RP to zaplanowany czas, kiedy serwer jest "otwarty" do rozgrywki w Roblox.\n\n**Jak to działa:**\n- Host ogłasza sesję na Discordzie z datą i godziną\n- Możesz się zapisać przez bota komendą `/sesja zapisy`\n- O podanej godzinie wchodzisz do gry w Roblox\n\nSesje odbywają się regularnie — śledź kanał **#sesje** na Discordzie!\n\nMaksymalna liczba graczy zależy od danej sesji (zwykle 20–40 osób).', followUps:['Jak się zapisać na sesję?','Ile kosztuje dołączenie?','Jakie służby mogę wybrać?'] }},
  { id:'session_signup', keywords:['zapisać na sesję','zapis na sesję','jak dołączyć do sesji','lista rezerwowa','zapisy sesja'], question:'Jak się zapisać na sesję?',
    answer:{ text:'Aby zapisać się na sesję użyj komendy **/sesja zapisy** na Discordzie.\n\nAlternatywnie kliknij przycisk zapisów w ogłoszeniu sesji.\n\nZapisy są ograniczone — im szybciej, tym lepiej! Jeśli nie zmieścisz się na liście podstawowej, możesz trafić na **listę rezerwową**.', followUps:['Co to jest sesja RP?','Jak stworzyć postać?'] }},
  { id:'driving_license', keywords:['prawo jazdy','prawa jazdy','licencja jazdy','kategoria prawa jazdy','egzamin jazdy','quiz prawo jazdy','kurs jazdy','jak zdać'], question:'Jak zdobyć prawo jazdy?',
    answer:{ text:'Prawo jazdy zdobywasz przez bota Discord.\n\n**Kroki:**\n**1.** Upewnij się, że masz stworzoną postać\n**2.** Użyj komendy `/quiz start` aby przejść test z przepisów ruchu drogowego\n**3.** Po zdaniu quizu bot automatycznie wyda Ci prawo jazdy\n\n**Dostępne kategorie:** AM, A1, A2, A, B, C, D, T\n\n⚠️ Masz ograniczoną liczbę prób i cooldown 24h między podejściami. Przeczytaj regulamin przed quizem!', followUps:['Co się stanie gdy obleje quiz?','Jak zarejestrować pojazd?','Jakie są mandaty?'] }},
  { id:'quiz_fail', keywords:['oblać quiz','nie zdałem quizu','nie zdałam quizu','failed quiz','ile prób quiz','cooldown quiz','ponowne podejście do quizu'], question:'Co jeśli nie zdam quizu?',
    answer:{ text:'Jeśli nie zdasz quizu z przepisów:\n\n- Wynik zostaje zapisany w systemie\n- Musisz odczekać **24 godziny** przed ponownym podejściem\n- Masz ograniczoną liczbę prób\n\nPrzed kolejnym podejściem przeczytaj uważnie regulamin na kanale **#regulamin**. Pytania quizowe są oparte bezpośrednio na treści regulaminu!', followUps:['Jak zdobyć prawo jazdy?','Gdzie jest regulamin?'] }},
  { id:'vehicle', keywords:['pojazd','pojazdy','samochód','rejestracja pojazdu','tablica rejestracyjna','zarejestrować auto','kupić auto','ile pojazdów'], question:'Jak zarejestrować pojazd?',
    answer:{ text:'Pojazd rejestrujesz przez kanał **#rejestracja-pojazdu** na Discordzie.\n\n**Potrzebujesz:**\n- Aktywnej postaci\n- Aktywnego prawa jazdy (kat. B lub odpowiedniej)\n- Podania: marki, modelu, roku produkcji, koloru\n\n**Limity pojazdów:**\n- Mieszkaniec: **5 pojazdów**\n- Wspierający: **9 pojazdów**\n- Booster: **10 pojazdów**\n\nTablica rejestracyjna jest generowana automatycznie przez bota.', followUps:['Jak zdobyć prawo jazdy?','Co to są mandaty?','Co daje rola Wspierającego?'] }},
  { id:'fine', keywords:['mandat','mandaty','grzywna','kara finansowa','zapłacić mandat','odwołać mandat','cofnąć mandat','za co mandat'], question:'Jak działają mandaty?',
    answer:{ text:'Mandaty wystawia Policja lub Staff podczas sesji RP za naruszenia.\n\n**Rodzaje kar:**\n- 🟡 **Mandat** — za wykroczenia drogowe (prędkość, parkowanie)\n- 🟠 **Grzywna** — poważniejsze wykroczenia\n- 🔴 **Areszt RP** — za najpoważniejsze czyny\n\n**Odwołanie mandatu:**\nJeśli uważasz mandat za niesłuszny, otwórz ticket przez **#otwórz-ticket** podając numer mandatu i powód.\n\n⚠️ Nagromadzenie zbyt wielu mandatów może skutkować zawieszeniem prawa jazdy!', followUps:['Jak otworzyć ticket?','Jak sprawdzić swoje mandaty?','Co to jest areszt RP?'] }},
  { id:'arrest', keywords:['areszt','zatrzymany','zatrzymanie przez policję','policja zabrała','aresztowany','siedzę w areszcie'], question:'Co to jest areszt RP?',
    answer:{ text:'Areszt RP to sytuacja, gdy Twoja postać jest zatrzymana przez Policję w trakcie sesji.\n\n**Co to oznacza:**\n- Twoja postać jest "zatrzymana" w systemie\n- Panel gracza pokaże Ci alert o areszcie\n- Możesz zostać zwolniony przez funkcjonariusza RP\n\n**Czas aresztu** zależy od decyzji Policji RP — zwykle kilka do kilkunastu minut.\n\nJeśli uważasz areszt za niezgodny z regulaminem, zgłoś to przez ticket.', followUps:['Jak otworzyć ticket?','Jak działają mandaty?','Co to są służby?'] }},
  { id:'services', keywords:['służby','policja rp','ems rp','straż pożarna','dot rp','straż miejska','taksówkarz rp','praca w służbach','dołączyć do służb','służba mundurowa'], question:'Jak dołączyć do służb?',
    answer:{ text:'Dostępne służby mundurowe:\n\n🚔 **Policja** — utrzymuje porządek, wystawia mandaty\n🚑 **EMS** — ratownictwo medyczne\n🚒 **Straż Pożarna** — gaszenie pożarów\n🚧 **DOT** — zarządzanie infrastrukturą drogową\n🛡️ **Straż Miejska** — kontrola parkowania\n🚕 **Taksówkarz** — transport pasażerów\n\n**Jak aplikować:**\nUżyj komendy `/aplikuj` na Discordzie lub wejdź na kanał **#podania-służby**. Musisz mieć aktywną postać i spełniać wymagania danej służby.', followUps:['Jak działa komenda /duty?','Jakie są wymagania do służb?','Co to jest sesja RP?'] }},
  { id:'duty', keywords:['duty','on duty','off duty','wejście na służbę','wyjście ze służby','rozpocząć służbę','patrol rp','jak pracować w służbach'], question:'Jak działa komenda /duty?',
    answer:{ text:'Komenda **/duty** służy do oznaczenia się jako "na służbie" lub "po służbie".\n\n**Użycie:**\n`/duty` — przełącza Twój aktualny status\n\n**Co się dzieje:**\n- Bot nadaje/zdejmuje rolę np. "Policja On-Duty"\n- Wpis trafia do logu służbowego\n- Staff widzi historię Twoich dyżurów\n\n⚠️ Zawsze używaj `/duty` gdy kończysz grę — nie zostawaj "na służbie" po zakończeniu sesji!', followUps:['Jak dołączyć do służb?','Co to jest sesja RP?'] }},
  { id:'ticket', keywords:['ticket','zgłoszenie do staffa','skarga','raport','problem techniczny','pomoc staffu','jak zgłosić','kontakt ze staffem','zgłoś problem'], question:'Jak otworzyć ticket?',
    answer:{ text:'Ticket to prywatna rozmowa ze staffem — użyj go gdy masz problem, skargę lub pytanie.\n\n**Jak otworzyć:**\n- Wejdź na kanał **#otwórz-ticket** na Discordzie\n- Kliknij odpowiedni przycisk (pomoc, skarga, pytanie)\n- Dokładnie opisz problem\n\n**Alternatywnie:** użyj komendy `/zglos` z opisem.\n\n⚠️ Nie otwieraj wielu ticketów z tym samym problemem — to opóźnia odpowiedź staffu.', followUps:['Co to są warny?','Jak działają mandaty?','Gdzie jest regulamin?'] }},
  { id:'warn', keywords:['warn','warny','ostrzeżenie moderacyjne','dostałem warna','ile warnów do bana','system ostrzeżeń'], question:'Co to są warny?',
    answer:{ text:'Warn (ostrzeżenie) to kara moderacyjna za naruszenie regulaminu serwera Discord.\n\n**Progi automatycznych kar:**\n- **3 warny** → automatyczny timeout (mute)\n- **5 warnów** → automatyczny ban\n\nWarny są widoczne dla całego staffu.\n\n**Odwołanie warna:**\nJeśli uważasz warna za niesłuszny, otwórz ticket z wyjaśnieniem. Każdy przypadek jest rozpatrywany indywidualnie przez staffa.', followUps:['Co to jest ban?','Jak otworzyć ticket?','Gdzie jest regulamin?'] }},
  { id:'ban', keywords:['ban','zbanowany','zbanowano mnie','wykluczenie z serwera','permanentny ban','odban','unban','jak odblokować konto'], question:'Co to jest ban?',
    answer:{ text:'Ban to wykluczenie z serwera Discord za poważne naruszenie regulaminu.\n\n**Rodzaje:**\n- ⏳ **Ban tymczasowy** — na określony czas\n- 🔴 **Ban permanentny** — bezterminowy\n\n**Odwołanie od bana:**\nSkontaktuj się ze staffem przez DM lub inny kanał kontaktowy. Złóż odwołanie z uzasadnieniem dlaczego ban był niesłuszny.\n\nPamiętaj: wielokrotne naruszanie regulaminu zmniejsza szanse na odban.', followUps:['Co to są warny?','Gdzie jest regulamin?'] }},
  { id:'rules', keywords:['regulamin','zasady serwera','przepisy serwera','co wolno','czego nie wolno','reguły gry','gdzie regulamin'], question:'Gdzie jest regulamin?',
    answer:{ text:'Regulamin serwera znajdziesz na Discordzie na kanale **#regulamin**.\n\n**Najważniejsze zasady:**\n- Szanuj innych graczy i staff\n- Graj zgodnie z zasadami RP — bez meta-gamingu i cross-RP\n- Przestrzegaj przepisów drogowych podczas sesji\n- Nie wykorzystuj bugów gry celowo\n- FRP (Fear Roleplay) jest obowiązkowe\n\n📖 Przeczytanie regulaminu jest **wymagane** przed quizem na prawo jazdy!', followUps:['Co to jest FRP?','Jak zdobyć prawo jazdy?','Co to są warny?'] }},
  { id:'frp', keywords:['frp','fear roleplay','fail rp','failrp','metagaming','meta gaming','powerplay','nieregulaminowa gra','zasady rp'], question:'Co to jest FRP?',
    answer:{ text:'**FRP (Fear RP)** — obowiązek realistycznego reagowania na zagrożenie.\n\nNp. jeśli ktoś celuje w Ciebie bronią, Twoja postać powinna okazać strach — nie można wtedy atakować ani uciekać bez uzasadnienia.\n\n**Fail RP** — działanie niezgodne z realiami, np. ignorowanie ran, jazda w niemożliwy sposób.\n\n**Metagaming** — używanie informacji spoza gry (Discord, stream) w trakcie sesji RP.\n\nWszystkie te zachowania są karane **warnami lub banem**.', followUps:['Gdzie jest regulamin?','Co to są warny?'] }},
  { id:'phone', keywords:['telefon rp','numer telefonu rp','sms rp','jak dzwonić','telefon w grze','kontakt z graczem przez discord'], question:'Jak działa telefon RP?',
    answer:{ text:'System telefoniczny pozwala kontaktować się z innymi graczami przez bota Discord.\n\n**Co możesz robić:**\n- Wysyłać SMS-y do innych postaci RP\n- "Dzwonić" do graczy (wiadomości przez bota)\n\n**Jak:**\nUżyj komend `/sms` lub `/zadzwon` na Discordzie podając numer telefonu RP rozmówcy.\n\n📱 Każda zweryfikowana postać otrzymuje unikalny **numer telefonu RP** przypisany automatycznie przez bota.', followUps:['Jak stworzyć postać?','Co to jest sesja RP?'] }},
  { id:'supporter', keywords:['wspierający','donacja','booster discord','vip','premium','przywileje','co daje wspieranie','jak wspierać serwer'], question:'Co daje rola Wspierającego?',
    answer:{ text:'**Wspierający** to rola dla osób, które finansowo wspierają serwer.\n\n**Przywileje Wspierającego:**\n- Limit **9 pojazdów** (vs 5 dla Mieszkańca)\n- Specjalna kolorowa rola na Discordzie\n- Dostęp do kanałów VIP\n\n**Booster** (boost serwera Discord):\n- Limit **10 pojazdów**\n- Kolorowa rola boostera\n\nAby zostać Wspierającym, sprawdź kanał **#wspieranie-serwera** na Discordzie.', followUps:['Jak zarejestrować pojazd?','Co to jest sesja RP?'] }},
  { id:'staff', keywords:['jak zostać staffem','podanie na staffa','rekrutacja staffu','helper','moderator rekrutacja','admin rekrutacja'], question:'Jak zostać staffem?',
    answer:{ text:'Rekrutacja na staffa odbywa się **okresowo** — nie ma stałego otwartego naboru.\n\n**Kiedy jest rekrutacja:**\nOgłoszenia pojawiają się na kanale **#ogłoszenia** na Discordzie.\n\n**Typowe wymagania:**\n- Minimum 2 tygodnie aktywności na serwerze\n- Brak aktywnych warnów\n- Dobra znajomość regulaminu\n- Kulturalne zachowanie wobec graczy\n\n⚠️ Pisanie do staffu z prośbą o rangę bez ogłoszenia rekrutacji **zmniejsza** Twoje szanse.', followUps:['Co to są warny?','Gdzie jest regulamin?','Co to są służby?'] }},
  { id:'website', keywords:['strona internetowa','panel gracza online','zalogować się na stronie','portal gracza','jak korzystać z panelu','strona greenville'], question:'Jak korzystać z panelu?',
    answer:{ text:'Panel gracza to ta strona! 🌐\n\n**Jak uzyskać dostęp:**\n**1.** Kliknij **"Login z Discord"** w górnym rogu\n**2.** Zaloguj się swoim kontem Discord\n**3.** Panel pokaże dane dopasowane do Twojej roli\n\n**Co zobaczysz:**\n- 👤 Gracz: postać, pojazdy, prawa jazdy, sesje\n- 🚔 Służby: panel z logami dyżurów\n\nJeśli konto nie jest zweryfikowane, zobaczysz instrukcję jak dołączyć do serwera.', followUps:['Jak dołączyć?','Jak stworzyć postać?','Jak dołączyć do służb?'] }},
  { id:'discord_link', keywords:['link do discorda','discord zaproszenie','invite discord','gdzie discord','dołącz do discorda','adres discorda'], question:'Link do serwera Discord',
    answer:{ text:'Dołącz do naszego serwera Discord!\n\n👉 **discord.gg/BU8EBPsYXV**\n\nNa serwerze znajdziesz:\n- Ogłoszenia o nadchodzących sesjach\n- Kanały do weryfikacji i rejestracji postaci\n- Pomoc staffu przez system ticketów\n- Społeczność aktywnych graczy RP', followUps:['Jak dołączyć?','Co to jest sesja RP?'] }},
];

function findBestAnswer(input: string): { topic: Topic | null; score: number } {
  const normalized = input.toLowerCase().trim();
  for (const topic of TOPICS) {
    for (const kw of topic.keywords) {
      if (normalized === kw) return { topic, score: 100 };
    }
  }
  let best: Topic | null = null;
  let bestScore = 0;
  for (const topic of TOPICS) {
    let score = 0;
    for (const kw of topic.keywords) {
      if (normalized.includes(kw)) score += kw.split(' ').length * 12;
    }
    const words = normalized.split(/\s+/).filter(w => w.length > 3);
    for (const word of words) {
      for (const kw of topic.keywords) {
        if (kw.includes(word)) score += 4;
      }
    }
    if (score > bestScore) { bestScore = score; best = topic; }
  }
  return { topic: best, score: bestScore };
}

type Message = { id: number; role: 'user' | 'bot'; text: string; followUps?: string[] };

const QUICK_TOPICS = ['Jak dołączyć?','Co to jest sesja RP?','Jak zdobyć prawo jazdy?','Jak dołączyć do służb?'];
const FALLBACK_RESPONSES = [
  'Hmm, nie mam informacji o tym temacie 🤔\n\nSpróbuj zapytać inaczej lub wybierz jeden z tematów poniżej. Możesz też otworzyć **ticket** na Discordzie — staff chętnie pomoże!',
  'Nie jestem pewien jak odpowiedzieć na to pytanie 😅\n\nMogę pomóc z: weryfikacją, sesjami, prawem jazdy, pojazdami, służbami lub regulaminem. W razie potrzeby — ticket na Discordzie!',
  'To pytanie wykracza poza moją wiedzę 🔍\n\nNajlepiej skontaktuj się ze staffem przez kanał **#otwórz-ticket** na Discordzie — odpiszą najszybciej jak to możliwe!',
];

function FormatText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ fontWeight: 700, color: '#ffffff' }}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Główny komponent ─────────────────────────────────────────────────────────

export default function ChatBot() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [typing, setTyping]     = useState(false);
  const [unread, setUnread]     = useState(0);
  const [started, setStarted]   = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const msgIdRef  = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const nextId = () => ++msgIdRef.current;

  const addBotMessage = useCallback((text: string, followUps?: string[]) => {
    setTyping(true);
    const delay = 600 + Math.random() * 500;
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { id: nextId(), role: 'bot', text, followUps }]);
      setUnread(u => (open ? 0 : u + 1));
    }, delay);
  }, [open]);

  useEffect(() => {
    if (open && !started) {
      setStarted(true);
      setUnread(0);
      addBotMessage('Cześć! Jestem wirtualnym asystentem Greenville RP 👋\n\nZadaj mi pytanie lub wybierz temat poniżej:', QUICK_TOPICS);
    }
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, started, addBotMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  function handleSend(text?: string) {
    const query = (text ?? input).trim();
    if (!query || typing) return;
    setInput('');
    setMessages(prev => [...prev, { id: nextId(), role: 'user', text: query }]);
    const { topic, score } = findBestAnswer(query);
    if (topic && score >= 10) {
      addBotMessage(topic.answer.text, topic.answer.followUps);
    } else {
      const fb = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
      addBotMessage(fb, QUICK_TOPICS.slice(0, 3));
    }
  }

  // ── Styl animacji bounce ──
  const bounceKeyframes = `
    @keyframes chatBounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-5px); opacity: 1; }
    }
    @keyframes chatPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: bounceKeyframes }} />

      {/* ── Przycisk toggle ── */}
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
        aria-label={open ? 'Zamknij chatbota' : 'Otwórz chatbota'}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: btnHover ? '#27ae60' : '#30d158',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#000',
          boxShadow: `0 8px 32px rgba(48,209,88,0.45)`,
          transform: btnHover ? 'scale(1.1)' : 'scale(1)',
          transition: 'all 0.2s ease',
        }}
      >
        {open ? <IconX /> : <IconMessageCircle />}
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#ef4444',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* ── Okno czatu ── */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: '96px',
          right: '24px',
          zIndex: 9998,
          width: '370px',
          maxWidth: 'calc(100vw - 2rem)',
          height: '520px',
          background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 16px',
            background: '#0a0f18',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #30d158, #00c8ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#000',
            }}>
              <IconBot />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#ffffff' }}>Asystent Greenville</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#30d158',
                  animation: 'chatPulse 2s infinite',
                  display: 'inline-block',
                }} />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Odpowie na Twoje pytania</span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconX />
            </button>
          </div>

          {/* Wiadomości */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '88%',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-line',
                  background: msg.role === 'user' ? '#30d158' : '#161f2c',
                  color: msg.role === 'user' ? '#000' : 'rgba(255,255,255,0.9)',
                  fontWeight: msg.role === 'user' ? 500 : 400,
                  border: msg.role === 'bot' ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  {msg.role === 'bot' ? <FormatText text={msg.text} /> : msg.text}
                </div>

                {msg.role === 'bot' && msg.followUps && msg.followUps.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', maxWidth: '92%' }}>
                    {msg.followUps.map(fu => (
                      <FollowUpButton key={fu} label={fu} onClick={() => handleSend(fu)} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{
                  background: '#161f2c',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '16px 16px 16px 4px',
                  padding: '12px 16px',
                }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.4)',
                        animation: 'chatBounce 1s infinite',
                        animationDelay: `${i * 0.15}s`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            background: '#0a0f18',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#070d14',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '8px 12px',
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Zadaj pytanie..."
                maxLength={300}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#ffffff',
                  minWidth: 0,
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || typing}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: (!input.trim() || typing) ? 'rgba(255,255,255,0.08)' : '#30d158',
                  border: 'none',
                  cursor: (!input.trim() || typing) ? 'not-allowed' : 'pointer',
                  color: (!input.trim() || typing) ? 'rgba(255,255,255,0.2)' : '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <IconSend />
              </button>
            </div>
            <p style={{
              textAlign: 'center',
              fontSize: '10px',
              color: 'rgba(255,255,255,0.15)',
              marginTop: '6px',
              marginBottom: 0,
            }}>
              Bot odpowiada na podstawie FAQ — nie zastępuje staffa
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function FollowUpButton({ label, onClick }: { label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        background: hover ? 'rgba(48,209,88,0.12)' : 'rgba(255,255,255,0.05)',
        border: hover ? '1px solid rgba(48,209,88,0.3)' : '1px solid rgba(255,255,255,0.08)',
        color: hover ? '#30d158' : 'rgba(255,255,255,0.55)',
        padding: '4px 10px',
        borderRadius: '999px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <IconChevron />
      {label}
    </button>
  );
}
