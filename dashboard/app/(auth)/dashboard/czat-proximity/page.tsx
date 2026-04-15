'use client';
// /dashboard/czat-proximity — Zarządzanie lokacjami Proximity Chat
// Dostęp: OWNER only

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

interface Location {
  id: string;
  name: string;
  emoji: string;
  description?: string;
}

interface ProxMsg {
  id: string;
  locationId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
}

export default function CzatProximityPage() {
  const { data: session } = useSession();
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ProxMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [editMode, setEditMode] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Location | null>(null);
  const [form, setForm] = useState({ id: '', name: '', emoji: '', description: '' });

  if ((session?.user as { accessLevel?: number } | undefined)?.accessLevel !== undefined &&
      (session?.user as { accessLevel?: number }).accessLevel! < 4) {
    redirect('/dashboard');
  }

  const loadLocations = useCallback(async () => {
    try {
      const data = await fetch('/api/cad/proximity-chat/locations').then(r => r.json());
      setLocations(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async (locationId: string) => {
    try {
      const data: ProxMsg[] = await fetch(`/api/cad/proximity-chat?location=${locationId}`).then(r => r.json());
      setMessages(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadLocations(); }, [loadLocations]);

  useEffect(() => {
    if (activeLocation) {
      loadMessages(activeLocation);
      const iv = setInterval(() => loadMessages(activeLocation), 5000);
      return () => clearInterval(iv);
    }
  }, [activeLocation, loadMessages]);

  async function saveLocation() {
    setSaving(true);
    setMsg('');
    try {
      const method = editMode === 'add' ? 'POST' : 'PUT';
      const res = await fetch('/api/cad/proximity-chat/locations', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(`❌ ${data.error}`);
      } else {
        setMsg('✅ Lokacja zapisana!');
        setEditMode(null);
        setForm({ id: '', name: '', emoji: '', description: '' });
        await loadLocations();
      }
    } finally { setSaving(false); }
  }

  async function deleteLocation(id: string) {
    if (!confirm(`Usunąć lokację "${id}"? Wszystkie wiadomości zostaną usunięte.`)) return;
    const res = await fetch(`/api/cad/proximity-chat/locations?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      if (activeLocation === id) setActiveLocation(null);
      await loadLocations();
    }
  }

  function startEdit(loc: Location) {
    setEditTarget(loc);
    setForm({ id: loc.id, name: loc.name, emoji: loc.emoji, description: loc.description ?? '' });
    setEditMode('edit');
  }

  function startAdd() {
    setEditTarget(null);
    setForm({ id: '', name: '', emoji: '📍', description: '' });
    setEditMode('add');
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">💬 Czat Proximity</h1>
          <p className="text-sm text-muted-foreground mt-1">Zarządzaj lokacjami i wiadomościami czatu proximity w CAD</p>
        </div>
        <button
          onClick={startAdd}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Dodaj lokację
        </button>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.startsWith('✅') ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
          {msg}
        </div>
      )}

      {/* Edit / Add form */}
      {editMode && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-foreground mb-4">{editMode === 'add' ? 'Dodaj nową lokację' : `Edytuj: ${editTarget?.name}`}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">ID lokacji *</label>
              <input
                value={form.id}
                onChange={e => setForm(f => ({ ...f, id: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                disabled={editMode === 'edit'}
                placeholder="np. centrum, lotnisko"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Emoji *</label>
              <input
                value={form.emoji}
                onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                placeholder="🏙️"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Nazwa *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Centrum Greenville"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Opis (opcjonalnie)</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Główne centrum miasta..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveLocation}
              disabled={saving || !form.id || !form.name || !form.emoji}
              className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
            >
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
            <button
              onClick={() => { setEditMode(null); setMsg(''); }}
              className="bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 rounded-lg text-sm font-medium"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Location list */}
        <div className="col-span-1 space-y-2">
          <h2 className="text-sm font-semibold text-foreground mb-3">Lokacje ({locations.length})</h2>
          {loading && <div className="text-sm text-muted-foreground">Ładowanie...</div>}
          {locations.map(loc => (
            <div
              key={loc.id}
              className={`bg-card border rounded-lg p-3 cursor-pointer transition-colors ${activeLocation === loc.id ? 'border-primary bg-primary/10' : 'border-border hover:border-border/80'}`}
              onClick={() => setActiveLocation(loc.id)}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{loc.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">{loc.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{loc.id}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); startEdit(loc); }}
                    className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-accent"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteLocation(loc.id); }}
                    className="text-xs text-muted-foreground hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-red-500/10"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              {loc.description && (
                <div className="text-[11px] text-muted-foreground mt-1 pl-8 truncate">{loc.description}</div>
              )}
            </div>
          ))}
          {!loading && locations.length === 0 && (
            <div className="text-sm text-muted-foreground py-4 text-center">Brak lokacji. Dodaj pierwszą!</div>
          )}
        </div>

        {/* Message preview */}
        <div className="col-span-2">
          {activeLocation ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden h-full flex flex-col" style={{ minHeight: '400px' }}>
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{locations.find(l => l.id === activeLocation)?.emoji}</span>
                  <span className="font-semibold text-sm text-foreground">
                    {locations.find(l => l.id === activeLocation)?.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{messages.length} wiadomości</span>
                  <button
                    onClick={() => loadMessages(activeLocation)}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    Odśwież
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8 text-sm">Brak wiadomości w tej lokacji</div>
                )}
                {messages.map(m => (
                  <div key={m.id} className="flex gap-3 text-sm">
                    <div className="text-xs text-muted-foreground flex-shrink-0 font-mono mt-0.5">
                      {new Date(m.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">{m.username}</span>
                      <span className="text-muted-foreground mx-1">·</span>
                      <span className="text-foreground/80">{m.content}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
                Wiadomości wygasają po 60 minutach · TTL zarządzane przez API
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center h-full flex items-center justify-center">
              <div>
                <div className="text-4xl mb-3">💬</div>
                <div className="text-sm text-muted-foreground">Wybierz lokację z listy, aby podejrzeć wiadomości</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-foreground">{locations.length}</div>
          <div className="text-sm text-muted-foreground">Lokacje</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-foreground">60 min</div>
          <div className="text-sm text-muted-foreground">TTL wiadomości</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-foreground">100</div>
          <div className="text-sm text-muted-foreground">Max wiad. / lokacja</div>
        </div>
      </div>
    </div>
  );
}
