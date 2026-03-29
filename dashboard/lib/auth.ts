import { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { prisma } from './prisma';

export const ACCESS_LEVELS = {
  PUBLIC:  0,
  HELPER:  1,
  MOD:     2,
  ADMIN:   3,
  OWNER:   4,
} as const;

export const REQUIRED_LEVEL: Record<string, number> = {
  '/dashboard':              1,
  '/dashboard/podania':      1,
  '/dashboard/gracze':       2,
  '/dashboard/moderacja':    2,
  '/dashboard/pojazdy':      1,
  '/dashboard/prawa-jazdy':  1,
  '/dashboard/mandaty':      1,
  '/dashboard/tickety':      1,
  '/dashboard/sesje':        1,
  '/dashboard/quiz':         3,
  '/dashboard/logi':         3,
  '/dashboard/ustawienia':   4,
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
        const dbUser = await prisma.user.findUnique({ where: { discordId: token.discordId as string } });
        session.user.dbId = dbUser?.id;
        session.user.robloxUsername = dbUser?.robloxUsername;
        const accessLevel = await getAccessLevel(token.discordId as string, token.accessToken as string);
        session.user.accessLevel = accessLevel;
      }
      return session;
    },
  },
  pages: { signIn: '/login', error: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
};

async function getAccessLevel(discordId: string, accessToken: string): Promise<number> {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) return 0;
    if (discordId === process.env.DISCORD_OWNER_ID) return 4;
    const response = await fetch(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return 0;
    return 1;
  } catch { return 0; }
}

declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null; email?: string | null; image?: string | null;
      discordId: string; accessToken: string;
      dbId?: string; robloxUsername?: string | null; accessLevel: number;
    };
  }
}
