import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { sendMessage } from '@/lib/discord-api';

// ─── Definicje embedów ────────────────────────────────────────────────────────

const EMBEDS: Record<string, { embed: object; components?: object[] }> = {
  weryfikacja: {
    embed: {
      color: 0x30d158,
      title: '✅ Witaj w AURORA Greenville RP!',
      description:
        '**AURORA Greenville RP** to polski serwer Roleplay na Roblox.\n' +
        'Aby uzyskać dostęp do serwera, wypełnij formularz weryfikacyjny.\n\n' +
        '**Jak przebiega weryfikacja?**\n' +
        '> 📋 Wejdź na formularz pod linkiem poniżej\n' +
        '> 🔗 Podaj swój **Discord ID** oraz **nick Roblox**\n' +
        '> ❓ Odpowiedz na **10 pytań** z regulaminu serwera\n' +
        '> ✅ Uzyskaj minimum **8/10 punktów**\n' +
        '> 🏠 Rola **Mieszkaniec** zostanie nadana automatycznie!\n\n' +
        '**Jak znaleźć swoje Discord ID?**\n' +
        '> Ustawienia → Zaawansowane → włącz **Tryb dewelopera**\n' +
        '> Kliknij prawym na swój nick → **Kopiuj ID użytkownika**\n\n' +
        '**Zanim zaczniesz:**\n' +
        '• Przeczytaj regulamin na kanale <#regulamin>\n' +
        '• Zapoznaj się z pojęciami RP (FRP, NLR, metagaming)\n\n' +
        '*Kliknij przycisk poniżej, aby otworzyć formularz!*',
      footer: { text: 'AURORA Greenville RP — System weryfikacji' },
      timestamp: new Date().toISOString(),
    },
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: '📋 Wypełnij formularz weryfikacyjny',
            url: 'https://greenville-rp-bot.vercel.app/weryfikacja',
          },
        ],
      },
    ],
  },

  regulamin: {
    embed: {
      color: 0xed4245,
      title: '📜 Regulamin AURORA Greenville RP',
      description:
        '**§1 — Zasady ogólne**\n' +
        '> • Szanuj innych graczy i staff\n' +
        '> • Obowiązuje język polski\n' +
        '> • Zakaz reklamy innych serwerów\n' +
        '> • Zakaz spamu i floodowania\n\n' +
        '**§2 — Zasady Roleplay**\n' +
        '> • **FRP** (Fail RP) — zachowania niezgodne z realizmem są zabronione\n' +
        '> • **NLR** (New Life Rule) — po śmierci zapominasz wszystko z poprzedniego życia\n' +
        '> • **Metagaming** — używanie informacji z zewnątrz (Discord, stream) jest zabronione\n' +
        '> • **RDM** (Random Death Match) — zabijanie bez powodu RP jest zabronione\n' +
        '> • **VDM** (Vehicle Death Match) — potrącanie samochodem bez powodu jest zabronione\n\n' +
        '**§3 — Służby**\n' +
        '> • Wykonuj polecenia przełożonych\n' +
        '> • Nie nadużywaj uprawnień służbowych\n' +
        '> • Zgłoś nieobecność z wyprzedzeniem\n\n' +
        '**§4 — Sankcje**\n' +
        '> • Warn → Kick → Ban (czas do decyzji staffu)\n' +
        '> • Poważne naruszenia skutkują natychmiastowym banem\n\n' +
        '*Nieznajomość regulaminu nie zwalnia z odpowiedzialności.*',
      footer: { text: 'AURORA Greenville RP — Regulamin' },
      timestamp: new Date().toISOString(),
    },
  },

  slownik: {
    embed: {
      color: 0x5865f2,
      title: '📖 Słownik pojęć RP',
      description:
        '**Podstawowe skróty i pojęcia:**\n\n' +
        '🔴 **FRP** — Fail Role Play — zachowanie łamiące realizm RP\n' +
        '🔴 **RDM** — Random Death Match — zabójstwo bez powodu RP\n' +
        '🔴 **VDM** — Vehicle Death Match — potrącenie samochodem bez powodu\n' +
        '🔴 **NLR** — New Life Rule — po śmierci nie pamiętasz nic z poprzedniego życia\n' +
        '🔴 **Metagaming** — używanie wiedzy zdobytej poza postacią (np. z Discorda)\n\n' +
        '🟡 **IC** — In Character — rozmawiasz jako postać (nie jako ty)\n' +
        '🟡 **OOC** — Out of Character — rozmowa poza roleplay (np. przez /ooc)\n' +
        '🟡 **Powertaming** — narzucanie działań innej postaci siłą\n' +
        '🟡 **Godmodding** — granie niezniszczalną postacią\n\n' +
        '🟢 **IC imię** — imię twojej postaci RP\n' +
        '🟢 **PESEL** — numer identyfikacyjny postaci w RP\n' +
        '🟢 **Służby** — Policja, EMS, Straż Pożarna, DOT, Straż Miejska, Taksówkarz\n' +
        '🟢 **Sesja** — zorganizowany czas gry RP na serwerze Roblox',
      footer: { text: 'AURORA Greenville RP — Słownik RP' },
    },
  },

  ticket: {
    embed: {
      color: 0x00c8ff,
      title: '🎫 System ticketów',
      description:
        'Potrzebujesz pomocy staffu? Masz pytanie, skargę lub problem?\n\n' +
        '**Kiedy otworzyć ticket:**\n' +
        '> • Problem z weryfikacją lub kontem\n' +
        '> • Skarga na gracza lub staff\n' +
        '> • Błąd bota lub systemu\n' +
        '> • Pytanie do administracji\n' +
        '> • Podanie o rolę specjalną\n\n' +
        '**Jak to działa:**\n' +
        '> 1️⃣ Kliknij przycisk poniżej\n' +
        '> 2️⃣ Wybierz kategorię ticketu\n' +
        '> 3️⃣ Opisz swój problem\n' +
        '> 4️⃣ Poczekaj na odpowiedź staffu\n\n' +
        '*Nie nadużywaj ticketów — służą do poważnych spraw.*',
      footer: { text: 'AURORA Greenville RP — Support' },
      timestamp: new Date().toISOString(),
    },
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 1,
            label: '🎫 Otwórz ticket',
            custom_id: 'ticket_create',
          },
        ],
      },
    ],
  },

  postac: {
    embed: {
      color: 0x30d158,
      title: '🪪 Tworzenie postaci RP',
      description:
        'Zanim zaczniesz grać, stwórz swoją postać!\n\n' +
        '**Co otrzymasz:**\n' +
        '> 👤 Imię i nazwisko IC\n' +
        '> 🆔 Numer PESEL\n' +
        '> 📱 Unikalny numer telefonu RP\n' +
        '> 🪪 Dowód osobisty\n\n' +
        '**Wymagania:**\n' +
        '> • Musisz mieć rolę **Mieszkaniec**\n' +
        '> • Imię i nazwisko muszą brzmieć realistycznie\n\n' +
        '**Komenda:** `/postac stworz`',
      footer: { text: 'AURORA Greenville RP — Postacie' },
    },
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: '👤 Stwórz postać',
            custom_id: 'character_create',
          },
        ],
      },
    ],
  },

  prawojazdy: {
    embed: {
      color: 0xf59e0b,
      title: '🚗 Prawo jazdy — egzaminy',
      description:
        'Aby prowadzić pojazdy w RP, potrzebujesz prawa jazdy!\n\n' +
        '**Dostępne kategorie:**\n' +
        '> 🛵 **Kat. AM** — motorower (do 45 km/h)\n' +
        '> 🏍️ **Kat. A1** — motocykl do 125 cm³\n' +
        '> 🏍️ **Kat. A2** — motocykl do 35 kW\n' +
        '> 🏍️ **Kat. A** — każdy motocykl\n' +
        '> 🚗 **Kat. B** — samochód osobowy (wymagane do rejestracji auta)\n' +
        '> 🚛 **Kat. C** — pojazd ciężarowy\n' +
        '> 🚌 **Kat. D** — autobus\n' +
        '> 🚜 **Kat. T** — ciągnik rolniczy\n\n' +
        '**Komenda:** `/prawojazdy egzamin [kategoria]`\n\n' +
        '*Egzamin składa się z 10 pytań — wymagane 8/10.*',
      footer: { text: 'AURORA Greenville RP — Prawo jazdy' },
    },
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 1,
            label: '📋 Przystąp do egzaminu',
            custom_id: 'license_apply',
          },
        ],
      },
    ],
  },

  rejestracja: {
    embed: {
      color: 0x94a3b8,
      title: '🚗 Rejestracja pojazdu',
      description:
        'Zarejestruj swój pojazd RP!\n\n' +
        '**Wymagania:**\n' +
        '> • Rola **Mieszkaniec**\n' +
        '> • Prawo jazdy kategorii odpowiedniej do pojazdu\n' +
        '> • Stworzony dowód osobisty\n\n' +
        '**Limity pojazdów:**\n' +
        '> 👤 Mieszkaniec — do **5** pojazdów\n' +
        '> 💜 Wspierający — do **9** pojazdów\n' +
        '> 💎 Nitro Booster — do **10** pojazdów\n\n' +
        '**Komenda:** `/pojazd rejestruj`',
      footer: { text: 'AURORA Greenville RP — Pojazdy' },
    },
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 2,
            label: '🚗 Zarejestruj pojazd',
            custom_id: 'vehicle_register',
          },
        ],
      },
    ],
  },

  powiadomienia: {
    embed: {
      color: 0xffffff,
      title: '🔔 Powiadomienia o sesjach',
      description:
        'Chcesz być informowany o nadchodzących sesjach RP?\n\n' +
        'Kliknij przycisk poniżej aby przypisać/zdjąć sobie rolę ' +
        '**🔔 Powiadomienia** — będziesz oznaczany przy ogłoszeniach sesji!\n\n' +
        '*Możesz w każdej chwili usunąć rolę klikając ponownie.*',
      footer: { text: 'AURORA Greenville RP — Powiadomienia' },
    },
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 2,
            label: '🔔 Włącz / Wyłącz powiadomienia',
            custom_id: 'toggle_notifications',
          },
        ],
      },
    ],
  },

  faq: {
    embed: {
      color: 0x5865f2,
      title: '❓ Najczęściej zadawane pytania',
      description:
        '**Jak dołączyć do serwera RP?**\n' +
        '> Wejdź na kanał z weryfikacją i kliknij **Wypełnij formularz weryfikacyjny**.\n\n' +
        '**Ile mam czasu na formularz?**\n' +
        '> Nie ma limitu czasu. Po nieudanej próbie odczekaj 24 godziny.\n\n' +
        '**Jak zmienić nick Roblox?**\n' +
        '> Otwórz ticket — staff pomoże zmienić powiązanie.\n\n' +
        '**Kiedy są sesje?**\n' +
        '> Sprawdź kanał z planem sesji lub włącz powiadomienia.\n\n' +
        '**Jak dołączyć do służb?**\n' +
        '> Złóż podanie na kanale podań o służbę.\n\n' +
        '**Mam problem z botem — co robić?**\n' +
        '> Otwórz ticket w dedykowanym kanale.',
      footer: { text: 'AURORA Greenville RP — FAQ' },
    },
  },
};

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { embedId, channelId } = body as { embedId: string; channelId: string };

  if (!embedId || !channelId) {
    return NextResponse.json({ error: 'Brakuje embedId lub channelId' }, { status: 400 });
  }

  const def = EMBEDS[embedId];
  if (!def) {
    return NextResponse.json({ error: `Nieznany embed: ${embedId}` }, { status: 400 });
  }

  // Odśwież timestamp przy wysyłaniu
  const embed = { ...def.embed, timestamp: new Date().toISOString() };

  try {
    await sendMessage(channelId, {
      embeds: [embed],
      ...(def.components ? { components: def.components } : {}),
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nieznany błąd';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET — lista dostępnych embedów (do dropdownu w UI)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const list = Object.entries(EMBEDS).map(([id, def]) => ({
    id,
    title: (def.embed as { title?: string }).title ?? id,
    hasButton: !!def.components,
  }));

  return NextResponse.json(list);
}
