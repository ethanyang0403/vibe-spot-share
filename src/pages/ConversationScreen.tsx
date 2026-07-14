import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MoreHorizontal, BellOff, Bell, LogOut, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoMode } from '@/lib/demoMode';
import { useConversationMessages } from '@/lib/messaging/hooks';
import {
  fetchConversation, sendMessage, updateMembership, leaveConversation, markConversationRead,
  type ConversationRow, type MemberRow, type MessageRow,
} from '@/lib/messaging/api';
import { getDemoConversation, type DemoConversation, type DemoMessage } from '@/lib/messaging/demoInbox';
import { stableColor, initialOf } from '@/lib/realProfileHelpers';
import { openPersonProfile } from '@/lib/profileBus';
import MessageBubble from '@/components/messaging/MessageBubble';
import MessageComposer from '@/components/messaging/MessageComposer';

// ---------------- Shared helpers ----------------
function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, yest)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Group by day and cluster consecutive same-sender bubbles
function buildRender<T extends { id: string; created_at: string; sender_id?: string | null }>(msgs: T[]) {
  const groups: Array<{ dayLabel: string; items: Array<T & { showSender: boolean; showTime: boolean }> }> = [];
  let lastDay = '';
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const dayLabel = formatDayLabel(m.created_at);
    if (dayLabel !== lastDay) {
      groups.push({ dayLabel, items: [] });
      lastDay = dayLabel;
    }
    const g = groups[groups.length - 1];
    const prev = i > 0 ? msgs[i - 1] : null;
    const next = i < msgs.length - 1 ? msgs[i + 1] : null;
    const gapPrev = prev ? new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() : Infinity;
    const gapNext = next ? new Date(next.created_at).getTime() - new Date(m.created_at).getTime() : Infinity;
    const showSender = !prev || prev.sender_id !== m.sender_id || gapPrev > 5 * 60_000 || formatDayLabel(prev.created_at) !== dayLabel;
    const showTime = !next || next.sender_id !== m.sender_id || gapNext > 5 * 60_000;
    g.items.push({ ...m, showSender, showTime });
  }
  return groups;
}

