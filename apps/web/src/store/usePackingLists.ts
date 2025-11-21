/**
 * Zustand Store for Trip Packing Lists
 */

import { create } from 'zustand';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functionsClient } from '@/lib/firebaseClient';
import type { Unsubscribe } from 'firebase/firestore';

import type {
  PackingList,
  PackingItem,
  PackingSectionId,
  PackingItemStatus,
  CustomItemsState,
  AISuggestion,
  CreatePackingListRequest,
  CreatePackingListResponse,
  UpdatePackingListRequest,
  UpdatePackingListResponse,
  TogglePackedRequest,
  TogglePackedResponse,
  SetItemStatusRequest,
  SetItemStatusResponse,
  AddCustomItemRequest,
  AddCustomItemResponse,
  DeleteCustomItemRequest,
  DeleteCustomItemResponse,
  DeletePackingListRequest,
  DeletePackingListResponse,
} from '@/types/packing-list';

interface PackingListsState {
  // State: Map of tripId -> PackingList
  packingLists: Map<string, PackingList>;
  isLoading: Map<string, boolean>; // Loading state per trip
  subscriptions: Map<string, Unsubscribe>; // Active subscriptions per trip

  // Actions
  subscribe: (userId: string, tripId: string) => () => void;
  unsubscribe: (tripId: string) => void;
  createPackingList: (tripId: string) => Promise<PackingList>;
  deletePackingList: (tripId: string) => Promise<void>;
  togglePacked: (tripId: string, itemId: string, packed: boolean) => Promise<void>;
  setItemStatus: (tripId: string, itemId: string, status: PackingItemStatus) => Promise<void>;
  addCustomItem: (tripId: string, sectionId: PackingSectionId, item: Omit<PackingItem, 'id'>) => Promise<string>;
  deleteCustomItem: (tripId: string, sectionId: PackingSectionId, itemId: string) => Promise<void>;
  toggleTimelineTask: (tripId: string, taskId: string) => Promise<void>;
  updateCustomItems: (tripId: string, customItems: CustomItemsState) => Promise<void>;

  // Utility methods
  getPackingList: (tripId: string) => PackingList | undefined;
  getProgress: (tripId: string) => { total: number; packed: number; percentage: number };
  isLoadingList: (tripId: string) => boolean;
}

