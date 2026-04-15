'use client';

// ============================================================
// Greenville RP — Formularz weryfikacyjny
// Automatycznie sprawdza odpowiedzi i nadaje rolę Mieszkaniec
// ============================================================

import { useState } from 'react';

// ── Pytania z presetowanymi poprawnymi odpowiedziami ─────────
const QUESTIONS = [
  {
    q: 'Co oznacza skrót FRP (Fail Role Play)?',
    options: [
      'Tryb gry dla zaawansowanych graczy',
      'Zachowanie niezgodne z realiami RP (np. ignorowanie śmierci)',
      'Komenda resetu postaci w grze',
      'Rola nadawana przez administrację',
    ],
    correct: 1,
  },
  {
    q: 'Co to jest NLR (New Life Rule)?',
    options: [
      'Nowy regulamin serwera wprowadzany co roku',
      'Zasada zakazująca powrotu na miejsce śmierci i pamiętania o poprzednim życiu',
      'Komenda umożliwiająca reset statystyk postaci',
      'Rola nadawana po 30 dniach na serwerze',
    ],
    correct: 1,
  },
  {
    q: 'Co to jest metagaming?',
    options: [
      'Granie na wielu serwerach RP jednocześnie',
      'Modyfikowanie gry Roblox za pomocą skryptów',
      'Używanie informacji zdobytych poza postacią (np. z Discorda) podczas sesji RP',
      'Zbieranie doświadczenia w grze przez wykonywanie zadań',
    ],
    correct: 2,
  },
  {
    q: 'Co to jest RDM (Random Death Match)?',
    options: [
      'Turniej PvP organizowany przez administrację',
      'Tryb gry bez zasad RP',
      'Zabijanie innych graczy bez żadnego powodu wynikającego z fabuły RP',
      'System rankingowy serwera',
    ],
    correct: 2,
  },
  {
    q: 'Co powinieneś zrobić, gdy masz problem z innym graczem podczas sesji RP?',
    options: [
      'Wyjść z gry i poczekać aż problem sam zniknie',
      'Zemścić się w grze na tym graczu',
      'Pisać do niego wiadomości prywatne na Discordzie',
      'Otworzyć ticket lub zgłosić problem staffowi serwera',
    ],
    correct: 3,
  },
  {
    q: 'Jakiego języka należy używać podczas rozmów IC (In Character) na serwerze?',
    options: [
      'Angielskiego — serwer jest międzynarodowy',
      'Polskiego — Greenville RP to polski serwer RP',
      'Dowolnego — każdy może mówić w swoim języku',
      'Zależy od roli postaci',
    ],
    correct: 1,
  },
  {
    q: 'Czym jest rola Mieszkaniec?',
    options: [
      'Rola VIP dostępna za donację',
      'Rola automatycznie nadawana każdemu kto dołączy na serwer',
      'Rola uzyskiwana po pomyślnym przejściu pełnej weryfikacji',
      'Rola przyznawana przez moderatorów za aktywność',
    ],
    correct: 2,
  },
  {
    q: 'Co to jest OOC (Out of Character)?',
    options: [
      'Komenda do wylogowania się z serwera',
      'Rozmowa prowadzona poza rolą postaci, jako ty sam (nie jako postać RP)',
      'System oceniania graczy przez administrację',
      'Tryb obserwatora podczas sesji',
    ],
    correct: 1,
  },
  {
    q: 'Co grozi za złamanie zasad serwera (np. RDM, FRP)?',
    options: [
      'Nic — regulamin nie przewiduje kar',
      'Tylko kick z aktywnej sesji',
      'Ostrzeżenie (warn), a przy powtórzeniu — kick lub ban',
      'Automatyczne usunięcie roli bez możliwości odwołania',
    ],
    correct: 2,
  },
  {
    q: 'Czy wolno używać informacji z kanałów Discord (np. OOC czatu) podczas aktywnej sesji RP jako wiedzę swojej postaci?',
    options: [
      'Tak, wszystkie kanały Discord są dostępne dla postaci',
      'Tak, ale tylko kanały kategorii Staff',
      'Nie — to jest metagaming i jest surowo zabronione',
      'Tak, jeśli informacja dotyczy twojej postaci',
    ],
    correct: 2,
  },
];

const MIN_SCORE = 8;

interface FormState {
  discordId: string;
  robloxNick: string;
  answers: (number | null)[];
}