// ---------------- Real mode ----------------
function RealConversation({ convId }: { convId: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const meId = user?.id;
  const [meta, setMeta] = useState<{ conversation: ConversationRow; members: MemberRow[]; drop: any } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { messages, loading, appendLocal, replaceLocal, markFailedLocal, removeLocal } = useConversationMessages(convId, meId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  useEffect(() => {
    fetchConversation(convId).then((r) => { if (!r) setNotFound(true); else setMeta(r); });
  }, [convId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (atBottom || messages.length > lastCount.current) {
      el.scrollTop = el.scrollHeight;
    }
    lastCount.current = messages.length;
  }, [messages.length]);

  // Mark read when tab focused
  useEffect(() => {
    const onFocus = () => markConversationRead(convId).catch(() => {});
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [convId]);

  const myMembership = meta?.members.find((m) => m.user_id === meId);
  const others = useMemo(() => (meta?.members || []).filter((m) => m.user_id !== meId), [meta, meId]);
  const title = useMemo(() => {
    if (!meta) return '';
    const c = meta.conversation;
    if (c.type === 'direct') {
      const o = others[0];
      return o?.profile?.display_name || o?.profile?.username || 'Direct message';
    }
    return c.name || meta.drop?.title || others.map((m) => m.profile?.display_name || m.profile?.username).slice(0, 3).join(', ') || 'Group';
  }, [meta, others]);

  const subtitle = useMemo(() => {
    if (!meta) return '';
    const c = meta.conversation;
    if (c.type === 'drop' && meta.drop) return `${meta.drop.category} Drop · ${meta.drop.location_name}`;
    if (c.type === 'group') return `${meta.members.length} people`;
    return others[0]?.profile?.username ? `@${others[0].profile.username}` : '';
  }, [meta, others]);

  async function handleSend(text: string) {
    if (!meId) return;
    const tempId = `tmp-${crypto.randomUUID()}`;
    const optimistic: MessageRow = {
      id: tempId,
      conversation_id: convId,
      sender_id: meId,
      message_type: 'text',
      content: text,
      image_url: null,
      reply_to_message_id: null,
      delivery_status: 'sending',
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    appendLocal(optimistic);
    try {
      const real = await sendMessage(convId, meId, text);
      replaceLocal(tempId, real);
    } catch (e: any) {
      markFailedLocal(tempId);
      toast.error(e?.message || 'Failed to send');
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0F] text-white/60">
        Conversation not found.
      </div>
    );
  }

  const canceled = !!meta?.conversation.canceled_at || (meta?.drop && new Date(meta.drop.end_time).getTime() < Date.now() && meta?.conversation.type === 'drop');
  const groups = buildRender(messages.filter((m) => !m.deleted_at));

  const headerAvatarClick = () => {
    if (!meta) return;
    if (meta.conversation.type === 'direct' && others[0]) {
      const o = others[0];
      const name = o.profile?.display_name || o.profile?.username || 'Unknown';
      openPersonProfile({
        userId: o.user_id,
        name,
        initial: initialOf(name),
        color: stableColor(o.user_id),
        degree: '1st',
        mutualCount: 0,
        isFriend: true,
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0F] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 glass" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 px-2 py-2.5">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate('/messages')} className="flex h-9 w-9 items-center justify-center rounded-full text-white/80">
            <ChevronLeft size={22} />
          </motion.button>
          <button onClick={headerAvatarClick} className="flex flex-1 items-center gap-3 text-left">
            {meta?.conversation.type === 'direct' && others[0] ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: stableColor(others[0].user_id) }}>
                {initialOf(others[0].profile?.display_name || others[0].profile?.username || '?')}
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm" style={{ backgroundColor: 'rgba(194,233,255,0.15)' }}>
                {meta?.conversation.type === 'drop' ? '📍' : '👥'}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate font-semibold">{title}</div>
              {subtitle && <div className="truncate text-[11px] text-white/50">{subtitle}</div>}
            </div>
          </button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMenuOpen((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-full text-white/80">
            <MoreHorizontal size={20} />
          </motion.button>
        </div>
        {meta?.conversation.type === 'drop' && meta.drop && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-drop', { detail: { dropId: meta.drop.id } }))}
            className="mx-3 mb-2 flex w-[calc(100%-24px)] items-center justify-between rounded-xl px-3 py-2 text-left text-[12px]"
            style={{ backgroundColor: 'rgba(194,233,255,0.08)', border: '1px solid rgba(194,233,255,0.15)' }}
          >
            <span className="text-[#C2E9FF]">📍 View Drop details</span>
            <span className="text-white/40">›</span>
          </button>
        )}
        <AnimatePresence>
          {menuOpen && myMembership && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="glass absolute right-3 top-14 z-20 flex w-52 flex-col overflow-hidden rounded-xl"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <button
                onClick={async () => {
                  await updateMembership(convId, { is_muted: !myMembership.is_muted });
                  setMenuOpen(false); toast.success(myMembership.is_muted ? 'Unmuted' : 'Muted');
                }}
                className="flex items-center gap-2 px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/5"
              >
                {myMembership.is_muted ? <Bell size={15} /> : <BellOff size={15} />}
                {myMembership.is_muted ? 'Unmute' : 'Mute notifications'}
              </button>
              <button
                onClick={async () => {
                  await updateMembership(convId, { is_archived: !myMembership.is_archived });
                  setMenuOpen(false); toast.success(myMembership.is_archived ? 'Unarchived' : 'Archived'); navigate('/messages');
                }}
                className="flex items-center gap-2 px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/5"
              >
                <Archive size={15} />
                {myMembership.is_archived ? 'Unarchive' : 'Archive'}
              </button>
              {meta?.conversation.type !== 'direct' && (
                <button
                  onClick={async () => {
                    if (!confirm('Leave this chat?')) return;
                    await leaveConversation(convId);
                    setMenuOpen(false); toast.success('Left chat'); navigate('/messages');
                  }}
                  className="flex items-center gap-2 border-t border-white/5 px-3 py-2.5 text-left text-sm text-red-400 hover:bg-white/5"
                >
                  <LogOut size={15} /> Leave chat
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="pt-16 text-center text-sm text-white/40">Loading…</div>
        ) : groups.length === 0 ? (
          <div className="pt-20 text-center text-sm text-white/40">
            No messages yet. Say hi 👋
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.dayLabel} className="space-y-1">
              <div className="my-2 flex justify-center">
                <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-white/40">{g.dayLabel}</span>
              </div>
              {g.items.map((m) => {
                const isMe = m.sender_id === meId;
                const sender = others.find((o) => o.user_id === m.sender_id);
                const senderName = sender?.profile?.display_name || sender?.profile?.username || 'Unknown';
                return (
                  <MessageBubble
                    key={m.id}
                    content={m.content || ''}
                    isMe={isMe}
                    showSender={!isMe && m.showSender && meta?.conversation.type !== 'direct'}
                    senderName={senderName}
                    senderInitial={initialOf(senderName)}
                    senderColor={stableColor(m.sender_id || 'x')}
                    timeLabel={m.showTime ? formatTime(m.created_at) : undefined}
                    status={isMe ? (m.delivery_status as any) : undefined}
                    onRetry={() => {
                      if (m.delivery_status !== 'failed') return;
                      removeLocal(m.id);
                      handleSend(m.content || '');
                    }}
                  />
                );
              })}
            </div>
          ))
        )}
      </div>

      {canceled ? (
        <div className="glass px-4 py-3 text-center text-sm text-white/50" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          This Drop has ended — chat is read-only.
        </div>
      ) : myMembership?.left_at ? (
        <div className="glass px-4 py-3 text-center text-sm text-white/50" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          You left this chat.
        </div>
      ) : (
        <MessageComposer onSend={handleSend} />
      )}
    </div>
  );
}

// ---------------- Demo mode ----------------
function DemoConversationView({ conv }: { conv: DemoConversation }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<DemoMessage[]>(conv.messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function handleSend(text: string) {
    const now = new Date().toISOString();
    const msg: DemoMessage = {
      id: `local-${Date.now()}`,
      senderName: 'Me',
      senderInitial: 'M',
      senderColor: '#C2E9FF',
      content: text,
      createdAt: now,
      isMe: true,
      readByAll: false,
    };
    setMessages((prev) => [...prev, msg]);
  }

  const groups = buildRender(
    messages.map((m) => ({
      id: m.id,
      created_at: m.createdAt,
      sender_id: m.isMe ? 'me' : m.senderName,
      _m: m,
    })),
  );

  const subtitle = conv.type === 'drop' && conv.dropMeta
    ? `${conv.dropMeta.category} Drop · ${conv.dropMeta.location}`
    : conv.type === 'group' ? `${(conv.memberAvatars?.length || 0) + 1} people` : 'Direct message';

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 glass" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 px-2 py-2.5">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate('/messages')} className="flex h-9 w-9 items-center justify-center rounded-full text-white/80">
            <ChevronLeft size={22} />
          </motion.button>
          <div className="flex flex-1 items-center gap-3">
            {conv.type === 'direct' ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: conv.otherColor || '#666' }}>
                {conv.otherInitial}
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm" style={{ backgroundColor: 'rgba(194,233,255,0.15)' }}>
                {conv.type === 'drop' ? '📍' : '👥'}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate font-semibold">{conv.name}</div>
              <div className="truncate text-[11px] text-white/50">{subtitle}</div>
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {groups.map((g) => (
          <div key={g.dayLabel} className="space-y-1">
            <div className="my-2 flex justify-center">
              <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-white/40">{g.dayLabel}</span>
            </div>
            {g.items.map((row) => {
              const m: DemoMessage = (row as any)._m;
              if (m.system) return <MessageBubble key={m.id} content={m.content} isMe={false} showSender={false} system />;
              return (
                <MessageBubble
                  key={m.id}
                  content={m.content}
                  isMe={!!m.isMe}
                  showSender={!m.isMe && row.showSender && conv.type !== 'direct'}
                  senderName={m.senderName}
                  senderInitial={m.senderInitial}
                  senderColor={m.senderColor}
                  timeLabel={row.showTime ? formatTime(m.createdAt) : undefined}
                  status={m.isMe ? 'sent' : undefined}
                />
              );
            })}
          </div>
        ))}
      </div>

      <MessageComposer onSend={handleSend} />
    </div>
  );
}

// ---------------- Router entry ----------------
export default function ConversationScreen() {
  const { convId = '' } = useParams();
  const [demoMode] = useDemoMode();
  if (demoMode) {
    const c = getDemoConversation(convId);
    if (!c) return <div className="flex min-h-screen items-center justify-center bg-[#0A0A0F] text-white/60">Conversation not found.</div>;
    return <DemoConversationView conv={c} />;
  }
  return <RealConversation convId={convId} />;
}
