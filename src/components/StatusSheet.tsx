import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const PRESETS = [
  'down to hang 🙌',
  'grabbing food 🍕',
  'studying 📚',
  'at the gym 💪',
  'exploring 🗺️',
  'bored 😐',
];

const TOAST_STYLE = {
  backgroundColor: '#141419',
  color: '#fff',
  border: '1px solid #2A2A35',
  borderRadius: 12,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
};

interface Props {
  open: boolean;
  onClose: () => void;
  currentStatus?: string | null;
  onSetStatus: (text: string) => void;
}

export default function StatusSheet({ open, onClose, currentStatus, onSetStatus }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedPreset(currentStatus && PRESETS.includes(currentStatus) ? currentStatus : null);
      setCustom(currentStatus && !PRESETS.includes(currentStatus) ? currentStatus : '');
    }
  }, [open, currentStatus]);

  const finalStatus = custom.trim() || selectedPreset || '';
  const canSubmit = finalStatus.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSetStatus(finalStatus);
    toast('Status updated ✓', {
      style: TOAST_STYLE,
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
            transition={{ duration: 0.2 }}
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

            <h3 className="mb-5 text-[20px] font-bold text-white">What are you up to?</h3>

            <div className="grid grid-cols-2 gap-2.5">
              {PRESETS.map((preset) => {
                const selected = selectedPreset === preset && !custom.trim();
                return (
                  <button
                    key={preset}
                    onClick={() => {
                      setSelectedPreset(preset);
                      setCustom('');
                    }}
                    className="rounded-full px-4 py-3 text-[14px] text-center transition-all active:scale-[0.97]"
                    style={{
                      backgroundColor: selected ? '#C2E9FF' : '#1C1C24',
                      color: selected ? '#0A0A0F' : '#FFFFFF',
                      border: selected ? 'none' : '1px solid #2A2A35',
                    }}
                  >
                    {preset}
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
              placeholder="or type something..."
              maxLength={50}
              className="mt-4 w-full px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#555566]"
              style={{
                backgroundColor: '#0A0A0F',
                border: '1px solid #2A2A35',
                borderRadius: 12,
              }}
            />

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="mt-5 w-full text-[15px] font-bold transition-all active:scale-[0.97]"
              style={{
                height: 46,
                borderRadius: 14,
                backgroundColor: canSubmit ? '#C2E9FF' : '#1C1C24',
                color: canSubmit ? '#0A0A0F' : '#555566',
              }}
            >
              Set Status
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
