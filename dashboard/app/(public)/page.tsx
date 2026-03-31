// Publiczna strona główna Greenville RP
// Inspiracja: anro.pages.dev — dark theme, neon accents, member counter, news, login

import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import LandingClient from '@/components/LandingClient';
import ChatBot from '@/components/ChatBot';

async function getServerStats() {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;
    let memberCount = 0;
    if (guildId && botToken) {
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}?with_counts=true`,
        { headers: { Authorization: `Bot ${botToken}` }, next: { revalidate: 120 } }
      );
      if (res.ok) {
        const d = await res.json();
        memberCount = d.approximate_member_count ?? 0;
      }
    }
    const [verifiedUsers, totalSessions, ongoingSession] = await Promise.all([
      prisma.user.count({ where: { robloxUsername: { not: null } } }),
      prisma.session.count({ where: { status: { not: 'CANCELLED' } } }),
      prisma.session.findFirst({ where: { status: 'ONGOING' } }),
    ]);
    return { memberCount, verifiedUsers, totalSessions, ongoingSession: !!ongoingSession };
  } catch {
    return { memberCount: 0, verifiedUsers: 0, totalSessions: 0, ongoingSession: false };
  }
}

async function getNews() {
  try {
    // Pobierz 3 ostatnie zakończone sesje jako "newsy"
    const lastSessions = await prisma.session.findMany({
      where: { status: 'ENDED' },
      orderBy: { endedAt: 'desc' },
      take: 3,
      select: { id: true, description: true, endedAt: true, startedAt: true },
    });
    return lastSessions;
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const [session, stats, news] = await Promise.all([
    getServerSession(authOptions),
    getServerStats(),
    getNews(),
  ]);

  return (
    <>
      <LandingClient
        stats={stats}
        news={news as Parameters<typeof LandingClient>[0]['news']}
        isLoggedIn={!!session}
        userName={session?.user?.name ?? null}
        userAvatar={session?.user?.image ?? null}
        accessLevel={session?.user?.accessLevel ?? 0}
      />
      <ChatBot />
    </>
  );
}
