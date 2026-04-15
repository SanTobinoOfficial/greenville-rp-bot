// API: Weryfikacja — sprawdza odpowiedzi, weryfikuje nick Roblox i nadaje rolę
// POST /api/weryfikacja/submit

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ── Preset poprawnych odpowiedzi (indeks 0-3) ─────────────────
const CORRECT_ANSWERS = [
  1, // FRP → zachowanie niezgodne z realiami
  1, // NLR → zasada zapominania
  2, // metagaming → informacje z zewnątrz
  2, // RDM → zabijanie bez powodu RP
  3, // problem z graczem → ticket/staff
  1, // język → polski
  2, // Mieszkaniec → po weryfikacji
  1, // OOC → rozmowa poza rolą
  2, // kara → warn/kick/ban
  2, // Discord w sesji RP → to jest metagaming, zabronione
];

const MIN_SCORE = 8;
const TOTAL = CORRECT_ANSWERS.length;

// Rate limiting — in-memory (Discord ID → timestamp)
const rateLimitMap = new Map<string, number>();
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

// ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      discordId: string;
      robloxNick: string;
      answers: number[];
    };

    const { discordId, robloxNick, answers } = body;

    // ── Walidacja wejścia ──────────────────────────────────────
    if (!discordId || !robloxNick || !answers) {
      return NextResponse.json({ error: 'Brakujące dane formularza.' }, { status: 400 });
    }
    if (!/^\d{17,20}$/.test(discordId)) {
      return NextResponse.json({ error: 'Nieprawidłowy Discord ID. Musi mieć 17–20 cyfr.' }, { status: 400 });
    }
    if (robloxNick.trim().length < 3) {
      return NextResponse.json({ error: 'Nick Roblox jest za krótki.' }, { status: 400 });
    }
    if (!Array.isArray(answers) || answers.length !== TOTAL) {
      return NextResponse.json({ error: 'Nieprawidłowa liczba odpowiedzi.' }, { status: 400 });
    }

    // ── Sprawdź czy już zweryfikowany ──────────────────────────
    const existingUser = await prisma.user.findUnique({ where: { discordId } }).catch(() => null);
    if (existingUser?.verifiedAt) {
      return NextResponse.json({ error: 'To konto Discord zostało już zweryfikowane.' }, { status: 400 });
    }

    // ── Rate limiting ──────────────────────────────────────────
    const lastAttempt = rateLimitMap.get(discordId);
    if (lastAttempt && Date.now() - lastAttempt < COOLDOWN_MS) {
      return NextResponse.json(
        { error: 'Możesz spróbować ponownie za 24 godziny (od ostatniej próby). Przeczytaj dokładnie regulamin!' },
        { status: 429 }
      );
    }
    rateLimitMap.set(discordId, Date.now());

    // ── Weryfikacja nicku Roblox przez Roblox API ──────────────
    const robloxUser = await verifyRobloxNick(robloxNick.trim());
    if (!robloxUser) {
      return NextResponse.json({
        error: `Nick Roblox "${robloxNick}" nie istnieje lub jest nieprawidłowy. Sprawdź dokładną pisownię.`,
      }, { status: 400 });
    }

    // ── Sprawdź czy Roblox nick nie jest już w użyciu ──────────
    const nickTaken = await prisma.user.findUnique({ where: { robloxId: String(robloxUser.id) } }).catch(() => null);
    if (nickTaken && nickTaken.discordId !== discordId) {
      return NextResponse.json({
        error: `Nick Roblox "${robloxUser.name}" jest już powiązany z innym kontem Discord. Jeśli uważasz że to błąd — otwórz ticket.`,
      }, { status: 400 });
    }

    // ── Sprawdź odpowiedzi ─────────────────────────────────────
    let score = 0;
    const results = answers.map((userAnswer, i) => {
      const correct = userAnswer === CORRECT_ANSWERS[i];
      if (correct) score++;
      return { correct, correctAnswer: CORRECT_ANSWERS[i], userAnswer };
    });

    const passed = score >= MIN_SCORE;

    // ── Jeśli zaliczył — zapisz do DB i nadaj rolę ─────────────
    if (passed) {
      const phoneNumber = generatePhone();

      // Upsert do bazy danych
      await prisma.user.upsert({
        where: { discordId },
        create: {
          discordId,
          discordUsername: `user_${discordId}`,
          robloxId: String(robloxUser.id),
          robloxUsername: robloxUser.name,
          phoneNumber,
          verifiedAt: new Date(),
          quizScore: score,
          quizAttempts: 1,
          quizLastAttempt: new Date(),
        },
        update: {
          robloxId: String(robloxUser.id),
          robloxUsername: robloxUser.name,
          verifiedAt: new Date(),
          quizScore: score,
          quizAttempts: { increment: 1 },
          quizLastAttempt: new Date(),
          ...(existingUser?.phoneNumber ? {} : { phoneNumber }),
        },
      }).catch(err => {
        console.error('[WERYFIKACJA] Błąd zapisu do DB:', err);
      });

      // Nadaj rolę + ustaw nick Roblox jako pseudonim Discord
      const roleResult = await grantMieszkanieckRole(discordId, robloxUser.name);

      // ── Audit log: weryfikacja ─────────────────────────────────
      await prisma.botLog.create({
        data: {
          type: roleResult.success ? 'WERYFIKACJA_SUKCES' : 'WERYFIKACJA_BLAD_ROLI',
          userId: discordId,
          guildId: process.env.DISCORD_GUILD_ID,
          message: roleResult.success
            ? `✅ Weryfikacja: ${robloxUser.name} (Discord: ${discordId}) — wynik ${score}/${TOTAL} — rola Mieszkaniec nadana automatycznie`
            : `⚠️ Weryfikacja: ${robloxUser.name} (Discord: ${discordId}) — wynik ${score}/${TOTAL} — BŁĄD ROLI: ${roleResult.error}`,
          data: {
            robloxId: robloxUser.id,
            robloxUsername: robloxUser.name,
            score,
            total: TOTAL,
            roleGranted: roleResult.success,
            roleError: roleResult.error ?? null,
            ip: 'Vercel-API',
            timestamp: new Date().toISOString(),
          },
        },
      }).catch(() => {}); // Nie blokuj weryfikacji jeśli log nie zadziała

      if (!roleResult.success) {
        console.error(`[WERYFIKACJA] Nie udało się nadać roli dla ${discordId}:`, roleResult.error);
        return NextResponse.json({
          passed: true,
          score,
          total: TOTAL,
          results,
          roleError: true,
          roleErrorDetail: roleResult.error,
          message: 'Zaliczono quiz, ale nie udało się automatycznie nadać roli. Otwórz ticket na serwerze Discord z informacją że przeszłeś weryfikację — staff nada rolę ręcznie.',
        });
      }

      // DM powitalny
      const BOT_TOKEN = process.env.DISCORD_TOKEN!;
      await sendWelcomeDM(discordId, BOT_TOKEN, robloxUser.name);
    }

    return NextResponse.json({ passed, score, total: TOTAL, results });

  } catch (err) {
    console.error('[WERYFIKACJA] Nieoczekiwany błąd:', err);
    return NextResponse.json({ error: 'Błąd serwera. Spróbuj ponownie za chwilę.' }, { status: 500 });
  }
}

