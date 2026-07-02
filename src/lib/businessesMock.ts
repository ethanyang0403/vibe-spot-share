// Mock local-business data for the Sera Explore tab + map layer.
// Some businesses have an active "Promoted Moment" (a live deal).

export type CrowdLevel = "quiet" | "moderate" | "busy" | "packed";

export type BusinessType =
  | "bar"
  | "club"
  | "cafe"
  | "restaurant"
  | "gym"
  | "fitness"
  | "culture";

export interface PromotedMoment {
  active: boolean;
  title?: string;
  expiresInMinutes?: number;
  deal?: string;
  peopleSaid?: number;
}

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  icon: string;
  lat: number;
  lng: number;
  description: string;
  hours: string;
  rating: number;
  crowdLevel: CrowdLevel;
  promotedMoment: PromotedMoment;
}

// Coordinates spread across Brandeis campus + Moody Street (Waltham, MA).
export const MOCK_BUSINESSES: Business[] = [
  {
    id: "b1",
    name: "Velvet Rooftop",
    type: "bar",
    icon: "🍸",
    lat: 42.3758,
    lng: -71.2365,
    description: "Rooftop cocktail bar on Moody Street",
    hours: "5 PM – 2 AM",
    rating: 4.6,
    crowdLevel: "busy",
    promotedMoment: {
      active: true,
      title: "🍸 Half-price cocktails until 10 PM",
      expiresInMinutes: 68,
      deal: "50% off signature cocktails",
      peopleSaid: 14,
    },
  },
  {
    id: "b2",
    name: "The Grind Coffee",
    type: "cafe",
    icon: "☕",
    lat: 42.3660,
    lng: -71.2588,
    description: "Specialty coffee & pastries — steps from Shapiro",
    hours: "6 AM – 9 PM",
    rating: 4.8,
    crowdLevel: "moderate",
    promotedMoment: {
      active: true,
      title: "☕ Free pastry with any latte — next 2 hours",
      expiresInMinutes: 94,
      deal: "Free pastry with latte purchase",
      peopleSaid: 8,
    },
  },
  {
    id: "b3",
    name: "Iron Temple Gym",
    type: "gym",
    icon: "🏋️",
    lat: 42.3676,
    lng: -71.2580,
    description: "24/7 gym near Gosman with classes and open floor",
    hours: "Open 24 hours",
    rating: 4.3,
    crowdLevel: "moderate",
    promotedMoment: { active: false },
  },
  {
    id: "b4",
    name: "Koi Ramen House",
    type: "restaurant",
    icon: "🍜",
    lat: 42.3752,
    lng: -71.2360,
    description: "Authentic tonkotsu ramen on Moody Street",
    hours: "11 AM – 11 PM",
    rating: 4.7,
    crowdLevel: "busy",
    promotedMoment: {
      active: true,
      title: "🍜 Late night ramen special — $9 bowls after 9 PM",
      expiresInMinutes: 145,
      deal: "$9 ramen bowls",
      peopleSaid: 22,
    },
  },
  {
    id: "b5",
    name: "Gallery 404",
    type: "culture",
    icon: "🎨",
    lat: 42.3648,
    lng: -71.2600,
    description: "Contemporary art gallery near Skyline Commons",
    hours: "12 PM – 8 PM",
    rating: 4.5,
    crowdLevel: "quiet",
    promotedMoment: { active: false },
  },
  {
    id: "b6",
    name: "Neon Nights",
    type: "club",
    icon: "🎶",
    lat: 42.3762,
    lng: -71.2358,
    description: "Late-night club on Moody Street. DJs Thu–Sat.",
    hours: "10 PM – 3 AM",
    rating: 4.2,
    crowdLevel: "packed",
    promotedMoment: {
      active: true,
      title: "🎶 No cover before 11 PM tonight",
      expiresInMinutes: 42,
      deal: "Free entry before 11 PM",
      peopleSaid: 31,
    },
  },
  {
    id: "b7",
    name: "Sunrise Yoga Studio",
    type: "fitness",
    icon: "🧘",
    lat: 42.3670,
    lng: -71.2596,
    description: "Vinyasa, hot yoga, and meditation on campus",
    hours: "6 AM – 9 PM",
    rating: 4.9,
    crowdLevel: "quiet",
    promotedMoment: { active: false },
  },
  {
    id: "b8",
    name: "Bao Brothers",
    type: "restaurant",
    icon: "🥟",
    lat: 42.3755,
    lng: -71.2362,
    description: "Fast-casual steamed buns on Moody Street",
    hours: "11 AM – 10 PM",
    rating: 4.4,
    crowdLevel: "busy",
    promotedMoment: { active: false },
  },
  {
    id: "b9",
    name: "The Vinyl Tap",
    type: "bar",
    icon: "🎵",
    lat: 42.3758,
    lng: -71.2370,
    description: "Craft beer, vinyl records, and live acoustic sets",
    hours: "4 PM – 1 AM",
    rating: 4.6,
    crowdLevel: "moderate",
    promotedMoment: {
      active: true,
      title: "🎵 Live acoustic set at 8 PM — first beer free",
      expiresInMinutes: 112,
      deal: "Free first beer with entry",
      peopleSaid: 17,
    },
  },
  {
    id: "b10",
    name: "Book & Bean",
    type: "cafe",
    icon: "📚",
    lat: 42.3648,
    lng: -71.2585,
    description: "Bookshop café near Goldfarb Library",
    hours: "7 AM – 10 PM",
    rating: 4.7,
    crowdLevel: "quiet",
    promotedMoment: { active: false },
  },
];

export const CROWD_LEVELS: CrowdLevel[] = ["quiet", "moderate", "busy", "packed"];

export const CROWD_LABEL: Record<CrowdLevel, string> = {
  quiet: "Quiet",
  moderate: "Moderate",
  busy: "Busy",
  packed: "Packed",
};

export interface ExploreCategory {
  id: string;
  label: string;
  // Which BusinessTypes belong to this category. `null` = match all.
  types: BusinessType[] | null;
}

export const EXPLORE_CATEGORIES: ExploreCategory[] = [
  { id: "all", label: "All", types: null },
  { id: "bars", label: "🍸 Bars", types: ["bar"] },
  { id: "food", label: "🍕 Food", types: ["restaurant"] },
  { id: "coffee", label: "☕ Coffee", types: ["cafe"] },
  { id: "fitness", label: "🏋️ Fitness", types: ["gym", "fitness"] },
  { id: "culture", label: "🎨 Culture", types: ["culture"] },
  { id: "nightlife", label: "🎶 Nightlife", types: ["club"] },
];

// Tiny event bus so the Explore tab can ask the Map tab to open a business.
export const FOCUS_BUSINESS_EVENT = "sera:focus-business";

export function focusBusinessOnMap(businessId: string) {
  window.dispatchEvent(
    new CustomEvent(FOCUS_BUSINESS_EVENT, { detail: { businessId } })
  );
}
