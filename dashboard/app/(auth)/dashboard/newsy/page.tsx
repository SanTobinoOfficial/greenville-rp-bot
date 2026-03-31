import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import NewsManager from '@/components/dashboard/NewsManager';

export default async function NewsyPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.MOD) {
    redirect('/dashboard');
  }

  const news = await prisma.news.findMany({
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    include: {
      author: { select: { discordUsername: true } },
    },
    take: 50,
  });

  const canDelete = (session.user.accessLevel ?? 0) >= ACCESS_LEVELS.ADMIN;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Newsy &amp; Ogłoszenia</h1>
        <p className="text-white/50 text-sm mt-1">
          Zarządzaj newsami wyświetlanymi na stronie głównej.
        </p>
      </div>
      <NewsManager initialNews={news} canDelete={canDelete} />
    </div>
  );
}
