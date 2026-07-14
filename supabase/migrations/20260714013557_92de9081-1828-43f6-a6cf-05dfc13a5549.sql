
-- ============================================================
-- MESSAGING SYSTEM
-- ============================================================

-- 1. CONVERSATIONS
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('direct', 'group', 'drop')),
  name text,
  image_url text,
  drop_id uuid REFERENCES public.drops(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_message_id uuid,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversations_last_activity ON public.conversations(last_activity_at DESC);
CREATE INDEX idx_conversations_drop_id ON public.conversations(drop_id) WHERE drop_id IS NOT NULL;
CREATE UNIQUE INDEX idx_conversations_drop_unique ON public.conversations(drop_id) WHERE drop_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

-- 2. CONVERSATION_MEMBERS
CREATE TABLE public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'host')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  is_muted boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
CREATE INDEX idx_conv_members_user ON public.conversation_members(user_id) WHERE left_at IS NULL;
CREATE INDEX idx_conv_members_conv ON public.conversation_members(conversation_id);

GRANT SELECT, INSERT, UPDATE ON public.conversation_members TO authenticated;
GRANT ALL ON public.conversation_members TO service_role;

-- 3. MESSAGES
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  content text,
  image_url text,
  reply_to_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  delivery_status text NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sending', 'sent', 'delivered', 'failed')),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_last_message_fk
  FOREIGN KEY (last_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;

-- 4. USER_BLOCKS
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX idx_blocks_blocker ON public.user_blocks(blocker_id);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;

-- ============================================================
-- HELPER FUNCTIONS (security definer, avoid RLS recursion)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_conversation_member(_conv uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conv AND user_id = _uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_conversation_member(_conv uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conv AND user_id = _uid AND left_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.can_send_to_conversation(_conv uuid, _uid uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c RECORD;
  is_active boolean;
  has_rsvp boolean;
BEGIN
  SELECT type, drop_id, canceled_at INTO c FROM public.conversations WHERE id = _conv;
  IF c IS NULL OR c.canceled_at IS NOT NULL THEN RETURN false; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conv AND user_id = _uid AND left_at IS NULL
  ) INTO is_active;

  IF NOT is_active THEN RETURN false; END IF;

  IF c.type = 'drop' THEN
    -- Host or accepted RSVP required
    SELECT EXISTS (
      SELECT 1 FROM public.drops d
      WHERE d.id = c.drop_id AND d.creator_id = _uid
    ) OR EXISTS (
      SELECT 1 FROM public.drop_rsvps r
      WHERE r.drop_id = c.drop_id AND r.user_id = _uid
    ) INTO has_rsvp;
    RETURN has_rsvp;
  END IF;

  RETURN true;
END;
$$;

-- Find or create a DM between two users (atomic, no duplicates)
CREATE OR REPLACE FUNCTION public.find_or_create_direct_conversation(_other uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  existing uuid;
  new_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _other = me THEN RAISE EXCEPTION 'Cannot message yourself'; END IF;

  -- Find existing direct conversation with both users
  SELECT c.id INTO existing
  FROM public.conversations c
  WHERE c.type = 'direct'
    AND EXISTS (SELECT 1 FROM public.conversation_members m WHERE m.conversation_id = c.id AND m.user_id = me)
    AND EXISTS (SELECT 1 FROM public.conversation_members m WHERE m.conversation_id = c.id AND m.user_id = _other)
  LIMIT 1;

  IF existing IS NOT NULL THEN
    -- Reactivate membership if the caller had left
    UPDATE public.conversation_members
    SET left_at = NULL
    WHERE conversation_id = existing AND user_id = me AND left_at IS NOT NULL;
    RETURN existing;
  END IF;

  INSERT INTO public.conversations (type, created_by) VALUES ('direct', me) RETURNING id INTO new_id;
  INSERT INTO public.conversation_members (conversation_id, user_id, role) VALUES (new_id, me, 'member');
  INSERT INTO public.conversation_members (conversation_id, user_id, role) VALUES (new_id, _other, 'member');
  RETURN new_id;
END;
$$;

-- Ensure a Drop conversation exists, creator becomes host
CREATE OR REPLACE FUNCTION public.ensure_drop_conversation(_drop uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d RECORD;
  existing uuid;
  new_id uuid;
BEGIN
  SELECT id, creator_id, title INTO d FROM public.drops WHERE id = _drop;
  IF d IS NULL THEN RAISE EXCEPTION 'Drop not found'; END IF;

  SELECT id INTO existing FROM public.conversations WHERE drop_id = _drop;
  IF existing IS NOT NULL THEN RETURN existing; END IF;

  INSERT INTO public.conversations (type, name, drop_id, created_by)
  VALUES ('drop', d.title, _drop, d.creator_id)
  RETURNING id INTO new_id;

  -- Add host as first member
  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES (new_id, d.creator_id, 'host')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN new_id;
END;
$$;

-- Mark a conversation as read up to now for the caller
CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conv uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  UPDATE public.conversation_members
  SET last_read_at = now()
  WHERE conversation_id = _conv AND user_id = me;
END;
$$;

-- Create a group chat with a set of members (caller becomes admin)
CREATE OR REPLACE FUNCTION public.create_group_conversation(_name text, _member_ids uuid[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  new_id uuid;
  mid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF array_length(_member_ids, 1) IS NULL THEN RAISE EXCEPTION 'Need at least one other member'; END IF;

  INSERT INTO public.conversations (type, name, created_by)
  VALUES ('group', NULLIF(trim(_name), ''), me)
  RETURNING id INTO new_id;

  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES (new_id, me, 'admin');

  FOREACH mid IN ARRAY _member_ids LOOP
    IF mid <> me THEN
      INSERT INTO public.conversation_members (conversation_id, user_id, role)
      VALUES (new_id, mid, 'member')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN new_id;
END;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Touch updated_at
CREATE TRIGGER trg_conv_updated BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_conv_members_updated BEFORE UPDATE ON public.conversation_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_messages_updated BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Bump conversation last_activity when a message is inserted
CREATE OR REPLACE FUNCTION public.bump_conversation_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_id = NEW.id, last_activity_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_messages_bump_conv AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_on_message();

-- When a user RSVPs to a Drop, ensure conv exists and add them
CREATE OR REPLACE FUNCTION public.rsvp_join_drop_chat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE conv_id uuid;
BEGIN
  conv_id := public.ensure_drop_conversation(NEW.drop_id);
  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES (conv_id, NEW.user_id, 'member')
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET left_at = NULL;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_rsvp_join_chat AFTER INSERT ON public.drop_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.rsvp_join_drop_chat();

-- When a user cancels RSVP, soft-leave the chat
CREATE OR REPLACE FUNCTION public.rsvp_leave_drop_chat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE conv_id uuid;
BEGIN
  SELECT id INTO conv_id FROM public.conversations WHERE drop_id = OLD.drop_id;
  IF conv_id IS NOT NULL THEN
    UPDATE public.conversation_members
    SET left_at = now()
    WHERE conversation_id = conv_id AND user_id = OLD.user_id AND role <> 'host';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER trg_rsvp_leave_chat AFTER DELETE ON public.drop_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.rsvp_leave_drop_chat();

-- When a Drop is deleted (canceled) — flag conv + system message
CREATE OR REPLACE FUNCTION public.drop_cancel_notify_chat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE conv_id uuid;
BEGIN
  SELECT id INTO conv_id FROM public.conversations WHERE drop_id = OLD.id;
  IF conv_id IS NOT NULL THEN
    UPDATE public.conversations SET canceled_at = now() WHERE id = conv_id;
    INSERT INTO public.messages (conversation_id, sender_id, message_type, content)
    VALUES (conv_id, NULL, 'system', 'This Drop was canceled.');
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER trg_drop_cancel_notify BEFORE DELETE ON public.drops
  FOR EACH ROW EXECUTE FUNCTION public.drop_cancel_notify_chat();

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- conversations: members can read; creators can update (rename/mute/etc handled via members)
CREATE POLICY "Members can view conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_member(id, auth.uid()));

CREATE POLICY "Authenticated can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator can update conversation"
  ON public.conversations FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- conversation_members: members can view all rows of their conversations
CREATE POLICY "Members can view co-members"
  ON public.conversation_members FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()));

-- Members can update their own membership row (mute/archive/last_read)
CREATE POLICY "Users update own membership"
  ON public.conversation_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Members can add themselves to a conversation ONLY via SECURITY DEFINER helpers.
-- Allow self-insert for direct/group creators (helper functions bypass RLS via SECURITY DEFINER).
CREATE POLICY "Users insert own membership"
  ON public.conversation_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- messages: can read if member of the conversation (past or present, so canceled RSVPs keep history)
CREATE POLICY "Members can read messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()));

-- Send messages only if can_send_to_conversation is true and sender is caller
CREATE POLICY "Members can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND message_type <> 'system'
    AND public.can_send_to_conversation(conversation_id, auth.uid())
  );

-- Edit / delete own messages
CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- user_blocks: users see and manage only their own blocks
CREATE POLICY "Users view own blocks"
  ON public.user_blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());
CREATE POLICY "Users create own blocks"
  ON public.user_blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "Users delete own blocks"
  ON public.user_blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

-- ============================================================
-- REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
