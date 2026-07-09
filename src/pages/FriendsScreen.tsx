import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FRIEND_LIST,
  SEARCH_RESULTS,
  FRIEND_REQUESTS,
  focusFriendOnMap,
  type MockFriendListItem,
  type MockSearchResult,
  type MockFriendRequest,
} from '@/lib/friendsMock';
import { mutualCountForFriend } from '@/lib/nearbyMock';
import { openPersonProfile } from '@/lib/profileBus';
import { useDemoMode } from '@/lib/demoMode';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { stableColor, initialOf } from '@/lib/realProfileHelpers';

const TOAST_STYLE = {
  backgroundColor: '#141419',
  color: '#fff',
  border: '1px solid #2A2A35',
  borderRadius: 12,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
};

type SubTab = 'friends' | 'add';

interface RealRequest extends MockFriendRequest {
  friendshipId: string;
}

export default function FriendsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [demoMode] = useDemoMode();
  const [tab, setTab] = useState<SubTab>('friends');

  // Demo state
  const [demoFriends, setDemoFriends] = useState<MockFriendListItem[]>(FRIEND_LIST);
  const [demoRequests, setDemoRequests] = useState(FRIEND_REQUESTS);

  // Real state
  const [realFriends, setRealFriends] = useState<MockFriendListItem[]>([]);
  const [realRequests, setRealRequests] = useState<RealRequest[]>([]);
  const [searchResults, setSearchResults] = useState<MockSearchResult[]>([]);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const friends = demoMode ? demoFriends : realFriends;
  const requests = demoMode ? demoRequests : realRequests;

  /* --------------- Real data loaders --------------- */
  const loadReal = useCallback(async () => {
    if (!user) return;
    // Accepted friendships
    const { data: fRows } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status, requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url), addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_url)')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const friendList: MockFriendListItem[] = [];
    const friendIds: string[] = [];
    for (const row of fRows ?? []) {
      const other: any = row.requester_id === user.id ? row.addressee : row.requester;
      if (!other) continue;
      friendIds.push(other.id);
      friendList.push({
        id: other.id,
        name: other.display_name || other.username,
        username: other.username,
        initial: initialOf(other.display_name || other.username),
        status: '',
        color: stableColor(other.id),
        isOnline: false,
        lat: 0,
        lng: 0,
      });
    }
    // Merge live locations (only visible friends returned via RLS)
    if (friendIds.length) {
      const { data: locs } = await supabase
        .from('user_locations')
        .select('user_id, latitude, longitude, status_text, is_visible')
        .in('user_id', friendIds);
      const byId = new Map((locs ?? []).map((l) => [l.user_id, l]));
      for (const f of friendList) {
        const l = byId.get(f.id);
        if (l) {
          f.status = l.status_text || '';
          f.lat = l.latitude ?? 0;
          f.lng = l.longitude ?? 0;
          f.isOnline = !!l.is_visible;
        }
      }
    }
    setRealFriends(friendList);

    // Pending inbound requests
    const { data: rRows } = await supabase
      .from('friendships')
      .select('id, requester_id, requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url)')
      .eq('status', 'pending')
      .eq('addressee_id', user.id);
    const reqList: RealRequest[] = (rRows ?? []).map((r: any) => ({
      friendshipId: r.id,
      id: r.requester.id,
      name: r.requester.display_name || r.requester.username,
      username: r.requester.username,
      initial: initialOf(r.requester.display_name || r.requester.username),
      color: stableColor(r.requester.id),
    }));
    setRealRequests(reqList);

    // Outbound pending — mark as pending in search
    const { data: outbound } = await supabase
      .from('friendships')
      .select('addressee_id, status')
      .eq('requester_id', user.id);
    const excl = new Set<string>(friendIds);
    const pend = new Set<string>();
    for (const o of outbound ?? []) {
      if (o.status === 'pending') pend.add(o.addressee_id);
      excl.add(o.addressee_id);
    }
    for (const r of reqList) excl.add(r.id);
    setExcludedIds(excl);
    setPendingIds(pend);
  }, [user]);

  useEffect(() => {
    if (!demoMode) loadReal();
  }, [demoMode, loadReal]);

  /* --------------- Real search --------------- */
  useEffect(() => {
    if (demoMode || !user) return;
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', `%${q}%`)
        .neq('id', user.id)
        .limit(20);
      if (cancelled) return;
      const results: MockSearchResult[] = (data ?? [])
        .filter((p) => !excludedIds.has(p.id))
        .map((p) => ({
          id: p.id,
          name: p.display_name || p.username,
          username: p.username,
          initial: initialOf(p.display_name || p.username),
          color: stableColor(p.id),
        }));
      setSearchResults(results);
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [searchQuery, demoMode, user, excludedIds]);

  const filteredResults = useMemo(() => {
    if (!demoMode) return searchResults;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SEARCH_RESULTS;
    return SEARCH_RESULTS.filter(
      (r) => r.name.toLowerCase().includes(q) || r.username.toLowerCase().includes(q),
    );
  }, [searchQuery, demoMode, searchResults]);

  const handleFriendTap = (f: MockFriendListItem) => {
    if (demoMode) focusFriendOnMap(f.id);
    navigate('/');
  };

  /* --------------- Handlers --------------- */
  const handleAdd = async (id: string, name: string) => {
    if (demoMode) {
      setPendingIds((prev) => new Set(prev).add(id));
      toast(`Friend request sent to ${name}`, { style: TOAST_STYLE, position: 'top-center', duration: 2500 });
      return;
    }
    if (!user) return;
    setPendingIds((prev) => new Set(prev).add(id));
    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: user.id, addressee_id: id, status: 'pending' });
    if (error && !/duplicate|unique/i.test(error.message)) {
      setPendingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      toast(`Could not send request`, { style: TOAST_STYLE, position: 'top-center', duration: 2500 });
      return;
    }
    setExcludedIds((prev) => new Set(prev).add(id));
    toast(`Friend request sent to ${name}`, { style: TOAST_STYLE, position: 'top-center', duration: 2500 });
  };

  const handleAccept = async (req: MockFriendRequest) => {
    setAcceptedIds((prev) => new Set(prev).add(req.id));
    toast(`You and ${req.name.split(' ')[0]} are now friends! 🎉`, {
      style: TOAST_STYLE, position: 'top-center', duration: 2500,
    });

    if (demoMode) {
      setTimeout(() => {
        setDemoRequests((prev) => prev.filter((r) => r.id !== req.id));
        setDemoFriends((prev) => [
          ...prev,
          {
            id: req.id, name: req.name, username: req.username, initial: req.initial,
            status: 'new here 👋', color: req.color, isOnline: true,
            lat: 42.3655 + (Math.random() - 0.5) * 0.004,
            lng: -71.2597 + (Math.random() - 0.5) * 0.004,
          },
        ]);
      }, 1000);
      return;
    }

    const real = req as RealRequest;
    if (!user || !real.friendshipId) return;
    await supabase.from('friendships')
      .update({ status: 'accepted' })
      .eq('id', real.friendshipId)
      .eq('addressee_id', user.id);
    setTimeout(() => { loadReal(); }, 400);
  };

  const handleDecline = async (id: string) => {
    setAcceptedIds((prev) => new Set(prev).add(id + '_declined'));
    if (demoMode) {
      setTimeout(() => setDemoRequests((prev) => prev.filter((r) => r.id !== id)), 250);
      return;
    }
    const real = realRequests.find((r) => r.id === id);
    setTimeout(() => setRealRequests((prev) => prev.filter((r) => r.id !== id)), 250);
    if (real?.friendshipId) {
      await supabase.from('friendships').update({ status: 'declined' }).eq('id', real.friendshipId);
    }
  };

  return (
    <div
      className="flex flex-col h-[calc(100dvh-56px-env(safe-area-inset-bottom,8px))]"
      style={{ backgroundColor: '#0A0A0F' }}
    >
      {/* Header */}
      <div className="px-4 pt-[calc(env(safe-area-inset-top,12px)+16px)] pb-3">
        <h1 className="text-[24px] font-bold text-white mb-3">Friends</h1>
        <div className="flex gap-2">
          {(['friends', 'add'] as const).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-[14px] font-bold transition-all active:scale-[0.97] ${active ? '' : 'glass-pill'}`}
                style={{
                  padding: '8px 24px',
                  borderRadius: 24,
                  backgroundColor: active ? 'rgba(194, 233, 255, 0.15)' : undefined,
                  border: active ? '1px solid rgba(194, 233, 255, 0.25)' : undefined,
                  color: active ? '#C2E9FF' : '#8A8A9A',
                }}
              >
                {t === 'friends' ? 'My Friends' : 'Add Friends'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {tab === 'friends' ? (
          <FriendList friends={friends} onTap={handleFriendTap} demoMode={demoMode} />
        ) : (
          <AddFriendsTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            results={filteredResults}
            pendingIds={pendingIds}
            onAdd={handleAdd}
            requests={requests}
            acceptedIds={acceptedIds}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Friend list ---------- */
function FriendList({
  friends, onTap, demoMode,
}: {
  friends: MockFriendListItem[];
  onTap: (f: MockFriendListItem) => void;
  demoMode: boolean;
}) {
  if (friends.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 px-8 text-center">
        <p style={{ color: '#8A8A9A' }}>No friends yet</p>
        <p style={{ color: '#555566', fontSize: 13 }}>
          Switch to Add Friends and search by username.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {friends.map((f) => (
        <div
          key={f.id}
          className="flex items-center gap-3 py-3"
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', minHeight: 72 }}
        >
          <button
            onClick={() => onTap(f)}
            className="flex flex-1 items-center gap-3 text-left min-w-0"
          >
            <Avatar initial={f.initial} color={f.color} size={44} online={f.isOnline} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-white text-[16px] font-bold leading-tight">{f.name}</p>
                <span
                  className="inline-flex items-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: '#C2E9FF', color: '#0A0A0F', padding: '2px 6px', borderRadius: 999 }}
                >
                  1st
                </span>
              </div>
              <p className="text-[13px]" style={{ color: '#8A8A9A' }}>@{f.username}</p>
            </div>
            <p className="text-[13px] text-right truncate" style={{ maxWidth: 110, color: '#aaa' }}>
              {f.status}
            </p>
          </button>
          <button
            onClick={() =>
              openPersonProfile({
                name: f.name,
                initial: f.initial,
                color: f.color,
                degree: '1st',
                mutualCount: demoMode ? mutualCountForFriend(f.id) : 0,
                isFriend: true,
                lat: f.lat,
                lng: f.lng,
              })
            }
            aria-label={`View ${f.name}'s profile`}
            className="shrink-0 p-1 active:scale-90 transition-all"
          >
            <ChevronRight size={20} color="#555566" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------- Add Friends ---------- */
function AddFriendsTab({
  searchQuery, setSearchQuery, results, pendingIds, onAdd,
  requests, acceptedIds, onAccept, onDecline,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  results: MockSearchResult[];
  pendingIds: Set<string>;
  onAdd: (id: string, name: string) => void;
  requests: MockFriendRequest[];
  acceptedIds: Set<string>;
  onAccept: (r: MockFriendRequest) => void;
  onDecline: (id: string) => void;
}) {
  return (
    <div>
      {/* Search */}
      <div className="relative mt-1 mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-[2]" color="#555566" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by username..."
          className="w-full text-[14px] text-white outline-none placeholder:text-[#555566] glass-card relative"
          style={{ borderRadius: 14, padding: '12px 16px 12px 38px' }}
        />
      </div>

      {/* Results */}
      <div className="flex flex-col">
        {results.map((r) => {
          const pending = pendingIds.has(r.id);
          return (
            <div
              key={r.id}
              className="flex items-center gap-3 py-3"
              style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', minHeight: 72 }}
            >
              <Avatar initial={r.initial} color={r.color} size={44} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-[16px] font-bold leading-tight">{r.name}</p>
                <p className="text-[13px]" style={{ color: '#8A8A9A' }}>@{r.username}</p>
              </div>
              <button
                onClick={() => !pending && onAdd(r.id, r.name)}
                disabled={pending}
                className={`text-[13px] font-bold transition-all active:scale-[0.97] ${pending ? 'glass-pill' : ''}`}
                style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  backgroundColor: pending ? undefined : 'rgba(194, 233, 255, 0.15)',
                  border: pending ? undefined : '1px solid rgba(194, 233, 255, 0.25)',
                  color: pending ? '#555566' : '#C2E9FF',
                }}
              >
                {pending ? 'Pending' : 'Add +'}
              </button>
            </div>
          );
        })}
        {results.length === 0 && searchQuery.trim() && (
          <p className="text-center text-[13px] py-6" style={{ color: '#555566' }}>No matches</p>
        )}
        {results.length === 0 && !searchQuery.trim() && (
          <p className="text-center text-[13px] py-6" style={{ color: '#555566' }}>
            Search by username to add friends.
          </p>
        )}
      </div>

      {/* Requests */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-white text-[16px] font-bold">Friend Requests</h2>
          {requests.length > 0 && (
            <span
              className="flex items-center justify-center text-[11px] font-bold"
              style={{
                backgroundColor: '#C2E9FF', color: '#0A0A0F',
                minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
              }}
            >
              {requests.length}
            </span>
          )}
        </div>

        <AnimatePresence>
          {requests.map((req) => {
            const accepted = acceptedIds.has(req.id);
            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3 py-3"
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', minHeight: 72 }}
              >
                <Avatar initial={req.initial} color={req.color} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[16px] font-bold leading-tight">{req.name}</p>
                  <p className="text-[13px]" style={{ color: '#8A8A9A' }}>@{req.username}</p>
                </div>
                {accepted ? (
                  <span className="text-[13px] font-bold" style={{ color: '#34D399' }}>Added! ✓</span>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAccept(req)}
                      className="text-[12px] font-bold active:scale-[0.97] transition-all"
                      style={{ backgroundColor: '#C2E9FF', color: '#0A0A0F', padding: '6px 14px', borderRadius: 16 }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onDecline(req.id)}
                      className="text-[12px] font-bold active:scale-[0.97] transition-all glass-pill"
                      style={{ color: '#555566', padding: '6px 14px', borderRadius: 16 }}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {requests.length === 0 && (
          <p className="text-[13px] py-3" style={{ color: '#555566' }}>No pending requests</p>
        )}
      </div>
    </div>
  );
}

/* ---------- Avatar ---------- */
function Avatar({
  initial, color, size, online,
}: {
  initial: string; color: string; size: number; online?: boolean;
}) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center rounded-full text-white font-bold"
        style={{ width: size, height: size, backgroundColor: color, fontSize: 18 }}
      >
        {initial}
      </div>
      {online && (
        <span
          className="absolute"
          style={{
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: '#34D399', border: '2px solid #0A0A0F',
            right: 0, bottom: 0,
          }}
        />
      )}
    </div>
  );
}
