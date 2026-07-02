// Profile data for own profile + viewing other people's profiles (Hinge-style).

export interface ProfilePrompt {
  question: string;
  answer: string;
}

export interface ProfileData {
  age: number;
  zone: string;
  bio: string;
  interests: string[];
  prompts: ProfilePrompt[];
  photoCount: number; // how many photo placeholder cards to show
}

export const OWN_PROFILE: ProfileData = {
  age: 20,
  zone: 'Brandeis',
  bio: "Spontaneous plans only. If the group chat takes more than 3 messages to decide, I'm already at Usdan. Find me wherever the food is. 🍕",
  interests: [
    '🍕 Food spots',
    '🏀 Pickup games',
    '🎵 Live music',
    '📸 Photography',
    '🌮 Late night eats',
    '🗺️ Exploring',
    '☕ Coffee runs',
  ],
  prompts: [
    {
      question: "A spontaneous plan I'm always down for...",
      answer: "Midnight food run on Moody. No debate. We're going.",
    },
    {
      question: 'My go-to spot on campus is...',
      answer: 'Wherever has the shortest line and the best vibes',
    },
  ],
  photoCount: 5,
};

// Demo profiles by full name. Anyone not listed gets a minimal placeholder profile.
export const DEMO_PROFILES: Record<string, ProfileData> = {
  'Jordan Lee': {
    age: 22,
    zone: 'Usdan',
    bio: "If I'm not at Gosman shooting hoops, I'm finding the best taco spot on Moody. Always down.",
    interests: ['🏀 Basketball', '🌮 Tacos', '🎵 Hip hop', '🗺️ Campus exploring', '🎮 Gaming'],
    prompts: [
      {
        question: "On a Friday night you'll find me...",
        answer: "Wherever the energy is. I don't make plans, I follow the vibe.",
      },
      {
        question: "Best spontaneous night I've had...",
        answer: 'Found a rooftop party on Moody through a random invite. Stayed till 3 AM.',
      },
    ],
    photoCount: 4,
  },
  'Maya Patel': {
    age: 21,
    zone: 'Sherman',
    bio: 'Food is my love language. On a mission to find the best dumplings within a mile of campus. Join me or don\'t. 🥟',
    interests: ['🍜 Ramen hunting', '📸 Film photography', '🧘 Yoga', '☕ Specialty coffee', '🎨 Gallery walks'],
    prompts: [
      {
        question: "A spontaneous plan I'm always down for...",
        answer: 'Late night dessert run on Moody. Non-negotiable.',
      },
      {
        question: 'My hidden talent is...',
        answer: 'Finding the best restaurant on Moody Street within 10 minutes',
      },
    ],
    photoCount: 4,
  },
  'Cam Torres': {
    age: 23,
    zone: 'Gosman',
    bio: 'Gym in the morning, exploring all day, out all night. Sleep is a suggestion.',
    interests: ['🏋️ Fitness', '🍕 Pizza critic', '🎶 Live shows', '🛹 Skating', '📚 Non-fiction'],
    prompts: [
      {
        question: 'The way to my heart is...',
        answer: "Suggest a Gosman workout then grab food after. That's the perfect hangout.",
      },
      {
        question: "I'm convinced that...",
        answer: 'The best things happen after midnight around Waltham.',
      },
    ],
    photoCount: 4,
  },
};

export function getProfileFor(name: string): ProfileData {
  return (
    DEMO_PROFILES[name] ?? {
      age: 20,
      zone: 'Brandeis',
      bio: "This person hasn't filled out their profile yet.",
      interests: [],
      prompts: [],
      photoCount: 3,
    }
  );
}

// Darker companion color for gradient placeholders. Naive HSL-style darken.
export function darkenColor(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const dr = Math.max(0, Math.floor(r * 0.55));
  const dg = Math.max(0, Math.floor(g * 0.55));
  const db = Math.max(0, Math.floor(b * 0.55));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}
