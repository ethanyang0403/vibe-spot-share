import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { X, MapPin, Users, Clock, Calendar, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DROP_CATEGORIES } from './CreateDropSheet';
import { relativeTime, formatDateTime, rsvpClosed, dropStatus } from '@/lib/dropTime';

export interface DropRow {
  id: string;
  creator_id: string;
  title: string;
  category: string;
  description: string | null;
  location_name: string;
  location_details: string | null;
  capacity: number;
  start_time: string;
  end_time: string;
  rsvp_deadline: string;
  created_at: string;
}

interface Props {
  dropId: string | null;
  onClose: () => void;
}

export default function DropDetailsSheet({ dropId, onClose }: Props) {
  const { user } = useAuth();
  const [drop, setDrop] = useState<DropRow | null>(null);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(new Date());
  const [hostName, setHostName] = useState<string>('the host');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!dropId) return;
    setMessageText('');
    setMessageSent(false);
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [{ data: d }, { data: rsvps }] = await Promise.all([
        supabase.from('drops').select('*').eq('id', dropId).maybeSingle(),
        supabase.from('drop_rsvps').select('user_id').eq('drop_id', dropId),
      ]);
      if (cancelled) return;
      setDrop((d as DropRow) ?? null);
      setAttendeeCount(rsvps?.length ?? 0);
      setJoined(!!rsvps?.some((r) => r.user_id === user?.id));
      setLoading(false);
      if (d?.creator_id) {
        const { data: h } = await supabase
          .from('profiles').select('display_name, username').eq('id', d.creator_id).maybeSingle();
        if (!cancelled) setHostName(h?.display_name || h?.username || 'the host');
      }
    };
    load();
    return () => { cancelled = true; };
  }, [dropId, user?.id]);

  useEffect(() => {
    if (!dropId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dropId, onClose]);

  const handleRsvp = async () => {
    if (!user) { toast.error('Please sign in first'); return; }
    if (!drop) return;
    setPending(true);
    if (joined) {
      const { error } = await supabase.from('drop_rsvps').delete()
        .eq('drop_id', drop.id).eq('user_id', user.id);
      setPending(false);
      if (error) { toast.error('Could not cancel RSVP'); return; }
      setJoined(false);
      setAttendeeCount((c) => Math.max(0, c - 1));
      toast('Cancelled RSVP');
    } else {
      const { error } = await supabase.from('drop_rsvps').insert({ drop_id: drop.id, user_id: user.id });
      setPending(false);
      if (error) {
        const msg = error.message?.includes('full') ? 'This drop is full' :
                    error.message?.includes('deadline') ? 'RSVP deadline has passed' :
                    error.message?.includes('ended') ? 'This drop has ended' :
                    error.message?.includes('duplicate') ? "You've already RSVP'd" : error.message;
        toast.error(msg || 'Could not RSVP');
        return;
      }
      setJoined(true);
      setAttendeeCount((c) => c + 1);
      toast.success("You're in 🎉");
    }
  };

  const handleSendMessage = async () => {
    if (!user || !drop) return;
    const text = messageText.trim();
    if (!text || sending || messageSent) return;
    if (drop.creator_id === user.id) {
      toast.error("You're the host — can't message yourself");
      return;
    }
    setSending(true);
    const { error } = await supabase.from('pings').insert({
      sender_id: user.id,
      recipient_id: drop.creator_id,
      message: `[${drop.title}] ${text}`,
      read: false,
    });
    setSending(false);
    if (error) { toast.error(`Couldn't send: ${error.message}`); return; }
    setMessageSent(true);
    setMessageText('');
    toast.success(`Message sent to ${hostName} ✓`);
  };


  const open = !!dropId;
  const cat = drop ? DROP_CATEGORIES.find((c) => c.id === drop.category) : null;
  const status = drop ? dropStatus(drop, now) : 'upcoming';
  const closed = drop ? rsvpClosed(drop, now) : false;
  const full = drop ? attendeeCount >= drop.capacity : false;
  const spotsLeft = drop ? Math.max(0, drop.capacity - attendeeCount) : 0;

  let cta: { label: string; disabled: boolean; tone: 'primary' | 'muted' | 'joined' } = { label: 'RSVP', disabled: false, tone: 'primary' };
  if (status === 'ended') cta = { label: 'Drop Ended', disabled: true, tone: 'muted' };
  else if (closed) cta = { label: 'RSVP Closed', disabled: true, tone: 'muted' };
  else if (joined) cta = { label: 'Joined ✓ · Tap to cancel', disabled: false, tone: 'joined' };
  else if (full) cta = { label: 'Drop Full', disabled: true, tone: 'muted' };
  else cta = { label: 'RSVP · Join Drop', disabled: false, tone: 'primary' };

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
              {loading || !drop ? (
                <div className="py-16 text-center" style={{ color: '#8A8A9A' }}>Loading…</div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, background: 'rgba(194,233,255,0.12)', color: '#C2E9FF', fontWeight: 600 }}>
                      {cat?.emoji} {cat?.label ?? drop.category}
                    </span>
                    {status === 'live' && (
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,140,140,0.15)', color: '#FF9E9E', fontWeight: 700, letterSpacing: 0.5 }}>
                        LIVE
                      </span>
                    )}
                    {status === 'ended' && (
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: '#8A8A9A', fontWeight: 700 }}>
                        ENDED
                      </span>
                    )}
                  </div>

                  <h2 className="text-white text-[22px] font-bold mb-1">{drop.title}</h2>
                  <p className="text-[12px]" style={{ color: '#555566' }}>Created {relativeTime(drop.created_at, now)}</p>

                  {drop.description && (
                    <p className="text-[14px] mt-4" style={{ color: '#C7C7D1', lineHeight: 1.5 }}>{drop.description}</p>
                  )}

                  <div className="mt-5 space-y-3">
                    <Row icon={<MapPin size={16} />} label={drop.location_name} sub={drop.location_details ?? undefined} />
                    <Row icon={<Users size={16} />}
                         label={`${attendeeCount} / ${drop.capacity} attending`}
                         sub={full ? 'No spots left' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} remaining`} />
                    <Row icon={<Calendar size={16} />} label={`Starts ${formatDateTime(drop.start_time)}`} sub={`Ends ${formatDateTime(drop.end_time)}`} />
                    <Row icon={<Clock size={16} />}
                         label={
                           status === 'ended' ? 'Drop ended' :
                           closed ? 'RSVP closed' :
                           `RSVP closes ${relativeTime(drop.rsvp_deadline, now)}`
                         }
                         sub={status !== 'ended' && !closed ? formatDateTime(drop.rsvp_deadline) : undefined} />
                  </div>

                  <button
                    onClick={handleRsvp}
                    disabled={cta.disabled || pending}
                    className="mt-6 h-13 w-full text-[16px] font-bold transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{
                      height: 52,
                      borderRadius: 14,
                      background: cta.tone === 'primary' ? '#C2E9FF' : cta.tone === 'joined' ? 'rgba(194,233,255,0.15)' : 'rgba(255,255,255,0.06)',
                      color: cta.tone === 'primary' ? '#0A0A0F' : cta.tone === 'joined' ? '#C2E9FF' : '#8A8A9A',
                      border: cta.tone === 'joined' ? '1px solid rgba(194,233,255,0.35)' : 'none',
                      boxShadow: cta.tone === 'primary' ? '0 4px 20px rgba(194,233,255,0.25)' : 'none',
                    }}
                  >
                    {pending ? '…' : cta.label}
                  </button>

                  {joined && drop.creator_id !== user?.id && (
                    <div className="mt-5">
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#555566', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                        Message {hostName.split(' ')[0]}
                      </p>
                      <p className="mt-1" style={{ fontSize: 12, color: '#8A8A9A' }}>
                        Ask a question or say you're on the way — they'll get it as a ping.
                      </p>
                      <div
                        className="mt-3 flex items-center gap-2"
                        style={{
                          height: 50, borderRadius: 14, padding: '0 6px 0 14px',
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <input
                          type="text"
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                          placeholder={messageSent ? 'Sent ✓' : `On my way! What should I bring?`}
                          disabled={messageSent}
                          maxLength={200}
                          className="flex-1 bg-transparent outline-none text-white"
                          style={{ fontSize: 14 }}
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={sending || messageSent || !messageText.trim()}
                          aria-label="Send message"
                          className="flex items-center justify-center transition-all active:scale-95"
                          style={{
                            width: 38, height: 38, borderRadius: 12,
                            backgroundColor: messageSent ? '#34D399' : (messageText.trim() ? '#C2E9FF' : 'rgba(194,233,255,0.25)'),
                            color: '#0A0A0F',
                          }}
                        >
                          <Send size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
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
