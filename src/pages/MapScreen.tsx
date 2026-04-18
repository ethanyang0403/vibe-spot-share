import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_NOTIFICATIONS } from '@/lib/notificationsMock';
import ReactMapGL, { Marker, Source, Layer, type MapRef, type LayerProps } from 'react-map-gl';
import { HEATMAP_GEOJSON } from '@/lib/heatmapData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLocation } from '@/hooks/useLocation';
import StatusSheet from '@/components/StatusSheet';
import CreateMomentSheet from '@/components/CreateMomentSheet';
import MomentBeacon from '@/components/MomentBeacon';
import MomentDetailCard, { type MomentDetail } from '@/components/MomentDetailCard';
import FriendDetailCard, { type FriendCardData } from '@/components/FriendDetailCard';
import { Ghost, Bell, Plus, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { FOCUS_FRIEND_EVENT } from '@/lib/friendsMock';
import { MOCK_BUSINESSES, FOCUS_BUSINESS_EVENT, Business } from '@/lib/businessesMock';
import BusinessPin from '@/components/BusinessPin';
import BusinessBeacon from '@/components/BusinessBeacon';
import BusinessDetailCard from '@/components/BusinessDetailCard';
import AISuggestionCard from '@/components/AISuggestionCard';
import MapWelcomeBanner from '@/components/MapWelcomeBanner';
import type { AISuggestion } from '@/lib/aiSuggestions';

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
  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);
  const mockUnreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;
  const [friends, setFriends] = useState<FriendLocation[]>([]);
  const [moments, setMoments] = useState<MockMoment[]>(() => buildMockMoments());
  const [isGhost, setIsGhost] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [momentOpen, setMomentOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendLocation | null>(null);
  const [selectedMockFriend, setSelectedMockFriend] = useState<FriendCardData | null>(null);
  const [selectedMoment, setSelectedMoment] = useState<MomentDetail | null>(null);
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [unreadPings, setUnreadPings] = useState(0);
  const [mockFriends, setMockFriends] = useState<MockFriend[]>(MOCK_FRIENDS);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [heatmapVisible, setHeatmapVisible] = useState(true);

  const heatmapLayer: LayerProps = {
    id: 'heatmap-layer',
    type: 'heatmap',
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 11, 0.3, 15, 1.2, 18, 2],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0, 0, 0, 0)',
        0.1, 'rgba(30, 80, 120, 0.3)',
        0.25, 'rgba(50, 140, 200, 0.4)',
        0.4, 'rgba(80, 200, 180, 0.45)',
        0.55, 'rgba(140, 220, 100, 0.5)',
        0.7, 'rgba(220, 200, 50, 0.55)',
        0.85, 'rgba(240, 140, 40, 0.6)',
        1.0, 'rgba(240, 70, 50, 0.65)',
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 11, 20, 15, 35, 18, 50],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.7, 16, 0.5, 18, 0.35],
    },
  };

  const toggleHeatmap = () => {
    const newVal = !heatmapVisible;
    setHeatmapVisible(newVal);
    toast(newVal ? 'Heatmap visible' : 'Heatmap hidden', {
      style: {
        backgroundColor: '#141419',
        color: '#fff',
        border: '1px solid #2A2A35',
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
      },
      position: 'top-center',
      duration: 2000,
    });
  };

  // Listen for "focus friend" requests from the Friends tab
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ friendId: string }>).detail;
      const f = mockFriends.find((m) => m.id === detail.friendId);
      if (!f) return;
      mapRef.current?.flyTo({ center: [f.lng, f.lat], zoom: 16, duration: 900 });
      setSelectedFriend(null);
      setSelectedMoment(null);
      setSelectedMockFriend({
        id: f.id,
        name: f.name,
        username: '@' + f.name.toLowerCase().replace(/\s+/g, ''),
        initial: f.initial,
        color: f.color,
        status: f.status,
        lat: f.lat,
        lng: f.lng,
      });
    };
    window.addEventListener(FOCUS_FRIEND_EVENT, handler);
    return () => window.removeEventListener(FOCUS_FRIEND_EVENT, handler);
  }, [mockFriends]);

  // Listen for "focus business" requests from the Explore tab
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ businessId: string }>).detail;
      const b = MOCK_BUSINESSES.find((x) => x.id === detail.businessId);
      if (!b) return;
      mapRef.current?.flyTo({ center: [b.lng, b.lat], zoom: 16, duration: 900 });
      setSelectedFriend(null);
      setSelectedMoment(null);
      setSelectedMockFriend(null);
      setSelectedBusiness(b);
    };
    window.addEventListener(FOCUS_BUSINESS_EVENT, handler);
    return () => window.removeEventListener(FOCUS_BUSINESS_EVENT, handler);
  }, []);

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

  const TOAST_STYLE = {
    background: 'rgba(14, 14, 20, 0.65)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  };

  const toggleGhost = async () => {
    const newVal = !isGhost;
    setIsGhost(newVal);
    if (user) {
      await supabase.from('user_locations').update({
        is_visible: !newVal,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);
    }
    toast(newVal ? "You're invisible 👻" : "You're back on the map 📍", {
      style: TOAST_STYLE,
      position: 'top-center',
      duration: 2500,
    });
  };

  const handleSetStatus = async (text: string) => {
    setMyStatus(text);
    if (user) {
      await supabase.from('user_locations').update({
        status_text: text,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);
    }
  };

  const openStatusSheet = () => {
    setSelectedFriend(null);
    setSelectedMockFriend(null);
    setSelectedMoment(null);
    setSelectedBusiness(null);
    setStatusOpen(true);
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
        {/* Heatmap density layer (lowest z-index, beneath all markers) */}
        {heatmapVisible && (
          <Source id="heatmap-source" type="geojson" data={HEATMAP_GEOJSON}>
            <Layer {...heatmapLayer} />
          </Source>
        )}

        {/* Own location — Apple Find My style */}
        {position && (
          <Marker latitude={position.latitude} longitude={position.longitude} anchor="center">
            <div
              className="flex flex-col items-center transition-opacity duration-300"
              style={{ opacity: isGhost ? 0 : 1 }}
            >
              <div className="relative flex items-center justify-center" style={{ width: 50, height: 50 }}>
                <span
                  className="user-pulse-ring"
                  style={{
                    position: 'absolute',
                    width: 14,
                    height: 14,
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(194, 233, 255, 0.15)',
                  }}
                />
                <span
                  style={{
                    position: 'relative',
                    width: 14,
                    height: 14,
                    borderRadius: '9999px',
                    backgroundColor: '#C2E9FF',
                    border: '2.5px solid #fff',
                    boxShadow: '0 0 12px rgba(194, 233, 255, 0.5), 0 2px 6px rgba(0,0,0,0.3)',
                  }}
                />
              </div>
              {myStatus && (
                <span
                  className="glass-pill mt-1 truncate px-2 py-0.5 text-[11px] font-medium text-white"
                  style={{ maxWidth: 140, borderRadius: 8 }}
                >
                  {myStatus}
                </span>
              )}
            </div>
          </Marker>
        )}

        {/* Inactive business pins (lowest layer) */}
        {MOCK_BUSINESSES.filter((b) => !b.promotedMoment.active).map((b) => (
          <Marker key={b.id} latitude={b.lat} longitude={b.lng} anchor="center">
            <BusinessPin
              icon={b.icon}
              onClick={() => {
                setSelectedFriend(null);
                setSelectedMockFriend(null);
                setSelectedMoment(null);
                setSelectedBusiness(b);
              }}
            />
          </Marker>
        ))}

        {/* Active business beacons (above inactive pins, below user Moments + friends) */}
        {MOCK_BUSINESSES.filter((b) => b.promotedMoment.active).map((b) => (
          <Marker key={b.id} latitude={b.lat} longitude={b.lng} anchor="center">
            <BusinessBeacon
              icon={b.icon}
              title={b.promotedMoment.title!}
              expiresInMinutes={b.promotedMoment.expiresInMinutes!}
              onClick={() => {
                setSelectedFriend(null);
                setSelectedMockFriend(null);
                setSelectedMoment(null);
                setSelectedBusiness(b);
              }}
            />
          </Marker>
        ))}

        {friends.map((f) => (
          <Marker key={f.user_id} latitude={f.latitude} longitude={f.longitude}>
            <button onClick={() => { setSelectedFriend(f); setSelectedMoment(null); setSelectedBusiness(null); }} className="flex flex-col items-center">
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
            <button
              onClick={() => {
                setSelectedFriend(null);
                setSelectedMoment(null);
                setSelectedBusiness(null);
                setSelectedMockFriend({
                  id: f.id,
                  name: f.name,
                  username: '@' + f.name.toLowerCase().replace(/\s+/g, ''),
                  initial: f.initial,
                  color: f.color,
                  status: f.status,
                  lat: f.lat,
                  lng: f.lng,
                });
              }}
              className="flex flex-col items-center"
              style={{
                transition: 'transform 2s ease-in-out',
                // Expand tap target without changing visual size
                padding: 6,
                minWidth: 44,
                minHeight: 44,
              }}
            >
              <div
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-bold text-white"
                style={{
                  backgroundColor: f.color,
                  border: '1.5px solid #fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                {f.initial}
                {/* Online indicator */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    right: -1,
                    width: 8,
                    height: 8,
                    borderRadius: '9999px',
                    backgroundColor: '#34D399',
                    border: '1.5px solid #fff',
                  }}
                />
              </div>
              <span
                className="glass-pill mt-1 truncate px-2 py-0.5 text-[10px] text-white"
                style={{ maxWidth: 120, borderRadius: 10 }}
              >
                {f.status}
              </span>
            </button>
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
                setSelectedMockFriend(null);
                setSelectedBusiness(null);
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

      {/* Time-aware welcome banner (auto-dismisses after 5s) */}
      <MapWelcomeBanner />

      {/* AI suggestion card — hidden when any sheet/card is open */}
      <AISuggestionCard
        hidden={!!(selectedFriend || selectedMockFriend || selectedMoment || selectedBusiness || statusOpen || momentOpen)}
        onAction={(action: AISuggestion['action']) => {
          if (action.type === 'show_business') {
            const b = MOCK_BUSINESSES.find((x) => x.id === action.id);
            if (!b) return;
            mapRef.current?.flyTo({ center: [b.lng, b.lat], zoom: 16, duration: 900 });
            setSelectedBusiness(b);
          } else if (action.type === 'center_map') {
            mapRef.current?.flyTo({ center: [action.lng, action.lat], zoom: 16, duration: 900 });
          } else if (action.type === 'show_moment') {
            const m = moments.find((x) => x.id === action.id);
            if (!m) return;
            mapRef.current?.flyTo({ center: [m.lng, m.lat], zoom: 16, duration: 900 });
            setSelectedMoment({
              id: m.id,
              title: m.title,
              creator: m.creator,
              lat: m.lat,
              lng: m.lng,
              expiresAt: m.expiresAt,
            });
          }
        }}
      />

      {/* Floating top-left: sera + ghost toggle (glass pill) */}
      <div
        className="glass-widget absolute z-10 flex items-center gap-2"
        style={{
          top: 'calc(env(safe-area-inset-top, 12px) + 42px)',
          left: 16,
          borderRadius: 22,
          padding: '8px 14px',
        }}
      >
        <span
          className="text-[18px] font-black"
          style={{ color: '#C2E9FF', position: 'relative', zIndex: 2 }}
        >
          sera
        </span>
        <button
          onClick={toggleGhost}
          aria-label="Toggle ghost mode"
          className="flex items-center justify-center transition-transform active:scale-[0.92]"
          style={{
            width: 26,
            height: 26,
            borderRadius: '9999px',
            fontSize: 16,
            lineHeight: 1,
            position: 'relative',
            zIndex: 2,
            border: isGhost ? '1.5px solid #C2E9FF' : '1.5px solid transparent',
            boxShadow: isGhost ? '0 0 10px rgba(194, 233, 255, 0.45)' : 'none',
            filter: isGhost ? 'none' : 'grayscale(0.4)',
            opacity: isGhost ? 1 : 0.85,
          }}
        >
          👻
        </button>
      </div>

      {/* Floating top-right: vertical glass control stack */}
      <div
        className="absolute z-10 flex flex-col gap-2"
        style={{
          top: 'calc(env(safe-area-inset-top, 12px) + 42px)',
          right: 16,
        }}
      >
        <button
          onClick={() => navigate('/pings')}
          className="glass-widget relative flex items-center justify-center transition-transform active:scale-[0.95]"
          style={{ width: 40, height: 40, borderRadius: 14 }}
          aria-label="Open activity"
        >
          <Bell size={20} style={{ color: '#FFFFFF', position: 'relative', zIndex: 2 }} />
          {(unreadPings + mockUnreadCount) > 0 && (
            <span
              className="absolute -top-1 -right-1 flex items-center justify-center rounded-full px-1 text-[10px] font-bold"
              style={{
                height: 18,
                minWidth: 18,
                backgroundColor: '#C2E9FF',
                color: '#0A0A0F',
                zIndex: 3,
                boxShadow: '0 0 6px rgba(194, 233, 255, 0.5)',
              }}
            >
              {unreadPings + mockUnreadCount}
            </span>
          )}
        </button>

        <button
          onClick={toggleHeatmap}
          className="glass-widget flex items-center justify-center transition-transform active:scale-[0.95]"
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            boxShadow: heatmapVisible
              ? '0 0 12px rgba(194, 233, 255, 0.25), 0 4px 16px rgba(0,0,0,0.25)'
              : undefined,
          }}
          aria-label="Toggle heatmap"
        >
          <Flame
            size={18}
            style={{
              color: heatmapVisible ? '#C2E9FF' : '#555566',
              position: 'relative',
              zIndex: 2,
            }}
          />
        </button>

        <button
          onClick={() => {
            if (position) {
              mapRef.current?.flyTo({
                center: [position.longitude, position.latitude],
                zoom: 16,
                duration: 800,
              });
            } else {
              mapRef.current?.flyTo({
                center: [UCLA_CENTER.longitude, UCLA_CENTER.latitude],
                zoom: 15,
                duration: 800,
              });
            }
          }}
          className="glass-widget flex items-center justify-center transition-transform active:scale-[0.95]"
          style={{ width: 40, height: 40, borderRadius: 14 }}
          aria-label="Re-center map"
        >
          <Crosshair size={18} style={{ color: '#C2E9FF', position: 'relative', zIndex: 2 }} />
        </button>
      </div>

      {/* FAB for moment */}
      <button
        onClick={() => setMomentOpen(true)}
        className="absolute bottom-6 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full transition-all active:scale-[0.95]"
        style={{
          backgroundColor: '#C2E9FF',
          boxShadow: '0 4px 16px rgba(194, 233, 255, 0.25)',
        }}
      >
        <Plus size={28} style={{ color: '#0A0A0F' }} />
      </button>

      {/* Status setter button */}
      <button
        onClick={openStatusSheet}
        className="absolute bottom-6 left-4 z-10 max-w-[60%] truncate text-[13px] font-medium transition-all active:scale-[0.97]"
        style={{
          backgroundColor: '#141419',
          border: '1px solid #2A2A35',
          color: '#C2E9FF',
          borderRadius: 9999,
          padding: '8px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
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

      <MomentDetailCard
        moment={selectedMoment}
        onClose={() => setSelectedMoment(null)}
      />
      <FriendDetailCard
        friend={selectedMockFriend}
        onClose={() => setSelectedMockFriend(null)}
      />
      <BusinessDetailCard
        business={selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
      />

      <StatusSheet
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        currentStatus={myStatus}
        onSetStatus={handleSetStatus}
      />
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
