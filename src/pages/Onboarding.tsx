import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIntakeStatus, logEvent } from '@/hooks/useIntakeStatus';
import {
  STEPS, TOTAL_STEPS, SECTIONS, DAYS, SLOTS,
  emptyAvailability, PREF_FIELDS,
  type IntakeAnswers, type Availability,
} from '@/lib/onboarding';

const ACCENT = '#C2E9FF';
const BG = '#0A0A0F';

function Chip({ selected, onClick, children, disabled }: { selected: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="glass-pill glass-interactive text-left transition-all active:scale-[0.97]"
      style={{
        padding: '12px 16px',
        borderRadius: 14,
        fontSize: 15,
        fontWeight: 500,
        color: selected ? '#0A0A0F' : '#fff',
        backgroundColor: selected ? ACCENT : undefined,
        border: selected ? 'none' : '1px solid rgba(255,255,255,0.08)',
        opacity: disabled ? 0.4 : 1,
        minHeight: 46,
      }}
    >
      {children}
    </button>
  );
}

function ProgressBar({ step }: { step: number }) {
  const pct = Math.max(0, Math.min(100, (step / TOTAL_STEPS) * 100));
  return (
    <div>
      <div style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: ACCENT, transition: 'width 300ms cubic-bezier(0.32,0.72,0,1)' }} />
      </div>
      <p style={{ color: '#8A8A9A', fontSize: 12, marginTop: 8 }}>Step {step} of {TOTAL_STEPS}</p>
    </div>
  );
}

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { markComplete } = useIntakeStatus();
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [stepIdx, setStepIdx] = useState<number>(0); // 0 = welcome, 1..18 = steps, 19 = finish
  const [interstitialSection, setInterstitialSection] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [customOrg, setCustomOrg] = useState('');
  const startedRef = useRef(false);

  // Load existing intake row; resume at first unanswered step.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('intake_responses').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        const a: IntakeAnswers = {
          year: data.year ?? undefined,
          housing: data.housing ?? undefined,
          orgs: data.orgs ?? undefined,
          availability: (data.availability as Availability | null) ?? undefined,
          notice_threshold: data.notice_threshold ?? undefined,
          ping_windows: data.ping_windows ?? undefined,
          ping_frequency: data.ping_frequency ?? undefined,
          categories: data.categories ?? undefined,
          plan_energy: data.plan_energy ?? undefined,
          group_size: data.group_size ?? undefined,
          scenario_spontaneity: data.scenario_spontaneity ?? undefined,
          rings_joinable: data.rings_joinable ?? undefined,
          intent: data.intent ?? undefined,
          talk_style: data.talk_style ?? undefined,
          crew_seeds: data.crew_seeds ?? undefined,
          radius: data.radius ?? undefined,
          budget: data.budget ?? undefined,
          constraints: data.constraints ?? undefined,
          constraints_note: data.constraints_note ?? undefined,
          host_interest: data.host_interest ?? undefined,
          host_pitch: data.host_pitch ?? undefined,
          wildcard: data.wildcard ?? undefined,
        };
        setAnswers(a);
        // resume at first unanswered required step; if all answered, start at welcome
        const firstUnanswered = firstUnansweredStep(a);
        if (data.started_at) setStepIdx(firstUnanswered);
        startedRef.current = !!data.started_at;
      }
      setLoaded(true);
    })();
  }, [user]);

  async function upsert(patch: Partial<IntakeAnswers>) {
    if (!user) return;
    const row: any = { user_id: user.id, ...patch };
    if (!startedRef.current) {
      row.started_at = new Date().toISOString();
      startedRef.current = true;
      logEvent(user.id, 'intake_started');
    }
    await supabase.from('intake_responses').upsert(row, { onConflict: 'user_id' });
  }

  function setAnswer<K extends keyof IntakeAnswers>(field: K, value: IntakeAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    upsert({ [field]: value } as any);
  }

  function goToStep(n: number) {
    if (n === stepIdx) return;
    // check for section interstitial
    if (n >= 1 && n <= TOTAL_STEPS && stepIdx >= 1 && stepIdx <= TOTAL_STEPS) {
      const cur = STEPS[stepIdx - 1];
      const next = STEPS[n - 1];
      if (next.section !== cur.section && n > stepIdx) {
        setInterstitialSection(next.section);
        setTimeout(() => {
          setInterstitialSection(null);
          setStepIdx(n);
        }, 1000);
        return;
      }
    }
    setStepIdx(n);
  }

  function advance() {
    if (user) logEvent(user.id, 'intake_step_completed', { step: stepIdx });
    if (stepIdx >= TOTAL_STEPS) {
      finish();
    } else {
      goToStep(stepIdx + 1);
    }
  }

  function autoAdvance() {
    setTimeout(() => advance(), 250);
  }

  async function finish() {
    if (!user) return;
    const completedAt = new Date().toISOString();
    await supabase.from('intake_responses').update({ completed_at: completedAt }).eq('user_id', user.id);

    // Seed preferences
    const prefRow: any = { user_id: user.id };
    for (const f of PREF_FIELDS) prefRow[f] = (answers as any)[f] ?? null;
    await supabase.from('preferences').upsert(prefRow, { onConflict: 'user_id' });

    // Mark profile complete
    await supabase.from('profiles').update({ intake_completed: true }).eq('id', user.id);
    logEvent(user.id, 'intake_completed');
    markComplete();
    setStepIdx(TOTAL_STEPS + 1);
  }

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: BG }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  // Interstitial
  if (interstitialSection !== null) {
    const s = SECTIONS[interstitialSection - 1];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ backgroundColor: BG }}>
        <div className="screen-enter text-center">
          <p style={{ color: '#8A8A9A', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            Section {s.id} of {SECTIONS.length}
          </p>
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 700, marginBottom: 10 }}>{s.title}</h1>
          <p style={{ color: '#AAAAB8', fontSize: 15 }}>{s.sub}</p>
        </div>
      </div>
    );
  }

  // Welcome
  if (stepIdx === 0) {
    return (
      <div className="flex min-h-screen flex-col justify-between px-6 py-12" style={{ backgroundColor: BG }}>
        <div />
        <div className="screen-enter">
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 700, marginBottom: 16, lineHeight: 1.15 }}>
            A few quick questions
          </h1>
          <p style={{ color: '#AAAAB8', fontSize: 16, lineHeight: 1.5 }}>
            About 3 minutes. Your answers decide which plans reach you — they're never shown on your profile, and you can change them anytime.
          </p>
        </div>
        <button
          onClick={() => goToStep(1)}
          className="w-full active:scale-[0.97] transition-transform"
          style={{ height: 52, borderRadius: 16, backgroundColor: ACCENT, color: '#0A0A0F', fontSize: 16, fontWeight: 600 }}
        >
          Start
        </button>
      </div>
    );
  }

  // Finish
  if (stepIdx > TOTAL_STEPS) {
    return (
      <div className="flex min-h-screen flex-col justify-between px-6 py-12" style={{ backgroundColor: BG }}>
        <div />
        <div className="screen-enter">
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 700, marginBottom: 16 }}>You're set.</h1>
          <p style={{ color: '#AAAAB8', fontSize: 16, lineHeight: 1.5 }}>
            Your answers shape what reaches you. Adjust them anytime in Preferences.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-full active:scale-[0.97] transition-transform"
            style={{ height: 52, borderRadius: 16, backgroundColor: ACCENT, color: '#0A0A0F', fontSize: 16, fontWeight: 600 }}
          >
            Set your first status
          </button>
          <button
            onClick={() => navigate('/preferences')}
            className="w-full"
            style={{ height: 44, color: '#8A8A9A', fontSize: 14 }}
          >
            Review preferences
          </button>
        </div>
      </div>
    );
  }

  const step = STEPS[stepIdx - 1];
  const back = () => goToStep(Math.max(0, stepIdx - 1));
  const skip = () => advance();

  return (
    <div className="flex min-h-screen flex-col px-5" style={{ backgroundColor: BG, paddingTop: 'calc(env(safe-area-inset-top, 12px) + 12px)', paddingBottom: 24 }}>
      {/* Top bar */}
      <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
        <button onClick={back} aria-label="Back" className="active:scale-95 transition-transform" style={{ padding: 8, marginLeft: -8 }}>
          <ChevronLeft size={22} color="#fff" />
        </button>
        <div className="flex-1"><ProgressBar step={stepIdx} /></div>
      </div>

      <div key={stepIdx} className="screen-enter flex-1 flex flex-col">
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 600, lineHeight: 1.3, marginBottom: step.helper ? 8 : 24 }}>
          {step.question}
        </h1>
        {step.helper && (
          <p style={{ color: '#8A8A9A', fontSize: 14, marginBottom: 24 }}>{step.helper}</p>
        )}

        {/* Render by kind */}
        {step.kind === 'single' && (
          <div className="flex flex-col gap-2">
            {step.options.map((o) => (
              <Chip
                key={o.code}
                selected={answers[step.field] === o.code}
                onClick={() => { setAnswer(step.field as any, o.code as any); autoAdvance(); }}
              >
                {o.label}
              </Chip>
            ))}
          </div>
        )}

        {step.kind === 'multi' && (
          <MultiChips
            options={step.options}
            values={(answers[step.field] as string[] | undefined) ?? []}
            onChange={(v) => setAnswer(step.field as any, v as any)}
            max={step.max}
            allowCustom={step.allowCustom}
            customValue={customOrg}
            setCustomValue={setCustomOrg}
          />
        )}

        {step.kind === 'availability' && (
          <AvailabilityGrid
            value={(answers.availability as Availability | undefined) ?? emptyAvailability()}
            onChange={(v) => setAnswer('availability', v)}
          />
        )}

        {step.kind === 'text' && (
          <textarea
            value={(answers[step.field] as string) ?? ''}
            onChange={(e) => setAnswers((p) => ({ ...p, [step.field]: e.target.value }))}
            onBlur={(e) => upsert({ [step.field]: e.target.value } as any)}
            placeholder={step.placeholder}
            maxLength={280}
            className="glass-card w-full"
            style={{ padding: 14, borderRadius: 14, backgroundColor: 'rgba(28,28,38,0.45)', color: '#fff', minHeight: 100, fontSize: 15, border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
          />
        )}

        {step.kind === 'compound' && (
          <div className="flex flex-col gap-6">
            {step.rows.map((row) => (
              <div key={row.field as string}>
                {row.label && <p style={{ color: '#AAAAB8', fontSize: 13, fontWeight: 500, marginBottom: 10 }}>{row.label}</p>}
                {row.kind === 'single' ? (
                  <div className="flex flex-wrap gap-2">
                    {row.options.map((o) => (
                      <Chip
                        key={o.code}
                        selected={answers[row.field] === o.code}
                        onClick={() => setAnswer(row.field as any, o.code as any)}
                      >
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <MultiChips
                    options={row.options}
                    values={(answers[row.field] as string[] | undefined) ?? []}
                    onChange={(v) => setAnswer(row.field as any, v as any)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {step.kind === 'crewseeds' && (
          <CrewSeeds
            values={(answers.crew_seeds as string[] | undefined) ?? []}
            onChange={(v) => setAnswer('crew_seeds', v)}
          />
        )}

        {step.kind === 'multi-with-note' && (
          <div className="flex flex-col gap-4">
            <MultiChips
              options={step.options}
              values={(answers[step.field] as string[] | undefined) ?? []}
              onChange={(v) => setAnswer(step.field as any, v as any)}
            />
            <input
              value={(answers[step.noteField] as string) ?? ''}
              onChange={(e) => setAnswers((p) => ({ ...p, [step.noteField]: e.target.value }))}
              onBlur={(e) => upsert({ [step.noteField]: e.target.value } as any)}
              placeholder="Anything else? (optional)"
              maxLength={200}
              className="glass-card w-full"
              style={{ padding: 14, borderRadius: 14, backgroundColor: 'rgba(28,28,38,0.45)', color: '#fff', fontSize: 15, border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
            />
          </div>
        )}

        {step.kind === 'single-reveal' && (
          <div className="flex flex-col gap-2">
            {step.options.map((o) => (
              <Chip
                key={o.code}
                selected={answers[step.field] === o.code}
                onClick={() => setAnswer(step.field as any, o.code as any)}
              >
                {o.label}
              </Chip>
            ))}
            {step.revealOn.includes(answers[step.field] as string) && (
              <div style={{ marginTop: 12 }}>
                <p style={{ color: '#AAAAB8', fontSize: 13, marginBottom: 8 }}>{step.revealLabel}</p>
                <input
                  value={(answers[step.revealField] as string) ?? ''}
                  onChange={(e) => setAnswers((p) => ({ ...p, [step.revealField]: e.target.value }))}
                  onBlur={(e) => upsert({ [step.revealField]: e.target.value } as any)}
                  maxLength={140}
                  className="glass-card w-full"
                  style={{ padding: 14, borderRadius: 14, backgroundColor: 'rgba(28,28,38,0.45)', color: '#fff', fontSize: 15, border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col gap-2" style={{ marginTop: 24 }}>
        {needsContinue(step, answers) && (
          <button
            onClick={advance}
            disabled={!canContinue(step, answers)}
            className="w-full active:scale-[0.97] transition-transform"
            style={{
              height: 52, borderRadius: 16,
              backgroundColor: canContinue(step, answers) ? ACCENT : 'rgba(194,233,255,0.2)',
              color: canContinue(step, answers) ? '#0A0A0F' : '#8A8A9A',
              fontSize: 16, fontWeight: 600,
            }}
          >
            Continue
          </button>
        )}
        {isSkippable(step) && !canContinue(step, answers) && (
          <button onClick={skip} className="w-full" style={{ height: 40, color: '#8A8A9A', fontSize: 14 }}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

function needsContinue(step: (typeof STEPS)[number], _a: IntakeAnswers): boolean {
  return step.kind !== 'single'; // single auto-advances
}

function canContinue(step: (typeof STEPS)[number], a: IntakeAnswers): boolean {
  switch (step.kind) {
    case 'single': return !!a[step.field];
    case 'multi': {
      const v = (a[step.field] as string[] | undefined) ?? [];
      return v.length > 0;
    }
    case 'availability': {
      const av = a.availability;
      if (!av) return false;
      return Object.values(av).some((d) => d.afternoon || d.evening || d.late);
    }
    case 'text': return !!(a[step.field] as string | undefined)?.trim();
    case 'compound': {
      return step.rows.every((r) => {
        const v = a[r.field];
        if (r.kind === 'single') return !!v;
        return Array.isArray(v) && (v as string[]).length > 0;
      });
    }
    case 'crewseeds': {
      const v = (a.crew_seeds as string[] | undefined) ?? [];
      return v.filter((x) => x.trim()).length > 0;
    }
    case 'multi-with-note': {
      const v = (a[step.field] as string[] | undefined) ?? [];
      return v.length > 0;
    }
    case 'single-reveal': return !!a[step.field];
  }
}

function isSkippable(step: (typeof STEPS)[number]): boolean {
  return (step as any).skippable === true;
}

function firstUnansweredStep(a: IntakeAnswers): number {
  for (let i = 0; i < STEPS.length; i++) {
    const s = STEPS[i];
    if (isSkippable(s)) continue; // don't force stopping at a skippable
    if (!canContinue(s, a)) return i + 1;
  }
  return 1;
}

/* ---------- Subcomponents ---------- */

function MultiChips({
  options, values, onChange, max, allowCustom, customValue, setCustomValue,
}: {
  options: { code: string; label: string }[];
  values: string[];
  onChange: (v: string[]) => void;
  max?: number;
  allowCustom?: boolean;
  customValue?: string;
  setCustomValue?: (v: string) => void;
}) {
  const toggle = (code: string) => {
    const has = values.includes(code);
    if (has) onChange(values.filter((v) => v !== code));
    else {
      if (max && values.length >= max) return;
      onChange([...values, code]);
    }
  };
  const addCustom = () => {
    const v = (customValue ?? '').trim();
    if (!v) return;
    if (max && values.length >= max) return;
    onChange([...values, v]);
    setCustomValue?.('');
  };
  return (
    <div>
      {max && (
        <p style={{ color: '#8A8A9A', fontSize: 12, marginBottom: 10 }}>{values.length} of {max}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const selected = values.includes(o.code);
          const disabled = !!(max && values.length >= max && !selected);
          return (
            <Chip key={o.code} selected={selected} onClick={() => toggle(o.code)} disabled={disabled}>
              {o.label}
            </Chip>
          );
        })}
        {values.filter((v) => !options.find((o) => o.code === v)).map((v) => (
          <Chip key={v} selected onClick={() => onChange(values.filter((x) => x !== v))}>
            {v} ×
          </Chip>
        ))}
      </div>
      {allowCustom && (
        <div className="flex gap-2" style={{ marginTop: 12 }}>
          <input
            value={customValue ?? ''}
            onChange={(e) => setCustomValue?.(e.target.value)}
            placeholder="Add your own"
            maxLength={40}
            className="flex-1"
            style={{ padding: '10px 14px', borderRadius: 12, backgroundColor: 'rgba(28,28,38,0.45)', color: '#fff', fontSize: 14, border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
            onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); }}
          />
          <button onClick={addCustom} className="glass-pill active:scale-95" style={{ padding: '0 16px', borderRadius: 12, color: '#C2E9FF', fontSize: 14, fontWeight: 600, border: '1px solid rgba(194,233,255,0.25)' }}>
            Add
          </button>
        </div>
      )}
    </div>
  );
}

function AvailabilityGrid({ value, onChange }: { value: Availability; onChange: (v: Availability) => void }) {
  const dayLabels: Record<string, string> = { mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S' };
  const toggle = (day: string, slot: 'afternoon' | 'evening' | 'late') => {
    const next: Availability = { ...value, [day]: { ...(value[day] ?? {}), [slot]: !value[day]?.[slot] } };
    onChange(next);
  };
  return (
    <div className="glass-card" style={{ padding: 12, borderRadius: 16 }}>
      <div className="grid" style={{ gridTemplateColumns: '80px repeat(7, 1fr)', gap: 6, alignItems: 'center' }}>
        <div />
        {DAYS.map((d) => (
          <div key={d} style={{ color: '#8A8A9A', fontSize: 12, textAlign: 'center', fontWeight: 600 }}>{dayLabels[d]}</div>
        ))}
        {SLOTS.map((slot) => (
          <>
            <div key={`lbl-${slot.code}`} style={{ color: '#AAAAB8', fontSize: 12 }}>{slot.label}</div>
            {DAYS.map((d) => {
              const active = !!value[d]?.[slot.code as 'afternoon' | 'evening' | 'late'];
              return (
                <button
                  key={`${d}-${slot.code}`}
                  onClick={() => toggle(d, slot.code as any)}
                  className="active:scale-95 transition-transform"
                  style={{
                    aspectRatio: '1',
                    borderRadius: 10,
                    backgroundColor: active ? ACCENT : 'rgba(255,255,255,0.05)',
                    border: active ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    minHeight: 34,
                  }}
                  aria-label={`${d} ${slot.label}`}
                />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

function CrewSeeds({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const seeds = [values[0] ?? '', values[1] ?? '', values[2] ?? ''];
  const setSeed = (i: number, v: string) => {
    const next = [...seeds];
    next[i] = v;
    onChange(next.filter((s) => s.trim().length > 0));
  };
  return (
    <div className="flex flex-col gap-2">
      {seeds.map((s, i) => (
        <input
          key={i}
          value={s}
          onChange={(e) => setSeed(i, e.target.value)}
          placeholder={`Person ${i + 1}`}
          maxLength={40}
          className="glass-card w-full"
          style={{ padding: 14, borderRadius: 14, backgroundColor: 'rgba(28,28,38,0.45)', color: '#fff', fontSize: 15, border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
        />
      ))}
    </div>
  );
}

// Silence unused import when memoizing later
