'use client';

import { useState, useRef, useEffect } from 'react';

// ─── FAQ baza wiedzy ─────────────────────────────────────────────────────────
const FAQ: Array<{ keywords: string[]; answer: string }> = [
  {
    keywords: ['dołącz', 'wejść', 'jak dołączyć', 'rejestracja', 'nowy', 'start', 'zacząć'],
    answer: '👋 Aby dołączyć do Greenville RP:\n1. Wejdź na nasz **Discord**: discord.gg/greenvillerp\n2. Przejdź przez weryfikację wieku\n3. Zweryfikuj konto **Roblox** na kanale #weryfikacja\n4. Rozwiąż **quiz** z regulaminu\n5. Stwórz **postać** na #tworzenie-postaci\n\nZapraszamy! 🎉',
  },
  {
    keywords: ['weryfikacja', 'zweryfikować', 'roblox', 'konto roblox', 'quiz'],
    answer: '✅ **Jak się zweryfikować:**\n1. Wejdź na kanał **#weryfikacja** na Discordzie\n2. Kliknij przycisk "Zweryfikuj konto Roblox"\n3. Podaj swój nick na Roblox\n4. Rozwiąż quiz z regulaminu (10 pytań)\n5. Po zaliczeniu quizu otrzymasz rolę **Mieszkaniec** 🏠',
  },
  {
    keywords: ['prawo jazdy', 'prawa jazdy', 'kurs', 'egzamin', 'kategoria'],
    answer: '🪪 **Prawo jazdy RP:**\nAby uzyskać prawo jazdy:\n1. Złóż wniosek przez `/wydaj-prawo-jazdy` (staff)\n2. Lub odwiedź Urząd na sesji RP\n\n**Kategorie:** A (motocykl), B (auto), C (ciężarówka), D (bus)\nBez prawa jazdy możesz dostać mandat! 🚔',
  },
  {
    keywords: ['pojazd', 'samochód', 'rejestracja auta', 'tablica', 'zarejestrować', 'pojazdy'],
    answer: '🚗 **Rejestracja pojazdu:**\nIdź na kanał **#rejestracja-pojazdu** i kliknij przycisk rejestracji.\n\nPodaj: markę, model, rok, kolor i typ tablicy.\n\n**Limity:**\n• Mieszkaniec: 5 pojazdów\n• Wspierający: 9 pojazdów  \n• Booster: 10 pojazdów',
  },
  {
    keywords: ['mandat', 'grzywna', 'areszt', 'kara', 'policja', 'ukarany'],
    answer: '📜 **Mandaty i kary:**\nKary wystawia Policja podczas sesji RP:\n• **Mandat** — kara pieniężna za wykroczenie\n• **Grzywna** — wyższa kara finansowa\n• **Areszt** — tymczasowe zatrzymanie\n\nMożesz sprawdzić swoje mandaty komendą `/historia-mandatow` na Discordzie.',
  },
  {
    keywords: ['służba', 'policja', 'ems', 'straż', 'praca', 'job', 'podanie', 'aplikacja'],
    answer: '🚔 **Jak dołączyć do służb:**\n1. Użyj komendy `/aplikuj` na Discordzie\n2. Wybierz stanowisko (Policja, EMS, Straż itp.)\n3. Wypełnij formularz podania\n4. Poczekaj na decyzję HR\n\n**Dostępne służby:** 🚔 Policja, 🚑 EMS, 🚒 Straż Pożarna, 🚧 DOT, 🛡️ Straż Miejska, 🚕 Taksówkarz',
  },
  {
    keywords: ['sesja', 'kiedy sesja', 'sesje', 'harmonogram'],
    answer: '🎪 **Sesje RP:**\nSesje są ogłaszane na kanale **#sesje-ogłoszenia** z wyprzedzeniem.\n\nAby się zapisać: kliknij przycisk "Zapisz się" w ogłoszeniu sesji.\n\nNa sesji możesz: grać w Roblox w grze Greenville, wchodzić w interakcje z innymi graczami, wykonywać zadania zgodne z rolą RP.',
  },
  {
    keywords: ['regulamin', 'zasady', 'reguły', 'zakazy', 'przepisy'],
    answer: '📋 **Regulamin:**\nPodstawowe zasady:\n• ❌ Bez FRP (Fail RP) — graj zgodnie z postacią\n• ❌ Bez RDM — nie zabijaj bez powodu\n• ❌ Bez power-gamingu\n• ✅ Szanuj innych graczy\n• ✅ Słuchaj staffu\n\nPełny regulamin znajdziesz na kanale **#regulamin** na Discordzie.',
  },
  {
    keywords: ['ticket', 'zgłoszenie', 'pomoc', 'problem', 'skarga', 'ban', 'odwołanie'],
    answer: '🎫 **Pomoc i zgłoszenia:**\nMasz problem? Otwórz ticket:\n• Komenda `/zglos` na Discordzie (szybkie zgłoszenie)\n• Kanał **#tickety** → kliknij "Otwórz ticket"\n• Lub napisz na kanale **#pomoc**\n\nStaff odpowiada w ciągu 24h. ⏰',
  },
  {
    keywords: ['telefon', 'sms', 'numer', 'dzwonić', 'zadzwonić'],
    answer: '📱 **System telefoniczny:**\nNa Greenville RP masz własny numer telefonu!\n• `/moj-numer` — sprawdź swój numer\n• `/sms [numer] [treść]` — wyślij SMS\n• `/zadzwon [numer]` — zadzwoń do gracza\n• `/numer-info [numer]` — kto ma dany numer\n\nNumer przyznawany jest automatycznie po weryfikacji.',
  },
  {
    keywords: ['postać', 'dowód', 'pesel', 'stwórz postać', 'create character'],
    answer: '🪪 **Tworzenie postaci:**\nIdź na kanał **#tworzenie-postaci** i kliknij przycisk.\n\nWypełnij:\n• Imię i nazwisko\n• Datę urodzenia\n• Płeć\n• Kolor oczu i włosów\n\nPo stworzeniu postaci otrzymasz automatycznie PESEL i numer dokumentu. Użyj `/dowod` aby go zobaczyć!',
  },
  {
    keywords: ['ban', 'zbanowany', 'unban', 'odbanować', 'kara moderacyjna'],
    answer: '🔨 **Kary moderacyjne:**\nJeśli zostałeś/aś ukarany/a:\n• **Warn** — ostrzeżenie, zbieranie 3 = auto-mute\n• **Mute** — wyciszenie na Discord\n• **Kick** — wyrzucenie z serwera\n• **Ban** — ban na serwer\n\nAby odwołać się od kary, otwórz ticket `/zglos` z opisem sytuacji.',
  },
  {
    keywords: ['staff', 'moderator', 'admin', 'helper', 'załoga'],
    answer: '🛡️ **Zespół Greenville RP:**\n• **Helper** — podstawowe wsparcie graczy\n• **Moderator** — moderacja i kary\n• **Administrator** — zarządzanie serwerem\n• **Owner** — właściciel\n\nChcesz zostać staffem? Obserwuj ogłoszenia o rekrutacji na kanale **#ogłoszenia**.',
  },
  {
    keywords: ['cześć', 'hej', 'hej bot', 'witaj', 'siema', 'czesc', 'hello', 'hi'],
    answer: '👋 Cześć! Jestem **GreenvilleBot** — asystent serwera Greenville RP!\n\nMogę odpowiedzieć na pytania dotyczące:\n• Dołączania i weryfikacji\n• Pojazdy i prawo jazdy\n• Służby i podania\n• Sesje RP i regulamin\n• I wiele więcej!\n\nO co chcesz zapytać? 😊',
  },
];

