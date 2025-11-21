/**
 * Packing List Templates and Enhancements
 * Extracted from the standalone packing list tool for reuse
 */

import type {
  PackingSection,
  PackingSectionId,
  PackingGroup,
  TimelinePhase,
  TimelinePhaseId,
  TimelineTask,
  TripPurpose,
  TripLength,
  ActivityId,
} from './types/packingList';

interface Enhancement {
  sectionId: PackingSectionId;
  group: PackingGroup;
  timeline?: Array<{ phaseId: TimelinePhaseId; tasks: TimelineTask[] }>;
}

export const PACKING_SECTIONS: PackingSection[] = [
  {
    id: "essentials",
    title: "Travel Essentials",
    emoji: "🧳",
    summary: "Documents, health items, and day-of travel basics.",
    groups: [
      {
        id: "documents",
        title: "Documents & Access",
        icon: "🛂",
        description: "Everything you need to get out the door.",
        items: [
          { id: "essentials-passport", name: "Passport / ID", tip: "Store with travel wallet for easy reach." },
          { id: "essentials-itinerary", name: "Itinerary + confirmations", description: "Addresses, reservation codes, and tickets." },
          { id: "essentials-wallet", name: "Wallet with cash & cards", tip: "Carry a backup card and some local currency." },
          { id: "essentials-insurance", name: "Insurance + emergency contacts", description: "Travel and medical information." },
        ],
      },
      {
        id: "daily",
        title: "Carry-on Daily Kit",
        icon: "👜",
        description: "Comfort and essentials for the journey itself.",
        items: [
          { id: "essentials-snacks", name: "Snacks & hydration", description: "Reusable bottle, protein snack, gum." },
          { id: "essentials-comfort", name: "Comfort items", tip: "Neck pillow, sleep mask, or cozy scarf." },
          { id: "essentials-health", name: "Health essentials", description: "Meds, supplements, motion sickness aids." },
        ],
      },
      {
        id: "home",
        title: "Home Prep",
        icon: "🏠",
        description: "Small tasks that make returning home easy.",
        items: [
          { id: "essentials-mail", name: "Mail + deliveries", description: "Pause or ask someone to collect." },
          { id: "essentials-smart", name: "Smart home & timers", tip: "Set schedules for lights and temperature." },
          { id: "essentials-errands", name: "Final errands", description: "Fuel car, trash out, run dishwasher." },
        ],
      },
    ],
  },
  {
    id: "clothing",
    title: "Clothing & Layers",
    emoji: "🧥",
    summary: "Build a flexible capsule wardrobe for the trip length.",
    groups: [
      {
        id: "wardrobe",
        title: "Core Wardrobe",
        icon: "👚",
        description: "Mix-and-match outfits for day to night.",
        items: [
          { id: "clothing-tops", name: "Tops", quantity: "4-6", tip: "Blend breathable and dressier options." },
          { id: "clothing-bottoms", name: "Bottoms", quantity: "2-3", description: "Casual + polished pairings." },
          { id: "clothing-dressy", name: "Elevated outfit", quantity: "1", tip: "Pack one piece that instantly dresses up." },
        ],
      },
      {
        id: "layers",
        title: "Layers & Weather",
        icon: "🧣",
        description: "Adapt to shifting temperatures and rain.",
        items: [
          { id: "clothing-outer", name: "Outer layer", description: "Jacket, blazer, or rain shell." },
          { id: "clothing-knit", name: "Mid-layer", tip: "Cardigan or sweater for cool evenings." },
          { id: "clothing-swim", name: "Swim or activewear", quantity: "1-2", description: "Pack a quick-dry towel if needed." },
        ],
      },
      {
        id: "foundations",
        title: "Foundations",
        icon: "🧦",
        description: "Underlayers that keep you comfortable each day.",
        items: [
          { id: "clothing-underwear", name: "Underwear", quantity: "trip length", tip: "Quick-dry fabric keeps laundry simple." },
          { id: "clothing-socks", name: "Socks", quantity: "3-5", description: "Include a cozy pair for downtime." },
          { id: "clothing-sleep", name: "Sleepwear", quantity: "1-2", description: "Select breathable fabrics." },
        ],
      },
    ],
  },
  {
    id: "personal",
    title: "Personal Care",
    emoji: "🧴",
    summary: "Toiletries, wellness, and day-to-day routines.",
    groups: [
      {
        id: "toiletries",
        title: "Toiletry Kit",
        icon: "🪥",
        description: "Mini versions of your daily routine.",
        items: [
          { id: "personal-toothbrush", name: "Toothbrush + paste", description: "Include floss and mouthwash tablets." },
          { id: "personal-skincare", name: "Skincare basics", tip: "Cleanser, moisturizer, SPF." },
          { id: "personal-hair", name: "Hair care essentials", description: "Brush/comb, styling tools, dry shampoo." },
        ],
      },
      {
        id: "wellness",
        title: "Wellness & Health",
        icon: "💊",
        description: "Keep energy steady on the road.",
        items: [
          { id: "personal-meds", name: "Medications & supplements", tip: "Pack a full supply + prescription copies." },
          { id: "personal-firstaid", name: "Mini first-aid kit", description: "Bandages, pain relief, motion sickness." },
          { id: "personal-relief", name: "Comfort boosts", description: "Electrolytes, herbal tea, travel humidifier." },
        ],
      },
    ],
  },
  {
    id: "tech",
    title: "Tech & Power",
    emoji: "🔌",
    summary: "Stay connected and powered up anywhere.",
    groups: [
      {
        id: "devices",
        title: "Devices",
        icon: "📱",
        description: "Core electronics for travel days and downtime.",
        items: [
          { id: "tech-phone", name: "Phone + charger", tip: "Add travel eSIM or offline maps." },
          { id: "tech-headphones", name: "Headphones", description: "Noise-cancelling or wired backup." },
          { id: "tech-entertainment", name: "Entertainment", description: "E-reader, tablet, or favorite book." },
        ],
      },
      {
        id: "power",
        title: "Power & Connectivity",
        icon: "🔋",
        description: "Adapters, cables, and portable power.",
        items: [
          { id: "tech-adapter", name: "Travel adapter", description: "Check plug type + voltage." },
          { id: "tech-powerbank", name: "Power bank", tip: "10,000 mAh keeps phones topped up." },
          { id: "tech-cables", name: "Charging cables", description: "Label and bundle in a pouch." },
        ],
      },
    ],
  },
  {
    id: "extras",
    title: "Comfort Extras",
    emoji: "🌟",
    summary: "Optional upgrades and personal touches.",
    groups: [
      {
        id: "comfort",
        title: "Transit Comfort",
        icon: "🪑",
        description: "Make long travel days easier.",
        items: [
          { id: "extras-blanket", name: "Lightweight blanket or wrap", description: "Doubles as a shawl." },
          { id: "extras-eye", name: "Sleep kit", tip: "Eye mask and earplugs." },
          { id: "extras-snacks", name: "Favorite treats", description: "Keep morale high with familiar snacks." },
        ],
      },
      {
        id: "personalization",
        title: "Personal Touches",
        icon: "🎁",
        description: "Make spaces feel like yours.",
        items: [
          { id: "extras-journal", name: "Notebook or journal", description: "Capture memories and plans." },
          { id: "extras-games", name: "Mini entertainment", description: "Card game, playlist, or downloaded shows." },
          { id: "extras-gifts", name: "Small gifts", tip: "Thank hosts or surprise companions." },
        ],
      },
    ],
  },
];

