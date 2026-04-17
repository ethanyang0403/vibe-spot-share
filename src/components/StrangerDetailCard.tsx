import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { NearbyPerson } from '@/lib/nearbyMock';
import { openPersonProfile } from '@/lib/profileBus';

const TOAST_STYLE = {
  backgroundColor: '#141419',
  color: '#fff',
  border: '1px solid #2A2A35',
  borderRadius: 12,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
};

interface Props {
  person: NearbyPerson | null;
  onClose: () => void;
  onViewOnMap?: (person: NearbyPerson) => void;
}

function DegreeBadge({ degree }: { degree: 2 | 3 }) {
  const isSecond = degree === 2;
  return (
    <span
      className="inline-flex items-center text-[10px] font-bold"
      style={{
        padding: '2px 8px',
        borderRadius: 999,
        backgroundColor: isSecond ? 'rgba(194, 233, 255, 0.15)' : 'rgba(138, 138, 154, 0.15)',
        border: `1px solid ${isSecond ? 'rgba(194, 233, 255, 0.25)' : 'rgba(138, 138, 154, 0.25)'}`,
        color: isSecond ? '#C2E9FF' : '#8A8A9A',
      }}
    >
      {isSecond ? '2nd' : '3rd'}
    </span>
  );
}

function MutualAvatars({ mutuals }: { mutuals: string[] }) {
  const palette = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626'];
  const shown = mutuals.slice(0, 3);
  const extra = mutuals.length - shown.length;
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {shown.map((name, i) => (
          <div
            key={name}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{
              backgroundColor: palette[i % palette.length],
              border: '2px solid #141419',
              marginLeft: i === 0 ? 0 : -8,
            }}
          >
            {name[0]}
          </div>
        ))}
        {extra > 0 && (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
            style={{
              backgroundColor: '#1C1C24',
              border: '2px solid #141419',
              color: '#8A8A9A',
              marginLeft: -8,
            }}
          >
            +{extra}
          </div>
        )}
      </div>
      <p className="text-[13px]" style={{ color: '#8A8A9A' }}>
        {mutuals.length} mutual friend{mutuals.length === 1 ? '' : 's'}
      </p>
    </div>
  );
}

export default function StrangerDetailCard({ person, onClose, onViewOnMap }: Props) {
  const [requested, setRequested] = useState(false);
  const [pinged, setPinged] = useState(false);

  useEffect(() => {
    if (person) { setRequested(false); setPinged(false); }
  }, [person?.id]);

  if (!person) return null;

  const handleAdd = () => {
    if (requested) return;
    setRequested(true);
    toast(`Friend request sent to ${person.name}`, {
      style: TOAST_STYLE, position: 'top-center', duration: 2500,
    });
  };

  const handlePing = () => {
    if (pinged) return;
    setPinged(true);
    toast(`Ping sent to ${person.name} 👋`, {
      style: TOAST_STYLE, position: 'top-center', duration: 2500,
    });
    setTimeout(() => {
      toast(`${person.name.split(' ')[0]} got your ping!`, {
        style: TOAST_STYLE, position: 'top-center', duration: 2500,
      });
    }, 3000);
  };

  const showMutuals = person.connection.degree === 2 && person.connection.mutuals.length > 0;
  const showThrough = person.connection.degree === 3 && !!person.connection.through;
  const canPing = person.connection.degree === 2;

  return (
    <AnimatePresence>
      {person && (
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

            {/* Top */}
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[24px] font-bold text-white"
                style={{ backgroundColor: person.color, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
              >
                {person.initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[20px] font-bold text-white">{person.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[14px]" style={{ color: '#8A8A9A' }}>@{person.username}</p>
                  {(person.connection.degree === 2 || person.connection.degree === 3) && (
                    <DegreeBadge degree={person.connection.degree} />
                  )}
                </div>
              </div>
            </div>

            {/* Mutuals (2nd) */}
            {showMutuals && (
              <div className="mt-4">
                <MutualAvatars mutuals={person.connection.mutuals} />
                <p className="mt-2 text-[13px]" style={{ color: '#C2E9FF' }}>
                  {person.connection.mutuals.slice(0, 2).join(', ')}
                  {person.connection.mutuals.length > 2 ? ` +${person.connection.mutuals.length - 2}` : ''}
                </p>
              </div>
            )}

            {/* Through (3rd) */}
            {showThrough && (
              <p className="mt-4 text-[13px]" style={{ color: '#8A8A9A' }}>
                🔗 Through <span style={{ color: '#C2E9FF' }}>{person.connection.through}</span>
              </p>
            )}

            {/* Status + zone */}
            <p className="mt-4 text-[14px]" style={{ color: '#8A8A9A' }}>{person.status}</p>
            <p className="mt-1 text-[13px]" style={{ color: '#555566' }}>📍 {person.zone}</p>

            {/* Actions */}
            <div className="mt-5 flex flex-col gap-[10px]">
              <button
                onClick={handleAdd}
                disabled={requested}
                className="text-[15px] font-bold transition-all active:scale-[0.97]"
                style={{
                  height: 46, borderRadius: 14,
                  backgroundColor: requested ? '#34D399' : '#C2E9FF',
                  color: '#0A0A0F',
                }}
              >
                {requested ? 'Request Sent ✓' : '+ Add Friend'}
              </button>

              {canPing && (
                <button
                  onClick={handlePing}
                  disabled={pinged}
                  className="text-[15px] font-bold transition-all active:scale-[0.97]"
                  style={{
                    height: 46, borderRadius: 14,
                    backgroundColor: pinged ? '#34D399' : 'transparent',
                    border: pinged ? 'none' : '1.5px solid #C2E9FF',
                    color: pinged ? '#0A0A0F' : '#C2E9FF',
                  }}
                >
                  {pinged ? 'Pinged! ✓' : 'Ping 👋'}
                </button>
              )}

              <button
                onClick={() => { onViewOnMap?.(person); onClose(); }}
                className="mt-1 text-[13px] underline-offset-2 hover:underline"
                style={{ color: '#8A8A9A' }}
              >
                View approximate area on map →
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
