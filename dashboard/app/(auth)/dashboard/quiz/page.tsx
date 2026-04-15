// Dashboard — Edycja pytań quizu (Admin+)

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import QuizManager from '@/components/dashboard/QuizManager';

export default async function QuizPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.ADMIN) redirect('/dashboard');

  const questions = await prisma.quizQuestion.findMany({
    orderBy: { order: 'asc' },
  });

  return (
    <div className="p-6">
      <QuizManager initialQuestions={questions} />
    </div>
  );
}
