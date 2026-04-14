// Dashboard — /boty — Lista komend zewnętrznych botów serwera
// Zawiera pełną listę komend: Dyno, Pancake, GiveawayBot, Tickets v2, RMF MAXX, StartIT, FreshTok

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { redirect } from 'next/navigation';

// ── Typy ─────────────────────────────────────────────────────────────────────
interface BotCommand {
  cmd: string;
  opis: string;
  przyklad?: string;
  uprawnienia?: string;
  kategoria: string;
}

interface BotDef {
  name: string;
  emoji: string;
  opis: string;
  prefix?: string;
  invite?: string;
  color: string;
  status: 'aktywny' | 'nieaktywny';
  kategorie: string[];
  komendy: BotCommand[];
}

// ── Dane botów ─────────────────────────────────────────────────────────────────
const BOTY: BotDef[] = [
  // ── DYNO ──────────────────────────────────────────────────────────────────
  {
    name: 'Dyno',
    emoji: '🤖',
    opis: 'Wszechstronny bot moderacyjny. Automod, logi, anti-spam, planowane wiadomości, niestandardowe komendy, muzyka, tagi.',
    prefix: '?',
    invite: 'https://dyno.gg/invite',
    color: '#5865F2',
    status: 'aktywny',
    kategorie: ['Manager', 'Moderacja', 'Role', 'Muzyka', 'Tagi', 'Zabawa', 'Użyteczne'],
    komendy: [
      // Manager (Admin/Manage Server)
      { cmd: '?addmod [rola]',              opis: 'Nadaj roli uprawnienia moderatora Dyno',            uprawnienia: 'Admin+',     kategoria: 'Manager' },
      { cmd: '?listmods',                   opis: 'Wyświetl listę moderatorów i ról moderatorskich',   uprawnienia: 'Admin+',     kategoria: 'Manager' },
      { cmd: '?addrole [nazwa] [kolor]',    opis: 'Utwórz nową rolę na serwerze',                      uprawnienia: 'Admin+',     kategoria: 'Manager' },
      { cmd: '?delrole [rola]',             opis: 'Usuń istniejącą rolę',                              uprawnienia: 'Admin+',     kategoria: 'Manager' },
      { cmd: '?announce [kanał] [wiadomość]', opis: 'Wyślij ogłoszenie na kanał (slash: /announce)', uprawnienia: 'Admin+',     kategoria: 'Manager' },
      { cmd: '?prefix [prefix]',            opis: 'Wyświetl lub zmień prefix komend bota',             uprawnienia: 'Admin+',     kategoria: 'Manager' },
      { cmd: '?setnick @gracz [nick]',      opis: 'Zmień nick gracza na serwerze',                     uprawnienia: 'Moderator+', kategoria: 'Manager' },
      { cmd: '?purge [liczba]',             opis: 'Usuń do 1000 wiadomości jednocześnie',              uprawnienia: 'Admin+',     kategoria: 'Manager' },
      { cmd: '?lock [kanał] [czas] [msg]',  opis: 'Zablokuj kanał — członkowie nie mogą pisać',       uprawnienia: 'Moderator+', kategoria: 'Manager' },
      { cmd: '?unlock [kanał]',             opis: 'Odblokuj zablokowany kanał',                        uprawnienia: 'Moderator+', kategoria: 'Manager' },
      { cmd: '?lockdown / ?lockdown end',   opis: 'Zablokuj/odblokuj cały serwer',                    uprawnienia: 'Admin+',     kategoria: 'Manager' },
      { cmd: '?slowmode [czas]',            opis: 'Ustaw cooldown między wiadomościami na kanale',     uprawnienia: 'Moderator+', kategoria: 'Manager' },
      { cmd: '?module [moduł]',             opis: 'Włącz lub wyłącz moduł Dyno',                      uprawnienia: 'Admin+',     kategoria: 'Manager' },
      { cmd: '?modules',                    opis: 'Lista wszystkich modułów i ich statusów',           uprawnienia: 'Admin+',     kategoria: 'Manager' },
      { cmd: '?command [komenda]',          opis: 'Włącz lub wyłącz konkretną komendę',               uprawnienia: 'Admin+',     kategoria: 'Manager' },
      { cmd: '?ignorerole [rola]',          opis: 'Przełącz dostęp do komend dla roli',               uprawnienia: 'Admin+',     kategoria: 'Manager' },
      // Moderacja
      { cmd: '?ban @gracz [czas] [powód]',  opis: 'Zbanuj gracza z opcjonalnym czasem (m/h/d/w)',      uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?unban @gracz',               opis: 'Odbanuj gracza (po ID lub nazwie)',                  uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?softban @gracz [powód]',     opis: 'Ban + natychmiastowy unban — usuwa wiadomości',     uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?kick @gracz [powód]',        opis: 'Wyrzuć gracza z serwera',                           uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?mute @gracz [czas] [powód]', opis: 'Wycisz gracza z opcjonalnym czasem trwania',       uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?unmute @gracz',              opis: 'Zdejmij wyciszenie z gracza',                       uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?deafen @gracz',              opis: 'Server-deafen gracza na kanałach głosowych',        uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?undeafen @gracz',            opis: 'Usuń server-deafen gracza',                         uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?warn @gracz [powód]',        opis: 'Ostrzeż gracza — wysyła DM i loguje akcję',         uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?warnings @gracz',            opis: 'Pokaż wszystkie ostrzeżenia gracza',                uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?clearwarn @gracz',           opis: 'Wyczyść wszystkie ostrzeżenia gracza',              uprawnienia: 'Admin+',     kategoria: 'Moderacja' },
      { cmd: '?modlogs @gracz',             opis: 'Pokaż historię akcji moderacyjnych gracza',         uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?reason [caseID] [powód]',    opis: 'Dodaj lub edytuj powód dla case moderacyjnego',    uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?note @gracz [tekst]',        opis: 'Dodaj wewnętrzną notatkę o graczu (bez kary)',     uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?notes @gracz',               opis: 'Pokaż wszystkie notatki o graczu',                  uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?delnote [ID notatki]',       opis: 'Usuń konkretną notatkę',                            uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?editnote [ID] [nowa treść]', opis: 'Edytuj konkretną notatkę',                          uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: '?temprole @gracz [czas] [rola]', opis: 'Nadaj rolę graczowi na określony czas',         uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      // Role
      { cmd: '?addrank [nazwa] [kolor]',    opis: 'Utwórz rolę do samodzielnego przypisania',          uprawnienia: 'Admin+',     kategoria: 'Role' },
      { cmd: '?rank [nazwa]',               opis: 'Dołącz do lub opuść samodzielnie wybieraną rolę',  uprawnienia: 'Wszyscy',    kategoria: 'Role' },
      { cmd: '?ranks',                      opis: 'Lista wszystkich dostępnych ról do wyboru',          uprawnienia: 'Wszyscy',    kategoria: 'Role' },
      { cmd: '?delrank [nazwa]',            opis: 'Usuń samodzielnie wybieraną rolę',                  uprawnienia: 'Admin+',     kategoria: 'Role' },
      { cmd: '?roles [szukaj]',             opis: 'Lista wszystkich ról serwera z liczbą członków',   uprawnienia: 'Wszyscy',    kategoria: 'Role' },
      { cmd: '?roleinfo [rola]',            opis: 'Szczegółowe informacje o roli',                     uprawnienia: 'Wszyscy',    kategoria: 'Role' },
      // Muzyka
      { cmd: '?play [URL/tytuł]',           opis: 'Dodaj utwór do kolejki i odtwórz',                  uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: '?skip',                       opis: 'Pomiń aktualny utwór',                              uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: '?stop',                       opis: 'Zatrzymaj muzykę',                                  uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: '?pause / ?resume',            opis: 'Wstrzymaj/wznów odtwarzanie',                       uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: '?nowplaying',                 opis: 'Pokaż aktualnie odtwarzany utwór',                  uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: '?seek [czas]',                opis: 'Przewiń do określonego miejsca w utworze',           uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: '?volume [1-100]',             opis: 'Ustaw głośność odtwarzania',                        uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: '?queue list/remove/clear',    opis: 'Zarządzaj kolejką (pokaż, usuń, wyczyść)',          uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: '?queue repeat / shuffle',     opis: 'Włącz pętlę lub przetasuj kolejkę',                uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      // Tagi
      { cmd: '?tag [nazwa]',                opis: 'Wyświetl zapisany tag (snippet auto-odpowiedzi)',   uprawnienia: 'Wszyscy',    kategoria: 'Tagi' },
      { cmd: '?tag create [nazwa] [treść]', opis: 'Utwórz nowy tag',                                  uprawnienia: 'Moderator+', kategoria: 'Tagi' },
      { cmd: '?tag edit [nazwa] [treść]',   opis: 'Edytuj istniejący tag',                             uprawnienia: 'Moderator+', kategoria: 'Tagi' },
      { cmd: '?tag delete [nazwa]',         opis: 'Usuń tag',                                          uprawnienia: 'Moderator+', kategoria: 'Tagi' },
      { cmd: '?tags [szukaj]',              opis: 'Lista wszystkich dostępnych tagów',                 uprawnienia: 'Wszyscy',    kategoria: 'Tagi' },
      // Zabawa
      { cmd: '?8ball [pytanie]',            opis: 'Magiczna kula 8 — odpowiedź na pytanie',            uprawnienia: 'Wszyscy',    kategoria: 'Zabawa' },
      { cmd: '?flip',                       opis: 'Rzuć monetą (orzeł/reszka)',                        uprawnienia: 'Wszyscy',    kategoria: 'Zabawa' },
      { cmd: '?rps [wybór]',                opis: 'Kamień-papier-nożyce przeciwko botowi',             uprawnienia: 'Wszyscy',    kategoria: 'Zabawa' },
      { cmd: '?dadjoke',                    opis: 'Losowy suchy żart (dad joke)',                      uprawnienia: 'Wszyscy',    kategoria: 'Zabawa' },
      { cmd: '?dog / ?cat / ?pug',          opis: 'Losowe zdjęcie psa/kota/mopsa',                     uprawnienia: 'Wszyscy',    kategoria: 'Zabawa' },
      { cmd: '?pokemon [nazwa]',            opis: 'Informacje o Pokémonie',                            uprawnienia: 'Wszyscy',    kategoria: 'Zabawa' },
      // Użyteczne
      { cmd: '?serverinfo',                 opis: 'Informacje o serwerze Discord',                     uprawnienia: 'Wszyscy',    kategoria: 'Użyteczne' },
      { cmd: '?whois @gracz',               opis: 'Informacje o graczu (data dołączenia, role, ID)',   uprawnienia: 'Wszyscy',    kategoria: 'Użyteczne' },
      { cmd: '?avatar @gracz',              opis: 'Pokaż avatar gracza',                               uprawnienia: 'Wszyscy',    kategoria: 'Użyteczne' },
      { cmd: '?membercount',                opis: 'Liczba członków serwera',                           uprawnienia: 'Wszyscy',    kategoria: 'Użyteczne' },
      { cmd: '?emotes',                     opis: 'Lista wszystkich emoji serwera',                    uprawnienia: 'Wszyscy',    kategoria: 'Użyteczne' },
      { cmd: '?remindme [czas] [treść]',    opis: 'Ustaw osobiste przypomnienie',                      uprawnienia: 'Wszyscy',    kategoria: 'Użyteczne' },
      { cmd: '?afk',                        opis: 'Ustaw status AFK — bot powiadomi innych przy wzmiance', uprawnienia: 'Wszyscy', kategoria: 'Użyteczne' },
      { cmd: '?randomcolor',                opis: 'Wygeneruj losowy kolor hex z podglądem',            uprawnienia: 'Wszyscy',    kategoria: 'Użyteczne' },
      { cmd: '?poll [pytanie]',             opis: 'Utwórz ankietę tak/nie z reakcjami',               uprawnienia: 'Moderator+', kategoria: 'Użyteczne' },
      { cmd: '?embed [tekst]',              opis: 'Wyślij embed przez bota',                           uprawnienia: 'Admin+',     kategoria: 'Użyteczne' },
      { cmd: '?info / ?uptime / ?ping',     opis: 'Informacje o bocie, uptime, latencja',              uprawnienia: 'Wszyscy',    kategoria: 'Użyteczne' },
    ],
  },

  // ── PANCAKE ────────────────────────────────────────────────────────────────
  {
    name: 'Pancake',
    emoji: '🥞',
    opis: 'Bot muzyczny + moderacyjny + ekonomiczny. Muzyka z YouTube/Spotify, moderacja, leveling, ekonomia, obrazki, zabawa.',
    prefix: 'p!',
    invite: 'https://pancake.gg',
    color: '#f59e0b',
    status: 'aktywny',
    kategorie: ['Muzyka', 'Moderacja', 'Leveling', 'Ekonomia', 'Obrazki', 'Zabawa', 'Ustawienia'],
    komendy: [
      // Muzyka
      { cmd: 'p!play [utwór/URL]',      opis: 'Odtwórz utwór z YouTube/Spotify (alias: p!p)',        uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: 'p!pause / p!resume',      opis: 'Wstrzymaj/wznów odtwarzanie',                         uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: 'p!skip',                  opis: 'Pomiń aktualny utwór',                                uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: 'p!stop',                  opis: 'Zatrzymaj muzykę i rozłącz bota',                     uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: 'p!queue',                 opis: 'Pokaż kolejkę nadchodzących utworów',                 uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: 'p!repeat',                opis: 'Zapętl aktualny utwór lub kolejkę',                   uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: 'p!shuffle',               opis: 'Przetasuj kolejkę losowo',                            uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: 'p!seek [czas]',           opis: 'Przewiń do określonej pozycji w utworze',             uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: 'p!volume [1-200]',        opis: 'Ustaw głośność (Premium)',                            uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: 'p!autoplay',              opis: 'Automatycznie kolejkuje podobne utwory',              uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: 'p!lyrics',                opis: 'Pokaż tekst aktualnie odtwarzanego utworu',           uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: 'p!join / p!leave',        opis: 'Wezwij lub rozłącz bota z kanału głosowego',         uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      { cmd: 'p!bassboost',             opis: 'Przełącz bass boost',                                 uprawnienia: 'Wszyscy',    kategoria: 'Muzyka' },
      // Moderacja
      { cmd: 'p!ban @gracz [powód]',    opis: 'Zbanuj gracza permanentnie',                          uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: 'p!unban [ID]',            opis: 'Odbanuj gracza po ID',                                uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: 'p!kick @gracz [powód]',   opis: 'Wyrzuć gracza z serwera',                             uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: 'p!mute @gracz',           opis: 'Wycisz gracza',                                       uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: 'p!unmute @gracz',         opis: 'Zdejmij wyciszenie z gracza',                         uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: 'p!warn @gracz [powód]',   opis: 'Ostrzeż gracza',                                      uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: 'p!infractions @gracz',    opis: 'Pokaż historię naruszeń gracza',                      uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: 'p!purge [liczba]',        opis: 'Masowe usuwanie wiadomości (alias: p!clean)',          uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: 'p!purge @gracz [liczba]', opis: 'Usuń wiadomości konkretnego gracza',                  uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: 'p!vckick @gracz',         opis: 'Wyrzuć gracza z kanału głosowego',                   uprawnienia: 'Moderator+', kategoria: 'Moderacja' },
      { cmd: 'p!lockdown',              opis: 'Zablokuj serwer lub kanał przed pisaniem',            uprawnienia: 'Admin+',     kategoria: 'Moderacja' },
      { cmd: 'p!modlog [#kanał]',       opis: 'Ustaw kanał dla logów moderacyjnych',                 uprawnienia: 'Admin+',     kategoria: 'Moderacja' },
      // Leveling
      { cmd: 'p!level [@gracz]',        opis: 'Pokaż poziom XP gracza',                              uprawnienia: 'Wszyscy',    kategoria: 'Leveling' },
      { cmd: 'p!levelleaderboard',      opis: 'Ranking XP serwera',                                  uprawnienia: 'Wszyscy',    kategoria: 'Leveling' },
      { cmd: 'p!xpchannel [#kanał]',    opis: 'Włącz zdobywanie XP na kanale',                       uprawnienia: 'Admin+',     kategoria: 'Leveling' },
      { cmd: 'p!resetlevel @gracz',     opis: 'Resetuj poziom gracza',                               uprawnienia: 'Admin+',     kategoria: 'Leveling' },
      { cmd: 'p!xp @gracz [kwota]',     opis: 'Dodaj/usuń XP graczowi',                              uprawnienia: 'Admin+',     kategoria: 'Leveling' },
      { cmd: 'p!levelmessages',         opis: 'Włącz/wyłącz powiadomienia o awansach',               uprawnienia: 'Admin+',     kategoria: 'Leveling' },
      { cmd: 'p!levelroles',            opis: 'Zarządzaj rolami za osiągnięcie poziomów',            uprawnienia: 'Admin+',     kategoria: 'Leveling' },
      // Ekonomia
      { cmd: 'p!balance [@gracz]',      opis: 'Sprawdź saldo monet',                                 uprawnienia: 'Wszyscy',    kategoria: 'Ekonomia' },
      { cmd: 'p!daily',                 opis: 'Odbierz dzienną nagrodę (500 monet)',                 uprawnienia: 'Wszyscy',    kategoria: 'Ekonomia' },
      { cmd: 'p!work / p!fish',         opis: 'Zarabiaj monety przez mini-gry',                      uprawnienia: 'Wszyscy',    kategoria: 'Ekonomia' },
      { cmd: 'p!blackjack [zakład]',    opis: 'Zagraj w blackjacka',                                  uprawnienia: 'Wszyscy',    kategoria: 'Ekonomia' },
      { cmd: 'p!slots [zakład]',        opis: 'Zagraj w jednorękiego bandytę',                        uprawnienia: 'Wszyscy',    kategoria: 'Ekonomia' },
      { cmd: 'p!trivia',                opis: 'Quiz — zarabiaj monety za poprawne odpowiedzi',       uprawnienia: 'Wszyscy',    kategoria: 'Ekonomia' },
      { cmd: 'p!rob @gracz',            opis: 'Spróbuj okraść innego gracza',                        uprawnienia: 'Wszyscy',    kategoria: 'Ekonomia' },
      { cmd: 'p!give @gracz [kwota]',   opis: 'Przekaż monety innemu graczowi',                      uprawnienia: 'Wszyscy',    kategoria: 'Ekonomia' },
      { cmd: 'p!deposit / p!withdraw',  opis: 'Wpłać/wypłać monety z banku',                         uprawnienia: 'Wszyscy',    kategoria: 'Ekonomia' },
      { cmd: 'p!shop / p!buy / p!sell', opis: 'Sklep — kupuj i sprzedawaj przedmioty',              uprawnienia: 'Wszyscy',    kategoria: 'Ekonomia' },
      { cmd: 'p!inventory',             opis: 'Pokaż swoje przedmioty',                              uprawnienia: 'Wszyscy',    kategoria: 'Ekonomia' },
      { cmd: 'p!leaderboard',           opis: 'Ranking monet serwera',                               uprawnienia: 'Wszyscy',    kategoria: 'Ekonomia' },
      { cmd: 'p!addbalance @gracz [k]', opis: 'Dodaj monety graczowi (Admin)',                       uprawnienia: 'Admin+',     kategoria: 'Ekonomia' },
      { cmd: 'p!resetbalance @gracz',   opis: 'Resetuj saldo gracza (Admin)',                        uprawnienia: 'Admin+',     kategoria: 'Ekonomia' },
      // Obrazki
      { cmd: 'p!cat / p!dog / p!birb',  opis: 'Losowe zdjęcie kota/psa/ptaka',                       uprawnienia: 'Wszyscy',    kategoria: 'Obrazki' },
      { cmd: 'p!meme',                  opis: 'Losowy mem z Reddita',                                uprawnienia: 'Wszyscy',    kategoria: 'Obrazki' },
      { cmd: 'p!magik [@gracz/obraz]',  opis: 'Content-aware scale distortion efekt',                uprawnienia: 'Wszyscy',    kategoria: 'Obrazki' },
      { cmd: 'p!sepia / p!grayscale',   opis: 'Filtr sepia/skala szarości na obrazku',               uprawnienia: 'Wszyscy',    kategoria: 'Obrazki' },
      { cmd: 'p!beautiful / p!present', opis: 'Memy z avatarem gracza',                              uprawnienia: 'Wszyscy',    kategoria: 'Obrazki' },
      { cmd: 'p!kiss / p!hug / p!slap', opis: 'Animowane GIF-y anime',                               uprawnienia: 'Wszyscy',    kategoria: 'Obrazki' },
      // Zabawa
      { cmd: 'p!8ball [pytanie]',        opis: 'Magiczna kula 8 — odpowiedź tak/nie',                uprawnienia: 'Wszyscy',    kategoria: 'Zabawa' },
      { cmd: 'p!coinflip / p!flip',      opis: 'Rzuć monetą (orzeł/reszka)',                         uprawnienia: 'Wszyscy',    kategoria: 'Zabawa' },
      { cmd: 'p!roast @gracz',           opis: 'Żartobliwy "hejt" na gracza',                        uprawnienia: 'Wszyscy',    kategoria: 'Zabawa' },
      { cmd: 'p!ship @gracz1 @gracz2',   opis: 'Ocena dopasowania dwóch graczy',                     uprawnienia: 'Wszyscy',    kategoria: 'Zabawa' },
      { cmd: 'p!akinator',               opis: 'Gra w Akinatora — zgadywanie postaci',               uprawnienia: 'Wszyscy',    kategoria: 'Zabawa' },
      { cmd: 'p!bigtext [tekst]',        opis: 'Konwertuj tekst na duże emoji-litery',                uprawnienia: 'Wszyscy',    kategoria: 'Zabawa' },
      { cmd: 'p!poll [pytanie]',         opis: 'Utwórz ankietę z reakcjami',                         uprawnienia: 'Wszyscy',    kategoria: 'Zabawa' },
      { cmd: 'p!translate [język] [tekst]', opis: 'Tłumacz tekst na wybrany język',                  uprawnienia: 'Wszyscy',    kategoria: 'Zabawa' },
      // Ustawienia
      { cmd: 'p!prefix [prefix]',        opis: 'Zmień prefix bota',                                  uprawnienia: 'Admin+',     kategoria: 'Ustawienia' },
      { cmd: 'p!greeting / p!welcome',   opis: 'Skonfiguruj wiadomości powitalne',                   uprawnienia: 'Admin+',     kategoria: 'Ustawienia' },
      { cmd: 'p!farewell',               opis: 'Skonfiguruj wiadomości pożegnalne',                  uprawnienia: 'Admin+',     kategoria: 'Ustawienia' },
      { cmd: 'p!autorole [rola]',        opis: 'Automatycznie nadawaj rolę nowym członkom',          uprawnienia: 'Admin+',     kategoria: 'Ustawienia' },
      { cmd: 'p!reactionroles',          opis: 'Utwórz wiadomość z rolami do wyboru przez reakcje',  uprawnienia: 'Admin+',     kategoria: 'Ustawienia' },
      { cmd: 'p!setcurrency [nazwa]',    opis: 'Ustaw własną nazwę waluty na serwerze',              uprawnienia: 'Admin+',     kategoria: 'Ustawienia' },
    ],
  },

  // ── GIVEAWAYBOT ───────────────────────────────────────────────────────────
  {
    name: 'GiveawayBot',
    emoji: '🎁',
    opis: 'Oficjalny bot do giveawayów. Używa wyłącznie komend slash (/). Losuje zwycięzców spośród uczestników, którzy kliknęli przycisk.',
    prefix: '/',
    invite: 'https://giveawaybot.party',
    color: '#f43f5e',
    status: 'aktywny',
    kategorie: ['Giveaway', 'Konfiguracja'],
    komendy: [
      { cmd: '/gstart <czas> <zwycięzcy> <nagroda>',
        opis: 'Utwórz giveaway od razu. Czas: s/m/h/d (np. 30m, 2h, 7d)',
        przyklad: '/gstart 24h 1 Ranga Supporter',
        uprawnienia: 'Manage Server', kategoria: 'Giveaway' },
      { cmd: '/gcreate',
        opis: 'Interaktywny kreator giveaway krok po kroku (podprowadza przez opcje)',
        uprawnienia: 'Manage Server', kategoria: 'Giveaway' },
      { cmd: '/gend <ID giveaway>',
        opis: 'Zakończ aktywny giveaway przed czasem — losuje zwycięzcę natychmiast',
        uprawnienia: 'Manage Server', kategoria: 'Giveaway' },
      { cmd: '/greroll <ID giveaway>',
        opis: 'Wylosuj nowego zwycięzcę dla już zakończonego giveaway',
        uprawnienia: 'Manage Server', kategoria: 'Giveaway' },
      { cmd: '/gdelete <ID giveaway>',
        opis: 'Usuń giveaway całkowicie bez losowania zwycięzcy',
        uprawnienia: 'Manage Server', kategoria: 'Giveaway' },
      { cmd: '/glist',
        opis: 'Pokaż listę wszystkich aktywnych giveawayów na serwerze',
        uprawnienia: 'Wszyscy', kategoria: 'Giveaway' },
      // Konfiguracja
      { cmd: '/gsettings show',
        opis: 'Pokaż aktualną konfigurację GiveawayBot na serwerze',
        uprawnienia: 'Manage Server', kategoria: 'Konfiguracja' },
      { cmd: '/gsettings set color <hex>',
        opis: 'Ustaw kolor embeda giveawaya (np. #FF0000)',
        przyklad: '/gsettings set color #5865F2',
        uprawnienia: 'Manage Server', kategoria: 'Konfiguracja' },
      { cmd: '/gsettings set emoji <emoji>',
        opis: 'Ustaw emoji na przycisku dołączania do giveaway',
        uprawnienia: 'Manage Server', kategoria: 'Konfiguracja' },
      { cmd: '/ghelp',
        opis: 'Lista wszystkich komend GiveawayBot',
        uprawnienia: 'Wszyscy', kategoria: 'Konfiguracja' },
      { cmd: '/gabout / /ginvite',
        opis: 'Informacje o bocie i link do zaproszenia',
        uprawnienia: 'Wszyscy', kategoria: 'Konfiguracja' },
    ],
  },

  // ── TICKETS V2 ────────────────────────────────────────────────────────────
  {
    name: 'Tickets v2',
    emoji: '🎫',
    opis: 'Profesjonalny system ticketów (tickets.bot). Wyłącznie komendy slash. Obsługa kategorii, formularzy, transkryptów, panel webowy.',
    prefix: '/',
    invite: 'https://tickets.bot',
    color: '#06b6d4',
    status: 'aktywny',
    kategorie: ['Gracz', 'Staff', 'Admin', 'Context Menu'],
    komendy: [
      // Gracz (każdy)
      { cmd: '/new',                    opis: 'Otwórz nowy ticket na serwerze',                      uprawnienia: 'Wszyscy',    kategoria: 'Gracz' },
      { cmd: '/tickets [@gracz]',        opis: 'Pokaż własne otwarte tickety (staff widzi wszystkich)', uprawnienia: 'Wszyscy',  kategoria: 'Gracz' },
      { cmd: '/topic [nowy temat]',      opis: 'Zmień temat/cel aktualnego ticketu przez modal',      uprawnienia: 'Wszyscy',    kategoria: 'Gracz' },
      { cmd: '/transfer @gracz',         opis: 'Przekaż własność ticketu innemu graczowi',            uprawnienia: 'Wszyscy',    kategoria: 'Gracz' },
      { cmd: '/tag [nazwa]',             opis: 'Wyślij predefiniowaną odpowiedź staffu w tickecie',   uprawnienia: 'Wszyscy',    kategoria: 'Gracz' },
      // Staff
      { cmd: '/add @gracz/rola',         opis: 'Dodaj gracza lub rolę do kanału ticketu',             uprawnienia: 'Staff',      kategoria: 'Staff' },
      { cmd: '/remove @gracz/rola',      opis: 'Usuń gracza lub rolę z kanału ticketu',               uprawnienia: 'Staff',      kategoria: 'Staff' },
      { cmd: '/rename [nazwa]',          opis: 'Zmień nazwę kanału ticketu',                          uprawnienia: 'Staff',      kategoria: 'Staff' },
      { cmd: '/move [kategoria]',        opis: 'Przenieś ticket do innego panelu/kategorii',          uprawnienia: 'Staff',      kategoria: 'Staff' },
      { cmd: '/claim',                   opis: 'Przejmij ticket — przypisz go do siebie',             uprawnienia: 'Staff',      kategoria: 'Staff' },
      { cmd: '/release',                 opis: 'Zwolnij przejęty ticket z powrotem do puli',          uprawnienia: 'Staff',      kategoria: 'Staff' },
      { cmd: '/close (powód) (po czasie)', opis: 'Zleć zamknięcie ticketu (może wymagać zgody gracza)', uprawnienia: 'Staff',   kategoria: 'Staff' },
      { cmd: '/force-close (ticket) (pow)', opis: 'Natychmiastowe zamknięcie bez prośby o zgodę',    uprawnienia: 'Staff',      kategoria: 'Staff' },
      { cmd: '/priority [poziom]',       opis: 'Ustaw priorytet ticketu: 🔴 Wysoki / 🟠 Średni / 🟢 Niski', uprawnienia: 'Staff', kategoria: 'Staff' },
      { cmd: '/transcript',              opis: 'Eksportuj rozmowę z ticketu jako plik markdown/HTML', uprawnienia: 'Staff',      kategoria: 'Staff' },
      // Admin
      { cmd: '/addadmin @gracz',         opis: 'Nadaj pełny dostęp admina do bota (panel, konfiguracja)', uprawnienia: 'Owner',  kategoria: 'Admin' },
      { cmd: '/addsupport @gracz/rola',  opis: 'Dodaj gracza/rolę do domyślnego zespołu wsparcia',   uprawnienia: 'Admin',      kategoria: 'Admin' },
      { cmd: '/language [kod]',          opis: 'Ustaw język bota (pl, en, de i 20+ innych)',          uprawnienia: 'Admin',      kategoria: 'Admin' },
      { cmd: 'dashboard.ticketsbot.net', opis: 'Panel webowy — konfiguracja paneli, kategorii, formularzy, auto-close, wiadomości, logi', uprawnienia: 'Admin+', kategoria: 'Admin' },
      // Context Menu
      { cmd: 'PPM wiadomość → Utwórz ticket z wiadomości', opis: 'Tworzy ticket odnoszący się do konkretnej wiadomości (np. do zgłoszeń)', uprawnienia: 'Staff', kategoria: 'Context Menu' },
      { cmd: 'PPM wiadomość → Przypnij wiadomość', opis: 'Przypina wiadomość w tickecie bez uprawnień Manage Messages', uprawnienia: 'Staff', kategoria: 'Context Menu' },
      { cmd: 'PPM gracz → Utwórz ticket dla gracza', opis: 'Wysyła graczowi zaproszenie do stworzenia ticketu przez przycisk', uprawnienia: 'Staff', kategoria: 'Context Menu' },
    ],
  },

  // ── RMF MAXX ──────────────────────────────────────────────────────────────
  {
    name: 'RMF MAXX',
    emoji: '📻',
    opis: '24/7 radio internetowe na kanale głosowym serwera. Odtwarza automatycznie stream RMF MAXX.',
    color: '#dc2626',
    status: 'aktywny',
    kategorie: ['Radio'],
    komendy: [
      { cmd: '(automatyczny)',     opis: 'Bot dołącza do kanału głosowego i odtwarza radio automatycznie 24/7', uprawnienia: 'Automatycznie', kategoria: 'Radio' },
      { cmd: 'Zmiana kanału',      opis: 'Administracja może przenieść bota do innego kanału głosowego przez Discord', uprawnienia: 'Admin+', kategoria: 'Radio' },
    ],
  },

  // ── STARTIT ───────────────────────────────────────────────────────────────
  {
    name: 'StartIT',
    emoji: '🚀',
    opis: 'Bot konfiguracyjny serwera. Weryfikacja graczy, role-picker, wiadomości powitalne, konfiguracja.',
    invite: 'https://startit.bot',
    color: '#7c3aed',
    status: 'aktywny',
    kategorie: ['Konfiguracja', 'Weryfikacja', 'Ogólne'],
    komendy: [
      { cmd: '/setup',             opis: 'Interaktywna konfiguracja serwera krok po kroku',       uprawnienia: 'Admin+',     kategoria: 'Konfiguracja' },
      { cmd: '/verify',            opis: 'System weryfikacji graczy (CAPTCHA/reakcja/przycisk)',   uprawnienia: 'Admin+',     kategoria: 'Weryfikacja' },
      { cmd: '/welcome',           opis: 'Konfiguracja wiadomości powitalnych',                    uprawnienia: 'Admin+',     kategoria: 'Konfiguracja' },
      { cmd: '/roles',             opis: 'Role-picker — gracze mogą wybierać role przez reakcje',  uprawnienia: 'Admin+',     kategoria: 'Konfiguracja' },
      { cmd: '/autorole',          opis: 'Automatyczne nadawanie roli nowym graczom',              uprawnienia: 'Admin+',     kategoria: 'Konfiguracja' },
      { cmd: '/logs',              opis: 'Konfiguracja logów serwera (dołączenia, wyjścia, zmiany)', uprawnienia: 'Admin+',   kategoria: 'Konfiguracja' },
      { cmd: '/help',              opis: 'Lista komend StartIT',                                   uprawnienia: 'Wszyscy',    kategoria: 'Ogólne' },
    ],
  },

  // ── FRESHTOK ──────────────────────────────────────────────────────────────
  {
    name: 'FreshTok',
    emoji: '📱',
    opis: 'Powiadomienia z TikToka. Automatycznie wysyła nowe filmy z obserwowanych kont TikTok na wskazany kanał.',
    color: '#000000',
    status: 'aktywny',
    kategorie: ['Powiadomienia', 'Konfiguracja'],
    komendy: [
      { cmd: '/track [użytkownik TikTok]', opis: 'Śledź konto TikTok i otrzymuj powiadomienia',   uprawnienia: 'Admin+',     kategoria: 'Powiadomienia' },
      { cmd: '/untrack [użytkownik]',       opis: 'Przestań śledzić konto TikTok',                 uprawnienia: 'Admin+',     kategoria: 'Konfiguracja' },
      { cmd: '/list',                       opis: 'Pokaż listę śledzonych kont TikTok',            uprawnienia: 'Admin+',     kategoria: 'Powiadomienia' },
      { cmd: '/channel [#kanał]',           opis: 'Ustaw kanał na powiadomienia TikTok',           uprawnienia: 'Admin+',     kategoria: 'Konfiguracja' },
      { cmd: '/message [szablon]',          opis: 'Dostosuj treść wiadomości powiadomienia',       uprawnienia: 'Admin+',     kategoria: 'Konfiguracja' },
      { cmd: '/help',                       opis: 'Pomoc FreshTok',                                uprawnienia: 'Wszyscy',    kategoria: 'Konfiguracja' },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const PERM_COLORS: Record<string, string> = {
  'Wszyscy':      'bg-green-500/20 text-green-300',
  'Helper+':      'bg-yellow-500/20 text-yellow-300',
  'Staff+':       'bg-yellow-500/20 text-yellow-300',
  'Moderator+':   'bg-orange-500/20 text-orange-300',
  'Admin+':       'bg-red-500/20 text-red-300',
  'Admin':        'bg-red-500/20 text-red-300',
  'Automatycznie':'bg-blue-500/20 text-blue-300',
};

const BOT_COLORS: Record<string, string> = {
  '#5865F2': 'border-indigo-500/40 bg-indigo-500/5',
  '#f59e0b': 'border-yellow-500/40 bg-yellow-500/5',
  '#f43f5e': 'border-pink-500/40 bg-pink-500/5',
  '#06b6d4': 'border-cyan-500/40 bg-cyan-500/5',
  '#dc2626': 'border-red-500/40 bg-red-500/5',
  '#7c3aed': 'border-purple-500/40 bg-purple-500/5',
  '#000000': 'border-gray-600/40 bg-gray-600/5',
};

export default async function BotyPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.STAFF) redirect('/dashboard');

  const totalCmds = BOTY.reduce((sum, bot) => sum + bot.komendy.length, 0);

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0d1021] px-6 py-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          🤖 Boty Zewnętrzne
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Pełna lista komend zewnętrznych botów serwera AURORA Greenville RP — łącznie {totalCmds} komend
        </p>
      </div>

      {/* Stats */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex flex-wrap gap-4">
          {BOTY.map(bot => (
            <a
              key={bot.name}
              href={`#bot-${bot.name.replace(/[^a-zA-Z0-9]/g, '_')}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors hover:opacity-80 ${BOT_COLORS[bot.color] ?? 'border-white/10 bg-white/5'}`}
            >
              <span>{bot.emoji}</span>
              <span className="text-white">{bot.name}</span>
              <span className="text-gray-400 text-xs">{bot.komendy.length} komend</span>
              <span className={`w-2 h-2 rounded-full ${bot.status === 'aktywny' ? 'bg-green-400' : 'bg-gray-500'}`} />
            </a>
          ))}
        </div>
      </div>

      {/* Bot sections */}
      <div className="p-6 space-y-10">
        {BOTY.map(bot => {
          const byCategory = bot.komendy.reduce((acc, cmd) => {
            if (!acc[cmd.kategoria]) acc[cmd.kategoria] = [];
            acc[cmd.kategoria].push(cmd);
            return acc;
          }, {} as Record<string, BotCommand[]>);

          return (
            <section
              key={bot.name}
              id={`bot-${bot.name.replace(/[^a-zA-Z0-9]/g, '_')}`}
              className={`rounded-2xl border p-6 scroll-mt-6 ${BOT_COLORS[bot.color] ?? 'border-white/10 bg-white/5'}`}
            >
              {/* Bot header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{bot.emoji}</div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-white">{bot.name}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        bot.status === 'aktywny' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {bot.status === 'aktywny' ? '● Aktywny' : '○ Nieaktywny'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1 max-w-2xl">{bot.opis}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {bot.prefix && (
                        <span className="text-xs text-gray-500">Prefix: <code className="text-gray-300 bg-black/30 px-1 rounded">{bot.prefix}</code></span>
                      )}
                      {bot.invite && (
                        <a href={bot.invite} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                          🔗 Zaproś bota
                        </a>
                      )}
                      <span className="text-xs text-gray-500">{bot.komendy.length} komend</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commands by category */}
              <div className="space-y-6">
                {Object.entries(byCategory).map(([category, cmds]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-6 h-px bg-gray-600 inline-block" />
                      {category}
                      <span className="w-px h-3 bg-gray-600 inline-block" />
                      <span className="text-gray-600 normal-case tracking-normal">{cmds.length}</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left text-xs text-gray-500 font-medium pb-2 pr-4 w-64">Komenda</th>
                            <th className="text-left text-xs text-gray-500 font-medium pb-2 pr-4">Opis</th>
                            <th className="text-left text-xs text-gray-500 font-medium pb-2 w-32">Uprawnienia</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {cmds.map((cmd, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors">
                              <td className="py-2 pr-4 font-mono">
                                <code className="text-blue-300 text-xs bg-blue-500/10 px-2 py-0.5 rounded whitespace-nowrap">
                                  {cmd.cmd}
                                </code>
                              </td>
                              <td className="py-2 pr-4 text-gray-300 text-xs">
                                {cmd.opis}
                                {cmd.przyklad && (
                                  <div className="mt-1">
                                    <span className="text-gray-500">Przykład: </span>
                                    <code className="text-green-400 text-xs">{cmd.przyklad}</code>
                                  </div>
                                )}
                              </td>
                              <td className="py-2">
                                {cmd.uprawnienia && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${PERM_COLORS[cmd.uprawnienia] ?? 'bg-gray-500/20 text-gray-300'}`}>
                                    {cmd.uprawnienia}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