export const BASE_TIMELINE: TimelinePhase[] = [
  {
    id: "before",
    title: "Before departure",
    emoji: "⏳",
    summary: "Key steps leading up to your trip.",
    tasks: [
      { id: "timeline-documents", title: "Check documents + entry requirements", relativeTo: "start", daysOffset: -21 },
      { id: "timeline-packing", title: "Begin packing run", relativeTo: "start", daysOffset: -7 },
      { id: "timeline-house", title: "Prep home + errands", relativeTo: "start", daysOffset: -2 },
    ],
  },
  {
    id: "during",
    title: "During the trip",
    emoji: "🧭",
    summary: "Keep days smooth while you're away.",
    tasks: [
      { id: "timeline-reset", title: "Nightly reset", description: "Charge devices, repack day bag." },
      { id: "timeline-laundry", title: "Laundry check-in", relativeTo: "start", daysOffset: 4 },
    ],
  },
  {
    id: "return",
    title: "Heading home",
    emoji: "🏠",
    summary: "Wrap up the trip and glide back home.",
    tasks: [
      { id: "timeline-souvenirs", title: "Secure souvenirs", relativeTo: "end", daysOffset: -1 },
      { id: "timeline-reset-home", title: "Plan re-entry buffer", relativeTo: "end", daysOffset: 1 },
    ],
  },
];

