/**
 * API Types
 *
 * Shared types for the backend API client
 */

/**
 * Base document type with common fields
 */
export interface BaseDocument {
  id: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
}

/**
 * Task document type
 */
export interface Task extends BaseDocument {
  title: string;
  description?: string;
  status: 'todo' | 'doing' | 'done' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'health' | 'wealth' | 'mastery' | 'connection';
  dueDate?: string;
  completedAt?: string;
  tags?: string[];
  subtasks?: Subtask[];
  recurring?: RecurringConfig;
  estimatedMinutes?: number;
  actualMinutes?: number;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface RecurringConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];
  endDate?: string;
}

/**
 * Thought document type
 */
export interface Thought extends BaseDocument {
  text: string;
  tags?: string[];
  notes?: string;
  isDeepThought?: boolean;
  deepThoughtNotes?: string;
  deepThoughtSessionsCount?: number;
  cbtAnalysis?: CBTAnalysis;
  aiProcessingStatus?: 'pending' | 'processing' | 'completed' | 'failed' | 'blocked';
  aiError?: string;
  originalText?: string;
  originalTags?: string[];
  aiAppliedChanges?: AIAppliedChanges;
  manualEdits?: ManualEdits;
  processingHistory?: ProcessingHistoryEntry[];
  reprocessCount?: number;
  aiSuggestions?: AISuggestion[];
  confidenceScore?: number;
  toolProcessing?: ToolProcessing;
}

export interface CBTAnalysis {
  situation?: string;
  automaticThought?: string;
  emotion?: string;
  evidence?: string;
  alternativeThought?: string;
  outcome?: string;
  analyzedAt?: string;
}

export interface AIAppliedChanges {
  textEnhanced: boolean;
  textChanges?: TextChange[];
  tagsAdded: string[];
  appliedAt: string;
  appliedBy: 'auto' | 'manual-trigger';
}

export interface TextChange {
  type: string;
  from: string;
  to: string;
}

export interface ManualEdits {
  textEditedAfterAI: boolean;
  tagsAddedManually: string[];
  tagsRemovedManually: string[];
  lastManualEditAt?: string;
}

export interface ProcessingHistoryEntry {
  processedAt: string;
  trigger: 'auto' | 'manual' | 'reprocess';
  status: 'completed' | 'failed';
  tokensUsed?: number;
  changesApplied: number;
  suggestionsCount: number;
  revertedAt?: string;
  revertedChanges?: unknown;
}

export interface AISuggestion {
  id: string;
  type: string;
  confidence: number;
  data: unknown;
  reasoning: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdEntityId?: string;
  createdEntityType?: 'task' | 'project' | 'goal' | 'relationship';
}

export interface ToolProcessing {
  cbt?: {
    processed: boolean;
    processedAt?: string;
    processedBy?: 'auto' | 'manual';
    resultStored?: boolean;
  };
  brainstorm?: {
    processed: boolean;
    processedAt?: string;
    resultId?: string;
  };
  deepReflection?: {
    processed: boolean;
    processedAt?: string;
    sessionCount?: number;
  };
  soulful?: {
    processed: boolean;
    processedAt?: string;
    promptsGenerated?: number;
  };
}

/**
 * Mood document type
 */
export interface Mood extends BaseDocument {
  value: number; // 1-10 scale
  note?: string;
  emotions?: string[];
  activities?: string[];
  sleep?: number; // hours
  energy?: number; // 1-10 scale
}

/**
 * Focus Session document type
 */
export interface FocusSession extends BaseDocument {
  taskId?: string;
  taskTitle?: string;
  startTime: string;
  endTime?: string;
  duration?: number; // minutes
  type: 'focus' | 'break' | 'meeting';
  completed: boolean;
  notes?: string;
  distractions?: number;
  productivity?: number; // 1-10 scale
}

/**
 * Goal document type
 */
