// Mock data for the Nearby tab — strangers and friends-of-friends with
// connection-degree metadata. Zones use Brandeis spots.

import { FRIEND_LIST } from "./friendsMock";

export interface Connection {
  degree: 0 | 1 | 2 | 3;
  mutuals: string[];
  mutualCount: number;
  through?: string;
}

export interface NearbyPerson {
  id: string;
  name: string;
  username: string;
  initial: string;
  color: string;
  status: string;
  zone: string;
  connection: Connection;
}

export const NEARBY_PEOPLE: NearbyPerson[] = [
  // 2nd degree
  { id: "n1", name: "Danielle Cruz",  username: "danicruz",   initial: "D", color: "#F472B6",
    status: "Moody Street run 🍸",   zone: "Moody Street",
    connection: { degree: 2, mutuals: ["Jordan Lee", "Maya Patel"], mutualCount: 2 } },
  { id: "n2", name: "Marcus Webb",    username: "marcuswebb", initial: "M", color: "#60A5FA",
    status: "open mic at Chum's 🎸", zone: "Usdan",
    connection: { degree: 2, mutuals: ["Cam Torres"], mutualCount: 1 } },
  { id: "n3", name: "Jasmine Tran",   username: "jastran",    initial: "J", color: "#A78BFA",
    status: "gallery walk 🎨",       zone: "Shapiro",
    connection: { degree: 2, mutuals: ["Alex Chen", "Taylor Brooks"], mutualCount: 2 } },
  { id: "n4", name: "Eli Friedman",   username: "elifried",   initial: "E", color: "#34D399",
    status: "food recs at Sherman?", zone: "Sherman",
    connection: { degree: 2, mutuals: ["Sam Rivera"], mutualCount: 1 } },
  { id: "n5", name: "Ava Moretti",    username: "avamoretti", initial: "A", color: "#FB923C",
    status: "Skyline sunset 🌇",     zone: "Skyline",
    connection: { degree: 2, mutuals: ["Jordan Lee", "Riley Kim", "Maya Patel"], mutualCount: 3 } },

  // 3rd degree
  { id: "n6", name: "Noah Akinyemi",  username: "noahaki",    initial: "N", color: "#F87171",
    status: "night out 🌙",          zone: "Moody Street",
    connection: { degree: 3, mutuals: [], mutualCount: 0, through: "Danielle Cruz" } },
  { id: "n7", name: "Priya Mehta",    username: "priyam",     initial: "P", color: "#38BDF8",
    status: "café hunting ☕",       zone: "Goldfarb Library",
    connection: { degree: 3, mutuals: [], mutualCount: 0, through: "Marcus Webb" } },
  { id: "n8", name: "Luca Bianchi",   username: "lucab",      initial: "L", color: "#A3E635",
    status: "just vibing",           zone: "Great Lawn",
    connection: { degree: 3, mutuals: [], mutualCount: 0, through: "Jasmine Tran" } },
  { id: "n9", name: "Chloe Park",     username: "chloepark",  initial: "C", color: "#E879F9",
    status: "karaoke later? 🎤",     zone: "Massell Quad",
    connection: { degree: 3, mutuals: [], mutualCount: 0, through: "Eli Friedman" } },

  // No connection
  { id: "n10", name: "Tyler Osei",       username: "tylerosei",   initial: "T", color: "#94A3B8",
    status: "new on campus 👋",      zone: "Usdan",
    connection: { degree: 0, mutuals: [], mutualCount: 0 } },
  { id: "n11", name: "Sofia Ramirez",    username: "sofiar",      initial: "S", color: "#94A3B8",
    status: "studio hopping 🎨",     zone: "Shapiro",
    connection: { degree: 0, mutuals: [], mutualCount: 0 } },
  { id: "n12", name: "Kai Nakamura",     username: "kainaka",     initial: "K", color: "#94A3B8",
    status: "skating by Gosman 🛹",  zone: "Gosman",
    connection: { degree: 0, mutuals: [], mutualCount: 0 } },
  { id: "n13", name: "Imani Brooks",     username: "imanibrooks", initial: "I", color: "#94A3B8",
    status: "happy hour 🥂",         zone: "Moody Street",
    connection: { degree: 0, mutuals: [], mutualCount: 0 } },
  { id: "n14", name: "Oscar Lindqvist",  username: "oscarl",      initial: "O", color: "#94A3B8",
    status: "looking for a spot",    zone: "Skyline",
    connection: { degree: 0, mutuals: [], mutualCount: 0 } },
  { id: "n15", name: "Reina Sato",       username: "reinasato",   initial: "R", color: "#94A3B8",
    status: "spontaneous plans only", zone: "Great Lawn",
    connection: { degree: 0, mutuals: [], mutualCount: 0 } },
];

// Stable per-friend mutual count for 1st-degree friend UI.
const MUTUAL_COUNTS: Record<string, number> = {
  f1: 8, f2: 11, f3: 5, f4: 7, f5: 9, f6: 4, f7: 6, f8: 10,
};
export function mutualCountForFriend(id: string): number {
  return MUTUAL_COUNTS[id] ?? 6;
}

// How many people show up at each radius (smaller radius = fewer)
export function visibleNearbyCount(radiusMi: number, totalFriends = FRIEND_LIST.length) {
  if (radiusMi <= 0.5) return 6;
  if (radiusMi <= 1) return 12;
  return totalFriends + NEARBY_PEOPLE.length;
}

export function filteredNearby(radiusMi: number) {
  const cap = radiusMi <= 0.5 ? 4 : radiusMi <= 1 ? 9 : NEARBY_PEOPLE.length;
  return NEARBY_PEOPLE.slice(0, cap);
}

export function friendsNearby(radiusMi: number) {
  const cap = radiusMi <= 0.5 ? 2 : radiusMi <= 1 ? 3 : 4;
  return FRIEND_LIST.slice(0, cap);
}
