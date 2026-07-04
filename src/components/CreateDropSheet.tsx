import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toLocalInputValue } from '@/lib/dropTime';

export const DROP_CATEGORIES = [
  { id: 'food', label: 'Food', emoji: '🍕' },
  { id: 'study', label: 'Study', emoji: '📚' },
  { id: 'party', label: 'Party / Nightlife', emoji: '🎉' },
  { id: 'sports', label: 'Sports / Fitness', emoji: '💪' },
  { id: 'chill', label: 'Chill / Hangout', emoji: '☕' },
  { id: 'campus', label: 'Campus Event', emoji: '🎓' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'adventure', label: 'Adventure', emoji: '🌲' },
  { id: 'other', label: 'Other', emoji: '✨' },
] as const;

const CAMPUS_SPOTS = [
  'Usdan Student Center', 'Shapiro Campus Center', 'Goldfarb Library',
  'Gosman Sports Center', 'Sherman Dining', 'Great Lawn', 'Chapels Field',
  'Massell Quad', 'North Quad', 'Skyline Commons', 'Einstein Bros',
  'Moody Street', 'South Street',
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (dropId: string) => void;
  defaultLat?: number | null;
  defaultLng?: number | null;
}

interface FormState {
  title: string;
  category: string;
  location_name: string;
  location_details: string;
  description: string;
  capacity: string;
  start_time: string;
  end_time: string;
  rsvp_deadline: string;
}

