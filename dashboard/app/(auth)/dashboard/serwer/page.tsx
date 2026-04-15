import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { getGuild, getChannels, getRoles } from '@/lib/discord-api';
import ServerManager from '@/components/dashboard/ServerManager';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';

export default async function SerwerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) {
    redirect('/dashboard');
  }

  let guild = null;
  let channels: unknown[] = [];
  let roles: unknown[] = [];
  let error: string | null = null;

  try {
    [guild, channels, roles] = await Promise.all([
      getGuild(GUILD_ID),
      getChannels(GUILD_ID),
      getRoles(GUILD_ID),
    ]);

    // Sort channels: categories first, then by position
    channels = (channels as { type: number; position: number }[]).sort((a, b) => {
      if (a.type === 4 && b.type !== 4) return -1;
      if (a.type !== 4 && b.type === 4) return 1;
      return a.position - b.position;
    });

    // Sort roles by position descending
    roles = (roles as { position: number }[]).sort((a, b) => b.position - a.position);
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : 'Nie można połączyć z Discord API';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Zarządzanie Serwerem Discord</h1>
        <p className="text-white/50 text-sm mt-1">
          Replika serwera — zmiany tutaj są natychmiast aplikowane na Discordzie.
          <span className="ml-2 text-xs text-yellow-400 font-medium">🔐 Tylko Owner</span>
        </p>
      </div>
      <ServerManager
        initialGuild={guild}
        initialChannels={channels}
        initialRoles={roles}
        error={error}
      />
    </div>
  );
}
