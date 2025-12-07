/**
 * Packing List Types for Trip Integration
 */

export const SECTION_IDS = ["essentials", "clothing", "personal", "tech", "extras"] as const;

export type PackingSectionId = (typeof SECTION_IDS)[number];

export type TripPurpose = "leisure" | "business" | "adventure" | "family" | "digital-nomad";

export type TripLength = "weekend" | "one-week" | "two-week" | "extended";

export type ActivityId = "beach" | "hiking" | "city" | "formal" | "snow-sports" | "diving" | "photography" | "camping";

export type AccommodationType = "hotel" | "airbnb" | "hostel" | "camping" | "mixed";

// AI-generated destination insights
export interface DestinationInsights {
  weather: string;
  culturalNotes: string;
  practicalTips: string[];
}

export type PackingItemStatus = 'unpacked' | 'packed' | 'later' | 'no-need';

export interface PackingItem {
  id: string;
  name: string;
  quantity?: string;
  description?: string;
  tip?: string;
  custom?: boolean;
  status?: PackingItemStatus; // Status of the item
}

export interface PackingGroup {
  id: string;
  title: string;
  icon?: string;
  description?: string;
  items: PackingItem[];
}

export interface PackingSection {
  id: PackingSectionId;
  title: string;
  emoji: string;
  summary: string;
  groups: PackingGroup[];
}

export interface AISuggestion {
  id: string;
  itemName: string;
  sectionId: PackingSectionId;
  reason: string;
  confidence: number; // 0-1
  addedToList: boolean;
  dismissed: boolean;
  createdAt: string;
}

export type CustomItemsState = Record<PackingSectionId, PackingItem[]>;

export interface TimelineTask {
  id: string;
  title: string;
  description?: string;
  relativeTo?: "start" | "end";
  daysOffset?: number;
}

export type TimelinePhaseId = "before" | "during" | "return";

export interface TimelinePhase {
  id: TimelinePhaseId;
  title: string;
  emoji: string;
  summary: string;
  tasks: TimelineTask[];
}

/**
 * Main PackingList document stored in Firestore
 * Path: users/{userId}/trips/{tripId}/packingList (single document)
 */
export interface PackingList {
  id: string; // Same as tripId for easy reference
  tripId: string;
  userId: string;

  // Packing state
  sections: PackingSection[];
  packedItemIds: string[]; // Deprecated, use itemStatuses
  itemStatuses: Record<string, PackingItemStatus>; // New item status tracking
  customItems: CustomItemsState;

  // Timeline state
  timelinePhases: TimelinePhase[];
  timelineCompleted: string[];

  // AI suggestions
  aiSuggestions: AISuggestion[];
  lastAiGeneratedAt?: string;

  // AI generation context
  generatedWithAI?: boolean;
  destinationInsights?: DestinationInsights;
  durationStrategy?: string;

  // Metadata
  createdAt: string;
  updatedAt?: number;
}

/**
 * Request/Response types for cloud functions
 */

export interface CreatePackingListRequest {
  tripId: string;
}

export interface CreatePackingListResponse {
  packingList: PackingList;
}

export interface UpdatePackingListRequest {
  tripId: string;
  updates: {
    packedItemIds?: string[];
    customItems?: CustomItemsState;
    timelineCompleted?: string[];
  };
}

export interface UpdatePackingListResponse {
  success: boolean;
}

export interface GenerateAISuggestionsRequest {
  tripId: string;
  forceRegenerate?: boolean; // Ignore cache, generate fresh
}

export interface GenerateAISuggestionsResponse {
  suggestions: AISuggestion[];
}

export interface AddCustomItemRequest {
  tripId: string;
  sectionId: PackingSectionId;
  item: Omit<PackingItem, 'id'>;
}

export interface AddCustomItemResponse {
  itemId: string;
}

export interface DeleteCustomItemRequest {
  tripId: string;
  sectionId: PackingSectionId;
  itemId: string;
}

export interface DeleteCustomItemResponse {
  success: boolean;
}

export interface TogglePackedRequest {
  tripId: string;
  itemId: string;
  packed: boolean;
}

export interface TogglePackedResponse {
  success: boolean;
}

export interface SetItemStatusRequest {
  tripId: string;
  itemId: string;
  status: PackingItemStatus;
}

export interface SetItemStatusResponse {
  success: boolean;
}

export interface AddAISuggestionRequest {
  tripId: string;
  suggestionId: string;
}

export interface AddAISuggestionResponse {
  itemId: string;
}

export interface DismissSuggestionRequest {
  tripId: string;
  suggestionId: string;
}

export interface DismissSuggestionResponse {
  success: boolean;
}

export interface DeletePackingListRequest {
  tripId: string;
}

export interface DeletePackingListResponse {
  success: boolean;
}

// AI Packing List Generation
export interface GenerateAIPackingListRequest {
  tripId: string;
  forceRegenerate?: boolean;
}

export interface GenerateAIPackingListResponse {
  packingList: PackingList;
  insights?: DestinationInsights;
}
