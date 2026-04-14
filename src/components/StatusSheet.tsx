import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const presets = ['down to hang', 'studying', 'grabbing food', 'at the gym', 'exploring', 'bored'];

interface Props {
  open: boolean;
  onClose: () => void;
  currentStatus?: string | null;
}

export default function StatusSheet({ open, onClose, currentStatus }: Props) {
  const { user } = useAuth();
  const [custom, setCustom] = useState('');

  const setStatus = async (text: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('user_locations')
      .update({ status_text: text, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Status: ${text}`);
      onClose();
    }
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
              <h3 className="text-lg font-semibold text-foreground">Set your status</h3>
              <button onClick={onClose}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {presets.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    currentStatus === s
                      ? 'sera-gradient text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Custom status..."
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="h-10 rounded-xl border-border bg-background text-foreground"
                maxLength={50}
              />
              <Button
                onClick={() => custom.trim() && setStatus(custom.trim())}
                className="rounded-xl sera-gradient text-primary-foreground"
                disabled={!custom.trim()}
              >
                Set
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
