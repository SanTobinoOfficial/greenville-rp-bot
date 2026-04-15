// Konfiguracja NextAuth.js z Discord OAuth2
// Weryfikuje role staffu i zarządza sesjami

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

// Wszystkie możliwe role CAD
export type CadRole =
  | 'OWNER' | 'ADMIN' | 'MOD' | 'STAFF'         // staff
  | 'POLICJA' | 'EMS' | 'STRAZ' | 'DOT'          // służby
  | 'SM' | 'DYSPOZYTORNIA'                        // specjalne
  | 'OCHRONA'                                     // security guard
  | 'TAKSOWKARZ'                                  // taxi
  | 'KIEROWCA_BUS'                                // school bus
  | 'RATOWNIK'                                    // lifeguard
  | 'PRACOWNIK'                                   // generic worker
  | 'CYWIL';                                      // civilian / unemployed

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
        session.user.accessLevel = 0;
        session.user.cadRole = 'CYWIL';

        try {
          const dbUser = await prisma.user.findUnique({
            where: { discordId: token.discordId as string },
            select: { id: true, robloxUsername: true, currentJob: true },
          });
          session.user.dbId = dbUser?.id;
          session.user.robloxUsername = dbUser?.robloxUsername;
          session.user.currentJob = dbUser?.currentJob ?? null;
        } catch (e) {
          console.error('[AUTH] Błąd Prisma w session callback:', e);
        }

        try {
          const { accessLevel, cadRole } = await resolveUserRoles(
            token.discordId as string,
            token.accessToken as string,
            session.user.currentJob ?? null,
          );
          session.user.accessLevel = accessLevel;
          session.user.cadRole = cadRole;
        } catch (e) {
          console.error('[AUTH] Błąd resolveUserRoles:', e);
        }
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
 * Jeden wspólny call do Discord API — ustala zarówno accessLevel jak i cadRole.
 */
async function resolveUserRoles(
  discordId: string,
  accessToken: string,
  currentJob: string | null,
): Promise<{ accessLevel: number; cadRole: CadRole }> {
  const OWNER_FALLBACK = { accessLevel: ACCESS_LEVELS.OWNER, cadRole: 'OWNER' as CadRole };
  const CYWIL_FALLBACK = { accessLevel: 0, cadRole: 'CYWIL' as CadRole };

  // Hardcoded owner
  if (discordId === '992500503198044231' || discordId === process.env.DISCORD_OWNER_ID) {
    return OWNER_FALLBACK;
  }

  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_TOKEN;
  if (!guildId) return CYWIL_FALLBACK;

  try {
    // Pobierz role ID użytkownika
    const memberRes = await fetch(
      `https://discord.com/api/users/@me/guilds/${guildId}/member`,
      { headers: { Authorization: `Bearer ${accessToken}` }, next: { revalidate: 0 } }
    );
    if (!memberRes.ok) return CYWIL_FALLBACK;
    const member = await memberRes.json();
    const memberRoleIds: string[] = member.roles ?? [];

    // Pobierz mapę ID → nazwa ról serwera
    let roleNames: string[] = [];
    if (botToken) {
      const rolesRes = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/roles`,
        { headers: { Authorization: `Bot ${botToken}` }, next: { revalidate: 30 } }
      );
      if (rolesRes.ok) {
        const guildRoles: { id: string; name: string }[] = await rolesRes.json();
        const roleNameById = new Map(guildRoles.map(r => [r.id, r.name]));
        roleNames = memberRoleIds.map(id => roleNameById.get(id) ?? '').filter(Boolean);
      }
    }

    const has = (name: string) => roleNames.some(r => r.toLowerCase() === name.toLowerCase());

    // ── Staff (hierarchia) ─────────────────────────────────────────────
    if (has('Owner') || has('Co-Owner'))                return { accessLevel: 4, cadRole: 'OWNER' };
    if (has('Administrator'))                           return { accessLevel: 3, cadRole: 'ADMIN' };
    if (has('Moderator'))                               return { accessLevel: 2, cadRole: 'MOD' };
    if (has('Helper') || has('HR') || has('Host'))      return { accessLevel: 1, cadRole: 'STAFF' };

    // ── Służby (Discord roles) ─────────────────────────────────────────
    if (has('Policja') || has('Police'))                return { accessLevel: 0, cadRole: 'POLICJA' };
    if (has('EMS') || has('Medyk'))                     return { accessLevel: 0, cadRole: 'EMS' };
    if (has('Straż') || has('Straz') || has('Fire'))    return { accessLevel: 0, cadRole: 'STRAZ' };
    if (has('DOT'))                                     return { accessLevel: 0, cadRole: 'DOT' };
    if (has('SM') || has('Security Manager'))           return { accessLevel: 0, cadRole: 'SM' };
    if (has('Dyspozytornia') || has('Dispatch'))        return { accessLevel: 0, cadRole: 'DYSPOZYTORNIA' };

    // ── Prace cywilne (currentJob z DB) ───────────────────────────────
    if (currentJob) {
      const j = currentJob.toLowerCase();
      if (j.includes('security') || j.includes('ochrona'))  return { accessLevel: 0, cadRole: 'OCHRONA' };
      if (j.includes('taxi'))                               return { accessLevel: 0, cadRole: 'TAKSOWKARZ' };
      if (j.includes('bus') || j.includes('autobus'))       return { accessLevel: 0, cadRole: 'KIEROWCA_BUS' };
      if (j.includes('lifeguard') || j.includes('ratownik')) return { accessLevel: 0, cadRole: 'RATOWNIK' };
      if (j !== 'unemployed' && j !== 'bezrobotny' && j !== '')
        return { accessLevel: 0, cadRole: 'PRACOWNIK' };
    }

    return CYWIL_FALLBACK;
  } catch {
    return CYWIL_FALLBACK;
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
      currentJob?: string | null;
      accessLevel: number;
      cadRole: CadRole;
    };
  }
}
