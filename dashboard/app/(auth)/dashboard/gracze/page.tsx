'use client';

import { useState, useCallback } from 'react';
import { Search, X, ExternalLink, Car, CreditCard, FileText, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface PlayerRow {
  id: string;
  discordId: string;
  discordUsername: string;
  robloxUsername: string | null;
  robloxId: string | null;
  image: string | null;
  verifiedAt: string | null;
  createdAt: string;
  character: {
    firstName: string;
    lastName: string;
    peselRp: string;
  } | null;
}

interface PlayerProfile {
  user: PlayerRow & {
    vehicles: { id: string; marka: string; model: string; tablica: string; rok: number }[];
    licenses: { id: string; kategoria: string; status: string; issuedAt: string }[];
    casesAsTarget: { id: string; type: string; status: string; createdAt: string }[];
    finesReceived: { id: string; amount: number | null; reason: string; createdAt: string; active: boolean; type: string }[];
  };
}

export default function GraczePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const openProfile = async (id: string) => {
    setSelectedId(id);
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/players/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedId(null);
    setProfile(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Gracze</h1>
        <p className="text-muted-foreground text-sm">Baza danych użytkowników serwera</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Szukaj po nicku Discord lub Roblox…"
            className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Szukam…' : 'Szukaj'}
        </button>
      </div>

      {/* Results */}
      {searched && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-center py-16 text-muted-foreground text-sm">
              Nie znaleziono gracza pasującego do &quot;{query}&quot;.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Avatar</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Discord</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Roblox</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Postać RP</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dołączył</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((player) => (
                    <tr key={player.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        {player.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={player.image}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                            {player.discordUsername[0]?.toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{player.discordUsername}</p>
                        <p className="text-xs text-muted-foreground">{player.discordId}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {player.robloxUsername ?? <span className="italic text-xs">Niezweryfikowany</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {player.character
                          ? `${player.character.firstName} ${player.character.lastName}`
                          : <span className="italic text-xs">Brak postaci</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(player.createdAt), {
                          addSuffix: true,
                          locale: pl,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openProfile(player.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-medium transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Profil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Player profile modal */}
      {selectedId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="font-bold text-lg">Profil gracza</h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {profileLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !profile ? (
              <p className="text-center py-20 text-muted-foreground text-sm">
                Nie udało się załadować profilu.
              </p>
            ) : (
              <div className="p-6 space-y-6">
                {/* User info */}
                <div className="flex items-center gap-4">
                  {profile.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.user.image}
                      alt=""
                      className="w-14 h-14 rounded-full"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-xl font-bold">
                      {profile.user.discordUsername[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg">{profile.user.discordUsername}</h3>
                    <p className="text-muted-foreground text-sm">
                      Roblox: {profile.user.robloxUsername ?? 'Niezweryfikowany'}
                    </p>
                    {profile.user.character && (
                      <p className="text-sm">
                        Postać:{' '}
                        <span className="font-medium">
                          {profile.user.character.firstName} {profile.user.character.lastName}
                        </span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Dołączył:{' '}
                      {format(new Date(profile.user.createdAt), 'dd.MM.yyyy', { locale: pl })}
                    </p>
                  </div>
                </div>

                {/* Sections */}
                <ProfileSection
                  icon={Car}
                  title={`Pojazdy (${profile.user.vehicles.length})`}
                  empty="Brak pojazdów."
                >
                  {profile.user.vehicles.map((v) => (
                    <div key={v.id} className="flex items-center justify-between py-2 text-sm">
                      <span>{v.marka} {v.model} ({v.rok})</span>
                      <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">{v.tablica}</span>
                    </div>
                  ))}
                </ProfileSection>

                <ProfileSection
                  icon={CreditCard}
                  title={`Prawa jazdy (${profile.user.licenses.length})`}
                  empty="Brak praw jazdy."
                >
                  {profile.user.licenses.map((l) => (
                    <div key={l.id} className="flex items-center justify-between py-2 text-sm">
                      <span>Kat. {l.kategoria}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        l.status === 'ACTIVE' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                      }`}>
                        {l.status === 'ACTIVE' ? 'Aktywne' : 'Zawieszone'}
                      </span>
                    </div>
                  ))}
                </ProfileSection>

                <ProfileSection
                  icon={ShieldAlert}
                  title={`Sprawy (${profile.user.casesAsTarget.length})`}
                  empty="Brak spraw."
                >
                  {profile.user.casesAsTarget.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                      <span>{c.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        c.status === 'ACTIVE' ? 'bg-red-500/15 text-red-400' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </ProfileSection>

                <ProfileSection
                  icon={FileText}
                  title={`Mandaty (${profile.user.finesReceived.length})`}
                  empty="Brak mandatów."
                >
                  {profile.user.finesReceived.map((f) => (
                    <div key={f.id} className="flex items-center justify-between py-2 text-sm">
                      <div className="min-w-0 mr-4">
                        <span className="truncate block">{f.reason}</span>
                        <span className="text-xs text-muted-foreground">{f.type}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {f.amount != null && (
                          <span className="font-mono">{f.amount} zł</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          f.active ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'
                        }`}>
                          {f.active ? 'Aktywny' : 'Nieaktywny'}
                        </span>
                      </div>
                    </div>
                  ))}
                </ProfileSection>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileSection({
  icon: Icon,
  title,
  empty,
  children,
}: {
  icon: React.ElementType;
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <div className="bg-secondary/30 rounded-lg px-4 divide-y divide-border">
        {!children || (Array.isArray(children) && children.length === 0) ? (
          <p className="py-3 text-sm text-muted-foreground text-center">{empty}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
