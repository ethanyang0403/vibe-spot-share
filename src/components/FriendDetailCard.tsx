import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { mutualCountForFriend } from '@/lib/nearbyMock';
import { openPersonProfile } from '@/lib/profileBus';
import { useDemoMode } from '@/lib/demoMode';

export interface FriendCardData {
  id: string;
  name: string;
  username: string;
  initial: string;
  color: string;
  status: string;
  lat: number;
  lng: number;
}

interface Props {
  friend: FriendCardData | null;
  onClose: () => void;
}

const TOAST_STYLE = {
  backgroundColor: '#141419',
  color: '#fff',
  border: '1px solid #2A2A35',
  borderRadius: 12,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
};

function distanceMiles(lat: number, lng: number): string {
  const raw = (Math.abs(lat - 42.3655) + Math.abs(lng + 71.2597)) * 200;
  const clamped = Math.min(0.8, Math.max(0.1, raw));
  return clamped.toFixed(1);
}

export default function FriendDetailCard({ friend, onClose }: Props) {
  const [demoMode] = useDemoMode();
  const [pinged, setPinged] = useState(false);

  useEffect(() => {
    if (friend) setPinged(false);
  }, [friend?.id]);

  const handlePing = () => {
    if (!friend || pinged) return;
    setPinged(true);
    toast(`Ping sent to ${friend.name} 👋`, {
      style: TOAST_STYLE,
      position: 'top-center',
      duration: 2500,
    });
    setTimeout(() => {
      toast(`${friend.name} is on their way! 🏃`, {
        style: TOAST_STYLE,
        position: 'top-center',
        duration: 2500,
      });
    }, 3000);
  };

  const handleDirections = () => {
    if (!friend) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${friend.lat},${friend.lng}`,
      '_blank',
    );
  };

  return (
    <AnimatePresence>
      {friend && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose(); }}
            className="fixed bottom-0 left-0 right-0 z-50 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,8px))]"
            style={{
              backgroundColor: '#141419',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: '#2A2A35' }} />

            {/* Top section */}
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[24px] font-bold text-white"
                style={{
                  backgroundColor: friend.color,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                {friend.initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[18px] font-bold text-white">{friend.name}</p>
                  <span
                    className="inline-flex items-center text-[10px] font-bold"
                    style={{ backgroundColor: '#C2E9FF', color: '#0A0A0F', padding: '2px 8px', borderRadius: 999 }}
                  >
                    1st
                  </span>
                </div>
                <p className="text-[14px]" style={{ color: '#8A8A9A' }}>@{friend.username}</p>
                <p className="text-[12px]" style={{ color: '#8A8A9A' }}>
                  🔗 {mutualCountForFriend(friend.id)} mutual friends
                </p>
                <p className="mt-0.5 truncate text-[14px]" style={{ color: '#aaa' }}>{friend.status}</p>
              </div>
            </div>

            {/* Distance */}
            <p className="mt-4 text-[14px]" style={{ color: '#8A8A9A' }}>
              📍 {distanceMiles(friend.lat, friend.lng)} miles away
            </p>

            {/* View Profile link */}
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
              className="mt-1 text-left transition-colors active:scale-[0.97]"
              style={{ fontSize: 12, color: '#8A8A9A' }}
            >
              View Profile →
            </button>

            {/* Buttons */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={handlePing}
                disabled={pinged}
                className="flex-1 text-[15px] font-bold transition-all active:scale-[0.97]"
                style={{
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: pinged ? '#34D399' : '#C2E9FF',
                  color: '#0A0A0F',
                }}
              >
                {pinged ? 'Pinged! ✓' : 'Ping 👋'}
              </button>
              <button
                onClick={handleDirections}
                className="flex-1 text-[15px] font-bold transition-all active:scale-[0.97]"
                style={{
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: 'transparent',
                  border: '1.5px solid #C2E9FF',
                  color: '#C2E9FF',
                }}
              >
                Directions 📍
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
