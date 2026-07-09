import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_NOTIFICATIONS } from '@/lib/notificationsMock';
import ReactMapGL, { Marker, Source, Layer, type MapRef, type LayerProps } from 'react-map-gl';
import { HEATMAP_GEOJSON } from '@/lib/heatmapData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLocation } from '@/hooks/useLocation';
import type { FriendCardData } from '@/components/FriendDetailCard';
import { Bell, Plus, Flame, Crosshair, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { FOCUS_FRIEND_EVENT } from '@/lib/friendsMock';
import { MOCK_BUSINESSES, FOCUS_BUSINESS_EVENT, Business } from '@/lib/businessesMock';
import BusinessPin from '@/components/BusinessPin';
import BusinessBeacon from '@/components/BusinessBeacon';
import MapWelcomeBanner from '@/components/MapWelcomeBanner';
import MapBottomSheet, { type SheetContent, type SheetHeight } from '@/components/MapBottomSheet';
import type { AISuggestion } from '@/lib/aiSuggestions';
import { useDemoMode, BRANDEIS_CENTER, BRANDEIS_ZOOM } from '@/lib/demoMode';
import PausedBanner from '@/components/PausedBanner';
import CreateDropSheet, { DROP_CATEGORIES } from '@/components/CreateDropSheet';
import DropDetailsSheet, { type DropRow } from '@/components/DropDetailsSheet';
import DemoDropDetailsSheet from '@/components/DemoDropDetailsSheet';
import { DEMO_DROPS, DEMO_FRIENDS, DemoDrop, useDemoDropCount } from '@/lib/demoDrops';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZXRoeWFuMDQwMyIsImEiOiJjbW54Z2xjODQwMjU3MnFvbDMwb2VoYmtnIn0.r9-d9GF8LeanN2OxXmM90w';

interface FriendLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  status_text: string | null;
  is_visible: boolean;
  profile?: { display_name: string | null; username: string };
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

const MOCK_FRIENDS: MockFriend[] = DEMO_FRIENDS.map((f) => ({
  id: f.id, name: f.name, initial: f.initial, status: f.status,
  lat: f.lat, lng: f.lng, color: f.color,
}));

const MAP_CENTER = { latitude: BRANDEIS_CENTER.latitude, longitude: BRANDEIS_CENTER.longitude };

function mockFriendToCard(f: MockFriend): FriendCardData {
  return {
    id: f.id,
    name: f.name,
    username: '@' + f.name.toLowerCase().replace(/\s+/g, ''),
    initial: f.initial,
    color: f.color,
    status: f.status,
    lat: f.lat,
    lng: f.lng,
  };
}

const TOAST_STYLE = {
  background: 'rgba(14, 14, 20, 0.65)',
  backdropFilter: 'blur(40px) saturate(180%)',
  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
  color: '#fff',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
};

export default function MapScreen() {
  const { user } = useAuth();
  const { position } = useUserLocation();
  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);
  const mockUnreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;
  const [friends, setFriends] = useState<FriendLocation[]>([]);
  const [realDrops, setRealDrops] = useState<Array<DropRow & { rsvp_count: number }>>([]);
  const [isGhost, setIsGhost] = useState(false);
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [unreadPings, setUnreadPings] = useState(0);
  const [mockFriends, setMockFriends] = useState<MockFriend[]>(MOCK_FRIENDS);
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const [demoMode] = useDemoMode();

  // Unified sheet state
  const [sheetHeight, setSheetHeight] = useState<SheetHeight>('peek');
  const [sheetContent, setSheetContent] = useState<SheetContent>({ type: 'default' });
  const [createDropOpen, setCreateDropOpen] = useState(false);
  const [activeDropId, setActiveDropId] = useState<string | null>(null);
  const [activeDemoDrop, setActiveDemoDrop] = useState<DemoDrop | null>(null);

  const openDemoDrop = useCallback((d: DemoDrop) => {
    mapRef.current?.flyTo({ center: [d.longitude, d.latitude], zoom: 16.2, duration: 800 });
    setActiveDemoDrop(d);
  }, []);

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
      style: TOAST_STYLE,
      position: 'top-center',
      duration: 2000,
    });
  };

  // Helpers to open specific sheet content
  const openFriend = useCallback((f: MockFriend) => {
    mapRef.current?.flyTo({ center: [f.lng, f.lat], zoom: 16, duration: 800 });
    setSheetContent({ type: 'friend', friend: mockFriendToCard(f) });
    setSheetHeight((h) => (h === 'peek' ? 'half' : h));
  }, []);

  const openBusiness = useCallback((b: Business) => {
    mapRef.current?.flyTo({ center: [b.lng, b.lat], zoom: 16, duration: 800 });
    setSheetContent({ type: 'business', business: b });
    setSheetHeight((h) => (h === 'peek' ? 'half' : h));
  }, []);


  const closeSheet = useCallback(() => {
    setSheetContent({ type: 'default' });
    setSheetHeight('peek');
  }, []);

  // Listen for "focus friend" requests from the Friends tab
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ friendId: string }>).detail;
      const f = mockFriends.find((m) => m.id === detail.friendId);
      if (f) openFriend(f);
    };
    window.addEventListener(FOCUS_FRIEND_EVENT, handler);
    return () => window.removeEventListener(FOCUS_FRIEND_EVENT, handler);
  }, [mockFriends, openFriend]);

  // Listen for "focus business" requests from the Explore tab
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ businessId: string }>).detail;
      const b = MOCK_BUSINESSES.find((x) => x.id === detail.businessId);
      if (b) openBusiness(b);
    };
    window.addEventListener(FOCUS_BUSINESS_EVENT, handler);
    return () => window.removeEventListener(FOCUS_BUSINESS_EVENT, handler);
  }, [openBusiness]);

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

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

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
    toast('Status updated ✓', { style: TOAST_STYLE, position: 'top-center', duration: 2000 });
  };

  const handleCreateMoment = (title: string, durationMin: number) => {
    const lat = position?.latitude ?? 42.3655;
    const lng = position?.longitude ?? -71.2597;
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
    toast('Moment dropped! 🔥', { style: TOAST_STYLE, position: 'top-center', duration: 2500 });
  };

  const sendPing = async (recipientId: string) => {
    if (!user) return;
    await supabase.from('pings').insert({
      sender_id: user.id,
      recipient_id: recipientId,
      latitude: position?.latitude,
      longitude: position?.longitude,
    });
  };

  const handleAISuggestion = (action: AISuggestion['action']) => {
    if (action.type === 'show_business') {
      const b = MOCK_BUSINESSES.find((x) => x.id === action.id);
      if (b) openBusiness(b);
    } else if (action.type === 'center_map') {
      mapRef.current?.flyTo({ center: [action.lng, action.lat], zoom: 16, duration: 900 });
    } else if (action.type === 'show_moment') {
      const m = moments.find((x) => x.id === action.id);
      if (m) openMoment(m);
    }
  };

  const vp = {
    latitude: MAP_CENTER.latitude,
    longitude: MAP_CENTER.longitude,
    zoom: BRANDEIS_ZOOM,
  };

  // Tap on the map (not a marker) collapses the sheet from Half/Full to Peek
  const handleMapClick = () => {
    if (sheetHeight !== 'peek') {
      setSheetHeight('peek');
      setSheetContent({ type: 'default' });
    }
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
        onClick={handleMapClick}
      >
        {demoMode && heatmapVisible && (
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

        {demoMode && MOCK_BUSINESSES.filter((b) => !b.promotedMoment.active).map((b) => (
          <Marker key={b.id} latitude={b.lat} longitude={b.lng} anchor="center">
            <BusinessPin icon={b.icon} onClick={() => openBusiness(b)} />
          </Marker>
        ))}

        {demoMode && MOCK_BUSINESSES.filter((b) => b.promotedMoment.active).map((b) => (
          <Marker key={b.id} latitude={b.lat} longitude={b.lng} anchor="center">
            <BusinessBeacon
              icon={b.icon}
              title={b.promotedMoment.title!}
              expiresInMinutes={b.promotedMoment.expiresInMinutes!}
              onClick={() => openBusiness(b)}
            />
          </Marker>
        ))}

        {friends.map((f) => (
          <Marker key={f.user_id} latitude={f.latitude} longitude={f.longitude}>
            <button
              onClick={() => {
                // Map real friends into mock-style card data so the sheet can render them
                const fakeMock: MockFriend = {
                  id: f.user_id,
                  name: f.profile?.display_name || f.profile?.username || 'Friend',
                  initial: ((f.profile?.display_name || f.profile?.username || '?')[0] || '?').toUpperCase(),
                  status: f.status_text || '',
                  lat: f.latitude,
                  lng: f.longitude,
                  color: '#C2E9FF',
                };
                openFriend(fakeMock);
              }}
              className="flex flex-col items-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground border-2 border-white">
                {(f.profile?.display_name || f.profile?.username || '?')[0].toUpperCase()}
              </div>
              {f.status_text && (
                <span className="glass-pill mt-1 max-w-[120px] truncate px-2 py-0.5 text-[10px] text-white" style={{ borderRadius: 10 }}>
                  {f.status_text}
                </span>
              )}
            </button>
          </Marker>
        ))}

        {mockFriends.map((f) => (
          <Marker key={f.id} latitude={f.lat} longitude={f.lng} anchor="center">
            <button
              onClick={() => openFriend(f)}
              className="flex flex-col items-center"
              style={{
                transition: 'transform 2s ease-in-out',
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

        {moments.map((m) => (
          <Marker key={m.id} latitude={m.lat} longitude={m.lng} anchor="center">
            <MomentBeacon
              title={m.title}
              expiresAt={m.expiresAt}
              onClick={() => openMoment(m)}
            />
          </Marker>
        ))}
        {DEMO_DROPS.map((d) => (
          <Marker key={d.id} latitude={d.latitude} longitude={d.longitude} anchor="bottom">
            <DemoDropMarker drop={d} onClick={() => openDemoDrop(d)} />
          </Marker>
        ))}
      </ReactMapGL>

      <MapWelcomeBanner />
      <PausedBanner />

      {/* Floating top-left: sera + ghost toggle (long-press → status setter) */}
      <div
        className="glass-widget absolute z-20 flex items-center gap-2"
        style={{
          top: 'calc(env(safe-area-inset-top, 12px) + 42px)',
          left: 16,
          borderRadius: 22,
          padding: '8px 14px',
        }}
      >
        <button
          onClick={() => {
            // Tap → open status setter inside sheet
            setSheetContent({ type: 'status' });
            setSheetHeight('half');
          }}
          className="text-[18px] font-black transition-opacity active:opacity-80"
          style={{ color: '#C2E9FF', position: 'relative', zIndex: 2 }}
          aria-label="Open status setter"
        >
          sera
        </button>
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
        className="absolute z-20 flex flex-col gap-2"
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
                center: [MAP_CENTER.longitude, MAP_CENTER.latitude],
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

        <button
          onClick={() => navigate('/preferences')}
          className="glass-widget flex items-center justify-center transition-transform active:scale-[0.95]"
          style={{ width: 40, height: 40, borderRadius: 14 }}
          aria-label="Open preferences"
        >
          <SlidersHorizontal size={18} style={{ color: '#C2E9FF', position: 'relative', zIndex: 2 }} />
        </button>
      </div>

      {/* Persistent bottom sheet */}
      <MapBottomSheet
        height={sheetHeight}
        content={sheetContent}
        onHeightChange={setSheetHeight}
        onClose={closeSheet}
        friendsActive={mockFriends}
        momentsActive={moments}
        onSelectFriend={(id) => {
          const f = mockFriends.find((x) => x.id === id);
          if (f) openFriend(f);
        }}
        onSelectBusiness={openBusiness}
        onSelectMoment={(id) => {
          const m = moments.find((x) => x.id === id);
          if (m) openMoment(m);
        }}
        onAISuggestion={handleAISuggestion}
        currentStatus={myStatus}
        isGhost={isGhost}
        onSetStatus={handleSetStatus}
        onToggleGhost={toggleGhost}
        onCreateMoment={handleCreateMoment}
        onPing={sendPing}
      />

      {/* FAB for creating a Drop — opens the full Create Drop sheet as an overlay
          above the map, tab bar, and the map's bottom sheet. */}
      <button
        type="button"
        onClick={() => setCreateDropOpen(true)}
        className="fixed right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full transition-transform active:scale-[0.95]"
        style={{
          bottom: 'calc(72px + env(safe-area-inset-bottom, 8px) + 16px)',
          backgroundColor: '#C2E9FF',
          boxShadow: '0 4px 20px rgba(194, 233, 255, 0.3)',
        }}
        aria-label="Create a Drop"
      >
        <Plus size={28} style={{ color: '#0A0A0F' }} strokeWidth={2.5} />
      </button>

      <CreateDropSheet
        open={createDropOpen}
        onClose={() => setCreateDropOpen(false)}
        onCreated={(id) => setActiveDropId(id)}
        defaultLat={position?.latitude ?? null}
        defaultLng={position?.longitude ?? null}
      />
      <DropDetailsSheet dropId={activeDropId} onClose={() => setActiveDropId(null)} />
      <DemoDropDetailsSheet drop={activeDemoDrop} onClose={() => setActiveDemoDrop(null)} />
    </div>
  );
}

function DemoDropMarker({ drop, onClick }: { drop: DemoDrop; onClick: () => void }) {
  const { going, myStatus } = useDemoDropCount(drop);
  const cat = DROP_CATEGORIES.find((c) => c.id === drop.category);
  const joined = myStatus === 'going' || myStatus === 'maybe';
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center transition-transform active:scale-[0.95]"
      style={{ padding: 4, minWidth: 44 }}
      aria-label={`Drop: ${drop.title}`}
    >
      <div
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
        style={{
          background: joined ? 'rgba(194,233,255,0.95)' : 'rgba(14,14,20,0.85)',
          border: joined ? '1.5px solid #C2E9FF' : '1.5px solid rgba(194,233,255,0.55)',
          backdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.35), 0 0 12px rgba(194,233,255,0.25)',
          color: joined ? '#0A0A0F' : '#fff',
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          maxWidth: 180,
        }}
      >
        <span style={{ fontSize: 14 }}>{cat?.emoji ?? '✨'}</span>
        <span className="truncate">{drop.title}</span>
        <span
          style={{
            marginLeft: 4,
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 999,
            background: joined ? 'rgba(10,10,15,0.15)' : 'rgba(194,233,255,0.18)',
            color: joined ? '#0A0A0F' : '#C2E9FF',
          }}
        >
          {going}/{drop.capacity}
        </span>
      </div>
      <div
        style={{
          width: 0, height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: `6px solid ${joined ? '#C2E9FF' : 'rgba(14,14,20,0.85)'}`,
          marginTop: -1,
        }}
      />
    </button>
  );
}
