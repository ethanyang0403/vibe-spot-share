// Local-only demo drops shown on the map when nothing "real" is going on yet.
// Structured to mirror the shape of the real `drops` table so this can later
// be swapped out for Supabase data with minimal changes.
//
// RSVP state for demo drops lives in memory + localStorage — persistent across
// reloads but scoped to this browser. Real Supabase RSVPs are handled by
// DropDetailsSheet.tsx against the `drops` / `drop_rsvps` tables.

import { useEffect, useState } from 'react';

export type DemoRsvpStatus = 'going' | 'maybe' | null;

export interface DemoHost {
  id: string;
  name: string;
  initial: string;
  color: string;
  bio: string; // short context, e.g. "Near Sherman • Brandeis '26"
}

export interface DemoDrop {
  id: string;
  title: string;
  category: string; // matches DROP_CATEGORIES ids in CreateDropSheet
  description: string;
  location_name: string;
  location_details: string | null;
  latitude: number;
  longitude: number;
  capacity: number;
  baseAttendees: number; // seeded count before local user's RSVP
  created_at: string;
  start_time: string;
  end_time: string;
  rsvp_deadline: string;
  host: DemoHost;
}

// ---- Fake friend hosts (also used as extra map markers) ---------------------

export interface DemoFriendMarker {
  id: string;
  name: string;
  initial: string;
  status: string;
  lat: number;
  lng: number;
  color: string;
}

export const DEMO_FRIENDS: DemoFriendMarker[] = [
  { id: 'df1',  name: 'Jordan Lee',     initial: 'J', status: 'heading to Usdan 🙌',        lat: 42.3667, lng: -71.2593, color: '#7C3AED' },
  { id: 'df2',  name: 'Maya Patel',     initial: 'M', status: 'dinner at Sherman 🍕',       lat: 42.3666, lng: -71.2610, color: '#2563EB' },
  { id: 'df3',  name: 'Cam Torres',     initial: 'C', status: 'lifting at Gosman 💪',       lat: 42.3676, lng: -71.2580, color: '#059669' },
  { id: 'df4',  name: 'Riley Kim',      initial: 'R', status: 'studying in Goldfarb 📚',    lat: 42.3653, lng: -71.2588, color: '#D97706' },
  { id: 'df5',  name: 'Alex Chen',      initial: 'A', status: 'Great Lawn walk 🗺️',        lat: 42.3660, lng: -71.2597, color: '#DC2626' },
  { id: 'df6',  name: 'Sam Rivera',     initial: 'S', status: 'Shapiro atrium 😐',          lat: 42.3660, lng: -71.2586, color: '#0891B2' },
  { id: 'df7',  name: 'Taylor Brooks',  initial: 'T', status: 'pregame in Massell 🎉',      lat: 42.3671, lng: -71.2603, color: '#9333EA' },
  { id: 'df8',  name: 'Avery Nguyen',   initial: 'A', status: 'Moody Street 👀',            lat: 42.3688, lng: -71.2565, color: '#E11D48' },
  { id: 'df9',  name: 'Nina Osei',      initial: 'N', status: 'coffee near SCC ☕',          lat: 42.3659, lng: -71.2583, color: '#F59E0B' },
  { id: 'df10', name: 'Leo Martinez',   initial: 'L', status: 'Rabb steps 📖',              lat: 42.3651, lng: -71.2596, color: '#10B981' },
  { id: 'df11', name: 'Priya Shah',     initial: 'P', status: 'library 3rd floor 📚',       lat: 42.3654, lng: -71.2590, color: '#EC4899' },
  { id: 'df12', name: 'Ari Weiss',      initial: 'A', status: 'Gosman track 🏃',            lat: 42.3679, lng: -71.2585, color: '#22D3EE' },
  { id: 'df13', name: 'Jason Park',     initial: 'J', status: 'Sherman line 🍜',            lat: 42.3665, lng: -71.2612, color: '#8B5CF6' },
  { id: 'df14', name: 'Zoe Fischer',    initial: 'Z', status: 'North Quad chill 🌿',        lat: 42.3673, lng: -71.2599, color: '#F97316' },
  { id: 'df15', name: 'Devon Ali',      initial: 'D', status: 'Chapels Field 🌅',           lat: 42.3648, lng: -71.2601, color: '#14B8A6' },
  { id: 'df16', name: 'Hana Ito',       initial: 'H', status: 'Einstein Bros 🥯',           lat: 42.3661, lng: -71.2581, color: '#A78BFA' },
];

