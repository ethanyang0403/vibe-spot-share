import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
}

const durations = [
  { label: '1hr', hours: 1 },
  { label: '2hr', hours: 2 },
  { label: '3hr', hours: 3 },
];

export default function CreateMoment({ open, onClose, latitude, longitude }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [selectedHours, setSelectedHours] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!user || !title.trim()) return;
    setSubmitting(true);

    const expiresAt = new Date(Date.now() + selectedHours * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('moments').insert({
      creator_id: user.id,
      title: title.trim(),
      latitude,
      longitude,
      expires_at: expiresAt,
    });

    if (error) {
      toast.error('Failed to create moment');
    } else {
      toast.success('Moment dropped! 🎯');
      setTitle('');
      onClose();
    }
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50" onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,8px))]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Drop a Moment</h3>
              <button onClick={onClose}><X size={20} className="text-muted-foreground" /></button>
            </div>

            <Input
              placeholder="what's happening?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mb-4 h-12 rounded-xl border-border bg-background text-foreground"
              maxLength={100}
            />

            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Duration</p>
              <div className="flex gap-2">
                {durations.map(({ label, hours }) => (
                  <button
                    key={hours}
                    onClick={() => setSelectedHours(hours)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                      selectedHours === hours
                        ? 'sera-gradient text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              📍 Dropping at your current location
            </p>

            <Button
              onClick={handleCreate}
              disabled={submitting || !title.trim()}
              className="h-12 w-full rounded-xl sera-gradient text-primary-foreground font-semibold text-base"
            >
              {submitting ? 'Dropping...' : 'Drop Moment'}
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
