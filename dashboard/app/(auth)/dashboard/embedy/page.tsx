'use client';

import { useState, useEffect } from 'react';
import { Send, RefreshCw, CheckCircle, XCircle, Hash } from 'lucide-react';

interface EmbedDef {
  id: string;
  title: string;
  hasButton: boolean;
}

interface Channel {
  id: string;
  name: string;
  type: number;
  parent_id: string | null;
  position: number;
}

interface Category {
  id: string;
  name: string;
  channels: Channel[];
}

interface SendResult {
  embedId: string;
  channelId: string;
  ok: boolean;
  error?: string;
}

export default function EmbedsPage() {
  const [embeds, setEmbeds] = useState<EmbedDef[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);

  // Per-embed selected channel
  const [selections, setSelections] = useState<Record<string, string>>({});
  // Sending state per embed
  const [sending, setSending] = useState<Record<string, boolean>>({});
  // Results per embed
  const [results, setResults] = useState<Record<string, SendResult>>({});

  // Load embeds list
  useEffect(() => {
    fetch('/api/discord/send-embed')
      .then(r => r.json())
      .then(setEmbeds)
      .catch(console.error);
  }, []);

  // Load channels
  const loadChannels = () => {
    setLoadingChannels(true);
    fetch('/api/discord/channels')
      .then(r => r.json())
      .then((data: Channel[]) => {
        // Filter text channels (type 0) and sort
        const textChannels = data
          .filter(c => c.type === 0)
          .sort((a, b) => a.position - b.position);

        const cats = data
          .filter(c => c.type === 4)
          .sort((a, b) => a.position - b.position);

        const grouped: Category[] = cats.map(cat => ({
          id: cat.id,
          name: cat.name,
          channels: textChannels.filter(c => c.parent_id === cat.id),
        }));

        // Channels without category
        const uncategorized = textChannels.filter(c => !c.parent_id);
        if (uncategorized.length > 0) {
          grouped.unshift({ id: '__none', name: 'Bez kategorii', channels: uncategorized });
        }

        setCategories(grouped);
        setLoadingChannels(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingChannels(false);
      });
  };

  useEffect(() => { loadChannels(); }, []);

  const setChannel = (embedId: string, channelId: string) => {
    setSelections(prev => ({ ...prev, [embedId]: channelId }));
    // Clear previous result when changing channel
    setResults(prev => {
      const next = { ...prev };
      delete next[embedId];
      return next;
    });
  };

  const sendEmbed = async (embedId: string) => {
    const channelId = selections[embedId];
    if (!channelId) return;

    setSending(prev => ({ ...prev, [embedId]: true }));
    setResults(prev => {
      const next = { ...prev };
      delete next[embedId];
      return next;
    });

    try {
      const res = await fetch('/api/discord/send-embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embedId, channelId }),
      });
      const data = await res.json();
      setResults(prev => ({
        ...prev,
        [embedId]: { embedId, channelId, ok: data.ok === true, error: data.error },
      }));
    } catch (err) {
      setResults(prev => ({
        ...prev,
        [embedId]: { embedId, channelId, ok: false, error: String(err) },
      }));
    } finally {
      setSending(prev => ({ ...prev, [embedId]: false }));
    }
  };

  // Find channel name by id
  const getChannelName = (channelId: string) => {
    for (const cat of categories) {
      const ch = cat.channels.find(c => c.id === channelId);
      if (ch) return ch.name;
    }
    return channelId;
  };

  return (
    <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f4f4f8', margin: 0 }}>
          Wysyłanie Embedów
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 6, fontSize: 14 }}>
          Wyślij dowolny embed na wybrany kanał Discord
        </p>
      </div>

      {/* Channels loading */}
      {loadingChannels && (
        <div style={{
          background: '#16161d',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 24,
          color: 'rgba(255,255,255,0.4)',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
          Ładowanie listy kanałów...
        </div>
      )}

      {/* Embed cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {embeds.map(embed => {
          const selected = selections[embed.id] ?? '';
          const isSending = sending[embed.id] ?? false;
          const result = results[embed.id];

          return (
            <div
              key={embed.id}
              style={{
                background: '#16161d',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              {/* Embed name */}
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#f4f4f8', fontSize: 14 }}>
                  {embed.title}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {embed.hasButton ? 'z przyciskiem' : 'tylko tekst'}
                  {' · '}
                  <code style={{ fontSize: 11 }}>{embed.id}</code>
                </div>
              </div>

              {/* Channel selector */}
              <div style={{ flex: '2 1 260px', minWidth: 0 }}>
                <select
                  value={selected}
                  onChange={e => setChannel(embed.id, e.target.value)}
                  disabled={loadingChannels}
                  style={{
                    width: '100%',
                    background: '#0c0c10',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 7,
                    color: selected ? '#f4f4f8' : 'rgba(255,255,255,0.3)',
                    padding: '8px 12px',
                    fontSize: 13,
                    outline: 'none',
                    cursor: loadingChannels ? 'not-allowed' : 'pointer',
                  }}
                >
                  <option value="" disabled>— wybierz kanał —</option>
                  {categories.map(cat => (
                    <optgroup key={cat.id} label={cat.name.toUpperCase()}>
                      {cat.channels.map(ch => (
                        <option key={ch.id} value={ch.id}>
                          # {ch.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Send button */}
              <button
                onClick={() => sendEmbed(embed.id)}
                disabled={!selected || isSending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  background: selected && !isSending ? '#5865F2' : 'rgba(255,255,255,0.06)',
                  color: selected && !isSending ? '#fff' : 'rgba(255,255,255,0.3)',
                  border: 'none',
                  borderRadius: 7,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: selected && !isSending ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {isSending
                  ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Wysyłam...</>
                  : <><Send size={14} /> Wyślij</>
                }
              </button>

              {/* Result */}
              {result && (
                <div style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 4,
                  padding: '8px 12px',
                  borderRadius: 7,
                  background: result.ok
                    ? 'rgba(87,242,135,0.08)'
                    : 'rgba(237,66,69,0.08)',
                  border: `1px solid ${result.ok ? 'rgba(87,242,135,0.2)' : 'rgba(237,66,69,0.2)'}`,
                  fontSize: 13,
                }}>
                  {result.ok
                    ? <><CheckCircle size={14} color="#57F287" />
                        <span style={{ color: '#57F287' }}>
                          Wysłano na <strong>#{getChannelName(result.channelId)}</strong>
                        </span>
                      </>
                    : <><XCircle size={14} color="#ED4245" />
                        <span style={{ color: '#ED4245' }}>
                          Błąd: {result.error}
                        </span>
                      </>
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Refresh channels */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={loadChannels}
          disabled={loadingChannels}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 7,
            color: 'rgba(255,255,255,0.4)',
            padding: '7px 14px',
            fontSize: 12,
            cursor: loadingChannels ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={12} />
          Odśwież listę kanałów
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { background: #16161d; color: #f4f4f8; }
        select optgroup { background: #0c0c10; color: rgba(255,255,255,0.4); }
      `}</style>
    </div>
  );
}
