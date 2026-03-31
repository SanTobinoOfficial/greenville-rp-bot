// Utility do komunikacji z Discord API v10 przez Bot Token
// Uzywany przez panel zarzadzania serwerem (OWNER only)

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

export function getGuild(guildId: string) {
  return discordFetch(`/guilds/${guildId}?with_counts=true`);
}

export function modifyGuild(guildId: string, body: Record<string, unknown>) {
  return discordFetch(`/guilds/${guildId}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function getChannels(guildId: string) {
  return discordFetch(`/guilds/${guildId}/channels`);
}

export function createChannel(guildId: string, body: Record<string, unknown>) {
  return discordFetch(`/guilds/${guildId}/channels`, { method: 'POST', body: JSON.stringify(body) });
}

export function modifyChannel(channelId: string, body: Record<string, unknown>) {
  return discordFetch(`/channels/${channelId}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function deleteChannel(channelId: string) {
  return discordFetch(`/channels/${channelId}`, { method: 'DELETE' });
}

export function reorderChannels(guildId: string, positions: { id: string; position: number; parent_id?: string | null }[]) {
  return discordFetch(`/guilds/${guildId}/channels`, { method: 'PATCH', body: JSON.stringify(positions) });
}

export function getRoles(guildId: string) {
  return discordFetch(`/guilds/${guildId}/roles`);
}

export function createRole(guildId: string, body: Record<string, unknown>) {
  return discordFetch(`/guilds/${guildId}/roles`, { method: 'POST', body: JSON.stringify(body) });
}

export function modifyRole(guildId: string, roleId: string, body: Record<string, unknown>) {
  return discordFetch(`/guilds/${guildId}/roles/${roleId}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function deleteRole(guildId: string, roleId: string) {
  return discordFetch(`/guilds/${guildId}/roles/${roleId}`, { method: 'DELETE' });
}

export const CHANNEL_TYPES: Record<number, string> = {
  0: 'Tekst', 2: 'Glosowy', 4: 'Kategoria', 5: 'Ogloszenia', 13: 'Stage', 15: 'Forum',
};

export const CHANNEL_ICONS: Record<number, string> = {
  0: '#', 2: '🔊', 4: '📁', 5: '📢', 13: '🎙️', 15: '💬',
};

export const PERMISSIONS: Record<string, bigint> = {
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_ROLES: 1n << 28n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_GUILD: 1n << 5n,
  VIEW_AUDIT_LOG: 1n << 7n,
  MODERATE_MEMBERS: 1n << 40n,
};

export function hasPermission(permBits: string, flag: bigint): boolean {
  try { return (BigInt(permBits) & flag) === flag; } catch { return false; }
}