export interface Goal extends BaseDocument {
  title: string;
  description?: string;
  objective?: string;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  category?: 'health' | 'wealth' | 'mastery' | 'connection';
  targetDate?: string;
  completedAt?: string;
  progress?: number; // 0-100
  milestones?: Milestone[];
  keyResults?: KeyResult[];
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
}

export interface KeyResult {
  id: string;
  title: string;
  target: number;
  current: number;
  unit?: string;
}

/**
 * Project document type
 */
export interface Project extends BaseDocument {
  title: string;
  description?: string;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
  category?: 'health' | 'wealth' | 'mastery' | 'connection';
  startDate?: string;
  targetDate?: string;
  completedAt?: string;
  progress?: number;
  linkedGoalIds?: string[];
}

/**
 * Trip document type
 */
export interface Trip extends BaseDocument {
  destination: string;
  startDate: string;
  endDate?: string;
  purpose?: 'leisure' | 'business' | 'family' | 'other';
  status: 'planning' | 'booked' | 'ongoing' | 'completed' | 'cancelled';
  budget?: number;
  currency?: string;
  notes?: string;
  places?: string[];
  accommodations?: Accommodation[];
  flights?: Flight[];
}

export interface Accommodation {
  id: string;
  name: string;
  location: string;
  checkIn: string;
  checkOut: string;
  confirmationNumber?: string;
}

export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  departureAirport: string;
  arrivalAirport: string;
  confirmationNumber?: string;
}

/**
 * Place document type
 */
export interface Place extends BaseDocument {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  category?: string;
  rating?: number;
  notes?: string;
  visited?: boolean;
  visitedAt?: string;
  photos?: string[];
}

/**
 * Relationship document type
 */
export interface Relationship extends BaseDocument {
  name: string;
  relationshipType?: 'family' | 'friend' | 'colleague' | 'mentor' | 'mentee' | 'partner' | 'other';
  connectionStrength?: number; // 1-10
  lastContactDate?: string;
  contactFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  notes?: string;
  birthday?: string;
  interests?: string[];
  goals?: string[];
}

/**
 * Portfolio document type
 */
export interface Portfolio extends BaseDocument {
  name: string;
  description?: string;
  baseCurrency: string;
  investments?: Investment[];
  totalValue?: number;
  totalCost?: number;
  totalReturn?: number;
  totalReturnPercent?: number;
}

export interface Investment {
  id: string;
  ticker: string;
  name?: string;
  assetType: 'stock' | 'etf' | 'crypto' | 'bond' | 'mutual_fund' | 'other';
  shares: number;
  avgCost: number;
  currency: string;
  currentPrice?: number;
  currentValue?: number;
  return?: number;
  returnPercent?: number;
}

/**
 * Photo Library document type
 */
export interface PhotoLibraryItem extends BaseDocument {
  filename: string;
  storagePath: string;
  thumbnailPath?: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  tags?: string[];
  caption?: string;
  takenAt?: string;
  location?: {
    lat: number;
    lng: number;
  };
  eloRating?: number;
  votesReceived?: number;
}

/**
 * Packing List document type
 */
export interface PackingList extends BaseDocument {
  tripId: string;
  name: string;
  items: PackingItem[];
  categories?: string[];
  template?: string;
}

export interface PackingItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  packed: boolean;
  essential?: boolean;
  notes?: string;
}

/**
 * Entity Graph Relationship type
 */
export interface EntityRelationship extends BaseDocument {
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  relationshipType: string;
  metadata?: Record<string, unknown>;
}

/**
 * Subscription metadata type (from Firestore events)
 */
export interface SubscriptionMeta {
  fromCache: boolean;
  hasPendingWrites?: boolean;
  error?: Error | null;
}

/**
 * Change event type for SSE subscriptions
 */
export interface ChangeEvent<T> {
  type: 'added' | 'modified' | 'removed';
  docId: string;
  data?: T;
  timestamp: number;
}

/**
 * Multi-collection change event
 */
export interface MultiCollectionChangeEvent<T> extends ChangeEvent<T> {
  collection: string;
}