// ── Weryfikacja nicku Roblox przez publiczne API ───────────────
async function verifyRobloxNick(username: string): Promise<{ id: number; name: string } | null> {
  try {
    const res = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json() as { data: Array<{ id: number; name: string }> };
    const users = data?.data;
    if (!users || users.length === 0) return null;

    return { id: users[0].id, name: users[0].name };
  } catch {
    return null;
  }
}

// ── Nadawanie roli + sync nicku Discord = nick Roblox ──────────
const MIESZKANIEC_ROLE_ID = '1487555467302539368'; // hardcoded ID roli Mieszkaniec

async function grantMieszkanieckRole(
  discordId: string,
  robloxName: string
): Promise<{ success: boolean; error?: string }> {
  const BOT_TOKEN = process.env.DISCORD_TOKEN;
  const GUILD_ID = process.env.DISCORD_GUILD_ID;

  if (!BOT_TOKEN || !GUILD_ID) {
    return { success: false, error: 'Brak DISCORD_TOKEN lub DISCORD_GUILD_ID w zmiennych środowiskowych!' };
  }

  try {
    // 1. Sprawdź czy user jest na serwerze
    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });

    if (!memberRes.ok) {
      if (memberRes.status === 404) {
        return {
          success: false,
          error: 'Nie jesteś na serwerze Discord! Dołącz najpierw na serwer, potem wypełnij formularz.',
        };
      }
      return { success: false, error: `Błąd membera: ${memberRes.status}` };
    }

    // 2. Nadaj rolę Mieszkaniec (bezpośrednio po ID — niezawodne)
    const addRes = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}/roles/${MIESZKANIEC_ROLE_ID}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Audit-Log-Reason': 'Auto-weryfikacja Greenville RP',
        },
      }
    );

    if (!addRes.ok && addRes.status !== 204) {
      const txt = await addRes.text();
      return { success: false, error: `Discord API ${addRes.status}: ${txt}` };
    }

    // 3. Usuń rolę Niezweryfikowany (szukaj po nazwie — opcjonalne)
    try {
      const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      });
      if (rolesRes.ok) {
        const roles = await rolesRes.json() as Array<{ id: string; name: string }>;
        const niezweryRole = roles.find(r => r.name.toLowerCase().replace(/[^a-z]/g, '').includes('niezwer'));
        if (niezweryRole) {
          await fetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}/roles/${niezweryRole.id}`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bot ${BOT_TOKEN}`, 'X-Audit-Log-Reason': 'Weryfikacja ukończona' },
            }
          ).catch(() => {});
        }
      }
    } catch {
      // Usunięcie Niezweryfikowany jest opcjonalne — nie blokuj weryfikacji
    }

    // 5. Ustaw pseudonim Discord = nick Roblox (sync)
    await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Audit-Log-Reason': 'Sync pseudonimu: nick Roblox',
      },
      body: JSON.stringify({ nick: robloxName }),
    }).catch(() => {
      console.warn(`[WERYFIKACJA] Nie udało się ustawić pseudonimu dla ${discordId} (brak uprawnień?)`);
    });

    return { success: true };

  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── DM powitalny po weryfikacji ────────────────────────────────
