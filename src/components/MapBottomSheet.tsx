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
import { useDemoMode } from '@/lib/demoMode';

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
  | { type: 'status' }
  | { type: 'profile'; friend: FriendCardData };

interface Props {
  height: SheetHeight;
  content: SheetContent;
  onHeightChange: (h: SheetHeight) => void;
  onClose: () => void;
  friendsActive: Array<{ id: string; name: string; initial: string; color: string; lat: number; lng: number; status: string }>;
  onSelectFriend: (id: string) => void;
  onSelectBusiness: (b: Business) => void;
  onAISuggestion: (action: AISuggestion['action']) => void;
  currentStatus: string | null;
  isGhost: boolean;
  onSetStatus: (text: string) => void;
  onToggleGhost: () => void;
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
  onSelectFriend,
  onSelectBusiness,
  onAISuggestion,
  currentStatus,
  isGhost,
  onSetStatus,
  onToggleGhost,
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
                onSelectFriend={onSelectFriend}
                onSelectBusiness={onSelectBusiness}
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
    default:
      return c.type;
  }
}

/* ─────────────────────────────────────────────
 * Default browse (friends row + happening now + AI)
 * ───────────────────────────────────────────── */

function DefaultBrowse({
  friends,
  onPeekTap,
}: {
  friends: Props['friendsActive'];
  onSelectFriend: (id: string) => void;
  onSelectBusiness: (b: Business) => void;
  onAISuggestion: (a: AISuggestion['action']) => void;
  onPeekTap: () => void;
  isPeek: boolean;
}) {
  const dealsCount = MOCK_BUSINESSES.filter((b) => b.promotedMoment.active).length;

  return (
    <div>
      {/* Peek summary row */}
      <button
        onClick={onPeekTap}
        className="flex w-full items-center justify-between px-5 py-2 text-left transition-opacity active:opacity-80"
      >
        <span style={{ fontSize: 13, color: '#fff' }}>
          <span style={{ color: '#fff', fontWeight: 600 }}>{friends.length}</span>{' '}
          <span style={{ color: '#8A8A9A' }}>friends nearby ·</span>{' '}
          <span style={{ color: '#fff', fontWeight: 600 }}>{dealsCount}</span>{' '}
          <span style={{ color: '#8A8A9A' }}>deals</span>
        </span>
        <ChevronRight size={16} color="#555566" />
      </button>
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
  const [demoMode] = useDemoMode();
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
        { value: '12', label: 'Drops' },
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
              mutualCount: demoMode ? mutualCountForFriend(friend.id) : 0,
              isFriend: true,
              userId: demoMode ? undefined : friend.id,
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
