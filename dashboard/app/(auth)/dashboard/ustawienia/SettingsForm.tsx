'use client';

import { useState } from 'react';
import { Settings } from '@prisma/client';
import { Save, CheckCircle2, XCircle } from 'lucide-react';

interface SettingsFormProps {
  initialSettings: Settings;
}

type SettingsData = Omit<Settings, 'id' | 'setupCompleted' | 'guildId'>;

type SaveState = 'idle' | 'saving' | 'success' | 'error';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-border bg-secondary/20">
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-1">
        <label className="text-sm font-medium block mb-1">{label}</label>
        {hint && <p className="text-xs text-muted-foreground mb-1.5">{hint}</p>}
        {children}
      </div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-32 bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
    />
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
    />
  );
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [data, setData] = useState<SettingsData>({
    maxVehiclesBase:      initialSettings.maxVehiclesBase,
    maxVehiclesSupporter: initialSettings.maxVehiclesSupporter,
    maxVehiclesBooster:   initialSettings.maxVehiclesBooster,
    quizPassScore:        initialSettings.quizPassScore,
    quizTotalQuestions:   initialSettings.quizTotalQuestions,
    quizCooldownHours:    initialSettings.quizCooldownHours,
    robloxGroupId:        initialSettings.robloxGroupId,
    frpSpeedLimit:        initialSettings.frpSpeedLimit,
    maxMandaty:           initialSettings.maxMandaty,
    maxGrzywny:           initialSettings.maxGrzywny,
    maxAreszty:           initialSettings.maxAreszty,
    licenseSuspensionDays: initialSettings.licenseSuspensionDays,
    radioUrl:             initialSettings.radioUrl,
    warnAutoMuteCount:    initialSettings.warnAutoMuteCount,
    warnAutoBanCount:     initialSettings.warnAutoBanCount,
  });

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const set = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaveState('saving');
    setErrorMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Błąd zapisu ustawień.');
      }
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Nieznany błąd.');
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 4000);
    }
  };

  return (
    <div>
      {/* Pojazdy */}
      <Section title="Limit pojazdów">
        <Field label="Baza (zwykły gracz)">
          <NumberInput
            value={data.maxVehiclesBase}
            onChange={(v) => set('maxVehiclesBase', v)}
            min={1}
          />
        </Field>
        <Field label="Supporter">
          <NumberInput
            value={data.maxVehiclesSupporter}
            onChange={(v) => set('maxVehiclesSupporter', v)}
            min={1}
          />
        </Field>
        <Field label="Booster">
          <NumberInput
            value={data.maxVehiclesBooster}
            onChange={(v) => set('maxVehiclesBooster', v)}
            min={1}
          />
        </Field>
      </Section>

      {/* Quiz */}
      <Section title="Quiz weryfikacyjny">
        <Field
          label="Próg zaliczenia"
          hint="Minimalna liczba poprawnych odpowiedzi do zaliczenia."
        >
          <NumberInput
            value={data.quizPassScore}
            onChange={(v) => set('quizPassScore', v)}
            min={1}
            max={data.quizTotalQuestions}
          />
        </Field>
        <Field label="Liczba pytań w quizie">
          <NumberInput
            value={data.quizTotalQuestions}
            onChange={(v) => set('quizTotalQuestions', v)}
            min={5}
            max={30}
          />
        </Field>
        <Field
          label="Cooldown (godziny)"
          hint="Czas oczekiwania między kolejnymi podejściami do quizu."
        >
          <NumberInput
            value={data.quizCooldownHours}
            onChange={(v) => set('quizCooldownHours', v)}
            min={0}
          />
        </Field>
      </Section>

      {/* Roblox */}
      <Section title="Integracja Roblox">
        <Field
          label="Roblox Group ID"
          hint="ID grupy Roblox do weryfikacji przynależności."
        >
          <TextInput
            value={data.robloxGroupId}
            onChange={(v) => set('robloxGroupId', v)}
            placeholder="np. 12345678"
          />
        </Field>
      </Section>

      {/* Moderacja */}
      <Section title="Automoderace i kary">
        <Field
          label="Prędkość FRP (km/h)"
          hint="Powyżej tego limitu system rejestruje naruszenie FRP."
        >
          <NumberInput
            value={data.frpSpeedLimit}
            onChange={(v) => set('frpSpeedLimit', v)}
            min={50}
          />
        </Field>
        <Field
          label="Warn → auto-mute (po ilu warnach)"
        >
          <NumberInput
            value={data.warnAutoMuteCount}
            onChange={(v) => set('warnAutoMuteCount', v)}
            min={1}
          />
        </Field>
        <Field
          label="Warn → auto-ban (po ilu warnach)"
        >
          <NumberInput
            value={data.warnAutoBanCount}
            onChange={(v) => set('warnAutoBanCount', v)}
            min={1}
          />
        </Field>
        <Field label="Maks. mandatów RP">
          <NumberInput
            value={data.maxMandaty}
            onChange={(v) => set('maxMandaty', v)}
            min={1}
          />
        </Field>
        <Field label="Maks. grzywien RP">
          <NumberInput
            value={data.maxGrzywny}
            onChange={(v) => set('maxGrzywny', v)}
            min={1}
          />
        </Field>
        <Field label="Maks. aresztowań RP">
          <NumberInput
            value={data.maxAreszty}
            onChange={(v) => set('maxAreszty', v)}
            min={1}
          />
        </Field>
        <Field label="Zawieszenie prawa jazdy (dni)">
          <NumberInput
            value={data.licenseSuspensionDays}
            onChange={(v) => set('licenseSuspensionDays', v)}
            min={1}
          />
        </Field>
      </Section>

      {/* Radio */}
      <Section title="Radio RP">
        <Field
          label="URL radia"
          hint="Link do odtwarzacza radia używanego w grze."
        >
          <TextInput
            value={data.radioUrl}
            onChange={(v) => set('radioUrl', v)}
            placeholder="https://…"
          />
        </Field>
      </Section>

      {/* Save button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {saveState === 'saving' ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Zapisywanie…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Zapisz ustawienia
            </>
          )}
        </button>

        {saveState === 'success' && (
          <span className="flex items-center gap-1.5 text-sm text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            Zapisano pomyślnie
          </span>
        )}
        {saveState === 'error' && (
          <span className="flex items-center gap-1.5 text-sm text-red-400">
            <XCircle className="w-4 h-4" />
            {errorMsg}
          </span>
        )}
      </div>
    </div>
  );
}