export const PURPOSE_ENHANCEMENTS: Partial<Record<TripPurpose, Enhancement>> = {
  business: {
    sectionId: "clothing",
    group: {
      id: "business-attire",
      title: "Business-ready",
      icon: "💼",
      description: "Items that keep meetings sharp.",
      items: [
        { id: "business-outfits", name: "Professional outfits", quantity: "2-3", description: "Pack roll-free fabrics." },
        { id: "business-shoes", name: "Dress shoes", description: "Comfortable but polished." },
        { id: "business-badge", name: "Badges & presentation kit", tip: "USB stick, clicker, printed agenda." },
      ],
    },
    timeline: [
      {
        phaseId: "before",
        tasks: [
          { id: "timeline-slides", title: "Finalize slides & materials", relativeTo: "start", daysOffset: -3 },
        ],
      },
      {
        phaseId: "during",
        tasks: [
          { id: "timeline-network", title: "Review next-day meetings" },
        ],
      },
    ],
  },
  adventure: {
    sectionId: "extras",
    group: {
      id: "adventure-kit",
      title: "Adventure gear",
      icon: "🧗",
      description: "Stay safe outdoors.",
      items: [
        { id: "adventure-daypack", name: "Daypack essentials", description: "Dry bag, whistle, emergency contact card." },
        { id: "adventure-layers", name: "Technical layers", tip: "Moisture-wicking base layers." },
        { id: "adventure-repair", name: "Repair kit", description: "Multi-tool, duct tape, extra straps." },
      ],
    },
    timeline: [
      {
        phaseId: "before",
        tasks: [
          { id: "timeline-permits", title: "Confirm permits & trail conditions", relativeTo: "start", daysOffset: -5 },
        ],
      },
    ],
  },
  family: {
    sectionId: "essentials",
    group: {
      id: "family-items",
      title: "Family coordination",
      icon: "🧸",
      description: "Shared items and support for companions.",
      items: [
        { id: "family-docs", name: "Family documents", description: "Copies of IDs, consent letters." },
        { id: "family-kits", name: "Shared comfort kit", description: "Snacks, wipes, games." },
        { id: "family-meds", name: "Group health items", tip: "Dosages + instructions for everyone." },
      ],
    },
    timeline: [
      {
        phaseId: "during",
        tasks: [
          { id: "timeline-checkins", title: "Daily family check-in" },
        ],
      },
    ],
  },
};

