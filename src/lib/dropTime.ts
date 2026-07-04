// Small time utility for drops. All inputs are ISO strings or Date.

export function toDate(v: string | Date): Date {
  return typeof v === 'string' ? new Date(v) : v;
}

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

// "in 23m", "in 1h 12m", "in 2d", "now", "3m ago"
export function relativeTime(target: string | Date, now: Date = new Date()): string {
  const t = toDate(target).getTime();
  const diffMs = t - now.getTime();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60_000);
  if (mins < 1) return 'now';
  const suffix = diffMs >= 0 ? 'in ' : '';
  const past = diffMs < 0 ? ' ago' : '';
  if (mins < 60) return `${suffix}${mins}m${past}`;
  const hours = Math.floor(mins / 60);
  const remMin = mins % 60;
  if (hours < 24) return `${suffix}${hours}h${remMin ? ` ${remMin}m` : ''}${past}`;
  const days = Math.floor(hours / 24);
  return `${suffix}${days}d${past}`;
}

export function formatDateTime(v: string | Date): string {
  const d = toDate(v);
  return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function toLocalInputValue(d: Date): string {
  // yyyy-MM-ddTHH:mm for <input type="datetime-local">
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type DropStatus = 'upcoming' | 'live' | 'ended';
export function dropStatus(d: { start_time: string; end_time: string }, now = new Date()): DropStatus {
  const s = toDate(d.start_time).getTime();
  const e = toDate(d.end_time).getTime();
  const t = now.getTime();
  if (t < s) return 'upcoming';
  if (t <= e) return 'live';
  return 'ended';
}

export function rsvpClosed(d: { rsvp_deadline: string; end_time: string }, now = new Date()): boolean {
  return now.getTime() > toDate(d.rsvp_deadline).getTime() || now.getTime() > toDate(d.end_time).getTime();
}
