import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StrangerDetailCard from '@/components/StrangerDetailCard';
import { focusFriendOnMap, FRIEND_LIST, type MockFriendListItem } from '@/lib/friendsMock';
import {
  NEARBY_PEOPLE,
  filteredNearby,
  friendsNearby,
  visibleNearbyCount,
  mutualCountForFriend,
  type NearbyPerson,
} from '@/lib/nearbyMock';
import { useDemoMode } from '@/lib/demoMode';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { stableColor, initialOf } from '@/lib/realProfileHelpers';

const RADII = [0.5, 1, 3, 5] as const;

export default function NearbyScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [demoMode] = useDemoMode();
  const [radius, setRadius] = useState<number>(1);
  const [selected, setSelected] = useState<NearbyPerson | null>(null);

  // Demo values
  const demoFriends = useMemo(() => friendsNearby(radius), [radius]);
  const demoStrangers = useMemo(() => filteredNearby(radius), [radius]);
  const demoTotal = visibleNearbyCount(radius);

  // Real values
  const [realFriends, setRealFriends] = useState<MockFriendListItem[]>([]);

  const loadRealFriends = useCallback(async () => {
    if (!user) return;
    const { data: fRows } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(id, username, display_name), addressee:profiles!friendships_addressee_id_fkey(id, username, display_name)')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    const friendIds: string[] = [];
    const nameById = new Map<string, { name: string; username: string }>();
    for (const row of fRows ?? []) {
      const other: any = row.requester_id === user.id ? row.addressee : row.requester;
      if (!other) continue;
      friendIds.push(other.id);
      nameById.set(other.id, {
        name: other.display_name || other.username,
        username: other.username,
      });
    }
    if (!friendIds.length) { setRealFriends([]); return; }
    const { data: locs } = await supabase
      .from('user_locations')
      .select('user_id, latitude, longitude, status_text, is_visible')
      .in('user_id', friendIds)
      .eq('is_visible', true);
    const rows: MockFriendListItem[] = (locs ?? []).map((l) => {
      const meta = nameById.get(l.user_id) ?? { name: 'Friend', username: 'friend' };
      return {
        id: l.user_id,
        name: meta.name,
        username: meta.username,
        initial: initialOf(meta.name),
        status: l.status_text || 'is out',
        color: stableColor(l.user_id),
        isOnline: true,
        lat: l.latitude ?? 0,
        lng: l.longitude ?? 0,
      };
    });
    setRealFriends(rows);
  }, [user]);

  useEffect(() => {
    if (!demoMode) loadRealFriends();
  }, [demoMode, loadRealFriends]);

  const friends = demoMode ? demoFriends : realFriends;
  const strangers = demoMode ? demoStrangers : [];
  const totalCount = demoMode ? demoTotal : realFriends.length;

  const secondDegree = strangers.filter((p) => p.connection.degree === 2);
  const others = strangers.filter((p) => p.connection.degree !== 2);

  const handleFriendTap = (f: MockFriendListItem) => {
    if (demoMode) focusFriendOnMap(f.id);
    navigate('/');
  };

  const handleViewOnMap = () => {
    navigate('/');
  };

  return (
    <div
      className="flex flex-col h-[calc(100dvh-56px-env(safe-area-inset-bottom,8px))]"
      style={{ backgroundColor: '#0A0A0F' }}
    >
      {/* Header */}
      <div className="px-4 pt-[calc(env(safe-area-inset-top,12px)+16px)] pb-2">
        <h1 className="text-[24px] font-bold text-white">People Nearby</h1>
        <p className="mt-1 text-[14px]" style={{ color: '#8A8A9A' }}>
          {totalCount} people around you right now
        </p>

        {/* Radius selector */}
        <div className="mt-3 flex items-center gap-2">
          {RADII.map((r) => {
            const active = r === radius;
            return (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`text-[13px] font-bold transition-all active:scale-[0.97] ${active ? '' : 'glass-pill'}`}
                style={{
                  padding: '8px 18px',
                  borderRadius: 20,
                  backgroundColor: active ? 'rgba(194, 233, 255, 0.15)' : undefined,
                  border: active ? '1px solid rgba(194, 233, 255, 0.25)' : undefined,
                  color: active ? '#C2E9FF' : '#8A8A9A',
                }}
              >
                {r} mi
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {/* Friends Nearby */}
        {friends.length > 0 && (
          <Section title="Friends Nearby" titleColor="#C2E9FF">
            {friends.map((f) => (
              <FriendNearbyRow key={f.id} friend={f} onTap={() => handleFriendTap(f)} />
            ))}
          </Section>
        )}

        {/* People You May Know */}
        {demoMode && secondDegree.length > 0 && (
          <Section
            title="People You May Know"
            subtitle="Friends of your friends"
            titleColor="#C2E9FF"
          >
            {secondDegree.map((p) => (
              <SecondDegreeRow key={p.id} person={p} onTap={() => setSelected(p)} />
            ))}
          </Section>
        )}

        {/* Around the Area */}
        {others.length > 0 && (
          <Section title="Around the Area" titleColor="#8A8A9A">
            {others.map((p) => (
              <OtherRow key={p.id} person={p} onTap={() => setSelected(p)} />
            ))}
          </Section>
        )}

        {!demoMode && friends.length === 0 && (
          <div className="mt-16 text-center">
            <p style={{ color: '#8A8A9A', fontSize: 14 }}>No friends nearby right now</p>
            <p style={{ color: '#555566', fontSize: 12, marginTop: 6 }}>
              Friends appear here when they set a status and are visible
            </p>
          </div>
        )}

        {demoMode && (
          <p
            className="mt-6 text-center text-[12px] py-4"
            style={{ color: '#555566' }}
          >
            🔒 Strangers only see your general area, never your exact location
          </p>
        )}
      </div>

      <StrangerDetailCard
        person={selected}
        onClose={() => setSelected(null)}
        onViewOnMap={handleViewOnMap}
      />
    </div>
  );
}

/* ---------- Section wrapper ---------- */
function Section({
  title, subtitle, titleColor, children,
}: {
  title: string;
  subtitle?: string;
  titleColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <p
        className="text-[13px] font-bold uppercase"
        style={{ color: titleColor, letterSpacing: 1 }}
      >
        {title}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-[12px]" style={{ color: '#555566' }}>{subtitle}</p>
      )}
      <div className="mt-2 flex flex-col">{children}</div>
    </div>
  );
}

