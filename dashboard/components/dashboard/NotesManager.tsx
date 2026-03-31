'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Note = {
  id: string;
  content: string;
  createdAt: string | Date;
  target: { discordId: string; discordUsername: string };
  author: { discordId: string; discordUsername: string };
};

interface Props {
  initialNotes: Note[];
  total: number;
  page: number;
  totalPages: number;
  q: string;
}

export default function NotesManager({ initialNotes, total, page, totalPages, q }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [search, setSearch] = useState(q);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ targetDiscordId: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function goSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/dashboard/notatki?q=${encodeURIComponent(search)}&page=1`);
  }

  async function handleAdd() {
    if (!form.targetDiscordId.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const note: Note = await res.json();
        setNotes(prev => [note, ...prev]);
        setForm({ targetDiscordId: '', content: '' });
        setAddOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setNotes(prev => prev.filter(n => n.id !== id));
      setDeleteId(null);
    }
  }

  function formatDate(d: string | Date) {
    return new Date(d).toLocaleString('pl-PL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <form onSubmit={goSearch} className="flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj (gracz, autor, treść...)"
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button type="submit" className="bg-secondary hover:bg-secondary/70 border border-border px-3 py-2 rounded-md text-sm">
            Szukaj
          </button>
        </form>
        <button
          onClick={() => setAddOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
        >
          + Dodaj notatkę
        </button>
      </div>

      {/* Add modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setAddOpen(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">📝 Nowa notatka</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Discord ID gracza</label>
                <input
                  value={form.targetDiscordId}
                  onChange={e => setForm(f => ({ ...f, targetDiscordId: e.target.value }))}
                  placeholder="np. 123456789012345678"
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Treść notatki</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={4}
                  maxLength={500}
                  placeholder="Wpisz notatkę..."
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground text-right">{form.content.length}/500</p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAdd}
                disabled={saving || !form.targetDiscordId || !form.content}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
              >
                {saving ? 'Zapisuję...' : 'Dodaj'}
              </button>
              <button
                onClick={() => setAddOpen(false)}
                className="flex-1 bg-secondary border border-border px-4 py-2 rounded-md text-sm hover:bg-secondary/70"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2">🗑️ Usuń notatkę?</h2>
            <p className="text-sm text-muted-foreground mb-4">Tej akcji nie można cofnąć.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 bg-destructive text-destructive-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-destructive/90"
              >
                Usuń
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 bg-secondary border border-border px-4 py-2 rounded-md text-sm"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes table */}
      {notes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Brak notatek{q ? ` dla „${q}"` : ''}.</div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="bg-card border border-border rounded-lg p-4 flex gap-4 items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-medium">👤 {note.target.discordUsername}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">autor: {note.author.discordUsername}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{formatDate(note.createdAt)}</span>
                  <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                    {note.id.slice(-8)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>
              </div>
              <button
                onClick={() => setDeleteId(note.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors text-sm"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <a
              key={p}
              href={`/dashboard/notatki?q=${encodeURIComponent(q)}&page=${p}`}
              className={`px-3 py-1 rounded text-sm ${p === page ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/70'}`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
