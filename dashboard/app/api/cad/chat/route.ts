// /api/cad/chat — wiadomości czatu CAD (in-memory, globalThis)
import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  id: string;
  callsign: string;     // np. P-1, EMS-2
  channel: string;      // KOMENDA, ALFA, BRAVO, EMS, STRAŻ, TAKTYCZNY, DYSPOZYTORNIA
  content: string;
  type: 'RADIO' | 'DISPATCH' | 'STATUS' | 'SYSTEM';
  timestamp: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __cadChat: ChatMessage[];
}
if (!global.__cadChat) global.__cadChat = [];

const MAX_MESSAGES = 200;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel');
  const since = searchParams.get('since'); // ISO timestamp — pobierz tylko nowe

  let msgs = global.__cadChat;
  if (channel) msgs = msgs.filter(m => m.channel === channel || m.channel === 'DYSPOZYTORNIA');
  if (since) msgs = msgs.filter(m => m.timestamp > since);

  return NextResponse.json(msgs.slice(-100));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { callsign, channel, content, type = 'RADIO' } = body;

  if (!callsign || !channel || !content) {
    return NextResponse.json({ error: 'Brak wymaganych pól' }, { status: 400 });
  }

  const msg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    callsign: String(callsign).toUpperCase(),
    channel: String(channel).toUpperCase(),
    content: String(content).slice(0, 500),
    type,
    timestamp: new Date().toISOString(),
  };

  global.__cadChat.push(msg);
  if (global.__cadChat.length > MAX_MESSAGES) {
    global.__cadChat = global.__cadChat.slice(-MAX_MESSAGES);
  }

  return NextResponse.json(msg, { status: 201 });
}