async function sendWelcomeDM(discordId: string, botToken: string, robloxName: string): Promise<void> {
  try {
    const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: discordId }),
    });

    if (!dmRes.ok) return;
    const dm = await dmRes.json() as { id: string };

    await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          color: 0x57F287,
          title: '✅ Weryfikacja zakończona pomyślnie!',
          description:
            `Pomyślnie przeszłeś weryfikację na serwerze **Greenville RP**!\n\n` +
            `🎮 Twój pseudonim RP: **${robloxName}**\n` +
            `🏠 Rola **Mieszkaniec** nadana — masz pełny dostęp do serwera.\n\n` +
            `📋 Pamiętaj o zasadach:\n` +
            `> • Szanuj innych graczy i staff\n` +
            `> • Nie używaj metagamingu\n` +
            `> • W razie problemów — otwórz ticket\n\n` +
            `Witaj w **Greenville RP**! 🎊`,
          footer: { text: 'Greenville RP — System weryfikacji' },
          timestamp: new Date().toISOString(),
        }],
        components: [{
          type: 1,
          components: [{
            type: 2,
            style: 5,
            label: '🏙️ Wejdź na serwer',
            url: 'https://discord.gg/BU8EBPsYXV',
          }],
        }],
      }),
    });
  } catch {
    // DM mogą być zablokowane
  }
}

// ── Generator numerów telefonu RP ──────────────────────────────
function generatePhone(): string {
  const prefixes = ['500', '501', '502', '503', '504', '505', '600', '601', '700', '501'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  return `${prefix}-${num.slice(0, 3)}-${num.slice(3)}`;
}
