/**
 * Cloud Functions for Trip Packing Lists
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { CONFIG } from './config';

const db = admin.firestore();

// Import packing list templates and builders
import {
  PACKING_SECTIONS,
  PURPOSE_ENHANCEMENTS,
  ACTIVITY_ENHANCEMENTS,
  TRIP_LENGTH_ENHANCEMENTS,
  BASE_TIMELINE,
} from './packingListTemplates';

import type {
  PackingList,
  PackingSection,
  CustomItemsState,
  PackingSectionId,
  PackingItemStatus,
  CreatePackingListRequest,
  CreatePackingListResponse,
  UpdatePackingListRequest,
  UpdatePackingListResponse,
  AddCustomItemRequest,
  AddCustomItemResponse,
  DeleteCustomItemRequest,
  DeleteCustomItemResponse,
  DeletePackingListRequest,
  DeletePackingListResponse,
  TogglePackedRequest,
  TogglePackedResponse,
  SetItemStatusRequest,
  SetItemStatusResponse,
  TimelinePhase,
  TimelinePhaseId,
  PackingGroup,
  PackingItem,
  TripPurpose,
  TripLength,
  ActivityId,
  AccommodationType,
  DestinationInsights,
  GenerateAIPackingListRequest,
  GenerateAIPackingListResponse,
} from './types/packingList';

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  status: 'planning' | 'in-progress' | 'completed';
  notes?: string;
  // Packing list context
  purpose?: TripPurpose;
  length?: TripLength;
  activities?: ActivityId[];
  accommodation?: AccommodationType;
}

// Prompt configuration interface
interface PromptConfig {
  name: string;
  model: string;
  modelParameters: {
    temperature: number;
    max_tokens: number;
  };
  messages: Array<{
    role: string;
    content: string;
  }>;
}

// AI Response interface
interface AIPackingListResponse {
  sections: PackingSection[];
  destinationInsights?: DestinationInsights;
  durationStrategy?: string;
}

const PROMPT_FILE_NAME = 'generate-packing-list.prompt.yml';

/**
 * Helper: Resolve prompt file path
 */
