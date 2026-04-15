'use client';

import { useState } from 'react';
import { Settings } from '@prisma/client';

type Tab = 'ogolne' | 'kanaly' | 'role' | 'tickety' | 'quiz' | 'rp' | 'warny' | 'regulamin' | 'embedy' | 'cad' | 'boty';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'ogolne',    label: 'Ogólne',     icon: '🌐' },
  { id: 'kanaly',    label: 'Kanały',     icon: '📢' },
  { id: 'role',      label: 'Role',       icon: '🏷️' },
  { id: 'tickety',   label: 'Tickety',    icon: '🎫' },
  { id: 'quiz',      label: 'Quiz/Weryfik.', icon: '✅' },
  { id: 'rp',        label: 'Zasady RP',  icon: '🚓' },
  { id: 'warny',     label: 'Warny/Kary', icon: '⚠️' },
  { id: 'regulamin', label: 'Regulamin',  icon: '📋' },
  { id: 'embedy',    label: 'Embedy',     icon: '🎨' },
  { id: 'cad',       label: 'CAD',        icon: '🚔' },
  { id: 'boty',      label: 'Zewn. Boty', icon: '🤖' },
];

interface Props { initialSettings: Settings; }

export function SettingsForm({ initialSettings }: Props) {
  const [tab, setTab] = useState<Tab>('ogolne');
  const [s, setS] = useState<Settings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [regulaminSaving, setRegulaminSaving] = useState(false);
  const [regulaminMsg, setRegulaminMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (k: keyof Settings, v: unknown) => setS(prev => ({ ...prev, [k]: v }));

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s),
      });
      const data = await res.json();
      if (res.ok) setMsg({ ok: true, text: '✅ Zapisano ustawienia!' });
      else setMsg({ ok: false, text: `❌ ${data.error ?? 'Błąd zapisu'}` });
    } catch {
      setMsg({ ok: false, text: '❌ Błąd sieci' });
    } finally {
      setSaving(false);
    }
  }

  async function saveRegulamin() {
    setRegulaminSaving(true);
    setRegulaminMsg(null);
    try {
      const res = await fetch('/api/regulamin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: s.regulaminText,
          channelId: s.regulaminChannelId,
          messageId: s.regulaminMessageId,
          color: s.embedColor,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.discord?.messageId) set('regulaminMessageId', data.discord.messageId);
        setRegulaminMsg({
          ok: true,
          text: data.discord?.sent
            ? `✅ Zapisano i wysłano na Discord! (ID: ${data.discord.messageId})`
            : `💾 Zapisano tekst. ${data.discord?.reason ?? data.discord?.error ?? ''}`,
        });
      } else {
        setRegulaminMsg({ ok: false, text: `❌ ${data.error}` });
      }
    } catch {
      setRegulaminMsg({ ok: false, text: '❌ Błąd sieci' });
    } finally {
      setRegulaminSaving(false);
    }
  }

  const Input = ({ label, field, type = 'text', placeholder = '' }: {
    label: string; field: keyof Settings; type?: string; placeholder?: string;
  }) => (
    <div className="space-y-1">
      <label className="text-xs text-white/60 font-medium uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={String(s[field] ?? '')}
        onChange={e => set(field, type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
      />
    </div>
  );

  const Toggle = ({ label, field, desc }: { label: string; field: keyof Settings; desc?: string }) => (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
      <div>
        <div className="text-sm text-white font-medium">{label}</div>
        {desc && <div className="text-xs text-white/40 mt-0.5">{desc}</div>}
      </div>
      <button
        onClick={() => set(field, !s[field])}
        className={`relative w-11 h-6 rounded-full transition-colors ${s[field] ? 'bg-blue-600' : 'bg-white/20'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${s[field] ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );

  const Grid = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  );

  return (
    <div className="space-y-4">
      {/* Tab nav */}
      <div className="flex flex-wrap gap-1 bg-black/20 p-1 rounded-xl border border-white/10">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === t.id
                ? 'bg-blue-600 text-white shadow'
                : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Ogólne ── */}
      {tab === 'ogolne' && (
        <div className="space-y-4">
          <Section title="Serwer Discord">
            <Grid>
              <Input label="ID Serwera Discord" field="guildId" placeholder="1487482322742804610" />
              <Input label="ID Grupy Roblox" field="robloxGroupId" placeholder="12345678" />
            </Grid>
            <Input label="Opis serwera (na stronie głównej)" field="serverDescription" placeholder="Oficjalny serwer GreenvilleRP..." />
          </Section>
          <Section title="Tryb Konserwacji">
            <Toggle label="Tryb konserwacji" field="maintenanceMode" desc="Zablokuje dostęp do panelu dla non-owner" />
            <Input label="Wiadomość konserwacji" field="maintenanceMessage" placeholder="Przerwa techniczna. Wrócimy wkrótce!" />
          </Section>
          <Section title="Radio / CAD">
            <Input label="URL Radio (YouTube/stream)" field="radioUrl" placeholder="https://youtube.com/watch?v=..." />
          </Section>
        </div>
      )}

      {/* ── Kanały ── */}
      {tab === 'kanaly' && (
        <div className="space-y-4">
          <p className="text-xs text-white/40">Wpisz ID kanału Discord (prawy klik → Kopiuj ID)</p>
          <Section title="Kanały systemowe">
            <Grid>
              <Input label="📝 Kanał Audit Log" field="auditLogChannelId" placeholder="ID kanału #logi-moderacji" />
              <Input label="👋 Kanał Powitania" field="welcomeChannelId" placeholder="ID kanału #powitania" />
              <Input label="📢 Kanał Ogłoszeń" field="ogloszeniaChanelId" placeholder="ID kanału #ogloszenia" />
              <Input label="💬 Kanał Chat Ogólny" field="ogolneChatChannelId" placeholder="ID kanału #rozmowy" />
            </Grid>
          </Section>
          <Section title="Kanały Embedów">
            <Grid>
              <Input label="✅ Kanał Zacznij Tutaj" field="zacznijTutajChannelId" placeholder="ID kanału #zacznij-tutaj" />
              <Input label="📋 Kanał Regulamin" field="regulaminChannelId" placeholder="ID kanału #regulamin" />
            </Grid>
          </Section>
        </div>
      )}

      {/* ── Role ── */}
      {tab === 'role' && (
        <div className="space-y-4">
          <p className="text-xs text-white/40">Wpisz ID roli Discord (prawy klik na rolę → Kopiuj ID)</p>
          <Section title="Role Administracyjne">
            <Grid>
              <Input label="👑 Owner" field="roleOwner" placeholder="ID roli Owner" />
              <Input label="🔱 Co-Owner" field="roleCoOwner" placeholder="ID roli Co-Owner" />
              <Input label="🛡️ Administrator" field="roleAdmin" placeholder="ID roli Administrator" />
              <Input label="⚔️ Moderator" field="roleMod" placeholder="ID roli Moderator" />
              <Input label="🤝 Helper" field="roleHelper" placeholder="ID roli Helper" />
              <Input label="📊 HR" field="roleHR" placeholder="ID roli HR" />
              <Input label="🎯 Host" field="roleHost" placeholder="ID roli Host" />
            </Grid>
          </Section>
          <Section title="Role Służb">
            <Grid>
              <Input label="🚓 Policja" field="rolePolicja" placeholder="ID roli Policja" />
              <Input label="🚑 EMS" field="roleEMS" placeholder="ID roli EMS" />
              <Input label="🚒 Straż Pożarna" field="roleStraz" placeholder="ID roli Straż Pożarna" />
              <Input label="🛣️ DOT" field="roleDOT" placeholder="ID roli DOT" />
            </Grid>
          </Section>
          <Section title="Role Ogólne">
            <Grid>
              <Input label="🏠 Mieszkaniec" field="roleMieszkaniec" placeholder="1487555467302539368" />
              <Input label="💎 Nitro Booster" field="roleNitroBooster" placeholder="ID roli Nitro Booster" />
              <Input label="💜 Wspierający" field="roleWspierajacy" placeholder="ID roli Wspierający" />
            </Grid>
          </Section>
        </div>
      )}

      {/* ── Tickety ── */}
      {tab === 'tickety' && (
        <div className="space-y-4">
          <Section title="Kanały Ticketów">
            <Grid>
              <Input label="🎫 Kanał z embedem ticket" field="ticketEmbedChannelId" placeholder="ID kanału #otworz-ticket" />
              <Input label="📝 Kanał Logów Ticketów" field="ticketLogsChannelId" placeholder="ID kanału #tickety-log" />
            </Grid>
            <div className="space-y-1">
              <label className="text-xs text-white/60 font-medium uppercase tracking-wide">📁 Kategoria Ticketów</label>
              <input
                type="text"
                value={String(s.ticketCategoryId ?? '')}
                onChange={e => set('ticketCategoryId', e.target.value)}
                placeholder="ID kategorii gdzie tworzą się kanały ticketów"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
              />
              <p className="text-xs text-white/30">Prawy klik na kategorię → Kopiuj ID</p>
            </div>
          </Section>
          <Section title="Role do Ticketów">
            <Grid>
              <Input label="👮 Rola Admin Ticketów (zarządzanie)" field="ticketAdminRoleId" placeholder="ID roli do zarządzania" />
              <Input label="🔔 Rola Ping przy nowym tickecie" field="ticketPingRoleId" placeholder="ID roli do pingowania" />
            </Grid>
          </Section>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-300">
            <strong>💡 Jak skonfigurować:</strong> Po zapisaniu ustawień użyj komendy <code className="bg-black/30 px-1 rounded">/setup-embeds</code> na Discordzie, żeby bot wysłał embed z przyciskiem otwierania ticketu do skonfigurowanego kanału.
          </div>
        </div>
      )}

      {/* ── Quiz ── */}
      {tab === 'quiz' && (
        <div className="space-y-4">
          <Section title="Parametry Quizu Weryfikacji">
            <Grid>
              <Input label="Minimalna liczba punktów (próg)" field="quizPassScore" type="number" />
              <Input label="Łączna liczba pytań" field="quizTotalQuestions" type="number" />
              <Input label="Cooldown między próbami (godz.)" field="quizCooldownHours" type="number" />
            </Grid>
          </Section>
          <Section title="Pojazdy (limity)">
            <Grid>
              <Input label="Pojazdy — Mieszkaniec (baza)" field="maxVehiclesBase" type="number" />
              <Input label="Pojazdy — Wspierający" field="maxVehiclesSupporter" type="number" />
              <Input label="Pojazdy — Nitro Booster" field="maxVehiclesBooster" type="number" />
            </Grid>
          </Section>
        </div>
      )}

      {/* ── RP Zasady ── */}
      {tab === 'rp' && (
        <div className="space-y-4">
          <Section title="Limity RP">
            <Grid>
              <Input label="Limit prędkości FRP (km/h)" field="frpSpeedLimit" type="number" />
              <Input label="Max aktywnych mandatów" field="maxMandaty" type="number" />
              <Input label="Max aktywnych grzywien" field="maxGrzywny" type="number" />
              <Input label="Max aktywnych aresztów" field="maxAreszty" type="number" />
              <Input label="Czas zawieszenia prawa jazdy (dni)" field="licenseSuspensionDays" type="number" />
            </Grid>
          </Section>
        </div>
      )}

      {/* ── Warny ── */}
      {tab === 'warny' && (
        <div className="space-y-4">
          <Section title="Auto-kary za Warny">
            <Grid>
              <Input label="Warnów do auto-mute" field="warnAutoMuteCount" type="number" />
              <Input label="Warnów do auto-bana" field="warnAutoBanCount" type="number" />
            </Grid>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-300">
              ⚠️ Po przekroczeniu progu bot automatycznie nałoży karę na użytkownika przez Discord API.
            </div>
          </Section>
        </div>
      )}

      {/* ── Regulamin ── */}
      {tab === 'regulamin' && (
        <div className="space-y-4">
          <Section title="Edytor Regulaminu">
            <p className="text-xs text-white/50">
              Edytuj treść regulaminu. Po kliknięciu &quot;Wyślij na Discord&quot; bot zaktualizuje embed w kanale #regulamin.
              Puste linie oddzielają sekcje (każda staje się osobnym polem embeda).
            </p>
            <textarea
              value={s.regulaminText ?? ''}
              onChange={e => set('regulaminText', e.target.value)}
              rows={20}
              placeholder={`📋 Regulamin Serwera Greenville RP\nWitaj! Zanim zaczniesz, zapoznaj się z regulaminem.\n\n§1 Zasady Ogólne\n1. Szanuj innych graczy.\n2. Zakaz spamu i reklam.\n\n§2 RolePlay\n1. Zawsze zachowuj klimat RP.\n2. Nie używaj wiedzy OOC w grze.\n\n§3 Służby\n1. Służby działają według swoich regulaminów wewnętrznych.`}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 font-mono resize-y"
            />
          </Section>
          <Section title="Konfiguracja Discord">
            <Grid>
              <Input label="ID kanału #regulamin" field="regulaminChannelId" placeholder="Skopiuj z zakładki Kanały" />
              <Input label="ID istniejącej wiadomości (opcjonalnie)" field="regulaminMessageId" placeholder="Zostaw puste żeby wysłać nową" />
            </Grid>
          </Section>

          {regulaminMsg && (
            <div className={`p-3 rounded-lg text-sm ${regulaminMsg.ok ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
              {regulaminMsg.text}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={saveRegulamin}
              disabled={regulaminSaving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
            >
              {regulaminSaving ? '⏳ Wysyłanie...' : '📤 Zapisz i wyślij na Discord'}
            </button>
          </div>
        </div>
      )}

      {/* ── Embedy ── */}
      {tab === 'embedy' && (
        <div className="space-y-4">
          <Section title="Styl Embedów">
            <div className="space-y-1">
              <label className="text-xs text-white/60 font-medium uppercase tracking-wide">🎨 Kolor Embedów (HEX)</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={s.embedColor ?? '#5865F2'}
                  onChange={e => set('embedColor', e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={s.embedColor ?? '#5865F2'}
                  onChange={e => set('embedColor', e.target.value)}
                  placeholder="#5865F2"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          </Section>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-300 space-y-2">
            <strong>📌 Embedy bota:</strong>
            <ul className="list-disc list-inside space-y-1 text-xs text-blue-200/80">
              <li>Użyj <code className="bg-black/30 px-1 rounded">/setup-embeds</code> na Discordzie żeby wysłać wszystkie embedy</li>
              <li>Embed regulaminu — zakładka &quot;Regulamin&quot; powyżej</li>
              <li>Embed ticketów — kanał konfigurowany w zakładce &quot;Tickety&quot;</li>
              <li>Embed weryfikacji — kanał #zacznij-tutaj w zakładce &quot;Kanały&quot;</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── CAD ── */}
      {tab === 'cad' && (
        <div className="space-y-4">
          <Section title="Konfiguracja CAD">
            <Toggle
              label="Włącz CAD"
              value={(s as unknown as Record<string, unknown>).cadEnabled as boolean ?? true}
              onChange={v => set('cadEnabled' as keyof typeof s, v)}
            />
            <Toggle
              label="Dostęp cywilów do CAD (proximity chat + mapa + emergency call)"
              value={(s as unknown as Record<string, unknown>).cadAllowCivilians as boolean ?? true}
              onChange={v => set('cadAllowCivilians' as keyof typeof s, v)}
            />
            <Toggle
              label="Włącz Proximity Chat"
              value={(s as unknown as Record<string, unknown>).cadProximityChatEnabled as boolean ?? true}
              onChange={v => set('cadProximityChatEnabled' as keyof typeof s, v)}
            />
          </Section>
          <Section title="Mapa">
            <Input
              label="URL obrazka mapy"
              hint="Wklej URL do obrazka mapy Greenville (PNG/JPG). Będzie wyświetlany w zakładce Mapa CAD."
              value={(s as unknown as Record<string, unknown>).cadMapImageUrl as string ?? ''}
              onChange={v => set('cadMapImageUrl' as keyof typeof s, v)}
              placeholder="https://..."
            />
          </Section>
          <Section title="Proximity Chat">
            <Input
              label="TTL wiadomości (minuty)"
              hint="Po ilu minutach wiadomości proximity chat wygasają (domyślnie 60)"
              value={String((s as unknown as Record<string, unknown>).cadProximityTtlMinutes ?? 60)}
              onChange={v => set('cadProximityTtlMinutes' as keyof typeof s, parseInt(v) || 60)}
              placeholder="60"
              type="number"
            />
            <Input
              label="Kanał Discord — zgłoszenia od cywilów"
              hint="ID kanału, na który trafiają zgłoszenia od cywilów (Emergency Call)"
              value={(s as unknown as Record<string, unknown>).cadEmergencyCallChannelId as string ?? ''}
              onChange={v => set('cadEmergencyCallChannelId' as keyof typeof s, v)}
              placeholder="ID kanału Discord..."
            />
          </Section>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-300 space-y-2">
            <strong>📌 Zarządzanie lokacjami Proximity Chat:</strong>
            <p className="text-xs text-blue-200/80">
              Lokacje proximity chat zarządzasz w: <a href="/dashboard/czat-proximity" className="underline hover:text-blue-200">Dashboard → Czat Proximity</a>
            </p>
          </div>
        </div>
      )}

      {/* ── Zewnętrzne Boty ── */}
      {tab === 'boty' && (
        <div className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-300">
            <strong>🤖 Zewnętrzne boty na serwerze</strong>
            <p className="text-xs text-yellow-200/80 mt-1">Boty skonfigurowane w server-config.json → sekcja external_bots</p>
          </div>

          {[
            { name: 'Dyno', prefix: '?', purpose: 'Automoderation, logi aktywności, antyspam', invite: 'https://dyno.gg', features: 'automod, modlog, autorole, customcommands' },
            { name: 'FreshTok', purpose: 'Powiadomienia TikTok → kanał ogłoszeń', features: 'tiktok_notifications' },
            { name: 'GiveawayBot', prefix: 'g!', purpose: 'Organizacja konkursów i giveaway', invite: 'https://giveawaybot.party', features: 'giveaways, reroll, winners_dm' },
            { name: 'Pancake (Nalesnior)', prefix: 'p!', purpose: 'Muzyka i moderacja', invite: 'https://pancake.gg', features: 'music, moderation, fun' },
            { name: 'RMF MAXX', purpose: '24/7 muzyka w kanale głosowym', features: 'radio_stream' },
            { name: 'StartIT', purpose: 'Weryfikacja i konfiguracja serwera', invite: 'https://startit.bot', features: 'verification, welcome, setup' },
            { name: 'Tickets v2', prefix: '/help', purpose: 'System ticketów — transcripts, kategorie', features: 'tickets, transcripts, staff_roles' },
          ].map(bot => (
            <div key={bot.name} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-sm text-white">{bot.name}</div>
                {bot.invite && (
                  <a href={bot.invite} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline">
                    Zaproś ↗
                  </a>
                )}
              </div>
              <div className="text-xs text-white/60 mb-1">{bot.purpose}</div>
              {bot.prefix && <div className="text-[10px] text-white/30">Prefix: <code className="bg-black/20 px-1 rounded">{bot.prefix}</code></div>}
              <div className="text-[10px] text-white/20 mt-1">Funkcje: {bot.features}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Zapis ── */}
      {tab !== 'regulamin' && (
        <div className="flex items-center gap-4">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            {saving ? '⏳ Zapisywanie...' : '💾 Zapisz Ustawienia'}
          </button>
          {msg && (
            <span className={`text-sm font-medium ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>
              {msg.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
