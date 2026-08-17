// Blip configuration model (spec section 6). Four areas: Behavior, Logic,
// Knowledge, Learning. Learning holds no config — it is corrections and replay.
//
// Everything in here is data. The compiler turns it into prompt bytes and the
// gate reads the same fields, so the two cannot disagree (spec 6.1).

export type ApprovedAnswer = { id: string; q: string; a: string };

export type VerticalQuestion = { q: string; tag: string };

export type BlipConfig = {
  behavior: {
    maxSentences: number;
    mirroring: boolean;
    lowercaseOpenings: boolean;
    noEmDash: boolean;
    noEmoji: boolean;
    noExclamation: boolean;
    bannedWords: string[];
  };
  logic: {
    stallNudges: number;
    escalateUnknown: boolean;
    /** Hard limit. Cannot be turned off from the console. */
    stopOnCallRequest: true;
    tagsEnabled: Record<string, boolean>;
    verticalQuestions: Record<string, { label: string; questions: VerticalQuestion[] }>;
  };
  knowledge: {
    approved: ApprovedAnswer[];
    scopeOut: string[];
  };
};

export type BlipArea = "behavior" | "logic" | "knowledge" | "learning";

export const BLIP_AREA_META: Record<BlipArea, [string, string]> = {
  behavior: ["Behavior", "How Blip talks."],
  logic: ["Logic", "What Blip does next."],
  knowledge: ["Knowledge", "What Blip may say."],
  learning: ["Learning", "How Blip gets better."],
};

/** Tag -> tier floor is owned by the pricing ruleset, read only inside Blip. */
export const CAPABILITY_TAGS: Array<[string, string]> = [
  ["missed_calls", "Connected"],
  ["no_shows", "Connected"],
  ["slow_follow_up", "Presence"],
  ["deposits_payments", "Connected"],
  ["intake_forms", "Connected"],
  ["review_requests", "Connected"],
  ["multi_location_routing", "Operations"],
  ["dedicated_line", "Operations"],
  ["rebooking_recalls", "Operations"],
];

/** The Tag struggles call may only ever emit values from this enum (spec 2.3). */
export const TAG_ENUM = [...CAPABILITY_TAGS.map(([tag]) => tag), "after_hours", "unclear"];

export const SIX_LIMITS = [
  "Never states a price, a range, or a discount",
  "Never approves or sends a plan",
  "Never promises a capability outside the catalog",
  "Stops asking once a call is requested",
  "Never sends twice without a reply",
  "Never sends to a number that opted out",
];

/** Plain-language correction labels (spec 8.3). */
export const TEACH_OPTIONS: Array<[string, string, string]> = [
  ["behavior", "Wrong words", "It said it badly"],
  ["logic", "Wrong move", "It did the wrong thing next"],
  ["knowledge", "Wrong facts", "It did not know something"],
  ["example", "Just better", "Nothing broke a rule"],
  ["none", "One off", "Do not generalise this"],
];

export const DEFAULT_BLIP_CONFIG: BlipConfig = {
  behavior: {
    maxSentences: 3,
    mirroring: true,
    lowercaseOpenings: true,
    noEmDash: true,
    noEmoji: true,
    noExclamation: true,
    bannedWords: [
      "great",
      "perfect",
      "awesome",
      "absolutely",
      "certainly",
      "I understand",
      "thanks for sharing",
      "that makes sense",
      "happy to help",
      "streamline",
      "optimize",
      "solution",
      "seamless",
      "leverage",
      "utilize",
      "reach out",
      "circle back",
      "touch base",
    ],
  },
  logic: {
    stallNudges: 2,
    escalateUnknown: true,
    stopOnCallRequest: true,
    tagsEnabled: {
      missed_calls: true,
      no_shows: true,
      slow_follow_up: true,
      deposits_payments: true,
      intake_forms: true,
      review_requests: true,
      multi_location_routing: true,
      dedicated_line: true,
      rebooking_recalls: true,
    },
    verticalQuestions: {
      barbershop: {
        label: "Barbershops and salons",
        questions: [
          { q: "how many calls do you miss in a week, roughly", tag: "missed_calls" },
          { q: "do people no show, and how often", tag: "no_shows" },
          { q: "do you take a deposit up front or charge after", tag: "deposits_payments" },
          { q: "what happens to a call that comes in after you close", tag: "after_hours" },
        ],
      },
      clinic: {
        label: "Clinics and dental",
        questions: [
          { q: "how many new patient calls go to voicemail", tag: "missed_calls" },
          { q: "do people no show, and how often", tag: "no_shows" },
          { q: "do you collect anything before the visit", tag: "intake_forms" },
          { q: "do you bring people back on a schedule", tag: "rebooking_recalls" },
        ],
      },
      home_services: {
        label: "Home services",
        questions: [
          { q: "how many calls do you miss while on a job", tag: "missed_calls" },
          { q: "do you take a deposit before you book the work", tag: "deposits_payments" },
          { q: "what happens to a call that comes in after hours", tag: "after_hours" },
          { q: "do you run more than one crew", tag: "multi_location_routing" },
        ],
      },
      restaurant: {
        label: "Restaurants and food",
        questions: [
          { q: "how many calls do you miss during service", tag: "missed_calls" },
          { q: "do you take reservations or deposits", tag: "deposits_payments" },
          { q: "what happens to a call after you close", tag: "after_hours" },
          { q: "do you ask people for a review", tag: "review_requests" },
        ],
      },
      dealership: {
        label: "Dealerships and auto",
        questions: [
          { q: "how many inquiries never get a reply", tag: "slow_follow_up" },
          { q: "do you take a deposit to hold something", tag: "deposits_payments" },
          { q: "do you run more than one lot", tag: "multi_location_routing" },
          { q: "what happens to a lead that comes in overnight", tag: "after_hours" },
        ],
      },
    },
  },
  knowledge: {
    approved: [
      { id: "k1", q: "who is this", a: "this is alyx, i own alyxlab" },
      {
        id: "k2",
        q: "what does it cost",
        a: "depends on how many people you have and what you need it to do. anything i said right now would be a guess",
      },
      { id: "k3", q: "how fast can you start", a: "usually a week once we talk" },
    ],
    scopeOut: [
      "Written marketing campaigns",
      "Bulk promotional SMS",
      "Guaranteed SEO rankings",
      "Social media management",
      "Ad spend management",
      "Human phone answering",
    ],
  },
};

export const AUTONOMY_LEVELS: Array<[string, string]> = [
  ["draft", "Draft only"],
  ["assisted", "Assisted"],
  ["live", "Live"],
];
