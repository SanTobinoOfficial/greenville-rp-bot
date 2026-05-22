'use client';

// Greenville RP — Formularz weryfikacyjny
// Design: spójny z landing page (#0c0c10 / #16161d / rgba(255,255,255,0.07))

import { useState, CSSProperties } from 'react';

// ── Pytania ──────────────────────────────────────────────────────────────────
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
    q: 'Czy wolno używać informacji z kanałów Discord podczas aktywnej sesji RP jako wiedzę swojej postaci?',
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
const OPEN_MIN_LENGTH = 40;
const SITUATION_MIN_LENGTH = 60;

// ── Pytania otwarte ───────────────────────────────────────────────────────────
const OPEN_QUESTIONS = [
  {
    id: 'o1',
    q: 'Dlaczego chcesz dołączyć do serwera Greenville RP? Co Cię przyciąga do tego typu rozgrywki?',
    placeholder: 'Opisz krótko swoje motywacje i oczekiwania wobec serwera...',
    minLength: OPEN_MIN_LENGTH,
  },
  {
    id: 'o2',
    q: 'Jakie masz doświadczenie z graniem w RP (inne serwery, gry RP, itp.)?',
    placeholder: 'Możesz napisać "brak doświadczenia" — brak RP nie dyskwalifikuje. Opisz co wiesz...',
    minLength: OPEN_MIN_LENGTH,
  },
];

// ── Symulacje sytuacji ────────────────────────────────────────────────────────
const SITUATIONS = [
  {
    id: 's1',
    title: 'Sytuacja 1 — Świadek wypadku drogowego',
    scenario: 'Jesteś cywilnym mieszkańcem Greenville. Jedziesz autem i nagle widzisz poważny wypadek — dwa rozbite auta, jedna osoba leży nieprzytomna na jezdni. Jesteś pierwszy na miejscu.',
    q: 'Opisz krok po kroku co robisz jako postać RP w tej sytuacji.',
    placeholder: 'Napisz swoją odpowiedź...',
    minLength: SITUATION_MIN_LENGTH,
  },
  {
    id: 's2',
    title: 'Sytuacja 2 — Konflikt z innym graczem',
    scenario: 'Podczas sesji RP inny gracz atakuje Twoją postać bez żadnego powodu fabularnego — typowy RDM. Twoja postać "ginie". Jesteś sfrustrowany.',
    q: 'Jak reagujesz? Opisz zarówno co robi Twoja postać (IC) jak i co robisz Ty jako gracz (OOC).',
    placeholder: 'Napisz swoją odpowiedź...',
    minLength: SITUATION_MIN_LENGTH,
  },
  {
    id: 's3',
    title: 'Sytuacja 3 — Informacja z Discorda',
    scenario: 'Na kanale #ogłoszenia na Discordzie pojawia się informacja, że policja szuka postaci o imieniu "Marco Ricci" za przemyt. Twoja postać przypadkowo spotkała dzisiaj w grze kogoś, kto przedstawił się jako Marco Ricci.',
    q: 'Czy Twoja postać może teraz zgłosić policji miejsce pobytu Marco? Dlaczego tak lub nie?',
    placeholder: 'Napisz swoją odpowiedź...',
    minLength: SITUATION_MIN_LENGTH,
  },
];

// ── Style helpers ─────────────────────────────────────────────────────────────
const page: CSSProperties  = { minHeight: '100vh', background: '#0c0c10', fontFamily: "'Inter', -apple-system, sans-serif", color: '#f4f4f8', padding: '60px 20px 80px' };
const wrap: CSSProperties  = { maxWidth: 660, margin: '0 auto' };
const card: CSSProperties  = { background: '#16161d', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '22px 24px', marginBottom: 8 };
const inp: CSSProperties   = { width: '100%', background: '#0c0c10', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '10px 13px', fontSize: 13, color: '#f4f4f8', outline: 'none', boxSizing: 'border-box' };
const label: CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 7, display: 'block' };
const hint: CSSProperties  = { fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 5 };

// ── Types ────────────────────────────────────────────────────────────────────
interface FormState {
  discordId: string;
  robloxNick: string;
  answers: (number | null)[];
  openAnswers: string[];
  situationAnswers: string[];
}
type SubmitStatus = 'idle' | 'loading' | 'passed' | 'failed' | 'error';
interface ResultData { score: number; total: number; results: { correct: boolean; correctAnswer: number; userAnswer: number }[]; message?: string; }

