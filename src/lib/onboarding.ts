export type OptionCode = { code: string; label: string };

export type Step =
  | { n: number; field: keyof IntakeAnswers; kind: 'single'; question: string; helper?: string; options: OptionCode[]; skippable?: boolean; section: number }
  | { n: number; field: keyof IntakeAnswers; kind: 'multi'; question: string; helper?: string; options: OptionCode[]; max?: number; skippable?: boolean; section: number; allowCustom?: boolean }
  | { n: number; field: keyof IntakeAnswers; kind: 'availability'; question: string; helper?: string; section: number }
  | { n: number; field: keyof IntakeAnswers; kind: 'text'; question: string; helper?: string; skippable?: boolean; section: number; placeholder?: string }
  | { n: number; kind: 'compound'; question: string; helper?: string; rows: Array<{ field: keyof IntakeAnswers; label: string; kind: 'single' | 'multi'; options: OptionCode[] }>; section: number; skippable?: boolean }
  | { n: number; field: keyof IntakeAnswers; kind: 'crewseeds'; question: string; helper?: string; skippable?: boolean; section: number }
  | { n: number; field: keyof IntakeAnswers; kind: 'multi-with-note'; question: string; helper?: string; options: OptionCode[]; noteField: keyof IntakeAnswers; skippable?: boolean; section: number }
  | { n: number; field: keyof IntakeAnswers; kind: 'single-reveal'; question: string; options: OptionCode[]; revealOn: string[]; revealField: keyof IntakeAnswers; revealLabel: string; revealSkippable?: boolean; section: number };

export interface Availability {
  // rows: afternoon | evening | late ; cols: mon..sun
  [day: string]: { afternoon?: boolean; evening?: boolean; late?: boolean };
}

export interface IntakeAnswers {
  year?: string;
  housing?: string;
  orgs?: string[];
  availability?: Availability;
  notice_threshold?: string;
  ping_windows?: string[];
  ping_frequency?: string;
  categories?: string[];
  plan_energy?: string;
  group_size?: string;
  scenario_spontaneity?: string;
  rings_joinable?: string[];
  intent?: string;
  talk_style?: string;
  crew_seeds?: string[];
  radius?: string;
  budget?: string;
  constraints?: string[];
  constraints_note?: string;
  host_interest?: string;
  host_pitch?: string;
  wildcard?: string;
}

export const SECTIONS = [
  { id: 1, title: 'About you', sub: 'A few quick basics.' },
  { id: 2, title: 'Your week', sub: 'When Drop can reach you.' },
  { id: 3, title: 'Your plans', sub: 'What you actually show up for.' },
  { id: 4, title: 'Your people', sub: 'Who you want to hang with.' },
  { id: 5, title: 'Details', sub: 'A few last things.' },
];

