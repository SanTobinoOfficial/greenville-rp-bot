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

  // Dashboard tylko dla OWNER — reszta staffu pracuje z CAD
  if (session.user.accessLevel < ACCESS_LEVELS.OWNER) {
    redirect('/cad');
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
