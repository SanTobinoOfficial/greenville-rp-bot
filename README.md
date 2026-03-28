# 🏙️ Greenville RP — Bot Discord + Dashboard

Kompleksowy, wielofunkcyjny system dla polskiego serwera Discord **Greenville RP** (Roblox Roleplay).

## 📋 Systemy

| # | System | Status |
|---|--------|--------|
| 0 | Auto-Setup serwera (`/setup`) | ✅ |
| 1 | Regulamin + Pojęcia RP | ✅ |
| 2 | Weryfikacja (Roblox + Quiz) | ✅ |
| 3 | Dowód Osobisty (Postać RP) | ✅ |
| 4 | Rejestracja Pojazdów | ✅ |
| 5 | Prawo Jazdy | ✅ |
| 6 | Mandaty RP | ✅ |
| 7 | Podania na Służby | ✅ |
| 8 | Sesje RP | ✅ |
| 9 | Moderacja (Cases) | ✅ |
| 10 | Tickety | ✅ |
| 11 | Telefon RP (SMS/Połączenia) | ✅ |
| 12 | Muzyka (Radio 24/7) | ✅ |
| 13 | Welcome/Goodbye | ✅ |
| 14 | Logi (wszystkie typy) | ✅ |
| 15 | Statystyki głosowe | ✅ |
| 16 | Panel Webowy (Dashboard) | ✅ |

## 🚀 Szybki Start

### 1. Wymagania
- Node.js 18+
- PostgreSQL 14+
- Discord Developer Application (Bot Token)

### 2. Konfiguracja

```bash
# Sklonuj repo
git clone <repo> greenville-rp
cd greenville-rp

# Skopiuj i uzupełnij zmienne środowiskowe
cp .env.example .env
# Edytuj .env i uzupełnij wszystkie pola

# Zainstaluj zależności bota
cd bot && npm install

# Zainstaluj zależności dashboardu
cd ../dashboard && npm install

# Wygeneruj klienta Prisma i zastosuj migracje
cd ..
npx prisma generate
npx prisma migrate deploy
```

### 3. Uruchomienie

```bash
# Bot
cd bot
npm run deploy    # Rejestruj komendy slash
npm start         # Uruchom bota

# Dashboard (osobny terminal)
cd dashboard
npm run dev       # Tryb deweloperski
# lub
npm run build && npm start  # Produkcja
```

### 4. Pierwsze kroki na serwerze Discord

1. Zaproś bota do serwera z uprawnieniami **Administrator**
2. Ustaw bota jako **najwyższą rolę** w hierarchii
3. Użyj komendy **`/setup`** (tylko właściciel serwera)
4. Gotowe! Bot automatycznie skonfiguruje cały serwer.

## 📁 Struktura projektu

```
greenville-rp/
├── bot/                     # Discord Bot (Node.js + discord.js v14)
│   └── src/
│       ├── commands/        # Komendy slash
│       ├── events/          # Event handlery
│       ├── buttons/         # Handlery przycisków
│       ├── modals/          # Handlery modali
│       ├── selectMenus/     # Handlery select menus
│       ├── utils/           # Narzędzia pomocnicze
│       ├── music/           # System muzyczny
│       ├── setup/           # Logika /setup
│       └── api/             # Wewnętrzne API (bot ↔ dashboard)
├── dashboard/               # Panel Webowy (Next.js 14)
│   └── app/
│       ├── (public)/        # Strony publiczne (quiz, podania)
│       ├── (auth)/dashboard/ # Panel staffu
│       ├── api/             # API routes
│       └── login/           # Strona logowania
├── prisma/
│   └── schema.prisma        # Schemat bazy danych
├── .env.example             # Wzorzec zmiennych środowiskowych
├── railway.toml             # Konfiguracja Railway
└── README.md
```

## ⚙️ Zmienne środowiskowe

Skopiuj `.env.example` jako `.env` i uzupełnij:

