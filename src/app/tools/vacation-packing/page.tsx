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
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import {
  CheckCircle2,
  Circle,
  Plane,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";

const PACKED_STORAGE_KEY = "vacation-packing-packed-items";
const CUSTOM_STORAGE_KEY = "vacation-packing-custom-items";

const SECTION_IDS = ["essentials", "nice-to-pack"] as const;

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

const PACKING_SECTIONS: PackingSection[] = [
  {
    id: "essentials",
    title: "Essential Core",
    emoji: "🎒",
    summary: "Must-have items to comfortably cover fourteen days on the road.",
    groups: [
      {
        id: "travel-docs",
        title: "Travel Documents & Money",
        icon: "🛂",
        description: "Everything you need to leave home with peace of mind.",
        items: [
          { id: "passport", name: "Passport / ID + visas", tip: "Keep digital backups in secure cloud storage." },
          { id: "travel-itinerary", name: "Printed & digital itinerary", description: "Reservation numbers, addresses, and confirmations." },
          { id: "insurance", name: "Travel insurance details", description: "Policy number, coverage cards, and emergency contacts." },
          { id: "wallet", name: "Wallet with cash & cards", tip: "Carry two cards and some local currency." },
          { id: "emergency-contacts", name: "Emergency contact sheet", description: "Local embassies, accommodations, and personal contacts." },
        ],
      },
      {
        id: "clothing-foundation",
        title: "Clothing Rotation",
        icon: "👕",
        description: "A flexible wardrobe assuming laundry mid-trip.",
        items: [
          { id: "tops", name: "7-8 versatile tops", quantity: "7-8", tip: "Mix breathable layers for varied climates." },
          { id: "bottoms", name: "3 bottoms", quantity: "3", description: "2 casual + 1 polished option." },
          { id: "dresses", name: "2 dressier outfits", quantity: "2", tip: "Pack wrinkle-resistant pieces." },
          { id: "sleepwear", name: "2 sets of sleepwear", quantity: "2", description: "Choose quick-dry fabrics." },
          { id: "underwear", name: "14 pairs underwear", quantity: "14", tip: "Add a couple of quick-dry pairs." },
          { id: "socks", name: "7 pairs socks", quantity: "7", description: "Blend ankle + crew socks." },
          { id: "outer-layer", name: "Light jacket or sweater", quantity: "1", description: "Choose something that layers easily." },
          { id: "swimwear", name: "Swimwear", quantity: "1-2", tip: "Pack a quick-dry towel if you plan to swim." },
          { id: "shoes", name: "Comfortable walking shoes", quantity: "1", description: "Break them in before your trip." },
          { id: "sandals", name: "Sandals or dress shoes", quantity: "1", description: "Pick something that covers evenings out." },
        ],
      },
      {
        id: "toiletries",
        title: "Toiletries & Health",
        icon: "🧴",
        description: "Decant into travel bottles and keep essentials together.",
        items: [
          { id: "toiletry-kit", name: "Complete toiletry kit", description: "Toothbrush, toothpaste, floss, deodorant, razor." },
          { id: "skincare", name: "Daily skincare", tip: "Include SPF for day and moisturizer for night." },
          { id: "medications", name: "Prescription meds (full supply)", description: "Pack copies of prescriptions." },
          { id: "first-aid", name: "Mini first-aid kit", tip: "Bandages, pain reliever, motion sickness tablets." },
          { id: "laundry-kit", name: "Travel laundry kit", description: "Sink stopper, detergent sheets, clothesline." },
          { id: "haircare", name: "Hair care essentials", tip: "Brush/comb, travel-sized styling products." },
        ],
      },
      {
        id: "tech",
        title: "Tech & Travel Tools",
        icon: "🔌",
        description: "Keep devices charged and organized for the whole stay.",
        items: [
          { id: "phone", name: "Phone + charger", description: "Include power brick and charging cable." },
          { id: "adapter", name: "Universal power adapter", tip: "Check plug type for each destination." },
          { id: "power-bank", name: "High-capacity power bank", description: "10,000 mAh or higher keeps you covered on long days." },
          { id: "headphones", name: "Noise-cancelling headphones / earbuds", description: "Add wired backup if you need airplane audio." },
          { id: "ereader", name: "E-reader or favorite book", tip: "Download offline entertainment before departure." },
          { id: "camera", name: "Camera or action cam", description: "Include batteries, memory cards, and straps." },
          { id: "locks", name: "TSA-approved luggage locks", description: "One per checked bag plus a spare." },
          { id: "daypack", name: "Daypack or tote", description: "Foldable day bag for excursions." },
          { id: "water-bottle", name: "Reusable water bottle", tip: "Collapsible bottles save space." },
        ],
      },
    ],
  },
  {
    id: "nice-to-pack",
    title: "Nice to Pack",
    emoji: "🌟",
    summary: "Comfort upgrades and personal touches for extra enjoyment.",
    groups: [
      {
        id: "comfort",
        title: "Comfort in Transit",
        icon: "💺",
        description: "Make flights and long rides easier.",
        items: [
          { id: "travel-pillow", name: "Travel pillow", description: "Compressible or inflatable." },
          { id: "sleep-kit", name: "Sleep mask & earplugs", tip: "Great for red-eyes and bright hotel rooms." },
          { id: "snacks", name: "Favorite snacks", description: "Pack protein-rich options." },
          { id: "refillable-cup", name: "Collapsible mug or cup", description: "Useful for tea or instant meals." },
        ],
      },
      {
        id: "extras-clothing",
        title: "Style Boosters",
        icon: "🧣",
        description: "Accessorize without overpacking.",
        items: [
          { id: "scarf", name: "Lightweight scarf or wrap", description: "Doubles as a layering piece or blanket." },
          { id: "hat", name: "Sun hat or beanie", tip: "Choose based on climate." },
          { id: "jewelry", name: "Simple jewelry capsule", description: "Keep pieces in a compact organizer." },
          { id: "extra-shoes", name: "Optional extra shoes", tip: "Dress shoes, hiking boots, or specialty footwear." },
        ],
      },
      {
        id: "wellness",
        title: "Wellness & Self-Care",
        icon: "🧘",
        description: "Keep your energy and routines balanced on the road.",
        items: [
          { id: "workout-gear", name: "Travel workout outfit", description: "Pack resistance bands or jump rope if desired." },
          { id: "recovery", name: "Recovery tools", tip: "Massage ball, compact foam roller, or compression socks." },
          { id: "spa", name: "Mini spa kit", description: "Sheet mask, bath salts, or favorite pampering items." },
          { id: "health-boosts", name: "Wellness extras", tip: "Electrolytes, probiotics, or herbal tea." },
        ],
      },
      {
        id: "extras-tech",
        title: "Optional Tech",
        icon: "💻",
        description: "If you plan to work or create while you travel.",
        items: [
          { id: "tablet", name: "Tablet or laptop", description: "Download offline docs ahead of time." },
          { id: "portable-speaker", name: "Portable speaker", tip: "Small Bluetooth speaker for rooms or picnics." },
          { id: "tripod", name: "Compact tripod or selfie stick", description: "Choose lightweight aluminum or carbon." },
          { id: "travel-router", name: "Travel Wi-Fi router", tip: "Helpful for unreliable hotel connections." },
        ],
      },
    ],
  },
];

function createEmptyCustomItems(): CustomItemsState {
  return {
    essentials: [],
    "nice-to-pack": [],
  };
}

function sanitizeStoredPackedItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function sanitizeStoredCustomItems(value: unknown): CustomItemsState {
  if (!value || typeof value !== "object") {
    return createEmptyCustomItems();
  }
  const record = value as Record<string, unknown>;

  const sanitizeList = (items: unknown): PackingItem[] => {
    if (!Array.isArray(items)) {
      return [];
    }

    const sanitized: PackingItem[] = [];

    for (const entry of items) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const raw = entry as Record<string, unknown>;
      const idValue = raw.id;
      const nameValue = raw.name;

      if ((typeof idValue !== "string" && typeof idValue !== "number") || typeof nameValue !== "string") {
        continue;
      }

      const id = typeof idValue === "string" ? idValue : String(idValue);
      sanitized.push({
        id,
        name: nameValue,
        quantity: typeof raw.quantity === "string" ? raw.quantity : undefined,
        description: typeof raw.description === "string" ? raw.description : undefined,
        tip: typeof raw.tip === "string" ? raw.tip : undefined,
        custom: true,
      });
    }

    return sanitized;
  };

  return {
    essentials: sanitizeList(record.essentials),
    "nice-to-pack": sanitizeList(record["nice-to-pack"]),
  };
}

