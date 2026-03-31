'use client';

import { useState, useCallback } from 'react';
import {
  Hash, Volume2, Folder, Megaphone, AlertCircle, RefreshCw,
  Plus, Pencil, Trash2, X, Check, ChevronRight, ChevronDown,
  Settings, Users, Radio, Shield,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DiscordChannel {
  id: string;
  name: string;
  type: number;         // 0=text, 2=voice, 4=category, 5=announce, 13=stage, 15=forum
  position: number;
  parent_id: string | null;
  topic: string | null;
  nsfw: boolean;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;        // decimal RGB
  hoist: boolean;
  mentionable: boolean;
  permissions: string;  // stringified bigint
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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHANNEL_ICON: Record<number, React.ReactNode> = {
  0:  <Hash className="w-3.5 h-3.5" />,
  2:  <Volume2 className="w-3.5 h-3.5" />,
  4:  <Folder className="w-3.5 h-3.5" />,
  5:  <Megaphone className="w-3.5 h-3.5" />,
  13: <Radio className="w-3.5 h-3.5" />,
  15: <Hash className="w-3.5 h-3.5" />,
};

const CHANNEL_TYPE_LABEL: Record<number, string> = {
  0: 'Tekst', 2: 'Głosowy', 4: 'Kategoria', 5: 'Ogłoszenia', 13: 'Stage', 15: 'Forum',
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function ErrorBanner({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-3 text-sm text-red-400">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{msg}</span>
      <button onClick={onDismiss} className="text-red-400/60 hover:text-red-400"><X className="w-4 h-4" /></button>
    </div>
  );
}

function SuccessBanner({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/25 rounded-lg px-4 py-3 text-sm text-green-400">
      <Check className="w-4 h-4 shrink-0" />
      <span className="flex-1">{msg}</span>
      <button onClick={onDismiss} className="text-green-400/60 hover:text-green-400"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ─── Tab: Informacje o serwerze ───────────────────────────────────────────────

function GuildTab({ guild: initial, onSave }: { guild: DiscordGuild; onSave: (g: DiscordGuild) => void }) {
  const [guild, setGuild] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  async function save() {
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/serwer/info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:                          guild.name,
          description:                   guild.description,
          verification_level:            guild.verification_level,
          default_message_notifications: guild.default_message_notifications,
          afk_channel_id:                guild.afk_channel_id,
          afk_timeout:                   guild.afk_timeout,
          preferred_locale:              guild.preferred_locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSave(data);
      setSuccess('Zmiany zostały zapisane na serwerze Discord!');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd zapisu');
    } finally {
      setLoading(false);
    }
  }

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs text-white/50 mb-1">{label}</label>
      {children}
    </div>
  );

  const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#30d158]/50";
  const sel = inp + " cursor-pointer";

  return (
    <div className="space-y-5">
      {error   && <ErrorBanner   msg={error}   onDismiss={() => setError('')}   />}
      {success && <SuccessBanner msg={success} onDismiss={() => setSuccess('')} />}

      <div className="flex items-center gap-5 p-5 bg-white/3 border border-white/8 rounded-xl">
        {iconUrl(guild)
          ? <img src={iconUrl(guild)!} alt="icon" className="w-16 h-16 rounded-full" />
          : <div className="w-16 h-16 rounded-full bg-[#5865F2] flex items-center justify-center text-2xl font-black text-white">{guild.name[0]}</div>
        }
        <div>
          <div className="font-bold text-lg text-white">{guild.name}</div>
          <div className="text-sm text-white/40">ID: {guild.id}</div>
          <div className="flex gap-4 mt-1 text-xs text-white/40">
            <span>👥 {guild.approximate_member_count?.toLocaleString('pl-PL')} członków</span>
            <span>🟢 {guild.approximate_presence_count?.toLocaleString('pl-PL')} online</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <F label="Nazwa serwera">
          <input className={inp} value={guild.name}
            onChange={e => setGuild(g => ({ ...g, name: e.target.value }))} maxLength={100} />
        </F>
        <F label="Preferowany język">
          <input className={inp} value={guild.preferred_locale}
            onChange={e => setGuild(g => ({ ...g, preferred_locale: e.target.value }))} />
        </F>
        <F label="Opis serwera">
          <textarea className={inp + ' resize-none'} rows={3}
            value={guild.description ?? ''}
            onChange={e => setGuild(g => ({ ...g, description: e.target.value }))}
            placeholder="Opis wyświetlany na stronie Discovery" />
        </F>
        <div className="space-y-4">
          <F label="Poziom weryfikacji">
            <select className={sel} value={guild.verification_level}
              onChange={e => setGuild(g => ({ ...g, verification_level: parseInt(e.target.value) }))}>
              {VERIFICATION_LEVELS.map((l, i) => (
                <option key={i} value={i} className="bg-[#0f1923]">{i} — {l}</option>
              ))}
            </select>
          </F>
          <F label="Powiadomienia domyślne">
            <select className={sel} value={guild.default_message_notifications}
              onChange={e => setGuild(g => ({ ...g, default_message_notifications: parseInt(e.target.value) }))}>
              <option value={0} className="bg-[#0f1923]">Wszystkie wiadomości</option>
              <option value={1} className="bg-[#0f1923]">Tylko wzmianki</option>
            </select>
          </F>
          <F label="AFK Timeout">
            <select className={sel} value={guild.afk_timeout}
              onChange={e => setGuild(g => ({ ...g, afk_timeout: parseInt(e.target.value) }))}>
              {AFK_TIMEOUTS.map(t => (
                <option key={t} value={t} className="bg-[#0f1923]">{t / 60} min</option>
              ))}
            </select>
          </F>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={loading}
          className="flex items-center gap-2 bg-[#30d158] hover:bg-[#28b84a] disabled:opacity-50 text-black font-bold px-6 py-2.5 rounded-lg text-sm transition-colors">
          <Check className="w-4 h-4" />
          {loading ? 'Zapisywanie...' : 'Zastosuj zmiany'}
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Kanały ─────────────────────────────────────────────────────────────

function ChannelsTab({ channels: initial, onRefresh }: { channels: DiscordChannel[]; onRefresh: () => void }) {
  const [channels, setChannels] = useState<DiscordChannel[]>(initial);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DiscordChannel>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm]   = useState({ name: '', type: 0, parent_id: '', topic: '' });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [delConfirm, setDelConfirm] = useState<string | null>(null);

  const categories = channels.filter(c => c.type === 4);

  function startEdit(ch: DiscordChannel) {
    setEditId(ch.id);
    setEditForm({ name: ch.name, topic: ch.topic ?? '', parent_id: ch.parent_id ?? '', nsfw: ch.nsfw, rate_limit_per_user: ch.rate_limit_per_user ?? 0, bitrate: ch.bitrate, user_limit: ch.user_limit });
  }

  async function saveEdit() {
    if (!editId) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/serwer/kanaly/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChannels(prev => prev.map(c => c.id === editId ? { ...c, ...data } : c));
      setEditId(null);
      setSuccess(`Kanał #${data.name} zaktualizowany!`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally { setLoading(false); }
  }

  async function deleteChannel(id: string) {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/serwer/kanaly/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setChannels(prev => prev.filter(c => c.id !== id));
      setDelConfirm(null);
      setSuccess('Kanał usunięty');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd usuwania');
    } finally { setLoading(false); }
  }

  async function createChannel() {
    if (!newForm.name.trim()) { setError('Nazwa jest wymagana'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/serwer/kanaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newForm, parent_id: newForm.parent_id || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChannels(prev => [...prev, data]);
      setShowCreate(false);
      setNewForm({ name: '', type: 0, parent_id: '', topic: '' });
      setSuccess(`Kanał #${data.name} utworzony!`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd tworzenia');
    } finally { setLoading(false); }
  }

  const inp = "bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#30d158]/50 w-full";

  // Group channels by category
  const grouped: { cat: DiscordChannel | null; children: DiscordChannel[] }[] = [];
  const uncategorized = channels.filter(c => !c.parent_id && c.type !== 4);
  if (uncategorized.length > 0) grouped.push({ cat: null, children: uncategorized });
  for (const cat of categories) {
    grouped.push({
      cat,
      children: channels.filter(c => c.parent_id === cat.id).sort((a, b) => a.position - b.position),
    });
  }

  return (
    <div className="space-y-4">
      {error   && <ErrorBanner   msg={error}   onDismiss={() => setError('')}   />}
      {success && <SuccessBanner msg={success} onDismiss={() => setSuccess('')} />}

      <div className="flex items-center justify-between">
        <span className="text-sm text-white/40">{channels.length} kanałów · {categories.length} kategorii</span>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2 text-white/40 hover:text-white border border-white/10 rounded-lg transition-colors" title="Odśwież z Discorda">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCreate(s => !s)}
            className="flex items-center gap-1.5 bg-[#30d158] hover:bg-[#28b84a] text-black font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Nowy kanał
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#0f1923] border border-[#30d158]/30 rounded-xl p-4 space-y-3">
          <div className="text-sm font-semibold text-[#30d158]">Utwórz nowy kanał</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Nazwa *</label>
              <input className={inp} value={newForm.name}
                onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                placeholder="np. ogólny" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Typ</label>
              <select className={inp + ' cursor-pointer'} value={newForm.type}
                onChange={e => setNewForm(f => ({ ...f, type: parseInt(e.target.value) }))}>
                {Object.entries(CHANNEL_TYPE_LABEL).map(([v, l]) => (
                  <option key={v} value={v} className="bg-[#0f1923]">{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Kategoria</label>
              <select className={inp + ' cursor-pointer'} value={newForm.parent_id}
                onChange={e => setNewForm(f => ({ ...f, parent_id: e.target.value }))}>
                <option value="" className="bg-[#0f1923]">— bez kategorii —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#0f1923]">{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Opis kanału</label>
              <input className={inp} value={newForm.topic}
                onChange={e => setNewForm(f => ({ ...f, topic: e.target.value }))}
                placeholder="Opcjonalny opis" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs text-white/50 border border-white/10 rounded-lg hover:text-white">Anuluj</button>
            <button onClick={createChannel} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#30d158] text-black font-semibold rounded-lg disabled:opacity-50">
              <Plus className="w-3.5 h-3.5" />{loading ? 'Tworzę...' : 'Utwórz'}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#0f1923] border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4">
            <div className="text-red-400 font-semibold mb-2">⚠️ Usunąć kanał?</div>
            <p className="text-white/60 text-sm mb-5">Ta akcja jest nieodwracalna i usunie kanał z Discorda.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDelConfirm(null)} className="px-4 py-2 text-sm text-white/60 border border-white/10 rounded-lg">Anuluj</button>
              <button onClick={() => deleteChannel(delConfirm)} disabled={loading}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg disabled:opacity-50">
                Usuń z Discorda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channel tree */}
      <div className="space-y-2">
        {grouped.map(({ cat, children }) => (
          <div key={cat?.id ?? '_root'} className="bg-[#0a0f18] border border-white/5 rounded-xl overflow-hidden">
            {/* Category header */}
            {cat && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/3 border-b border-white/5">
                <button onClick={() => setCollapsed(s => { const n = new Set(s); n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id); return n; })}
                  className="text-white/40 hover:text-white transition-colors">
                  {collapsed.has(cat.id) ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <Folder className="w-3.5 h-3.5 text-white/50" />
                {editId === cat.id ? (
                  <input className="flex-1 bg-white/10 rounded px-2 py-0.5 text-sm text-white focus:outline-none"
                    value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                ) : (
                  <span className="flex-1 text-sm font-semibold text-white/80 uppercase tracking-wider text-xs">{cat.name}</span>
                )}
                <div className="flex items-center gap-1">
                  {editId === cat.id ? (
                    <>
                      <button onClick={saveEdit} disabled={loading} className="p-1 text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditId(null)} className="p-1 text-white/40 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(cat)} className="p-1 text-white/30 hover:text-white transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDelConfirm(cat.id)} className="p-1 text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Channels in this category */}
            {!collapsed.has(cat?.id ?? '') && (
              <div className="divide-y divide-white/3">
                {children.map(ch => (
                  <div key={ch.id} className="flex items-center gap-2 px-4 py-2 hover:bg-white/3 transition-colors group">
                    <span className="text-white/30 shrink-0">{CHANNEL_ICON[ch.type] ?? <Hash className="w-3.5 h-3.5" />}</span>

                    {editId === ch.id ? (
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input className={inp} value={editForm.name ?? ''}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Nazwa" />
                        <input className={inp} value={editForm.topic ?? ''}
                          onChange={e => setEditForm(f => ({ ...f, topic: e.target.value }))} placeholder="Opis (topic)" />
                        {ch.type === 2 && (
                          <>
                            <input className={inp} type="number" value={editForm.bitrate ?? 64000}
                              onChange={e => setEditForm(f => ({ ...f, bitrate: parseInt(e.target.value) }))} placeholder="Bitrate" />
                            <input className={inp} type="number" min={0} max={99} value={editForm.user_limit ?? 0}
                              onChange={e => setEditForm(f => ({ ...f, user_limit: parseInt(e.target.value) }))} placeholder="Limit użytkowników (0=brak)" />
                          </>
                        )}
                        {(ch.type === 0 || ch.type === 5) && (
                          <input className={inp} type="number" min={0} max={21600} value={editForm.rate_limit_per_user ?? 0}
                            onChange={e => setEditForm(f => ({ ...f, rate_limit_per_user: parseInt(e.target.value) }))} placeholder="Slowmode (sek)" />
                        )}
                        <select className={inp + ' cursor-pointer'} value={editForm.parent_id ?? ''}
                          onChange={e => setEditForm(f => ({ ...f, parent_id: e.target.value || null }))}>
                          <option value="" className="bg-[#0f1923]">— bez kategorii —</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id} className="bg-[#0f1923]">{c.name}</option>
                          ))}
                        </select>
                        <label className="flex items-center gap-1.5 text-xs text-white/50 cursor-pointer">
                          <input type="checkbox" checked={editForm.nsfw ?? false}
                            onChange={e => setEditForm(f => ({ ...f, nsfw: e.target.checked }))} className="accent-[#30d158]" />
                          NSFW
                        </label>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white/80">{ch.name}</span>
                        {ch.topic && <span className="ml-2 text-xs text-white/30 truncate">{ch.topic}</span>}
                        {ch.type === 2 && ch.bitrate && <span className="ml-2 text-xs text-white/25">{Math.round(ch.bitrate / 1000)}kbps</span>}
                        {(ch.rate_limit_per_user ?? 0) > 0 && <span className="ml-2 text-xs text-yellow-400/60">⏱ {ch.rate_limit_per_user}s</span>}
                        {ch.nsfw && <span className="ml-1 text-xs text-red-400/60">NSFW</span>}
                      </div>
                    )}

                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editId === ch.id ? (
                        <>
                          <button onClick={saveEdit} disabled={loading} className="p-1 text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditId(null)} className="p-1 text-white/40 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(ch)} className="p-1 text-white/30 hover:text-white transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDelConfirm(ch.id)} className="p-1 text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {children.length === 0 && (
                  <div className="px-8 py-2 text-xs text-white/20 italic">— brak kanałów w tej kategorii —</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Role ────────────────────────────────────────────────────────────────

function RolesTab({ roles: initial, onRefresh }: { roles: DiscordRole[]; onRefresh: () => void }) {
  const [roles, setRoles]     = useState<DiscordRole[]>(initial);
  const [editId, setEditId]   = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DiscordRole & { colorHex: string }>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', colorHex: '#5865f2', hoist: false, mentionable: false });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [delConfirm, setDelConfirm] = useState<string | null>(null);

  function startEdit(r: DiscordRole) {
    setEditId(r.id);
    setEditForm({ name: r.name, colorHex: intToHex(r.color), hoist: r.hoist, mentionable: r.mentionable });
  }

  async function saveEdit() {
    if (!editId) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/serwer/role/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        editForm.name,
          color:       hexToInt(editForm.colorHex ?? '#000000'),
          hoist:       editForm.hoist,
          mentionable: editForm.mentionable,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoles(prev => prev.map(r => r.id === editId ? { ...r, ...data } : r));
      setEditId(null);
      setSuccess(`Rola @${data.name} zaktualizowana!`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd zapisu');
    } finally { setLoading(false); }
  }

  async function deleteRole(id: string) {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/serwer/role/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setRoles(prev => prev.filter(r => r.id !== id));
      setDelConfirm(null);
      setSuccess('Rola usunięta');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd usuwania');
    } finally { setLoading(false); }
  }

  async function createRole() {
    if (!newForm.name.trim()) { setError('Nazwa roli jest wymagana'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/serwer/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        newForm.name,
          color:       hexToInt(newForm.colorHex),
          hoist:       newForm.hoist,
          mentionable: newForm.mentionable,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoles(prev => [data, ...prev]);
      setShowCreate(false);
      setNewForm({ name: '', colorHex: '#5865f2', hoist: false, mentionable: false });
      setSuccess(`Rola @${data.name} utworzona!`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd tworzenia');
    } finally { setLoading(false); }
  }

  const inp = "bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-sm focus:outline-none focus:border-[#30d158]/50";

  return (
    <div className="space-y-4">
      {error   && <ErrorBanner   msg={error}   onDismiss={() => setError('')}   />}
      {success && <SuccessBanner msg={success} onDismiss={() => setSuccess('')} />}

      <div className="flex items-center justify-between">
        <span className="text-sm text-white/40">{roles.length} ról</span>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2 text-white/40 hover:text-white border border-white/10 rounded-lg transition-colors" title="Odśwież">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCreate(s => !s)}
            className="flex items-center gap-1.5 bg-[#30d158] hover:bg-[#28b84a] text-black font-semibold text-sm px-3 py-1.5 rounded-lg">
            <Plus className="w-4 h-4" /> Nowa rola
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-[#0f1923] border border-[#30d158]/30 rounded-xl p-4 space-y-3">
          <div className="text-sm font-semibold text-[#30d158]">Utwórz nową rolę</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Nazwa *</label>
              <input className={inp + ' w-full'} value={newForm.name}
                onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="np. Gracz" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Kolor</label>
              <div className="flex items-center gap-2">
                <input type="color" value={newForm.colorHex}
                  onChange={e => setNewForm(f => ({ ...f, colorHex: e.target.value }))}
                  className="w-10 h-9 rounded cursor-pointer bg-transparent border-0" />
                <input className={inp + ' flex-1'} value={newForm.colorHex}
                  onChange={e => setNewForm(f => ({ ...f, colorHex: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
              <input type="checkbox" checked={newForm.hoist} onChange={e => setNewForm(f => ({ ...f, hoist: e.target.checked }))} className="accent-[#30d158]" />
              Wyodrębnij na liście (hoist)
            </label>
            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
              <input type="checkbox" checked={newForm.mentionable} onChange={e => setNewForm(f => ({ ...f, mentionable: e.target.checked }))} className="accent-[#30d158]" />
              Można wspomnieć (@)
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm text-white/50 border border-white/10 rounded-lg">Anuluj</button>
            <button onClick={createRole} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#30d158] text-black font-semibold rounded-lg disabled:opacity-50">
              <Plus className="w-4 h-4" />{loading ? 'Tworzę...' : 'Utwórz'}
            </button>
          </div>
        </div>
      )}

      {delConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#0f1923] border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4">
            <div className="text-red-400 font-semibold mb-2">⚠️ Usunąć rolę?</div>
            <p className="text-white/60 text-sm mb-5">Rola zostanie trwale usunięta z serwera Discord i odebrana wszystkim członkom.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDelConfirm(null)} className="px-4 py-2 text-sm border border-white/10 text-white/60 rounded-lg">Anuluj</button>
              <button onClick={() => deleteRole(delConfirm)} disabled={loading}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg disabled:opacity-50">
                Usuń rolę
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {roles.map(role => (
          <div key={role.id} className="flex items-center gap-3 px-4 py-2.5 bg-[#0a0f18] border border-white/5 rounded-xl hover:bg-white/3 transition-colors group">
            {/* Color circle */}
            <div className="w-4 h-4 rounded-full shrink-0 border border-white/10"
              style={{ background: role.color ? intToHex(role.color) : '#99aab5' }} />

            {editId === role.id ? (
              <div className="flex-1 grid grid-cols-3 gap-2 items-center">
                <input className={inp + ' w-full'} value={editForm.name ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                <div className="flex items-center gap-1.5">
                  <input type="color" value={editForm.colorHex ?? '#000000'}
                    onChange={e => setEditForm(f => ({ ...f, colorHex: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
                  <input className={inp + ' flex-1 text-xs'} value={editForm.colorHex ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, colorHex: e.target.value }))} />
                </div>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 text-xs text-white/50 cursor-pointer">
                    <input type="checkbox" checked={editForm.hoist ?? false} onChange={e => setEditForm(f => ({ ...f, hoist: e.target.checked }))} className="accent-[#30d158]" /> Hoist
                  </label>
                  <label className="flex items-center gap-1 text-xs text-white/50 cursor-pointer">
                    <input type="checkbox" checked={editForm.mentionable ?? false} onChange={e => setEditForm(f => ({ ...f, mentionable: e.target.checked }))} className="accent-[#30d158]" /> @
                  </label>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="text-sm font-medium text-white/90" style={{ color: role.color ? intToHex(role.color) : undefined }}>
                  {role.name}
                </span>
                <div className="flex gap-1.5">
                  {role.hoist       && <span className="text-xs bg-white/8 text-white/40 px-1.5 py-0.5 rounded">hoist</span>}
                  {role.mentionable && <span className="text-xs bg-white/8 text-white/40 px-1.5 py-0.5 rounded">@</span>}
                  {role.managed     && <span className="text-xs bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded">bot</span>}
                </div>
                <span className="text-xs text-white/20 ml-auto shrink-0">pos. {role.position}</span>
              </div>
            )}

            <div className={`flex items-center gap-1 shrink-0 ${editId === role.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
              {editId === role.id ? (
                <>
                  <button onClick={saveEdit} disabled={loading} className="p-1.5 text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditId(null)} className="p-1.5 text-white/40 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                </>
              ) : role.managed ? null : (
                <>
                  <button onClick={() => startEdit(role)} className="p-1.5 text-white/30 hover:text-white transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDelConfirm(role.id)} className="p-1.5 text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'info',    label: 'Informacje', icon: Settings },
  { id: 'kanaly',  label: 'Kanały',     icon: Hash     },
  { id: 'role',    label: 'Role',       icon: Shield   },
  { id: 'members', label: 'Członkowie', icon: Users    },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ServerManager({
  initialGuild,
  initialChannels,
  initialRoles,
  error: initialError,
}: {
  initialGuild:    DiscordGuild | null;
  initialChannels: unknown[];
  initialRoles:    unknown[];
  error:           string | null;
}) {
  const [tab, setTab]         = useState<TabId>('info');
  const [guild, setGuild]     = useState<DiscordGuild | null>(initialGuild);
  const [channels, setChannels] = useState<DiscordChannel[]>(initialChannels as DiscordChannel[]);
  const [roles, setRoles]     = useState<DiscordRole[]>(initialRoles as DiscordRole[]);
  const [error, setError]     = useState(initialError ?? '');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (which: 'all' | 'kanaly' | 'role' = 'all') => {
    setRefreshing(true);
    try {
      if (which === 'all' || which === 'kanaly') {
        const r = await fetch('/api/serwer/kanaly');
        if (r.ok) setChannels(await r.json());
      }
      if (which === 'all' || which === 'role') {
        const r = await fetch('/api/serwer/role');
        if (r.ok) setRoles(await r.json());
      }
      if (which === 'all') {
        const r = await fetch('/api/serwer/info');
        if (r.ok) setGuild(await r.json());
      }
    } catch {
      setError('Błąd odświeżania danych z Discorda');
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (!guild && error) {
    return (
      <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-8 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <div className="text-red-400 font-semibold mb-1">Nie można połączyć z Discord API</div>
        <div className="text-white/50 text-sm">{error}</div>
        <p className="text-white/30 text-xs mt-3">
          Upewnij się że DISCORD_BOT_TOKEN i DISCORD_GUILD_ID są ustawione w Vercel → Settings → Environment Variables
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Discord sync note */}
      <div className="flex items-center gap-3 bg-blue-500/8 border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-blue-300">
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
        <span>Każda zmiana jest natychmiast aplikowana na serwer Discord przez Bot Token. Bot Token jest przechowywany w zmiennych środowiskowych — nie potrzebujesz go podawać.</span>
        <button onClick={() => refresh('all')} disabled={refreshing}
          className="ml-auto shrink-0 p-1.5 rounded-lg hover:bg-blue-500/20 transition-colors" title="Odśwież z Discorda">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium flex-1 justify-center transition-all ${
                tab === t.id
                  ? 'bg-[#0f1923] text-white shadow-sm border border-white/8'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'info' && guild && (
          <GuildTab guild={guild} onSave={setGuild} />
        )}
        {tab === 'kanaly' && (
          <ChannelsTab channels={channels} onRefresh={() => refresh('kanaly')} />
        )}
        {tab === 'role' && (
          <RolesTab roles={roles} onRefresh={() => refresh('role')} />
        )}
        {tab === 'members' && guild && (
          <div className="text-center py-16 space-y-3">
            <Users className="w-12 h-12 text-white/20 mx-auto" />
            <div className="text-white/50">Zarządzanie członkami</div>
            <div className="flex justify-center gap-6 text-sm">
              <div className="bg-[#0a0f18] border border-white/8 rounded-xl px-6 py-4 text-center">
                <div className="text-2xl font-black text-[#30d158]">{guild.approximate_member_count?.toLocaleString('pl-PL')}</div>
                <div className="text-xs text-white/40 mt-1">Wszystkich członków</div>
              </div>
              <div className="bg-[#0a0f18] border border-white/8 rounded-xl px-6 py-4 text-center">
                <div className="text-2xl font-black text-green-400">{guild.approximate_presence_count?.toLocaleString('pl-PL')}</div>
                <div className="text-xs text-white/40 mt-1">Teraz online</div>
              </div>
            </div>
            <p className="text-white/25 text-xs max-w-sm mx-auto">
              Szczegółowe zarządzanie członkami (nadawanie ról, kickowanie, banowanie) dostępne jest przez komendy bota na Discordzie.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
