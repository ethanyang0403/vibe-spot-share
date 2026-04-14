import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Search, UserPlus, Check, X } from 'lucide-react';

interface FriendRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  profile: { id: string; username: string; display_name: string | null };
}

interface SearchResult {
  id: string;
  username: string;
  display_name: string | null;
}

export default function FriendsScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [requests, setRequests] = useState<FriendRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchFriends = async () => {
    if (!user) return;
    // Get accepted friendships
    const { data: sent } = await supabase
      .from('friendships')
      .select('*, profile:profiles!friendships_addressee_id_fkey(id, username, display_name)')
      .eq('requester_id', user.id)
      .eq('status', 'accepted');
    const { data: received } = await supabase
      .from('friendships')
      .select('*, profile:profiles!friendships_requester_id_fkey(id, username, display_name)')
      .eq('addressee_id', user.id)
      .eq('status', 'accepted');

    const all = [
      ...(sent || []).map((f: any) => ({ ...f, profile: f.profile })),
      ...(received || []).map((f: any) => ({ ...f, profile: f.profile })),
    ];
    setFriends(all);
  };

  const fetchRequests = async () => {
    if (!user) return;
    const { data: incoming } = await supabase
      .from('friendships')
      .select('*, profile:profiles!friendships_requester_id_fkey(id, username, display_name)')
      .eq('addressee_id', user.id)
      .eq('status', 'pending');
    setRequests((incoming || []).map((r: any) => ({ ...r, profile: r.profile })));
  };

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, [user]);

  const searchUsers = async () => {
    if (!user || !searchQuery.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .ilike('username', `%${searchQuery.trim()}%`)
      .neq('id', user.id)
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const sendRequest = async (toId: string) => {
    if (!user) return;
    const { error } = await supabase.from('friendships').insert({
      requester_id: user.id,
      addressee_id: toId,
    });
    if (error) {
      if (error.code === '23505') toast.error('Request already sent');
      else toast.error('Failed to send request');
    } else {
      toast.success('Friend request sent!');
      setSearchResults(prev => prev.filter(r => r.id !== toId));
    }
  };

  const respondRequest = async (friendshipId: string, accept: boolean) => {
    const { error } = await supabase.from('friendships').update({
      status: accept ? 'accepted' : 'declined',
    }).eq('id', friendshipId);
    if (error) toast.error('Failed');
    else {
      toast.success(accept ? 'Friend added!' : 'Request declined');
      fetchRequests();
      if (accept) fetchFriends();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-56px-env(safe-area-inset-bottom,8px))] bg-background">
      <div className="px-4 pt-[calc(env(safe-area-inset-top,12px)+12px)] pb-3">
        <h1 className="text-2xl font-bold text-foreground mb-4">Friends</h1>

        {/* Search */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by username"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
              className="h-10 pl-9 rounded-xl border-border bg-card text-foreground"
            />
          </div>
          <Button onClick={searchUsers} disabled={searching} className="rounded-xl sera-gradient text-primary-foreground">
            <Search size={16} />
          </Button>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mb-4 space-y-2">
            {searchResults.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-card p-3 border border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                    {(r.display_name || r.username)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.display_name || r.username}</p>
                    <p className="text-xs text-muted-foreground">@{r.username}</p>
                  </div>
                </div>
                <Button onClick={() => sendRequest(r.id)} size="sm" className="rounded-lg sera-gradient text-primary-foreground">
                  <UserPlus size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-xl bg-card p-1">
          {(['friends', 'requests'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === t ? 'sera-gradient text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              {t === 'friends' ? 'Friends' : `Requests${requests.length ? ` (${requests.length})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {tab === 'friends' ? (
          friends.length === 0 ? (
            <p className="text-center text-muted-foreground mt-12">No friends yet. Search for people above!</p>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-xl bg-card p-3 border border-border">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                    {(f.profile.display_name || f.profile.username)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{f.profile.display_name || f.profile.username}</p>
                    <p className="text-xs text-muted-foreground">@{f.profile.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          requests.length === 0 ? (
            <p className="text-center text-muted-foreground mt-12">No pending requests</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl bg-card p-3 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                      {(r.profile.display_name || r.profile.username)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{r.profile.display_name || r.profile.username}</p>
                      <p className="text-xs text-muted-foreground">@{r.profile.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => respondRequest(r.id, true)} className="rounded-lg sera-gradient p-2">
                      <Check size={16} className="text-primary-foreground" />
                    </button>
                    <button onClick={() => respondRequest(r.id, false)} className="rounded-lg bg-secondary p-2">
                      <X size={16} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
