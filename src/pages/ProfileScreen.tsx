import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LogOut, Ghost, Edit2, Check } from 'lucide-react';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { profile, setProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isGhost, setIsGhost] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [momentCount, setMomentCount] = useState(0);

  useEffect(() => {
    if (profile) setDisplayName(profile.display_name || '');
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_locations').select('is_visible').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setIsGhost(!data.is_visible); });
    supabase.from('friendships').select('*', { count: 'exact', head: true })
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .then(({ count }) => setFriendCount(count ?? 0));
    supabase.from('moments').select('*', { count: 'exact', head: true })
      .eq('creator_id', user.id)
      .then(({ count }) => setMomentCount(count ?? 0));
  }, [user]);

  const saveDisplayName = async () => {
    if (!user || !displayName.trim()) return;
    const { error } = await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', user.id);
    if (error) toast.error('Failed to update');
    else {
      toast.success('Updated!');
      setProfile(prev => prev ? { ...prev, display_name: displayName.trim() } : prev);
      setEditing(false);
    }
  };

  const toggleGhost = async () => {
    if (!user) return;
    const newVal = !isGhost;
    setIsGhost(newVal);
    await supabase.from('user_locations').update({ is_visible: !newVal }).eq('user_id', user.id);
    toast(newVal ? 'Ghost mode on 👻' : 'You\'re visible');
  };

  if (!profile) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  const initial = (profile.display_name || profile.username)[0].toUpperCase();

  return (
    <div className="flex flex-col h-[calc(100dvh-56px-env(safe-area-inset-bottom,8px))] bg-background px-4 pt-[calc(env(safe-area-inset-top,12px)+12px)]">
      <div className="flex flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-3xl font-bold text-foreground mb-3">
          {initial}
        </div>

        {editing ? (
          <div className="flex items-center gap-2 mb-1">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-9 w-48 rounded-lg border-border bg-card text-foreground text-center"
              maxLength={30}
            />
            <button onClick={saveDisplayName} className="text-primary"><Check size={18} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-foreground">{profile.display_name || profile.username}</h2>
            <button onClick={() => setEditing(true)} className="text-muted-foreground"><Edit2 size={14} /></button>
          </div>
        )}

        <p className="text-sm text-muted-foreground">@{profile.username}</p>
        <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>

        <div className="flex gap-8 mt-6">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{friendCount}</p>
            <p className="text-xs text-muted-foreground">Friends</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{momentCount}</p>
            <p className="text-xs text-muted-foreground">Moments</p>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <div className="flex items-center justify-between rounded-xl bg-card p-4 border border-border">
          <div className="flex items-center gap-3">
            <Ghost size={20} className="text-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Ghost Mode</p>
              <p className="text-xs text-muted-foreground">Hide from friends' maps</p>
            </div>
          </div>
          <button
            onClick={toggleGhost}
            className={`h-7 w-12 rounded-full transition-colors ${isGhost ? 'sera-gradient' : 'bg-secondary'}`}
          >
            <div className={`h-5 w-5 rounded-full bg-foreground transition-transform ${isGhost ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary p-3 text-primary font-medium"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
