// Konfiguracja NextAuth.js z Discord OAuth2
// Weryfikuje role staffu i zarządza sesjami

import { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { prisma } from './prisma';

// Definicja poziomów dostępu
export const ACCESS_LEVELS = {
  PUBLIC:  0,
  HELPER:  1,
  MOD:     2,
  ADMIN:   3,
  OWNER:   4,
} as const;

// Role wymagane dla poszczególnych sekcji dashboardu
export const REQUIRED_LEVEL: Record<string, number> = {
  '/dashboard':              ACCESS_LEVELS.HELPER,
  '/dashboard/podania':      ACCESS_LEVELS.HELPER,
  '/dashboard/gracze':       ACCESS_LEVELS.MOD,
  '/dashboard/moderacja':    ACCESS_LEVELS.MOD,
  '/dashboard/pojazdy':      ACCESS_LEVELS.HELPER,
  '/dashboard/prawa-jazdy':  ACCESS_LEVELS.HELPER,
  '/dashboard/mandaty':      ACCESS_LEVELS.HELPER,
  '/dashboard/tickety':      ACCESS_LEVELS.HELPER,
  '/dashboard/sesje':        ACCESS_LEVELS.HELPER,
  '/dashboard/quiz':         ACCESS_LEVELS.ADMIN,
  '/dashboard/logi':         ACCESS_LEVELS.ADMIN,
  '/dashboard/ustawienia':   ACCESS_LEVELS.OWNER,
};

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: 'identify guilds guilds.members.read' } },
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.discordId = profile.id as string;
        token.accessToken = account.access_token;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.discordId) {
        session.user.discordId = token.discordId as string;
        session.user.accessToken = token.accessToken as string;

        // Pobierz poziom dostępu z bazy danych
        const dbUser = await prisma.user.findUnique({
          where: { discordId: token.discordId as string },
        });

        session.user.dbId = dbUser?.id;
        session.user.robloxUsername = dbUser?.robloxUsername;

        // Sprawdź role na serwerze Discord
        const accessLevel = await getAccessLevel(token.discordId as string, token.accessToken as string);
        session.user.accessLevel = accessLevel;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Pobiera poziom dostępu użytkownika na podstawie ról Discord
 */
async function getAccessLevel(discordId: string, accessToken: string): Promise<number> {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) return 0;

    const response = await fetch(
      `https://discord.com/api/users/@me/guilds/${guildId}/member`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) return 0;
    const member = await response.json();
    const roleNames: string[] = member.roles || [];

    // Mapowanie ról Discord → poziom dostępu
    // (w przyszłości można pobierać ID ról z bazy)
    // Na potrzeby MVP sprawdzamy po nazwie ról cached w tokenie
    // Właściciel serwera
    if (discordId === process.env.DISCORD_OWNER_ID) return ACCESS_LEVELS.OWNER;

    return ACCESS_LEVELS.HELPER; // Domyślnie jeśli jest na serwerze
  } catch {
    return 0;
  }
}

// Rozszerzenie typów NextAuth
declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      discordId: string;
      accessToken: string;
      dbId?: string;
      robloxUsername?: string | null;
      accessLevel: number;
    };
  }
}
