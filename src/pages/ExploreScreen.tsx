import { useMemo, useState } from "react";
import {
  MOCK_BUSINESSES,
  EXPLORE_CATEGORIES,
  CROWD_LABEL,
  Business,
} from "@/lib/businessesMock";
import BusinessDetailCard from "@/components/BusinessDetailCard";
import { EXPLORE_PICK } from "@/lib/aiSuggestions";

export default function ExploreScreen() {
  const [categoryId, setCategoryId] = useState("all");
  const [selected, setSelected] = useState<Business | null>(null);

  const filtered = useMemo(() => {
    const cat = EXPLORE_CATEGORIES.find((c) => c.id === categoryId);
    if (!cat || cat.types === null) return MOCK_BUSINESSES;
    return MOCK_BUSINESSES.filter((b) => cat.types!.includes(b.type));
  }, [categoryId]);

  const liveDeals = filtered.filter((b) => b.promotedMoment.active);

  return (
    <div className="min-h-[calc(100dvh-56px-env(safe-area-inset-bottom,8px))] bg-background pb-6">
      {/* Header */}
      <div className="px-5 pt-[calc(env(safe-area-inset-top,12px)+16px)]">
        <h1 className="text-[24px] font-bold text-white">Explore</h1>
        <p className="text-[14px]" style={{ color: "#8A8A9A" }}>
          What's happening nearby
        </p>
      </div>

      {/* Category pills (horizontally scrollable) */}
      <div
        className="flex gap-2 overflow-x-auto px-5 pt-4"
        style={{ scrollbarWidth: "none" }}
      >
        {EXPLORE_CATEGORIES.map((cat) => {
          const active = cat.id === categoryId;
          return (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className="shrink-0 transition-all active:scale-[0.97]"
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: active ? "#C2E9FF" : "#1C1C24",
                color: active ? "#0A0A0F" : "#8A8A9A",
                whiteSpace: "nowrap",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Live Deals */}
      {liveDeals.length > 0 && (
        <section className="px-5 pt-6">
          <h2 className="text-[16px] font-bold text-white mb-3">🔥 Live Right Now</h2>
          <div className="flex flex-col gap-2.5">
            {liveDeals.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelected(b)}
                className="w-full text-left transition-all active:scale-[0.99]"
                style={{
                  backgroundColor: "#141419",
                  border: "1px solid #2A2A35",
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
                borderBottom: "1px solid #141419",
              }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "9999px",
                  backgroundColor: "#1C1C24",
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
                  className="text-[10px]"
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    backgroundColor: "#1C1C24",
                    color: "#8A8A9A",
                    border: "1px solid #2A2A35",
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
  );
}
