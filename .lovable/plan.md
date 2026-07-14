## Messaging System for Drop

A real, database-backed messaging layer (DMs, group chats, Drop chats) with realtime, unread tracking, and RSVP-gated access. Mobile-first, matches existing glass/dark aesthetic.

### Scope for this build

Given the size of the spec, I'll ship a solid v1 that hits every acceptance criterion, with a couple of "power features" stubbed for follow-up. Explicitly deferred (called out in-app): message reporting UI flow, blocking UI (backend fields present), ownership transfer, per-message "seen by" details view, image uploads (composer supports text v1; image upload wired in v1.1).

Everything else — DMs, groups, Drop chats, realtime, unread counts, read receipts (DM), system messages, RSVP-gated send, inbox search/filters — ships now.

### 1. Database (one migration)

New tables in `public`:

- `conversations` — `id, type ('direct'|'group'|'drop'), name, image_url, drop_id (fk drops, null), created_by, created_at, updated_at, last_message_id, last_activity_at`
- `conversation_members` — `id, conversation_id, user_id, role ('member'|'admin'|'host'), joined_at, left_at (null=active), last_read_at, is_muted, is_archived`; unique(conversation_id, user_id)
- `messages` — `id, conversation_id, sender_id (null for system), message_type ('text'|'image'|'system'), content, image_url, reply_to_message_id, created_at, updated_at, deleted_at, delivery_status`
- `user_blocks` — `blocker_id, blocked_id, created_at` (schema only; UI deferred)

Security-definer helpers (avoid RLS recursion):
- `is_conversation_member(conv uuid, uid uuid) returns bool`
- `can_send_to_conversation(conv uuid, uid uuid) returns bool` — active membership + for `drop` type also requires accepted RSVP or host
- `find_or_create_direct_conversation(other_user uuid) returns uuid` — atomic, prevents duplicate DM threads
- `ensure_drop_conversation(drop_id uuid) returns uuid` — creates the drop chat lazily on first RSVP
- `mark_conversation_read(conv uuid)` — sets `last_read_at = now()`

Triggers:
- On `messages` insert: update parent `conversations.last_message_id`, `last_activity_at`, `updated_at`.
- On `drop_rsvps` insert (accepted): add member to drop conversation.
- On `drop_rsvps` delete: soft-leave (`left_at = now()`) but keep history.
- On drop cancel: insert system message + flag conversation.
- `touch_updated_at` on `conversations` and `messages`.

RLS: SELECT gated by `is_conversation_member`; INSERT gated by `can_send_to_conversation`; UPDATE/DELETE on own messages only. GRANTs to `authenticated` + `service_role` on every new table.

Realtime: add `messages`, `conversations`, `conversation_members` to `supabase_realtime` publication.

### 2. Frontend

New route `/messages` (add tab to bottom nav, replace one existing tab? — see Open questions).

New files:
```
src/pages/MessagesInbox.tsx           — inbox list, search, All/Unread/DM/Group tabs
src/pages/ConversationScreen.tsx      — full conversation view (header + list + composer)
src/pages/NewMessage.tsx              — pick user(s) → DM or group
src/components/messaging/
  ConversationRow.tsx                 — avatar(s), name, preview, unread pill, sent-by-me tick
  MessageBubble.tsx                   — text + system variant + status ticks
  MessageComposer.tsx                 — textarea, send, disabled state, error/retry
  DropChatHeader.tsx                  — title, host, countdown, "View Drop"
  GroupInfoSheet.tsx                  — members, mute, leave, rename
  UnreadBadge.tsx
src/lib/messaging/
  api.ts                              — supabase queries (list, fetch, send, mark read, create DM/group)
  useConversations.ts                 — realtime inbox subscription + unread totals
  useMessages.ts                      — paged message stream + realtime insert dedupe
  useUnreadTotal.ts                   — global unread count for tab badge
```

Integration points (existing code):
- `DropDetailsSheet` / `DemoDropDetailsSheet`: after successful RSVP, replace the current "send ping" composer with a "Open group chat" button that navigates to the Drop's conversation.
- `PersonProfileModal` (real mode): the existing quick-message composer becomes a "Message" button that opens/creates the DM thread.
- `TabBar`: swap or add a Messages tab with unread badge (see Open questions).
- Demo mode: seed a local mock inbox (no DB writes) via a `useDemoMessages` hook so investors see populated data; real mode uses Supabase.

Realtime: one channel per open conversation for messages; one inbox channel filtered to `conversation_members` where `user_id = auth.uid()` for previews/unread. Dedupe optimistic sends by client-generated temp id → replace on server insert.

Read tracking: on conversation open + on scroll-to-bottom, call `mark_conversation_read`. Unread count = `messages` where `created_at > last_read_at AND sender_id != me`.

### 3. RSVP-gated Drop chats

- `can_send_to_conversation` returns false for drop chats when user has no accepted RSVP and isn't host → composer shows "Rejoin the Drop to chat" with CTA.
- History remains readable while `left_at` is set (SELECT policy checks membership ever existed for drop chats specifically — or we keep member row with `left_at` set and allow read).
- Cancel-drop trigger posts a system message + sets a `canceled_at` flag on the conversation (add nullable column).

### 4. Demo data seed

Insert (real DB, guarded by demo mode toggle in a small "Seed demo messages" dev button, OR seeded via SQL for demo user) — since demo profiles aren't real auth users, demo mode inbox stays fully client-mocked. Real-mode users start empty and can create conversations immediately.

### 5. Technical notes

- Pagination: 30 messages per page, `created_at < cursor` on scroll up, preserve scroll offset via `scrollHeight` diff.
- Optimistic send: temp id `local-{uuid}`, status `sending` → replaced by server row via realtime; on error, status `failed` with retry.
- Group avatars: stack up to 3 member avatars.
- Timestamps: relative (<24h "3m", "2h"), then "Yesterday", then date.
- Date separators computed in render.
- Mobile keyboard: `enterKeyHint="send"`; desktop: Enter sends, Shift+Enter newline.
- Existing `FriendDetailCard` post-ping message composer and `DemoDropDetailsSheet` post-RSVP composer stay (they're demo-only visual flourishes) but real-mode paths route to the new conversation screen instead.

### Open questions

1. **Nav slot**: bottom tab bar has Map / Nearby / Explore / Pings / Profile. Where should Messages live? Options: (a) replace **Pings** and fold ping notifications into Messages as system-style rows, (b) replace **Explore**, (c) add a 6th tab (crowded on 390px). My recommendation: **(a) replace Pings** — pings become a lightweight system-notification conversation type, unifying the notification surface. Confirm before I wire the tab bar.

2. **Image upload in v1?** Spec lists it but says composer should "include" it. I'll ship text-only in v1 and wire image upload (Supabase Storage bucket `message-images`) in v1.1 unless you want it now — adds ~1 migration + upload UI.

3. **Demo mode**: keep demo-mode messages fully client-side mocked (no DB writes when `demoMode=true`)? Recommended yes so demos don't pollute the real DB.

### Deliverable order

1. Migration (DB + RLS + helpers + realtime publication + drop-RSVP triggers).
2. Core hooks (`api.ts`, `useConversations`, `useMessages`, `useUnreadTotal`).
3. Screens: `MessagesInbox`, `ConversationScreen`, `NewMessage`.
4. Nav tab + unread badge.
5. Integrations: `PersonProfileModal` Message button, `DropDetailsSheet` "Open chat" after RSVP.
6. Demo mock inbox for demo mode.
7. Empty / error / offline states + retry.

Answer the two open questions (nav slot + image upload) and I'll start with the migration.