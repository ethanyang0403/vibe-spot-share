import { useEffect, useState } from "react";

interface Props {
  icon: string;
  title: string;
  expiresInMinutes: number;
  onClick: () => void;
}

function formatRemaining(min: number): string {
  if (min <= 0) return "ended";
  if (min < 60) return `${min} min left`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m left`;
}

// Active business beacon with glass inner circle + pulsing ring.
export default function BusinessBeacon({ icon, title, expiresInMinutes, onClick }: Props) {
  const [remaining, setRemaining] = useState(expiresInMinutes);

  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center"
      style={{ pointerEvents: "auto" }}
    >
      {/* Title pill (glass) */}
      <span
        className="glass-pill mb-1 truncate px-2.5 py-1 text-[11px] font-bold text-white"
        style={{ maxWidth: 180, borderRadius: 10 }}
      >
        {title}
      </span>

      {/* Beacon: 36px glass circle + slow pulse ring */}
      <div className="relative flex h-9 w-9 items-center justify-center">
        <span
          className="business-ring"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            backgroundColor: "#C2E9FF",
            opacity: 0.5,
          }}
        />
        <span
          className="glass-card"
          style={{
            position: "relative",
            width: 36,
            height: 36,
            borderRadius: "9999px",
            border: "1px solid rgba(194, 233, 255, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            lineHeight: 1,
            boxShadow: "0 4px 16px rgba(194, 233, 255, 0.2)",
          }}
        >
          <span style={{ position: "relative", zIndex: 2 }}>{icon}</span>
        </span>
      </div>

      {/* "LIVE" tag */}
      <span
        className="mt-1.5 px-2 py-0.5 text-[9px] font-bold"
        style={{
          backgroundColor: "rgba(194, 233, 255, 0.15)",
          backdropFilter: "blur(12px) saturate(140%)",
          WebkitBackdropFilter: "blur(12px) saturate(140%)",
          border: "1px solid rgba(194, 233, 255, 0.25)",
          color: "#C2E9FF",
          borderRadius: 8,
          letterSpacing: 0.5,
        }}
      >
        LIVE · {formatRemaining(remaining)}
      </span>

      <span className="mt-0.5 text-[9px]" style={{ color: "#8A8A9A" }}>
        Promoted
      </span>
    </button>
  );
}
