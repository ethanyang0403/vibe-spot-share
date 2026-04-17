// Mock AI suggestion engine — all hardcoded for demo.
// No real AI; designed to look like ambient intelligence.

export type AISuggestionAction =
  | { type: 'show_business'; id: string }
  | { type: 'center_map'; lat: number; lng: number }
  | { type: 'show_moment'; id: string };

export interface AISuggestion {
  icon: string;
  text: string;
  context: string;
  reason: string;
  action: AISuggestionAction;
}

export const AI_SUGGESTIONS: AISuggestion[] = [
  {
    icon: '🍸',
    text: 'Velvet Rooftop is buzzing right now',
    context: '14 people there · Half-price cocktails for 68 more min',
    reason: 'You usually go out around this time on Fridays',
    action: { type: 'show_business', id: 'b1' },
  },
  {
    icon: '👥',
    text: '3 friends are within 2 blocks of each other',
    context: 'Jordan, Maya, and Taylor are all near Strathmore',
    reason: 'Based on your friend activity',
    action: { type: 'center_map', lat: 34.07, lng: -118.445 },
  },
  {
    icon: '🏀',
    text: 'Pickup basketball is happening nearby',
    context: '12 people at the court · 50 min left',
    reason: "You've joined 3 sports Moments this month",
    action: { type: 'show_moment', id: 'm1' },
  },
  {
    icon: '🍜',
    text: 'Koi Ramen has $9 bowls right now',
    context: "22 people said they're going · 0.3 mi away",
    reason: 'You like food spots in this area',
    action: { type: 'show_business', id: 'b4' },
  },
  {
    icon: '🎵',
    text: 'Live acoustic set at The Vinyl Tap at 8 PM',
    context: 'First beer free · 17 people interested',
    reason: "You've been to 2 live music events recently",
    action: { type: 'show_business', id: 'b9' },
  },
];

export const EXPLORE_PICK = {
  businessId: 'b9',
  name: 'The Vinyl Tap',
  icon: '🎵',
  reason: 'You like live music · 17 people interested tonight',
  deal: '🎵 Live acoustic set at 8 PM — first beer free',
};

export function getTimeAwareWelcome(): { text: string; highlights: string[] } {
  // Hardcoded evening version for demo.
  return {
    text: 'Friday night is heating up 🔥 — {0} people nearby, {1} live deals, {2} Moments happening',
    highlights: ['18', '5', '3'],
  };
}