function resolvePromptPath(): string {
  const candidatePaths = [
    path.join(__dirname, '../../prompts', PROMPT_FILE_NAME),
    path.join(__dirname, '../../../../prompts', PROMPT_FILE_NAME),
    path.join(process.cwd(), 'prompts', PROMPT_FILE_NAME),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Prompt file "${PROMPT_FILE_NAME}" not found. Checked: ${candidatePaths.join(', ')}`);
}

/**
 * Helper: Load prompt configuration from YAML file
 */
function loadPromptConfig(): PromptConfig {
  const promptPath = resolvePromptPath();
  const fileContents = fs.readFileSync(promptPath, 'utf8');
  return yaml.parse(fileContents);
}

/**
 * Helper: Render template with variable substitution
 */
function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value ?? '');
  });
  return result;
}

/**
 * Helper: Calculate trip duration in days
 */
function calculateDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Helper: Determine season based on date and destination
 */
function determineSeason(startDate: string, destination: string): string {
  const date = new Date(startDate);
  const month = date.getMonth(); // 0-11

  // Simple hemisphere detection based on common destination patterns
  const southernHemisphere = /australia|new zealand|argentina|chile|south africa|brazil|indonesia|bali/i.test(destination);

  // Determine season
  if (southernHemisphere) {
    if (month >= 11 || month <= 1) return 'summer';
    if (month >= 2 && month <= 4) return 'fall';
    if (month >= 5 && month <= 7) return 'winter';
    return 'spring';
  } else {
    if (month >= 11 || month <= 1) return 'winter';
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    return 'fall';
  }
}

/**
 * Helper: Extract JSON from AI response
 */
function extractJsonBlock(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Handle code fences
  const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeFenceMatch && codeFenceMatch[1]) {
    return codeFenceMatch[1].trim();
  }

  // Already JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  // Extract JSON object
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return null;
}

/**
 * Helper: Call OpenAI to generate packing list
 */
async function callOpenAIForPackingList(trip: Trip): Promise<AIPackingListResponse> {
  const promptConfig = loadPromptConfig();

  const durationDays = calculateDurationDays(trip.startDate, trip.endDate);
  const season = determineSeason(trip.startDate, trip.destination);

  const variables: Record<string, string> = {
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    durationDays: String(durationDays),
    season,
    purpose: trip.purpose || 'leisure',
    activities: trip.activities?.join(', ') || 'general sightseeing',
    accommodation: trip.accommodation || 'hotel',
    notes: trip.notes || 'None',
  };

  // Render messages with variables
  const messages = promptConfig.messages.map(msg => ({
    role: msg.role,
    content: renderTemplate(msg.content, variables),
  }));

  // Extract model name (remove provider prefix if present)
  const modelName = promptConfig.model.includes('/')
    ? promptConfig.model.split('/')[1]
    : promptConfig.model;

  // Call OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      temperature: promptConfig.modelParameters.temperature,
      max_tokens: promptConfig.modelParameters.max_tokens,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0]?.message?.content;

  if (!aiResponse) {
    throw new Error('No response from OpenAI');
  }

  // Parse JSON response
  const jsonCandidate = extractJsonBlock(aiResponse);

  if (!jsonCandidate) {
    throw new Error('No JSON block detected in AI response');
  }

  try {
    return JSON.parse(jsonCandidate) as AIPackingListResponse;
  } catch (error) {
    console.error('Failed to parse OpenAI response:', aiResponse);
    throw new Error('Invalid JSON response from OpenAI');
  }
}

/**
 * Helper: Verify user owns the trip
 */
async function verifyTripOwnership(userId: string, tripId: string): Promise<Trip> {
  const tripDoc = await db.doc(`users/${userId}/trips/${tripId}`).get();

  if (!tripDoc.exists) {
    throw new HttpsError('not-found', 'Trip not found');
  }

  return { id: tripDoc.id, ...tripDoc.data() } as Trip;
}

/**
 * Helper: Build packing sections based on trip details
 */
function buildPackingSections(trip: Trip): PackingSection[] {
  const purpose = trip.purpose || 'leisure';
  const length = trip.length || inferTripLength(trip.startDate, trip.endDate);
  const activities = trip.activities || [];

  // Clone base sections
  const sections = PACKING_SECTIONS.map(cloneSection);

  // Apply enhancements
  const purposeEnhancement = PURPOSE_ENHANCEMENTS[purpose];
  if (purposeEnhancement) {
    applyEnhancement(sections, purposeEnhancement);
  }

  activities.forEach((activity) => {
    const activityEnhancement = ACTIVITY_ENHANCEMENTS[activity];
    if (activityEnhancement) {
      applyEnhancement(sections, activityEnhancement);
    }
  });

  const lengthEnhancements = TRIP_LENGTH_ENHANCEMENTS[length] || [];
  lengthEnhancements.forEach((enhancement) => {
    applyEnhancement(sections, enhancement);
  });

  return sections;
}

/**
 * Helper: Build timeline phases based on trip details
 */
function buildTimelinePhases(trip: Trip): TimelinePhase[] {
  const purpose = trip.purpose || 'leisure';
  const length = trip.length || inferTripLength(trip.startDate, trip.endDate);
  const activities = trip.activities || [];

  // Clone base timeline
  const phases = BASE_TIMELINE.map(clonePhase);

  // Apply enhancements
  const purposeEnhancement = PURPOSE_ENHANCEMENTS[purpose];
  if (purposeEnhancement?.timeline) {
    applyTimelineEnhancement(phases, purposeEnhancement.timeline);
  }

  activities.forEach((activity) => {
    const activityEnhancement = ACTIVITY_ENHANCEMENTS[activity];
    if (activityEnhancement?.timeline) {
      applyTimelineEnhancement(phases, activityEnhancement.timeline);
    }
  });

  const lengthEnhancements = TRIP_LENGTH_ENHANCEMENTS[length] || [];
  lengthEnhancements.forEach((enhancement) => {
    if (enhancement.timeline) {
      applyTimelineEnhancement(phases, enhancement.timeline);
    }
  });

  return phases;
}

/**
 * Helper: Infer trip length from dates
 */
function inferTripLength(startDate: string, endDate: string): TripLength {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (days <= 4) return 'weekend';
  if (days <= 10) return 'one-week';
  if (days <= 21) return 'two-week';
  return 'extended';
}

/**
 * Helper: Clone section
 */
function cloneSection(section: PackingSection): PackingSection {
  return {
    ...section,
    groups: section.groups.map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item })),
    })),
  };
}

/**
 * Helper: Clone phase
 */
function clonePhase(phase: TimelinePhase): TimelinePhase {
  return {
    ...phase,
    tasks: phase.tasks.map((task) => ({ ...task })),
  };
}

/**
 * Helper: Apply enhancement to sections
 */
function applyEnhancement(
  sections: PackingSection[],
  enhancement: { sectionId: PackingSectionId; group: PackingGroup }
) {
  const section = sections.find((s) => s.id === enhancement.sectionId);
  if (!section) return;

  const existingGroup = section.groups.find((g) => g.id === enhancement.group.id);

  if (existingGroup) {
    // Merge items
    enhancement.group.items.forEach((item) => {
      if (!existingGroup.items.some((existing) => existing.id === item.id)) {
        existingGroup.items.push({ ...item });
      }
    });
  } else {
    // Add new group
    section.groups.push({
      ...enhancement.group,
      items: enhancement.group.items.map((item) => ({ ...item })),
    });
  }
}

/**
 * Helper: Apply timeline enhancement
 */
function applyTimelineEnhancement(
  phases: TimelinePhase[],
  enhancements: Array<{ phaseId: TimelinePhaseId; tasks: any[] }>
) {
  enhancements.forEach(({ phaseId, tasks }) => {
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) return;

    tasks.forEach((task) => {
      if (!phase.tasks.some((existing) => existing.id === task.id)) {
        phase.tasks.push({ ...task });
      }
    });
  });
}

/**
 * Helper: Create empty custom items state
 */
function createEmptyCustomItems(): CustomItemsState {
  return {
    essentials: [],
    clothing: [],
    personal: [],
    tech: [],
    extras: [],
  };
}

/**
 * Cloud Function: Create a packing list for a trip
 */
export const createPackingList = functions.https.onCall<
  CreatePackingListRequest,
  Promise<CreatePackingListResponse>
>(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tripId } = request.data;

  if (!tripId) {
    throw new HttpsError('invalid-argument', 'tripId is required');
  }

  // Verify trip ownership
  const trip = await verifyTripOwnership(userId, tripId);

  // Check if packing list already exists
  const packingListRef = db.doc(`users/${userId}/trips/${tripId}/packingList/data`);
  const existing = await packingListRef.get();

  if (existing.exists) {
    // Return existing
    return { packingList: existing.data() as PackingList };
  }

  // Build packing list
  const sections = buildPackingSections(trip);
  const timelinePhases = buildTimelinePhases(trip);

  const packingList: PackingList = {
    id: tripId,
    tripId,
    userId,
    sections,
    packedItemIds: [],
    itemStatuses: {},
    customItems: createEmptyCustomItems(),
    timelinePhases,
    timelineCompleted: [],
    aiSuggestions: [],
    createdAt: new Date().toISOString(),
  };

  // Save to Firestore
  await packingListRef.set(packingList);

  return { packingList };
});

/**
 * Cloud Function: Update packing list
 */
export const updatePackingList = functions.https.onCall<
  UpdatePackingListRequest,
  Promise<UpdatePackingListResponse>
>(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tripId, updates } = request.data;

  if (!tripId) {
    throw new HttpsError('invalid-argument', 'tripId is required');
  }

  // Verify trip ownership
  await verifyTripOwnership(userId, tripId);

  // Update packing list
  const packingListRef = db.doc(`users/${userId}/trips/${tripId}/packingList/data`);
  const doc = await packingListRef.get();

  if (!doc.exists) {
    throw new HttpsError('not-found', 'Packing list not found. Create one first.');
  }

  await packingListRef.update({
    ...updates,
    updatedAt: Date.now(),
  });

  return { success: true };
});

/**
 * Cloud Function: Toggle packed status of an item
 */
export const togglePackedItem = functions.https.onCall<
  TogglePackedRequest,
  Promise<TogglePackedResponse>
>(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tripId, itemId, packed } = request.data;

  if (!tripId || !itemId) {
    throw new HttpsError('invalid-argument', 'tripId and itemId are required');
  }

  // Verify trip ownership
  await verifyTripOwnership(userId, tripId);

  // Update packed items
  const packingListRef = db.doc(`users/${userId}/trips/${tripId}/packingList/data`);
  const doc = await packingListRef.get();

  if (!doc.exists) {
    throw new HttpsError('not-found', 'Packing list not found');
  }

  const data = doc.data() as PackingList;
  let packedItemIds = data.packedItemIds || [];

  if (packed) {
    // Add to packed
    if (!packedItemIds.includes(itemId)) {
      packedItemIds.push(itemId);
    }
  } else {
    // Remove from packed
    packedItemIds = packedItemIds.filter((id) => id !== itemId);
  }

  await packingListRef.update({
    packedItemIds,
    updatedAt: Date.now(),
  });

  return { success: true };
});

/**
 * Cloud Function: Set packing item status (new three-state system)
 */
export const setPackingItemStatus = functions.https.onCall<
  SetItemStatusRequest,
  Promise<SetItemStatusResponse>
>(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tripId, itemId, status } = request.data;

  if (!tripId || !itemId || !status) {
    throw new HttpsError('invalid-argument', 'tripId, itemId, and status are required');
  }

  // Validate status
  const validStatuses: PackingItemStatus[] = ['unpacked', 'packed', 'later', 'no-need'];
  if (!validStatuses.includes(status)) {
    throw new HttpsError('invalid-argument', `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Verify trip ownership
  await verifyTripOwnership(userId, tripId);

  // Update item status
  const packingListRef = db.doc(`users/${userId}/trips/${tripId}/packingList/data`);
  const doc = await packingListRef.get();

  if (!doc.exists) {
    throw new HttpsError('not-found', 'Packing list not found');
  }

  const data = doc.data() as PackingList;
  const itemStatuses = data.itemStatuses || {};

  // Update the status
  itemStatuses[itemId] = status;

  // For backward compatibility, also update packedItemIds
  let packedItemIds = data.packedItemIds || [];
  if (status === 'packed') {
    if (!packedItemIds.includes(itemId)) {
      packedItemIds.push(itemId);
    }
  } else {
    packedItemIds = packedItemIds.filter((id) => id !== itemId);
  }

  await packingListRef.update({
    itemStatuses,
    packedItemIds,
    updatedAt: Date.now(),
  });

  return { success: true };
});

