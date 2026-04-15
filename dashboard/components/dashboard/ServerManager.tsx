'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  Hash, Volume2, Folder, Megaphone, AlertCircle, RefreshCw,
  Plus, Pencil, Trash2, X, Check, ChevronRight, ChevronDown,
  Settings, Users, Radio, Shield, Upload, Terminal, Link2, Ban, Globe,
  Zap, Lock,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  position: number;
  parent_id: string | null;
  topic: string | null;
  nsfw: boolean;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
  permission_overwrites?: PermissionOverwrite[];
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  permissions: string;
  position: number;
  managed: boolean;
}

interface DiscordGuild {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  approximate_member_count: number;
  approximate_presence_count: number;
  verification_level: number;
  default_message_notifications: number;
  afk_channel_id: string | null;
  afk_timeout: number;
  preferred_locale: string;
  features?: string[];
  rules_channel_id?: string | null;
  public_updates_channel_id?: string | null;
  explicit_content_filter?: number;
  system_channel_id?: string | null;
}

interface PermissionOverwrite {
  id: string;
  type: number;
  allow: string;
  deny: string;
}

interface DiscordWebhook {
  id: string;
  type: number;
  guild_id: string;
  channel_id: string;
  name: string;
  avatar: string | null;
  token?: string;
  url?: string;
}

interface DiscordBan {
  reason: string | null;
  user: {
    id: string;
    username: string;
    avatar: string | null;
    discriminator: string;
  };
}

// ─── Permission Flags ────────────────────────────────────────────────────────

const PERM = {
  ADMINISTRATOR: 1n << 3n,
  VIEW_CHANNEL: 1n << 10n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_ROLES: 1n << 28n,
  VIEW_AUDIT_LOG: 1n << 7n,
  MANAGE_WEBHOOKS: 1n << 29n,
  MANAGE_GUILD: 1n << 5n,
  CREATE_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  CHANGE_NICKNAME: 1n << 26n,
  MANAGE_NICKNAMES: 1n << 27n,
  MODERATE_MEMBERS: 1n << 40n,
  SEND_MESSAGES: 1n << 11n,
  SEND_TTS: 1n << 12n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  ADD_REACTIONS: 1n << 6n,
  USE_APPLICATION_COMMANDS: 1n << 31n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  VIDEO: 1n << 9n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,
  USE_VAD: 1n << 25n,
  PRIORITY_SPEAKER: 1n << 8n,
};

