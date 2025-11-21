/**
 * Cloud Functions for Trip Packing Lists
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

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
  CreatePackingListRequest,
  CreatePackingListResponse,
  UpdatePackingListRequest,
  UpdatePackingListResponse,
  AddCustomItemRequest,
  AddCustomItemResponse,
  DeleteCustomItemRequest,
  DeleteCustomItemResponse,
  TogglePackedRequest,
  TogglePackedResponse,
  TimelinePhase,
  TimelinePhaseId,
  PackingGroup,
  PackingItem,
  TripPurpose,
  TripLength,
  ActivityId,
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
  // Inferred from packing list tool
  purpose?: TripPurpose;
  length?: TripLength;
  activities?: ActivityId[];
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
  return 'two-week';
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
