import { useEffect, useState } from 'react';

interface Props {
  title: string;
  expiresAt: Date;
  onClick: () => void;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'expired';
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin} min left`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m left`;
}

export default function MomentBeacon({ title, expiresAt, onClick }: Props) {
  const [remaining, setRemaining] = useState(() => expiresAt.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(expiresAt.getTime() - Date.now());
    }, 60000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const urgent = remaining < 10 * 60 * 1000 && remaining > 0;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Title pill above */}
      <span
        className="mb-1 truncate rounded-lg px-2.5 py-1 text-[12px] font-bold text-white"
        style={{
          maxWidth: 160,
          backgroundColor: 'rgba(15, 15, 26, 0.9)',
        }}
      >
        {title}
      </span>

      {/* Beacon: inner dot + animated outer ring */}
      <div className="relative flex h-5 w-5 items-center justify-center">
        <span
          className={urgent ? 'moment-ring-urgent' : 'moment-ring'}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '9999px',
            backgroundColor: '#e94560',
          }}
        />
        <span
          style={{
            position: 'relative',
            width: 20,
            height: 20,
            borderRadius: '9999px',
            backgroundColor: '#e94560',
            boxShadow: '0 2px 6px rgba(233, 69, 96, 0.5)',
          }}
        />
      </div>

      {/* Timer pill below */}
      <span
        className="mt-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold"
        style={{
          backgroundColor: urgent ? 'rgba(233, 69, 96, 0.35)' : 'rgba(233, 69, 96, 0.2)',
          border: '1px solid rgba(233, 69, 96, 0.4)',
          color: urgent ? '#ff6b85' : '#e94560',
        }}
      >
        {formatRemaining(remaining)}
      </span>
    </button>
  );
}
