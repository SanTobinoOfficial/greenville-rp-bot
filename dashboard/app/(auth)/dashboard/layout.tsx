import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { DashboardNav } from '@/components/dashboard/DashboardNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Dashboard jest tylko dla Staffu — gracze trafią do portalu gracza
  if (session.user.accessLevel < ACCESS_LEVELS.HELPER) {
    redirect('/portal');
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <DashboardNav session={session} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
