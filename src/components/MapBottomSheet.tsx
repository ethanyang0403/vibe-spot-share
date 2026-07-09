// Find My-style persistent bottom sheet for the Map tab.
// One sheet, three height states (peek/half/full), contextual content.

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronRight, X as XIcon, Compass } from 'lucide-react';
import type { FriendCardData } from './FriendDetailCard';

import { Business, MOCK_BUSINESSES, CROWD_LEVELS, CROWD_LABEL } from '@/lib/businessesMock';
import { mutualCountForFriend } from '@/lib/nearbyMock';
import { openPersonProfile } from '@/lib/profileBus';
import ProfileView from './ProfileView';
import { getProfileFor } from '@/lib/profilesMock';
import { AI_SUGGESTIONS, type AISuggestion } from '@/lib/aiSuggestions';

const SPRING = { type: 'spring' as const, damping: 32, stiffness: 380, mass: 0.9 };
const TOAST_STYLE = {
  background: 'rgba(14, 14, 20, 0.65)',
  backdropFilter: 'blur(40px) saturate(180%)',
  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
  color: '#fff',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
};

export type SheetHeight = 'peek' | 'half' | 'full';

export type SheetContent =
  | { type: 'default' }
  | { type: 'friend'; friend: FriendCardData }
  | { type: 'business'; business: Business }
  | { type: 'moment'; moment: MomentDetail }
  | { type: 'status' }
  | { type: 'create-moment' }
  | { type: 'profile'; friend: FriendCardData };

interface Props {
  height: SheetHeight;
  content: SheetContent;
  onHeightChange: (h: SheetHeight) => void;
  onClose: () => void; // collapse to peek + reset to default
  // Default browse counts
  friendsActive: Array<{ id: string; name: string; initial: string; color: string; lat: number; lng: number; status: string }>;
  momentsActive: Array<{ id: string; title: string; expiresAt: Date; lat: number; lng: number; creator: string }>;
  // Browse + AI handlers
  onSelectFriend: (id: string) => void;
  onSelectBusiness: (b: Business) => void;
  onSelectMoment: (id: string) => void;
  onAISuggestion: (action: AISuggestion['action']) => void;
  // Status setter
  currentStatus: string | null;
  isGhost: boolean;
  onSetStatus: (text: string) => void;
  onToggleGhost: () => void;
  // Create moment
  onCreateMoment: (title: string, durationMinutes: number) => void;
  // Friend actions
  onPing: (friendId: string) => void;
}

const PEEK_HEIGHT = 90;          // visible bottom strip in peek state
const HALF_RATIO = 0.5;          // sheet covers ~50% of viewport
const FULL_RATIO = 0.9;          // ~90% of viewport
const FLICK_VELOCITY = 500;      // px/s threshold

