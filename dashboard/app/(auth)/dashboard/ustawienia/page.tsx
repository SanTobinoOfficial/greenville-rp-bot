import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { SettingsForm } from './SettingsForm';

export default async function UstawieniaPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) {
    redirect('/dashboard');
  }

  const settings = await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">⚙️ Ustawienia Serwera</h1>
          <p className="text-white/50 text-sm mt-1">
            Globalna konfiguracja bota, serwera i panelu. Tylko Owner.
          </p>
        </div>
      </div>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