```env
# Discord Bot
DISCORD_TOKEN=          # Token bota
DISCORD_CLIENT_ID=      # Application ID
DISCORD_CLIENT_SECRET=  # Secret (dla OAuth2)
DISCORD_GUILD_ID=       # ID serwera

# Roblox (opcjonalne — ID grupy Roblox)
ROBLOX_GROUP_ID=

# Baza danych PostgreSQL
DATABASE_URL=postgresql://user:pass@host:5432/greenville_rp

# Dashboard (NextAuth)
NEXTAUTH_SECRET=        # Losowy ciąg znaków
NEXTAUTH_URL=           # URL dashboardu

# Komunikacja Bot ↔ Dashboard
BOT_API_KEY=            # Klucz API
BOT_API_URL=            # URL API bota

# Radio
RADIO_URL=              # YouTube URL (RMF MAXX)
```

## 🌐 Hosting (Railway)

1. Utwórz projekt na Railway
2. Dodaj PostgreSQL jako serwis
3. Połącz repo GitHub z Railway
4. Ustaw zmienne środowiskowe
5. Railway automatycznie uruchomi bot i dashboard

## 📝 Komendy

### Administracja
| Komenda | Opis | Uprawnienia |
|---------|------|-------------|
| `/setup` | Inicjalizacja serwera | Właściciel |

### Moderacja
| Komenda | Opis | Uprawnienia |
|---------|------|-------------|
| `/warn @gracz [powód]` | Ostrzeżenie | Staff |
| `/ban @gracz [czas] [powód]` | Ban | Mod+ |
| `/kick @gracz [powód]` | Kick | Mod+ |
| `/mute @gracz [czas] [powód]` | Wyciszenie | Staff |
| `/unban [ID]` | Odban | Mod+ |
| `/unmute @gracz` | Odciszenie | Staff |
| `/case [numer]` | Szczegóły case | Staff |
| `/historia @gracz` | Historia kar | Staff |

### Pojazdy
| Komenda | Opis | Uprawnienia |
|---------|------|-------------|
| `/moje-pojazdy` | Lista pojazdów | Każdy |
| `/pojazd-info [tablica]` | Info o pojeździe | Staff |
| `/usuń-pojazd [tablica]` | Wyrejestrowanie | Właściciel/Staff |

### Mandaty RP
| Komenda | Opis | Uprawnienia |
|---------|------|-------------|
| `/mandat @gracz [typ] [kwota] [powód]` | Wystaw mandat | Służby |
| `/historia-mandatów @gracz` | Historia mandatów | Staff |
| `/wyczyść-mandat [id]` | Usuń mandat | Admin+ |

### Telefon RP
| Komenda | Opis | Uprawnienia |
|---------|------|-------------|
| `/sms [numer] [treść]` | Wyślij SMS | Zweryfikowani |
| `/zadzwoń [numer]` | Zadzwoń | Zweryfikowani |
| `/mój-numer` | Sprawdź swój numer | Każdy |
| `/numer-info [numer]` | Info o numerze | Staff |

### Muzyka
| Komenda | Opis | Uprawnienia |
|---------|------|-------------|
| `/play [link/nazwa]` | Dodaj do kolejki | Staff |
| `/skip` | Pomiń utwór | Staff |
| `/queue` | Kolejka | Każdy |
| `/radio` | Powróć do radia | Staff |
| `/stop` | Zatrzymaj | Staff |

## 🎭 Role (hierarchia)

```
👑 Owner → 🔱 Co-Owner → ⚙️ Administrator → 🛡️ Moderator →
🤝 Helper → 🎪 Host → 👔 HR →
🏙️ Mieszkaniec → 💎 Booster / 💜 Wspierający →
🚔 Policja / 🚒 Straż Pożarna / 🚑 EMS / 🚧 DOT / 🏛️ Straż Miejska →
🪪 Kat. AM/A1/A2/A/B/C/D →
❓ Niezweryfikowany
```

---

*Greenville RP Bot v2.0 — Built with ❤️ for Polish Roblox RP Community*
