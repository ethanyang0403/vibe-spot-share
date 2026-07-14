// Messaging hooks — realtime inbox, messages, unread total.
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchInbox, fetchMessages, type InboxItem, type MessageRow, markConversationRead } from './api';

/** Realtime inbox for the current user. */
export function useInbox(myUserId: string | null | undefined) {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!myUserId) return;
    try {
      const data = await fetchInbox(myUserId);
      setItems(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [myUserId]);

  useEffect(() => {
    if (!myUserId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    reload();

    // Reload inbox on any change to my memberships / conversations I'm in / messages
    const ch = supabase
      .channel(`inbox:${myUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => reload())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${myUserId}` },
        () => reload(),
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [myUserId, reload]);

  return { items, loading, error, reload };
}

export function useUnreadTotal(myUserId: string | null | undefined): number {
  const { items } = useInbox(myUserId);
  return items.reduce((sum, it) => sum + (it.myMembership.is_muted ? 0 : it.unreadCount), 0);
}

/** Realtime message stream for a single conversation. */
export function useConversationMessages(convId: string | null, myUserId: string | null | undefined) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  const addMessage = useCallback((m: MessageRow) => {
    if (seenIds.current.has(m.id)) return;
    seenIds.current.add(m.id);
    setMessages((prev) => [...prev, m]);
  }, []);

  useEffect(() => {
    if (!convId) return;
    setLoading(true);
    seenIds.current = new Set();

    fetchMessages(convId)
      .then((msgs) => {
        msgs.forEach((m) => seenIds.current.add(m.id));
        setMessages(msgs);
        setError(null);
      })
      .catch((e) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));

    const ch = supabase
      .channel(`conv:${convId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        (p) => addMessage(p.new as MessageRow),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        (p) => {
          const upd = p.new as MessageRow;
          setMessages((prev) => prev.map((m) => (m.id === upd.id ? upd : m)));
        },
      )
      .subscribe();

    // Mark read on entry
    if (myUserId) markConversationRead(convId).catch(() => {});

    return () => { supabase.removeChannel(ch); };
  }, [convId, myUserId, addMessage]);

  // Local optimistic append (before server confirm). Server realtime dedupes via id.
  const appendLocal = useCallback((m: MessageRow) => {
    setMessages((prev) => [...prev, m]);
  }, []);
  const replaceLocal = useCallback((tempId: string, real: MessageRow) => {
    seenIds.current.add(real.id);
    setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
  }, []);
  const markFailedLocal = useCallback((tempId: string) => {
    setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, delivery_status: 'failed' } : m)));
  }, []);
  const removeLocal = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { messages, loading, error, appendLocal, replaceLocal, markFailedLocal, removeLocal };
}
