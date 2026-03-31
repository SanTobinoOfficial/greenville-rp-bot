// Utility do komunikacji z Discord API v10 przez Bot Token
// Używany przez panel zarządzania serwerem (OWNER only)


const BASE = 'https://discord.com/api/v10';


function headers() {
  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  };
}


async function discordFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers(), ...(options?.headers ?? {}) },
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? `Discord API ${res.status}: ${path}`);
  return data;
}


// ─── Guild ───────────────────────────────────────────────────────────────────


export function getGuild(guildId: string) {
  return discordFetch(`/guilds/${guildId}?with_counts=true`);
}


export function modifyGuild(guildId: string, body: Record<string, unknown>) {
  return discordFetch(`/guilds/${guildId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

