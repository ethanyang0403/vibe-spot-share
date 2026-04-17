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

// Coordinates clustered around UCLA so they sit near the friend dots.
export const MOCK_BUSINESSES: Business[] = [
  {
    id: "b1",
    name: "Velvet Rooftop",
    type: "bar",
    icon: "🍸",
    lat: 34.0701,
    lng: -118.4438,
    description: "Rooftop cocktail bar with downtown views",
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
    lat: 34.0675,
    lng: -118.4462,
    description: "Specialty coffee & pastries. Student favorite.",
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
    lat: 34.0718,
    lng: -118.4415,
    description: "24/7 gym with classes and open floor",
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
    lat: 34.0658,
    lng: -118.4475,
    description: "Authentic tonkotsu ramen & izakaya plates",
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
    lat: 34.0688,
    lng: -118.4490,
    description: "Contemporary art gallery with rotating exhibits",
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
    lat: 34.0695,
    lng: -118.4420,
    description: "Underground club. DJs Thu–Sat.",
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
    lat: 34.0665,
    lng: -118.4445,
    description: "Vinyasa, hot yoga, and meditation classes",
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
    lat: 34.0710,
    lng: -118.4455,
    description: "Fast-casual steamed buns and Taiwanese street food",
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
    lat: 34.0680,
    lng: -118.4428,
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
    lat: 34.0650,
    lng: -118.4468,
    description: "Bookshop café with reading nooks and espresso",
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