export default function VacationPackingPage() {
  useTrackToolUsage("vacation-packing");

  const theme = toolThemes.teal;

  const [searchTerm, setSearchTerm] = useState("");
  const [packedItems, setPackedItems] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<CustomItemsState>(createEmptyCustomItems);
  const [customItemSection, setCustomItemSection] = useState<PackingSectionId>("essentials");
  const [customItemName, setCustomItemName] = useState("");
  const [customItemQuantity, setCustomItemQuantity] = useState("");
  const [customItemNotes, setCustomItemNotes] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedPackedRaw = localStorage.getItem(PACKED_STORAGE_KEY);
      if (storedPackedRaw) {
        const parsed = JSON.parse(storedPackedRaw);
        setPackedItems(sanitizeStoredPackedItems(parsed));
      }

      const storedCustomRaw = localStorage.getItem(CUSTOM_STORAGE_KEY);
      if (storedCustomRaw) {
        const parsed = JSON.parse(storedCustomRaw);
        setCustomItems(sanitizeStoredCustomItems(parsed));
      }
    } catch (error) {
      console.error("Failed to load vacation packing state", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(PACKED_STORAGE_KEY, JSON.stringify(packedItems));
    } catch (error) {
      console.error("Failed to persist packed items", error);
    }
  }, [packedItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(customItems));
    } catch (error) {
      console.error("Failed to persist custom items", error);
    }
  }, [customItems]);

  const sectionsWithCustom = useMemo(() => {
    return PACKING_SECTIONS.map((section) => {
      const extras = customItems[section.id];
      if (!extras || extras.length === 0) {
        return section;
      }

      return {
        ...section,
        groups: [
          ...section.groups,
          {
            id: `${section.id}-custom`,
            title: "Custom additions",
            icon: "✨",
            description: "Personal items saved for this device.",
            items: extras,
          },
        ],
      } satisfies PackingSection;
    });
  }, [customItems]);

  const allItems = useMemo(() => {
    return sectionsWithCustom.flatMap((section) =>
      section.groups.flatMap((group) => group.items)
    );
  }, [sectionsWithCustom]);

  const packedSet = useMemo(() => new Set(packedItems), [packedItems]);

  useEffect(() => {
    const validIds = new Set(allItems.map((item) => item.id));
    setPackedItems((prev) => {
      const filtered = prev.filter((id) => validIds.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [allItems]);

  const sectionItemIds = useMemo(() => {
    const map: Record<PackingSectionId, string[]> = {
      essentials: [],
      "nice-to-pack": [],
    };

    sectionsWithCustom.forEach((section) => {
      map[section.id] = section.groups.flatMap((group) => group.items.map((item) => item.id));
    });

    return map;
  }, [sectionsWithCustom]);

  const sectionStats = useMemo(() => {
    const stats: Record<PackingSectionId, { total: number; packed: number }> = {
      essentials: { total: 0, packed: 0 },
      "nice-to-pack": { total: 0, packed: 0 },
    };

    (SECTION_IDS as Readonly<PackingSectionId[]>).forEach((id) => {
      const items = sectionItemIds[id];
      const packedCount = items.reduce((count, itemId) => count + (packedSet.has(itemId) ? 1 : 0), 0);
      stats[id] = {
        total: items.length,
        packed: packedCount,
      };
    });

    return stats;
  }, [sectionItemIds, packedSet]);

  const totalItems = allItems.length;
  const totalPacked = useMemo(() => allItems.filter((item) => packedSet.has(item.id)).length, [allItems, packedSet]);
  const totalRemaining = Math.max(totalItems - totalPacked, 0);

  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) {
      return sectionsWithCustom;
    }

    const query = searchTerm.toLowerCase();

    return sectionsWithCustom
      .map((section) => {
        const filteredGroups = section.groups
          .map((group) => {
            const filteredItems = group.items.filter((item) => {
              return (
                item.name.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query) ||
                item.tip?.toLowerCase().includes(query) ||
                item.quantity?.toLowerCase().includes(query)
              );
            });

            if (filteredItems.length === 0) {
              return null;
            }

            return {
              ...group,
              items: filteredItems,
            } satisfies PackingGroup;
          })
          .filter((group): group is PackingGroup => group !== null);

        if (filteredGroups.length === 0) {
          return null;
        }

        return {
          ...section,
          groups: filteredGroups,
        } satisfies PackingSection;
      })
      .filter((section): section is PackingSection => section !== null);
  }, [sectionsWithCustom, searchTerm]);

  const filteredItemCount = useMemo(
    () =>
      filteredSections.reduce(
        (count, section) =>
          count + section.groups.reduce((groupCount, group) => groupCount + group.items.length, 0),
        0
      ),
    [filteredSections]
  );

  const handleToggleItem = (itemId: string) => {
    setPackedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleToggleSection = (sectionId: PackingSectionId, packAll: boolean) => {
    const ids = sectionItemIds[sectionId];
    if (packAll) {
      const merged = new Set([...packedItems, ...ids]);
      setPackedItems(Array.from(merged));
    } else {
      setPackedItems((prev) => prev.filter((id) => !ids.includes(id)));
    }
  };

  const handleRemoveCustomItem = (sectionId: PackingSectionId, itemId: string) => {
    setCustomItems((prev) => {
      const updated = prev[sectionId].filter((item) => item.id !== itemId);
      return {
        ...prev,
        [sectionId]: updated,
      };
    });

    setPackedItems((prev) => prev.filter((id) => id !== itemId));
  };

  const handleCustomItemSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = customItemName.trim();
    const quantity = customItemQuantity.trim();
    const notes = customItemNotes.trim();

    if (!name) return;

    const newItem: PackingItem = {
      id: `custom-${customItemSection}-${Date.now()}`,
      name,
      quantity: quantity || undefined,
      description: notes || undefined,
      custom: true,
    };

    setCustomItems((prev) => ({
      ...prev,
      [customItemSection]: [...prev[customItemSection], newItem],
    }));

    setCustomItemName("");
    setCustomItemQuantity("");
    setCustomItemNotes("");
  };

  const handleResetAll = () => {
    if (typeof window !== "undefined" && !window.confirm("Reset all packing progress and custom items?")) {
      return;
    }

    setPackedItems([]);
    setCustomItems(createEmptyCustomItems());
    setSearchTerm("");
  };

  return (
    <ToolPageLayout>
      <ToolHeader
        title="2-Week Vacation Packing"
        emoji="🧳"
        subtitle="Plan a balanced suitcase with must-haves and comfort extras for a fourteen-day getaway."
        showBackButton
        stats={[
          { label: "items", value: totalItems, variant: "info" },
          { label: "packed", value: totalPacked, variant: "success" },
          { label: "remaining", value: totalRemaining, variant: totalRemaining === 0 ? "success" : "warning" },
        ]}
        theme={theme}
      />

      <SearchAndFilters
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search clothing, toiletries, or gear..."
        totalCount={totalItems}
        filteredCount={filteredItemCount}
        theme={theme}
      />

      <div className="space-y-8">
        {filteredSections.length === 0 ? (
          <ToolCard className="bg-white/70 dark:bg-gray-900/60 border-2 border-dashed border-teal-200 dark:border-teal-800 text-center py-12">
            <Plane className="mx-auto h-12 w-12 text-teal-500 dark:text-teal-400" />
            <h2 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">No items match that search</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Try a different keyword or clear the search box to view the full checklist.
            </p>
          </ToolCard>
        ) : (
          filteredSections.map((section) => {
            const statsForSection = sectionStats[section.id];
            const remaining = Math.max(statsForSection.total - statsForSection.packed, 0);

            return (
              <section key={section.id} className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <span>{section.emoji}</span>
                      {section.title}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">{section.summary}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                        {statsForSection.total} items
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {statsForSection.packed} packed
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${remaining === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                        {remaining} left
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                      onClick={() => handleToggleSection(section.id, true)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark all packed
                    </button>
                    <button
                      onClick={() => handleToggleSection(section.id, false)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 text-sm font-semibold px-4 py-2 transition-colors hover:bg-teal-50 dark:hover:bg-teal-900/30"
                    >
                      <Circle className="h-4 w-4" />
                      Clear section
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {section.groups.map((group) => (
                    <ToolCard
                      key={group.id}
                      className="bg-white/80 dark:bg-gray-900/60 border border-teal-100 dark:border-teal-900/40"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            {group.icon && <span className="text-xl" aria-hidden>{group.icon}</span>}
                            {group.title}
                          </h3>
                          {group.description && (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{group.description}</p>
                          )}
                        </div>
                      </div>

                      <ul className="mt-4 space-y-3">
                        {group.items.map((item) => {
                          const isPacked = packedSet.has(item.id);

                          return (
                            <li
                              key={item.id}
                              className={`group flex items-start gap-3 rounded-xl border p-3 transition-all ${
                                isPacked
                                  ? "border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-900/40"
                                  : "border-transparent bg-gray-50/70 dark:bg-gray-900/40"
                              }`}
                            >
                              <button
                                onClick={() => handleToggleItem(item.id)}
                                className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                                  isPacked
                                    ? "border-teal-500 bg-teal-500 text-white"
                                    : "border-teal-300 text-teal-600 dark:text-teal-300"
                                } transition-colors`}
                                aria-pressed={isPacked}
                                aria-label={isPacked ? `Unmark ${item.name}` : `Mark ${item.name} as packed`}
                              >
                                {isPacked ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                              </button>

                              <div className="flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`font-medium ${
                                      isPacked
                                        ? "text-teal-700 dark:text-teal-200 line-through decoration-teal-400"
                                        : "text-gray-900 dark:text-gray-100"
                                    }`}
                                  >
                                    {item.name}
                                  </span>
                                  {item.quantity && (
                                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/50 dark:text-teal-200">
                                      {item.quantity}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                                )}
                                {item.tip && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">{item.tip}</p>
                                )}
                              </div>

                              {item.custom && (
                                <button
                                  onClick={() => handleRemoveCustomItem(section.id, item.id)}
                                  className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                  aria-label={`Remove ${item.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </ToolCard>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      <ToolCard className="bg-white/80 dark:bg-gray-900/60 border border-teal-100 dark:border-teal-900/50">
        <form onSubmit={handleCustomItemSubmit} className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200 p-2">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Personalize your checklist
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add destination-specific items and they will stay saved on this device.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="custom-section">Section</Label>
              <Select
                id="custom-section"
                value={customItemSection}
                onChange={(event) => setCustomItemSection(event.target.value as PackingSectionId)}
                className="mt-1"
              >
                <SelectItem value="essentials">Essentials</SelectItem>
                <SelectItem value="nice-to-pack">Nice to pack</SelectItem>
              </Select>
            </div>
            <div>
              <Label htmlFor="custom-quantity">Quantity or count (optional)</Label>
              <Input
                id="custom-quantity"
                value={customItemQuantity}
                onChange={(event) => setCustomItemQuantity(event.target.value)}
                placeholder="e.g. 2 formal outfits"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="custom-name">Item name</Label>
            <Input
              id="custom-name"
              value={customItemName}
              onChange={(event) => setCustomItemName(event.target.value)}
              placeholder="What do you need to bring?"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="custom-notes">Notes (optional)</Label>
            <Textarea
              id="custom-notes"
              value={customItemNotes}
              onChange={(event) => setCustomItemNotes(event.target.value)}
              placeholder="Add details, reminders, or storage instructions."
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Custom items and packed progress are stored locally so you can revisit the checklist anytime.
            </p>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 transition-colors disabled:opacity-60"
              disabled={!customItemName.trim()}
            >
              <Plus className="h-4 w-4" />
              Add item
            </button>
          </div>
        </form>
      </ToolCard>

      <ToolInfoSection
        title="Smart packing for a two-week adventure"
        theme={theme}
        content={
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Rotate outfits by planning laundry halfway through your trip. Pack fabrics that dry quickly so you can wash in a sink if needed.
            </li>
            <li>
              Use packing cubes or compression bags to separate the essential core from nice-to-pack extras. It keeps repacking effortless.
            </li>
            <li>
              Leave 10-15% luggage space empty for souvenirs. A foldable tote in your carry-on doubles as an overflow bag for the return trip.
            </li>
            <li>
              Review weather and planned activities a few days before departure to adjust quantities or add location-specific gear.
            </li>
          </ul>
        }
      />

      <FloatingActionButton
        onClick={handleResetAll}
        title="Reset packing progress"
        icon={<RotateCcw className="h-6 w-6" />}
        className="from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
      />
    </ToolPageLayout>
  );
}
