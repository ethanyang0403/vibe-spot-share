// Small helpers used by the real-mode Friends/Pings/Nearby/Profile screens.

const PALETTE = [
  '#7C3AED', '#2563EB', '#059669', '#D97706',
  '#DC2626', '#0891B2', '#9333EA', '#E11D48',
  '#8B5CF6', '#06B6D4', '#F59E0B', '#10B981',
];

export function stableColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function initialOf(name: string | null | undefined, fallback = '?'): string {
  const s = (name || '').trim();
  if (!s) return fallback;
  return s[0].toUpperCase();
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
