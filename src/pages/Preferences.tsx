import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logEvent } from '@/hooks/useIntakeStatus';
import { DAYS, SLOTS, emptyAvailability, type Availability } from '@/lib/onboarding';

const ACCENT = '#C2E9FF';
const BG = '#0A0A0F';

const TOAST_STYLE = {
  background: 'rgba(14,14,20,0.65)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
  color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16,
};

interface PrefsRow {
  plan_energy: string | null;
  intent: string | null;
  rings_joinable: string[] | null;
  categories: string[] | null;
  group_size: string | null;
  availability: Availability | null;
  notice_threshold: string | null;
  ping_windows: string[] | null;
  ping_frequency: string | null;
  paused_until: string | null;
  radius: string | null;
  budget: string | null;
  constraints: string[] | null;
  constraints_note: string | null;
  host_interest: string | null;
  talk_style: string | null;
}

const PLAN_ENERGY = [
  { code: 'low_key', label: 'Low-key' },
  { code: 'mixed', label: 'A mix' },
  { code: 'going_out', label: 'Going out' },
  { code: 'depends', label: 'Depends' },
];
const INTENT = [
  { code: 'my_people', label: 'People I know' },
  { code: 'new_people', label: 'New people' },
  { code: 'both', label: 'Both' },
];
const RINGS = [
  { code: 'crew', label: 'My close friends', desc: 'Your accepted friends.', live: true },
  { code: 'fof', label: 'Friends of friends', desc: 'Two degrees away.', live: false },
  { code: 'org', label: 'My clubs, dorm, or team', desc: 'Groups you belong to.', live: false },
  { code: 'open', label: 'Open plans', desc: 'Anyone on campus.', live: false },
];
const CATEGORIES = [
  { code: 'late_food', label: 'Late-night food' },
  { code: 'coffee', label: 'Coffee or boba' },
  { code: 'sports', label: 'Pickup sports' },
  { code: 'gym', label: 'Gym' },
  { code: 'study', label: 'Study sessions' },
  { code: 'movies', label: 'Movie nights' },
  { code: 'parties', label: 'House parties' },
  { code: 'going_out', label: 'Bars and going out' },
  { code: 'music', label: 'Live music' },
  { code: 'outdoors', label: 'Outdoors' },
  { code: 'gaming', label: 'Gaming' },
  { code: 'art', label: 'Art and making things' },
  { code: 'volunteering', label: 'Volunteering' },
  { code: 'wildcard_cat', label: 'Something new' },
];
const GROUP_SIZE = [
  { code: 'small', label: '3–4' }, { code: 'medium', label: '5–8' },
  { code: 'large', label: '10–20' }, { code: 'any', label: 'Any' },
];
const NOTICE = [
  { code: 'under_1h', label: 'Under an hour' }, { code: 'few_hours', label: 'A few hours' },
  { code: 'same_day', label: 'Same day' }, { code: 'day_plus', label: 'A day or more' },
];
const PING_WINDOWS = [
  { code: 'weekday_evenings', label: 'Weekday evenings' }, { code: 'between_classes', label: 'Between classes' },
  { code: 'weekend_days', label: 'Weekend days' }, { code: 'weekend_nights', label: 'Weekend nights' },
];
const PING_FREQ = [
  { code: 'essentials', label: 'Only essentials' }, { code: 'few_per_week', label: 'A few / week' },
  { code: 'open', label: 'Whenever fits' },
];
const RADIUS = [
  { code: 'campus', label: 'Campus only' }, { code: 'walkable', label: 'Walkable' },
  { code: 'short_ride', label: 'Short ride' }, { code: 'boston', label: 'Anywhere in Boston' },
];
const BUDGET = [
  { code: 'free', label: 'Free' }, { code: 'under_10', label: 'Under $10' },
  { code: 'under_25', label: 'Under $25' }, { code: 'flexible', label: 'Flexible' },
];
const CONSTRAINTS = [
  { code: 'dietary', label: 'Dietary needs' }, { code: 'no_alcohol', label: "I don't drink" },
  { code: 'accessibility', label: 'Accessibility' }, { code: 'none', label: 'All good' },
];
const HOST = [
  { code: 'host', label: "I'd host" }, { code: 'cohost', label: 'Co-host' },
  { code: 'spread', label: 'Spread the word' }, { code: 'join', label: "I'll just join" },
];
const TALK = [
  { code: 'talker', label: 'Talker' }, { code: 'listener', label: 'Listener' },
  { code: 'depends', label: 'Depends' },
];

