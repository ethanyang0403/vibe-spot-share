import { Map, Radar, Users, Bell, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const tabs = [
  { path: '/', icon: Map, label: 'Map' },
  { path: '/nearby', icon: Radar, label: 'Nearby' },
  { path: '/friends', icon: Users, label: 'Friends' },
  { path: '/pings', icon: Bell, label: 'Pings' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('pings')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('read', false);
      setUnreadCount(count ?? 0);
    };
    fetchUnread();

    const channel = supabase
      .channel('ping-badge')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pings',
        filter: `recipient_id=eq.${user.id}`,
      }, () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around border-t border-border bg-background pb-[env(safe-area-inset-bottom,8px)] pt-2"
      style={{ height: 'calc(56px + env(safe-area-inset-bottom, 8px))' }}
    >
      {tabs.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-0.5 relative"
          >
            <div className="relative">
              <Icon size={22} className={active ? 'text-primary' : 'text-muted-foreground'} />
              {label === 'Pings' && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full sera-gradient px-1 text-[10px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] ${active ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
