// Shared mock data + a tiny event bus so the Friends tab can ask the Map tab
// to fly to a specific friend and open their detail card.

export interface MockFriendListItem {
  id: string;
  name: string;
  username: string;
  initial: string;
  status: string;
  color: string;
  isOnline: boolean;
  lat: number;
  lng: number;
}

// Coordinates spread across Brandeis campus (Waltham, MA).
export const FRIEND_LIST: MockFriendListItem[] = [
  { id: "f1", name: "Jordan Lee",    username: "jordanlee",    initial: "J", status: "on the way to Usdan 🙌",     color: "#7C3AED", isOnline: true,  lat: 42.3667, lng: -71.2593 },
  { id: "f2", name: "Maya Patel",    username: "mayapatel",    initial: "M", status: "dinner at Sherman 🍕",       color: "#2563EB", isOnline: true,  lat: 42.3666, lng: -71.2610 },
  { id: "f3", name: "Cam Torres",    username: "camtorres",    initial: "C", status: "at Gosman 💪",               color: "#059669", isOnline: true,  lat: 42.3676, lng: -71.2580 },
  { id: "f4", name: "Riley Kim",     username: "rileykim",     initial: "R", status: "studying in Goldfarb 📚",    color: "#D97706", isOnline: false, lat: 42.3653, lng: -71.2588 },
  { id: "f5", name: "Alex Chen",     username: "alexchen",     initial: "A", status: "walking the Great Lawn 🗺️", color: "#DC2626", isOnline: true,  lat: 42.3663, lng: -71.2600 },
  { id: "f6", name: "Sam Rivera",    username: "samrivera",    initial: "S", status: "Shapiro atrium, bored 😐",   color: "#0891B2", isOnline: true,  lat: 42.3660, lng: -71.2586 },
  { id: "f7", name: "Taylor Brooks", username: "taylorbrooks", initial: "T", status: "pregaming in Massell 🎉",    color: "#9333EA", isOnline: true,  lat: 42.3671, lng: -71.2603 },
  { id: "f8", name: "Avery Nguyen",  username: "averynguyen",  initial: "A", status: "on Moody Street 👀",         color: "#E11D48", isOnline: false, lat: 42.3760, lng: -71.2360 },
];

export interface MockSearchResult {
  id: string;
  name: string;
  username: string;
  initial: string;
  color: string;
}

export const SEARCH_RESULTS: MockSearchResult[] = [
  { id: "s1", name: "Kai Washington", username: "kaiwash",      initial: "K", color: "#8B5CF6" },
  { id: "s2", name: "Priya Sharma",   username: "priyasharma",  initial: "P", color: "#06B6D4" },
  { id: "s3", name: "Diego Morales",  username: "diegom",       initial: "D", color: "#F59E0B" },
  { id: "s4", name: "Zoe Williams",   username: "zoewill",      initial: "Z", color: "#10B981" },
  { id: "s5", name: "Liam Park",      username: "liampark",     initial: "L", color: "#EF4444" },
];

export interface MockFriendRequest {
  id: string;
  name: string;
  username: string;
  initial: string;
  color: string;
}

export const FRIEND_REQUESTS: MockFriendRequest[] = [
  { id: "r1", name: "Nadia Okafor", username: "nadiaokafor", initial: "N", color: "#EC4899" },
];

// ---- Tiny event for "open this friend on the map" ----
export const FOCUS_FRIEND_EVENT = "sera:focus-friend";

export function focusFriendOnMap(friendId: string) {
  window.dispatchEvent(new CustomEvent(FOCUS_FRIEND_EVENT, { detail: { friendId } }));
}