function hostFrom(f: DemoFriendMarker, bio: string): DemoHost {
  return { id: f.id, name: f.name, initial: f.initial, color: f.color, bio };
}

// ---- Demo drops -------------------------------------------------------------

const now = Date.now();
const mins = (n: number) => new Date(now + n * 60_000).toISOString();

export const DEMO_DROPS: DemoDrop[] = [
  {
    id: 'dd1',
    title: 'Sherman dinner run',
    category: 'food',
    description: 'Grabbing pasta bar around 6:30, come sit with us. Third table by the window.',
    location_name: 'Sherman Dining',
    location_details: 'Meet by the entrance',
    latitude: 42.3666, longitude: -71.2610,
    capacity: 8, baseAttendees: 4,
    created_at: mins(-40),
    start_time: mins(20), end_time: mins(90), rsvp_deadline: mins(15),
    host: hostFrom(DEMO_FRIENDS[1], 'Near Sherman • Brandeis student'),
  },
  {
    id: 'dd2',
    title: 'Goldfarb study grind',
    category: 'study',
    description: 'Grinding through orgo pset. Silent floor, coffee provided.',
    location_name: 'Goldfarb Library',
    location_details: '3rd floor, corner tables',
    latitude: 42.3653, longitude: -71.2588,
    capacity: 6, baseAttendees: 3,
    created_at: mins(-90),
    start_time: mins(30), end_time: mins(180), rsvp_deadline: mins(25),
    host: hostFrom(DEMO_FRIENDS[3], 'Studying in Goldfarb'),
  },
  {
    id: 'dd3',
    title: 'Gosman pickup basketball',
    category: 'sports',
    description: '4v4, rotating in. Bring a light and dark shirt.',
    location_name: 'Gosman Sports Center',
    location_details: 'Main court',
    latitude: 42.3676, longitude: -71.2580,
    capacity: 10, baseAttendees: 7,
    created_at: mins(-30),
    start_time: mins(45), end_time: mins(150), rsvp_deadline: mins(40),
    host: hostFrom(DEMO_FRIENDS[2], 'At Gosman right now'),
  },
  {
    id: 'dd4',
    title: 'Coffee walk from SCC',
    category: 'chill',
    description: 'Walking to Einstein, chatting the whole way. Slow pace.',
    location_name: 'Shapiro Campus Center',
    location_details: 'Meet at the front steps',
    latitude: 42.3660, longitude: -71.2586,
    capacity: 6, baseAttendees: 2,
    created_at: mins(-20),
    start_time: mins(10), end_time: mins(70), rsvp_deadline: mins(8),
    host: hostFrom(DEMO_FRIENDS[8], 'SCC regular'),
  },
  {
    id: 'dd5',
    title: 'Great Lawn hangout',
    category: 'chill',
    description: 'Blankets, speaker, general low-effort vibes. Drop by whenever.',
    location_name: 'Great Lawn',
    location_details: 'Look for the yellow blanket',
    latitude: 42.3660, longitude: -71.2597,
    capacity: 15, baseAttendees: 6,
    created_at: mins(-15),
    start_time: mins(5), end_time: mins(120), rsvp_deadline: mins(60),
    host: hostFrom(DEMO_FRIENDS[4], 'On the Great Lawn'),
  },
  {
    id: 'dd6',
    title: 'Late-night Moody snack run',
    category: 'food',
    description: 'Uber pool to Moody. Ice cream, dumplings, back by 1.',
    location_name: 'Moody Street',
    location_details: 'Uber leaves from Usdan lot',
    latitude: 42.3688, longitude: -71.2565,
    capacity: 4, baseAttendees: 3,
    created_at: mins(-10),
    start_time: mins(180), end_time: mins(300), rsvp_deadline: mins(150),
    host: hostFrom(DEMO_FRIENDS[7], 'Late-night snack enthusiast'),
  },
  {
    id: 'dd7',
    title: 'Songwriter jam @ Chum\'s',
    category: 'creative',
    description: 'Open jam, bring an instrument or just listen. Loose vibes.',
    location_name: 'Shapiro Campus Center',
    location_details: 'Chum\'s Coffeehouse',
    latitude: 42.3661, longitude: -71.2584,
    capacity: 12, baseAttendees: 5,
    created_at: mins(-60),
    start_time: mins(120), end_time: mins(240), rsvp_deadline: mins(90),
    host: hostFrom(DEMO_FRIENDS[5], 'Chum\'s regular'),
  },
  {
    id: 'dd8',
    title: 'Pre-Chapels Field kickabout',
    category: 'sports',
    description: 'Casual soccer, no cleats needed. 30 minutes then dinner.',
    location_name: 'Chapels Field',
    location_details: 'Meet by the flagpole',
    latitude: 42.3648, longitude: -71.2601,
    capacity: 12, baseAttendees: 4,
    created_at: mins(-25),
    start_time: mins(25), end_time: mins(85), rsvp_deadline: mins(20),
    host: hostFrom(DEMO_FRIENDS[14], 'Down at Chapels'),
  },
  {
    id: 'dd9',
    title: 'Massell pregame',
    category: 'party',
    description: 'Room 214. Music, cards, then heading out around 11.',
    location_name: 'Massell Quad',
    location_details: 'Deroy Hall 214',
    latitude: 42.3671, longitude: -71.2603,
    capacity: 10, baseAttendees: 8,
    created_at: mins(-35),
    start_time: mins(210), end_time: mins(330), rsvp_deadline: mins(180),
    host: hostFrom(DEMO_FRIENDS[6], 'Massell first-year'),
  },
  {
    id: 'dd10',
    title: 'Einstein Bros bagel meetup',
    category: 'food',
    description: 'Bagels, coffee, 20-min catch-up before class.',
    location_name: 'Einstein Bros',
    location_details: 'Grab a booth in the back',
    latitude: 42.3661, longitude: -71.2581,
    capacity: 5, baseAttendees: 2,
    created_at: mins(-8),
    start_time: mins(35), end_time: mins(75), rsvp_deadline: mins(30),
    host: hostFrom(DEMO_FRIENDS[15], 'Loves a bagel'),
  },
];

