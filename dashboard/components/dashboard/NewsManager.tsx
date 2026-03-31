'use client';

import { useState } from 'react';
import { Plus, Trash2, Pin, PinOff, Eye, EyeOff, Pencil, X, Check, Newspaper } from 'lucide-react';

type NewsItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  imageUrl: string | null;
  published: boolean;
  pinned: boolean;
  createdAt: string | Date;
  author: { discordUsername: string };
};

const CATEGORIES = ['Ogłoszenie', 'Sesja', 'Aktualizacja', 'Ważne', 'Rekrutacja', 'Wydarzenie'];

const categoryColor: Record<string, string> = {
  Ogłoszenie:  'bg-blue-500/20 text-blue-300',
  Sesja:       'bg-green-500/20 text-green-300',
  Aktualizacja:'bg-purple-500/20 text-purple-300',
  Ważne:       'bg-red-500/20 text-red-300',
  Rekrutacja:  'bg-yellow-500/20 text-yellow-300',
  Wydarzenie:  'bg-cyan-500/20 text-cyan-300',
};

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function NewsManager({
  initialNews,
  canDelete,
}: {
  initialNews: NewsItem[];
  canDelete: boolean;
}) {
  const [news, setNews] = useState<NewsItem[]>(initialNews);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<NewsItem | null>(null);
  const [delConfirm, setDelConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // form state
  const [form, setForm] = useState({
    title: '', content: '', category: 'Ogłoszenie', imageUrl: '', pinned: false,
  });

  function openCreate() {
    setEditItem(null);
    setForm({ title: '', content: '', category: 'Ogłoszenie', imageUrl: '', pinned: false });
    setError('');
    setShowForm(true);
  }

  function openEdit(item: NewsItem) {
    setEditItem(item);
    setForm({
      title: item.title,
      content: item.content,
      category: item.category,
      imageUrl: item.imageUrl ?? '',
      pinned: item.pinned,
    });
    setError('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError('Tytuł i treść są wymagane.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (editItem) {
        const res = await fetch(`/api/news/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, imageUrl: form.imageUrl || null }),
        });
        if (!res.ok) throw new Error('Błąd zapisu');
        const updated = await res.json();
        setNews(prev => prev.map(n => n.id === updated.id ? { ...n, ...updated } : n));
      } else {
        const res = await fetch('/api/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, imageUrl: form.imageUrl || null }),
        });
        if (!res.ok) throw new Error('Błąd tworzenia');
        const created = await res.json();
        setNews(prev => [created, ...prev]);
      }
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    } finally {
      setLoading(false);
    }
  }

  async function togglePublish(item: NewsItem) {
    const res = await fetch(`/api/news/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !item.published }),
    });
    if (res.ok) {
      setNews(prev => prev.map(n => n.id === item.id ? { ...n, published: !item.published } : n));
    }
  }

  async function togglePin(item: NewsItem) {
    const res = await fetch(`/api/news/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !item.pinned }),
    });
    if (res.ok) {
      setNews(prev => prev.map(n => n.id === item.id ? { ...n, pinned: !item.pinned } : n));
    }
  }

  async function handleDelete(id: string) {
    setLoading(true);
    const res = await fetch(`/api/news/${id}`, { method: 'DELETE' });
    if (res.ok) setNews(prev => prev.filter(n => n.id !== id));
    setDelConfirm(null);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-white/50 text-sm">{news.length} wpisów</span>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#30d158] hover:bg-[#28b84a] text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Dodaj news
        </button>
      </div>

      {/* Create/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1923] border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="text-white font-semibold text-lg">
                {editItem ? 'Edytuj news' : 'Nowy news'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-white/60 text-xs mb-1">Tytuł *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#30d158]"
                  placeholder="Np. Nowa sesja w tę sobotę!"
                  maxLength={120}
                />
              </div>

              <div>
                <label className="block text-white/60 text-xs mb-1">Treść *</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={5}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#30d158] resize-none"
                  placeholder="Treść ogłoszenia..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/60 text-xs mb-1">Kategoria</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#30d158]"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c} className="bg-[#0f1923]">{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/60 text-xs mb-1">URL obrazka (opcjonalnie)</label>
                  <input
                    value={form.imageUrl}
                    onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#30d158]"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
                  className="accent-[#30d158]"
                />
                Przypnij na górze (pinned)
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-white/60 hover:text-white border border-white/10 rounded-lg"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-[#30d158] hover:bg-[#28b84a] text-black font-semibold rounded-lg disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {loading ? 'Zapisywanie...' : 'Zapisz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {delConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1923] border border-white/10 rounded-xl p-6 max-w-sm w-full">
            <p className="text-white text-center mb-5">Na pewno usunąć ten news?</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDelConfirm(null)} className="px-4 py-2 text-sm border border-white/10 text-white/60 rounded-lg hover:text-white">
                Anuluj
              </button>
              <button
                onClick={() => handleDelete(delConfirm)}
                disabled={loading}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg disabled:opacity-50"
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}

      {/* News list */}
      {news.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Brak newsów. Dodaj pierwszy!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {news.map(item => (
            <div
              key={item.id}
              className={`bg-[#0f1923] border rounded-xl p-4 transition-all ${
                item.pinned ? 'border-[#30d158]/40' : 'border-white/8'
              } ${!item.published ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {item.pinned && <Pin className="w-3 h-3 text-[#30d158] shrink-0" />}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor[item.category] ?? 'bg-white/10 text-white/60'}`}>
                      {item.category}
                    </span>
                    {!item.published && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">Ukryty</span>
                    )}
                  </div>
                  <p className="text-white font-semibold text-sm truncate">{item.title}</p>
                  <p className="text-white/50 text-xs mt-0.5 line-clamp-2">{item.content}</p>
                  <p className="text-white/30 text-xs mt-1">
                    {formatDate(item.createdAt)} — {item.author.discordUsername}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => togglePin(item)}
                    title={item.pinned ? 'Odepnij' : 'Przypnij'}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-[#30d158] transition-colors"
                  >
                    {item.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => togglePublish(item)}
                    title={item.published ? 'Ukryj' : 'Opublikuj'}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-yellow-300 transition-colors"
                  >
                    {item.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    title="Edytuj"
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => setDelConfirm(item.id)}
                      title="Usuń"
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {item.imageUrl && (
                <div className="mt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-24 rounded-lg object-cover"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
