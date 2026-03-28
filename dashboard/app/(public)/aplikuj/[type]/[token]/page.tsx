'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface AppInfo {
  position: string;
  type: string;
  discordUsername: string;
}

interface FormData {
  imieNazwisko: string;
  wiek: string;
  motywacja: string;
  doswiadczenie: string;
  dlaczego: string;
  historiaKarna: 'tak' | 'nie' | '';
  historiaKarnaOpis: string;
}

type Phase = 'loading' | 'error' | 'form' | 'submitting' | 'success' | 'submitError';

const MIN_MOTYWACJA = 150;

export default function AplikujPage() {
  const { type, token } = useParams<{ type: string; token: string }>();

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [form, setForm] = useState<FormData>({
    imieNazwisko: '',
    wiek: '',
    motywacja: '',
    doswiadczenie: '',
    dlaczego: '',
    historiaKarna: '',
    historiaKarnaOpis: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    if (!token) return;
    fetch(`/api/aplikuj/info?token=${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? 'Nieprawidłowy lub wygasły link.');
        }
        return res.json() as Promise<AppInfo>;
      })
      .then((data) => {
        setAppInfo(data);
        setPhase('form');
      })
      .catch((err: Error) => {
        setErrorMsg(err.message);
        setPhase('error');
      });
  }, [token]);

  const set = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!form.imieNazwisko.trim()) errors.imieNazwisko = 'To pole jest wymagane.';
    if (!form.wiek || Number(form.wiek) < 1 || Number(form.wiek) > 120)
      errors.wiek = 'Podaj prawidłowy wiek (1–120).';
    if (form.motywacja.trim().length < MIN_MOTYWACJA)
      errors.motywacja = `Minimum ${MIN_MOTYWACJA} znaków (teraz: ${form.motywacja.trim().length}).`;
    if (!form.doswiadczenie.trim()) errors.doswiadczenie = 'To pole jest wymagane.';
    if (!form.dlaczego.trim()) errors.dlaczego = 'To pole jest wymagane.';
    if (!form.historiaKarna) errors.historiaKarna = 'Wybierz opcję.';
    if (form.historiaKarna === 'tak' && !form.historiaKarnaOpis.trim())
      errors.historiaKarnaOpis = 'Opisz swoją historię karną.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setPhase('submitting');
    try {
      const res = await fetch('/api/aplikuj/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, type, answers: form }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Błąd wysyłania podania.');
      }
      setPhase('success');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd.');
      setPhase('submitError');
    }
  };

  // ---------- LOADING ----------
  if (phase === 'loading') {
    return (
      <Wrapper>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#5865F2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Ładowanie formularza…</p>
        </div>
      </Wrapper>
    );
  }

  // ---------- ERROR ----------
  if (phase === 'error') {
    return (
      <Wrapper>
        <div className="bg-[#1e2024] border border-red-500/30 rounded-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Błąd</h2>
          <p className="text-white/60 text-sm">{errorMsg}</p>
        </div>
      </Wrapper>
    );
  }

  // ---------- SUCCESS ----------
  if (phase === 'success') {
    return (
      <Wrapper>
        <div className="bg-[#1e2024] border border-green-500/30 rounded-xl p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Podanie wysłane!</h2>
          <p className="text-white/60 text-sm">
            Twoje podanie na pozycję{' '}
            <span className="text-white font-medium">{appInfo?.position}</span> zostało
            przyjęte. Poczekaj na decyzję staffu na kanale Discord.
          </p>
        </div>
      </Wrapper>
    );
  }

  // ---------- SUBMIT ERROR ----------
  if (phase === 'submitError') {
    return (
      <Wrapper>
        <div className="bg-[#1e2024] border border-red-500/30 rounded-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Błąd wysyłania</h2>
          <p className="text-white/60 text-sm mb-4">{errorMsg}</p>
          <button
            onClick={() => setPhase('form')}
            className="text-[#5865F2] hover:underline text-sm"
          >
            Wróć do formularza
          </button>
        </div>
      </Wrapper>
    );
  }

  // ---------- FORM ----------
  const motywacjaLen = form.motywacja.trim().length;

  return (
    <div className="min-h-screen bg-[#2B2D31] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#5865F2]/15 border border-[#5865F2]/30 rounded-full px-4 py-1.5 text-xs text-[#5865F2] font-medium mb-4">
            Greenville RP
          </div>
          <h1 className="text-3xl font-bold mb-2">Formularz aplikacyjny</h1>
          {appInfo && (
            <p className="text-white/50 text-sm">
              Składasz podanie na:{' '}
              <span className="text-white font-medium">{appInfo.position}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Imię i Nazwisko */}
          <Field label="Imię i Nazwisko postaci" error={fieldErrors.imieNazwisko}>
            <input
              type="text"
              value={form.imieNazwisko}
              onChange={(e) => set('imieNazwisko', e.target.value)}
              placeholder="np. Jan Kowalski"
              className="w-full bg-[#1e2024] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#5865F2] transition-colors"
            />
          </Field>

          {/* Wiek */}
          <Field label="Wiek postaci" error={fieldErrors.wiek}>
            <input
              type="number"
              value={form.wiek}
              onChange={(e) => set('wiek', e.target.value)}
              placeholder="np. 28"
              min={1}
              max={120}
              className="w-full bg-[#1e2024] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#5865F2] transition-colors"
            />
          </Field>

          {/* Motywacja */}
          <Field
            label="Motywacja"
            error={fieldErrors.motywacja}
            hint={
              <span
                className={
                  motywacjaLen < MIN_MOTYWACJA ? 'text-red-400' : 'text-green-400'
                }
              >
                {motywacjaLen}/{MIN_MOTYWACJA} znaków
              </span>
            }
          >
            <textarea
              value={form.motywacja}
              onChange={(e) => set('motywacja', e.target.value)}
              rows={5}
              placeholder="Opisz dlaczego chcesz dołączyć do tej grupy (min. 150 znaków)…"
              className="w-full bg-[#1e2024] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#5865F2] transition-colors resize-none"
            />
          </Field>

          {/* Doświadczenie */}
          <Field label="Doświadczenie w RP" error={fieldErrors.doswiadczenie}>
            <textarea
              value={form.doswiadczenie}
              onChange={(e) => set('doswiadczenie', e.target.value)}
              rows={4}
              placeholder="Opisz swoje poprzednie doświadczenia w roleplay…"
              className="w-full bg-[#1e2024] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#5865F2] transition-colors resize-none"
            />
          </Field>

          {/* Dlaczego ta służba/praca */}
          <Field label="Dlaczego ta służba/praca?" error={fieldErrors.dlaczego}>
            <textarea
              value={form.dlaczego}
              onChange={(e) => set('dlaczego', e.target.value)}
              rows={4}
              placeholder="Co przyciągnęło cię do tej konkretnej roli?…"
              className="w-full bg-[#1e2024] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#5865F2] transition-colors resize-none"
            />
          </Field>

          {/* Historia karna */}
          <Field label="Historia karna RP" error={fieldErrors.historiaKarna}>
            <div className="flex gap-4">
              {(['tak', 'nie'] as const).map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer text-sm transition-all ${
                    form.historiaKarna === opt
                      ? 'border-[#5865F2] bg-[#5865F2]/15 text-white'
                      : 'border-white/10 text-white/60 hover:border-white/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="historiaKarna"
                    value={opt}
                    checked={form.historiaKarna === opt}
                    onChange={() => set('historiaKarna', opt)}
                    className="sr-only"
                  />
                  {opt === 'tak' ? 'Tak' : 'Nie'}
                </label>
              ))}
            </div>
          </Field>

          {/* Historia karna opis (conditional) */}
          {form.historiaKarna === 'tak' && (
            <Field label="Opis historii karnej" error={fieldErrors.historiaKarnaOpis}>
              <textarea
                value={form.historiaKarnaOpis}
                onChange={(e) => set('historiaKarnaOpis', e.target.value)}
                rows={3}
                placeholder="Opisz swoje przeszłe wykroczenia w RP…"
                className="w-full bg-[#1e2024] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#5865F2] transition-colors resize-none"
              />
            </Field>
          )}

          {/* Info */}
          <div className="flex items-start gap-3 bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-lg p-4 text-sm text-white/60">
            <AlertCircle className="w-4 h-4 text-[#5865F2] mt-0.5 shrink-0" />
            <p>
              Po wysłaniu formularza staff Greenville RP zapozna się z Twoim podaniem.
              Decyzja zostanie ogłoszona na kanale Discord.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={phase === 'submitting'}
            className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 text-sm"
          >
            {phase === 'submitting' ? 'Wysyłanie…' : 'Wyślij podanie'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------- Helpers ----------

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#2B2D31] flex items-center justify-center px-4">
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-white/80">{label}</label>
        {hint && <span className="text-xs">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}
