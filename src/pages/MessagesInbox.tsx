import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, PenSquare, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoMode } from '@/lib/demoMode';
import { useInbox } from '@/lib/messaging/hooks';
import { DEMO_INBOX } from '@/lib/messaging/demoInbox';
import { stableColor, initialOf } from '@/lib/realProfileHelpers';
import ConversationRow from '@/components/messaging/ConversationRow';

function DemoInbox() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const items = DEMO_INBOX.slice().sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? 1 : -1));
    if (!s) return items;
    return items.filter((c) => c.name.toLowerCase().includes(s) || c.lastMessagePreview.toLowerCase().includes(s));
  }, [q]);

  return (
    <InboxScaffold q={q} setQ={setQ}>
      {list.length === 0 ? (
        <EmptySearch />
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((c) => {
            const avatars = c.type === 'direct'
              ? [{ initial: c.otherInitial || '?', color: c.otherColor || '#666' }]
              : (c.memberAvatars || []);
            const meta = c.type === 'drop' && c.dropMeta
              ? `${c.dropMeta.category} Drop · ${c.dropMeta.location}`
              : c.type === 'group' ? `Group · ${(c.memberAvatars || []).length + 1} people` : undefined;
            return (
              <ConversationRow
                key={c.id}
                title={c.name}
                subtitle={c.lastMessagePreview}
                isMe={c.lastMessageIsMe}
                unread={c.unreadCount}
                timeIso={c.lastActivityAt}
                onClick={() => navigate(`/messages/${c.id}`)}
                avatars={avatars}
                meta={meta}
              />
            );
          })}
        </div>
      )}
    </InboxScaffold>
  );
}

function RealInbox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, loading, error } = useInbox(user?.id);
  const [q, setQ] = useState('');

  const displayed = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items
      .filter((it) => !it.myMembership.is_archived && !it.myMembership.left_at)
      .filter((it) => {
        if (!s) return true;
        const c = it.conversation;
        const others = it.members
          .filter((m) => m.user_id !== user?.id)
          .map((m) => m.profile?.display_name || m.profile?.username || '')
          .join(' ');
        return (c.name || '').toLowerCase().includes(s) || others.toLowerCase().includes(s);
      });
  }, [items, q, user?.id]);

  return (
    <InboxScaffold q={q} setQ={setQ}>
      {loading ? (
        <div className="pt-16 text-center text-sm text-white/40">Loading messages…</div>
      ) : error ? (
        <div className="pt-16 text-center text-sm text-red-400">{error}</div>
      ) : displayed.length === 0 ? (
        q ? <EmptySearch /> : <EmptyState onCompose={() => navigate('/messages/new')} />
      ) : (
        <div className="flex flex-col gap-2">
          {displayed.map((it) => {
            const c = it.conversation;
            const meId = user?.id;
            const others = it.members.filter((m) => m.user_id !== meId);
            let title = c.name || '';
            let avatars: Array<{ initial: string; color: string }> = [];
            let meta: string | undefined;

            if (c.type === 'direct') {
              const o = others[0];
              const name = o?.profile?.display_name || o?.profile?.username || 'Unknown';
              title = name;
              avatars = [{ initial: initialOf(name), color: stableColor(o?.user_id || 'x') }];
            } else if (c.type === 'drop') {
              title = c.name || it.drop?.title || 'Drop chat';
              avatars = others.slice(0, 3).map((m) => ({
                initial: initialOf(m.profile?.display_name || m.profile?.username || '?'),
                color: stableColor(m.user_id),
              }));
              if (it.drop) meta = `${it.drop.category} Drop · ${it.drop.location_name}`;
            } else {
              title = c.name || others.map((m) => m.profile?.display_name || m.profile?.username).slice(0, 3).join(', ') || 'Group';
              avatars = others.slice(0, 3).map((m) => ({
                initial: initialOf(m.profile?.display_name || m.profile?.username || '?'),
                color: stableColor(m.user_id),
              }));
              meta = `Group · ${it.members.length} people`;
            }

            const preview = it.lastMessage?.deleted_at
              ? 'Message deleted'
              : it.lastMessage?.content || (c.type === 'drop' ? 'Drop chat started' : 'Say hi 👋');
            const isMe = it.lastMessage?.sender_id === meId;

            return (
              <ConversationRow
                key={c.id}
                title={title}
                subtitle={preview}
                isMe={isMe}
                unread={it.unreadCount}
                timeIso={c.last_activity_at}
                onClick={() => navigate(`/messages/${c.id}`)}
                avatars={avatars.length ? avatars : [{ initial: '?', color: '#666' }]}
                meta={meta}
                muted={it.myMembership.is_muted}
              />
            );
          })}
        </div>
      )}
    </InboxScaffold>
  );
}

function InboxScaffold({ q, setQ, children }: { q: string; setQ: (s: string) => void; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-24 text-white">
      <div className="sticky top-0 z-10 glass px-4 pt-[env(safe-area-inset-top,12px)] pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate('/messages/new')}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(194,233,255,0.14)', color: '#C2E9FF' }}
            aria-label="New message"
          >
            <PenSquare size={16} />
          </motion.button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={15} className="text-white/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search messages"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
          />
        </div>
      </div>
      <div className="px-4 pt-3">{children}</div>
    </div>
  );
}

function EmptyState({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 pt-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(194,233,255,0.12)' }}>
        <MessageCircle size={22} className="text-[#C2E9FF]" />
      </div>
      <div className="max-w-[240px]">
        <div className="text-white font-medium">No messages yet</div>
        <div className="mt-1 text-sm text-white/50">Message a friend or join a Drop to start a group chat.</div>
      </div>
      <button
        onClick={onCompose}
        className="mt-2 rounded-full px-4 py-2 text-sm font-semibold"
        style={{ backgroundColor: '#C2E9FF', color: '#0A0A0F' }}
      >
        New message
      </button>
    </div>
  );
}

function EmptySearch() {
  return <div className="pt-20 text-center text-sm text-white/40">No conversations match your search.</div>;
}

export default function MessagesInbox() {
  const [demoMode] = useDemoMode();
  return demoMode ? <DemoInbox /> : <RealInbox />;
}