export const STEPS: Step[] = [
  { n: 1, section: 1, field: 'year', kind: 'single', question: 'What year are you?', options: [
    { code: 'freshman', label: 'Freshman' },
    { code: 'sophomore', label: 'Sophomore' },
    { code: 'junior', label: 'Junior' },
    { code: 'senior', label: 'Senior' },
    { code: 'grad', label: 'Grad' },
  ]},
  { n: 2, section: 1, field: 'housing', kind: 'single', question: 'Where do you live?', options: [
    { code: 'massell', label: 'Massell Quad' },
    { code: 'north', label: 'North Quad' },
    { code: 'east', label: 'East Quad' },
    { code: 'skyline', label: 'Skyline' },
    { code: 'ziv', label: 'Ziv' },
    { code: 'ridgewood', label: 'Ridgewood' },
    { code: 'mods', label: 'Foster Mods' },
    { code: 'charles_river', label: 'Charles River' },
    { code: 'off_campus', label: 'Off-campus Waltham' },
    { code: 'commuter', label: 'Commuter' },
  ]},
  { n: 3, section: 1, field: 'orgs', kind: 'multi', skippable: true, allowCustom: true,
    question: 'Which groups are you part of?',
    helper: 'This helps route club and dorm plans to the right people.',
    options: [
      { code: 'club_sports', label: 'Club sports' },
      { code: 'intramurals', label: 'Intramurals' },
      { code: 'greek', label: 'Greek life' },
      { code: 'cultural', label: 'Cultural orgs' },
      { code: 'arts', label: 'A cappella or theater' },
      { code: 'quant', label: 'Quant Club' },
      { code: 'sia', label: 'SIA' },
      { code: 'research', label: 'Research lab' },
      { code: 'job', label: 'Campus job' },
      { code: 'none', label: 'None yet' },
    ]},
  { n: 4, section: 2, field: 'availability', kind: 'availability',
    question: 'When are you usually free?',
    helper: 'Rough is fine. Tap all that apply — you can adjust this anytime.' },
  { n: 5, section: 2, field: 'notice_threshold', kind: 'single',
    question: 'How much lead time do you need before joining a plan?',
    options: [
      { code: 'under_1h', label: 'Under an hour' },
      { code: 'few_hours', label: 'A few hours' },
      { code: 'same_day', label: 'Same day' },
      { code: 'day_plus', label: 'A day or more' },
    ]},
  { n: 6, section: 2, kind: 'compound',
    question: 'When can Drop notify you about same-day plans?',
    rows: [
      { field: 'ping_windows', kind: 'multi', label: '',
        options: [
          { code: 'weekday_evenings', label: 'Weekday evenings' },
          { code: 'between_classes', label: 'Between classes' },
          { code: 'weekend_days', label: 'Weekend days' },
          { code: 'weekend_nights', label: 'Weekend nights' },
        ]},
      { field: 'ping_frequency', kind: 'single', label: 'How often?',
        options: [
          { code: 'essentials', label: 'Only the best fits — 2 or so a week' },
          { code: 'few_per_week', label: 'A few times a week' },
          { code: 'open', label: 'Whenever something fits' },
        ]},
    ]},
  { n: 7, section: 3, field: 'categories', kind: 'multi', max: 5,
    question: 'What would you actually show up for?',
    helper: 'Pick up to five. Choose realistically, not aspirationally.',
    options: [
      { code: 'late_food', label: 'Late-night food' },
      { code: 'coffee', label: 'Coffee or boba' },
      { code: 'sports', label: 'Pickup sports' },
      { code: 'gym', label: 'Gym' },
      { code: 'study', label: 'Study sessions' },
      { code: 'movies', label: 'Movie nights' },
      { code: 'parties', label: 'House parties' },
      { code: 'going_out', label: 'Bars and going out' },
      { code: 'music', label: 'Live music' },
      { code: 'outdoors', label: 'Outdoors' },
      { code: 'gaming', label: 'Gaming' },
      { code: 'art', label: 'Art and making things' },
      { code: 'volunteering', label: 'Volunteering' },
      { code: 'wildcard_cat', label: 'Something new' },
    ]},
  { n: 8, section: 3, field: 'plan_energy', kind: 'single',
    question: "Most weeks, what's your speed?",
    options: [
      { code: 'low_key', label: 'Mostly low-key — food, coffee, small hangs' },
      { code: 'mixed', label: 'A real mix' },
      { code: 'going_out', label: 'Mostly going out' },
      { code: 'depends', label: 'Depends on the week' },
    ]},
  { n: 9, section: 3, field: 'group_size', kind: 'single',
    question: 'Ideal group size?',
    options: [
      { code: 'small', label: '3–4' },
      { code: 'medium', label: '5–8' },
      { code: 'large', label: '10–20' },
      { code: 'any', label: 'No preference' },
    ]},
  { n: 10, section: 3, field: 'scenario_spontaneity', kind: 'single',
    question: "It's 8:40 pm on a Tuesday. Someone from your dorm — you know them a little — invites you on a food run leaving in 20 minutes. Realistically?",
    options: [
      { code: 'all_in', label: "I'm in" },
      { code: 'with_friend', label: "If a friend's going" },
      { code: 'depends_host', label: "Depends who's organizing" },
      { code: 'unlikely', label: 'Probably not' },
    ]},
  { n: 11, section: 4, field: 'rings_joinable', kind: 'multi',
    question: 'Whose plans would you join?',
    options: [
      { code: 'crew', label: 'My close friends' },
      { code: 'fof', label: 'Friends of friends' },
      { code: 'org', label: 'My clubs, dorm, or team' },
      { code: 'open', label: "Open plans with people I haven't met" },
    ]},
  { n: 12, section: 4, field: 'intent', kind: 'single',
    question: "Right now, you're mostly looking for…",
    options: [
      { code: 'my_people', label: 'More plans with people I know' },
      { code: 'new_people', label: 'Meeting new people' },
      { code: 'both', label: 'Both' },
    ]},
  { n: 13, section: 4, field: 'talk_style', kind: 'single',
    question: "In a group, you're usually…",
    options: [
      { code: 'talker', label: 'The one talking' },
      { code: 'listener', label: 'The one listening' },
      { code: 'depends', label: 'Depends on the group' },
    ]},
  { n: 14, section: 4, field: 'crew_seeds', kind: 'crewseeds', skippable: true,
    question: 'Who would you text first for a spontaneous plan?',
    helper: "Names or @handles — up to three. We'll help you connect on Drop." },
  { n: 15, section: 5, kind: 'compound',
    question: 'A couple details.',
    rows: [
      { field: 'radius', kind: 'single', label: 'How far would you go?',
        options: [
          { code: 'campus', label: 'Campus only' },
          { code: 'walkable', label: 'Walkable — Moody Street counts' },
          { code: 'short_ride', label: 'A short ride away' },
          { code: 'boston', label: 'Anywhere in Boston' },
        ]},
      { field: 'budget', kind: 'single', label: 'Typical budget per plan?',
        options: [
          { code: 'free', label: 'Free' },
          { code: 'under_10', label: 'Under $10' },
          { code: 'under_25', label: 'Under $25' },
          { code: 'flexible', label: 'Flexible' },
        ]},
    ]},
  { n: 16, section: 5, field: 'constraints', kind: 'multi-with-note', skippable: true,
    noteField: 'constraints_note',
    question: 'Anything we should factor into plans?',
    helper: 'Only used to route the right plans to you. Never shown to anyone.',
    options: [
      { code: 'dietary', label: 'Dietary needs' },
      { code: 'no_alcohol', label: "I don't drink" },
      { code: 'accessibility', label: 'Accessibility' },
      { code: 'none', label: 'All good' },
    ]},
  { n: 17, section: 5, field: 'host_interest', kind: 'single-reveal',
    question: 'Would you ever organize a plan yourself?',
    options: [
      { code: 'host', label: "I'd host" },
      { code: 'cohost', label: "I'd co-host with someone" },
      { code: 'spread', label: "I'd spread the word" },
      { code: 'join', label: "I'll just join" },
    ],
    revealOn: ['host', 'cohost'],
    revealField: 'host_pitch',
    revealLabel: 'What would you run?',
    revealSkippable: true,
  },
  { n: 18, section: 5, field: 'wildcard', kind: 'text', skippable: true,
    question: "What's one plan you wish had existed last weekend?" },
];

export const TOTAL_STEPS = STEPS.length;

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const SLOTS = [
  { code: 'afternoon', label: 'Afternoon' },
  { code: 'evening', label: 'Evening' },
  { code: 'late', label: 'Late night' },
] as const;

export function emptyAvailability(): Availability {
  const out: Availability = {};
  for (const d of DAYS) out[d] = {};
  return out;
}

// Fields that seed preferences on completion
export const PREF_FIELDS: (keyof IntakeAnswers)[] = [
  'plan_energy', 'intent', 'rings_joinable', 'categories', 'group_size',
  'availability', 'notice_threshold', 'ping_windows', 'ping_frequency',
  'radius', 'budget', 'constraints', 'constraints_note', 'host_interest', 'talk_style',
];
