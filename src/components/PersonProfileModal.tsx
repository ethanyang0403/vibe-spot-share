// Full-screen bottom-sheet modal for viewing another person's profile.
// In demo mode: renders the rich mock ProfileView.
// In real mode (userId provided): fetches profile, friendship, last-active,
// drops-hosted, and shows a quick-message composer for friends.

import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileView from './ProfileView';
import { getProfileFor } from '@/lib/profilesMock';
import { useDemoMode } from '@/lib/demoMode';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { relativeTime, stableColor, initialOf } from '@/lib/realProfileHelpers';
import { findOrCreateDirectConversation } from '@/lib/messaging/api';

const TOAST_STYLE = {
  backgroundColor: '#141419',
  color: '#fff',
  border: '1px solid #2A2A35',
  borderRadius: 12,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
};

export interface PersonProfileTarget {
  name: string;
  initial: string;
  color: string;
  degree: '1st' | '2nd' | '3rd';
  mutualCount: number;
  isFriend: boolean;
  // Real user id — when present, real-mode fetches from Supabase.
  userId?: string;
  // Optional coordinates for "Directions"
  lat?: number;
  lng?: number;
}

interface Props {
  target: PersonProfileTarget | null;
  onClose: () => void;
}

interface RealData {
  loading: boolean;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isFriend: boolean;
  hasPendingOutgoing: boolean;
  hasPendingIncoming: boolean;
  dropsHosted: number;
  lastActiveAt: string | null;
  statusText: string | null;
  isVisible: boolean;
}

