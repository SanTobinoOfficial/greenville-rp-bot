// API /api/discord/stats — pobiera statystyki serwera Discord przez Bot Token
// Endpoint publiczny (tylko GET), zwraca member count i podstawowe info

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_TOKEN;

    let memberCount = 0;
    let onlineCount = 0;

    if (guildId && botToken) {
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}?with_counts=true`,
        {
          headers: { Authorization: `Bot ${botToken}` },
          next: { revalidate: 60 }, // cache 60s
        }
      );
      if (res.ok) {
        const data = await res.json();
        memberCount = data.approximate_member_count ?? 0;
        onlineCount = data.approximate_presence_count ?? 0;
      }
    }

    // Dane z bazy
    const [totalUsers, verifiedUsers, totalSessions, totalVehicles] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { robloxUsername: { not: null } } }),
      prisma.session.count(),
      prisma.vehicle.count(),
    ]);

    const ongoingSession = await prisma.session.findFirst({
      where: { status: 'ONGOING' },
      select: { id: true, description: true, startedAt: true },
    });

    return NextResponse.json({
      memberCount,
      onlineCount,
      totalUsers,
      verifiedUsers,
      totalSessions,
      totalVehicles,
      ongoingSession,
    });
  } catch {
    return NextResponse.json({
      memberCount: 0,
      onlineCount: 0,
      totalUsers: 0,
      verifiedUsers: 0,
      totalSessions: 0,
      totalVehicles: 0,
      ongoingSession: null,
    });
  }
}
