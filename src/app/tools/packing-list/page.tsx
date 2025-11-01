"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ToolHeader,
  SearchAndFilters,
  ToolPageLayout,
  ToolCard,
  ToolInfoSection,
  toolThemes,
} from "@/components/tools";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import {
  Calendar,
  CheckCircle2,
  Circle,
  MapPin,
  Plane,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import clsx from "clsx";

const PACKED_STORAGE_KEY = "packing-list-packed-items";
const CUSTOM_STORAGE_KEY = "packing-list-custom-items";
const TRIP_STORAGE_KEY = "packing-list-trip-details";
const TIMELINE_STORAGE_KEY = "packing-list-timeline";

const SECTION_IDS = ["essentials", "clothing", "personal", "tech", "extras"] as const;

type PackingSectionId = (typeof SECTION_IDS)[number];

type PackingItem = {
  id: string;
  name: string;
  quantity?: string;
  description?: string;
  tip?: string;
  custom?: boolean;
};

type PackingGroup = {
  id: string;
  title: string;
  icon?: string;
  description?: string;
  items: PackingItem[];
};

type PackingSection = {
  id: PackingSectionId;
  title: string;
  emoji: string;
  summary: string;
  groups: PackingGroup[];
};

type CustomItemsState = Record<PackingSectionId, PackingItem[]>;

type TripPurpose = "leisure" | "business" | "adventure" | "family";

type ActivityId = "beach" | "hiking" | "city" | "formal";

type TripDetails = {
  destination: string;
  startDate: string;
  endDate: string;
  purpose: TripPurpose;
  companions: string;
  accommodations: string;
  activities: ActivityId[];
  notes: string;
};

type TimelinePhaseId = "before" | "during" | "return";

type TimelineTask = {
  id: string;
  title: string;
  description?: string;
  relativeTo?: "start" | "end";
  daysOffset?: number;
};

type TimelinePhase = {
  id: TimelinePhaseId;
  title: string;
  emoji: string;
  summary: string;
  tasks: TimelineTask[];
};

type Enhancement = {
  sectionId: PackingSectionId;
  group: PackingGroup;
  timeline?: { phaseId: TimelinePhaseId; tasks: TimelineTask[] }[];
};

type CustomDraft = {
  name: string;
  quantity: string;
  notes: string;
};

const DEFAULT_TRIP: TripDetails = {
  destination: "",
  startDate: "",
  endDate: "",
  purpose: "leisure",
  companions: "",
  accommodations: "",
  activities: [],
  notes: "",
};

const PURPOSE_OPTIONS: { value: TripPurpose; label: string }[] = [
  { value: "leisure", label: "Leisure getaway" },
  { value: "business", label: "Business travel" },
  { value: "adventure", label: "Adventure trip" },
  { value: "family", label: "Family time" },
];

const ACTIVITY_OPTIONS: { id: ActivityId; label: string; description: string; icon: string }[] = [
  { id: "beach", label: "Beach & pool", description: "Swimming, sun, and sand", icon: "🏖️" },
  { id: "hiking", label: "Hiking", description: "Trail days or outdoor adventures", icon: "🥾" },
  { id: "city", label: "City exploring", description: "Museums, food tours, long walks", icon: "🏙️" },
  { id: "formal", label: "Formal moments", description: "Weddings, galas, or business dinners", icon: "🎩" },
];

const PACKING_SECTIONS: PackingSection[] = [
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

const BASE_TIMELINE: TimelinePhase[] = [
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

const PURPOSE_ENHANCEMENTS: Partial<Record<TripPurpose, Enhancement>> = {
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

const ACTIVITY_ENHANCEMENTS: Record<ActivityId, Enhancement> = {
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

function createEmptyCustomItems(): CustomItemsState {
  return {
    essentials: [],
    clothing: [],
    personal: [],
    tech: [],
    extras: [],
  };
}

function createEmptyDrafts(): Record<PackingSectionId, CustomDraft> {
  return {
    essentials: { name: "", quantity: "", notes: "" },
    clothing: { name: "", quantity: "", notes: "" },
    personal: { name: "", quantity: "", notes: "" },
    tech: { name: "", quantity: "", notes: "" },
    extras: { name: "", quantity: "", notes: "" },
  };
}

function readStorage(key: string): unknown {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : undefined;
  } catch (error) {
    console.error(`Failed to read ${key} from storage`, error);
    return undefined;
  }
}

function writeStorage(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write ${key} to storage`, error);
  }
}

function sanitizePackedItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(String).filter(Boolean);
}

function sanitizeCustomItems(value: unknown): CustomItemsState {
  const empty = createEmptyCustomItems();

  if (!value || typeof value !== "object") {
    return empty;
  }

  const raw = value as Record<string, unknown>;
  const result = {} as CustomItemsState;

  SECTION_IDS.forEach((sectionId) => {
    const maybeItems = raw[sectionId];

    if (!Array.isArray(maybeItems)) {
      result[sectionId] = [];
      return;
    }

    result[sectionId] = maybeItems
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : `custom-${sectionId}-${Math.random().toString(36).slice(2)}`,
        name: typeof item.name === "string" ? item.name : "Untitled item",
        quantity: typeof item.quantity === "string" && item.quantity ? item.quantity : undefined,
        description: typeof item.description === "string" && item.description ? item.description : undefined,
        tip: typeof item.tip === "string" && item.tip ? item.tip : undefined,
        custom: true,
      }));
  });

  return result;
}

function sanitizeTripDetails(value: unknown): TripDetails {
  if (!value || typeof value !== "object") {
    return DEFAULT_TRIP;
  }

  const raw = value as Record<string, unknown>;

  const activitiesRaw = Array.isArray(raw.activities) ? raw.activities : [];
  const activities = activitiesRaw
    .map((entry) => (typeof entry === "string" ? entry : ""))
    .filter((entry): entry is ActivityId => ACTIVITY_OPTIONS.some((option) => option.id === entry));

  return {
    destination: typeof raw.destination === "string" ? raw.destination : "",
    startDate: typeof raw.startDate === "string" ? raw.startDate : "",
    endDate: typeof raw.endDate === "string" ? raw.endDate : "",
    purpose: PURPOSE_OPTIONS.some((option) => option.value === raw.purpose)
      ? (raw.purpose as TripPurpose)
      : "leisure",
    companions: typeof raw.companions === "string" ? raw.companions : "",
    accommodations: typeof raw.accommodations === "string" ? raw.accommodations : "",
    activities,
    notes: typeof raw.notes === "string" ? raw.notes : "",
  };
}

function cloneGroup(group: PackingGroup): PackingGroup {
  return {
    ...group,
    items: group.items.map((item) => ({ ...item })),
  };
}

function cloneSection(section: PackingSection): PackingSection {
  return {
    ...section,
    groups: section.groups.map(cloneGroup),
  };
}

function clonePhase(phase: TimelinePhase): TimelinePhase {
  return {
    ...phase,
    tasks: phase.tasks.map((task) => ({ ...task })),
  };
}

function addGroupToSection(section: PackingSection | undefined, group: PackingGroup) {
  if (!section) {
    return;
  }

  const existingGroup = section.groups.find((current) => current.id === group.id);

  if (existingGroup) {
    group.items.forEach((item) => {
      if (!existingGroup.items.some((existingItem) => existingItem.id === item.id)) {
        existingGroup.items.push({ ...item });
      }
    });
    return;
  }

  section.groups.push(cloneGroup(group));
}

function applyEnhancement(
  sectionMap: Map<PackingSectionId, PackingSection> | null,
  timelineMap: Map<TimelinePhaseId, TimelinePhase> | null,
  enhancement: Enhancement | undefined,
) {
  if (!enhancement) {
    return;
  }

  if (sectionMap) {
    const section = sectionMap.get(enhancement.sectionId);
    addGroupToSection(section, enhancement.group);
  }

  if (timelineMap) {
    enhancement.timeline?.forEach(({ phaseId, tasks }) => {
      const phase = timelineMap.get(phaseId);
      if (!phase) {
        return;
      }

      tasks.forEach((task) => {
        if (!phase.tasks.some((existing) => existing.id === task.id)) {
          phase.tasks.push({ ...task });
        }
      });
    });
  }
}

function buildPackingSections({
  searchQuery,
  tripDetails,
  customItems,
  packedItemIds,
}: {
  searchQuery: string;
  tripDetails: TripDetails;
  customItems: CustomItemsState;
  packedItemIds: Set<string>;
}): { sections: PackingSection[]; totalItems: number; packedItems: number } {
  const search = searchQuery.trim().toLowerCase();

  const sectionMap = new Map<PackingSectionId, PackingSection>(
    PACKING_SECTIONS.map((section) => [section.id, cloneSection(section)]),
  );

  applyEnhancement(sectionMap, null, PURPOSE_ENHANCEMENTS[tripDetails.purpose]);
  tripDetails.activities.forEach((activity) => {
    applyEnhancement(sectionMap, null, ACTIVITY_ENHANCEMENTS[activity]);
  });

  const sectionsWithCustom = Array.from(sectionMap.values()).map((section) => {
    const custom = customItems[section.id];

    if (custom && custom.length > 0) {
      addGroupToSection(section, {
        id: `custom-${section.id}`,
        title: "Custom additions",
        icon: "✨",
        description: "Made just for this trip.",
        items: custom.map((item) => ({ ...item, custom: true })),
      });
    }

    return section;
  });

  let totalItems = 0;
  let packedItems = 0;

  const filteredSections = sectionsWithCustom
    .map((section) => {
      const groups = section.groups
        .map((group) => {
          const items = group.items.filter((item) => {
            if (!search) {
              return true;
            }

            const haystack = [item.name, item.description, item.tip]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return haystack.includes(search);
          });

          if (items.length === 0) {
            return null;
          }

          totalItems += items.length;
          packedItems += items.filter((item) => packedItemIds.has(item.id)).length;

          return {
            ...group,
            items,
          };
        })
        .filter((group): group is PackingGroup => Boolean(group));

      return {
        ...section,
        groups,
      };
    })
    .filter((section) => section.groups.length > 0);

  return { sections: filteredSections, totalItems, packedItems };
}

function buildTimeline({
  tripDetails,
  completedTaskIds,
}: {
  tripDetails: TripDetails;
  completedTaskIds: Set<string>;
}): { phases: TimelinePhase[]; totalTasks: number; completedTasks: number } {
  const timelineMap = new Map<TimelinePhaseId, TimelinePhase>(
    BASE_TIMELINE.map((phase) => [phase.id, clonePhase(phase)]),
  );

  applyEnhancement(null, timelineMap, PURPOSE_ENHANCEMENTS[tripDetails.purpose]);
  tripDetails.activities.forEach((activity) => {
    applyEnhancement(null, timelineMap, ACTIVITY_ENHANCEMENTS[activity]);
  });

  let totalTasks = 0;
  let completedTasks = 0;

  const phases = Array.from(timelineMap.values()).map((phase) => {
    const tasks = phase.tasks;
    totalTasks += tasks.length;
    completedTasks += tasks.filter((task) => completedTaskIds.has(task.id)).length;
    return {
      ...phase,
      tasks,
    };
  });

  return { phases, totalTasks, completedTasks };
}

function parseDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

function describeTaskTiming(task: TimelineTask, trip: TripDetails): string | null {
  if (!task.relativeTo || typeof task.daysOffset !== "number") {
    return null;
  }

  const baseDate = task.relativeTo === "start" ? parseDate(trip.startDate) : parseDate(trip.endDate);
  const baseLabel = task.relativeTo === "start" ? "departure" : "return";
  const offset = task.daysOffset;

  const direction =
    offset === 0
      ? `on ${baseLabel}`
      : offset > 0
        ? `${offset} day${offset === 1 ? "" : "s"} after ${baseLabel}`
        : `${Math.abs(offset)} day${Math.abs(offset) === 1 ? "" : "s"} before ${baseLabel}`;

  if (!baseDate) {
    return direction;
  }

  const targetDate = new Date(baseDate);
  targetDate.setDate(baseDate.getDate() + offset);

  return `${dateFormatter.format(targetDate)} • ${direction}`;
}

export default function PackingListPlannerPage() {
  useTrackToolUsage("packing-list");

  const theme = toolThemes.blue;

  const [searchQuery, setSearchQuery] = useState("");
  const [tripDetails, setTripDetails] = useState<TripDetails>(DEFAULT_TRIP);
  const [packedItems, setPackedItems] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<CustomItemsState>(createEmptyCustomItems);
  const [customDrafts, setCustomDrafts] = useState<Record<PackingSectionId, CustomDraft>>(createEmptyDrafts);
  const [timelineCompleted, setTimelineCompleted] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const packed = sanitizePackedItems(readStorage(PACKED_STORAGE_KEY));
    const custom = sanitizeCustomItems(readStorage(CUSTOM_STORAGE_KEY));
    const trip = sanitizeTripDetails(readStorage(TRIP_STORAGE_KEY));
    const timeline = sanitizePackedItems(readStorage(TIMELINE_STORAGE_KEY));

    setPackedItems(packed);
    setCustomItems(custom);
    setTripDetails(trip);
    setTimelineCompleted(timeline);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeStorage(PACKED_STORAGE_KEY, packedItems);
  }, [packedItems, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeStorage(CUSTOM_STORAGE_KEY, customItems);
  }, [customItems, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeStorage(TRIP_STORAGE_KEY, tripDetails);
  }, [tripDetails, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeStorage(TIMELINE_STORAGE_KEY, timelineCompleted);
  }, [timelineCompleted, hydrated]);

  const packedSet = useMemo(() => new Set(packedItems), [packedItems]);
  const timelineCompletedSet = useMemo(() => new Set(timelineCompleted), [timelineCompleted]);

  const { sections, totalItems, packedItems: packedCount } = useMemo(
    () => buildPackingSections({ searchQuery, tripDetails, customItems, packedItemIds: packedSet }),
    [searchQuery, tripDetails, customItems, packedSet],
  );

  const { phases: timelinePhases, totalTasks, completedTasks } = useMemo(
    () => buildTimeline({ tripDetails, completedTaskIds: timelineCompletedSet }),
    [tripDetails, timelineCompletedSet],
  );

  const packingProgress = totalItems === 0 ? 0 : Math.round((packedCount / totalItems) * 100);
  const timelineProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const subtitle = tripDetails.destination
    ? `Packing support for ${tripDetails.destination}`
    : "Plan your trip details, adapt the checklist, and track progress.";

  const totalChecklistCount = sections.reduce(
    (count, section) => count + section.groups.reduce((groupTotal, group) => groupTotal + group.items.length, 0),
    0,
  );

  const togglePacked = (itemId: string) => {
    setPackedItems((current) => {
      if (current.includes(itemId)) {
        return current.filter((id) => id !== itemId);
      }
      return [...current, itemId];
    });
  };

  const handleCustomDraftChange = (
    sectionId: PackingSectionId,
    field: keyof CustomDraft,
    value: string,
  ) => {
    setCustomDrafts((current) => ({
      ...current,
      [sectionId]: {
        ...current[sectionId],
        [field]: value,
      },
    }));
  };

  const handleAddCustomItem = (event: FormEvent<HTMLFormElement>, sectionId: PackingSectionId) => {
    event.preventDefault();
    const draft = customDrafts[sectionId];

    if (!draft.name.trim()) {
      return;
    }

    const newItem: PackingItem = {
      id: `custom-${sectionId}-${Date.now()}`,
      name: draft.name.trim(),
      quantity: draft.quantity.trim() ? draft.quantity.trim() : undefined,
      description: draft.notes.trim() ? draft.notes.trim() : undefined,
      custom: true,
    };

    setCustomItems((current) => ({
      ...current,
      [sectionId]: [...current[sectionId], newItem],
    }));

    setCustomDrafts((current) => ({
      ...current,
      [sectionId]: { name: "", quantity: "", notes: "" },
    }));
  };

  const handleDeleteCustomItem = (sectionId: PackingSectionId, itemId: string) => {
    setCustomItems((current) => ({
      ...current,
      [sectionId]: current[sectionId].filter((item) => item.id !== itemId),
    }));
    setPackedItems((current) => current.filter((id) => id !== itemId));
  };

  const toggleTimelineTask = (taskId: string) => {
    setTimelineCompleted((current) => {
      if (current.includes(taskId)) {
        return current.filter((id) => id !== taskId);
      }
      return [...current, taskId];
    });
  };

  const resetPackingProgress = () => {
    setPackedItems([]);
  };

  const resetTimelineProgress = () => {
    setTimelineCompleted([]);
  };

  return (
    <ToolPageLayout>
      <ToolHeader
        title="Packing List Planner"
        emoji="🧭"
        subtitle={subtitle}
        showBackButton
        stats={[
          { label: "items packed", value: `${packedCount}/${totalItems || totalChecklistCount}`, variant: "info" },
          { label: "packing complete", value: `${packingProgress}%`, variant: "success" },
          { label: "timeline", value: `${timelineProgress}%`, variant: "warning" },
        ]}
        theme={theme}
      />

      <SearchAndFilters
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search items (e.g. toiletries, adapters, snacks)"
        totalCount={totalChecklistCount}
        filteredCount={sections.reduce(
          (count, section) => count + section.groups.reduce((groupTotal, group) => groupTotal + group.items.length, 0),
          0,
        )}
        theme={theme}
      />

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <ToolCard className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Plane className="h-5 w-5" /> Trip setup
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Capture the basics and we’ll adapt the list to match.
                </p>
              </div>
            </div>

            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  placeholder="City, region, or adventure"
                  value={tripDetails.destination}
                  onChange={(event) =>
                    setTripDetails((current) => ({ ...current, destination: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Select
                  id="purpose"
                  value={tripDetails.purpose}
                  onChange={(event) =>
                    setTripDetails((current) => ({ ...current, purpose: event.target.value as TripPurpose }))
                  }
                >
                  {PURPOSE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date">Start date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={tripDetails.startDate}
                  onChange={(event) =>
                    setTripDetails((current) => ({ ...current, startDate: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={tripDetails.endDate}
                  onChange={(event) =>
                    setTripDetails((current) => ({ ...current, endDate: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companions">Travel companions</Label>
                <Input
                  id="companions"
                  placeholder="Who’s joining?"
                  value={tripDetails.companions}
                  onChange={(event) =>
                    setTripDetails((current) => ({ ...current, companions: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accommodations">Accommodations</Label>
                <Input
                  id="accommodations"
                  placeholder="Hotel, rental, friends, etc."
                  value={tripDetails.accommodations}
                  onChange={(event) =>
                    setTripDetails((current) => ({ ...current, accommodations: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Activities</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ACTIVITY_OPTIONS.map((activity) => {
                    const checked = tripDetails.activities.includes(activity.id);
                    return (
                      <label
                        key={activity.id}
                        className={clsx(
                          "flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors",
                          checked
                            ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/20"
                            : "border-gray-200 dark:border-gray-700",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(isChecked) => {
                            setTripDetails((current) => {
                              const activities = new Set(current.activities);
                              if (isChecked) {
                                activities.add(activity.id);
                              } else {
                                activities.delete(activity.id);
                              }
                              return { ...current, activities: Array.from(activities) as ActivityId[] };
                            });
                          }}
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            <span className="mr-1" aria-hidden>{activity.icon}</span>
                            {activity.label}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{activity.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="trip-notes">Trip notes</Label>
                <Textarea
                  id="trip-notes"
                  placeholder="Packing priorities, reminders, or special considerations"
                  value={tripDetails.notes}
                  onChange={(event) =>
                    setTripDetails((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={3}
                />
              </div>
            </form>
          </ToolCard>

          {sections.length === 0 ? (
            <ToolCard className="py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <Sparkles className="h-10 w-10 text-blue-400" />
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  No items match your search yet
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Try adjusting your search or add custom items tailored to this trip.
                </p>
              </div>
            </ToolCard>
          ) : (
            sections.map((section) => (
              <ToolCard key={section.id} className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <span className="text-xl" aria-hidden>
                        {section.emoji}
                      </span>
                      {section.title}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{section.summary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={resetPackingProgress}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset packed
                  </button>
                </div>

                <div className="space-y-4">
                  {section.groups.map((group) => (
                    <div key={group.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            <span className="mr-2" aria-hidden>
                              {group.icon}
                            </span>
                            {group.title}
                          </h3>
                          {group.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{group.description}</p>
                          )}
                        </div>
                      </div>

                      <ul className="mt-3 space-y-2">
                        {group.items.map((item) => {
                          const isPacked = packedSet.has(item.id);
                          return (
                            <li
                              key={item.id}
                              className={clsx(
                                "flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition",
                                isPacked
                                  ? "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/30 dark:text-green-200"
                                  : "border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100",
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => togglePacked(item.id)}
                                className="flex flex-1 items-start gap-3 text-left"
                              >
                                <span className="mt-0.5">
                                  {isPacked ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <Circle className="h-5 w-5 text-gray-400" />
                                  )}
                                </span>
                                <span>
                                  <span className="font-medium">
                                    {item.name}
                                    {item.quantity && <span className="ml-1 text-xs text-gray-500">({item.quantity})</span>}
                                  </span>
                                  {item.description && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400">{item.description}</p>
                                  )}
                                  {item.tip && (
                                    <p className="text-xs text-blue-600 dark:text-blue-300">Tip: {item.tip}</p>
                                  )}
                                  {item.custom && (
                                    <span className="mt-1 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                      Custom
                                    </span>
                                  )}
                                </span>
                              </button>

                              {item.custom && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomItem(section.id, item.id)}
                                  className="rounded-md p-1 text-gray-400 hover:text-red-500"
                                  aria-label="Remove custom item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                      {group.id.startsWith("custom-") && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Custom items live only on this device. Delete them once you no longer need them.
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(event) => handleAddCustomItem(event, section.id)}
                  className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Add custom item
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Capture a specific reminder for {section.title.toLowerCase()}.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <Label className="sr-only" htmlFor={`custom-${section.id}-name`}>
                        Item name
                      </Label>
                      <Input
                        id={`custom-${section.id}-name`}
                        placeholder="Item name"
                        value={customDrafts[section.id].name}
                        onChange={(event) => handleCustomDraftChange(section.id, "name", event.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label className="sr-only" htmlFor={`custom-${section.id}-quantity`}>
                        Quantity
                      </Label>
                      <Input
                        id={`custom-${section.id}-quantity`}
                        placeholder="Qty"
                        value={customDrafts[section.id].quantity}
                        onChange={(event) => handleCustomDraftChange(section.id, "quantity", event.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Label className="sr-only" htmlFor={`custom-${section.id}-notes`}>
                        Notes
                      </Label>
                      <Textarea
                        id={`custom-${section.id}-notes`}
                        placeholder="Notes or packing tip"
                        value={customDrafts[section.id].notes}
                        onChange={(event) => handleCustomDraftChange(section.id, "notes", event.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                      Add item
                    </button>
                  </div>
                </form>
              </ToolCard>
            ))
          )}
        </div>

        <div className="space-y-4">
          <ToolCard className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Trip timeline
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Spot-check prep milestones and reset when plans change.
                </p>
              </div>
              <button
                type="button"
                onClick={resetTimelineProgress}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset timeline
              </button>
            </div>

            <div className="space-y-4">
              {timelinePhases.map((phase) => (
                <div key={phase.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                  <div className="flex items-start gap-3">
                    <span className="text-xl" aria-hidden>
                      {phase.emoji}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{phase.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{phase.summary}</p>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-2">
                    {phase.tasks.map((task) => {
                      const isDone = timelineCompletedSet.has(task.id);
                      const timing = describeTaskTiming(task, tripDetails);

                      return (
                        <li key={task.id}>
                          <button
                            type="button"
                            onClick={() => toggleTimelineTask(task.id)}
                            className={clsx(
                              "flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition",
                              isDone
                                ? "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/30 dark:text-green-200"
                                : "border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100",
                            )}
                          >
                            <span className="mt-0.5">
                              {isDone ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-400" />
                              )}
                            </span>
                            <span>
                              <span className="font-medium">{task.title}</span>
                              {task.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">{task.description}</p>
                              )}
                              {timing && (
                                <p className="text-xs text-blue-600 dark:text-blue-300">{timing}</p>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </ToolCard>

          <ToolInfoSection
            title="Quick tips"
            theme={theme}
            content={
              <ul className="list-inside list-disc space-y-1 text-sm">
                <li>Save custom items for recurring trips — they stay on this device for easy reuse.</li>
                <li>Use the timeline to schedule reminders relative to your departure and return dates.</li>
                <li>Need a lighter list? Filter by keyword or clear packed items once a bag is zipped.</li>
              </ul>
            }
          />

          {tripDetails.destination && (
            <ToolCard className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Trip snapshot
              </h2>
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <p>
                  Destination: <span className="font-medium text-gray-900 dark:text-gray-100">{tripDetails.destination || "TBD"}</span>
                </p>
                {(tripDetails.startDate || tripDetails.endDate) && (
                  <p>
                    Dates: {tripDetails.startDate ? tripDetails.startDate : "TBD"} → {tripDetails.endDate ? tripDetails.endDate : "TBD"}
                  </p>
                )}
                {tripDetails.companions && <p>Companions: {tripDetails.companions}</p>}
                {tripDetails.accommodations && <p>Stay: {tripDetails.accommodations}</p>}
                {tripDetails.activities.length > 0 && (
                  <p>
                    Activities: {tripDetails.activities.map((activity) => ACTIVITY_OPTIONS.find((option) => option.id === activity)?.label || activity).join(", ")}
                  </p>
                )}
                {tripDetails.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Notes: {tripDetails.notes}</p>
                )}
              </div>
            </ToolCard>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
}
