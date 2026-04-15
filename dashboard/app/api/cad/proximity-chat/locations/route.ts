// /api/cad/proximity-chat/locations
// GET: lista lokacji (wszyscy zalogowani)
// POST/PUT/DELETE: CRUD lokacji (tylko OWNER)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs';

function readConfig() {
  const configPath = path.resolve(process.cwd(), '..', 'server-config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function writeConfig(config: Record<string, unknown>) {
  const configPath = path.resolve(process.cwd(), '..', 'server-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = readConfig();
  const locations = config.proximity_chat?.locations ?? [];
  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.OWNER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id, name, emoji, description } = body as {
    id: string; name: string; emoji: string; description?: string;
  };

  if (!id || !name || !emoji) {
    return NextResponse.json({ error: 'Brak wymaganych pól: id, name, emoji' }, { status: 400 });
  }

  const config = readConfig();
  const locations = config.proximity_chat?.locations ?? [];

  if (locations.find((l: { id: string }) => l.id === id)) {
    return NextResponse.json({ error: 'Lokacja o tym ID już istnieje' }, { status: 409 });
  }

  locations.push({ id, name, emoji, description: description ?? '' });
  config.proximity_chat.locations = locations;
  writeConfig(config);

  // Log do audytu
  const user = await prisma.user.findUnique({ where: { discordId: session.user.discordId } });
  if (user) {
    await prisma.botLog.create({
      data: {
        type: 'PROXIMITY_LOCATION_ADD',
        userId: user.id,
        guildId: process.env.DISCORD_GUILD_ID ?? '',
        message: `Dodano lokację proximity: ${name} (${id})`,
      },
    });
  }

  return NextResponse.json({ success: true, location: { id, name, emoji, description } }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.OWNER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id, name, emoji, description } = body as {
    id: string; name: string; emoji: string; description?: string;
  };

  if (!id) {
    return NextResponse.json({ error: 'Brak id lokacji' }, { status: 400 });
  }

  const config = readConfig();
  const locations = config.proximity_chat?.locations ?? [];
  const idx = locations.findIndex((l: { id: string }) => l.id === id);

  if (idx === -1) {
    return NextResponse.json({ error: 'Lokacja nie znaleziona' }, { status: 404 });
  }

  locations[idx] = { id, name: name ?? locations[idx].name, emoji: emoji ?? locations[idx].emoji, description: description ?? locations[idx].description };
  config.proximity_chat.locations = locations;
  writeConfig(config);

  return NextResponse.json({ success: true, location: locations[idx] });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.OWNER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Brak parametru id' }, { status: 400 });
  }

  const config = readConfig();
  const locations = config.proximity_chat?.locations ?? [];
  const filtered = locations.filter((l: { id: string }) => l.id !== id);

  if (filtered.length === locations.length) {
    return NextResponse.json({ error: 'Lokacja nie znaleziona' }, { status: 404 });
  }

  config.proximity_chat.locations = filtered;
  writeConfig(config);

  // Wyczyść wiadomości z tej lokacji
  if (global.__proxChat?.[id]) {
    delete global.__proxChat[id];
  }

  return NextResponse.json({ success: true });
}
