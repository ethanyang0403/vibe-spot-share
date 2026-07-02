import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';
import ProfileView from '@/components/ProfileView';
import { OWN_PROFILE } from '@/lib/profilesMock';
import { FRIEND_LIST } from '@/lib/friendsMock';
import { useDemoMode } from '@/lib/demoMode';

const TOAST_STYLE = {
  backgroundColor: '#141419',
  color: '#fff',
  border: '1px solid #2A2A35',
  borderRadius: 12,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [isGhost, setIsGhost] = useState(false);
  const [friendCount, setFriendCount] = useState(8);
  const [momentCount, setMomentCount] = useState(3);
  const [pingCount] = useState(12);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_locations').select('is_visible').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setIsGhost(!data.is_visible); });
    supabase.from('friendships').select('*', { count: 'exact', head: true })
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .then(({ count }) => setFriendCount(count ?? 8));
    supabase.from('moments').select('*', { count: 'exact', head: true })
      .eq('creator_id', user.id)
      .then(({ count }) => setMomentCount(count ?? 3));
  }, [user]);

  const toggleGhost = async () => {
    if (!user) return;
    const newVal = !isGhost;
    setIsGhost(newVal);
    await supabase.from('user_locations').update({ is_visible: !newVal }).eq('user_id', user.id);
    toast(newVal ? 'Ghost mode on 👻' : "You're visible", {
      style: TOAST_STYLE, position: 'top-center', duration: 2000,
    });
  };

  if (!profile) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: '#0A0A0F' }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: '#C2E9FF', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const displayName = profile.display_name || profile.username;

  return (
    <div
      className="flex flex-col h-[calc(100dvh-56px-env(safe-area-inset-bottom,8px))]"
      style={{ backgroundColor: '#0A0A0F' }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 12px) + 12px)',
          paddingBottom: 8,
        }}
      >
        <button
          aria-label="Settings"
          className="active:scale-95 transition-all glass-pill flex items-center justify-center"
          style={{ width: 36, height: 36, borderRadius: 12 }}
        >
          <Settings size={18} color="#8A8A9A" />
        </button>
        <button
          onClick={() => setEditing((e) => !e)}
          className="active:scale-95 transition-all glass-pill"
          style={{
            color: '#C2E9FF',
            fontSize: 14,
            fontWeight: 600,
            padding: '6px 16px',
            borderRadius: 12,
            border: '1px solid rgba(194, 233, 255, 0.25)',
          }}
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Scrollable profile */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 32 }}>
        <ProfileView
          profile={OWN_PROFILE}
          ownName={displayName}
          stats={[
            { value: String(friendCount), label: 'Friends' },
            { value: String(momentCount), label: 'Moments' },
            { value: String(pingCount), label: 'Pings Sent' },
          ]}
          editing={editing}
        >
          <div className="mx-4" style={{ marginTop: 32, marginBottom: 120 }}>
            {/* Ghost Mode row */}
            <div
              className="flex items-center justify-between glass-card"
              style={{
                padding: '14px 16px',
                borderRadius: 14,
              }}
            >
              <div>
                <p style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>Ghost Mode</p>
                <p style={{ color: '#555566', fontSize: 12, marginTop: 2 }}>Hide from the map</p>
              </div>
              <button
                onClick={toggleGhost}
                aria-label="Toggle ghost mode"
                className="relative transition-all active:scale-95"
                style={{
                  width: 46,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: isGhost ? '#C2E9FF' : 'rgba(28, 28, 38, 0.45)',
                  border: isGhost ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <span
                  className="absolute top-1/2"
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#fff',
                    transform: `translateY(-50%) translateX(${isGhost ? 23 : 3}px)`,
                    transition: 'transform 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                />
              </button>
            </div>

            {/* Email */}
            <p className="mt-4 text-center" style={{ color: '#555566', fontSize: 12 }}>
              {user?.email}
            </p>

            {/* Sign Out */}
            <button
              onClick={signOut}
              className="w-full active:scale-[0.97] transition-all"
              style={{
                marginTop: 16,
                height: 46,
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#8A8A9A',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 14,
              }}
            >
              Sign Out
            </button>
          </div>
        </ProfileView>
      </div>
    </div>
  );
}