export const ACTIVITY_ENHANCEMENTS: Record<ActivityId, Enhancement> = {
  beach: {
    sectionId: "extras",
    group: {
      id: "beach-bag",
      title: "Beach day kit",
      icon: "🌊",
      description: "Sun-safe extras for waterfront days.",
      items: [
        { id: "beach-sunscreen", name: "Reef-safe sunscreen", tip: "Bring travel + beach bag sizes." },
        { id: "beach-towel", name: "Quick-dry towel", description: "Sand shakes out easily." },
        { id: "beach-bag", name: "Beach bag essentials", description: "Waterproof pouch, after-sun care." },
      ],
    },
    timeline: [
      {
        phaseId: "before",
        tasks: [
          { id: "timeline-uv", title: "Check UV + tide forecast", relativeTo: "start", daysOffset: -2 },
        ],
      },
    ],
  },
  hiking: {
    sectionId: "personal",
    group: {
      id: "hiking-safety",
      title: "Trail safety",
      icon: "🥾",
      description: "Gear for long hikes or day treks.",
      items: [
        { id: "hiking-footwear", name: "Hiking footwear", description: "Break in boots before the trip." },
        { id: "hiking-hydration", name: "Hydration pack", quantity: "2-3L", tip: "Add electrolyte tablets." },
        { id: "hiking-navigation", name: "Navigation tools", description: "Offline maps, compass, trail guide." },
      ],
    },
    timeline: [
      {
        phaseId: "during",
        tasks: [
          { id: "timeline-gear-check", title: "Gear check before hikes" },
        ],
      },
    ],
  },
  city: {
    sectionId: "tech",
    group: {
      id: "city-kit",
      title: "City day kit",
      icon: "🚶",
      description: "Stay nimble while exploring.",
      items: [
        { id: "city-pass", name: "Transit or museum passes", description: "Preload apps or cards." },
        { id: "city-bag", name: "Day bag", tip: "Crossbody or anti-theft backpack." },
        { id: "city-umbrella", name: "Compact umbrella", description: "Or lightweight rain shell." },
      ],
    },
    timeline: [
      {
        phaseId: "before",
        tasks: [
          { id: "timeline-reservations", title: "Book tickets & dining", relativeTo: "start", daysOffset: -10 },
        ],
      },
    ],
  },
  formal: {
    sectionId: "clothing",
    group: {
      id: "formal-attire",
      title: "Formal moments",
      icon: "🎩",
      description: "Dress codes and polished details.",
      items: [
        { id: "formal-outfit", name: "Formal outfit", quantity: "1", description: "Suit, dress, or attire needed." },
        { id: "formal-accessories", name: "Accessories", description: "Shoes, jewelry, cufflinks, hosiery." },
        { id: "formal-care", name: "Garment care", tip: "Travel steamer, lint roller, stain pen." },
      ],
    },
    timeline: [
      {
        phaseId: "before",
        tasks: [
          { id: "timeline-tailor", title: "Confirm alterations or rentals", relativeTo: "start", daysOffset: -14 },
        ],
      },
    ],
  },
};

export const TRIP_LENGTH_ENHANCEMENTS: Record<TripLength, Enhancement[]> = {
  weekend: [],
  "one-week": [],
  "two-week": [
    {
      sectionId: "clothing",
      group: {
        id: "two-week-rotation",
        title: "Two-week rotation",
        icon: "🧳",
        description: "Build a laundry-friendly capsule for a longer stay.",
        items: [
          { id: "two-week-tops", name: "7-8 versatile tops", quantity: "7-8", tip: "Mix breathable layers for varied climates." },
          { id: "two-week-bottoms", name: "3 bottoms", quantity: "3", description: "2 casual options plus one polished pair." },
          { id: "two-week-dressy", name: "2 dressier outfits", quantity: "2", tip: "Choose wrinkle-resistant pieces." },
          { id: "two-week-sleepwear", name: "2 sets of sleepwear", quantity: "2", description: "Pack quick-dry fabrics." },
        ],
      },
      timeline: [
        {
          phaseId: "before",
          tasks: [
            { id: "timeline-two-week-laundry-plan", title: "Plan mid-trip laundry options", relativeTo: "start", daysOffset: -5 },
          ],
        },
        {
          phaseId: "during",
          tasks: [
            { id: "timeline-two-week-refresh", title: "Schedule wardrobe refresh", description: "Book laundry or plan a reset day mid-trip.", relativeTo: "start", daysOffset: 6 },
          ],
        },
      ],
    },
    {
      sectionId: "personal",
      group: {
        id: "two-week-care",
        title: "Extended stay care",
        icon: "🧼",
        description: "Keep routines steady for longer adventures.",
        items: [
          { id: "two-week-laundry-kit", name: "Travel laundry kit", description: "Detergent sheets, sink stopper, clothesline." },
          { id: "two-week-meds", name: "Prescription meds (full supply)", description: "Pack copies of prescriptions." },
        ],
      },
    },
  ],
};