const PERM_GROUPS: Array<{ label: string; perms: Array<{ key: keyof typeof PERM; label: string; desc: string }> }> = [
  {
    label: 'Ogólne',
    perms: [
      { key: 'ADMINISTRATOR', label: 'Administrator', desc: 'Nadaje wszystkie uprawnienia, ignoruje ograniczenia kanałów' },
      { key: 'VIEW_CHANNEL', label: 'Wyświetlaj kanały', desc: 'Pozwala widzieć kanały' },
      { key: 'MANAGE_CHANNELS', label: 'Zarządzaj kanałami', desc: 'Tworzenie, edycja i usuwanie kanałów' },
      { key: 'MANAGE_ROLES', label: 'Zarządzaj rolami', desc: 'Tworzenie i edycja ról niższych w hierarchii' },
      { key: 'VIEW_AUDIT_LOG', label: 'Wyświetlaj log audytu', desc: 'Pełny log akcji na serwerze' },
      { key: 'MANAGE_WEBHOOKS', label: 'Zarządzaj webhookami', desc: 'Tworzenie i usuwanie webhooków' },
      { key: 'MANAGE_GUILD', label: 'Zarządzaj serwerem', desc: 'Zmiana nazwy, ikony i innych ustawień serwera' },
    ],
  },
  {
    label: 'Członkowie',
    perms: [
      { key: 'CREATE_INVITE', label: 'Twórz zaproszenia', desc: 'Tworzenie linków zapraszających na serwer' },
      { key: 'KICK_MEMBERS', label: 'Wyrzucaj członków', desc: 'Kick użytkowników z serwera' },
      { key: 'BAN_MEMBERS', label: 'Banuj członków', desc: 'Permamentne zbanowanie użytkownika' },
      { key: 'CHANGE_NICKNAME', label: 'Zmień pseudonim', desc: 'Zmiana własnego pseudonimu' },
      { key: 'MANAGE_NICKNAMES', label: 'Zarządzaj pseudonimami', desc: 'Zmiana pseudonimów innych użytkowników' },
      { key: 'MODERATE_MEMBERS', label: 'Timeout członków', desc: 'Nakładanie timeoutów na użytkowników' },
    ],
  },
  {
    label: 'Wiadomości',
    perms: [
      { key: 'SEND_MESSAGES', label: 'Wysyłaj wiadomości', desc: 'Pisanie na kanałach tekstowych' },
      { key: 'MANAGE_MESSAGES', label: 'Zarządzaj wiadomościami', desc: 'Usuwanie i przypinanie wiadomości' },
      { key: 'EMBED_LINKS', label: 'Osadzaj linki', desc: 'Linki wyświetlają się jako preview' },
      { key: 'ATTACH_FILES', label: 'Załączaj pliki', desc: 'Wysyłanie plików i obrazów' },
      { key: 'READ_MESSAGE_HISTORY', label: 'Czytaj historię', desc: 'Przeglądanie starszych wiadomości' },
      { key: 'MENTION_EVERYONE', label: 'Wzmiankuj @everyone', desc: 'Powiadamianie wszystkich memberów' },
      { key: 'USE_EXTERNAL_EMOJIS', label: 'Zewnętrzne emoji', desc: 'Użycie emoji z innych serwerów' },
      { key: 'ADD_REACTIONS', label: 'Dodawaj reakcje', desc: 'Reagowanie emotikonami na wiadomości' },
      { key: 'USE_APPLICATION_COMMANDS', label: 'Komendy aplikacji', desc: 'Używanie komend slash (/komenda)' },
      { key: 'SEND_TTS', label: 'Wiadomości TTS', desc: 'Wysyłanie wiadomości text-to-speech' },
    ],
  },
  {
    label: 'Głosowe',
    perms: [
      { key: 'CONNECT', label: 'Połącz', desc: 'Dołączanie do kanałów głosowych' },
      { key: 'SPEAK', label: 'Mów', desc: 'Mówienie na kanałach głosowych' },
      { key: 'VIDEO', label: 'Wideo', desc: 'Przesyłanie obrazu z kamery' },
      { key: 'MUTE_MEMBERS', label: 'Wyciszaj członków', desc: 'Wymuszanie wyciszenia innych' },
      { key: 'DEAFEN_MEMBERS', label: 'Ogłuszaj członków', desc: 'Wymuszanie ogłuszenia innych' },
      { key: 'MOVE_MEMBERS', label: 'Przenoś członków', desc: 'Przenoszenie między kanałami głosowymi' },
      { key: 'USE_VAD', label: 'Wykrywanie głosu', desc: 'Użycie voice activity detection zamiast push-to-talk' },
      { key: 'PRIORITY_SPEAKER', label: 'Priorytetowy mówca', desc: 'Ściszanie innych gdy mówisz' },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHANNEL_ICON: Record<number, React.ReactNode> = {
  0: <Hash className="w-3.5 h-3.5" />,
  2: <Volume2 className="w-3.5 h-3.5" />,
  4: <Folder className="w-3.5 h-3.5" />,
  5: <Megaphone className="w-3.5 h-3.5" />,
  13: <Radio className="w-3.5 h-3.5" />,
  15: <Hash className="w-3.5 h-3.5" />,
};

const CHANNEL_TYPE_LABEL: Record<number, string> = {
  0: 'Tekst',
  2: 'Głosowy',
  4: 'Kategoria',
  5: 'Ogłoszenia',
  13: 'Stage',
  15: 'Forum',
};

const VERIFICATION_LEVELS = ['Brak', 'Niski', 'Średni', 'Wysoki', 'Najwyższy'];
const AFK_TIMEOUTS = [60, 300, 900, 1800, 3600];

function intToHex(n: number): string {
  if (!n) return '#000000';
  return '#' + n.toString(16).padStart(6, '0');
}

function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

function iconUrl(guild: DiscordGuild): string | null {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
}

function userAvatarUrl(userId: string, avatar: string | null): string {
  if (!avatar) return `https://cdn.discordapp.com/embed/avatars/0.png`;
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=40`;
}

function hasPerm(permBigInt: bigint, perm: bigint): boolean {
  return (permBigInt & perm) === perm;
}

function togglePerm(permBigInt: bigint, perm: bigint): bigint {
  return permBigInt ^ perm;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ErrorBanner({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-3 text-sm text-red-400">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{msg}</span>
      <button onClick={onDismiss} className="text-red-400/60 hover:text-red-400">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function SuccessBanner({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/25 rounded-lg px-4 py-3 text-sm text-green-400">
      <Check className="w-4 h-4 shrink-0" />
      <span className="flex-1">{msg}</span>
      <button onClick={onDismiss} className="text-green-400/60 hover:text-green-400">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function SidebarItem({
  id,
  label,
  icon,
  active,
  onClick,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className="w-5 h-5">{icon}</div>
      <span>{label}</span>
    </button>
  );
}

// ─── Section: PRZEGLĄD ─────────────────────────────────────────────────────

function PrzegladSection({
  guild,
  channels,
  roles,
  onSave,
}: {
  guild: DiscordGuild | null;
  channels: DiscordChannel[];
  roles: DiscordRole[];
  onSave: (g: DiscordGuild) => void;
}) {
  const [data, setData] = useState(guild ?? ({} as DiscordGuild));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function save() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/serwer/info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          verification_level: data.verification_level,
          default_message_notifications: data.default_message_notifications,
          afk_channel_id: data.afk_channel_id,
          afk_timeout: data.afk_timeout,
          preferred_locale: data.preferred_locale,
          system_channel_id: data.system_channel_id,
          explicit_content_filter: data.explicit_content_filter,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      onSave(result);
      setSuccess('Zmiany zapisane!');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider font-semibold">{label}</label>
      {children}
    </div>
  );

  const inp =
    'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#30d158]/50';
  const sel = inp + ' cursor-pointer';

  const voiceChannels = channels.filter(c => c.type === 2);
  const textChannels = channels.filter(c => c.type === 0 || c.type === 5);

  return (
    <div className="space-y-6">
      {error && <ErrorBanner msg={error} onDismiss={() => setError('')} />}
      {success && <SuccessBanner msg={success} onDismiss={() => setSuccess('')} />}

      <div className="flex items-center gap-5 p-5 bg-white/3 border border-white/8 rounded-xl">
        {iconUrl(data) ? (
          <img src={iconUrl(data)!} alt="icon" className="w-16 h-16 rounded-full" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#5865F2] flex items-center justify-center text-2xl font-black text-white">
            {data.name?.[0]}
          </div>
        )}
        <div>
          <div className="font-bold text-lg text-white">{data.name}</div>
          <div className="text-sm text-white/40">ID: {data.id}</div>
          <div className="flex gap-4 mt-1 text-xs text-white/40">
            <span>👥 {data.approximate_member_count?.toLocaleString('pl-PL')} członków</span>
            <span>🟢 {data.approximate_presence_count?.toLocaleString('pl-PL')} online</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <F label="Nazwa serwera">
          <input
            className={inp}
            value={data.name ?? ''}
            onChange={e => setData(d => ({ ...d, name: e.target.value }))}
            maxLength={100}
          />
        </F>

        <F label="Preferowany język">
          <select
            className={sel}
            value={data.preferred_locale ?? 'pl'}
            onChange={e => setData(d => ({ ...d, preferred_locale: e.target.value }))}
          >
            <option className="bg-[#111827]" value="pl">
              Polski
            </option>
            <option className="bg-[#111827]" value="en-US">
              English (US)
            </option>
            <option className="bg-[#111827]" value="de">
              Deutsch
            </option>
            <option className="bg-[#111827]" value="fr">
              Français
            </option>
            <option className="bg-[#111827]" value="es-ES">
              Español
            </option>
          </select>
        </F>

        <F label="Opis serwera">
          <textarea
            className={inp + ' resize-none'}
            rows={3}
            value={data.description ?? ''}
            onChange={e => setData(d => ({ ...d, description: e.target.value }))}
            placeholder="Opis wyświetlany na stronie Discovery"
          />
        </F>

        <div className="space-y-4">
          <F label="Poziom weryfikacji">
            <select
              className={sel}
              value={data.verification_level ?? 0}
              onChange={e => setData(d => ({ ...d, verification_level: parseInt(e.target.value) }))}
            >
              {VERIFICATION_LEVELS.map((l, i) => (
                <option key={i} value={i} className="bg-[#111827]">
                  {i} — {l}
                </option>
              ))}
            </select>
          </F>

          <F label="Powiadomienia domyślne">
            <select
              className={sel}
              value={data.default_message_notifications ?? 0}
              onChange={e => setData(d => ({ ...d, default_message_notifications: parseInt(e.target.value) }))}
            >
              <option value={0} className="bg-[#111827]">
                Wszystkie wiadomości
              </option>
              <option value={1} className="bg-[#111827]">
                Tylko wzmianki
              </option>
            </select>
          </F>

          <F label="Filtrowanie treści">
            <select
              className={sel}
              value={data.explicit_content_filter ?? 0}
              onChange={e => setData(d => ({ ...d, explicit_content_filter: parseInt(e.target.value) }))}
            >
              <option value={0} className="bg-[#111827]">
                Wyłączony
              </option>
              <option value={1} className="bg-[#111827]">
                Bez ról
              </option>
              <option value={2} className="bg-[#111827]">
                Wszyscy
              </option>
            </select>
          </F>
        </div>

        <F label="Kanał AFK">
          <select
            className={sel}
            value={data.afk_channel_id ?? ''}
            onChange={e => setData(d => ({ ...d, afk_channel_id: e.target.value || null }))}
          >
            <option value="" className="bg-[#111827]">
              Brak
            </option>
            {voiceChannels.map(ch => (
              <option key={ch.id} value={ch.id} className="bg-[#111827]">
                {ch.name}
              </option>
            ))}
          </select>
        </F>

        <F label="Timeout AFK">
          <select
            className={sel}
            value={data.afk_timeout ?? 300}
            onChange={e => setData(d => ({ ...d, afk_timeout: parseInt(e.target.value) }))}
          >
            {AFK_TIMEOUTS.map(t => (
              <option key={t} value={t} className="bg-[#111827]">
                {t / 60} min
              </option>
            ))}
          </select>
        </F>

        <F label="Kanał systemowy">
          <select
            className={sel}
            value={data.system_channel_id ?? ''}
            onChange={e => setData(d => ({ ...d, system_channel_id: e.target.value || null }))}
          >
            <option value="" className="bg-[#111827]">
              Brak
            </option>
            {textChannels.map(ch => (
              <option key={ch.id} value={ch.id} className="bg-[#111827]">
                {ch.name}
              </option>
            ))}
          </select>
        </F>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={loading}
          className="flex items-center gap-2 bg-[#30d158] hover:bg-[#28b84a] disabled:opacity-50 text-black font-bold px-6 py-2.5 rounded-lg text-sm transition-colors"
        >
          <Check className="w-4 h-4" />
          {loading ? 'Zapisywanie...' : 'Zastosuj zmiany'}
        </button>
      </div>
    </div>
  );
}

// ─── Section: ROLE ───────────────────────────────────────────────────────────

function RoleSection({
  roles,
  onRefresh,
}: {
  roles: DiscordRole[];
  onRefresh: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState<DiscordRole | null>(null);
  const [tab, setTab] = useState<'wyswietlanie' | 'uprawnienia'>('wyswietlanie');
  const [form, setForm] = useState<Partial<DiscordRole>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [delConfirm, setDelConfirm] = useState<string | null>(null);

  function selectRole(role: DiscordRole) {
    setSelectedRole(role);
    setForm({
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      mentionable: role.mentionable,
      permissions: role.permissions,
    });
    setTab('wyswietlanie');
  }

  async function saveRole() {
    if (!selectedRole) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/serwer/role/${selectedRole.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          color: form.color,
          hoist: form.hoist,
          mentionable: form.mentionable,
          permissions: form.permissions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefresh();
      setSuccess(`Rola @${data.name} zaktualizowana!`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  async function deleteRole() {
    if (!selectedRole) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/serwer/role/${selectedRole.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      onRefresh();
      setSelectedRole(null);
      setDelConfirm(null);
      setSuccess('Rola usunięta!');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  async function createRole() {
    if (!newName.trim()) {
      setError('Nazwa roli jest wymagana');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/serwer/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          color: 0,
          hoist: false,
          mentionable: false,
          permissions: '0',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefresh();
      setShowCreate(false);
      setNewName('');
      setSuccess(`Rola @${data.name} utworzona!`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  const inp =
    'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#30d158]/50';

  const hasAdmin = selectedRole && hasPerm(BigInt(selectedRole.permissions), PERM.ADMINISTRATOR);

  const sorted = [...roles].sort((a, b) => b.position - a.position);

  return (
    <div className="flex gap-5 h-full">
      {/* Left Sidebar */}
      <div className="w-56 shrink-0 border-r border-white/10 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-2 p-3">
          {sorted.map(role => (
            <div
              key={role.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                selectedRole?.id === role.id ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
              onClick={() => selectRole(role)}
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: intToHex(role.color) }}
              />
              <span className="flex-1 text-sm text-white truncate">{role.name}</span>
              <span className="text-xs text-white/40">{role.position}</span>
            </div>
          ))}
        </div>

        {error && <div className="p-3"><ErrorBanner msg={error} onDismiss={() => setError('')} /></div>}
        {success && <div className="p-3"><SuccessBanner msg={success} onDismiss={() => setSuccess('')} /></div>}

        <div className="p-3 border-t border-white/10">
          {showCreate ? (
            <div className="space-y-2">
              <input
                className={inp}
                placeholder="Nazwa roli"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={createRole}
                  disabled={loading}
                  className="flex-1 bg-[#30d158] hover:bg-[#28b84a] disabled:opacity-50 text-black font-bold px-3 py-2 rounded-lg text-sm"
                >
                  Utwórz
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white px-3 py-2 rounded-lg text-sm"
                >
                  Anuluj
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-2 bg-[#30d158] hover:bg-[#28b84a] text-black font-bold px-3 py-2 rounded-lg text-sm"
            >
              <Plus className="w-4 h-4" />
              Utwórz rolę
            </button>
          )}
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedRole ? (
          <div className="space-y-6 p-1">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10">
              <button
                onClick={() => setTab('wyswietlanie')}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'wyswietlanie' ? 'border-[#30d158] text-white' : 'border-transparent text-white/50'
                }`}
              >
                Wyświetlanie
              </button>
              <button
                onClick={() => setTab('uprawnienia')}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'uprawnienia' ? 'border-[#30d158] text-white' : 'border-transparent text-white/50'
                }`}
              >
                Uprawnienia
              </button>
            </div>

            {tab === 'wyswietlanie' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider font-semibold">
                    Nazwa
                  </label>
                  <input
                    className={inp}
                    value={form.name ?? ''}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider font-semibold">
                    Kolor
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={intToHex(form.color ?? 0)}
                      onChange={e => setForm(f => ({ ...f, color: hexToInt(e.target.value) }))}
                      className="w-12 h-10 rounded-lg cursor-pointer"
                    />
                    <input
                      className={inp}
                      value={intToHex(form.color ?? 0)}
                      onChange={e => setForm(f => ({ ...f, color: hexToInt(e.target.value) }))}
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.hoist ?? false}
                      onChange={e => setForm(f => ({ ...f, hoist: e.target.checked }))}
                      className="w-4 h-4 rounded accent-[#30d158]"
                    />
                    <span className="text-sm text-white">Wyświetl rolę osobno</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.mentionable ?? false}
                      onChange={e => setForm(f => ({ ...f, mentionable: e.target.checked }))}
                      className="w-4 h-4 rounded accent-[#30d158]"
                    />
                    <span className="text-sm text-white">Członkowie mogą wspomnić tę rolę</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveRole}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#30d158] hover:bg-[#28b84a] disabled:opacity-50 text-black font-bold px-4 py-2 rounded-lg text-sm"
                  >
                    <Check className="w-4 h-4" />
                    Zapisz
                  </button>
                  {delConfirm === selectedRole.id ? (
                    <button
                      onClick={deleteRole}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500/30 hover:bg-red-500/40 disabled:opacity-50 text-red-400 font-bold px-4 py-2 rounded-lg text-sm"
                    >
                      Potwierdź usunięcie
                    </button>
                  ) : (
                    <button
                      onClick={() => setDelConfirm(selectedRole.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Usuń
                    </button>
                  )}
                </div>
              </div>
            )}

            {tab === 'uprawnienia' && (
              <div className="space-y-6">
                {hasAdmin && (
                  <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/25 rounded-lg px-4 py-3 text-sm text-yellow-400">
                    <Zap className="w-4 h-4" />
                    ADMINISTRATOR nadaje wszystkie uprawnienia
                  </div>
                )}

                {PERM_GROUPS.map(group => (
                  <div key={group.label}>
                    <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">{group.label}</div>
                    <div className="space-y-2">
                      {group.perms.map(perm => {
                        const permVal = PERM[perm.key];
                        const has = hasPerm(BigInt(form.permissions ?? '0'), permVal);
                        return (
                          <div key={perm.key} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/8 transition-colors">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-white">{perm.label}</div>
                              <div className="text-xs text-white/40">{perm.desc}</div>
                            </div>
                            <button
                              onClick={() => {
                                const currentPerms = BigInt(form.permissions ?? '0');
                                const newPerms = togglePerm(currentPerms, permVal);
                                setForm(f => ({ ...f, permissions: newPerms.toString() }));
                              }}
                              className={`ml-3 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                has
                                  ? 'bg-[#30d158] border-[#30d158]'
                                  : 'border-white/20 hover:border-white/40'
                              }`}
                            >
                              {has && <Check className="w-3 h-3 text-black" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveRole}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#30d158] hover:bg-[#28b84a] disabled:opacity-50 text-black font-bold px-4 py-2 rounded-lg text-sm"
                  >
                    <Check className="w-4 h-4" />
                    Zapisz uprawnienia
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-white/40">
            <div className="text-center">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Wybierz rolę aby edytować</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section: KANAŁY ─────────────────────────────────────────────────────────

function KanalySection({
  channels,
  roles,
  onRefresh,
}: {
  channels: DiscordChannel[];
  roles: DiscordRole[];
  onRefresh: () => void;
}) {
  const [selectedChannel, setSelectedChannel] = useState<DiscordChannel | null>(null);
  const [tab, setTab] = useState<'przeglad' | 'uprawnienia' | 'webhooki'>('przeglad');
  const [form, setForm] = useState<Partial<DiscordChannel>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newChannelForm, setNewChannelForm] = useState({ name: '', type: 0, parent_id: '' });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [delConfirm, setDelConfirm] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<DiscordWebhook[]>([]);
  const [selectedRolePerms, setSelectedRolePerms] = useState<string | null>(null);
  const [webhookForm, setWebhookForm] = useState({ name: '', channel_id: '' });
  const [showWebhookCreate, setShowWebhookCreate] = useState(false);

  function selectChannel(ch: DiscordChannel) {
    setSelectedChannel(ch);
    setForm({
      name: ch.name,
      topic: ch.topic,
      nsfw: ch.nsfw,
      rate_limit_per_user: ch.rate_limit_per_user ?? 0,
      bitrate: ch.bitrate,
      user_limit: ch.user_limit,
    });
    setTab('przeglad');
    setSelectedRolePerms(null);
  }

  async function saveChannel() {
    if (!selectedChannel) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/serwer/kanaly/${selectedChannel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefresh();
      setSuccess(`Kanał #${data.name} zaktualizowany!`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  async function deleteChannel() {
    if (!selectedChannel) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/serwer/kanaly/${selectedChannel.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      onRefresh();
      setSelectedChannel(null);
      setDelConfirm(null);
      setSuccess('Kanał usunięty!');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  async function createChannel() {
    if (!newChannelForm.name.trim()) {
      setError('Nazwa kanału jest wymagana');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/serwer/kanaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChannelForm.name.trim(),
          type: newChannelForm.type,
          parent_id: newChannelForm.parent_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefresh();
      setShowCreateChannel(false);
      setNewChannelForm({ name: '', type: 0, parent_id: '' });
      setSuccess(`Kanał #${data.name} utworzony!`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  async function createCategory() {
    if (!newCategoryName.trim()) {
      setError('Nazwa kategorii jest wymagana');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/serwer/kanaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          type: 4,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefresh();
      setShowCreateCategory(false);
      setNewCategoryName('');
      setSuccess(`Kategoria ${data.name} utworzona!`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  async function loadWebhooks() {
    if (!selectedChannel) return;
    try {
      const res = await fetch(`/api/serwer/webhooki?channel=${selectedChannel.id}`);
      const data = await res.json();
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load webhooks:', e);
    }
  }

  async function createWebhook() {
    if (!webhookForm.name.trim()) {
      setError('Nazwa webhhooka jest wymagana');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/serwer/webhooki', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: webhookForm.name.trim(),
          channel_id: selectedChannel?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadWebhooks();
      setWebhookForm({ name: '', channel_id: '' });
      setShowWebhookCreate(false);
      setSuccess('Webhook utworzony!');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  async function deleteWebhook(webhookId: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/serwer/webhooki/${webhookId}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      await loadWebhooks();
      setSuccess('Webhook usunięty!');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  const inp =
    'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#30d158]/50';

  const categories = channels.filter(c => c.type === 4).sort((a, b) => a.position - b.position);
  const textChannels = channels.filter(c => (c.type === 0 || c.type === 5) && !c.parent_id);
  const voiceChannels = channels.filter(c => c.type === 2 && !c.parent_id);

  return (
    <div className="flex gap-5 h-full">
      {/* Left Sidebar */}
      <div className="w-56 shrink-0 border-r border-white/10 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-1 p-3">
          {/* Create Category */}
          {showCreateCategory ? (
            <div className="space-y-2 mb-4">
              <input
                className={inp}
                placeholder="Nazwa kategorii"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={createCategory}
                  disabled={loading}
                  className="flex-1 bg-[#30d158] hover:bg-[#28b84a] disabled:opacity-50 text-black font-bold px-2 py-1.5 rounded text-xs"
                >
                  Utwórz
                </button>
                <button
                  onClick={() => setShowCreateCategory(false)}
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white px-2 py-1.5 rounded text-xs"
                >
                  Anuluj
                </button>
              </div>
            </div>
          ) : null}

          {/* Uncategorized channels */}
          {(textChannels.length > 0 || voiceChannels.length > 0) && !categories.length && (
            <>
              {[...textChannels, ...voiceChannels].map(ch => (
                <div
                  key={ch.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    selectedChannel?.id === ch.id ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                  onClick={() => selectChannel(ch)}
                >
                  <div className="text-white/50">{CHANNEL_ICON[ch.type]}</div>
                  <span className="flex-1 text-sm text-white truncate">{ch.name}</span>
                </div>
              ))}
            </>
          )}

          {/* Categories with children */}
          {categories.map(cat => {
            const children = channels.filter(c => c.parent_id === cat.id);
            const isCollapsed = collapsed.has(cat.id);
            return (
              <div key={cat.id}>
                <button
                  onClick={() => setCollapsed(prev => new Set(isCollapsed ? prev.delete(cat.id) : prev.add(cat.id)))}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white/60 hover:text-white uppercase tracking-wider hover:bg-white/5 rounded-lg transition-colors"
                >
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <Folder className="w-3 h-3" />
                  {cat.name}
                </button>

                {!isCollapsed &&
                  children.map(ch => (
                    <div
                      key={ch.id}
                      className={`flex items-center gap-2 px-6 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                        selectedChannel?.id === ch.id ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                      onClick={() => selectChannel(ch)}
                    >
                      <div className="text-white/50">{CHANNEL_ICON[ch.type]}</div>
                      <span className="flex-1 text-white truncate">{ch.name}</span>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>

        {error && <div className="p-3"><ErrorBanner msg={error} onDismiss={() => setError('')} /></div>}
        {success && <div className="p-3"><SuccessBanner msg={success} onDismiss={() => setSuccess('')} /></div>}

        <div className="p-3 space-y-2 border-t border-white/10">
          {showCreateChannel ? (
            <div className="space-y-2">
              <input
                className={inp}
                placeholder="Nazwa kanału"
                value={newChannelForm.name}
                onChange={e => setNewChannelForm(f => ({ ...f, name: e.target.value }))}
              />
              <select
                className={inp + ' cursor-pointer'}
                value={newChannelForm.type}
                onChange={e => setNewChannelForm(f => ({ ...f, type: parseInt(e.target.value) }))}
              >
                <option value={0} className="bg-[#111827]">
                  Tekst
                </option>
                <option value={2} className="bg-[#111827]">
                  Głosowy
                </option>
              </select>
              <select
                className={inp + ' cursor-pointer'}
                value={newChannelForm.parent_id}
                onChange={e => setNewChannelForm(f => ({ ...f, parent_id: e.target.value }))}
              >
                <option value="" className="bg-[#111827]">
                  Bez kategorii
                </option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-[#111827]">
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={createChannel}
                  disabled={loading}
                  className="flex-1 bg-[#30d158] hover:bg-[#28b84a] disabled:opacity-50 text-black font-bold px-3 py-2 rounded text-xs"
                >
                  Utwórz
                </button>
                <button
                  onClick={() => setShowCreateChannel(false)}
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white px-3 py-2 rounded text-xs"
                >
                  Anuluj
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowCreateChannel(true)}
                className="w-full flex items-center justify-center gap-2 bg-[#30d158] hover:bg-[#28b84a] text-black font-bold px-3 py-2 rounded text-xs"
              >
                <Plus className="w-4 h-4" />
                Kanał
              </button>
              <button
                onClick={() => setShowCreateCategory(true)}
                className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold px-3 py-2 rounded text-xs"
              >
                <Plus className="w-4 h-4" />
                Kategoria
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedChannel ? (
          <div className="space-y-6 p-1">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10">
              <button
                onClick={() => setTab('przeglad')}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'przeglad' ? 'border-[#30d158] text-white' : 'border-transparent text-white/50'
                }`}
              >
                Przegląd
              </button>
              <button
                onClick={() => setTab('uprawnienia')}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'uprawnienia' ? 'border-[#30d158] text-white' : 'border-transparent text-white/50'
                }`}
              >
                Uprawnienia
              </button>
              {selectedChannel.type === 0 && (
                <button
                  onClick={() => {
                    setTab('webhooki');
                    loadWebhooks();
                  }}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    tab === 'webhooki' ? 'border-[#30d158] text-white' : 'border-transparent text-white/50'
                  }`}
                >
                  Webhooki
                </button>
              )}
            </div>

            {tab === 'przeglad' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider font-semibold">
                    Nazwa kanału
                  </label>
                  <input
                    className={inp}
                    value={form.name ?? ''}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>

                {selectedChannel.type === 0 && (
                  <>
                    <div>
                      <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider font-semibold">
                        Temat kanału
                      </label>
                      <textarea
                        className={inp + ' resize-none'}
                        rows={3}
                        value={form.topic ?? ''}
                        onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider font-semibold">
                        Tryb powolny (sec)
                      </label>
                      <select
                        className={inp + ' cursor-pointer'}
                        value={form.rate_limit_per_user ?? 0}
                        onChange={e =>
                          setForm(f => ({ ...f, rate_limit_per_user: parseInt(e.target.value) }))
                        }
                      >
                        <option value={0} className="bg-[#111827]">
                          Wyłączony
                        </option>
                        <option value={5} className="bg-[#111827]">
                          5 sekund
                        </option>
                        <option value={10} className="bg-[#111827]">
                          10 sekund
                        </option>
                        <option value={15} className="bg-[#111827]">
                          15 sekund
                        </option>
                        <option value={30} className="bg-[#111827]">
                          30 sekund
                        </option>
                        <option value={60} className="bg-[#111827]">
                          1 minuta
                        </option>
                        <option value={120} className="bg-[#111827]">
                          2 minuty
                        </option>
                        <option value={300} className="bg-[#111827]">
                          5 minut
                        </option>
                        <option value={600} className="bg-[#111827]">
                          10 minut
                        </option>
                        <option value={900} className="bg-[#111827]">
                          15 minut
                        </option>
                        <option value={1800} className="bg-[#111827]">
                          30 minut
                        </option>
                        <option value={3600} className="bg-[#111827]">
                          1 godzina
                        </option>
                        <option value={7200} className="bg-[#111827]">
                          2 godziny
                        </option>
                        <option value={21600} className="bg-[#111827]">
                          6 godzin
                        </option>
                      </select>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.nsfw ?? false}
                        onChange={e => setForm(f => ({ ...f, nsfw: e.target.checked }))}
                        className="w-4 h-4 rounded accent-[#30d158]"
                      />
                      <span className="text-sm text-white">NSFW — Treść dorosła</span>
                    </label>
                  </>
                )}

                {selectedChannel.type === 2 && (
                  <>
                    <div>
                      <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider font-semibold">
                        Bitrate (kbps)
                      </label>
                      <select
                        className={inp + ' cursor-pointer'}
                        value={form.bitrate ?? 64}
                        onChange={e => setForm(f => ({ ...f, bitrate: parseInt(e.target.value) }))}
                      >
                        <option value={8} className="bg-[#111827]">
                          8 kbps
                        </option>
                        <option value={16} className="bg-[#111827]">
                          16 kbps
                        </option>
                        <option value={32} className="bg-[#111827]">
                          32 kbps
                        </option>
                        <option value={64} className="bg-[#111827]">
                          64 kbps
                        </option>
                        <option value={96} className="bg-[#111827]">
                          96 kbps
                        </option>
                        <option value={128} className="bg-[#111827]">
                          128 kbps
                        </option>
                        <option value={256} className="bg-[#111827]">
                          256 kbps
                        </option>
                        <option value={384} className="bg-[#111827]">
                          384 kbps
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider font-semibold">
                        Limit użytkowników (0 = bez limitu)
                      </label>
                      <input
                        className={inp}
                        type="number"
                        min={0}
                        max={99}
                        value={form.user_limit ?? 0}
                        onChange={e => setForm(f => ({ ...f, user_limit: parseInt(e.target.value) }))}
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveChannel}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#30d158] hover:bg-[#28b84a] disabled:opacity-50 text-black font-bold px-4 py-2 rounded-lg text-sm"
                  >
                    <Check className="w-4 h-4" />
                    Zapisz
                  </button>
                  {delConfirm === selectedChannel.id ? (
                    <button
                      onClick={deleteChannel}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500/30 hover:bg-red-500/40 disabled:opacity-50 text-red-400 font-bold px-4 py-2 rounded-lg text-sm"
                    >
                      Potwierdź usunięcie
                    </button>
                  ) : (
                    <button
                      onClick={() => setDelConfirm(selectedChannel.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Usuń
                    </button>
                  )}
                </div>
              </div>
            )}

            {tab === 'uprawnienia' && (
              <div className="space-y-5">
                {selectedRolePerms ? (
                  <div>
                    <button
                      onClick={() => setSelectedRolePerms(null)}
                      className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      Powrót
                    </button>

                    <div className="text-sm font-medium text-white mb-4">
                      Uprawnienia dla roli:{' '}
                      <span className="text-[#30d158]">{roles.find(r => r.id === selectedRolePerms)?.name}</span>
                    </div>

                    <div className="space-y-3">
                      {PERM_GROUPS.map(group => (
                        <div key={group.label}>
                          <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                            {group.label}
                          </div>
                          <div className="space-y-2">
                            {group.perms.map(perm => (
                              <div key={perm.key} className="flex items-center justify-between gap-2 text-sm">
                                <span className="text-white">{perm.label}</span>
                                <div className="flex gap-1">
                                  <button className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs rounded">
                                    ✓
                                  </button>
                                  <button className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded">
                                    ✗
                                  </button>
                                  <button className="px-2 py-1 bg-white/10 hover:bg-white/15 text-white/60 text-xs rounded">
                                    —
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-white/50 mb-3 uppercase tracking-wider font-semibold">
                      Wybierz rolę
                    </label>
                    <select
                      className={inp + ' cursor-pointer'}
                      onChange={e => setSelectedRolePerms(e.target.value || null)}
                    >
                      <option value="" className="bg-[#111827]">
                        Wybierz rolę...
                      </option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id} className="bg-[#111827]">
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {tab === 'webhooki' && (
              <div className="space-y-5">
                {showWebhookCreate ? (
                  <div className="space-y-3">
                    <input
                      className={inp}
                      placeholder="Nazwa webhooka"
                      value={webhookForm.name}
                      onChange={e => setWebhookForm(f => ({ ...f, name: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={createWebhook}
                        disabled={loading}
                        className="flex-1 bg-[#30d158] hover:bg-[#28b84a] disabled:opacity-50 text-black font-bold px-3 py-2 rounded text-sm"
                      >
                        Utwórz
                      </button>
                      <button
                        onClick={() => setShowWebhookCreate(false)}
                        className="flex-1 bg-white/10 hover:bg-white/15 text-white px-3 py-2 rounded text-sm"
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowWebhookCreate(true)}
                    className="w-full flex items-center justify-center gap-2 bg-[#30d158] hover:bg-[#28b84a] text-black font-bold px-3 py-2 rounded text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Utwórz webhook
                  </button>
                )}

                <div className="space-y-2">
                  {webhooks.length > 0 ? (
                    webhooks.map(webhook => (
                      <div key={webhook.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-white">{webhook.name}</div>
                          <div className="text-xs text-white/40">{webhook.url?.split('?')[0]}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              webhook.url && navigator.clipboard.writeText(webhook.url);
                              setSuccess('URL skopiowany!');
                            }}
                            className="flex items-center gap-1 bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 rounded text-xs"
                          >
                            <Link2 className="w-3 h-3" />
                            Kopiuj
                          </button>
                          <button
                            onClick={() => deleteWebhook(webhook.id)}
                            className="flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded text-xs"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-white/40">
                      <p>Brak webhooków dla tego kanału</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-white/40">
            <div className="text-center">
              <Hash className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Wybierz kanał aby edytować</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section: WEBHOOKI ───────────────────────────────────────────────────────

function WebhookiSection({ webhooks, channels, onRefresh }: { webhooks: DiscordWebhook[]; channels: DiscordChannel[]; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', channel_id: '' });

  async function createWebhook() {
    if (!form.name.trim() || !form.channel_id) {
      setError('Wypełnij wszystkie pola');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/serwer/webhooki', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          channel_id: form.channel_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefresh();
      setForm({ name: '', channel_id: '' });
      setShowCreate(false);
      setSuccess('Webhook utworzony!');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  async function deleteWebhook(webhookId: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/serwer/webhooki/${webhookId}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      onRefresh();
      setSuccess('Webhook usunięty!');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  const inp =
    'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#30d158]/50';

  return (
    <div className="space-y-6">
      {error && <ErrorBanner msg={error} onDismiss={() => setError('')} />}
      {success && <SuccessBanner msg={success} onDismiss={() => setSuccess('')} />}

      <div>
        <h3 className="text-xl font-bold text-white mb-6">Webhooki</h3>

        {showCreate ? (
          <div className="space-y-3 bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
            <input
              className={inp}
              placeholder="Nazwa webhhooka"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <select
              className={inp + ' cursor-pointer'}
              value={form.channel_id}
              onChange={e => setForm(f => ({ ...f, channel_id: e.target.value }))}
            >
              <option value="" className="bg-[#111827]">
                Wybierz kanał...
              </option>
              {channels.filter(c => c.type === 0 || c.type === 5).map(ch => (
                <option key={ch.id} value={ch.id} className="bg-[#111827]">
                  {ch.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={createWebhook}
                disabled={loading}
                className="flex-1 bg-[#30d158] hover:bg-[#28b84a] disabled:opacity-50 text-black font-bold px-3 py-2 rounded-lg text-sm"
              >
                Utwórz webhook
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 bg-white/10 hover:bg-white/15 text-white px-3 py-2 rounded-lg text-sm"
              >
                Anuluj
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-[#30d158] hover:bg-[#28b84a] text-black font-bold px-6 py-2.5 rounded-lg text-sm mb-6"
          >
            <Plus className="w-4 h-4" />
            Nowy webhook
          </button>
        )}

        {webhooks.length > 0 ? (
          <div className="space-y-2">
            {webhooks.map(webhook => {
              const channel = channels.find(c => c.id === webhook.channel_id);
              return (
                <div key={webhook.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{webhook.name}</div>
                    <div className="text-xs text-white/40">
                      Kanał: {channel?.name} • URL: {webhook.url?.split('?')[0]}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        webhook.url && navigator.clipboard.writeText(webhook.url);
                        setSuccess('URL skopiowany!');
                      }}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      <Link2 className="w-4 h-4" />
                      Kopiuj
                    </button>
                    <button
                      onClick={() => deleteWebhook(webhook.id)}
                      className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Usuń
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Link2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-white/40">Brak webhooków na tym serwerze</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section: SPOŁECZNOŚĆ ────────────────────────────────────────────────────

function SpolecznostSection({
  guild,
  channels,
  onSave,
}: {
  guild: DiscordGuild | null;
  channels: DiscordChannel[];
  onSave: (g: DiscordGuild) => void;
}) {
  const [data, setData] = useState(guild ?? ({} as DiscordGuild));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isCommunity = data.features?.includes('COMMUNITY') ?? false;

  async function save() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/serwer/info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: isCommunity ? ['COMMUNITY'] : [],
          rules_channel_id: isCommunity ? data.rules_channel_id : null,
          public_updates_channel_id: isCommunity ? data.public_updates_channel_id : null,
          system_channel_id: data.system_channel_id,
          explicit_content_filter: data.explicit_content_filter,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      onSave(result);
      setSuccess('Zmiany zapisane!');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  const sel =
    'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#30d158]/50 cursor-pointer';

  const textChannels = channels.filter(c => c.type === 0 || c.type === 5);

  return (
    <div className="space-y-6">
      {error && <ErrorBanner msg={error} onDismiss={() => setError('')} />}
      {success && <SuccessBanner msg={success} onDismiss={() => setSuccess('')} />}

      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Społeczność</h3>

        <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/8 transition-colors">
          <div>
            <div className="text-sm font-medium text-white">Włącz Społeczność</div>
            <div className="text-xs text-white/40">Aktywuj funkcje społeczności na serwerze</div>
          </div>
          <input
            type="checkbox"
            checked={isCommunity}
            onChange={e => setData(d => ({
              ...d,
              features: e.target.checked ? ['COMMUNITY'] : [],
            }))}
            className="w-5 h-5 rounded accent-[#30d158]"
          />
        </label>

        {isCommunity && (
          <>
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/25 rounded-lg text-sm text-yellow-400 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>Włączenie Społeczności wymaga skonfigurowania kanału zasad i aktualizacji</div>
            </div>

            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider font-semibold">
                  Kanał zasad
                </label>
                <select
                  className={sel}
                  value={data.rules_channel_id ?? ''}
                  onChange={e => setData(d => ({ ...d, rules_channel_id: e.target.value || null }))}
                >
                  <option value="" className="bg-[#111827]">
                    Wybierz kanał...
                  </option>
                  {textChannels.map(ch => (
                    <option key={ch.id} value={ch.id} className="bg-[#111827]">
                      {ch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider font-semibold">
                  Kanał aktualizacji
                </label>
                <select
                  className={sel}
                  value={data.public_updates_channel_id ?? ''}
                  onChange={e => setData(d => ({ ...d, public_updates_channel_id: e.target.value || null }))}
                >
                  <option value="" className="bg-[#111827]">
                    Wybierz kanał...
                  </option>
                  {textChannels.map(ch => (
                    <option key={ch.id} value={ch.id} className="bg-[#111827]">
                      {ch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider font-semibold">
                  Kanał systemowy
                </label>
                <select
                  className={sel}
                  value={data.system_channel_id ?? ''}
                  onChange={e => setData(d => ({ ...d, system_channel_id: e.target.value || null }))}
                >
                  <option value="" className="bg-[#111827]">
                    Brak
                  </option>
                  {textChannels.map(ch => (
                    <option key={ch.id} value={ch.id} className="bg-[#111827]">
                      {ch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider font-semibold">
                  Filtrowanie treści
                </label>
                <select
                  className={sel}
                  value={data.explicit_content_filter ?? 0}
                  onChange={e => setData(d => ({ ...d, explicit_content_filter: parseInt(e.target.value) }))}
                >
                  <option value={0} className="bg-[#111827]">
                    Wyłączony
                  </option>
                  <option value={1} className="bg-[#111827]">
                    Bez ról
                  </option>
                  <option value={2} className="bg-[#111827]">
                    Wszyscy
                  </option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={loading}
          className="flex items-center gap-2 bg-[#30d158] hover:bg-[#28b84a] disabled:opacity-50 text-black font-bold px-6 py-2.5 rounded-lg text-sm transition-colors"
        >
          <Check className="w-4 h-4" />
          {loading ? 'Zapisywanie...' : 'Zastosuj zmiany'}
        </button>
      </div>
    </div>
  );
}

// ─── Section: BANY ───────────────────────────────────────────────────────────

function BanySection({ bans, onRefresh }: { bans: DiscordBan[]; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  async function unban(userId: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/serwer/bany/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      onRefresh();
      setSuccess('Użytkownik odbanowany!');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  const filtered = bans.filter(ban =>
    ban.user.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {error && <ErrorBanner msg={error} onDismiss={() => setError('')} />}
      {success && <SuccessBanner msg={success} onDismiss={() => setSuccess('')} />}

      <div>
        <h3 className="text-xl font-bold text-white mb-4">Zbanowani użytkownicy</h3>

        {bans.length > 0 && (
          <div className="mb-6">
            <input
              type="text"
              placeholder="Szukaj po nazwie..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#30d158]/50"
            />
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map(ban => (
              <div key={ban.user.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <img
                    src={userAvatarUrl(ban.user.id, ban.user.avatar)}
                    alt="avatar"
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{ban.user.username}</div>
                    <div className="text-xs text-white/40">{ban.user.id}</div>
                    {ban.reason && <div className="text-xs text-white/50 mt-1">Powód: {ban.reason}</div>}
                  </div>
                </div>
                <button
                  onClick={() => unban(ban.user.id)}
                  disabled={loading}
                  className="flex items-center gap-2 bg-[#30d158] hover:bg-[#28b84a] disabled:opacity-50 text-black font-bold px-4 py-2 rounded-lg text-sm"
                >
                  Odbanuj
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Ban className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-white/40">{search ? 'Brak wyników' : 'Brak zbanowanych użytkowników'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section: IMPORT JSON ────────────────────────────────────────────────────

function ImportTab() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState('');

  async function handleImport(file: File) {
    setLoading(true);
    setError('');
    setLog([]);

    try {
      const content = await file.text();
      const config = JSON.parse(content);

      const res = await fetch('/api/serwer/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLog(data.log || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd importu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBanner msg={error} onDismiss={() => setError('')} />}

      <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
        <Upload className="w-12 h-12 mx-auto mb-4 text-white/50" />
        <h3 className="text-lg font-bold text-white mb-2">Import konfiguracji serwera</h3>
        <p className="text-sm text-white/40 mb-6">
          Wybierz plik JSON z konfiguracją serwera aby zaimportować role, kanały i uprawnienia
        </p>

        <button
          onClick={() => fileInput.current?.click()}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-[#30d158] hover:bg-[#28b84a] disabled:opacity-50 text-black font-bold px-6 py-3 rounded-lg text-sm mx-auto"
        >
          <Upload className="w-4 h-4" />
          {loading ? 'Importowanie...' : 'Załaduj plik JSON'}
        </button>

        <input
          ref={fileInput}
          type="file"
          accept=".json"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
          }}
          className="hidden"
        />
      </div>

      {log.length > 0 && (
        <div className="bg-[#111827] border border-white/10 rounded-lg p-4">
          <div className="text-xs font-mono text-white/70 space-y-1 max-h-96 overflow-y-auto">
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'przegląd', label: 'Przegląd', icon: <Settings className="w-4 h-4" /> },
  { id: 'role', label: 'Role', icon: <Shield className="w-4 h-4" /> },
  { id: 'kanały', label: 'Kanały', icon: <Hash className="w-4 h-4" /> },
  { id: 'webhooki', label: 'Webhooki', icon: <Link2 className="w-4 h-4" /> },
  { id: 'społeczność', label: 'Społeczność', icon: <Globe className="w-4 h-4" /> },
  { id: 'bany', label: 'Bany', icon: <Ban className="w-4 h-4" /> },
  { id: 'import', label: 'Import JSON', icon: <Upload className="w-4 h-4" /> },
];

export default function ServerManager() {
  const [section, setSection] = useState('przegląd');
  const [guild, setGuild] = useState<DiscordGuild | null>(null);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [webhooks, setWebhooks] = useState<DiscordWebhook[]>([]);
  const [bans, setBans] = useState<DiscordBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh(what: 'all' | 'channels' | 'roles' | 'guild' | 'webhooks' | 'bans') {
    setError('');
    try {
      if (what === 'all' || what === 'guild') {
        const res = await fetch('/api/serwer/info');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setGuild(data);
      }
      if (what === 'all' || what === 'channels') {
        const res = await fetch('/api/serwer/kanaly');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setChannels(data);
      }
      if (what === 'all' || what === 'roles') {
        const res = await fetch('/api/serwer/role');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setRoles(data);
      }
      if (what === 'all' || what === 'webhooks') {
        const res = await fetch('/api/serwer/webhooki');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setWebhooks(Array.isArray(data) ? data : []);
      }
      if (what === 'all' || what === 'bans') {
        const res = await fetch('/api/serwer/bany');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setBans(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd ładowania danych');
    } finally {
      if (what === 'all') setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh('all');
  }, []);

  return (
    <div className="flex h-full min-h-screen bg-[#0f1923]">
      {/* Sidebar */}
      <nav className="w-56 shrink-0 bg-[#111827] border-r border-white/8 p-2 space-y-0.5 flex flex-col">
        <div className="px-2 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Ustawienia serwera</div>

        <div className="flex-1 space-y-0.5 overflow-y-auto">
          {SECTIONS.map(s => (
            <SidebarItem
              key={s.id}
              id={s.id}
              label={s.label}
              icon={s.icon}
              active={section === s.id}
              onClick={() => setSection(s.id)}
            />
          ))}
        </div>

        <div className="pt-3 border-t border-white/10 px-2">
          <button
            onClick={() => refresh('all')}
            className="flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white px-3 py-2.5 rounded-lg text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Odśwież
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-8 max-w-full">
        {error && (
          <div className="mb-6">
            <ErrorBanner msg={error} onDismiss={() => setError('')} />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 mx-auto mb-3 text-white/40 animate-spin" />
              <p className="text-white/40">Ładowanie danych serwera...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white">{SECTIONS.find(s => s.id === section)?.label}</h1>
            </div>

            {section === 'przegląd' && <PrzegladSection guild={guild} channels={channels} roles={roles} onSave={setGuild} />}
            {section === 'role' && <RoleSection roles={roles} onRefresh={() => refresh('roles')} />}
            {section === 'kanały' && <KanalySection channels={channels} roles={roles} onRefresh={() => refresh('channels')} />}
            {section === 'webhooki' && <WebhookiSection webhooks={webhooks} channels={channels} onRefresh={() => refresh('webhooks')} />}
            {section === 'społeczność' && <SpolecznostSection guild={guild} channels={channels} onSave={setGuild} />}
            {section === 'bany' && <BanySection bans={bans} onRefresh={() => refresh('bans')} />}
            {section === 'import' && <ImportTab />}
          </>
        )}
      </main>
    </div>
  );
}
