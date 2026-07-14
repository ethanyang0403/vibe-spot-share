import { motion } from 'framer-motion';
import { relativeTime } from '@/lib/realProfileHelpers';

interface Avatar { initial: string; color: string }

interface Props {
  title: string;
  subtitle: string;
  isMe: boolean;
  unread: number;
  timeIso: string;
  onClick: () => void;
  avatars: Avatar[];   // 1 for DM, 2-3 for group/drop
  meta?: string;       // e.g. "🍕 Drop · Great Lawn"
  muted?: boolean;
}

function AvatarBlob({ a, size = 44 }: { a: Avatar; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: a.color }}
    >
      {a.initial}
    </div>
  );
}

function AvatarStack({ avatars }: { avatars: Avatar[] }) {
  if (avatars.length === 1) return <AvatarBlob a={avatars[0]} />;
  const shown = avatars.slice(0, 3);
  return (
    <div className="relative" style={{ width: 44, height: 44 }}>
      {shown.map((a, i) => (
        <div
          key={i}
          className="absolute rounded-full ring-2"
          style={{
            width: 28, height: 28,
            top: i === 0 ? 0 : 16,
            left: i === 0 ? 0 : i === 1 ? 16 : 8,
            zIndex: shown.length - i,
            // @ts-ignore ring color via inline style not standard
            boxShadow: '0 0 0 2px #0A0A0F',
          }}
        >
          <AvatarBlob a={a} size={28} />
        </div>
      ))}
    </div>
  );
}

export default function ConversationRow({ title, subtitle, isMe, unread, timeIso, onClick, avatars, meta, muted }: Props) {
  const hasUnread = unread > 0 && !muted;
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left transition"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <AvatarStack avatars={avatars} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`truncate ${hasUnread ? 'font-semibold text-white' : 'font-medium text-white/90'}`}>
              {title}
            </span>
            {muted && <span className="text-white/40 text-xs">🔕</span>}
          </div>
          <span className="shrink-0 text-[11px] text-white/40">{relativeTime(timeIso)}</span>
        </div>
        {meta && <div className="text-[11px] text-[#C2E9FF]/70 truncate">{meta}</div>}
        <div className="mt-0.5 flex items-center gap-2">
          <span className={`truncate text-sm ${hasUnread ? 'text-white/95' : 'text-white/55'}`}>
            {isMe && <span className="text-white/40">You: </span>}
            {subtitle}
          </span>
          {hasUnread && (
            <span
              className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: '#C2E9FF', color: '#0A0A0F' }}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
