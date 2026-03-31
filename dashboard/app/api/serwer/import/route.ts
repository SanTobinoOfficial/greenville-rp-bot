// POST /api/serwer/import
// Przyjmuje server-config.json i aplikuje na serwer Discord przez Bot Token
// Dostepne tylko dla wlasciciela (OWNER)


import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';


const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
const BASE = 'https://discord.com/api/v10';


function dHeaders() {
  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  };
}


async function dFetch(method: string, path: string, body?: unknown) {
  const opts: RequestInit = { method, headers: dHeaders() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 429) {
    const d = await res.json();
    const wait = (d.retry_after ?? 1) * 1000 + 300;
    await new Promise(r => setTimeout(r, wait));
    return dFetch(method, path, body);
  }
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${data?.message ?? ''} [${method} ${path}]`);
  return data;
}


const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

