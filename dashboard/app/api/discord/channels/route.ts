import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { getChannels } from '@/lib/discord-api';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const guildId = process.env.DISCORD_GUILD_ID ?? '';
  if (!guildId) {
    return NextResponse.json({ error: 'DISCORD_GUILD_ID not set' }, { status: 500 });
  }

  try {
    const channels = await getChannels(guildId);
    return NextResponse.json(channels);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nieznany błąd';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
