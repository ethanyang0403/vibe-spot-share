// Full-screen bottom-sheet modal for viewing another person's profile.
// Used from FriendDetailCard, StrangerDetailCard, FriendsScreen, and PingsScreen.

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import ProfileView from './ProfileView';
import { getProfileFor } from '@/lib/profilesMock';

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
  // Optional coordinates for "Directions"
  lat?: number;
  lng?: number;
}

interface Props {
  target: PersonProfileTarget | null;
  onClose: () => void;
}

export default function PersonProfileModal({ target, onClose }: Props) {
  const [requested, setRequested] = useState(false);
  const [pinged, setPinged] = useState(false);

  const handlePrimary = () => {
    if (!target) return;
    if (target.isFriend) {
      if (pinged) return;
      setPinged(true);
      toast(`Ping sent to ${target.name} 👋`, {
        style: TOAST_STYLE, position: 'top-center', duration: 2500,
      });
    } else {
      if (requested) return;
      setRequested(true);
      toast(`Friend request sent to ${target.name}`, {
        style: TOAST_STYLE, position: 'top-center', duration: 2500,
      });
    }
  };

  const handleDirections = () => {
    if (!target?.lat || !target?.lng) {
      toast('Directions unavailable', { style: TOAST_STYLE, position: 'top-center', duration: 1800 });
      return;
    }
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}`,
      '_blank',
    );
  };

  return (
    <AnimatePresence>
      {target && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 z-[70] flex flex-col"
            style={{
              top: 'env(safe-area-inset-top, 0px)',
              backgroundColor: '#0A0A0F',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            {/* Sticky header with close */}
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

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto pb-10">
              <ProfileView
                profile={getProfileFor(target.name)}
                otherName={target.name}
                otherDegree={target.degree}
                otherColor={target.color}
                otherInitial={target.initial}
                stats={[
                  {
                    value: target.isFriend ? `${target.mutualCount}` : `${target.mutualCount}`,
                    label: target.isFriend ? 'Mutual friends' : 'Mutuals',
                  },
                  { value: '—', label: 'Moments' },
                  { value: target.degree, label: 'Connection' },
                ]}
              >
                <div className="mx-4 mt-8 flex flex-col gap-3" style={{ marginBottom: 32 }}>
                  <button
                    onClick={handlePrimary}
                    disabled={target.isFriend ? pinged : requested}
                    className="font-bold transition-all active:scale-[0.97]"
                    style={{
                      height: 46,
                      borderRadius: 14,
                      backgroundColor:
                        (target.isFriend ? pinged : requested) ? '#34D399' : '#C2E9FF',
                      color: '#0A0A0F',
                      fontSize: 15,
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
                      height: 46,
                      borderRadius: 14,
                      backgroundColor: 'transparent',
                      border: '1.5px solid #C2E9FF',
                      color: '#C2E9FF',
                      fontSize: 15,
                    }}
                  >
                    Directions 📍
                  </button>
                </div>
              </ProfileView>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
