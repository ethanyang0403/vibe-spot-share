// Mock notification feed for the Pings/Activity tab.

export type NotificationType =
  | 'ping'
  | 'moment_nearby'
  | 'deal'
  | 'friend_accepted'
  | 'friend_request'
  | 'moment_expired'
  | 'ai_nudge';

export interface NotificationAction {
  type: 'show_on_map' | 'show_recap' | 'friend_request' | 'none';
  lat?: number;
  lng?: number;
  requestId?: string;
}

export interface MomentRecap {
  attendeeCount: number;
  duration: string;
  creator: string;
  attendees: { initial: string; color: string }[];
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  subtitle: string;
  timestamp: string;
  read: boolean;
  avatar: { initial: string; color: string; isAI?: boolean };
  action: NotificationAction;
  recap?: MomentRecap;
}

export const NOTIFICATION_FOCUS_FRIEND_EVENT = 'sera:notif-focus-friend';
export const NOTIFICATION_FOCUS_BUSINESS_EVENT = 'sera:notif-focus-business';

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'p1',
    type: 'ping',
    title: 'Jordan Lee pinged you 👋',
    subtitle: '"come thru, we\'re at Velvet Rooftop"',
    timestamp: '2 min ago',
    read: false,
    avatar: { initial: 'J', color: '#7C3AED' },
    action: { type: 'show_on_map', lat: 34.0705, lng: -118.4442 },
  },
  {
    id: 'p2',
    type: 'moment_nearby',
    title: 'New Moment near you',
    subtitle: '🏀 pickup basketball — 0.2 mi away',
    timestamp: '8 min ago',
    read: false,
    avatar: { initial: '🏀', color: '#1C1C24' },
    action: { type: 'show_on_map', lat: 34.0698, lng: -118.4435 },
  },
  {
    id: 'p3',
    type: 'deal',
    title: '🍸 Velvet Rooftop just dropped a deal',
    subtitle: 'Half-price cocktails until 10 PM — 14 people going',
    timestamp: '12 min ago',
    read: false,
    avatar: { initial: '🍸', color: '#1C1C24' },
    action: { type: 'show_on_map', lat: 34.0701, lng: -118.4438 },
  },
  {
    id: 'p4',
    type: 'ping',
    title: 'Maya Patel pinged you 👋',
    subtitle: '"food run? 🍕"',
    timestamp: '18 min ago',
    read: false,
    avatar: { initial: 'M', color: '#2563EB' },
    action: { type: 'show_on_map', lat: 34.0678, lng: -118.4468 },
  },
  {
    id: 'p5',
    type: 'friend_accepted',
    title: 'Nadia Okafor accepted your request',
    subtitle: "You're now friends — see them on the map",
    timestamp: '1 hr ago',
    read: true,
    avatar: { initial: 'N', color: '#EC4899' },
    action: { type: 'none' },
  },
  {
    id: 'p6',
    type: 'moment_expired',
    title: 'Moment ended: 🎵 free concert on the lawn',
    subtitle: '23 people showed up — see the recap',
    timestamp: '1 hr ago',
    read: true,
    avatar: { initial: '🎵', color: '#1C1C24' },
    action: { type: 'show_recap' },
    recap: {
      attendeeCount: 23,
      duration: '2 hrs',
      creator: 'Campus Events',
      attendees: [
        { initial: 'J', color: '#7C3AED' },
        { initial: 'M', color: '#2563EB' },
        { initial: 'C', color: '#059669' },
        { initial: 'R', color: '#D97706' },
        { initial: 'A', color: '#DC2626' },
      ],
    },
  },
  {
    id: 'p7',
    type: 'ping',
    title: 'Cam Torres pinged you 👋',
    subtitle: '"gym sesh?"',
    timestamp: '2 hrs ago',
    read: true,
    avatar: { initial: 'C', color: '#059669' },
    action: { type: 'show_on_map', lat: 34.0692, lng: -118.4410 },
  },
  {
    id: 'p8',
    type: 'deal',
    title: '🎶 Neon Nights — No cover before 11 PM',
    subtitle: '31 people said they\'re going',
    timestamp: '2 hrs ago',
    read: true,
    avatar: { initial: '🎶', color: '#1C1C24' },
    action: { type: 'show_on_map', lat: 34.0695, lng: -118.4420 },
  },
  {
    id: 'p9',
    type: 'friend_request',
    title: 'Danielle Cruz wants to be friends',
    subtitle: '🔗 2 mutuals — Jordan Lee, Maya Patel',
    timestamp: '3 hrs ago',
    read: true,
    avatar: { initial: 'D', color: '#F472B6' },
    action: { type: 'friend_request', requestId: 'r2' },
  },
  {
    id: 'p10',
    type: 'moment_nearby',
    title: 'Trending near you',
    subtitle: '🍜 Late night ramen special at Koi Ramen — 22 going',
    timestamp: '3 hrs ago',
    read: true,
    avatar: { initial: '🍜', color: '#1C1C24' },
    action: { type: 'show_on_map', lat: 34.0658, lng: -118.4475 },
  },
  {
    id: 'p11',
    type: 'ping',
    title: 'Alex Chen pinged you 👋',
    subtitle: '"where is everyone tonight?"',
    timestamp: '4 hrs ago',
    read: true,
    avatar: { initial: 'A', color: '#DC2626' },
    action: { type: 'show_on_map', lat: 34.0720, lng: -118.4425 },
  },
  {
    id: 'p12',
    type: 'moment_expired',
    title: "Your Moment ended: 🍕 pizza run — who's in?",
    subtitle: '6 people joined — nice!',
    timestamp: '5 hrs ago',
    read: true,
    avatar: { initial: '🍕', color: '#1C1C24' },
    action: { type: 'show_recap' },
    recap: {
      attendeeCount: 6,
      duration: '45 min',
      creator: 'You',
      attendees: [
        { initial: 'M', color: '#2563EB' },
        { initial: 'T', color: '#9333EA' },
        { initial: 'S', color: '#0891B2' },
        { initial: 'A', color: '#E11D48' },
        { initial: 'R', color: '#D97706' },
      ],
    },
  },
];