// ---- Local RSVP store -------------------------------------------------------

const LS_KEY = 'drop:demo-rsvp';
const EVENT = 'drop:demo-rsvp-change';

type Store = Record<string, Exclude<DemoRsvpStatus, null>>;

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem(LS_KEY) || '{}'); }
  catch { return {}; }
}

function writeStore(s: Store) {
  window.localStorage.setItem(LS_KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function getDemoRsvp(dropId: string): DemoRsvpStatus {
  return readStore()[dropId] ?? null;
}

export function setDemoRsvp(dropId: string, status: DemoRsvpStatus) {
  const s = readStore();
  if (status === null) delete s[dropId];
  else s[dropId] = status;
  writeStore(s);
}

/** Live count = base + local 'going' contribution for the current user. */
export function useDemoDropCount(drop: DemoDrop): { going: number; maybe: number; myStatus: DemoRsvpStatus } {
  const [myStatus, setMyStatus] = useState<DemoRsvpStatus>(() => getDemoRsvp(drop.id));
  useEffect(() => {
    const h = () => setMyStatus(getDemoRsvp(drop.id));
    window.addEventListener(EVENT, h);
    window.addEventListener('storage', h);
    return () => {
      window.removeEventListener(EVENT, h);
      window.removeEventListener('storage', h);
    };
  }, [drop.id]);
  return {
    going: drop.baseAttendees + (myStatus === 'going' ? 1 : 0),
    maybe: myStatus === 'maybe' ? 1 : 0,
    myStatus,
  };
}
