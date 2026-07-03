import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function PausedBanner() {
  const { user } = useAuth();
  const [pausedUntil, setPausedUntil] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('preferences').select('paused_until').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setPausedUntil((data as any)?.paused_until ?? null));
  }, [user]);

  const active = pausedUntil && new Date(pausedUntil).getTime() > Date.now();
  if (!active) return null;

  const unpause = async () => {
    if (!user) return;
    await supabase.from('preferences').update({ paused_until: null }).eq('user_id', user.id);
    setPausedUntil(null);
    toast('Unpaused', { position: 'top-center', duration: 1500 });
  };

  return (
    <div
      className="glass-widget absolute z-30 flex items-center justify-between"
      style={{
        top: 'calc(env(safe-area-inset-top, 12px) + 92px)',
        left: 16, right: 16, padding: '8px 12px', borderRadius: 12,
      }}
    >
      <p style={{ color: '#fff', fontSize: 12 }}>Paused — you won't get plan notifications</p>
      <button onClick={unpause} style={{ color: '#C2E9FF', fontSize: 12, fontWeight: 600 }}>Unpause</button>
    </div>
  );
}
