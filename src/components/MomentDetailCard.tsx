import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MomentDetail {
  id: string;
  title: string;
  creator: string;
  lat: number;
  lng: number;
  expiresAt: Date;
}

interface Props {
  moment: MomentDetail | null;
  onClose: () => void;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'expired';
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin} min left`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m left`;
}

export default function MomentDetailCard({ moment, onClose }: Props) {
  const [remaining, setRemaining] = useState(0);
  const [going, setGoing] = useState(false);

  useEffect(() => {
    if (!moment) return;
    setGoing(false);
    setRemaining(moment.expiresAt.getTime() - Date.now());
    const id = setInterval(() => {
      setRemaining(moment.expiresAt.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [moment]);

  const urgent = remaining < 10 * 60 * 1000 && remaining > 0;

  return (
    <AnimatePresence>
      {moment && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
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

            <h3 className="text-[20px] font-bold text-white">{moment.title}</h3>
            <p className="mt-1 text-[14px]" style={{ color: '#8A8A9A' }}>Dropped by {moment.creator}</p>
            <p className="mt-3 text-[16px] font-bold" style={{ color: urgent ? '#FBBF24' : '#C2E9FF' }}>
              {formatRemaining(remaining)}
            </p>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setGoing(true)}
                disabled={going}
                className="flex-1 py-3 text-[15px] font-bold transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: going ? '#34D399' : '#C2E9FF',
                  color: '#0A0A0F',
                  borderRadius: 14,
                }}
              >
                {going ? "You're in! ✓" : "I'm Going 🙋"}
              </button>
              <button
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${moment.lat},${moment.lng}`, '_blank')}
                className="flex-1 py-3 text-[15px] font-bold transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: 'transparent',
                  border: '1.5px solid #C2E9FF',
                  color: '#C2E9FF',
                  borderRadius: 14,
                }}
              >
                Get Directions 📍
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
