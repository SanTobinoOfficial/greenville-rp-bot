import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsForm } from './SettingsForm';
import { readServerConfig, configToSettings } from '@/lib/serverConfig';
import { prisma } from '@/lib/prisma';

export default async function UstawieniaPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) {
    redirect('/dashboard');
  }

  // Priorytet: server-config.json → baza danych
  const cfg = readServerConfig();
  let settings: ReturnType<typeof configToSettings> | Awaited<ReturnType<typeof prisma.settings.upsert>>;
  let source: 'file' | 'db';

  if (cfg) {
    settings = configToSettings(cfg);
    source = 'file';
  } else {
    settings = await prisma.settings.upsert({
      where: { id: 'global' },
      update: {},
      create: { id: 'global' },
    });
    source = 'db';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">⚙️ Ustawienia Serwera</h1>
          <p className="text-white/50 text-sm mt-1">
            Globalna konfiguracja bota, serwera i panelu. Tylko Owner.
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          source === 'file'
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
        }`}>
          {source === 'file' ? '📄 server-config.json' : '🗄️ Baza danych'}
        </div>
      </div>

      {source === 'db' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-300">
          ⚠️ Nie można odczytać <code className="bg-black/30 px-1 rounded">server-config.json</code> — dane ładowane z bazy danych.
          Upewnij się że plik istnieje w katalogu głównym projektu.
        </div>
      )}

      <SettingsForm initialSettings={settings as Parameters<typeof SettingsForm>[0]['initialSettings']} />
    </div>
  );
}
