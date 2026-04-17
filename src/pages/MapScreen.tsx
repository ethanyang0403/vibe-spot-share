import { useEffect, useState, useCallback, useRef } from 'react';
import ReactMapGL, { Marker, type MapRef } from 'react-map-gl';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLocation } from '@/hooks/useLocation';
import StatusSheet from '@/components/StatusSheet';
import CreateMomentSheet from '@/components/CreateMomentSheet';
import MomentBeacon from '@/components/MomentBeacon';
import MomentDetailCard, { type MomentDetail } from '@/components/MomentDetailCard';
import { Ghost, Bell, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZXRoeWFuMDQwMyIsImEiOiJjbW54Z2xjODQwMjU3MnFvbDMwb2VoYmtnIn0.r9-d9GF8LeanN2OxXmM90w';

interface FriendLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  status_text: string | null;
  is_visible: boolean;
  profile?: { display_name: string | null; username: string };
}

interface MockMoment {
  id: string;
  title: string;
  creator: string;
  lat: number;
  lng: number;
  expiresAt: Date;
}

const MOCK_MOMENTS_SEED = [
  { id: 'm1', title: '🏀 pickup basketball', creator: 'Jordan Lee', lat: 34.0698, lng: -118.4435, durationMin: 60, startedMinAgo: 8 },
  { id: 'm2', title: '🎵 free concert on the lawn', creator: 'Campus Events', lat: 34.0671, lng: -118.4478, durationMin: 120, startedMinAgo: 42 },
  { id: 'm3', title: '🍕 pizza run — who\'s in?', creator: 'Maya Patel', lat: 34.0685, lng: -118.4450, durationMin: 45, startedMinAgo: 12 },
];

function buildMockMoments(): MockMoment[] {
  const now = Date.now();
  return MOCK_MOMENTS_SEED.map((m) => ({
    id: m.id,
    title: m.title,
    creator: m.creator,
    lat: m.lat,
    lng: m.lng,
    expiresAt: new Date(now - m.startedMinAgo * 60_000 + m.durationMin * 60_000),
  }));
}

interface MockFriend {
  id: string;
  name: string;
  initial: string;
  status: string;
  lat: number;
  lng: number;
  color: string;
}

const MOCK_FRIENDS: MockFriend[] = [
  { id: "f1", name: "Jordan Lee", initial: "J", status: "down to hang 🙌", lat: 34.0705, lng: -118.4442, color: "#7C3AED" },
  { id: "f2", name: "Maya Patel", initial: "M", status: "grabbing food 🍕", lat: 34.0678, lng: -118.4468, color: "#2563EB" },
  { id: "f3", name: "Cam Torres", initial: "C", status: "at the gym 💪", lat: 34.0692, lng: -118.4410, color: "#059669" },
  { id: "f4", name: "Riley Kim", initial: "R", status: "studying 📚", lat: 34.0661, lng: -118.4490, color: "#D97706" },
  { id: "f5", name: "Alex Chen", initial: "A", status: "exploring 🗺️", lat: 34.0720, lng: -118.4425, color: "#DC2626" },
  { id: "f6", name: "Sam Rivera", initial: "S", status: "bored lol 😐", lat: 34.0648, lng: -118.4455, color: "#0891B2" },
  { id: "f7", name: "Taylor Brooks", initial: "T", status: "pregaming 🎉", lat: 34.0715, lng: -118.4460, color: "#9333EA" },
  { id: "f8", name: "Avery Nguyen", initial: "A", status: "looking for plans", lat: 34.0668, lng: -118.4430, color: "#E11D48" },
];

const UCLA_CENTER = { latitude: 34.0689, longitude: -118.4452 };