function useViewportHeight() {
  const [h, setH] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight));
  useEffect(() => {
    const onResize = () => setH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return h;
}

function distanceMiles(lat: number, lng: number): string {
  const raw = (Math.abs(lat - 42.3655) + Math.abs(lng + 71.2597)) * 200;
  const clamped = Math.min(0.8, Math.max(0.1, raw));
  return clamped.toFixed(1);
}

function formatRemainingMs(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MapBottomSheet({
  height,
  content,
  onHeightChange,
  onClose,
  friendsActive,
  momentsActive,
  onSelectFriend,
  onSelectBusiness,
  onSelectMoment,
  onAISuggestion,
  currentStatus,
  isGhost,
  onSetStatus,
  onToggleGhost,
  onCreateMoment,
  onPing,
}: Props) {
  const vh = useViewportHeight();

  // Sheet's heights for each state, measured from the bottom of the screen UP.
  const heightForState = useMemo(() => ({
    peek: PEEK_HEIGHT,
    half: Math.round(vh * HALF_RATIO),
    full: Math.round(vh * FULL_RATIO),
  }), [vh]);

  // Translate-Y values for each state. Sheet has a fixed `height` of FULL,
  // so we move it down to reveal less. y=0 means full open; y>0 means hidden.
  const yForState = useMemo(() => ({
    peek: heightForState.full - heightForState.peek,
    half: heightForState.full - heightForState.half,
    full: 0,
  }), [heightForState]);

  const y = useMotionValue(yForState[height]);

  // Animate to target whenever height (or sizing) changes.
  useEffect(() => {
    const controls = animate(y, yForState[height], SPRING);
    return () => controls.stop();
  }, [height, yForState, y]);

  const dragRef = useRef({ startY: 0 });

  const handleDragStart = () => {
    dragRef.current.startY = y.get();
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const current = y.get();
    const v = info.velocity.y;

    // Strong flicks override snap-to-nearest
    if (v > FLICK_VELOCITY) {
      // Flicking down
      if (height === 'full') return onHeightChange('half');
      return onHeightChange('peek');
    }
    if (v < -FLICK_VELOCITY) {
      // Flicking up
      if (height === 'peek') return onHeightChange('half');
      return onHeightChange('full');
    }

    // Snap to nearest of the three states by translate-Y
    const states: SheetHeight[] = ['full', 'half', 'peek'];
    let nearest: SheetHeight = 'peek';
    let best = Infinity;
    for (const s of states) {
      const d = Math.abs(current - yForState[s]);
      if (d < best) {
        best = d;
        nearest = s;
      }
    }
    onHeightChange(nearest);
  };

  // Handle bar tap on peek → expand to half
  const handleHandleTap = () => {
    if (height === 'peek') onHeightChange('half');
    else if (height === 'half') onHeightChange('full');
    else onHeightChange('half');
  };

  // Drag constraints: can drag between full (y=0) and peek (y=peek-y).
  // We allow a bit of elastic past the bounds.
  return (
    <motion.div
      className="glass fixed left-0 right-0 bottom-0 z-30"
      style={{
        height: heightForState.full,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.5)',
        y,
        touchAction: 'none',
      }}
      drag="y"
      dragConstraints={{ top: 0, bottom: yForState.peek }}
      dragElastic={0.06}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Specular top highlight */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Drag handle */}
      <button
        onClick={handleHandleTap}
        aria-label="Drag to resize"
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: 8,
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.25)',
          padding: 0,
          zIndex: 3,
        }}
      />

      {/* Close (✕) — visible only when content is non-default OR sheet is Full */}
      {(content.type !== 'default' || height === 'full') && (
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute flex items-center justify-center transition-transform active:scale-[0.92]"
          style={{
            top: 14,
            right: 16,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: 'rgba(255,255,255,0.06)',
            color: '#fff',
            zIndex: 3,
          }}
        >
          <XIcon size={16} />
        </button>
      )}

      {/* Scrollable content area */}
      <div
        className="absolute inset-x-0 overflow-y-auto"
        style={{
          top: 24,
          bottom: 0,
          paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 8px))',
          zIndex: 2,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={contentKey(content)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            {content.type === 'default' && (
              <DefaultBrowse
                friends={friendsActive}
                moments={momentsActive}
                onSelectFriend={onSelectFriend}
                onSelectBusiness={onSelectBusiness}
                onSelectMoment={onSelectMoment}
                onAISuggestion={onAISuggestion}
                onPeekTap={() => onHeightChange('half')}
                isPeek={height === 'peek'}
              />
            )}
            {content.type === 'friend' && (
              <FriendDetail
                friend={content.friend}
                onPing={() => onPing(content.friend.id)}
                onViewProfile={() => onHeightChange('full')}
              />
            )}
            {content.type === 'profile' && (
              <FullProfile friend={content.friend} />
            )}
            {content.type === 'business' && (
              <BusinessDetail business={content.business} />
            )}
            {content.type === 'moment' && (
              <MomentDetailContent moment={content.moment} />
            )}
            {content.type === 'status' && (
              <StatusSetter
                currentStatus={currentStatus}
                isGhost={isGhost}
                onSetStatus={(t) => {
                  onSetStatus(t);
                  onClose();
                }}
                onToggleGhost={onToggleGhost}
              />
            )}
            {content.type === 'create-moment' && (
              <CreateMomentForm
                onCreate={(title, dur) => {
                  onCreateMoment(title, dur);
                  onClose();
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function contentKey(c: SheetContent): string {
  switch (c.type) {
    case 'friend':
      return `friend:${c.friend.id}`;
    case 'profile':
      return `profile:${c.friend.id}`;
    case 'business':
      return `business:${c.business.id}`;
    case 'moment':
      return `moment:${c.moment.id}`;
    default:
      return c.type;
  }
}

/* ─────────────────────────────────────────────
 * Default browse (friends row + happening now + AI)
 * ───────────────────────────────────────────── */

function DefaultBrowse({
  friends,
  moments,
  onSelectFriend,
  onSelectBusiness,
  onSelectMoment,
  onAISuggestion,
  onPeekTap,
  isPeek,
}: {
  friends: Props['friendsActive'];
  moments: Props['momentsActive'];
  onSelectFriend: (id: string) => void;
  onSelectBusiness: (b: Business) => void;
  onSelectMoment: (id: string) => void;
  onAISuggestion: (a: AISuggestion['action']) => void;
  onPeekTap: () => void;
  isPeek: boolean;
}) {
  const liveDeals = MOCK_BUSINESSES.filter((b) => b.promotedMoment.active);
  const dealsCount = liveDeals.length;
  const aiSuggestion = AI_SUGGESTIONS[0];

  // Mix moments + deals, sorted by remaining time
  const happeningNow = useMemo(() => {
    const m = moments.map((x) => ({
      kind: 'moment' as const,
      id: x.id,
      title: x.title,
      subtitle: `Created by ${x.creator}`,
      icon: x.title.match(/\p{Emoji}/u)?.[0] ?? '✨',
      remainingMin: Math.max(0, Math.round((x.expiresAt.getTime() - Date.now()) / 60000)),
      moment: x,
    }));
    const d = liveDeals.map((b) => ({
      kind: 'deal' as const,
      id: b.id,
      title: b.promotedMoment.title!,
      subtitle: b.name,
      icon: b.icon,
      remainingMin: b.promotedMoment.expiresInMinutes ?? 0,
      business: b,
    }));
    return [...m, ...d]
      .sort((a, b) => a.remainingMin - b.remainingMin)
      .slice(0, 4);
  }, [moments, liveDeals]);

  return (
    <div>
      {/* Peek summary row — always rendered so it's visible at peek height */}
      <button
        onClick={onPeekTap}
        className="flex w-full items-center justify-between px-5 py-2 text-left transition-opacity active:opacity-80"
      >
        <span style={{ fontSize: 13, color: '#fff' }}>
          <span style={{ color: '#fff', fontWeight: 600 }}>{friends.length}</span>{' '}
          <span style={{ color: '#8A8A9A' }}>friends nearby ·</span>{' '}
          <span style={{ color: '#fff', fontWeight: 600 }}>{moments.length}</span>{' '}
          <span style={{ color: '#8A8A9A' }}>live Moments ·</span>{' '}
          <span style={{ color: '#fff', fontWeight: 600 }}>{dealsCount}</span>{' '}
          <span style={{ color: '#8A8A9A' }}>deals</span>
        </span>
        <ChevronRight size={16} color="#555566" />
      </button>

      {/* Half/Full content — friends row, happening now, AI */}
      {!isPeek && (
        <>
          {/* Friends Active Now */}
          <SectionLabel>Friends Active Now</SectionLabel>
          <div
            className="mt-2 flex gap-3 overflow-x-auto px-4 pb-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {friends.map((f) => (
              <button
                key={f.id}
                onClick={() => onSelectFriend(f.id)}
                className="flex shrink-0 flex-col items-center gap-1 transition-transform active:scale-[0.96]"
                style={{ width: 60 }}
              >
                <div
                  className="relative flex items-center justify-center rounded-full font-bold text-white"
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: f.color,
                    border: '1.5px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    fontSize: 18,
                  }}
                >
                  {f.initial}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -1,
                      right: -1,
                      width: 10,
                      height: 10,
                      borderRadius: '9999px',
                      backgroundColor: '#34D399',
                      border: '1.5px solid #0E0E14',
                    }}
                  />
                </div>
                <span className="truncate" style={{ fontSize: 11, color: '#8A8A9A', maxWidth: 60 }}>
                  {f.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>

          {/* Happening Now */}
          <SectionLabel>Happening Now</SectionLabel>
          <div className="mx-4 mt-2 flex flex-col gap-2">
            {happeningNow.map((row) => (
              <button
                key={`${row.kind}:${row.id}`}
                onClick={() => {
                  if (row.kind === 'moment') onSelectMoment(row.id);
                  else onSelectBusiness(row.business);
                }}
                className="flex items-center gap-3 px-4 py-3 text-left transition-transform active:scale-[0.99]"
                style={{
                  background: 'rgba(20, 20, 28, 0.55)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14,
                }}
              >
                <span
                  className="flex shrink-0 items-center justify-center"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '9999px',
                    background: 'rgba(28, 28, 38, 0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: 16,
                  }}
                >
                  {row.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-white" style={{ fontSize: 14, fontWeight: 600 }}>
                    {row.title}
                  </p>
                  <p className="truncate" style={{ fontSize: 12, color: '#8A8A9A' }}>
                    {row.subtitle}
                  </p>
                </div>
                <span
                  className="shrink-0"
                  style={{ fontSize: 12, fontWeight: 700, color: '#C2E9FF' }}
                >
                  {row.remainingMin} min
                </span>
              </button>
            ))}
          </div>

          {/* For You — AI suggestion */}
          <SectionLabel>For You</SectionLabel>
          <button
            onClick={() => onAISuggestion(aiSuggestion.action)}
            className="mx-4 mt-2 block w-[calc(100%-2rem)] text-left transition-transform active:scale-[0.99]"
            style={{
              background: 'rgba(20, 20, 28, 0.55)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderLeft: '3px solid rgba(194, 233, 255, 0.3)',
              borderRadius: 14,
              padding: '14px 16px',
            }}
          >
            <p
              style={{
                fontSize: 10,
                color: '#555566',
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                fontWeight: 600,
              }}
            >
              Suggested for you
            </p>
            <div className="mt-2 flex items-start gap-3">
              <div
                className="flex shrink-0 items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '9999px',
                  background: 'rgba(28, 28, 38, 0.6)',
                  fontSize: 18,
                }}
              >
                {aiSuggestion.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p style={{ fontSize: 14, color: '#fff', fontWeight: 600, lineHeight: 1.3 }}>
                  {aiSuggestion.text}
                </p>
                <p style={{ fontSize: 12, color: '#8A8A9A', marginTop: 2 }}>
                  {aiSuggestion.context}
                </p>
              </div>
            </div>
            <p
              className="mt-2 text-right"
              style={{ fontSize: 12, color: '#C2E9FF', fontWeight: 600 }}
            >
              See more →
            </p>
          </button>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Friend detail
 * ───────────────────────────────────────────── */

function FriendDetail({
  friend,
  onPing,
  onViewProfile,
}: {
  friend: FriendCardData;
  onPing: () => void;
  onViewProfile: () => void;
}) {
  const [pinged, setPinged] = useState(false);

  useEffect(() => {
    setPinged(false);
  }, [friend.id]);

  const handlePing = () => {
    if (pinged) return;
    setPinged(true);
    onPing();
    toast(`Ping sent to ${friend.name} 👋`, { style: TOAST_STYLE, position: 'top-center', duration: 2500 });
  };

  const directions = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${friend.lat},${friend.lng}`, '_blank');
  };

  return (
    <div className="px-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="relative flex shrink-0 items-center justify-center rounded-full text-[24px] font-bold text-white"
          style={{
            width: 56,
            height: 56,
            backgroundColor: friend.color,
            border: '1.5px solid #fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {friend.initial}
          <span
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 12,
              height: 12,
              borderRadius: '9999px',
              backgroundColor: '#34D399',
              border: '2px solid #0E0E14',
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-white" style={{ fontSize: 20, fontWeight: 700 }}>
              {friend.name}
            </p>
            <span
              className="glass-pill"
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#C2E9FF',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              1st
            </span>
          </div>
          <p className="truncate" style={{ fontSize: 13, color: '#8A8A9A', fontStyle: 'italic' }}>
            📍 {friend.status}
          </p>
          <p style={{ fontSize: 12, color: '#555566' }}>
            {distanceMiles(friend.lat, friend.lng)} mi away · {mutualCountForFriend(friend.id)} mutual friends
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-5 flex gap-2">
        <button
          onClick={handlePing}
          disabled={pinged}
          className="flex-1 font-bold transition-all active:scale-[0.97]"
          style={{
            height: 44,
            borderRadius: 14,
            backgroundColor: pinged ? '#34D399' : '#C2E9FF',
            color: '#0A0A0F',
            fontSize: 15,
          }}
        >
          {pinged ? 'Pinged ✓' : 'Ping 👋'}
        </button>
        <button
          onClick={directions}
          className="flex flex-1 items-center justify-center gap-1.5 font-bold transition-all active:scale-[0.97]"
          style={{
            height: 44,
            borderRadius: 14,
            background: 'rgba(20, 20, 28, 0.55)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 15,
          }}
        >
          <Compass size={16} />
          Directions
        </button>
      </div>

      {/* View Profile link → expands to Full */}
      <button
        onClick={onViewProfile}
        className="mt-3 block w-full text-center transition-opacity active:opacity-70"
        style={{ fontSize: 13, color: '#C2E9FF', fontWeight: 600 }}
      >
        View Profile →
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Full profile (Hinge-style) inside the sheet
 * ───────────────────────────────────────────── */

function FullProfile({ friend }: { friend: FriendCardData }) {
  const profile = getProfileFor(friend.name);
  return (
    <ProfileView
      profile={profile}
      otherName={friend.name}
      otherDegree="1st"
      otherColor={friend.color}
      otherInitial={friend.initial}
      stats={[
        { value: String(mutualCountForFriend(friend.id)), label: 'Mutual friends' },
        { value: '12', label: 'Moments' },
        { value: '4', label: 'This week' },
      ]}
    >
      <div className="mx-4 mb-4 mt-6 flex gap-2">
        <button
          onClick={() =>
            openPersonProfile({
              name: friend.name,
              initial: friend.initial,
              color: friend.color,
              degree: '1st',
              mutualCount: mutualCountForFriend(friend.id),
              isFriend: true,
              lat: friend.lat,
              lng: friend.lng,
            })
          }
          className="flex-1 font-bold transition-all active:scale-[0.97]"
          style={{
            height: 46,
            borderRadius: 14,
            backgroundColor: '#C2E9FF',
            color: '#0A0A0F',
            fontSize: 15,
          }}
        >
          Ping 👋
        </button>
        <button
          onClick={() =>
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${friend.lat},${friend.lng}`, '_blank')
          }
          className="flex-1 font-bold transition-all active:scale-[0.97]"
          style={{
            height: 46,
            borderRadius: 14,
            background: 'rgba(20, 20, 28, 0.55)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 15,
          }}
        >
          Directions
        </button>
      </div>
    </ProfileView>
  );
}

/* ─────────────────────────────────────────────
 * Business detail
 * ───────────────────────────────────────────── */

function BusinessDetail({ business }: { business: Business }) {
  const [going, setGoing] = useState(false);
  const [peopleCount, setPeopleCount] = useState(business.promotedMoment.peopleSaid ?? 0);

  useEffect(() => {
    setGoing(false);
    setPeopleCount(business.promotedMoment.peopleSaid ?? 0);
  }, [business.id]);

  const handleGoing = () => {
    setGoing(true);
    setPeopleCount((c) => c + 1);
    toast(`See you at ${business.name}! 🎉`, { style: TOAST_STYLE, position: 'top-center', duration: 2500 });
  };

  const directions = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}`, '_blank');
  };

  return (
    <div className="px-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: '9999px',
            background: 'rgba(28, 28, 38, 0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: 22,
          }}
        >
          {business.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-white" style={{ fontSize: 20, fontWeight: 700 }}>
              {business.name}
            </p>
            {business.promotedMoment.active && (
              <span
                className="glass-pill"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#C2E9FF',
                  padding: '2px 8px',
                  borderRadius: 999,
                  letterSpacing: 0.5,
                }}
              >
                Promoted
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#8A8A9A' }}>
            {business.type[0].toUpperCase() + business.type.slice(1)} · ⭐ {business.rating}
          </p>
          <p style={{ fontSize: 12, color: '#555566' }}>{business.hours}</p>
        </div>
      </div>

      {/* Crowd indicator */}
      <div className="mt-4">
        <p style={{ fontSize: 12, color: '#8A8A9A', marginBottom: 6 }}>Right now:</p>
        <div className="flex gap-1.5">
          {CROWD_LEVELS.map((lvl) => {
            const active = lvl === business.crowdLevel;
            return (
              <span
                key={lvl}
                style={{
                  fontSize: 11,
                  padding: '4px 12px',
                  borderRadius: 12,
                  color: active ? '#C2E9FF' : '#555566',
                  background: active ? 'rgba(194, 233, 255, 0.15)' : 'rgba(28, 28, 38, 0.45)',
                  border: active ? '1px solid rgba(194, 233, 255, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {CROWD_LABEL[lvl]}
              </span>
            );
          })}
        </div>
      </div>

      {/* Live deal */}
      {business.promotedMoment.active && (
        <div
          className="mt-4"
          style={{
            background: 'rgba(20, 20, 28, 0.55)',
            border: '1px solid rgba(194, 233, 255, 0.2)',
            borderRadius: 14,
            padding: 16,
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, color: '#C2E9FF', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Live Deal
          </p>
          <p className="mt-1 text-white" style={{ fontSize: 16, fontWeight: 700 }}>
            {business.promotedMoment.title}
          </p>
          <p className="mt-1" style={{ fontSize: 13, fontWeight: 700, color: '#C2E9FF' }}>
            Ends in {business.promotedMoment.expiresInMinutes} min
          </p>
          <p className="mt-0.5" style={{ fontSize: 12, color: '#8A8A9A' }}>
            {peopleCount} people said they're going
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex gap-2">
        <button
          onClick={directions}
          className="flex-1 font-bold transition-all active:scale-[0.97]"
          style={{ height: 46, borderRadius: 14, backgroundColor: '#C2E9FF', color: '#0A0A0F', fontSize: 15 }}
        >
          Get Directions
        </button>
        {business.promotedMoment.active && (
          <button
            onClick={going ? undefined : handleGoing}
            disabled={going}
            className="flex-1 font-bold transition-all active:scale-[0.97]"
            style={{
              height: 46,
              borderRadius: 14,
              background: going ? '#34D399' : 'rgba(20, 20, 28, 0.55)',
              border: going ? 'none' : '1px solid rgba(255,255,255,0.1)',
              color: going ? '#0A0A0F' : '#fff',
              fontSize: 15,
            }}
          >
            {going ? "You're in! ✓" : "I'm Going 🙋"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Moment detail
 * ───────────────────────────────────────────── */

function MomentDetailContent({ moment }: { moment: MomentDetail }) {
  const [remaining, setRemaining] = useState(moment.expiresAt.getTime() - Date.now());
  const [going, setGoing] = useState(false);

  useEffect(() => {
    setGoing(false);
    setRemaining(moment.expiresAt.getTime() - Date.now());
    const id = setInterval(() => setRemaining(moment.expiresAt.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [moment.id]);

  const urgent = remaining < 10 * 60 * 1000 && remaining > 0;
  const critical = remaining < 5 * 60 * 1000 && remaining > 0;
  const timerColor = critical ? '#F87171' : urgent ? '#FBBF24' : '#C2E9FF';

  const directions = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${moment.lat},${moment.lng}`, '_blank');
  };

  return (
    <div className="px-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative flex shrink-0 items-center justify-center" style={{ width: 56, height: 56 }}>
          <span
            className="moment-ring"
            style={{
              position: 'absolute',
              inset: 12,
              borderRadius: '9999px',
              backgroundColor: '#C2E9FF',
              opacity: 0.5,
            }}
          />
          <span
            className="glass-card"
            style={{
              position: 'relative',
              width: 48,
              height: 48,
              borderRadius: '9999px',
              border: '1px solid rgba(194, 233, 255, 0.4)',
              background: 'rgba(194, 233, 255, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              boxShadow: '0 4px 16px rgba(194, 233, 255, 0.2)',
            }}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>
              {moment.title.match(/\p{Emoji}/u)?.[0] ?? '✨'}
            </span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-white" style={{ fontSize: 20, fontWeight: 700 }}>
            {moment.title}
          </p>
          <p style={{ fontSize: 13, color: '#8A8A9A' }}>Created by {moment.creator}</p>
          <p style={{ fontSize: 12, color: '#555566' }}>{distanceMiles(moment.lat, moment.lng)} mi away</p>
        </div>
      </div>

      {/* Big countdown */}
      <div className="mt-5 text-center">
        <p style={{ fontSize: 28, fontWeight: 800, color: timerColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {formatRemainingMs(remaining)}
        </p>
        <p style={{ fontSize: 11, color: '#555566', marginTop: 4 }}>remaining</p>
      </div>

      {/* Attendees mock */}
      <div className="mt-5 flex items-center gap-3">
        <div className="flex">
          {['#7C3AED', '#2563EB', '#059669', '#D97706', '#EC4899'].map((c, i) => (
            <span
              key={i}
              className="flex items-center justify-center font-bold text-white"
              style={{
                width: 32,
                height: 32,
                borderRadius: '9999px',
                background: c,
                border: '2px solid #0E0E14',
                marginLeft: i === 0 ? 0 : -8,
                fontSize: 12,
              }}
            >
              {String.fromCharCode(65 + i)}
            </span>
          ))}
          <span
            className="flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: '9999px',
              background: 'rgba(28, 28, 38, 0.6)',
              border: '2px solid #0E0E14',
              color: '#8A8A9A',
              fontSize: 11,
              fontWeight: 700,
              marginLeft: -8,
            }}
          >
            +12
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#8A8A9A' }}>17 people going</p>
      </div>

      {/* Actions */}
      <div className="mt-5 flex gap-2">
        <button
          onClick={() => setGoing(true)}
          disabled={going}
          className="flex-1 font-bold transition-all active:scale-[0.97]"
          style={{
            height: 46,
            borderRadius: 14,
            backgroundColor: going ? '#34D399' : '#C2E9FF',
            color: '#0A0A0F',
            fontSize: 15,
          }}
        >
          {going ? "You're Going ✓" : "I'm Going 🙋"}
        </button>
        <button
          onClick={directions}
          className="flex-1 font-bold transition-all active:scale-[0.97]"
          style={{
            height: 46,
            borderRadius: 14,
            background: 'rgba(20, 20, 28, 0.55)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 15,
          }}
        >
          Directions
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Status setter
 * ───────────────────────────────────────────── */

const PRESETS = [
  'down to hang 🙌',
  'grabbing food 🍕',
  'studying 📚',
  'at the gym 💪',
  'exploring 🗺️',
  'bored 😐',
];

function StatusSetter({
  currentStatus,
  isGhost,
  onSetStatus,
  onToggleGhost,
}: {
  currentStatus: string | null;
  isGhost: boolean;
  onSetStatus: (text: string) => void;
  onToggleGhost: () => void;
}) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(
    currentStatus && PRESETS.includes(currentStatus) ? currentStatus : null,
  );
  const [custom, setCustom] = useState(currentStatus && !PRESETS.includes(currentStatus) ? currentStatus : '');

  const finalStatus = custom.trim() || selectedPreset || '';
  const canSubmit = finalStatus.length > 0;

  return (
    <div className="px-4">
      <h3 className="mb-4 text-white" style={{ fontSize: 20, fontWeight: 700 }}>
        What are you up to?
      </h3>

      <div className="grid grid-cols-2 gap-2.5">
        {PRESETS.map((p) => {
          const selected = selectedPreset === p && !custom.trim();
          return (
            <button
              key={p}
              onClick={() => {
                setSelectedPreset(p);
                setCustom('');
              }}
              className="text-center transition-all active:scale-[0.97]"
              style={{
                fontSize: 14,
                padding: '12px 12px',
                borderRadius: 14,
                background: selected ? 'rgba(194, 233, 255, 0.12)' : 'rgba(28, 28, 38, 0.45)',
                border: selected ? '1px solid rgba(194, 233, 255, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: selected ? '#C2E9FF' : '#fff',
              }}
            >
              {p}
            </button>
          );
        })}
      </div>

      <input
        value={custom}
        onChange={(e) => {
          setCustom(e.target.value);
          if (e.target.value) setSelectedPreset(null);
        }}
        placeholder="Set a custom status..."
        maxLength={50}
        className="mt-4 w-full text-white outline-none"
        style={{
          background: 'rgba(20, 20, 28, 0.55)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '12px 14px',
          fontSize: 14,
        }}
      />

      <button
        onClick={() => canSubmit && onSetStatus(finalStatus)}
        disabled={!canSubmit}
        className="mt-4 w-full font-bold transition-all active:scale-[0.97]"
        style={{
          height: 46,
          borderRadius: 14,
          backgroundColor: canSubmit ? '#C2E9FF' : 'rgba(28, 28, 38, 0.45)',
          color: canSubmit ? '#0A0A0F' : '#555566',
          fontSize: 15,
        }}
      >
        Set Status
      </button>

      {/* Ghost toggle row */}
      <div
        className="mt-4 flex items-center justify-between"
        style={{
          background: 'rgba(20, 20, 28, 0.55)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: '12px 14px',
        }}
      >
        <div>
          <p className="text-white" style={{ fontSize: 15 }}>Ghost Mode</p>
          <p style={{ fontSize: 12, color: '#555566' }}>Hide from the map</p>
        </div>
        <button
          onClick={onToggleGhost}
          className="relative transition-colors"
          style={{
            width: 48,
            height: 28,
            borderRadius: 999,
            background: isGhost ? '#C2E9FF' : 'rgba(28, 28, 38, 0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          aria-label="Toggle ghost mode"
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: isGhost ? 22 : 2,
              width: 22,
              height: 22,
              borderRadius: '9999px',
              background: '#fff',
              transition: 'left 200ms ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }}
          />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Create Moment form
 * ───────────────────────────────────────────── */

const DURATIONS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hr', minutes: 60 },
  { label: '2 hrs', minutes: 120 },
  { label: '3 hrs', minutes: 180 },
];

function CreateMomentForm({ onCreate }: { onCreate: (title: string, dur: number) => void }) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);

  return (
    <div className="px-4">
      <h3 className="mb-4 text-white" style={{ fontSize: 20, fontWeight: 700 }}>
        Drop a Moment
      </h3>

      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="what's happening right now?"
        maxLength={80}
        className="w-full text-white outline-none placeholder:text-[#555566]"
        style={{
          background: 'rgba(20, 20, 28, 0.55)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '14px 16px',
          fontSize: 16,
        }}
      />

      <p className="mt-4" style={{ fontSize: 13, color: '#8A8A9A' }}>How long?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {DURATIONS.map(({ label, minutes }) => {
          const selected = duration === minutes;
          return (
            <button
              key={minutes}
              onClick={() => setDuration(minutes)}
              className="transition-all active:scale-[0.97]"
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                background: selected ? '#C2E9FF' : 'rgba(28, 28, 38, 0.45)',
                color: selected ? '#0A0A0F' : '#8A8A9A',
                border: selected ? 'none' : '1px solid rgba(255,255,255,0.08)',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <p className="mt-4" style={{ fontSize: 13, color: '#8A8A9A' }}>📍 Dropping at your current location</p>

      <button
        onClick={() => title.trim() && onCreate(title.trim(), duration)}
        disabled={!title.trim()}
        className="mt-4 w-full font-bold transition-all active:scale-[0.97] disabled:opacity-50"
        style={{
          height: 48,
          borderRadius: 14,
          backgroundColor: '#C2E9FF',
          color: '#0A0A0F',
          fontSize: 16,
        }}
      >
        Drop It 🔥
      </button>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p
      className="mx-4 mt-5"
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#555566',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </p>
  );
}
