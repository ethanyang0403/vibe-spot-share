import { useEffect, useMemo, useState } from "react";
import {
  MOCK_BUSINESSES,
  EXPLORE_CATEGORIES,
  CROWD_LABEL,
  Business,
} from "@/lib/businessesMock";
import BusinessDetailCard from "@/components/BusinessDetailCard";
import { EXPLORE_PICK } from "@/lib/aiSuggestions";
import { useDemoMode } from "@/lib/demoMode";
import { supabase } from "@/integrations/supabase/client";
import DropDetailsSheet, { type DropRow } from "@/components/DropDetailsSheet";
import { DROP_CATEGORIES } from "@/components/CreateDropSheet";
import { relativeTime, rsvpClosed, dropStatus } from "@/lib/dropTime";

export default function ExploreScreen() {
  const [demoMode] = useDemoMode();
  const [categoryId, setCategoryId] = useState("all");
  const [selected, setSelected] = useState<Business | null>(null);
  const [drops, setDrops] = useState<(DropRow & { rsvp_count: number })[]>([]);
  const [activeDropId, setActiveDropId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: dropRows } = await supabase
        .from("drops")
        .select("*")
        .gte("end_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(50);
      if (cancelled || !dropRows) return;
      const ids = dropRows.map((d) => d.id);
      let counts: Record<string, number> = {};
      if (ids.length) {
        const { data: rsvps } = await supabase
          .from("drop_rsvps")
          .select("drop_id")
          .in("drop_id", ids);
        counts = (rsvps ?? []).reduce<Record<string, number>>((acc, r) => {
          acc[r.drop_id] = (acc[r.drop_id] ?? 0) + 1;
          return acc;
        }, {});
      }
      setDrops(dropRows.map((d) => ({ ...(d as DropRow), rsvp_count: counts[d.id] ?? 0 })));
    };
    load();
    const ch = supabase
      .channel('explore-drops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drops' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drop_rsvps' }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [activeDropId]);

  const filtered = useMemo(() => {
    const cat = EXPLORE_CATEGORIES.find((c) => c.id === categoryId);
    if (!cat || cat.types === null) return MOCK_BUSINESSES;
    return MOCK_BUSINESSES.filter((b) => cat.types!.includes(b.type));
  }, [categoryId]);

  const liveDeals = filtered.filter((b) => b.promotedMoment.active);

  const DropsSection = () => (
    <section className="px-5 pt-4">
      <h2 className="text-[16px] font-bold text-white mb-3">
        🔥 Live Drops <span style={{ color: '#8A8A9A', fontSize: 13, fontWeight: 500 }}>({drops.length})</span>
      </h2>
      {drops.length === 0 ? (
        <div
          className="glass-card flex flex-col items-center justify-center text-center"
          style={{ padding: 24, borderRadius: 16 }}
        >
          <div style={{ fontSize: 32 }}>✨</div>
          <p className="mt-2 text-white" style={{ fontSize: 15, fontWeight: 600 }}>
            No drops yet — start one.
          </p>
          <p className="mt-1" style={{ color: "#8A8A9A", fontSize: 12 }}>
            Tap the + button on the map.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {drops.map((d) => {
            const cat = DROP_CATEGORIES.find((c) => c.id === d.category);
            const closed = rsvpClosed(d);
            const status = dropStatus(d);
            const spots = Math.max(0, d.capacity - d.rsvp_count);
            return (
              <button
                key={d.id}
                onClick={() => setActiveDropId(d.id)}
                className="w-full text-left transition-all active:scale-[0.99] glass-card"
                style={{ borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 48, height: 48, borderRadius: 999,
                    background: 'rgba(194,233,255,0.1)',
                    border: '1px solid rgba(194,233,255,0.2)',
                    fontSize: 22,
                  }}
                >
                  {cat?.emoji ?? '✨'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-white truncate">{d.title}</p>
                  <p className="text-[12px] truncate" style={{ color: '#8A8A9A' }}>
                    {d.location_name} · starts {relativeTime(d.start_time)}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="text-[10px] font-bold"
                      style={{
                        background: closed || status === 'ended' ? 'rgba(255,255,255,0.06)' : 'rgba(194,233,255,0.12)',
                        border: '1px solid rgba(194,233,255,0.2)',
                        color: closed || status === 'ended' ? '#8A8A9A' : '#C2E9FF',
                        padding: '2px 8px', borderRadius: 999,
                      }}
                    >
                      {status === 'ended' ? 'ended' : closed ? 'RSVP closed' : `RSVP ${relativeTime(d.rsvp_deadline)}`}
                    </span>
                    <span className="text-[11px]" style={{ color: '#8A8A9A' }}>
                      {d.rsvp_count}/{d.capacity} · {spots} {spots === 1 ? 'spot' : 'spots'} left
                    </span>
                  </div>
                </div>
                <span style={{ color: '#555566', fontSize: 18 }}>›</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );

  const dropSheet = (
    <DropDetailsSheet dropId={activeDropId} onClose={() => setActiveDropId(null)} />
  );

  if (!demoMode) {
    return (
      <>
        <div className="min-h-[calc(100dvh-56px-env(safe-area-inset-bottom,8px))] bg-background pb-6">
          <div className="px-5 pt-[calc(env(safe-area-inset-top,12px)+16px)]">
            <h1 className="text-[24px] font-bold text-white">Explore</h1>
            <p className="text-[14px]" style={{ color: "#8A8A9A" }}>
              Live drops from people around you
            </p>
          </div>
          <DropsSection />
        </div>
        {dropSheet}
      </>
    );
  }

  return (
    <>
    <div className="min-h-[calc(100dvh-56px-env(safe-area-inset-bottom,8px))] bg-background pb-6">
      {/* Header */}
      <div className="px-5 pt-[calc(env(safe-area-inset-top,12px)+16px)]">
        <h1 className="text-[24px] font-bold text-white">Explore</h1>
        <p className="text-[14px]" style={{ color: "#8A8A9A" }}>
          What's happening nearby
        </p>
      </div>

      <DropsSection />

      {/* Category pills */}
      <div
        className="flex gap-2 overflow-x-auto px-5 pt-6"
        style={{ scrollbarWidth: "none" }}
      >
        {EXPLORE_CATEGORIES.map((cat) => {
          const active = cat.id === categoryId;
          return (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={`shrink-0 transition-all active:scale-[0.97] ${active ? '' : 'glass-pill'}`}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: active ? "rgba(194, 233, 255, 0.15)" : undefined,
                border: active ? "1px solid rgba(194, 233, 255, 0.25)" : undefined,
                color: active ? "#C2E9FF" : "#8A8A9A",
                whiteSpace: "nowrap",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Picked for you */}
      {(() => {
        const pick = MOCK_BUSINESSES.find((b) => b.id === EXPLORE_PICK.businessId);
        if (!pick) return null;
        return (
          <div className="px-4 pt-2">
            <button
              onClick={() => setSelected(pick)}
              className="w-full text-left transition-all active:scale-[0.99] glass-card"
              style={{
                borderLeft: "3px solid rgba(194, 233, 255, 0.3)",
                borderRadius: 14,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#555566",
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  fontWeight: 600,
                }}
              >
                Picked for you
              </span>
              <div className="flex items-center gap-3">
                <div
                  className="flex shrink-0 items-center justify-center"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "9999px",
                    backgroundColor: "#1C1C24",
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  {EXPLORE_PICK.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-white truncate">
                    {EXPLORE_PICK.name}
                  </p>
                  <p className="text-[12px] truncate" style={{ color: "#8A8A9A" }}>
                    {EXPLORE_PICK.reason}
                  </p>
                  <p className="text-[13px] truncate" style={{ color: "#C2E9FF" }}>
                    {EXPLORE_PICK.deal}
                  </p>
                </div>
                <span style={{ color: "#555566", fontSize: 18 }}>›</span>
              </div>
            </button>
          </div>
        );
      })()}

      {/* Live Deals */}
      {liveDeals.length > 0 && (
        <section className="px-5 pt-6">
          <h2 className="text-[16px] font-bold text-white mb-3">🔥 Live Right Now</h2>
          <div className="flex flex-col gap-2.5">
            {liveDeals.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelected(b)}
                className="w-full text-left transition-all active:scale-[0.99] glass-card"
                style={{
                  borderRadius: 14,
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "9999px",
                    backgroundColor: "rgba(194, 233, 255, 0.1)",
                    border: "1px solid rgba(194, 233, 255, 0.2)",
                    fontSize: 26,
                    lineHeight: 1,
                  }}
                >
                  {b.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-white truncate">{b.name}</p>
                  <p
                    className="text-[13px] truncate"
                    style={{ color: "#C2E9FF" }}
                  >
                    {b.promotedMoment.deal}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="text-[10px] font-bold"
                      style={{
                        backgroundColor: "rgba(194, 233, 255, 0.12)",
                        border: "1px solid rgba(194, 233, 255, 0.25)",
                        color: "#C2E9FF",
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {b.promotedMoment.expiresInMinutes} min left
                    </span>
                    <span className="text-[11px]" style={{ color: "#8A8A9A" }}>
                      {b.promotedMoment.peopleSaid} going
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* All spots */}
      <section className="px-5 pt-6">
        <h2 className="text-[14px] font-bold mb-2" style={{ color: "#8A8A9A" }}>
          All Nearby
        </h2>
        <div className="flex flex-col">
          {filtered.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelected(b)}
              className="w-full text-left transition-colors"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 4px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
              }}
            >
              <div
                className="flex items-center justify-center shrink-0 glass-pill"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "9999px",
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                {b.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-white truncate">{b.name}</p>
                <p className="text-[12px]" style={{ color: "#8A8A9A" }}>
                  {b.type[0].toUpperCase() + b.type.slice(1)} · ⭐ {b.rating}
                </p>
                <p className="text-[12px] truncate" style={{ color: "#555566" }}>
                  {b.description}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="text-[10px] glass-pill"
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    color: "#8A8A9A",
                  }}
                >
                  {CROWD_LABEL[b.crowdLevel]}
                </span>
                {b.promotedMoment.active && (
                  <span
                    aria-label="Live deal"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "9999px",
                      backgroundColor: "#C2E9FF",
                      boxShadow: "0 0 6px rgba(194, 233, 255, 0.6)",
                    }}
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      <BusinessDetailCard business={selected} onClose={() => setSelected(null)} />
    </div>
    {dropSheet}
    </>
  );
}
