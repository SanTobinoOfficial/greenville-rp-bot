// POST /api/regulamin — zapisuje treść regulaminu i aktualizuje embed na Discordzie
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DISCORD_API = 'https://discord.com/api/v10';

function botHeaders() {
  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  };
}

function buildEmbed(text: string, color: string) {
  // Parse hex color to int
  const colorInt = parseInt(color.replace('#', ''), 16) || 0x5865F2;
  const sections = text.split('\n\n').filter(Boolean);

  return {
    embeds: [{
      title: '📋 Regulamin Serwera — Greenville RP',
      description: sections[0] ?? text,
      color: colorInt,
      fields: sections.slice(1).map((s, i) => {
        const lines = s.split('\n');
        return {
          name: lines[0] ?? `Sekcja ${i + 2}`,
          value: lines.slice(1).join('\n') || s,
          inline: false,
        };
      }),
      footer: {
        text: 'Greenville RP — Regulamin • Ostatnia aktualizacja',
      },
      timestamp: new Date().toISOString(),
    }],
  };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.ADMIN) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
  }

  const body = await req.json();
  const { text, channelId, messageId, color = '#5865F2' } = body;

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Treść regulaminu jest wymagana' }, { status: 400 });
  }

  const embedBody = buildEmbed(text, color);

  // Pobierz ustawienia
  const settings = await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global' },
  });

  const channel = channelId || settings.regulaminChannelId;
  const existingMsgId = messageId || settings.regulaminMessageId;

  if (!channel) {
    // Tylko zapisz tekst, bez wysyłania
    await prisma.settings.update({
      where: { id: 'global' },
      data: { regulaminText: text },
    });
    return NextResponse.json({ saved: true, discord: false, reason: 'Brak skonfigurowanego kanału' });
  }

  let discordResult: { sent: boolean; messageId?: string; error?: string } = { sent: false };

  try {
    if (existingMsgId) {
      // Edytuj istniejącą wiadomość
      const editRes = await fetch(`${DISCORD_API}/channels/${channel}/messages/${existingMsgId}`, {
        method: 'PATCH',
        headers: botHeaders(),
        body: JSON.stringify(embedBody),
      });

      if (editRes.ok) {
        discordResult = { sent: true, messageId: existingMsgId };
      } else {
        // Wiadomość nie istnieje — wyślij nową
        const sendRes = await fetch(`${DISCORD_API}/channels/${channel}/messages`, {
          method: 'POST',
          headers: botHeaders(),
          body: JSON.stringify(embedBody),
        });
        if (sendRes.ok) {
          const msg = await sendRes.json();
          discordResult = { sent: true, messageId: msg.id };
        } else {
          const err = await sendRes.json();
          discordResult = { sent: false, error: err.message };
        }
      }
    } else {
      // Wyślij nową wiadomość
      const sendRes = await fetch(`${DISCORD_API}/channels/${channel}/messages`, {
        method: 'POST',
        headers: botHeaders(),
        body: JSON.stringify(embedBody),
      });
      if (sendRes.ok) {
        const msg = await sendRes.json();
        discordResult = { sent: true, messageId: msg.id };
      } else {
        const err = await sendRes.json();
        discordResult = { sent: false, error: err.message };
      }
    }
  } catch (e) {
    discordResult = { sent: false, error: String(e) };
  }

  // Zapisz tekst i message ID w bazie
  await prisma.settings.update({
    where: { id: 'global' },
    data: {
      regulaminText: text,
      regulaminMessageId: discordResult.messageId ?? settings.regulaminMessageId,
    },
  });

  return NextResponse.json({ saved: true, discord: discordResult });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.ADMIN) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
  }

  const settings = await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global' },
  });

  return NextResponse.json({
    text: settings.regulaminText,
    messageId: settings.regulaminMessageId,
    channelId: settings.regulaminChannelId,
    color: settings.embedColor,
  });
}
