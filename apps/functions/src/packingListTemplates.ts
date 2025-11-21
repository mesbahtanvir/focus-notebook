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
        id: "pre-trip-research",
        title: "Pre-Trip Research & Planning",
        icon: "🔍",
        description: "Research and planning before you go.",
        items: [
          { id: "essentials-destination-research", name: "Research destination", description: "Weather forecast, culture, local customs, language basics." },
          { id: "essentials-bookings", name: "Book flights, accommodation, and local transport", tip: "Save confirmations in multiple places." },
          { id: "essentials-lounges", name: "Research airport lounges", description: "Check lounge access, location, and perks available to you." },
          { id: "essentials-offline-maps", name: "Download offline maps & key phrases", tip: "Google Maps offline + local language basics in notes." },
          { id: "essentials-visa-check", name: "Check visa requirements and travel advisories", description: "Government travel sites for entry requirements." },
          { id: "essentials-save-locations", name: "Save hotel and key locations in Google Maps", tip: "Mark offline for easy access without internet." },
        ],
      },
      {
        id: "documents",
        title: "Documents & Access",
        icon: "🛂",
        description: "Everything you need to get out the door.",
        items: [
          { id: "essentials-passport", name: "Passport / ID", tip: "Store with travel wallet for easy reach." },
          { id: "essentials-driving-license", name: "Driving license", description: "Required for car rentals and additional ID." },
          { id: "essentials-visa", name: "Visa (if required)", description: "Check validity and required documents." },
          { id: "essentials-itinerary", name: "Itinerary + confirmations", description: "Addresses, reservation codes, and tickets." },
          { id: "essentials-insurance", name: "Travel insurance info", description: "Policy number, emergency contacts, coverage details." },
          { id: "essentials-doc-copies", name: "Photocopy or scan key documents", tip: "Email yourself copies of passport, ID, bookings." },
        ],
      },
      {
        id: "money-financial",
        title: "Money & Financial Prep",
        icon: "💳",
        description: "Currency and payment preparation.",
        items: [
          { id: "essentials-credit-cards", name: "Credit cards", tip: "Primary card plus backup card stored separately." },
          { id: "essentials-local-currency", name: "Get local currency from bank", description: "Visit TD Bank or exchange service for cash." },
          { id: "essentials-notify-cards", name: "Notify credit card companies", tip: "Inform banks of international travel dates to avoid blocks." },
          { id: "essentials-no-fee-cards", name: "Pack cards with no foreign transaction fees", description: "Select travel-friendly credit cards." },
          { id: "essentials-split-cash", name: "Split cash into multiple bags", tip: "Distribute money across wallet, luggage, and day bag for safety." },
        ],
      },
      {
        id: "daily",
        title: "Carry-on Daily Kit",
        icon: "👜",
        description: "Comfort and essentials for the journey itself.",
        items: [
          { id: "essentials-keys", name: "Keys", description: "House keys and any other essential keys." },
          { id: "essentials-snacks", name: "Snacks & hydration", description: "Reusable bottle, protein snack, gum." },
          { id: "essentials-comfort", name: "Comfort items", tip: "Neck pillow, sleep mask, or cozy scarf." },
          { id: "essentials-health", name: "Health essentials", description: "Meds, supplements, motion sickness aids." },
          { id: "essentials-day-bag", name: "Day bag essentials", description: "Water bottle, snacks, sunglasses, and quick-access items." },
          { id: "essentials-carry-on-clothes", name: "One change of clothes in carry-on", tip: "Pack a spare outfit in case checked luggage is delayed." },
          { id: "essentials-pen", name: "Pen for immigration forms", description: "Carry a pen for filling out arrival/customs forms." },
        ],
      },
      {
        id: "home",
        title: "Home Prep",
        icon: "🏠",
        description: "Secure and prepare your home before departure.",
        items: [
          { id: "essentials-trash", name: "Get rid of all trash", description: "Empty all waste bins and take out garbage." },
          { id: "essentials-fridge", name: "Clean out the fridge", tip: "Remove perishables to avoid spoilage while away." },
          { id: "essentials-unplug", name: "Unplug appliances & adjust thermostat/AC", description: "Save energy by unplugging non-essential devices." },
          { id: "essentials-locks", name: "Lock windows & doors", tip: "Double-check all entry points are secured." },
          { id: "essentials-blinds", name: "Partially close blinds", description: "Give appearance of occupancy without blocking all light." },
          { id: "essentials-plants", name: "Water plants or arrange care", tip: "Set up self-watering system or ask neighbor for help." },
          { id: "essentials-mail", name: "Pause mail or deliveries", description: "Hold mail or ask someone to collect." },
          { id: "essentials-spare-key", name: "Leave spare key with trusted person", tip: "For emergencies or pet/plant care." },
          { id: "essentials-smart", name: "Smart home & timers", tip: "Set schedules for lights and temperature." },
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
        title: "Core Wardrobe (7+ days)",
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
          { id: "clothing-swim", name: "Swimwear", quantity: "1-2", description: "Pack a quick-dry towel if needed." },
        ],
      },
      {
        id: "footwear",
        title: "Footwear",
        icon: "👟",
        description: "Comfortable shoes for all activities.",
        items: [
          { id: "clothing-white-sneakers", name: "White sneakers (daily wear)", tip: "Versatile and comfortable for everyday activities." },
          { id: "clothing-sandals", name: "Sandals / Beach shoes", description: "For beach, pool, or relaxing." },
          { id: "clothing-hiking-shoes", name: "Lightweight hiking or walking shoes", tip: "Break in before trip to avoid blisters." },
        ],
      },
      {
        id: "foundations",
        title: "Foundations",
        icon: "🧦",
        description: "Underlayers that keep you comfortable each day.",
        items: [
          { id: "clothing-underwear", name: "Underwear", quantity: "7+ days", tip: "Quick-dry fabric keeps laundry simple." },
          { id: "clothing-socks", name: "Socks", quantity: "3-5 pairs", description: "Include a cozy pair for downtime." },
          { id: "clothing-sleep", name: "Sleepwear", quantity: "1-2 sets", description: "Select breathable fabrics." },
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
        title: "Toiletry Kit (Travel-Size)",
        icon: "🪥",
        description: "Mini versions of your daily routine.",
        items: [
          { id: "personal-toothbrush", name: "Toothbrush + paste", description: "Include floss and mouthwash tablets." },
          { id: "personal-razor", name: "Razor & trimmer", tip: "Pack with protective cover for safety." },
          { id: "personal-skincare", name: "Skincare basics", tip: "Cleanser, moisturizer, SPF." },
          { id: "personal-hair", name: "Hair care essentials", description: "Brush/comb, styling tools, dry shampoo." },
          { id: "personal-hair-gel", name: "Hair cream / gel", description: "Travel-size styling product." },
          { id: "personal-shower", name: "Shower essentials", description: "Travel-size shampoo, conditioner, body wash." },
          { id: "personal-deodorant", name: "Deodorant", tip: "TSA-compliant size for carry-on." },
          { id: "personal-perfume", name: "Perfume", description: "Small travel atomizer or solid perfume." },
          { id: "personal-lip-balm", name: "Lip balm", tip: "With SPF protection for sun exposure." },
        ],
      },
      {
        id: "wellness",
        title: "Wellness & Health",
        icon: "💊",
        description: "Keep energy steady on the road.",
        items: [
          { id: "personal-meds", name: "Medications & supplements", tip: "Pack a full supply + prescription copies." },
          { id: "personal-firstaid", name: "Mini first-aid kit", description: "Bandages, pain relief, motion sickness aids." },
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
        id: "digital-prep",
        title: "Digital Readiness",
        icon: "📲",
        description: "Prepare your digital life before departure.",
        items: [
          { id: "tech-apps", name: "Download airline & transport apps", description: "Install apps for flights, hotels, and local transport." },
          { id: "tech-roaming", name: "Enable international roaming or set up eSIM/local SIM", tip: "Check with carrier or purchase travel eSIM." },
          { id: "tech-backups", name: "Back up phone and laptop", description: "Cloud backup or local backup before departure." },
          { id: "tech-2fa", name: "Enable 2FA backup codes", tip: "Save backup codes offline in case you lose phone access." },
          { id: "tech-screenshots", name: "Take screenshots of critical info", description: "Tickets, addresses, confirmation numbers, QR codes." },
          { id: "tech-vpn", name: "Set up VPN", description: "Install VPN for countries with restricted internet access." },
        ],
      },
      {
        id: "devices",
        title: "Devices",
        icon: "📱",
        description: "Core electronics for travel days and downtime.",
        items: [
          { id: "tech-phone", name: "Phone + charger", tip: "Add travel eSIM or offline maps." },
          { id: "tech-laptop", name: "Laptop + charger", description: "For work or entertainment during downtime." },
          { id: "tech-headphones", name: "Headphones", description: "Noise-cancelling or wired backup." },
          { id: "tech-usb-drive", name: "USB flash drive", tip: "For quick file transfers and backups." },
          { id: "tech-watch", name: "Watch", description: "For timekeeping and fitness tracking." },
          { id: "tech-entertainment", name: "Entertainment", description: "E-reader, tablet, or favorite book." },
        ],
      },
      {
        id: "power",
        title: "Power & Connectivity",
        icon: "🔋",
        description: "Adapters, cables, and portable power.",
        items: [
          { id: "tech-adapter", name: "Universal travel adapter", description: "Check plug type + voltage for destination." },
          { id: "tech-powerbank", name: "Power bank", tip: "10,000+ mAh keeps phones topped up on long days." },
          { id: "tech-cables", name: "Charging cables", description: "Label and bundle in a pouch for organization." },
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
          { id: "extras-flight-clothes", name: "Comfortable, layered flight clothes", tip: "Dress in layers for temperature changes on plane." },
          { id: "extras-sunglasses", name: "Sunglasses", description: "Protect eyes from sun during outdoor activities." },
          { id: "extras-ziplock-bags", name: "Ziplock bags", tip: "For organizing electronics, wet clothes, and toiletries." },
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
      {
        id: "culture-tips",
        title: "Cultural Prep & Pro Tips",
        icon: "🌍",
        description: "Smart preparation for international travel.",
        items: [
          { id: "extras-tipping", name: "Check tipping etiquette", description: "Research local customs for tipping and gratuity." },
          { id: "extras-phrases", name: "Learn 3-5 local phrases", tip: "Hello, thank you, help, no, excuse me in local language." },
          { id: "extras-flight-alerts", name: "Set up flight alerts", description: "Use TripIt, FlightAware, or airline app for updates." },
        ],
      },
      {
        id: "fitness",
        title: "Fitness & Wellness",
        icon: "💪",
        description: "Stay active and healthy during your trip.",
        items: [
          { id: "extras-gym-strap", name: "Gym strap / resistance band", description: "Portable workout equipment for quick exercises." },
          { id: "extras-workout-clothes", name: "Workout clothes", tip: "Quick-dry athletic wear if planning to exercise." },
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
      { id: "timeline-research", title: "Research destination (weather, culture, customs)", description: "Check weather forecast, local customs, cultural norms, and basic phrases.", relativeTo: "start", daysOffset: -21 },
      { id: "timeline-documents", title: "Check documents + entry requirements", description: "Verify passport validity (6+ months), visa requirements, travel advisories.", relativeTo: "start", daysOffset: -21 },
      { id: "timeline-bookings", title: "Book flights, accommodation, and local transport", description: "Confirm all reservations and save confirmation codes.", relativeTo: "start", daysOffset: -14 },
      { id: "timeline-airport-lounges", title: "Research airport lounges", description: "Check lounge access, location, and perks.", relativeTo: "start", daysOffset: -10 },
      { id: "timeline-packing-start", title: "Begin packing run", description: "Start laying out items and checking supplies.", relativeTo: "start", daysOffset: -7 },
      { id: "timeline-digital-prep", title: "Digital preparation", description: "Download apps, offline maps, set up eSIM/roaming, backup devices, enable 2FA codes.", relativeTo: "start", daysOffset: -5 },
      { id: "timeline-save-locations", title: "Save key locations offline", description: "Download Google Maps offline areas and save hotel/attraction addresses.", relativeTo: "start", daysOffset: -5 },
      { id: "timeline-currency", title: "Get local currency from bank", description: "Visit TD Bank or exchange service for cash.", relativeTo: "start", daysOffset: -3 },
      { id: "timeline-notify-cards", title: "Notify credit card companies of travel", description: "Inform banks of travel dates and destinations to avoid card blocks.", relativeTo: "start", daysOffset: -3 },
      { id: "timeline-home-prep-start", title: "Start home preparation", description: "Begin planning home security, plant care, mail hold.", relativeTo: "start", daysOffset: -2 },
      { id: "timeline-final-packing", title: "Final packing", description: "Complete packing, verify all items on list.", relativeTo: "start", daysOffset: -1 },
      { id: "timeline-home-final", title: "Final home prep", description: "Clean fridge, take out trash, unplug appliances, lock doors/windows, set thermostat, close blinds, water plants.", relativeTo: "start", daysOffset: 0 },
      { id: "timeline-screenshots", title: "Take screenshots of critical info", description: "Save tickets, addresses, QR codes, confirmation numbers offline.", relativeTo: "start", daysOffset: 0 },
    ],
  },
  {
    id: "during",
    title: "During the trip",
    emoji: "🧭",
    summary: "Keep days smooth while you're away.",
    tasks: [
      { id: "timeline-reset", title: "Nightly reset", description: "Charge devices, repack day bag, review next day's plans." },
      { id: "timeline-laundry", title: "Laundry check-in", description: "Wash clothes or plan laundry service.", relativeTo: "start", daysOffset: 4 },
      { id: "timeline-stay-hydrated", title: "Stay hydrated & rested", description: "Drink water, get adequate sleep, take breaks." },
    ],
  },
  {
    id: "return",
    title: "Heading home",
    emoji: "🏠",
    summary: "Wrap up the trip and glide back home.",
    tasks: [
      { id: "timeline-souvenirs", title: "Secure souvenirs", description: "Pack gifts and mementos safely for return.", relativeTo: "end", daysOffset: -1 },
      { id: "timeline-final-check", title: "Final accommodation check", description: "Check all drawers, closets, bathrooms for belongings.", relativeTo: "end", daysOffset: 0 },
      { id: "timeline-reset-home", title: "Plan re-entry buffer", description: "Schedule recovery day, unpack, do laundry.", relativeTo: "end", daysOffset: 1 },
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
  "one-week": [
    {
      sectionId: "clothing",
      group: {
        id: "one-week-wardrobe",
        title: "One-Week Wardrobe Essentials",
        icon: "🧳",
        description: "Complete wardrobe for 7-10 days of travel.",
        items: [
          { id: "one-week-underwear", name: "Underwear for 7+ days", quantity: "7+", tip: "Quick-dry fabric allows for easy sink washing if needed." },
          { id: "one-week-socks", name: "Socks for trip length", quantity: "5-7 pairs", description: "Include athletic and casual options." },
          { id: "one-week-sleepwear", name: "Sleepwear", quantity: "2 sets", tip: "Breathable fabrics for comfort." },
        ],
      },
      timeline: [
        {
          phaseId: "before",
          tasks: [
            { id: "timeline-one-week-weather-check", title: "Check week-long weather forecast", description: "Review extended forecast to pack appropriate layers.", relativeTo: "start", daysOffset: -7 },
            { id: "timeline-one-week-laundry-options", title: "Research laundry options at destination", description: "Check if hotel/accommodation has laundry service or facilities.", relativeTo: "start", daysOffset: -5 },
          ],
        },
      ],
    },
  ],
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
