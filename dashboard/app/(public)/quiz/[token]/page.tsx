'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, Send, PenLine, List } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  type: 'CLOSED' | 'OPEN';
  answers: string[];  // puste dla OPEN
  order: number;
}

interface ApiResponse {
  questions: Question[];
  total: number;
  expiresAt: string;
  timeLimit: number;
  passScore: number;
  userInfo: { robloxUsername: string | null };
}

type Phase = 'loading' | 'error' | 'quiz' | 'submitted' | 'result';

interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  partialPass: boolean;
  passScore: number;
}

export default function QuizPage() {
  const { token } = useParams<{ token: string }>();

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [passScore, setPassScore] = useState(14);
  const [current, setCurrent] = useState(0);
  // closedAnswers[i] = indeks wybranej opcji (−1 = nie wybrano) — dla pytań CLOSED
  const [closedAnswers, setClosedAnswers] = useState<number[]>([]);
  // openAnswers[i] = tekst odpowiedzi — dla pytań OPEN
  const [openAnswers, setOpenAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(20 * 60);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startTime = useRef<number>(Date.now());

  // Fetch questions
  useEffect(() => {
    if (!token) return;
    fetch(`/api/quiz/questions?token=${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? 'Nie udało się załadować quizu.');
        }
        return res.json() as Promise<ApiResponse>;
      })
      .then((data) => {
        setQuestions(data.questions);
        setPassScore(data.passScore);
        setTimeLeft(data.timeLimit ?? 20 * 60);
        setClosedAnswers(new Array(data.questions.length).fill(-1));
        setOpenAnswers(new Array(data.questions.length).fill(''));
        startTime.current = Date.now();
        setPhase('quiz');
      })
      .catch((err: Error) => {
        setErrorMsg(err.message);
        setPhase('error');
      });
  }, [token]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'quiz') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleSubmit = useCallback(
    async (forced = false) => {
      if (submitting) return;
      setSubmitting(true);
      setPhase('submitted');
      const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
      try {
        const res = await fetch('/api/quiz/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, answers: closedAnswers, openAnswers, timeSpent }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Błąd przesyłania.');
        setResult(data);
        setPhase('result');
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Błąd przesyłania quizu.');
        setPhase('error');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [closedAnswers, openAnswers, token, submitting]
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isAnswered = (idx: number) => {
    const q = questions[idx];
    if (!q) return false;
    return q.type === 'OPEN'
      ? openAnswers[idx]?.trim().length >= 20
      : closedAnswers[idx] !== -1;
  };

  const answered = questions.filter((_, i) => isAnswered(i)).length;
  const progressPct = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;

  // ---------- LOADING ----------
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#2B2D31] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#5865F2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Ładowanie quizu…</p>
        </div>
      </div>
    );
  }

  // ---------- ERROR ----------
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-[#2B2D31] flex items-center justify-center px-4">
        <div className="bg-[#1e2024] border border-red-500/30 rounded-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Błąd</h2>
          <p className="text-white/60 text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  // ---------- SUBMITTED ----------
  if (phase === 'submitted') {
    return (
      <div className="min-h-screen bg-[#2B2D31] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#5865F2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Sprawdzanie odpowiedzi…</p>
        </div>
      </div>
    );
  }

  // ---------- RESULT ----------
  if (phase === 'result' && result) {
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <div className="min-h-screen bg-[#2B2D31] flex items-center justify-center px-4">
        <div className="bg-[#1e2024] border border-white/10 rounded-xl p-8 max-w-md w-full text-center">
          {result.passed ? (
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          ) : result.partialPass ? (
            <CheckCircle2 className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          )}
          <h2 className="text-2xl font-bold mb-1">
            {result.passed
              ? 'Zaliczono!'
              : result.partialPass
              ? 'Częściowo zaliczono'
              : 'Nie zaliczono'}
          </h2>
          <p className="text-white/50 mb-6 text-sm">
            {result.passed
              ? 'Gratulacje! Wynik wystarczający do pełnej weryfikacji. Wróć na serwer Discord — rola Mieszkaniec zostanie nadana automatycznie.'
              : result.partialPass
              ? `Wynik wystarczający do częściowej weryfikacji. Wymagane minimum to ${result.passScore}/${result.total}.`
              : `Nie uzyskałeś/łaś wymaganego minimum ${result.passScore}/${result.total}. Przeczytaj regulamin i spróbuj ponownie za 24 godziny.`}
          </p>
          <div className="bg-[#2B2D31] rounded-lg px-6 py-4 mb-4">
            <div
              className={`text-5xl font-extrabold mb-1 ${
                result.passed
                  ? 'text-green-400'
                  : result.partialPass
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}
            >
              {result.score}/{result.total}
            </div>
            <div className="text-white/40 text-sm">{pct}% poprawnych odpowiedzi</div>
          </div>
          <p className="text-white/40 text-xs">
            Wyniki zostały zapisane. Wróć na serwer Discord AURORA Greenville RP, aby zobaczyć status weryfikacji.
          </p>
        </div>
      </div>
    );
  }

  // ---------- QUIZ ----------
  const q = questions[current];
  const timerWarning = timeLeft <= 120;
  const isOpenQ = q?.type === 'OPEN';

  return (
    <div className="min-h-screen bg-[#2B2D31] flex flex-col text-white">
      {/* Top bar */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="text-sm font-medium text-white/70">
            Quiz weryfikacyjny{' '}
            <span className="text-white font-semibold">AURORA Greenville RP</span>
          </div>
          <div
            className={`flex items-center gap-2 font-mono font-semibold text-sm ${
              timerWarning ? 'text-red-400 animate-pulse' : 'text-white/70'
            }`}
          >
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-white/10">
        <div
          className="h-1 bg-[#5865F2] transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          {/* Question header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/50 text-sm">
              Pytanie{' '}
              <span className="text-white font-semibold">{current + 1}</span>
              /{questions.length}
            </span>
            <div className="flex items-center gap-3">
              {/* Typ pytania */}
              <span
                className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                  isOpenQ
                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                    : 'bg-[#5865F2]/15 text-[#5865F2] border border-[#5865F2]/30'
                }`}
              >
                {isOpenQ ? <PenLine className="w-3 h-3" /> : <List className="w-3 h-3" />}
                {isOpenQ ? 'Otwarte' : 'Zamknięte'}
              </span>
              <span className="text-white/40 text-xs">
                Odpowiedziano: {answered}/{questions.length}
              </span>
            </div>
          </div>

          {/* Question card */}
          <div className="bg-[#1e2024] border border-white/10 rounded-xl p-6 mb-6">
            <p className="text-lg font-medium leading-relaxed mb-6">{q?.question}</p>

            {/* CLOSED — przyciski wyboru */}
            {!isOpenQ && (
              <div className="space-y-3">
                {q?.answers.map((ans, idx) => {
                  const selected = closedAnswers[current] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        const updated = [...closedAnswers];
                        updated[current] = idx;
                        setClosedAnswers(updated);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                        selected
                          ? 'border-[#5865F2] bg-[#5865F2]/15 text-white'
                          : 'border-white/10 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10'
                      }`}
                    >
                      <span className="font-semibold mr-3 text-white/40">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {ans}
                    </button>
                  );
                })}
              </div>
            )}

            {/* OPEN — pole tekstowe */}
            {isOpenQ && (
              <div>
                <textarea
                  value={openAnswers[current] ?? ''}
                  onChange={(e) => {
                    const updated = [...openAnswers];
                    updated[current] = e.target.value;
                    setOpenAnswers(updated);
                  }}
                  rows={5}
                  placeholder="Napisz swoją odpowiedź tutaj… (minimum 20 znaków)"
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-[#5865F2]/60 transition-colors"
                />
                <div className="mt-2 flex justify-between text-xs text-white/30">
                  <span>Im bardziej szczegółowa odpowiedź, tym lepiej.</span>
                  <span
                    className={
                      (openAnswers[current]?.length ?? 0) >= 20
                        ? 'text-green-400'
                        : 'text-white/30'
                    }
                  >
                    {openAnswers[current]?.length ?? 0} znaków
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-sm font-medium disabled:opacity-30 hover:bg-white/15 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Poprzednie
            </button>

            {current < questions.length - 1 ? (
              <button
                onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5865F2] text-sm font-medium hover:bg-[#4752c4] transition-colors"
              >
                Następne
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-semibold transition-colors disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                Zakończ quiz
              </button>
            )}
          </div>

          {/* Dot navigation */}
          <div className="flex justify-center gap-1.5 mt-8 flex-wrap">
            {questions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                title={`Pytanie ${idx + 1} (${q.type === 'OPEN' ? 'otwarte' : 'zamknięte'})`}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === current
                    ? 'scale-125 ' + (q.type === 'OPEN' ? 'bg-purple-400' : 'bg-[#5865F2]')
                    : isAnswered(idx)
                    ? q.type === 'OPEN'
                      ? 'bg-purple-400/50'
                      : 'bg-[#5865F2]/50'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-3 text-xs text-white/30">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#5865F2]/50 inline-block" /> Zamknięte
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400/50 inline-block" /> Otwarte
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white/20 inline-block" /> Brak odpowiedzi
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
