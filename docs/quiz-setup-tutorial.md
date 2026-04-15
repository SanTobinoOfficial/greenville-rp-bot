# Tutorial: Konfiguracja systemu quizu weryfikacyjnego AURORA Greenville RP

> Dotyczy wersji systemu v4.0. Zaktualizowane: 2025.

---

## Spis treści

1. [Architektura systemu](#1-architektura-systemu)
2. [Wymagania wstępne](#2-wymagania-wstępne)
3. [Krok 1 — Migracja bazy danych](#krok-1--migracja-bazy-danych)
4. [Krok 2 — Dodanie pytań do bazy](#krok-2--dodanie-pytań-do-bazy)
5. [Krok 3 — Konfiguracja zmiennych środowiskowych](#krok-3--konfiguracja-zmiennych-środowiskowych)
6. [Krok 4 — Konfiguracja ustawień w dashboardzie](#krok-4--konfiguracja-ustawień-w-dashboardzie)
7. [Krok 5 — Weryfikacja działania quizu](#krok-5--weryfikacja-działania-quizu)
8. [Jak dodać / edytować pytania](#jak-dodać--edytować-pytania)
9. [Jak działa ocenianie pytań otwartych](#jak-działa-ocenianie-pytań-otwartych)
10. [Rozwiązywanie problemów](#rozwiązywanie-problemów)
11. [Pełna lista pytań](#pełna-lista-pytań)

---

## 1. Architektura systemu

System quizu działa w dwóch trybach:

### Tryb webowy (główny — zalecany)
```
Gracz klika "🎮 Zweryfikuj się" na Discord
  ↓
Bot otwiera modal (formularz: nick Roblox, wiek, doświadczenie)
  ↓
Weryfikacja Roblox API + AI detection formularza
  ↓
Bot wysyła token quizu przez DM (lub ephemeral)
  ↓
Gracz otwiera link: https://twoja-domena.vercel.app/quiz/{token}
  ↓
20 pytań w przeglądarce (15 zamkniętych + 5 otwartych), 20 minut
  ↓
Dashboard API sprawdza odpowiedzi server-side
  ↓
Wynik: PASS (14+/20) → API wywołuje bot → bot nadaje rolę Mieszkaniec
```

### Tryb Discord (backup — tylko pytania zamknięte)
```
Gracz klika "📋 Quiz Discord" na Discord
  ↓
Bot generuje token i wysyła link (verifyQuiz.js)
  ↓
... lub bot wyświetla quiz bezpośrednio ephemeral w Discord
  ↓
10 losowych pytań zamkniętych, wymagane 8/10
```

---

## 2. Wymagania wstępne

- Node.js 18+
- PostgreSQL 14+
- Prisma CLI: `npm install -g prisma`
- Uruchomiony dashboard Next.js (Vercel lub lokalnie)
- Uruchomiony bot Discord
- Zmienne `.env` skonfigurowane (patrz krok 3)

---

## Krok 1 — Migracja bazy danych

Schemat `QuizQuestion` został rozszerzony o pola `type`, `keywords`, i `tip`.

### 1a. Wygeneruj migrację

W katalogu `dashboard/`:

```bash
cd dashboard
npx prisma migrate dev --name add_quiz_open_questions
```

> Jeśli używasz `db push` zamiast migracji:
> ```bash
> npx prisma db push
> ```

### 1b. Zregeneruj klienta Prisma

```bash
npx prisma generate
```

Sprawdź że w `node_modules/@prisma/client` pojawiły się nowe pola (`type`, `keywords`, `tip`).

---

## Krok 2 — Dodanie pytań do bazy

### Opcja A: Seed automatyczny (zalecana)

Plik `dashboard/prisma/seed-quiz.ts` zawiera gotowe **20 pytań** (15 zamkniętych + 5 otwartych).

```bash
cd dashboard

# Zainstaluj zależności jeśli brakuje
npm install ts-node tsconfig-paths @types/node --save-dev

# Uruchom seed
npx ts-node -r tsconfig-paths/register prisma/seed-quiz.ts
```

Oczekiwany wynik:
```
🌱 Seeding pytań quizu AURORA Greenville RP...
🗑️  Usunięto 0 poprzednich pytań.
❓ [01] Co oznacza skrót **FRP** (Fail Role Play)?…
❓ [02] Co to jest **NLR** (New Life Rule)?…
...
📝 [16] Wyjaśnij własnymi słowami czym jest **roleplay**…
...
✅ Dodano 20 pytań (15 zamkniętych + 5 otwartych).
⚙️  Zaktualizowano ustawienia: passScore=14, totalQuestions=20.
```

### Opcja B: Dashboard GUI (dla mniejszych zmian)

1. Zaloguj się na dashboard jako **ADMIN** lub **OWNER**
2. Przejdź do **Dashboard → Quiz** (`/dashboard/quiz`)
3. Kliknij „Dodaj pytanie"
4. Wypełnij formularz:
   - **Typ:** Zamknięte / Otwarte
   - **Treść pytania**
   - Dla zamkniętych: opcje A/B/C/D + zaznacz poprawną
   - Dla otwartych: słowa kluczowe (po przecinku, np. `postać, roleplay, zasady, regulamin`)
   - Wskazówka (wyświetlana po błędnej odpowiedzi)
5. Kliknij „Zapisz"

### Opcja C: Ręczne SQL (zaawansowane)

```sql
INSERT INTO "QuizQuestion" (id, question, type, answers, correct, keywords, tip, active, "order")
VALUES (
  gen_random_uuid(),
  'Co to jest FRP?',
  'CLOSED',
  ARRAY['Zachowanie niezgodne z realiami RP', 'Typ pojazdu', 'Komenda bota', 'Służba policyjna'],
  0,
  ARRAY[]::text[],
  'FRP = Fail Roleplay, łamanie realizmu.',
  true,
  1
);
```

---

## Krok 3 — Konfiguracja zmiennych środowiskowych

### `dashboard/.env` (lub Vercel Environment Variables)

```env
# Baza danych
DATABASE_URL="postgresql://user:password@host:5432/greenville"

# NextAuth
NEXTAUTH_URL="https://twoja-domena.vercel.app"
NEXTAUTH_SECRET="losowy-tajny-klucz-min-32-znaki"

# Discord OAuth
DISCORD_CLIENT_ID="twoje-discord-client-id"
DISCORD_CLIENT_SECRET="twoje-discord-client-secret"

# Połączenie z botem
BOT_API_URL="http://localhost:3001"   # lub URL tunela (ngrok/cloudflare)
BOT_API_KEY="tajny-klucz-bota"
```

### `bot/.env`

```env
DISCORD_TOKEN="twoj-token-bota"
DATABASE_URL="postgresql://..."    # ta sama baza co dashboard
BOT_API_KEY="tajny-klucz-bota"     # musi zgadzać się z dashboard
NEXTAUTH_URL="https://twoja-domena.vercel.app"
```

> **Ważne:** `BOT_API_KEY` musi być identyczny w obu plikach `.env`. Bot weryfikuje ten klucz gdy dashboard wywołuje endpoint `/quiz-result`.

---

## Krok 4 — Konfiguracja ustawień w dashboardzie

1. Zaloguj się jako **OWNER** na dashboard
2. Przejdź do **Dashboard → Ustawienia** (`/dashboard/ustawienia`)
3. W sekcji **Quiz / Weryfikacja** ustaw:

| Ustawienie | Wartość | Opis |
|------------|---------|------|
| `quizPassScore` | `14` | Minimum punktów do zaliczenia (z 20) |
| `quizTotalQuestions` | `20` | Liczba pytań w quizie |
| `quizCooldownHours` | `24` | Cooldown między próbami (godziny) |

4. Zapisz ustawienia.

---

## Krok 5 — Weryfikacja działania quizu

### Test manualny

1. Na serwerze Discord przejdź na kanał **#zacznij-tutaj**
2. Kliknij przycisk **🎮 Zweryfikuj się**
3. Wypełnij formularz weryfikacyjny (modal)
4. Poczekaj na wiadomość DM z linkiem do quizu
5. Otwórz link w przeglądarce
6. Sprawdź że:
   - Widoczne są pytania zamknięte (przyciski A/B/C/D)
   - Widoczne są pytania otwarte (pole tekstowe)
   - Timer odlicza od 20:00
   - Ikony typów pytań (niebieski = zamknięte, fioletowy = otwarte)
7. Ukończ quiz i sprawdź wynik

### Sprawdzenie logów

Na kanale **#🪪│logi-weryfikacji** powinien pojawić się embed z wynikiem.

W dashboardzie (`/dashboard/logi`) widoczny wpis typu `QUIZ_RESULT`.

### Test API (opcjonalnie)

```bash
# Sprawdź czy API zwraca pytania
curl "https://twoja-domena.vercel.app/api/quiz/questions?token=TWOJ_TOKEN"

# Oczekiwana odpowiedź:
# { "questions": [...], "total": 20, "passScore": 14, ... }
```

---

## Jak dodać / edytować pytania

### Dodanie nowego pytania zamkniętego

W pliku `dashboard/prisma/seed-quiz.ts` dodaj obiekt w tablicy `questions`:

```typescript
{
  type: 'CLOSED',
  order: 21,                          // kolejne ID
  question: 'Twoje pytanie tutaj?',
  answers: [
    'Odpowiedź A',
    'Odpowiedź B (poprawna)',
    'Odpowiedź C',
    'Odpowiedź D',
  ],
  correct: 1,                         // indeks poprawnej (0=A, 1=B, 2=C, 3=D)
  keywords: [],                       // puste dla CLOSED
  tip: 'Wyjaśnienie wyświetlane po błędzie.',
},
```

### Dodanie nowego pytania otwartego

```typescript
{
  type: 'OPEN',
  order: 22,
  question: 'Opisz czym jest roleplay własnymi słowami.',
  answers: [],                        // puste dla OPEN
  correct: -1,                        // -1 dla OPEN
  keywords: [
    'postać', 'rola', 'odgrywać',     // słowa kluczowe
    'immersja', 'scenariusz', 'zasady',
  ],
  tip: 'Odpowiedź powinna zawierać opis wcielania się w postać.',
},
```

Po edycji uruchom seed ponownie:
```bash
npx ts-node -r tsconfig-paths/register prisma/seed-quiz.ts
```

> **Uwaga:** Seed usuwa i zastępuje wszystkie pytania. Jeśli dodajesz tylko jedno pytanie, użyj dashboardu GUI lub SQL.

---

## Jak działa ocenianie pytań otwartych

System ocenia odpowiedzi otwarte przez **dopasowanie słów kluczowych**:

```
Wymagana liczba trafień = max(1, ceil(keywords.length × 0.40))
```

**Przykład:**
- Pytanie ma 10 słów kluczowych
- Wymagane trafienia: `ceil(10 × 0.4)` = **4**
- Gracz użył 5 słów kluczowych → odpowiedź **zaliczona** ✅
- Gracz użył 3 słów kluczowych → odpowiedź **niezaliczona** ❌

### Wskazówki dla słów kluczowych

- Używaj **form podstawowych** (np. `postać` zamiast `postaciami`)
- Dodawaj **synonimy** (np. `zasady, regulamin, przepisy`)
- Nie dodawaj zbyt specyficznych słów, które gracz może normalnie nie znać
- Rekomendowana liczba słów kluczowych: **8–12** na pytanie

### Minimalna długość odpowiedzi otwartej

Odpowiedź musi mieć minimum **20 znaków** aby zostać wysłana (walidacja client-side).

---

## Rozwiązywanie problemów

### Problem: Quiz nie ładuje się (`Nieprawidłowy token`)

**Przyczyny:**
- Token wygasł (ważny 30 minut)
- Token już użyty
- `NEXTAUTH_URL` w bocie nie zgadza się z domeną dashboardu

**Rozwiązanie:**
```bash
# Sprawdź w bazie danych czy token istnieje
SELECT * FROM "QuizToken" WHERE token = 'TWOJ_TOKEN';
```

---

### Problem: Pytania nie ładują się (`Brak pytań w bazie`)

**Przyczyna:** Baza danych jest pusta lub migracja nie zastosowana.

**Rozwiązanie:**
```bash
cd dashboard
npx prisma db push
npx ts-node -r tsconfig-paths/register prisma/seed-quiz.ts
```

---

### Problem: Rola Mieszkaniec nie jest nadawana po zdaniu quizu

**Sprawdź:**
1. Czy `BOT_API_URL` i `BOT_API_KEY` w dashboardzie są poprawne
2. Czy bot jest online i dostępny pod wskazanym URL
3. Logi bota: `bot/logs/` lub konsola panelu hosting

**Sprawdź endpoint bota ręcznie:**
```bash
curl -X POST http://localhost:3001/quiz-result \
  -H "Content-Type: application/json" \
  -H "X-API-Key: TWOJ_BOT_API_KEY" \
  -d '{"userId":"DISCORD_ID","score":15,"total":20,"passed":true}'
```

---

### Problem: Pytania otwarte zawsze są oceniane jako niepoprawne

**Sprawdź:**
1. Czy pytania mają ustawione `keywords` (kolumna `keywords` w tabeli)
2. Czy odpowiedź gracza ma minimum 20 znaków
3. W dashboardzie `/dashboard/quiz` edytuj pytanie i dodaj słowa kluczowe

---

### Problem: `quizEngine.js` pokazuje stare pytania (brak otwartych)

Quiz Discord (`quizEngine.js`) używa hardcoded pytań i **nie pobiera z bazy danych** — to celowe dla szybkości. Pytania otwarte są dostępne **tylko w quizie webowym**.

Aby dodać pytanie do quizu Discord, edytuj tablicę `ALL_QUESTIONS` w `bot/src/utils/quizEngine.js`.

---

## Pełna lista pytań

### Pytania zamknięte (1–15)

| # | Pytanie | Poprawna odpowiedź |
|---|---------|-------------------|
| 1 | Co oznacza FRP? | Zachowanie niezgodne z realiami RP |
| 2 | Co to jest NLR? | Zasada zapominania wszystkiego po śmierci |
| 3 | Co to jest metagaming? | Używanie informacji spoza postaci w RP |
| 4 | Co to jest powergaming? | Narzucanie akcji bez szansy na reakcję |
| 5 | Co to jest RDM? | Zabijanie graczy bez powodu RP |
| 6 | Co to jest VDM? | Potrącanie pojazdem bez powodu RP |
| 7 | Czego NIE wolno robić w IC? | Mówić nickami Discord / mówić o Roblox |
| 8 | Co grozi za naruszenie NLR? | Warn, przy powtórzeniu ban |
| 9 | Jakiego języka używamy na serwerze? | Polskiego |
| 10 | Co zrobić przy problemie z graczem? | Otworzyć ticket lub skontaktować się ze staffem |
| 11 | Kiedy wolno użyć broni palnej? | Tylko w uzasadnionym scenariuszu RP |
| 12 | Co to jest Fear RP? | Zasada nakazująca strach w sytuacji zagrożenia |
| 13 | Kiedy kończy się Fear RP? | Gdy zagrożenie minie |
| 14 | Co oznacza rola Mieszkaniec? | Pełna weryfikacja — Roblox + quiz |
| 15 | Limit mandatów RP przed przesłuchaniem? | 10 |

### Pytania otwarte (16–20)

| # | Pytanie | Kluczowe słowa |
|---|---------|----------------|
| 16 | Wyjaśnij czym jest roleplay | postać, rola, odgrywać, immersja, zasady |
| 17 | Czym jest metagaming i dlaczego zakazany? | informacja, discord, poza grą, postać nie wie, wiedza |
| 18 | Jak zachować się przy zatrzymaniu przez policję (Fear RP) | zatrzymać, ręce, fear rp, nie uciekać, posłuszeństwo |
| 19 | Co to NLR i jak wpływa na zachowanie? | śmierć, nowe życie, zapomnieć, kto zabił, nie wracać |
| 20 | Co zrobić będąc ofiarą RDM? | ticket, zgłosić, staff, dowód, screenshot |

---

*Tutorial przygotowany dla AURORA Greenville RP v4.0*
