import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useIntakeStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'incomplete' | 'complete'>('loading');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('intake_completed')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setStatus(data?.intake_completed ? 'complete' : 'incomplete');
      });
    return () => { cancelled = true; };
  }, [user]);

  const markComplete = () => setStatus('complete');
  return { status, markComplete };
}

export async function logEvent(userId: string, event_type: string, payload?: Record<string, any>) {
  try {
    await supabase.from('events').insert({ user_id: userId, event_type, payload: payload ?? null });
  } catch {}
}