/**
 * Cloud Function: Add custom item
 */
export const addCustomPackingItem = functions.https.onCall<
  AddCustomItemRequest,
  Promise<AddCustomItemResponse>
>(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tripId, sectionId, item } = request.data;

  if (!tripId || !sectionId || !item?.name) {
    throw new HttpsError('invalid-argument', 'tripId, sectionId, and item.name are required');
  }

  // Verify trip ownership
  await verifyTripOwnership(userId, tripId);

  // Add custom item
  const packingListRef = db.doc(`users/${userId}/trips/${tripId}/packingList/data`);
  const doc = await packingListRef.get();

  if (!doc.exists) {
    throw new HttpsError('not-found', 'Packing list not found');
  }

  const data = doc.data() as PackingList;
  const customItems = data.customItems || createEmptyCustomItems();

  const itemId = `custom-${sectionId}-${Date.now()}`;
  const newItem: PackingItem = {
    ...item,
    id: itemId,
    custom: true,
  };

  if (!customItems[sectionId]) {
    customItems[sectionId] = [];
  }

  customItems[sectionId].push(newItem);

  await packingListRef.update({
    customItems,
    updatedAt: Date.now(),
  });

  return { itemId };
});

/**
 * Cloud Function: Delete custom item
 */
export const deleteCustomPackingItem = functions.https.onCall<
  DeleteCustomItemRequest,
  Promise<DeleteCustomItemResponse>
