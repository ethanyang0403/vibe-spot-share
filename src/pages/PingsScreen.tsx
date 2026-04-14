import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { MapPin } from 'lucide-react';

interface Ping {
  id: string;
  sender_id: string;
  message: string | null;
  latitude: number | null;
  longitude: number | null;
  read: boolean;
  created_at: string;
  sender: { display_name: string | null; username: string };
}

export default function PingsScreen() {
  const { user } = useAuth();
  const [pings, setPings] = useState<Ping[]>([]);

  const fetchPings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pings')
      .select('*, sender:profiles!pings_sender_id_fkey(display_name, username)')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setPings(data.map((d: any) => ({ ...d, sender: d.sender })));
  };

  useEffect(() => {
    fetchPings();
    // Mark all as read
    if (user) {
      supabase.from('pings').update({ read: true }).eq('recipient_id', user.id).eq('read', false).then();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('pings-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pings', filter: `recipient_id=eq.${user.id}` }, () => fetchPings())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <div className="flex flex-col h-[calc(100dvh-56px-env(safe-area-inset-bottom,8px))] bg-background">
      <div className="px-4 pt-[calc(env(safe-area-inset-top,12px)+12px)] pb-3">
        <h1 className="text-2xl font-bold text-foreground">Pings</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {pings.length === 0 ? (
          <p className="text-center text-muted-foreground mt-12">No pings yet</p>
        ) : (
          <div className="space-y-2">
            {pings.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl bg-card p-4 border border-border relative ${!p.read ? 'border-l-2 border-l-primary' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{p.sender.display_name || p.sender.username}</p>
                    {p.message && <p className="text-sm text-muted-foreground mt-1">{p.message}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                  </span>
                </div>
                {p.latitude && p.longitude && (
                  <button
                    onClick={() => window.open(`https://maps.google.com/?q=${p.latitude},${p.longitude}`, '_blank')}
                    className="mt-2 flex items-center gap-1 text-xs text-primary"
                  >
                    <MapPin size={12} /> View on map
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
