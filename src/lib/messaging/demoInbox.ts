// Demo-mode inbox — fully client-side, no DB writes.
// Provides a rich populated messages surface for demos/investors.

export interface DemoMessage {
  id: string;
  senderName: string;   // '' for system
  senderInitial: string;
  senderColor: string;
  content: string;
  createdAt: string;    // ISO
  isMe?: boolean;
  system?: boolean;
  readByAll?: boolean;
}

export interface DemoConversation {
  id: string;
  type: 'direct' | 'group' | 'drop';
  name: string;
  otherInitial?: string;
  otherColor?: string;
  memberAvatars?: Array<{ initial: string; color: string }>;
  lastActivityAt: string;
  unreadCount: number;
  lastMessagePreview: string;
  lastMessageIsMe: boolean;
  dropMeta?: { title: string; category: string; startTime: string; location: string };
  canceled?: boolean;
  messages: DemoMessage[];
}

const now = Date.now();
const min = (n: number) => new Date(now - n * 60_000).toISOString();
const hr = (n: number) => new Date(now - n * 60 * 60_000).toISOString();
const day = (n: number) => new Date(now - n * 24 * 60 * 60_000).toISOString();

export const DEMO_INBOX: DemoConversation[] = [
  {
    id: 'demo-conv-1',
    type: 'direct',
    name: 'Jordan Lee',
    otherInitial: 'J',
    otherColor: '#7C3AED',
    lastActivityAt: min(3),
    unreadCount: 2,
    lastMessagePreview: 'Down for tacos at 8?',
    lastMessageIsMe: false,
    messages: [
      { id: 'm1-1', senderName: 'Jordan Lee', senderInitial: 'J', senderColor: '#7C3AED', content: 'Yo you around tonight?', createdAt: min(45) },
      { id: 'm1-2', senderName: 'Me', senderInitial: 'M', senderColor: '#C2E9FF', content: 'Yeah what\'s up', createdAt: min(40), isMe: true, readByAll: true },
      { id: 'm1-3', senderName: 'Jordan Lee', senderInitial: 'J', senderColor: '#7C3AED', content: 'Thinking Moody St. run', createdAt: min(6) },
      { id: 'm1-4', senderName: 'Jordan Lee', senderInitial: 'J', senderColor: '#7C3AED', content: 'Down for tacos at 8?', createdAt: min(3) },
    ],
  },
  {
    id: 'demo-conv-2',
    type: 'drop',
    name: 'Great Lawn Frisbee',
    memberAvatars: [
      { initial: 'M', color: '#2563EB' },
      { initial: 'C', color: '#059669' },
      { initial: 'R', color: '#D97706' },
    ],
    lastActivityAt: min(18),
    unreadCount: 5,
    lastMessagePreview: 'On my way — bringing extra disc',
    lastMessageIsMe: false,
    dropMeta: { title: 'Great Lawn Frisbee', category: '🏀 Sports', startTime: hr(-1.5), location: 'Great Lawn' },
    messages: [
      { id: 'm2-0', senderName: '', senderInitial: '', senderColor: '', content: 'Cam started this Drop', createdAt: hr(2), system: true },
      { id: 'm2-1', senderName: 'Cam', senderInitial: 'C', senderColor: '#059669', content: 'Meeting on the north side of Great Lawn', createdAt: hr(1.5) },
      { id: 'm2-2', senderName: 'Maya', senderInitial: 'M', senderColor: '#2563EB', content: 'Sweet, I\'ll bring cones', createdAt: hr(1.2) },
      { id: 'm2-3', senderName: 'Me', senderInitial: 'M', senderColor: '#C2E9FF', content: 'RSVPed! Leaving Usdan in 5', createdAt: min(35), isMe: true, readByAll: false },
      { id: 'm2-4', senderName: 'Riley', senderInitial: 'R', senderColor: '#D97706', content: 'On my way — bringing extra disc', createdAt: min(18) },
    ],
  },
  {
    id: 'demo-conv-3',
    type: 'group',
    name: 'Late-night Usdan crew',
    memberAvatars: [
      { initial: 'S', color: '#0891B2' },
      { initial: 'T', color: '#DC2626' },
      { initial: 'A', color: '#9333EA' },
    ],
    lastActivityAt: hr(2),
    unreadCount: 0,
    lastMessagePreview: 'You: bet, see y\'all at 11',
    lastMessageIsMe: true,
    messages: [
      { id: 'm3-1', senderName: 'Sam', senderInitial: 'S', senderColor: '#0891B2', content: 'Usdan at 11 tonight?', createdAt: hr(3) },
      { id: 'm3-2', senderName: 'Taylor', senderInitial: 'T', senderColor: '#DC2626', content: 'I\'m down', createdAt: hr(2.8) },
      { id: 'm3-3', senderName: 'Avery', senderInitial: 'A', senderColor: '#9333EA', content: 'same', createdAt: hr(2.5) },
      { id: 'm3-4', senderName: 'Me', senderInitial: 'M', senderColor: '#C2E9FF', content: 'bet, see y\'all at 11', createdAt: hr(2), isMe: true, readByAll: true },
    ],
  },
  {
    id: 'demo-conv-4',
    type: 'direct',
    name: 'Maya Patel',
    otherInitial: 'M',
    otherColor: '#2563EB',
    lastActivityAt: hr(6),
    unreadCount: 0,
    lastMessagePreview: 'thx! good luck on the midterm',
    lastMessageIsMe: false,
    messages: [
      { id: 'm4-1', senderName: 'Me', senderInitial: 'M', senderColor: '#C2E9FF', content: 'notes from bio lab?', createdAt: hr(7), isMe: true, readByAll: true },
      { id: 'm4-2', senderName: 'Maya Patel', senderInitial: 'M', senderColor: '#2563EB', content: 'sent — check drive', createdAt: hr(6.5) },
      { id: 'm4-3', senderName: 'Me', senderInitial: 'M', senderColor: '#C2E9FF', content: 'lifesaver 🙏', createdAt: hr(6.1), isMe: true, readByAll: true },
      { id: 'm4-4', senderName: 'Maya Patel', senderInitial: 'M', senderColor: '#2563EB', content: 'thx! good luck on the midterm', createdAt: hr(6) },
    ],
  },
  {
    id: 'demo-conv-5',
    type: 'drop',
    name: 'Sunday Chapels Pickup',
    memberAvatars: [
      { initial: 'L', color: '#F59E0B' },
      { initial: 'P', color: '#10B981' },
    ],
    lastActivityAt: day(1),
    unreadCount: 0,
    lastMessagePreview: 'gg everyone — same time next week?',
    lastMessageIsMe: false,
    canceled: false,
    dropMeta: { title: 'Sunday Chapels Pickup', category: '🏀 Sports', startTime: day(1), location: 'Chapels Field' },
    messages: [
      { id: 'm5-1', senderName: 'Leo', senderInitial: 'L', senderColor: '#F59E0B', content: 'ggs, that was fun', createdAt: day(1) },
      { id: 'm5-2', senderName: 'Priya', senderInitial: 'P', senderColor: '#10B981', content: 'gg everyone — same time next week?', createdAt: day(1) },
    ],
  },
];

export function getDemoConversation(id: string): DemoConversation | null {
  return DEMO_INBOX.find((c) => c.id === id) ?? null;
}