function Chip({ selected, onClick, children, disabled }: { selected: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="glass-pill glass-interactive active:scale-[0.97]"
      style={{
        padding: '10px 14px', borderRadius: 12, fontSize: 14, fontWeight: 500,
        color: selected ? '#0A0A0F' : '#fff',
        backgroundColor: selected ? ACCENT : undefined,
        border: selected ? 'none' : '1px solid rgba(255,255,255,0.08)',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card" style={{ padding: 16, borderRadius: 18, marginBottom: 14 }}>
      <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 14 }}>{title}</h2>
      {children}
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#AAAAB8', fontSize: 13, fontWeight: 500, marginBottom: 8, marginTop: 4 }}>{children}</p>;
}

export default function Preferences() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<PrefsRow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('preferences').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      setPrefs((data as PrefsRow) ?? {
        plan_energy: null, intent: null, rings_joinable: [], categories: [], group_size: null,
        availability: null, notice_threshold: null, ping_windows: [], ping_frequency: null,
        paused_until: null, radius: null, budget: null, constraints: [], constraints_note: null,
        host_interest: null, talk_style: null,
      });
      setLoaded(true);
    });
  }, [user]);

  async function save<K extends keyof PrefsRow>(field: K, value: PrefsRow[K]) {
    if (!user || !prefs) return;
    const next = { ...prefs, [field]: value };
    setPrefs(next);
    await supabase.from('preferences').upsert({ user_id: user.id, ...next }, { onConflict: 'user_id' });
    logEvent(user.id, 'preference_updated', { field });
    if (!savedOnce) {
      toast('Saved', { style: TOAST_STYLE, position: 'top-center', duration: 1200 });
      setSavedOnce(true);
    }
  }

  const toggleArr = (arr: string[] | null | undefined, code: string, max?: number): string[] => {
    const list = arr ?? [];
    if (list.includes(code)) return list.filter((x) => x !== code);
    if (max && list.length >= max) return list;
    return [...list, code];
  };

  if (!loaded || !prefs) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: BG }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const avail = prefs.availability ?? emptyAvailability();
  const setAvail = (day: string, slot: 'afternoon' | 'evening' | 'late') => {
    const next: Availability = { ...avail, [day]: { ...(avail[day] ?? {}), [slot]: !avail[day]?.[slot] } };
    save('availability', next);
  };

  const setPause = (kind: 'off' | '24h' | '1w') => {
    if (kind === 'off') save('paused_until', null);
    else {
      const ms = kind === '24h' ? 24 * 3600 * 1000 : 7 * 24 * 3600 * 1000;
      save('paused_until', new Date(Date.now() + ms).toISOString());
    }
  };
  const pauseState: 'off' | '24h' | '1w' = (() => {
    if (!prefs.paused_until) return 'off';
    const d = new Date(prefs.paused_until).getTime() - Date.now();
    if (d <= 0) return 'off';
    if (d <= 25 * 3600 * 1000) return '24h';
    return '1w';
  })();

  const dayLabels: Record<string, string> = { mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S' };

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      <div className="flex items-center px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top,12px) + 12px)', paddingBottom: 8 }}>
        <button onClick={() => navigate(-1)} aria-label="Back" className="active:scale-95 transition-transform" style={{ padding: 8, marginLeft: -8 }}>
          <ChevronLeft size={22} color="#fff" />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Preferences</p>
        </div>
        <div style={{ width: 30 }} />
      </div>
      <p style={{ color: '#8A8A9A', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>These shape which plans reach you.</p>

      <div className="px-4" style={{ paddingBottom: 120 }}>
        <Card title="Looking for">
          <SubLabel>Speed</SubLabel>
          <div className="flex flex-wrap gap-2">
            {PLAN_ENERGY.map((o) => (
              <Chip key={o.code} selected={prefs.plan_energy === o.code} onClick={() => save('plan_energy', o.code)}>{o.label}</Chip>
            ))}
          </div>
          <SubLabel>Intent</SubLabel>
          <div className="flex flex-wrap gap-2">
            {INTENT.map((o) => (
              <Chip key={o.code} selected={prefs.intent === o.code} onClick={() => save('intent', o.code)}>{o.label}</Chip>
            ))}
          </div>
          <SubLabel>Whose plans to see</SubLabel>
          <div className="flex flex-col gap-2">
            {RINGS.map((r) => {
              const on = (prefs.rings_joinable ?? []).includes(r.code);
              return (
                <button
                  key={r.code}
                  onClick={() => save('rings_joinable', toggleArr(prefs.rings_joinable, r.code))}
                  className="flex items-center justify-between glass-pill active:scale-[0.98] text-left"
                  style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div>
                    <p style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
                      {r.label}
                      {!r.live && <span style={{ color: '#8A8A9A', fontSize: 11, marginLeft: 8, fontWeight: 500 }}>coming soon</span>}
                    </p>
                    <p style={{ color: '#8A8A9A', fontSize: 12, marginTop: 2 }}>{r.desc}</p>
                  </div>
                  <span style={{
                    width: 42, height: 24, borderRadius: 12,
                    backgroundColor: on ? ACCENT : 'rgba(28,28,38,0.6)', position: 'relative',
                    border: on ? 'none' : '1px solid rgba(255,255,255,0.08)', display: 'block', flexShrink: 0,
                  }}>
                    <span style={{
                      position: 'absolute', top: '50%', width: 18, height: 18, borderRadius: 9,
                      backgroundColor: '#fff', transform: `translateY(-50%) translateX(${on ? 21 : 3}px)`,
                      transition: 'transform 0.2s ease',
                    }}/>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Plans">
          <SubLabel>Categories ({(prefs.categories ?? []).length} of 5)</SubLabel>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((o) => {
              const selected = (prefs.categories ?? []).includes(o.code);
              const disabled = !selected && (prefs.categories ?? []).length >= 5;
              return (
                <Chip key={o.code} selected={selected} disabled={disabled}
                  onClick={() => save('categories', toggleArr(prefs.categories, o.code, 5))}>
                  {o.label}
                </Chip>
              );
            })}
          </div>
          <SubLabel>Group size</SubLabel>
          <div className="flex flex-wrap gap-2">
            {GROUP_SIZE.map((o) => (
              <Chip key={o.code} selected={prefs.group_size === o.code} onClick={() => save('group_size', o.code)}>{o.label}</Chip>
            ))}
          </div>
        </Card>

        <Card title="Schedule">
          <SubLabel>When you're usually free</SubLabel>
          <div className="grid" style={{ gridTemplateColumns: '70px repeat(7, 1fr)', gap: 6, alignItems: 'center', marginBottom: 12 }}>
            <div />
            {DAYS.map((d) => (
              <div key={d} style={{ color: '#8A8A9A', fontSize: 11, textAlign: 'center', fontWeight: 600 }}>{dayLabels[d]}</div>
            ))}
            {SLOTS.map((slot) => (
              <>
                <div key={`l-${slot.code}`} style={{ color: '#AAAAB8', fontSize: 11 }}>{slot.label}</div>
                {DAYS.map((d) => {
                  const active = !!avail[d]?.[slot.code as 'afternoon' | 'evening' | 'late'];
                  return (
                    <button key={`${d}-${slot.code}`} onClick={() => setAvail(d, slot.code as any)}
                      style={{ aspectRatio: '1', borderRadius: 8, minHeight: 28,
                        backgroundColor: active ? ACCENT : 'rgba(255,255,255,0.05)',
                        border: active ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
                      aria-label={`${d} ${slot.label}`}
                    />
                  );
                })}
              </>
            ))}
          </div>
          <SubLabel>Notice needed</SubLabel>
          <div className="flex flex-wrap gap-2">
            {NOTICE.map((o) => (
              <Chip key={o.code} selected={prefs.notice_threshold === o.code} onClick={() => save('notice_threshold', o.code)}>{o.label}</Chip>
            ))}
          </div>
          <SubLabel>Notify me during</SubLabel>
          <div className="flex flex-wrap gap-2">
            {PING_WINDOWS.map((o) => (
              <Chip key={o.code} selected={(prefs.ping_windows ?? []).includes(o.code)}
                onClick={() => save('ping_windows', toggleArr(prefs.ping_windows, o.code))}>{o.label}</Chip>
            ))}
          </div>
          <SubLabel>How often</SubLabel>
          <div className="flex flex-wrap gap-2">
            {PING_FREQ.map((o) => (
              <Chip key={o.code} selected={prefs.ping_frequency === o.code} onClick={() => save('ping_frequency', o.code)}>{o.label}</Chip>
            ))}
          </div>
          <SubLabel>Pause Drop</SubLabel>
          <div className="flex flex-wrap gap-2">
            <Chip selected={pauseState === 'off'} onClick={() => setPause('off')}>Off</Chip>
            <Chip selected={pauseState === '24h'} onClick={() => setPause('24h')}>24 hours</Chip>
            <Chip selected={pauseState === '1w'} onClick={() => setPause('1w')}>1 week</Chip>
          </div>
        </Card>

        <Card title="Details">
          <SubLabel>Radius</SubLabel>
          <div className="flex flex-wrap gap-2">
            {RADIUS.map((o) => (
              <Chip key={o.code} selected={prefs.radius === o.code} onClick={() => save('radius', o.code)}>{o.label}</Chip>
            ))}
          </div>
          <SubLabel>Budget</SubLabel>
          <div className="flex flex-wrap gap-2">
            {BUDGET.map((o) => (
              <Chip key={o.code} selected={prefs.budget === o.code} onClick={() => save('budget', o.code)}>{o.label}</Chip>
            ))}
          </div>
          <SubLabel>Constraints</SubLabel>
          <div className="flex flex-wrap gap-2">
            {CONSTRAINTS.map((o) => (
              <Chip key={o.code} selected={(prefs.constraints ?? []).includes(o.code)}
                onClick={() => save('constraints', toggleArr(prefs.constraints, o.code))}>{o.label}</Chip>
            ))}
          </div>
          <input
            value={prefs.constraints_note ?? ''}
            onChange={(e) => setPrefs((p) => p ? { ...p, constraints_note: e.target.value } : p)}
            onBlur={(e) => save('constraints_note', e.target.value)}
            placeholder="Anything else? (optional)"
            maxLength={200}
            className="w-full"
            style={{ padding: 12, borderRadius: 12, backgroundColor: 'rgba(28,28,38,0.45)', color: '#fff', fontSize: 14, border: '1px solid rgba(255,255,255,0.08)', outline: 'none', marginTop: 10 }}
          />
        </Card>

        <Card title="Hosting">
          <div className="flex flex-wrap gap-2">
            {HOST.map((o) => (
              <Chip key={o.code} selected={prefs.host_interest === o.code} onClick={() => save('host_interest', o.code)}>{o.label}</Chip>
            ))}
          </div>
        </Card>

        <Card title="Your style">
          <div className="flex flex-wrap gap-2">
            {TALK.map((o) => (
              <Chip key={o.code} selected={prefs.talk_style === o.code} onClick={() => save('talk_style', o.code)}>{o.label}</Chip>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
