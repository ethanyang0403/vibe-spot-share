// Messaging API — thin wrappers over Supabase.
import { supabase } from '@/integrations/supabase/client';

export type ConvType = 'direct' | 'group' | 'drop';
export type MessageType = 'text' | 'image' | 'system';
export type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'failed';

export interface ConversationRow {
  id: string;
  type: ConvType;
  name: string | null;
  image_url: string | null;
  drop_id: string | null;
  created_by: string | null;
  last_message_id: string | null;
  last_activity_at: string;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberRow {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'member' | 'admin' | 'host';
  joined_at: string;
  left_at: string | null;
  last_read_at: string;
  is_muted: boolean;
  is_archived: boolean;
  profile?: { id: string; username: string; display_name: string | null; avatar_url: string | null };
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  message_type: MessageType;
  content: string | null;
  image_url: string | null;
  reply_to_message_id: string | null;
  delivery_status: DeliveryStatus;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InboxItem {
  conversation: ConversationRow;
  members: MemberRow[];
  lastMessage: MessageRow | null;
  unreadCount: number;
  myMembership: MemberRow;
  drop?: { id: string; title: string; category: string; start_time: string; location_name: string } | null;
}

/**
 * Fetch the current user's inbox — all conversations they belong to,
 * with member profiles, last message, unread count, optional drop.
 */
export async function fetchInbox(myUserId: string): Promise<InboxItem[]> {
  // 1. My memberships
  const { data: myMembers, error: mErr } = await supabase
    .from('conversation_members')
    .select('*')
    .eq('user_id', myUserId);
  if (mErr) throw mErr;
  if (!myMembers || myMembers.length === 0) return [];

  const convIds = myMembers.map((m) => m.conversation_id);

  // 2. Conversations
  const { data: convs, error: cErr } = await supabase
    .from('conversations')
    .select('*')
    .in('id', convIds)
    .order('last_activity_at', { ascending: false });
  if (cErr) throw cErr;

  // 3. All members of those convs (with profile)
  const { data: allMembers, error: amErr } = await supabase
    .from('conversation_members')
    .select('*, profile:profiles(id,username,display_name,avatar_url)')
    .in('conversation_id', convIds);
  if (amErr) throw amErr;

  // 4. Last messages — bulk fetch by ids
  const lastIds = (convs || [])
    .map((c) => c.last_message_id)
    .filter((id): id is string => !!id);
  let lastMsgs: MessageRow[] = [];
  if (lastIds.length > 0) {
    const { data: msgs } = await supabase.from('messages').select('*').in('id', lastIds);
    lastMsgs = (msgs || []) as MessageRow[];
  }
  const msgById = new Map(lastMsgs.map((m) => [m.id, m]));

  // 5. Drops
  const dropIds = (convs || [])
    .map((c) => c.drop_id)
    .filter((id): id is string => !!id);
  let drops: Array<{ id: string; title: string; category: string; start_time: string; location_name: string }> = [];
  if (dropIds.length > 0) {
    const { data: ds } = await supabase
      .from('drops')
      .select('id,title,category,start_time,location_name')
      .in('id', dropIds);
    drops = ds || [];
  }
  const dropById = new Map(drops.map((d) => [d.id, d]));

  // 6. Unread counts — one query per conv (small N; acceptable for v1).
  const items: InboxItem[] = [];
  for (const c of convs || []) {
    const my = myMembers.find((m) => m.conversation_id === c.id)!;
    const members = (allMembers || []).filter((m) => m.conversation_id === c.id) as MemberRow[];
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', c.id)
      .neq('sender_id', myUserId)
      .gt('created_at', my.last_read_at);
    items.push({
      conversation: c as ConversationRow,
      members,
      lastMessage: c.last_message_id ? msgById.get(c.last_message_id) ?? null : null,
      unreadCount: count ?? 0,
      myMembership: my as MemberRow,
      drop: c.drop_id ? dropById.get(c.drop_id) ?? null : null,
    });
  }
  return items;
}

export async function fetchConversation(convId: string): Promise<{
  conversation: ConversationRow;
  members: MemberRow[];
  drop: { id: string; title: string; category: string; start_time: string; end_time: string; location_name: string; creator_id: string } | null;
} | null> {
  const { data: c } = await supabase.from('conversations').select('*').eq('id', convId).maybeSingle();
  if (!c) return null;
  const { data: members } = await supabase
    .from('conversation_members')
    .select('*, profile:profiles(id,username,display_name,avatar_url)')
    .eq('conversation_id', convId);
  let drop = null;
  if (c.drop_id) {
    const { data: d } = await supabase
      .from('drops')
      .select('id,title,category,start_time,end_time,location_name,creator_id')
      .eq('id', c.drop_id)
      .maybeSingle();
    drop = d;
  }
  return { conversation: c as ConversationRow, members: (members || []) as MemberRow[], drop };
}

export async function fetchMessages(convId: string, limit = 50, before?: string): Promise<MessageRow[]> {
  let q = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (before) q = q.lt('created_at', before);
  const { data, error } = await q;
  if (error) throw error;
  return ((data || []) as MessageRow[]).reverse(); // ascending
}

export async function sendMessage(
  convId: string,
  senderId: string,
  content: string,
): Promise<MessageRow> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: convId,
      sender_id: senderId,
      message_type: 'text',
      content,
      delivery_status: 'sent',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as MessageRow;
}

export async function findOrCreateDirectConversation(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('find_or_create_direct_conversation', {
    _other: otherUserId,
  });
  if (error) throw error;
  return data as string;
}

export async function ensureDropConversation(dropId: string): Promise<string> {
  const { data, error } = await supabase.rpc('ensure_drop_conversation', { _drop: dropId });
  if (error) throw error;
  return data as string;
}

export async function markConversationRead(convId: string): Promise<void> {
  await supabase.rpc('mark_conversation_read', { _conv: convId });
}

export async function createGroupConversation(name: string, memberIds: string[]): Promise<string> {
  const { data, error } = await supabase.rpc('create_group_conversation', {
    _name: name,
    _member_ids: memberIds,
  });
  if (error) throw error;
  return data as string;
}

export async function updateMembership(
  convId: string,
  patch: Partial<Pick<MemberRow, 'is_muted' | 'is_archived' | 'left_at'>>,
): Promise<void> {
  const { error } = await supabase
    .from('conversation_members')
    .update(patch)
    .eq('conversation_id', convId)
    .eq('user_id', (await supabase.auth.getUser()).data.user!.id);
  if (error) throw error;
}

export async function leaveConversation(convId: string): Promise<void> {
  await updateMembership(convId, { left_at: new Date().toISOString() });
}

export async function renameConversation(convId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ name: name.trim() || null })
    .eq('id', convId);
  if (error) throw error;
}

export async function deleteMessage(msgId: string): Promise<void> {
  const { error } = await supabase.from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', msgId);
  if (error) throw error;
}