export const usePackingLists = create<PackingListsState>((set, get) => ({
  packingLists: new Map(),
  isLoading: new Map(),
  subscriptions: new Map(),

  subscribe: (userId: string, tripId: string) => {
    // Check if already subscribed
    const existing = get().subscriptions.get(tripId);
    if (existing) {
      return existing;
    }

    // Set loading state
    set((state) => {
      const newLoading = new Map(state.isLoading);
      newLoading.set(tripId, true);
      return { isLoading: newLoading };
    });

    // Subscribe to packing list document
    const packingListRef = doc(db, `users/${userId}/trips/${tripId}/packingList/data`);

    const unsubscribe = onSnapshot(
      packingListRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const packingList = snapshot.data() as PackingList;

          set((state) => {
            const newLists = new Map(state.packingLists);
            const newLoading = new Map(state.isLoading);

            newLists.set(tripId, packingList);
            newLoading.set(tripId, false);

            return { packingLists: newLists, isLoading: newLoading };
          });
        } else {
          // Packing list doesn't exist yet
          set((state) => {
            const newLoading = new Map(state.isLoading);
            newLoading.set(tripId, false);
            return { isLoading: newLoading };
          });
        }
      },
      (error) => {
        console.error('Error subscribing to packing list:', error);
        set((state) => {
          const newLoading = new Map(state.isLoading);
          newLoading.set(tripId, false);
          return { isLoading: newLoading };
        });
      }
    );

    // Store unsubscribe function
    set((state) => {
      const newSubscriptions = new Map(state.subscriptions);
      newSubscriptions.set(tripId, unsubscribe);
      return { subscriptions: newSubscriptions };
    });

    return unsubscribe;
  },

  unsubscribe: (tripId: string) => {
    const unsubscribe = get().subscriptions.get(tripId);
    if (unsubscribe) {
      unsubscribe();

      set((state) => {
        const newSubscriptions = new Map(state.subscriptions);
        const newLists = new Map(state.packingLists);
        const newLoading = new Map(state.isLoading);

        newSubscriptions.delete(tripId);
        newLists.delete(tripId);
        newLoading.delete(tripId);

        return {
          subscriptions: newSubscriptions,
          packingLists: newLists,
          isLoading: newLoading,
        };
      });
    }
  },

  createPackingList: async (tripId: string) => {
    const createFn = httpsCallable<CreatePackingListRequest, CreatePackingListResponse>(
      functionsClient,
      'createPackingList'
    );

    const result = await createFn({ tripId });
    return result.data.packingList;
  },

  deletePackingList: async (tripId: string) => {
    const deleteFn = httpsCallable<DeletePackingListRequest, DeletePackingListResponse>(
      functionsClient,
      'deletePackingList'
    );

    await deleteFn({ tripId });

    // Remove from local state
    set((state) => {
      const newLists = new Map(state.packingLists);
      newLists.delete(tripId);
      return { packingLists: newLists };
    });
  },

  togglePacked: async (tripId: string, itemId: string, packed: boolean) => {
    const toggleFn = httpsCallable<TogglePackedRequest, TogglePackedResponse>(
      functionsClient,
      'togglePackedItem'
    );

    await toggleFn({ tripId, itemId, packed });
  },

  setItemStatus: async (tripId: string, itemId: string, status: PackingItemStatus) => {
    const setStatusFn = httpsCallable<SetItemStatusRequest, SetItemStatusResponse>(
      functionsClient,
      'setPackingItemStatus'
    );

    await setStatusFn({ tripId, itemId, status });
  },

  addCustomItem: async (
    tripId: string,
    sectionId: PackingSectionId,
    item: Omit<PackingItem, 'id'>
  ) => {
    const addFn = httpsCallable<AddCustomItemRequest, AddCustomItemResponse>(
      functionsClient,
      'addCustomPackingItem'
    );

    const result = await addFn({ tripId, sectionId, item });
    return result.data.itemId;
  },

  deleteCustomItem: async (tripId: string, sectionId: PackingSectionId, itemId: string) => {
    const deleteFn = httpsCallable<DeleteCustomItemRequest, DeleteCustomItemResponse>(
      functionsClient,
      'deleteCustomPackingItem'
    );

    await deleteFn({ tripId, sectionId, itemId });
  },

  toggleTimelineTask: async (tripId: string, taskId: string) => {
    const packingList = get().getPackingList(tripId);
    if (!packingList) throw new Error('Packing list not found');

    const timelineCompleted = packingList.timelineCompleted || [];
    const newCompleted = timelineCompleted.includes(taskId)
      ? timelineCompleted.filter((id) => id !== taskId)
      : [...timelineCompleted, taskId];

    const updateFn = httpsCallable<UpdatePackingListRequest, UpdatePackingListResponse>(
      functionsClient,
      'updatePackingList'
    );

    await updateFn({
      tripId,
      updates: { timelineCompleted: newCompleted },
    });
  },

  updateCustomItems: async (tripId: string, customItems: CustomItemsState) => {
    const updateFn = httpsCallable<UpdatePackingListRequest, UpdatePackingListResponse>(
      functionsClient,
      'updatePackingList'
    );

    await updateFn({
      tripId,
      updates: { customItems },
    });
  },

  getPackingList: (tripId: string) => {
    return get().packingLists.get(tripId);
  },

  getProgress: (tripId: string) => {
    const packingList = get().getPackingList(tripId);

    if (!packingList) {
      return { total: 0, packed: 0, percentage: 0 };
    }

    // Count total items from sections
    let totalItems = 0;
    packingList.sections.forEach((section) => {
      section.groups.forEach((group) => {
        totalItems += group.items.length;
      });
    });

    // Count custom items
    if (packingList.customItems) {
      Object.values(packingList.customItems).forEach((items) => {
        totalItems += items.length;
      });
    }

    // Count packed items - support both old and new format
    let packedCount = 0;
    if (packingList.itemStatuses) {
      // New format: count items with status 'packed'
      packedCount = Object.values(packingList.itemStatuses).filter(
        (status) => status === 'packed'
      ).length;
    } else {
      // Fallback to old format
      packedCount = packingList.packedItemIds?.length || 0;
    }

    const percentage = totalItems === 0 ? 0 : Math.round((packedCount / totalItems) * 100);

    return {
      total: totalItems,
      packed: packedCount,
      percentage,
    };
  },

  isLoadingList: (tripId: string) => {
    return get().isLoading.get(tripId) || false;
  },
}));
