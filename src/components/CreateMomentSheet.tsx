import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string, durationMinutes: number) => void;
}

const DURATIONS = [
  { label: '1 hr', minutes: 60 },
  { label: '2 hrs', minutes: 120 },
  { label: '3 hrs', minutes: 180 },
];

export default function CreateMomentSheet({ open, onClose, onCreate }: Props) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle('');
      setDuration(60);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleDrop = () => {
    if (!title.trim()) return;
    onCreate(title.trim(), duration);
    toast('Moment dropped! 🔥', {
      style: { backgroundColor: '#1a1a2e', color: '#fff', border: '1px solid #2a2a3e' },
      position: 'top-center',
      duration: 2500,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,8px))]"
            style={{ backgroundColor: '#1a1a2e' }}
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full" style={{ backgroundColor: '#444' }} />

            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="what's happening right now?"
              maxLength={80}
              className="w-full bg-transparent pb-3 text-[20px] text-white outline-none"
              style={{ borderBottom: '1px solid #2a2a3e' }}
            />

            <div className="mt-5">
              <p className="mb-2 text-[13px]" style={{ color: '#888' }}>How long?</p>
              <div className="flex gap-2">
                {DURATIONS.map(({ label, minutes }) => {
                  const selected = duration === minutes;
                  return (
                    <button
                      key={minutes}
                      onClick={() => setDuration(minutes)}
                      className="rounded-full px-5 py-2 text-[14px] font-medium transition-colors"
                      style={{
                        backgroundColor: selected ? '#e94560' : '#2a2a3e',
                        color: selected ? '#fff' : '#888',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-4 text-[13px]" style={{ color: '#888' }}>
              📍 Dropping at your current location
            </p>

            <button
              onClick={handleDrop}
              disabled={!title.trim()}
              className="mt-5 h-12 w-full rounded-xl text-[16px] font-bold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#e94560' }}
            >
              Drop It 🔥
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