export default function MapScreen() {
  const { user } = useAuth();
  const { position } = useUserLocation();
  const mapRef = useRef<MapRef>(null);
  const [friends, setFriends] = useState<FriendLocation[]>([]);
  const [moments, setMoments] = useState<MockMoment[]>(() => buildMockMoments());
  const [isGhost, setIsGhost] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [momentOpen, setMomentOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendLocation | null>(null);
  const [selectedMoment, setSelectedMoment] = useState<MomentDetail | null>(null);
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [unreadPings, setUnreadPings] = useState(0);
  const [mockFriends, setMockFriends] = useState<MockFriend[]>(MOCK_FRIENDS);

  // Subtle drift animation for mock friends every 12s
  useEffect(() => {
    const id = setInterval(() => {
      setMockFriends((prev) =>
        prev.map((f) => ({
          ...f,
          lat: f.lat + (Math.random() - 0.5) * 0.0006,
          lng: f.lng + (Math.random() - 0.5) * 0.0006,
        }))
      );
    }, 12000);
    return () => clearInterval(id);
  }, []);

  // Upsert own location
  useEffect(() => {
    if (!user || !position) return;
    const upsert = async () => {
      await supabase.from('user_locations').upsert({
        user_id: user.id,
        latitude: position.latitude,
        longitude: position.longitude,
        is_visible: !isGhost,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    };
    upsert();
  }, [user, position, isGhost]);

  // Fetch friends locations
  const fetchFriends = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_locations')
      .select('*, profile:profiles(display_name, username)')
      .neq('user_id', user.id);
    if (data) setFriends(data.map((d: any) => ({ ...d, profile: d.profile })));
  }, [user]);

  // Auto-purge expired moments every 30s
  useEffect(() => {
    const id = setInterval(() => {
      setMoments((prev) => prev.filter((m) => m.expiresAt.getTime() > Date.now()));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Fetch my status
  useEffect(() => {
    if (!user) return;
    supabase.from('user_locations').select('status_text, is_visible').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setMyStatus(data.status_text);
          setIsGhost(!data.is_visible);
        }
      });
  }, [user]);

  // Fetch unread pings
  useEffect(() => {
    if (!user) return;
    supabase.from('pings').select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id).eq('read', false)
      .then(({ count }) => setUnreadPings(count ?? 0));
  }, [user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('map-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_locations' }, () => fetchFriends())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pings', filter: `recipient_id=eq.${user.id}` }, () => {
        setUnreadPings(p => p + 1);
        toast('New ping! 📍');
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchFriends]);

  const toggleGhost = async () => {
    if (!user) return;
    const newVal = !isGhost;
    setIsGhost(newVal);
    await supabase.from('user_locations').update({ is_visible: !newVal, updated_at: new Date().toISOString() }).eq('user_id', user.id);
    toast(newVal ? 'Ghost mode on 👻' : 'You\'re visible now');
  };

  const sendPing = async (recipientId: string) => {
    if (!user) return;
    const { error } = await supabase.from('pings').insert({
      sender_id: user.id,
      recipient_id: recipientId,
      latitude: position?.latitude,
      longitude: position?.longitude,
    });
    if (error) toast.error('Failed to send ping');
    else { toast.success('Ping sent! 📍'); setSelectedFriend(null); }
  };

  const vp = {
    latitude: UCLA_CENTER.latitude,
    longitude: UCLA_CENTER.longitude,
    zoom: 15,
  };

  return (
    <div className="relative h-[calc(100dvh-56px-env(safe-area-inset-bottom,8px))] w-full">
      <ReactMapGL
        ref={mapRef}
        initialViewState={vp}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        {/* Own location */}
        {position && (
          <Marker latitude={position.latitude} longitude={position.longitude}>
            <div className="h-4 w-4 rounded-full bg-primary pulse-dot" />
          </Marker>
        )}

        {/* Friend dots */}
        {friends.map((f) => (
          <Marker key={f.user_id} latitude={f.latitude} longitude={f.longitude}>
            <button onClick={() => { setSelectedFriend(f); setSelectedMoment(null); }} className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground border-2 border-primary/50">
                {(f.profile?.display_name || f.profile?.username || '?')[0].toUpperCase()}
              </div>
              {f.status_text && (
                <span className="mt-0.5 max-w-[80px] truncate rounded-full bg-card/90 px-2 py-0.5 text-[10px] text-foreground">
                  {f.status_text}
                </span>
              )}
            </button>
          </Marker>
        ))}

        {/* Mock friends (demo data) */}
        {mockFriends.map((f) => (
          <Marker key={f.id} latitude={f.lat} longitude={f.lng} anchor="center">
            <div
              className="flex flex-col items-center"
              style={{ transition: 'transform 2s ease-in-out' }}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-bold text-white"
                style={{
                  backgroundColor: f.color,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                {f.initial}
              </div>
              <span
                className="mt-1 truncate rounded-md px-2 py-0.5 text-[11px] text-white"
                style={{
                  maxWidth: 140,
                  backgroundColor: 'rgba(15, 15, 26, 0.85)',
                }}
              >
                {f.status}
              </span>
            </div>
          </Marker>
        ))}

        {/* Moment beacons */}
        {moments.map((m) => (
          <Marker key={m.id} latitude={m.lat} longitude={m.lng} anchor="center">
            <MomentBeacon
              title={m.title}
              expiresAt={m.expiresAt}
              onClick={() => {
                setSelectedFriend(null);
                setSelectedMoment({
                  id: m.id,
                  title: m.title,
                  creator: m.creator,
                  lat: m.lat,
                  lng: m.lng,
                  expiresAt: m.expiresAt,
                });
              }}
            />
          </Marker>
        ))}
      </ReactMapGL>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,12px)+8px)]">
        <button onClick={toggleGhost} className="rounded-full bg-card/80 p-2.5 backdrop-blur-sm">
          <Ghost size={20} className={isGhost ? 'text-foreground' : 'text-muted-foreground'} />
        </button>
        <span className="text-lg font-black text-primary">sera</span>
        <button className="relative rounded-full bg-card/80 p-2.5 backdrop-blur-sm">
          <Bell size={20} className="text-foreground" />
          {unreadPings > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full sera-gradient px-1 text-[10px] font-bold text-primary-foreground">
              {unreadPings}
            </span>
          )}
        </button>
      </div>

      {/* FAB for moment */}
      <button
        onClick={() => setMomentOpen(true)}
        className="absolute bottom-6 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full sera-gradient shadow-lg"
      >
        <Plus size={28} className="text-primary-foreground" />
      </button>

      {/* Status setter button */}
      <button
        onClick={() => setStatusOpen(true)}
        className="absolute bottom-6 left-4 z-10 rounded-full bg-card/90 px-4 py-2.5 text-sm font-medium text-foreground backdrop-blur-sm border border-border"
      >
        {myStatus || '+ set status'}
      </button>

      {/* Friend card */}
      <AnimatePresence>
        {selectedFriend && (
          <motion.div
            initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 200, opacity: 0 }}
            className="absolute bottom-20 left-4 right-4 z-20 rounded-2xl bg-card p-4 border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-lg font-bold text-foreground">
                {(selectedFriend.profile?.display_name || selectedFriend.profile?.username || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{selectedFriend.profile?.display_name || selectedFriend.profile?.username}</p>
                <p className="text-sm text-muted-foreground">@{selectedFriend.profile?.username}</p>
                {selectedFriend.status_text && (
                  <p className="text-xs text-primary mt-0.5">{selectedFriend.status_text}</p>
                )}
              </div>
              <Button onClick={() => sendPing(selectedFriend.user_id)} className="rounded-xl sera-gradient text-primary-foreground">
                Ping
              </Button>
            </div>
            <button onClick={() => setSelectedFriend(null)} className="absolute top-2 right-3 text-muted-foreground text-sm">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <MomentDetailCard moment={selectedMoment} onClose={() => setSelectedMoment(null)} />

      <StatusSheet open={statusOpen} onClose={() => setStatusOpen(false)} currentStatus={myStatus} />
      <CreateMomentSheet
        open={momentOpen}
        onClose={() => setMomentOpen(false)}
        onCreate={(title, durationMin) => {
          const lat = position?.latitude ?? 34.0689;
          const lng = position?.longitude ?? -118.4452;
          setMoments((prev) => [
            ...prev,
            {
              id: `local-${Date.now()}`,
              title,
              creator: 'You',
              lat: lat + (Math.random() - 0.5) * 0.002,
              lng: lng + (Math.random() - 0.5) * 0.002,
              expiresAt: new Date(Date.now() + durationMin * 60_000),
            },
          ]);
        }}
      />
    </div>
  );
}
