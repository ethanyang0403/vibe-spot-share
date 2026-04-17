import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FRIEND_LIST,
  SEARCH_RESULTS,
  FRIEND_REQUESTS,
  focusFriendOnMap,
  type MockFriendListItem,
} from '@/lib/friendsMock';

const TOAST_STYLE = {
  backgroundColor: '#141419',
  color: '#fff',
  border: '1px solid #2A2A35',
  borderRadius: 12,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
};

type SubTab = 'friends' | 'add';

export default function FriendsScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<SubTab>('friends');

  const [friends, setFriends] = useState<MockFriendListItem[]>(FRIEND_LIST);
  const [requests, setRequests] = useState(FRIEND_REQUESTS);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const filteredResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SEARCH_RESULTS;
    return SEARCH_RESULTS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.username.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const handleFriendTap = (f: MockFriendListItem) => {
    focusFriendOnMap(f.id);
    navigate('/');
  };

  const handleAdd = (id: string, name: string) => {
    setPendingIds((prev) => new Set(prev).add(id));
    toast(`Friend request sent to ${name}`, {
      style: TOAST_STYLE,
      position: 'top-center',
      duration: 2500,
    });
  };

  const handleAccept = (req: typeof FRIEND_REQUESTS[number]) => {
    setAcceptedIds((prev) => new Set(prev).add(req.id));
    toast(`You and ${req.name.split(' ')[0]} are now friends! 🎉`, {
      style: TOAST_STYLE,
      position: 'top-center',
      duration: 2500,
    });
    setTimeout(() => {
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      setFriends((prev) => [
        ...prev,
        {
          id: req.id,
          name: req.name,
          username: req.username,
          initial: req.initial,
          status: 'new here 👋',
          color: req.color,
          isOnline: true,
          lat: 34.0689 + (Math.random() - 0.5) * 0.004,
          lng: -118.4452 + (Math.random() - 0.5) * 0.004,
        },
      ]);
    }, 1000);
  };

  const handleDecline = (id: string) => {
    setTimeout(() => {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }, 250);
    setAcceptedIds((prev) => new Set(prev).add(id + '_declined'));
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
                className="text-[14px] font-bold transition-all active:scale-[0.97]"
                style={{
                  padding: '8px 24px',
                  borderRadius: 24,
                  backgroundColor: active ? '#C2E9FF' : '#1C1C24',
                  color: active ? '#0A0A0F' : '#8A8A9A',
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
          <FriendList friends={friends} onTap={handleFriendTap} />
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
  friends,
  onTap,
}: {
  friends: MockFriendListItem[];
  onTap: (f: MockFriendListItem) => void;
}) {
  if (friends.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3">
        <p style={{ color: '#8A8A9A' }}>No friends yet</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {friends.map((f) => (
        <button
          key={f.id}
          onClick={() => onTap(f)}
          className="flex items-center gap-3 py-3 transition-colors text-left"
          style={{ borderBottom: '1px solid #141419', minHeight: 72 }}
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
          <p
            className="text-[13px] text-right truncate"
            style={{ maxWidth: 140, color: '#aaa' }}
          >
            {f.status}
          </p>
        </button>
      ))}
    </div>
  );
}

/* ---------- Add Friends ---------- */
function AddFriendsTab({
  searchQuery,
  setSearchQuery,
  results,
  pendingIds,
  onAdd,
  requests,
  acceptedIds,
  onAccept,
  onDecline,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  results: typeof SEARCH_RESULTS;
  pendingIds: Set<string>;
  onAdd: (id: string, name: string) => void;
  requests: typeof FRIEND_REQUESTS;
  acceptedIds: Set<string>;
  onAccept: (r: typeof FRIEND_REQUESTS[number]) => void;
  onDecline: (id: string) => void;
}) {
  return (
    <div>
      {/* Search */}
      <div className="relative mt-1 mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          color="#555566"
        />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by username..."
          className="w-full text-[14px] text-white outline-none placeholder:text-[#555566]"
          style={{
            backgroundColor: '#141419',
            border: '1px solid #2A2A35',
            borderRadius: 12,
            padding: '12px 16px 12px 38px',
          }}
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
              style={{ borderBottom: '1px solid #141419', minHeight: 72 }}
            >
              <Avatar initial={r.initial} color={r.color} size={44} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-[16px] font-bold leading-tight">{r.name}</p>
                <p className="text-[13px]" style={{ color: '#8A8A9A' }}>@{r.username}</p>
              </div>
              <button
                onClick={() => !pending && onAdd(r.id, r.name)}
                disabled={pending}
                className="text-[13px] font-bold transition-all active:scale-[0.97]"
                style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  backgroundColor: pending ? '#1C1C24' : '#C2E9FF',
                  color: pending ? '#555566' : '#0A0A0F',
                }}
              >
                {pending ? 'Pending' : 'Add +'}
              </button>
            </div>
          );
        })}
        {results.length === 0 && (
          <p className="text-center text-[13px] py-6" style={{ color: '#555566' }}>No matches</p>
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
                backgroundColor: '#C2E9FF',
                color: '#0A0A0F',
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                padding: '0 5px',
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
                style={{ borderBottom: '1px solid #141419', minHeight: 72 }}
              >
                <Avatar initial={req.initial} color={req.color} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[16px] font-bold leading-tight">{req.name}</p>
                  <p className="text-[13px]" style={{ color: '#8A8A9A' }}>@{req.username}</p>
                </div>
                {accepted ? (
                  <span className="text-[13px] font-bold" style={{ color: '#34D399' }}>
                    Added! ✓
                  </span>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAccept(req)}
                      className="text-[12px] font-bold active:scale-[0.97] transition-all"
                      style={{
                        backgroundColor: '#34D399',
                        color: '#0A0A0F',
                        padding: '6px 14px',
                        borderRadius: 16,
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onDecline(req.id)}
                      className="text-[12px] font-bold active:scale-[0.97] transition-all"
                      style={{
                        backgroundColor: '#1C1C24',
                        color: '#555566',
                        padding: '6px 14px',
                        borderRadius: 16,
                      }}
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
  initial,
  color,
  size,
  online,
}: {
  initial: string;
  color: string;
  size: number;
  online?: boolean;
}) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center rounded-full text-white font-bold"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          fontSize: 18,
        }}
      >
        {initial}
      </div>
      {online && (
        <span
          className="absolute"
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: '#34D399',
            border: '2px solid #0A0A0F',
            right: 0,
            bottom: 0,
          }}
        />
      )}
    </div>
  );
}