>(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tripId, sectionId, itemId } = request.data;

  if (!tripId || !sectionId || !itemId) {
    throw new HttpsError('invalid-argument', 'tripId, sectionId, and itemId are required');
  }

  // Verify trip ownership
  await verifyTripOwnership(userId, tripId);

  // Delete custom item
  const packingListRef = db.doc(`users/${userId}/trips/${tripId}/packingList/data`);
  const doc = await packingListRef.get();

  if (!doc.exists) {
    throw new HttpsError('not-found', 'Packing list not found');
  }

  const data = doc.data() as PackingList;
  const customItems = data.customItems || createEmptyCustomItems();

  if (customItems[sectionId]) {
    customItems[sectionId] = customItems[sectionId].filter((item) => item.id !== itemId);
  }

  // Also remove from packed items if it was packed
  const packedItemIds = (data.packedItemIds || []).filter((id) => id !== itemId);

  await packingListRef.update({
    customItems,
    packedItemIds,
    updatedAt: Date.now(),
  });

  return { success: true };
});

/**
 * Cloud Function: Delete packing list
 */
export const deletePackingList = functions.https.onCall<
  DeletePackingListRequest,
  Promise<DeletePackingListResponse>
>(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tripId } = request.data;

  if (!tripId) {
    throw new HttpsError('invalid-argument', 'tripId is required');
  }

  // Verify trip ownership
  await verifyTripOwnership(userId, tripId);

  // Delete packing list
  const packingListRef = db.doc(`users/${userId}/trips/${tripId}/packingList/data`);
  const doc = await packingListRef.get();

  if (!doc.exists) {
    throw new HttpsError('not-found', 'Packing list not found');
  }

  await packingListRef.delete();

  return { success: true };
});

