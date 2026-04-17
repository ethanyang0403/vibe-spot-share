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

// Pulsing blue beacon for active business "Promoted Moments".
// Visually similar to user MomentBeacon but slightly slower pulse,
// emoji icon in the center, and a "Promoted" label below the timer.
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
      {/* Title pill */}
      <span
        className="mb-1 truncate rounded-lg px-2.5 py-1 text-[11px] font-bold text-white"
        style={{
          maxWidth: 180,
          backgroundColor: "rgba(10, 10, 15, 0.9)",
          border: "1px solid rgba(194, 233, 255, 0.25)",
        }}
      >
        {title}
      </span>

      {/* Beacon: 32px circle with emoji + slow pulse ring */}
      <div className="relative flex h-8 w-8 items-center justify-center">
        <span
          className="business-ring"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            backgroundColor: "#C2E9FF",
          }}
        />
        <span
          style={{
            position: "relative",
            width: 32,
            height: 32,
            borderRadius: "9999px",
            backgroundColor: "rgba(194, 233, 255, 0.15)",
            border: "1.5px solid #C2E9FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          {icon}
        </span>
      </div>

      {/* Timer pill */}
      <span
        className="mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold"
        style={{
          backgroundColor: "rgba(194, 233, 255, 0.12)",
          border: "1px solid rgba(194, 233, 255, 0.25)",
          color: "#C2E9FF",
        }}
      >
        {formatRemaining(remaining)}
      </span>

      {/* "Promoted" label — distinguishes business Moments from user Moments */}
      <span className="mt-0.5 text-[9px]" style={{ color: "#8A8A9A" }}>
        Promoted
      </span>
    </button>
  );
}