export default function PersonProfileModal({ target, onClose }: Props) {
  const [demoMode] = useDemoMode();
  const { user } = useAuth();
  const navigate = useNavigate();

  async function openChat() {
    if (!target) return;
    if (demoMode) {
      onClose();
      navigate('/messages/demo-conv-1');
      return;
    }
    if (!target.userId) return;
    try {
      const convId = await findOrCreateDirectConversation(target.userId);
      onClose();
      navigate(`/messages/${convId}`);
    } catch (e: any) {
      toast(e?.message || 'Could not open chat', { style: TOAST_STYLE, position: 'top-center', duration: 2500 });
    }
  }
  const [requested, setRequested] = useState(false);
  const [pinged, setPinged] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [real, setReal] = useState<RealData | null>(null);

  const useReal = !demoMode && !!target?.userId;

  // Reset per-open state
  useEffect(() => {
    if (target) {
      setRequested(false);
      setPinged(false);
      setSent(false);
      setMessageText('');
      setReal(null);
    }
  }, [target]);

  // Fetch real data when opening in real mode
  useEffect(() => {
    if (!useReal || !target?.userId || !user?.id) return;
    let cancelled = false;
    (async () => {
      setReal({
        loading: true,
        displayName: target.name,
        username: null,
        avatarUrl: null,
        bio: null,
        isFriend: target.isFriend,
        hasPendingOutgoing: false,
        hasPendingIncoming: false,
        dropsHosted: 0,
        lastActiveAt: null,
        statusText: null,
        isVisible: false,
      });

      const [profileRes, friendshipRes, dropsRes, locRes] = await Promise.all([
        supabase.from('profiles').select('username, display_name, avatar_url, bio').eq('id', target.userId!).maybeSingle(),
        supabase.from('friendships').select('id, status, requester_id, addressee_id')
          .or(`and(requester_id.eq.${user.id},addressee_id.eq.${target.userId}),and(requester_id.eq.${target.userId},addressee_id.eq.${user.id})`)
          .maybeSingle(),
        supabase.from('drops').select('id', { count: 'exact', head: true }).eq('creator_id', target.userId!),
        supabase.from('user_locations').select('status_text, is_visible, updated_at').eq('user_id', target.userId!).maybeSingle(),
      ]);

      if (cancelled) return;
      const p = profileRes.data;
      const fr = friendshipRes.data;
      const loc = locRes.data;
      setReal({
        loading: false,
        displayName: p?.display_name || p?.username || target.name,
        username: p?.username ?? null,
        avatarUrl: p?.avatar_url ?? null,
        bio: (p as any)?.bio ?? null,
        isFriend: fr?.status === 'accepted',
        hasPendingOutgoing: fr?.status === 'pending' && fr?.requester_id === user.id,
        hasPendingIncoming: fr?.status === 'pending' && fr?.addressee_id === user.id,
        dropsHosted: dropsRes.count ?? 0,
        lastActiveAt: loc?.updated_at ?? null,
        statusText: loc?.status_text ?? null,
        isVisible: !!loc?.is_visible,
      });
    })();
    return () => { cancelled = true; };
  }, [useReal, target?.userId, user?.id, target?.name, target?.isFriend]);

  const handleSendMessage = async () => {
    if (!target?.userId || !user?.id) return;
    const text = messageText.trim();
    if (!text || sending || sent) return;
    setSending(true);
    const { error } = await supabase.from('pings').insert({
      sender_id: user.id,
      recipient_id: target.userId,
      message: text,
      read: false,
    });
    setSending(false);
    if (error) {
      toast(`Couldn't send: ${error.message}`, { style: TOAST_STYLE, position: 'top-center', duration: 2500 });
      return;
    }
    setSent(true);
    setMessageText('');
    toast(`Message sent to ${target.name} ✓`, { style: TOAST_STYLE, position: 'top-center', duration: 2500 });
  };

  const handleAddFriend = async () => {
    if (!target?.userId || !user?.id || requested) return;
    const { error } = await supabase.from('friendships').insert({
      requester_id: user.id,
      addressee_id: target.userId,
      status: 'pending',
    });
    if (error && !/duplicate|unique/i.test(error.message)) {
      toast(`Couldn't send request: ${error.message}`, { style: TOAST_STYLE, position: 'top-center', duration: 2500 });
      return;
    }
    setRequested(true);
    toast(`Friend request sent to ${target.name}`, { style: TOAST_STYLE, position: 'top-center', duration: 2500 });
  };

  const handleDemoPrimary = () => {
    if (!target) return;
    if (target.isFriend) {
      if (pinged) return;
      setPinged(true);
      toast(`Ping sent to ${target.name} 👋`, { style: TOAST_STYLE, position: 'top-center', duration: 2500 });
    } else {
      if (requested) return;
      setRequested(true);
      toast(`Friend request sent to ${target.name}`, { style: TOAST_STYLE, position: 'top-center', duration: 2500 });
    }
  };

  const handleDemoSendMessage = () => {
    if (!target || sent) return;
    const text = messageText.trim();
    if (!text) return;
    setSent(true);
    setMessageText('');
    toast(`Message sent to ${target.name} ✓`, { style: TOAST_STYLE, position: 'top-center', duration: 2500 });
  };

  const handleDirections = () => {
    if (!target?.lat || !target?.lng) {
      toast('Directions unavailable', { style: TOAST_STYLE, position: 'top-center', duration: 1800 });
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}`, '_blank');
  };

  return createPortal(
    <AnimatePresence>
      {target && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[120] bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 z-[121] flex flex-col"
            style={{
              top: 'env(safe-area-inset-top, 0px)',
              backgroundColor: '#0A0A0F',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <div
              className="relative z-10 flex items-center justify-between px-4"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top, 12px) + 12px)',
                paddingBottom: 12,
                backgroundColor: '#0A0A0F',
              }}
            >
              <span style={{ width: 24 }} />
              <p style={{ color: '#8A8A9A', fontSize: 13 }}>Profile</p>
              <button
                onClick={onClose}
                className="flex items-center justify-center transition-all active:scale-90"
                aria-label="Close"
              >
                <X size={22} color="#fff" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-10">
              {useReal ? (
                <RealProfileBody
                  target={target}
                  real={real}
                  sending={sending}
                  sent={sent}
                  requested={requested}
                  messageText={messageText}
                  onMessageChange={setMessageText}
                  onSend={handleSendMessage}
                  onAddFriend={handleAddFriend}
                  onDirections={handleDirections}
                  onOpenChat={openChat}
                />
              ) : (
                <ProfileView
                  profile={getProfileFor(target.name)}
                  otherName={target.name}
                  otherDegree={target.degree}
                  otherColor={target.color}
                  otherInitial={target.initial}
                  stats={[
                    { value: `${target.mutualCount}`, label: target.isFriend ? 'Mutual friends' : 'Mutuals' },
                    { value: '—', label: 'Drops' },
                    { value: target.degree, label: 'Connection' },
                  ]}
                >
                  <div className="mx-4 mt-8 flex flex-col gap-3" style={{ marginBottom: 32 }}>
                    <button
                      onClick={handleDemoPrimary}
                      disabled={target.isFriend ? pinged : requested}
                      className="font-bold transition-all active:scale-[0.97]"
                      style={{
                        height: 46, borderRadius: 14,
                        backgroundColor: (target.isFriend ? pinged : requested) ? '#34D399' : '#C2E9FF',
                        color: '#0A0A0F', fontSize: 15,
                      }}
                    >
                      {target.isFriend
                        ? pinged ? 'Pinged! ✓' : 'Ping 👋'
                        : requested ? 'Request Sent ✓' : '+ Add Friend'}
                    </button>
                    <button
                      onClick={handleDirections}
                      className="font-bold transition-all active:scale-[0.97]"
                      style={{
                        height: 46, borderRadius: 14, backgroundColor: 'transparent',
                        border: '1.5px solid #C2E9FF', color: '#C2E9FF', fontSize: 15,
                      }}
                    >
                      Directions 📍
                    </button>
                    {target.isFriend && (
                      <button
                        onClick={openChat}
                        className="flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.97]"
                        style={{
                          height: 46, borderRadius: 14, backgroundColor: 'rgba(194,233,255,0.10)',
                          border: '1px solid rgba(194,233,255,0.25)', color: '#C2E9FF', fontSize: 15,
                        }}
                      >
                        <MessageCircle size={16} /> Open chat
                      </button>
                    )}
                    

                    {/* Message composer — appears after Ping (demo, friend only) */}
                    <AnimatePresence>
                      {target.isFriend && pinged && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#555566', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                            Add a message
                          </p>
                          <div
                            className="mt-2 flex items-center gap-2"
                            style={{
                              height: 48, borderRadius: 14, padding: '0 6px 0 14px',
                              backgroundColor: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}
                          >
                            <input
                              type="text"
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleDemoSendMessage(); }}
                              placeholder={sent ? 'Sent ✓' : `Say hi to ${target.name.split(' ')[0]}…`}
                              disabled={sent}
                              maxLength={200}
                              className="flex-1 bg-transparent outline-none text-white"
                              style={{ fontSize: 14 }}
                            />
                            <button
                              onClick={handleDemoSendMessage}
                              disabled={sent || !messageText.trim()}
                              aria-label="Send message"
                              className="flex items-center justify-center transition-all active:scale-95"
                              style={{
                                width: 36, height: 36, borderRadius: 12,
                                backgroundColor: sent ? '#34D399' : (messageText.trim() ? '#C2E9FF' : 'rgba(194,233,255,0.25)'),
                                color: '#0A0A0F',
                              }}
                            >
                              <Send size={15} strokeWidth={2.5} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </ProfileView>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

interface RealBodyProps {
  target: PersonProfileTarget;
  real: RealData | null;
  sending: boolean;
  sent: boolean;
  requested: boolean;
  messageText: string;
  onMessageChange: (v: string) => void;
  onSend: () => void;
  onAddFriend: () => void;
  onDirections: () => void;
  onOpenChat: () => void;
}

function RealProfileBody({
  target, real, sending, sent, requested, messageText,
  onMessageChange, onSend, onAddFriend, onDirections, onOpenChat,
}: RealBodyProps) {
  const color = target.color || stableColor(target.userId || target.name);
  const initial = (real?.displayName ? initialOf(real.displayName) : target.initial) || '?';
  const displayName = real?.displayName || target.name;
  const username = real?.username;
  const isFriend = real?.isFriend ?? target.isFriend;

  const activityLine = (() => {
    if (!isFriend) return null;
    if (!real?.lastActiveAt) return 'Offline';
    if (real.isVisible && real.statusText) return `📍 ${real.statusText}`;
    return `Active ${relativeTime(real.lastActiveAt)}`;
  })();

  return (
    <>
      {/* Avatar hero */}
      <div className="mx-4 mt-4 overflow-hidden" style={{ borderRadius: 20, aspectRatio: '4 / 5', background: `linear-gradient(135deg, ${color} 0%, rgba(0,0,0,0.6) 100%)`, position: 'relative' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: 120, fontWeight: 800, color: '#fff', opacity: 0.35, lineHeight: 1 }}>{initial}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0" style={{ height: '35%', background: 'linear-gradient(transparent, rgba(10,10,15,0.9))' }} />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>{displayName}</p>
          {username && <p className="mt-1" style={{ fontSize: 14, color: '#cbcbd6' }}>@{username}</p>}
        </div>
      </div>

      {/* Degree + last-active */}
      <div className="mx-4 mt-3 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center" style={{ backgroundColor: '#C2E9FF', color: '#0A0A0F', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>
          {isFriend ? '1st' : target.degree}
        </span>
        {activityLine && (
          <span style={{ fontSize: 13, color: real?.isVisible && real?.statusText ? '#C2E9FF' : '#8A8A9A' }}>
            {activityLine}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="mx-4 mt-4 flex gap-2">
        <StatCard value={`${real?.dropsHosted ?? '—'}`} label="Drops hosted" />
        <StatCard value={isFriend ? '1st' : target.degree} label="Connection" />
        <StatCard value={`${target.mutualCount}`} label="Mutuals" />
      </div>

      {/* Bio */}
      {real?.bio && (
        <>
          <p className="mx-4 mt-5" style={{ fontSize: 11, fontWeight: 700, color: '#555566', letterSpacing: 1.5, textTransform: 'uppercase' }}>About</p>
          <p className="mx-4 mt-2 text-white" style={{ fontSize: 15, lineHeight: 1.5 }}>{real.bio}</p>
        </>
      )}

      {/* Actions */}
      <div className="mx-4 mt-8 flex flex-col gap-3" style={{ marginBottom: 32 }}>
        {isFriend ? (
          <>
            <div
              className="flex items-center gap-2"
              style={{
                height: 50, borderRadius: 14, padding: '0 6px 0 14px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <input
                type="text"
                value={messageText}
                onChange={(e) => onMessageChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
                placeholder={sent ? 'Sent ✓' : `Message ${displayName.split(' ')[0]}…`}
                disabled={sent}
                maxLength={200}
                className="flex-1 bg-transparent outline-none text-white"
                style={{ fontSize: 15 }}
              />
              <button
                onClick={onSend}
                disabled={sending || sent || !messageText.trim()}
                aria-label="Send message"
                className="flex items-center justify-center transition-all active:scale-95"
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  backgroundColor: sent ? '#34D399' : (messageText.trim() ? '#C2E9FF' : 'rgba(194,233,255,0.25)'),
                  color: '#0A0A0F',
                }}
              >
                <Send size={16} strokeWidth={2.5} />
              </button>
            </div>
            <button
              onClick={onOpenChat}
              className="flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.97]"
              style={{
                height: 46, borderRadius: 14, backgroundColor: '#C2E9FF', color: '#0A0A0F', fontSize: 15,
              }}
            >
              <MessageCircle size={16} /> Open full chat
            </button>
            <button
              onClick={onDirections}
              className="font-bold transition-all active:scale-[0.97]"
              style={{
                height: 46, borderRadius: 14, backgroundColor: 'transparent',
                border: '1.5px solid #C2E9FF', color: '#C2E9FF', fontSize: 15,
              }}
            >
              Directions 📍
            </button>
          </>
        ) : (
          <button
            onClick={onAddFriend}
            disabled={requested || real?.hasPendingOutgoing}
            className="font-bold transition-all active:scale-[0.97]"
            style={{
              height: 46, borderRadius: 14,
              backgroundColor: (requested || real?.hasPendingOutgoing) ? '#34D399' : '#C2E9FF',
              color: '#0A0A0F', fontSize: 15,
            }}
          >
            {requested || real?.hasPendingOutgoing ? 'Request Sent ✓' : '+ Add Friend'}
          </button>
        )}
      </div>
    </>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="flex-1 text-center"
      style={{
        backgroundColor: '#141419',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '10px 4px',
      }}
    >
      <p style={{ color: '#C2E9FF', fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>{value}</p>
      <p style={{ color: '#8A8A9A', fontSize: 11, marginTop: 2 }}>{label}</p>
    </div>
  );
}
