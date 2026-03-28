// Dashboard — Edycja pytań quizu (Admin+)

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function QuizPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.ADMIN) {
    redirect('/login');
  }

  const questions = await prisma.quizQuestion.findMany({
    orderBy: { order: 'asc' },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">📝 Quiz Weryfikacyjny</h1>
        <button className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Dodaj pytanie
        </button>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id} className={`bg-[#1E2124] rounded-xl p-5 border ${q.active ? 'border-white/10' : 'border-red-500/30 opacity-60'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="bg-[#5865F2]/20 text-[#5865F2] w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
                  {idx + 1}
                </span>
                {!q.active && (
                  <span className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded">Nieaktywne</span>
                )}
              </div>
              <div className="flex gap-2">
                <button className="text-xs bg-white/10 hover:bg-white/20 text-gray-300 px-3 py-1 rounded transition-colors">
                  ✏️ Edytuj
                </button>
                <button className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded transition-colors">
                  🗑️ Usuń
                </button>
              </div>
            </div>

            <p className="text-white font-medium mb-3">{q.question}</p>

            <div className="grid grid-cols-2 gap-2">
              {q.answers.map((answer, aIdx) => (
                <div
                  key={aIdx}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    aIdx === q.correct
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-white/5 text-gray-400'
                  }`}
                >
                  {aIdx === q.correct ? '✅ ' : ''}{answer}
                </div>
              ))}
            </div>
          </div>
        ))}

        {questions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Brak pytań quizu. Dodaj pierwsze pytanie lub uruchom /setup.
          </div>
        )}
      </div>
    </div>
  );
}