// ─── Dopasowanie odpowiedzi ──────────────────────────────────────────────────
function findAnswer(input: string): string {
  const lower = input.toLowerCase().trim();

  // Szukaj po słowach kluczowych
  for (const faq of FAQ) {
    if (faq.keywords.some(kw => lower.includes(kw))) {
      return faq.answer;
    }
  }

  // Domyślna odpowiedź
  return `🤔 Nie wiem jak odpowiedzieć na to pytanie.\n\nSpróbuj zapytać o:\n• **weryfikacja** — jak dołączyć\n• **pojazdy** — rejestracja auta\n• **służby** — Policja, EMS...\n• **sesja** — kiedy gramy\n• **regulamin** — zasady\n• **ticket** — zgłoszenie problemu\n\nLub wejdź na **Discord** i zapytaj staffu: discord.gg/greenvillerp 💬`;
}

// ─── Format answer with markdown ────────────────────────────────────────────
function FormatAnswer({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        // Bold **text**
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <div key={i} className={line === '' ? 'h-2' : ''}>
            {parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Message type ────────────────────────────────────────────────────────────
type Message = {
  id: number;
  from: 'user' | 'bot';
  text: string;
  time: string;
};

// ─── Main Chatbot ─────────────────────────────────────────────────────────────
export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      from: 'bot',
      text: '👋 Cześć! Jestem **GreenvilleBot**!\n\nMogę odpowiedzieć na pytania o serwer. Wpisz np. _"jak się zweryfikować"_, _"jak dołączyć do policji"_ lub _"kiedy jest sesja"_.',
      time: now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  function now() {
    return new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  function handleOpen() {
    setOpen(o => !o);
    setUnread(0);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: Date.now(), from: 'user', text, time: now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simulate thinking time
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

    const answer = findAnswer(text);
    const botMsg: Message = { id: Date.now() + 1, from: 'bot', text: answer, time: now() };
    setMessages(prev => [...prev, botMsg]);
    setTyping(false);

    if (!open) setUnread(u => u + 1);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const quickButtons = ['Jak dołączyć?', 'Służby', 'Sesje RP', 'Regulamin'];

  return (
    <>
      {/* ── Chat window ── */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[340px] max-w-[calc(100vw-24px)] bg-[#0d1117] border border-[#30d158]/25 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
          style={{ maxHeight: '520px' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-[#0a0f18]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#30d158] to-[#00c8ff] flex items-center justify-center font-black text-black text-xs">
              G
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-white">GreenvilleBot</div>
              <div className="text-xs text-[#30d158] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
                Online
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white transition-colors text-lg leading-none">
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 200 }}>
            {messages.map(m => (
              <div key={m.id} className={`flex gap-2 ${m.from === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {m.from === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#30d158] to-[#00c8ff] flex items-center justify-center text-black font-black text-xs shrink-0 mt-0.5">
                    G
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.from === 'user'
                    ? 'bg-[#5865F2] text-white rounded-tr-sm'
                    : 'bg-[#161b22] text-white/80 rounded-tl-sm border border-white/5'
                }`}>
                  {m.from === 'bot' ? (
                    <FormatAnswer text={m.text} />
                  ) : (
                    <span>{m.text}</span>
                  )}
                  <div className={`text-[10px] mt-1 ${m.from === 'user' ? 'text-white/40' : 'text-white/25'}`}>
                    {m.time}
                  </div>
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#30d158] to-[#00c8ff] flex items-center justify-center text-black font-black text-xs shrink-0">
                  G
                </div>
                <div className="bg-[#161b22] border border-white/5 rounded-xl rounded-tl-sm px-3 py-2">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick buttons */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {quickButtons.map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(() => handleSend(), 50); }}
                  className="text-xs bg-[#30d158]/10 hover:bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/25 px-2.5 py-1 rounded-full transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/8 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Zadaj pytanie..."
              className="flex-1 bg-[#161b22] border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#30d158]/50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || typing}
              className="bg-[#30d158] hover:bg-[#27ae60] disabled:opacity-40 text-black w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Floating button ── */}
      <button
        onClick={handleOpen}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#30d158] to-[#00c8ff] shadow-xl shadow-[#30d158]/30 flex items-center justify-center hover:scale-110 transition-all"
      >
        {open ? (
          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}