// ── Accordion question ────────────────────────────────────────────────────────
function Question({
  index, q, options, selected, open, onToggle, onSelect,
}: {
  index: number; q: string; options: string[]; selected: number | null;
  open: boolean; onToggle: () => void; onSelect: (i: number) => void;
}) {
  const answered = selected !== null;
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        {/* Number badge */}
        <span style={{ width: 24, height: 24, borderRadius: 6, background: answered ? 'rgba(88,101,242,0.18)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: answered ? '#818cf8' : 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
          {index + 1}
        </span>

        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#f4f4f8', lineHeight: 1.5 }}>{q}</span>

        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginLeft: 8 }}>
          {answered ? <span style={{ color: '#5865F2' }}>✓</span> : open ? '−' : '+'}
        </span>
      </button>

      {/* Options */}
      {open && (
        <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {options.map((opt, oi) => {
            const isSelected = selected === oi;
            return (
              <button
                key={oi}
                type="button"
                onClick={() => onSelect(oi)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 7, border: isSelected ? '1px solid rgba(88,101,242,0.35)' : '1px solid rgba(255,255,255,0.06)', background: isSelected ? 'rgba(88,101,242,0.1)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left', transition: 'all .12s', marginTop: oi === 0 ? 12 : 0 }}
              >
                <span style={{ width: 16, height: 16, borderRadius: '50%', border: isSelected ? '2px solid #5865F2' : '2px solid rgba(255,255,255,0.2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isSelected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5865F2', display: 'block' }} />}
                </span>
                <span style={{ fontSize: 13, color: isSelected ? '#f4f4f8' : 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WeryfikacjaPage() {
  const [form, setForm] = useState<FormState>({
    discordId: '',
    robloxNick: '',
    answers: Array(QUESTIONS.length).fill(null),
    openAnswers: Array(OPEN_QUESTIONS.length).fill(''),
    situationAnswers: Array(SITUATIONS.length).fill(''),
  });
  const [openQuestions, setOpenQuestions] = useState<boolean[]>(Array(QUESTIONS.length).fill(true));
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState('');

  const setAnswer = (qi: number, ai: number) => {
    setForm(prev => { const a = [...prev.answers]; a[qi] = ai; return { ...prev, answers: a }; });
  };
  const setOpenAnswer = (i: number, val: string) => {
    setForm(prev => { const a = [...prev.openAnswers]; a[i] = val; return { ...prev, openAnswers: a }; });
  };
  const setSituationAnswer = (i: number, val: string) => {
    setForm(prev => { const a = [...prev.situationAnswers]; a[i] = val; return { ...prev, situationAnswers: a }; });
  };

  const toggleQuestion = (qi: number) => {
    setOpenQuestions(prev => { const n = [...prev]; n[qi] = !n[qi]; return n; });
  };

  const answered          = form.answers.filter(a => a !== null).length;
  const openFilled        = form.openAnswers.every((a, i) => a.trim().length >= OPEN_QUESTIONS[i].minLength);
  const situationsFilled  = form.situationAnswers.every((a, i) => a.trim().length >= SITUATIONS[i].minLength);
  const discordIdValid    = /^\d{17,20}$/.test(form.discordId.trim());
  const robloxValid       = form.robloxNick.trim().length >= 3;
  const canSubmit         = answered === QUESTIONS.length && openFilled && situationsFilled && discordIdValid && robloxValid;

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
          openAnswers: form.openAnswers,
          situationAnswers: form.situationAnswers,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Wystąpił błąd serwera.'); setStatus('error'); return; }
      setResult(data);
      setStatus(data.passed ? 'passed' : 'failed');
    } catch {
      setError('Nie udało się połączyć z serwerem. Spróbuj ponownie.');
      setStatus('error');
    }
  };

  const resetForm = () => {
    setStatus('idle');
    setResult(null);
    setForm({ discordId: '', robloxNick: '', answers: Array(QUESTIONS.length).fill(null), openAnswers: Array(OPEN_QUESTIONS.length).fill(''), situationAnswers: Array(SITUATIONS.length).fill('') });
    setOpenQuestions(Array(QUESTIONS.length).fill(true));
  };

  // ── Sukces ─────────────────────────────────────────────────────────────────
  if (status === 'passed' && result) {
    return (
      <div style={page}>
        <div style={{ ...wrap, maxWidth: 480, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 26 }}>✓</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f4f4f8', margin: '0 0 10px', letterSpacing: '-0.02em' }}>Weryfikacja zaliczona</h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px', lineHeight: 1.6 }}>
            Uzyskałeś <strong style={{ color: '#22c55e' }}>{result.score}/{result.total}</strong> punktów. Rola <strong style={{ color: '#f4f4f8' }}>Mieszkaniec</strong> została nadana na serwerze Discord.
          </p>
          <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 8, padding: '12px 16px', marginBottom: 28 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Odśwież Discord jeśli nie widzisz zmiany ról.</p>
          </div>
          <a href="https://discord.gg/BU8EBPsYXV" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, fontWeight: 600, fontSize: 14, background: '#5865F2', color: '#fff', textDecoration: 'none' }}>
            Wróć na serwer Discord →
          </a>
        </div>
      </div>
    );
  }

  // ── Porażka ────────────────────────────────────────────────────────────────
  if (status === 'failed' && result) {
    return (
      <div style={page}>
        <div style={wrap}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', fontSize: 22, color: '#ef4444' }}>✕</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f4f4f8', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Nie udało się</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Wynik: <strong style={{ color: '#f4f4f8' }}>{result.score}/{result.total}</strong> — wymagane minimum: <strong style={{ color: '#f4f4f8' }}>{MIN_SCORE}/{result.total}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
            {QUESTIONS.map((q, i) => {
              const r = result.results[i];
              return (
                <div key={i} style={{ background: r.correct ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)', border: `1px solid ${r.correct ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`, borderRadius: 8, padding: '12px 16px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: r.correct ? '#22c55e' : '#f87171', margin: '0 0 4px' }}>
                    {r.correct ? '✓' : '✕'} {i + 1}. {q.q}
                  </p>
                  {!r.correct && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                      Twoja odpowiedź: <span style={{ color: '#f87171' }}>{q.options[r.userAnswer]}</span><br />
                      Poprawna: <span style={{ color: '#22c55e' }}>{q.options[r.correctAnswer]}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>
              Przeczytaj{' '}
              <a href="https://discord.gg/BU8EBPsYXV" target="_blank" rel="noopener noreferrer" style={{ color: '#5865F2', textDecoration: 'none' }}>regulamin serwera</a>
              {' '}i spróbuj ponownie za 24 godziny.
            </p>
            <button onClick={resetForm}
              style={{ padding: '10px 28px', borderRadius: 8, fontWeight: 600, fontSize: 14, background: '#5865F2', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formularz ──────────────────────────────────────────────────────────────
  return (
    <div style={page}>
      <div style={wrap}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#5865F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 20, margin: '0 auto 18px' }}>G</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f4f4f8', margin: '0 0 8px', letterSpacing: '-0.03em' }}>Weryfikacja Greenville RP</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', margin: '0 0 20px', lineHeight: 1.6 }}>
            Wypełnij formularz i odpowiedz na pytania z regulaminu, aby dołączyć do serwera.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid rgba(88,101,242,0.25)', background: 'rgba(88,101,242,0.08)', color: '#818cf8' }}>
              Quiz: minimum {MIN_SCORE} z {QUESTIONS.length} poprawnych
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}>
              + {OPEN_QUESTIONS.length} pytania otwarte + {SITUATIONS.length} symulacje
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Konta */}
          <div style={{ ...card, marginBottom: 24 }}>
            <p style={{ ...label, marginBottom: 16, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Twoje konta</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={label}>
                  Discord ID <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.discordId}
                  onChange={e => setForm(p => ({ ...p, discordId: e.target.value }))}
                  placeholder="np. 123456789012345678"
                  style={{ ...inp, borderColor: form.discordId && !discordIdValid ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)' }}
                />
                <p style={hint}>Ustawienia → Zaawansowane → Tryb dewelopera → PPM na swój nick → Kopiuj ID</p>
                {form.discordId && !discordIdValid && (
                  <p style={{ ...hint, color: 'rgba(239,68,68,0.7)', marginTop: 5 }}>ID musi mieć 17–20 cyfr.</p>
                )}
              </div>
              <div>
                <label style={label}>Nick Roblox <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={form.robloxNick}
                  onChange={e => setForm(p => ({ ...p, robloxNick: e.target.value }))}
                  placeholder="Twój dokładny nick na Roblox"
                  style={inp}
                />
              </div>
            </div>
          </div>

          {/* Pytania */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ ...label, margin: 0 }}>Pytania z regulaminu</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setOpenQuestions(Array(QUESTIONS.length).fill(true))}
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Rozwiń wszystkie
                </button>
                <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                <button type="button" onClick={() => setOpenQuestions(Array(QUESTIONS.length).fill(false))}
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Zwiń wszystkie
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {QUESTIONS.map((q, qi) => (
                <Question
                  key={qi}
                  index={qi}
                  q={q.q}
                  options={q.options}
                  selected={form.answers[qi]}
                  open={openQuestions[qi]}
                  onToggle={() => toggleQuestion(qi)}
                  onSelect={(ai) => setAnswer(qi, ai)}
                />
              ))}
            </div>
          </div>

          {/* Quiz progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 32px' }}>
            <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
              <div style={{ height: '100%', borderRadius: 2, background: '#5865F2', width: `${(answered / QUESTIONS.length) * 100}%`, transition: 'width .3s' }} />
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}>{answered}/{QUESTIONS.length}</span>
          </div>

          {/* Pytania otwarte */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✍</div>
              <p style={{ ...label, margin: 0 }}>Pytania otwarte</p>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginLeft: 'auto' }}>Wymagane</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {OPEN_QUESTIONS.map((oq, i) => {
                const val    = form.openAnswers[i];
                const filled = val.trim().length >= oq.minLength;
                return (
                  <div key={oq.id} style={{ ...card, marginBottom: 0, padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#f4f4f8', margin: 0, lineHeight: 1.55 }}>{i + 1}. {oq.q}</p>
                      {filled && <span style={{ fontSize: 10, color: '#22c55e', flexShrink: 0, marginTop: 2 }}>✓</span>}
                    </div>
                    <textarea
                      value={val}
                      onChange={e => setOpenAnswer(i, e.target.value)}
                      placeholder={oq.placeholder}
                      rows={3}
                      style={{ ...inp, resize: 'vertical', lineHeight: 1.6, borderColor: val && !filled ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                      <span style={{ fontSize: 11, color: filled ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.18)' }}>
                        {val.trim().length}/{oq.minLength} znaków minimum
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Symulacje sytuacji */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>🎭</div>
              <p style={{ ...label, margin: 0 }}>Symulacje sytuacji</p>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginLeft: 'auto' }}>Wymagane</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {SITUATIONS.map((sit, i) => {
                const val    = form.situationAnswers[i];
                const filled = val.trim().length >= sit.minLength;
                return (
                  <div key={sit.id} style={{ ...card, marginBottom: 0, padding: '18px 20px' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fbbf24', margin: '0 0 8px' }}>{sit.title}</p>
                    <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)', borderRadius: 7, padding: '10px 14px', marginBottom: 12 }}>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6 }}>{sit.scenario}</p>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#f4f4f8', margin: '0 0 10px', lineHeight: 1.55 }}>❓ {sit.q}</p>
                    <textarea
                      value={val}
                      onChange={e => setSituationAnswer(i, e.target.value)}
                      placeholder={sit.placeholder}
                      rows={4}
                      style={{ ...inp, resize: 'vertical', lineHeight: 1.6, borderColor: val && !filled ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                      <span style={{ fontSize: 11, color: filled ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.18)' }}>
                        {val.trim().length}/{sit.minLength} znaków minimum
                      </span>
                      {filled && <span style={{ fontSize: 11, color: '#22c55e' }}>✓ Wystarczająco</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {(status === 'error' || error) && (
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#f87171' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit || status === 'loading'}
            style={{ width: '100%', padding: '12px 0', borderRadius: 8, fontWeight: 700, fontSize: 14, background: canSubmit && status !== 'loading' ? '#5865F2' : 'rgba(255,255,255,0.06)', color: canSubmit && status !== 'loading' ? '#fff' : 'rgba(255,255,255,0.2)', border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'background .15s' }}
          >
            {status === 'loading' ? 'Sprawdzam odpowiedzi…' : 'Wyślij formularz weryfikacyjny'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 20 }}>
            Masz pytania?{' '}
            <a href="https://discord.gg/BU8EBPsYXV" target="_blank" rel="noopener noreferrer" style={{ color: '#5865F2', textDecoration: 'none' }}>
              Dołącz na Discord i otwórz ticket
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