export default function CreateDropSheet({ open, onClose, onCreated, defaultLat, defaultLng }: Props) {
  const { user } = useAuth();

  const defaults = useMemo<FormState>(() => {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60_000); // +1h
    const end = new Date(start.getTime() + 60 * 60_000); // +2h
    const rsvp = new Date(start.getTime() - 15 * 60_000); // 15m before
    return {
      title: '',
      category: '',
      location_name: '',
      location_details: '',
      description: '',
      capacity: '6',
      start_time: toLocalInputValue(start),
      end_time: toLocalInputValue(end),
      rsvp_deadline: toLocalInputValue(rsvp),
    };
  }, [open]);

  const [form, setForm] = useState<FormState>(defaults);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) { setForm(defaults); setErrors({}); } }, [open, defaults]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    else if (form.title.length > 120) errs.title = 'Keep it under 120 chars';
    if (!form.category) errs.category = 'Pick a category';
    if (!form.location_name.trim()) errs.location_name = 'Location is required';
    const cap = parseInt(form.capacity, 10);
    if (!Number.isFinite(cap) || cap < 1) errs.capacity = 'Must be a positive number';
    const start = new Date(form.start_time);
    const end = new Date(form.end_time);
    const rsvp = new Date(form.rsvp_deadline);
    const now = new Date();
    if (isNaN(start.getTime())) errs.start_time = 'Pick a start time';
    else if (start <= now) errs.start_time = 'Start time must be in the future';
    if (isNaN(end.getTime())) errs.end_time = 'Pick an end time';
    else if (end <= start) errs.end_time = 'End must be after start';
    if (isNaN(rsvp.getTime())) errs.rsvp_deadline = 'Pick an RSVP deadline';
    else if (rsvp > start) errs.rsvp_deadline = 'Must be before start time';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (!user) { toast.error('Please sign in first'); return; }
    if (!validate()) return;
    setSubmitting(true);
    const { data, error } = await supabase.from('drops').insert({
      creator_id: user.id,
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim() || null,
      location_name: form.location_name.trim(),
      location_details: form.location_details.trim() || null,
      latitude: defaultLat ?? null,
      longitude: defaultLng ?? null,
      capacity: parseInt(form.capacity, 10),
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      rsvp_deadline: new Date(form.rsvp_deadline).toISOString(),
    }).select('id').single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message || 'Could not create drop');
      return;
    }
    toast.success('Drop created 🔥');
    onCreated?.(data!.id);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'white',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 15,
    outline: 'none',
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: '#8A8A9A', marginBottom: 6, fontWeight: 600, letterSpacing: 0.2 };
  const errStyle: React.CSSProperties = { color: '#FF7A7A', fontSize: 12, marginTop: 4 };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60"
            style={{ backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.9 }}
            className="fixed inset-x-0 bottom-0 z-[101] flex flex-col"
            style={{
              maxHeight: '92vh',
              background: 'rgba(14,14,20,0.9)',
              backdropFilter: 'blur(40px) saturate(180%)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTop: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-drop-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="mx-auto h-1 w-10 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <div className="flex items-center justify-between px-5 pb-3">
              <h2 id="create-drop-title" className="text-white text-[20px] font-bold">Create a Drop</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X size={18} color="#fff" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,8px))] space-y-4">
              {/* Title */}
              <div>
                <div style={labelStyle}>What's the plan?</div>
                <input
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="e.g. pizza run at Usdan"
                  maxLength={120}
                  style={inputStyle}
                />
                {errors.title && <div style={errStyle}>{errors.title}</div>}
              </div>

              {/* Category */}
              <div>
                <div style={labelStyle}>Category</div>
                <div className="flex flex-wrap gap-2">
                  {DROP_CATEGORIES.map((c) => {
                    const active = form.category === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => update('category', c.id)}
                        className="transition-all active:scale-[0.97]"
                        style={{
                          padding: '8px 14px',
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 600,
                          border: active ? '1px solid rgba(194,233,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                          background: active ? 'rgba(194,233,255,0.15)' : 'rgba(255,255,255,0.03)',
                          color: active ? '#C2E9FF' : '#8A8A9A',
                        }}
                      >
                        <span style={{ marginRight: 6 }}>{c.emoji}</span>{c.label}
                      </button>
                    );
                  })}
                </div>
                {errors.category && <div style={errStyle}>{errors.category}</div>}
              </div>

              {/* Location */}
              <div>
                <div style={labelStyle}>Location</div>
                <input
                  value={form.location_name}
                  onChange={(e) => update('location_name', e.target.value)}
                  placeholder="e.g. Usdan Student Center"
                  list="campus-spots"
                  style={inputStyle}
                />
                <datalist id="campus-spots">
                  {CAMPUS_SPOTS.map((s) => <option key={s} value={s} />)}
                </datalist>
                {errors.location_name && <div style={errStyle}>{errors.location_name}</div>}
              </div>

              <div>
                <div style={labelStyle}>Location details (optional)</div>
                <input
                  value={form.location_details}
                  onChange={(e) => update('location_details', e.target.value)}
                  placeholder="Meet by the fireplace, second floor"
                  style={inputStyle}
                />
              </div>

              {/* Times */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <div style={labelStyle}>Starts</div>
                  <input type="datetime-local" value={form.start_time} onChange={(e) => update('start_time', e.target.value)} style={inputStyle} />
                  {errors.start_time && <div style={errStyle}>{errors.start_time}</div>}
                </div>
                <div>
                  <div style={labelStyle}>Ends</div>
                  <input type="datetime-local" value={form.end_time} onChange={(e) => update('end_time', e.target.value)} style={inputStyle} />
                  {errors.end_time && <div style={errStyle}>{errors.end_time}</div>}
                </div>
                <div>
                  <div style={labelStyle}>RSVP deadline</div>
                  <input type="datetime-local" value={form.rsvp_deadline} onChange={(e) => update('rsvp_deadline', e.target.value)} style={inputStyle} />
                  {errors.rsvp_deadline && <div style={errStyle}>{errors.rsvp_deadline}</div>}
                </div>
              </div>

              {/* Capacity */}
              <div>
                <div style={labelStyle}>Capacity</div>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.capacity}
                  onChange={(e) => update('capacity', e.target.value)}
                  style={inputStyle}
                />
                {errors.capacity && <div style={errStyle}>{errors.capacity}</div>}
              </div>

              {/* Description */}
              <div>
                <div style={labelStyle}>Description (optional)</div>
                <textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Any vibes, what to bring, who should come..."
                  rows={3}
                  maxLength={500}
                  style={{ ...inputStyle, resize: 'none', minHeight: 80 }}
                />
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="h-12 w-full text-[16px] font-bold transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: '#C2E9FF', color: '#0A0A0F', borderRadius: 14, boxShadow: '0 4px 20px rgba(194,233,255,0.25)' }}
              >
                {submitting ? 'Dropping…' : 'Drop It 🔥'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