/**
 * Cloud Function: Generate AI-powered packing list
 * Uses OpenAI to create a personalized packing list based on trip details
 */
export const generatePackingListAI = functions.https.onCall<
  GenerateAIPackingListRequest,
  Promise<GenerateAIPackingListResponse>
>(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tripId, forceRegenerate } = request.data;

  if (!tripId) {
    throw new HttpsError('invalid-argument', 'tripId is required');
  }

  // Verify trip ownership and get trip data
  const trip = await verifyTripOwnership(userId, tripId);

  // Check if packing list already exists
  const packingListRef = db.doc(`users/${userId}/trips/${tripId}/packingList/data`);
  const existing = await packingListRef.get();

  if (existing.exists && !forceRegenerate) {
    // Return existing list
    return { packingList: existing.data() as PackingList };
  }

  // Preserve user data if regenerating
  let preservedData: Partial<PackingList> = {};
  if (existing.exists && forceRegenerate) {
    const existingData = existing.data() as PackingList;
    preservedData = {
      packedItemIds: existingData.packedItemIds,
      itemStatuses: existingData.itemStatuses,
      customItems: existingData.customItems,
      timelineCompleted: existingData.timelineCompleted,
    };
  }

  try {
    // Call OpenAI to generate packing list
    const aiResponse = await callOpenAIForPackingList(trip);

    // Build timeline phases (use template-based for now)
    const timelinePhases = buildTimelinePhases(trip);

    const packingList: PackingList = {
      id: tripId,
      tripId,
      userId,
      sections: aiResponse.sections,
      packedItemIds: preservedData.packedItemIds || [],
      itemStatuses: preservedData.itemStatuses || {},
      customItems: preservedData.customItems || createEmptyCustomItems(),
      timelinePhases,
      timelineCompleted: preservedData.timelineCompleted || [],
      aiSuggestions: [],
      lastAiGeneratedAt: new Date().toISOString(),
      generatedWithAI: true,
      destinationInsights: aiResponse.destinationInsights,
      durationStrategy: aiResponse.durationStrategy,
      createdAt: existing.exists ? (existing.data() as PackingList).createdAt : new Date().toISOString(),
      updatedAt: Date.now(),
    };

    // Save to Firestore
    await packingListRef.set(packingList);

    return { packingList, insights: aiResponse.destinationInsights };
  } catch (error) {
    console.error('AI packing list generation failed, falling back to templates:', error);

    // Fall back to template-based generation
    const sections = buildPackingSections(trip);
    const timelinePhases = buildTimelinePhases(trip);

    const packingList: PackingList = {
      id: tripId,
      tripId,
      userId,
      sections,
      packedItemIds: preservedData.packedItemIds || [],
      itemStatuses: preservedData.itemStatuses || {},
      customItems: preservedData.customItems || createEmptyCustomItems(),
      timelinePhases,
      timelineCompleted: preservedData.timelineCompleted || [],
      aiSuggestions: [],
      createdAt: existing.exists ? (existing.data() as PackingList).createdAt : new Date().toISOString(),
      updatedAt: Date.now(),
    };

    // Save to Firestore
    await packingListRef.set(packingList);

    return { packingList };
  }
});