/* ---------- Avatar ---------- */
function Avatar({ initial, color, size = 44 }: { initial: string; color: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size >= 44 ? 18 : 14 }}
    >
      {initial}
    </div>
  );
}

/* ---------- Degree badges ---------- */
function FirstBadge() {
  return (
    <span
      className="inline-flex items-center text-[10px] font-bold"
      style={{ backgroundColor: '#C2E9FF', color: '#0A0A0F', padding: '2px 8px', borderRadius: 999 }}
    >
      1st
    </span>
  );
}
function SecondBadge() {
  return (
    <span
      className="inline-flex items-center text-[10px] font-bold"
      style={{
        backgroundColor: 'rgba(194, 233, 255, 0.15)',
        color: '#C2E9FF',
        border: '1px solid rgba(194, 233, 255, 0.25)',
        padding: '2px 8px',
        borderRadius: 999,
      }}
    >
      2nd
    </span>
  );
}
function ThirdBadge() {
  return (
    <span
      className="inline-flex items-center text-[10px] font-bold"
      style={{
        backgroundColor: 'rgba(138, 138, 154, 0.15)',
        color: '#8A8A9A',
        padding: '2px 8px',
        borderRadius: 999,
      }}
    >
      3rd
    </span>
  );
}

/* ---------- Rows ---------- */
function FriendNearbyRow({ friend, onTap }: { friend: MockFriendListItem; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="flex items-center gap-3 py-3 text-left"
      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', minHeight: 72 }}
    >
      <Avatar initial={friend.initial} color={friend.color} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-white text-[16px] font-bold leading-tight">{friend.name}</p>
          <FirstBadge />
        </div>
        <p className="text-[13px]" style={{ color: '#8A8A9A' }}>@{friend.username}</p>
      </div>
      <p
        className="text-[13px] text-right truncate"
        style={{ maxWidth: 140, color: '#aaa' }}
      >
        {friend.status}
      </p>
    </button>
  );
}

function formatMutuals(mutuals: string[], count: number) {
  if (count === 1) return `🔗 1 mutual · ${mutuals[0]}`;
  if (count === 2) return `🔗 2 mutuals · ${mutuals[0]}, ${mutuals[1]}`;
  return `🔗 ${count} mutuals · ${mutuals[0]}, ${mutuals[1]} +${count - 2}`;
}

function SecondDegreeRow({ person, onTap }: { person: NearbyPerson; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="flex items-center gap-3 py-3 text-left"
      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', minHeight: 76 }}
    >
      <Avatar initial={person.initial} color={person.color} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-white text-[16px] font-bold leading-tight">{person.name}</p>
        <p className="truncate text-[13px]" style={{ color: '#8A8A9A' }}>
          {formatMutuals(person.connection.mutuals, person.connection.mutualCount)}
        </p>
        <p className="truncate text-[12px] italic" style={{ color: '#555566' }}>{person.status}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <SecondBadge />
        <p className="text-[11px]" style={{ color: '#555566' }}>{person.zone}</p>
      </div>
    </button>
  );
}

function OtherRow({ person, onTap }: { person: NearbyPerson; onTap: () => void }) {
  const isThird = person.connection.degree === 3;
  return (
    <button
      onClick={onTap}
      className="flex items-center gap-3 py-3 text-left"
      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', minHeight: 76 }}
    >
      <Avatar initial={person.initial} color={person.color} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-white text-[15px] font-semibold leading-tight">{person.name}</p>
        <p className="truncate text-[12px]" style={{ color: '#555566' }}>
          {isThird ? `Through ${person.connection.through}` : 'No connections yet'}
        </p>
        <p className="truncate text-[12px] italic" style={{ color: '#555566' }}>{person.status}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {isThird ? <ThirdBadge /> : <span style={{ height: 18 }} />}
        <p className="text-[11px]" style={{ color: '#555566' }}>{person.zone}</p>
      </div>
    </button>
  );
}

void FRIEND_LIST;
void NEARBY_PEOPLE;
void mutualCountForFriend;
