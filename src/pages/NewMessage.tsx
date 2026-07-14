import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoMode } from '@/lib/demoMode';
import { supabase } from '@/integrations/supabase/client';
import { stableColor, initialOf } from '@/lib/realProfileHelpers';
import { findOrCreateDirectConversation, createGroupConversation } from '@/lib/messaging/api';
import { DEMO_INBOX } from '@/lib/messaging/demoInbox';

interface Row { id: string; display_name: string; username: string }

export default function NewMessage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [demoMode] = useDemoMode();
  const [q, setQ] = useState('');
  const [friends, setFriends] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    (async () => {
      if (demoMode || !user) {
        // Derive some demo people from demo inbox as pickable set (direct convs only).
        const rows = DEMO_INBOX.filter((c) => c.type === 'direct').map((c) => ({
          id: c.id, display_name: c.name, username: c.name.toLowerCase().replace(/\s+/g, ''),
        }));
        setFriends(rows); setLoading(false); return;
      }
      const { data: fs } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      const otherIds = (fs || []).map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id));
      if (otherIds.length === 0) { setFriends([]); setLoading(false); return; }
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .in('id', otherIds);
      setFriends(((profs || []) as any[]).map((p) => ({
        id: p.id, display_name: p.display_name || p.username || 'User', username: p.username || '',
      })));
      setLoading(false);
    })();
  }, [demoMode, user]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return friends;
    return friends.filter((f) => f.display_name.toLowerCase().includes(s) || f.username.toLowerCase().includes(s));
  }, [friends, q]);

  function toggle(row: Row) {
    setSelected((prev) => prev.some((r) => r.id === row.id) ? prev.filter((r) => r.id !== row.id) : [...prev, row]);
  }

  async function start() {
    if (creating || selected.length === 0) return;
    if (demoMode) {
      toast.success('Started chat (demo)');
      navigate(`/messages/${selected[0].id}`);
      return;
    }
    setCreating(true);
    try {
      let convId: string;
      if (selected.length === 1) {
        convId = await findOrCreateDirectConversation(selected[0].id);
      } else {
        const name = groupName.trim() || selected.map((s) => s.display_name.split(' ')[0]).join(', ');
        convId = await createGroupConversation(name, selected.map((s) => s.id));
      }
      navigate(`/messages/${convId}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.message || 'Could not start chat');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0F] pb-24 text-white">
      <div className="sticky top-0 z-10 glass px-2 pt-[env(safe-area-inset-top,0px)] pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 py-2">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full text-white/80">
            <ChevronLeft size={22} />
          </motion.button>
          <h1 className="flex-1 text-lg font-semibold">New message</h1>
          <button
            onClick={start}
            disabled={selected.length === 0 || creating}
            className="rounded-full px-3.5 py-1.5 text-sm font-semibold disabled:opacity-40"
            style={{ backgroundColor: '#C2E9FF', color: '#0A0A0F' }}
          >
            {selected.length > 1 ? 'Start group' : 'Chat'}
          </button>
        </div>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-2">
            {selected.map((s) => (
              <button key={s.id} onClick={() => toggle(s)} className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-white/90" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                {s.display_name} ×
              </button>
            ))}
          </div>
        )}
        {selected.length > 1 && (
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name (optional)"
            className="mb-2 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            maxLength={80}
          />
        )}
        <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={15} className="text-white/50" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search friends"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
          />
        </div>
      </div>

      <div className="flex-1 px-3 pt-3">
        {loading ? (
          <div className="pt-16 text-center text-sm text-white/40">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="pt-16 text-center text-sm text-white/40">
            {friends.length === 0 ? 'Add friends to start messaging.' : 'No friends match.'}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map((f) => {
              const active = selected.some((s) => s.id === f.id);
              return (
                <motion.button
                  key={f.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggle(f)}
                  className="glass flex w-full items-center gap-3 rounded-2xl p-2.5 text-left"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: stableColor(f.id) }}>
                    {initialOf(f.display_name)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{f.display_name}</div>
                    {f.username && <div className="text-[11px] text-white/40">@{f.username}</div>}
                  </div>
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: active ? '#C2E9FF' : 'transparent',
                      border: active ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
                      color: '#0A0A0F',
                    }}
                  >
                    {active && <Check size={14} strokeWidth={3} />}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
