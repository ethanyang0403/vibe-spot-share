import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { X, MapPin, Users, Clock, Calendar, Send } from 'lucide-react';
import { DROP_CATEGORIES } from './CreateDropSheet';
import { relativeTime, formatDateTime, rsvpClosed, dropStatus } from '@/lib/dropTime';
import { DemoDrop, DemoRsvpStatus, setDemoRsvp, useDemoDropCount } from '@/lib/demoDrops';

interface Props {
  drop: DemoDrop | null;
  onClose: () => void;
}

export default function DemoDropDetailsSheet({ drop, onClose }: Props) {
  const [now, setNow] = useState(new Date());
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageSent, setMessageSent] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!drop) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drop, onClose]);

  // Reset per-drop state
  useEffect(() => {
    if (!drop) setConfirmCancel(false);
    setMessageText('');
    setMessageSent(false);
  }, [drop?.id]);

  const open = !!drop;

  // Always call hooks in same order — use a stub when no drop yet
  const stub: DemoDrop = drop ?? ({
    id: '__stub__', baseAttendees: 0, capacity: 1,
  } as any);
  const { going, maybe, myStatus } = useDemoDropCount(stub);

  if (!open || !drop) {
    return (
      <AnimatePresence>{/* closed */}</AnimatePresence>
    );
  }

  const cat = DROP_CATEGORIES.find((c) => c.id === drop.category);
  const status = dropStatus(drop as any, now);
  const closed = rsvpClosed(drop as any, now);
  const ended = status === 'ended';
  const full = going >= drop.capacity && myStatus !== 'going';
  const spotsLeft = Math.max(0, drop.capacity - going);
  const editingLocked = closed || ended;

  const chooseStatus = (next: Exclude<DemoRsvpStatus, null>) => {
    if (editingLocked) { toast.error(ended ? 'This drop has ended' : 'RSVP closed'); return; }
    if (next === 'going' && myStatus !== 'going' && full) {
      toast.error('This drop is full');
      return;
    }
    setDemoRsvp(drop.id, next);
    toast.success(next === 'going' ? "You're going 🎉" : "You're a maybe");
  };

  const doCancel = () => {
    setDemoRsvp(drop.id, null);
    setConfirmCancel(false);
    toast('RSVP cancelled');
  };

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
              maxHeight: '90vh',
              background: 'rgba(14,14,20,0.9)',
              backdropFilter: 'blur(40px) saturate(180%)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center px-5 pt-4 pb-2">
              <div className="h-1 w-10 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <div className="flex items-center justify-end px-5 pb-2">
              <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X size={18} color="#fff" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,8px))]">
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, background: 'rgba(194,233,255,0.12)', color: '#C2E9FF', fontWeight: 600 }}>
                  {cat?.emoji} {cat?.label ?? drop.category}
                </span>
                {status === 'live' && (
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,140,140,0.15)', color: '#FF9E9E', fontWeight: 700, letterSpacing: 0.5 }}>LIVE</span>
                )}
                {ended && (
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: '#8A8A9A', fontWeight: 700 }}>ENDED</span>
                )}
              </div>

              <h2 className="text-white text-[22px] font-bold mb-1">{drop.title}</h2>
              <p className="text-[12px]" style={{ color: '#555566' }}>Created {relativeTime(drop.created_at, now)}</p>

              {/* Hosted by */}
              <div
                className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold text-white shrink-0"
                  style={{ backgroundColor: drop.host.color, border: '1.5px solid #fff' }}
                >
                  {drop.host.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wide" style={{ color: '#8A8A9A' }}>Hosted by</div>
                  <div className="text-[14px] font-semibold text-white truncate">{drop.host.name}</div>
                  <div className="text-[12px] truncate" style={{ color: '#8A8A9A' }}>{drop.host.bio}</div>
                </div>
              </div>

              {drop.description && (
                <p className="text-[14px] mt-4" style={{ color: '#C7C7D1', lineHeight: 1.5 }}>{drop.description}</p>
              )}

              <div className="mt-5 space-y-3">
                <Row icon={<MapPin size={16} />} label={drop.location_name} sub={drop.location_details ?? undefined} />
                <Row
                  icon={<Users size={16} />}
                  label={`${going} / ${drop.capacity} going${maybe > 0 ? ` · ${maybe} maybe` : ''}`}
                  sub={full ? 'No spots left' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} remaining`}
                />
                <Row icon={<Calendar size={16} />} label={`Starts ${formatDateTime(drop.start_time)}`} sub={`Ends ${formatDateTime(drop.end_time)}`} />
                <Row
                  icon={<Clock size={16} />}
                  label={ended ? 'Drop ended' : closed ? 'RSVP closed' : `RSVP closes ${relativeTime(drop.rsvp_deadline, now)}`}
                  sub={!ended && !closed ? formatDateTime(drop.rsvp_deadline) : undefined}
                />
              </div>

              {/* RSVP controls */}
              {!confirmCancel ? (
                <div className="mt-6">
                  {myStatus && (
                    <div className="text-[12px] mb-2" style={{ color: '#8A8A9A' }}>
                      Your RSVP: <span style={{ color: '#C2E9FF', fontWeight: 600 }}>
                        {myStatus === 'going' ? 'Going' : 'Maybe'}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <RsvpButton
                      label={ended ? 'Drop Ended' : full ? 'Drop Full' : 'Going'}
                      active={myStatus === 'going'}
                      disabled={editingLocked || full}
                      onClick={() => chooseStatus('going')}
                    />
                    <RsvpButton
                      label={closed ? 'RSVP Closed' : 'Maybe'}
                      active={myStatus === 'maybe'}
                      disabled={editingLocked}
                      onClick={() => chooseStatus('maybe')}
                    />
                  </div>
                  {myStatus && !editingLocked && (
                    <button
                      onClick={() => setConfirmCancel(true)}
                      className="mt-3 w-full text-[13px] font-medium py-2 rounded-xl transition-opacity active:opacity-70"
                      style={{ color: '#FF9E9E', background: 'rgba(255,140,140,0.08)', border: '1px solid rgba(255,140,140,0.18)' }}
                    >
                      Cancel RSVP
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-6 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-[14px] font-semibold text-white mb-1">Cancel your RSVP to this drop?</div>
                  <div className="text-[12px] mb-4" style={{ color: '#8A8A9A' }}>You can always join again before the deadline.</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setConfirmCancel(false)}
                      className="h-11 rounded-xl text-[14px] font-semibold"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }}
                    >Keep RSVP</button>
                    <button
                      onClick={doCancel}
                      className="h-11 rounded-xl text-[14px] font-bold"
                      style={{ background: '#FF9E9E', color: '#0A0A0F' }}
                    >Cancel RSVP</button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ color: '#C2E9FF', marginTop: 2 }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-white font-medium">{label}</div>
        {sub && <div className="text-[12px] mt-0.5" style={{ color: '#8A8A9A' }}>{sub}</div>}
      </div>
    </div>
  );
}

function RsvpButton({ label, active, disabled, onClick }: {
  label: string; active: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-12 rounded-xl text-[14px] font-bold transition-all active:scale-[0.98] disabled:opacity-60"
      style={{
        background: active ? '#C2E9FF' : 'rgba(255,255,255,0.06)',
        color: active ? '#0A0A0F' : disabled ? '#8A8A9A' : '#fff',
        border: active ? 'none' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: active ? '0 4px 20px rgba(194,233,255,0.25)' : 'none',
      }}
    >{label}</button>
  );
}