type SubmitStatus = 'idle' | 'loading' | 'passed' | 'failed' | 'error';

interface ResultData {
  score: number;
  total: number;
  results: { correct: boolean; correctAnswer: number; userAnswer: number }[];
  message?: string;
}

export default function WeryfikacjaPage() {
  const [form, setForm] = useState<FormState>({
    discordId: '',
    robloxNick: '',
    answers: Array(QUESTIONS.length).fill(null),
  });
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState('');

  const setAnswer = (qi: number, ai: number) => {
    setForm(prev => {
      const answers = [...prev.answers];
      answers[qi] = ai;
      return { ...prev, answers };
    });
  };

  const allAnswered = form.answers.every(a => a !== null);
  const discordIdValid = /^\d{17,20}$/.test(form.discordId.trim());
  const robloxNickValid = form.robloxNick.trim().length >= 3;
  const canSubmit = allAnswered && discordIdValid && robloxNickValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus('loading');
    setError('');

    try {
      const res = await fetch('/api/weryfikacja/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: form.discordId.trim(),
          robloxNick: form.robloxNick.trim(),
          answers: form.answers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Wystąpił błąd serwera.');
        setStatus('error');
        return;
      }

      setResult(data);
      setStatus(data.passed ? 'passed' : 'failed');
    } catch {
      setError('Nie udało się połączyć z serwerem. Spróbuj ponownie.');
      setStatus('error');
    }
  };

  // ── WYNIK KOŃCOWY ────────────────────────────────────────────
  if (status === 'passed' && result) {
    return (
      <div className="min-h-screen bg-[#1a1b1e] flex items-center justify-center p-4">
        <div className="bg-[#2b2d31] rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-green-500/30 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-green-400 mb-2">Gratulacje!</h1>
          <p className="text-white text-lg mb-4">
            Uzyskałeś <strong>{result.score}/{result.total}</strong> punktów i pomyślnie przeszedłeś weryfikację!
          </p>
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
            <p className="text-green-300 text-sm">
              🏠 Rola <strong>Mieszkaniec</strong> została nadana na serwerze Discord.<br />
              Odśwież Discord jeśli nie widzisz zmiany.
            </p>
          </div>
          <p className="text-gray-400 text-sm">
            Witaj w <strong className="text-white">Greenville RP</strong>!{' '}
            <a href="https://discord.gg/BU8EBPsYXV" className="text-[#5865F2] hover:underline" target="_blank" rel="noopener noreferrer">
              Wróć na serwer →
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (status === 'failed' && result) {
    return (
      <div className="min-h-screen bg-[#1a1b1e] flex items-center justify-center p-4">
        <div className="bg-[#2b2d31] rounded-2xl p-8 max-w-2xl w-full shadow-2xl border border-red-500/30">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">❌</div>
            <h1 className="text-2xl font-bold text-red-400 mb-1">Nie udało się</h1>
            <p className="text-gray-300">
              Uzyskałeś <strong>{result.score}/{result.total}</strong> punktów. Wymagane minimum: <strong>{MIN_SCORE}/{result.total}</strong>
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {QUESTIONS.map((q, i) => {
              const r = result.results[i];
              return (
                <div
                  key={i}
                  className={`rounded-lg p-3 border text-sm ${
                    r.correct
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <p className="font-medium text-white mb-1">
                    {r.correct ? '✅' : '❌'} {i + 1}. {q.q}
                  </p>
                  {!r.correct && (
                    <p className="text-gray-300">
                      Twoja odpowiedź: <span className="text-red-400">{q.options[r.userAnswer]}</span>
                      <br />
                      Poprawna odpowiedź: <span className="text-green-400">{q.options[r.correctAnswer]}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <p className="text-gray-400 text-sm mb-4">
              Przeczytaj dokładnie{' '}
              <a href="https://discord.gg/BU8EBPsYXV" className="text-[#5865F2] hover:underline" target="_blank" rel="noopener noreferrer">
                regulamin serwera
              </a>{' '}
              i spróbuj ponownie za 24 godziny.
            </p>
            <button
              onClick={() => {
                setStatus('idle');
                setResult(null);
                setForm({ discordId: '', robloxNick: '', answers: Array(QUESTIONS.length).fill(null) });
              }}
              className="bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-2 rounded-xl font-semibold transition-colors"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FORMULARZ ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#1a1b1e] py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Nagłówek */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏙️</div>
          <h1 className="text-3xl font-bold text-white mb-2">Greenville RP</h1>
          <p className="text-gray-400">Formularz weryfikacyjny — wypełnij aby dołączyć do serwera</p>
          <div className="mt-3 bg-[#5865F2]/20 border border-[#5865F2]/40 rounded-xl px-4 py-2 inline-block">
            <p className="text-[#a5b0fb] text-sm">
              📋 Odpowiedz poprawnie na minimum <strong>{MIN_SCORE}/{QUESTIONS.length}</strong> pytań z regulaminu
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Discord ID */}
          <div className="bg-[#2b2d31] rounded-2xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">👤 Twoje konta</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">
                  Discord ID <span className="text-red-400">*</span>
                  <span className="text-gray-500 ml-2 font-normal text-xs">
                    (Ustawienia → Zaawansowane → Tryb dewelopera → PPM na nick → Kopiuj ID)
                  </span>
                </label>
                <input
                  type="text"
                  value={form.discordId}
                  onChange={e => setForm(prev => ({ ...prev, discordId: e.target.value }))}
                  placeholder="np. 123456789012345678"
                  className={`w-full bg-[#1e2124] text-white rounded-xl px-4 py-3 border outline-none transition-colors placeholder:text-gray-600 ${
                    form.discordId && !discordIdValid
                      ? 'border-red-500/50 focus:border-red-400'
                      : 'border-white/10 focus:border-[#5865F2]'
                  }`}
                />
                {form.discordId && !discordIdValid && (
                  <p className="text-red-400 text-xs mt-1">ID musi mieć 17–20 cyfr. Sprawdź czy tryb dewelopera jest włączony.</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1.5">
                  Nick Roblox <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.robloxNick}
                  onChange={e => setForm(prev => ({ ...prev, robloxNick: e.target.value }))}
                  placeholder="Twój dokładny nick na Roblox"
                  className="w-full bg-[#1e2124] text-white rounded-xl px-4 py-3 border border-white/10 focus:border-[#5865F2] outline-none transition-colors placeholder:text-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Pytania */}
          <div className="bg-[#2b2d31] rounded-2xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-1">📋 Pytania z regulaminu</h2>
            <p className="text-gray-500 text-sm mb-5">Wybierz jedną odpowiedź dla każdego pytania</p>

            <div className="space-y-6">
              {QUESTIONS.map((q, qi) => (
                <div key={qi} className="border-b border-white/5 pb-5 last:border-0 last:pb-0">
                  <p className="text-white font-medium mb-3">
                    <span className="text-[#5865F2] font-bold mr-2">{qi + 1}.</span>
                    {q.q}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <label
                        key={oi}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${
                          form.answers[qi] === oi
                            ? 'bg-[#5865F2]/20 border-[#5865F2]/60 text-white'
                            : 'bg-[#1e2124] border-white/5 text-gray-300 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q_${qi}`}
                          value={oi}
                          checked={form.answers[qi] === oi}
                          onChange={() => setAnswer(qi, oi)}
                          className="hidden"
                        />
                        <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          form.answers[qi] === oi ? 'border-[#5865F2] bg-[#5865F2]' : 'border-gray-600'
                        }`}>
                          {form.answers[qi] === oi && (
                            <span className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </span>
                        <span className="text-sm">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Błąd */}
          {(status === 'error' || error) && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
              ❌ {error}
            </div>
          )}

          {/* Postęp */}
          <div className="text-center text-gray-500 text-sm">
            Udzielono odpowiedzi: <strong className="text-gray-300">{form.answers.filter(a => a !== null).length}/{QUESTIONS.length}</strong>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit || status === 'loading'}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
              canSubmit && status !== 'loading'
                ? 'bg-[#57F287] hover:bg-[#42d770] text-black shadow-lg shadow-[#57F287]/20'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {status === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sprawdzam odpowiedzi...
              </span>
            ) : (
              '✅ Wyślij formularz weryfikacyjny'
            )}
          </button>

          <p className="text-center text-gray-600 text-xs pb-4">
            Masz pytania?{' '}
            <a href="https://discord.gg/BU8EBPsYXV" className="text-[#5865F2] hover:underline" target="_blank" rel="noopener noreferrer">
              Dołącz na serwer Discord
            </a>{' '}
            i otwórz ticket.
          </p>
        </form>
      </div>
    </div>
  );
}
