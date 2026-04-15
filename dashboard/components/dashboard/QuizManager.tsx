'use client';

import { useState } from 'react';

interface QuizQuestion {
  id: string;
  question: string;
  answers: string[];
  correct: number;
  active: boolean;
  order: number;
}

interface Props {
  initialQuestions: QuizQuestion[];
}

const LETTERS = ['A', 'B', 'C', 'D'];

function emptyForm() {
  return { question: '', answers: ['', '', '', ''], correct: 0, active: true, order: 0 };
}

export default function QuizManager({ initialQuestions }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  // Modal state
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [form,       setForm]       = useState(emptyForm());
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm());
    setError('');
    setModalOpen(true);
  }

  function openEdit(q: QuizQuestion) {
    setEditId(q.id);
    setForm({
      question: q.question,
      answers:  [...q.answers, '', '', '', ''].slice(0, 4),
      correct:  q.correct,
      active:   q.active,
      order:    q.order,
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const answers = form.answers.filter(a => a.trim());
    if (answers.length < 2) { setError('Podaj co najmniej 2 odpowiedzi.'); setLoading(false); return; }

    const body = { ...form, answers };
    const url  = editId ? `/api/quiz/manage/${editId}` : '/api/quiz/manage';
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Błąd');
      const saved: QuizQuestion = await res.json();
      if (editId) {
        setQuestions(qs => qs.map(q => q.id === editId ? saved : q));
        setSuccess('Pytanie zaktualizowane!');
      } else {
        setQuestions(qs => [...qs, saved].sort((a, b) => a.order - b.order));
        setSuccess('Pytanie dodane!');
      }
      setModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/quiz/manage/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Błąd usuwania');
      setQuestions(qs => qs.filter(q => q.id !== deleteId));
      setSuccess('Pytanie usunięte.');
    } catch {
      setError('Nie udało się usunąć pytania.');
    } finally {
      setLoading(false);
      setDeleteId(null);
      setTimeout(() => setSuccess(''), 3000);
    }
  }

  async function toggleActive(q: QuizQuestion) {
    try {
      const res = await fetch(`/api/quiz/manage/${q.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !q.active }),
      });
      if (!res.ok) throw new Error();
      const updated: QuizQuestion = await res.json();
      setQuestions(qs => qs.map(x => x.id === q.id ? updated : x));
    } catch {
      setError('Błąd zmiany statusu.');
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📝 Quiz Weryfikacyjny</h1>
          <p className="text-gray-400 text-sm mt-0.5">{questions.length} pytań w bazie</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Dodaj pytanie
        </button>
      </div>

      {/* Feedback */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg text-sm">
          ✅ {success}
        </div>
      )}
      {error && !modalOpen && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
          ❌ {error}
        </div>
      )}

      {/* Question list */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="text-center py-16 text-gray-500 bg-[#1E2124] rounded-xl border border-white/10">
            Brak pytań. Dodaj pierwsze pytanie klikając przycisk powyżej.
          </div>
        ) : questions.map((q, idx) => (
          <div
            key={q.id}
            className={`bg-[#1E2124] rounded-xl p-5 border transition-colors ${
              q.active ? 'border-white/10' : 'border-red-500/20 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="bg-[#5865F2]/20 text-[#7289DA] w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {idx + 1}
                </span>
                <span className="text-xs text-gray-500 font-mono shrink-0">pkt {q.order}</span>
                {!q.active && (
                  <span className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded shrink-0">Nieaktywne</span>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(q)}
                  title={q.active ? 'Deaktywuj' : 'Aktywuj'}
                  className={`text-xs px-3 py-1 rounded transition-colors ${
                    q.active
                      ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300'
                      : 'bg-green-500/10 hover:bg-green-500/20 text-green-300'
                  }`}
                >
                  {q.active ? '⏸ Ukryj' : '▶ Aktywuj'}
                </button>
                <button
                  onClick={() => openEdit(q)}
                  className="text-xs bg-white/10 hover:bg-white/20 text-gray-300 px-3 py-1 rounded transition-colors"
                >
                  ✏️ Edytuj
                </button>
                <button
                  onClick={() => setDeleteId(q.id)}
                  className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-300 px-3 py-1 rounded transition-colors"
                >
                  🗑️ Usuń
                </button>
              </div>
            </div>

            <p className="text-white font-medium mb-3">{q.question}</p>

            <div className="grid grid-cols-2 gap-2">
              {q.answers.map((answer, aIdx) => (
                <div
                  key={aIdx}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    aIdx === q.correct
                      ? 'bg-green-500/15 text-green-300 border border-green-500/30'
                      : 'bg-white/5 text-gray-400'
                  }`}
                >
                  <span className={`font-bold text-xs w-5 shrink-0 ${aIdx === q.correct ? 'text-green-400' : 'text-gray-600'}`}>
                    {LETTERS[aIdx]}
                  </span>
                  {answer}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2B2D31] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">
                  {editId ? '✏️ Edytuj pytanie' : '➕ Nowe pytanie'}
                </h2>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white transition-colors text-xl leading-none">
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Question */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Treść pytania</label>
                  <textarea
                    value={form.question}
                    onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                    required
                    rows={3}
                    placeholder="Wpisz treść pytania..."
                    className="w-full bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5865F2] resize-none"
                  />
                </div>

                {/* Answers */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Odpowiedzi (min. 2)</label>
                  <div className="space-y-2">
                    {form.answers.map((ans, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, correct: i }))}
                          className={`w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors ${
                            form.correct === i
                              ? 'bg-green-500 text-white'
                              : 'bg-white/10 text-gray-400 hover:bg-white/20'
                          }`}
                          title="Ustaw jako poprawna"
                        >
                          {LETTERS[i]}
                        </button>
                        <input
                          type="text"
                          value={ans}
                          onChange={e => {
                            const arr = [...form.answers];
                            arr[i] = e.target.value;
                            setForm(f => ({ ...f, answers: arr }));
                          }}
                          placeholder={`Odpowiedź ${LETTERS[i]}${i < 2 ? ' (wymagana)' : ' (opcjonalna)'}`}
                          className="flex-1 bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5865F2]"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-600 text-xs mt-1">Kliknij literę żeby ustawić poprawną odpowiedź (zielona)</p>
                </div>

                {/* Order + Active */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-400 mb-1">Kolejność</label>
                    <input
                      type="number"
                      value={form.order}
                      onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))}
                      className="w-full bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                    />
                  </div>
                  <div className="flex items-end pb-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                        className={`w-10 h-6 rounded-full transition-colors relative ${form.active ? 'bg-green-500' : 'bg-white/20'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.active ? 'left-5' : 'left-1'}`} />
                      </div>
                      <span className="text-sm text-gray-300">Aktywne</span>
                    </label>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-3 py-2 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {loading ? 'Zapisywanie...' : editId ? 'Zapisz zmiany' : 'Dodaj pytanie'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-lg text-sm transition-colors"
                  >
                    Anuluj
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2B2D31] border border-red-500/30 rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-white mb-2">🗑️ Usuń pytanie</h2>
            <p className="text-gray-400 text-sm mb-5">
              Czy na pewno chcesz usunąć to pytanie? Tej operacji nie można cofnąć.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? 'Usuwanie...' : 'Tak, usuń'}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 py-2 rounded-lg text-sm transition-colors"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
