import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { SettingsForm } from './SettingsForm';

async function getSettings() {
  const settings = await prisma.settings.findUnique({
    where: { id: 'global' },
  });
  return settings;
}

export default async function UstawieniaPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.accessLevel < ACCESS_LEVELS.OWNER) {
    redirect('/dashboard');
  }

  const settings = await getSettings();

  if (!settings) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Ustawienia</h1>
        <p className="text-muted-foreground text-sm">
          Brak globalnych ustawień w bazie danych. Uruchom komendę /setup na serwerze Discord.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Ustawienia</h1>
        <p className="text-muted-foreground text-sm">
          Globalna konfiguracja serwera Greenville RP
        </p>
      </div>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
