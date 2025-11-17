import { create } from 'zustand';
import { collection, query, orderBy, Query } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';

/**
 * Base entity interface that all entities must extend
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: number;
}

/**
 * Base state interface for all entity stores
 */
export interface BaseState<T extends BaseEntity> {
  items: T[];
  isLoading: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  syncError: Error | null;
  unsubscribe: (() => void) | null;
}

/**
 * Base actions interface for all entity stores
 */
export interface BaseActions<T extends BaseEntity, TCreate = Omit<T, 'id' | 'createdAt'>> {
  subscribe: (userId: string) => void;
  add: (data: TCreate) => Promise<string>;
  update: (id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  getById: (id: string) => T | undefined;
}

/**
 * Configuration for creating an entity store
 */
export interface EntityStoreConfig<T extends BaseEntity, TCreate = Omit<T, 'id' | 'createdAt'>> {
  /** Collection name in Firestore (e.g., 'goals', 'tasks', 'projects') */
  collectionName: string;

  /** Default values to merge when creating a new entity */
  defaultValues?: Partial<T>;

  /** Custom query builder (optional) - defaults to orderBy('createdAt', 'desc') */
  queryBuilder?: (userId: string) => Query<T>;

  /** Transform data before creating (optional) - can be async */
  beforeCreate?: (data: TCreate) => Partial<T> | Promise<Partial<T>>;

  /** Transform data before updating (optional) - can be async */
  beforeUpdate?: (id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>) => Partial<T> | Promise<Partial<T>>;

  /** Callback after subscription data is received (optional) */
  onSubscriptionData?: (items: T[], userId: string) => void | Promise<void>;
}

/**
 * Creates a Zustand store for managing Firebase entities with standardized CRUD operations
 *
 * @example
 * ```ts
 * export const useGoals = createEntityStore<Goal>({
 *   collectionName: 'goals',
 *   defaultValues: { status: 'active', priority: 'medium', progress: 0 },
 *   // Optional: Transform data before creating (supports async)
 *   beforeCreate: async (data) => ({
 *     updatedBy: auth.currentUser?.uid,
 *   }),
 * });
 * ```
 */
export function createEntityStore<
  T extends BaseEntity,
  TCreate = Omit<T, 'id' | 'createdAt'>,
  TExtraActions = {}
>(
  config: EntityStoreConfig<T, TCreate>,
  extraActions?: (
    set: (partial: Partial<BaseState<T> & BaseActions<T, TCreate> & TExtraActions>) => void,
    get: () => BaseState<T> & BaseActions<T, TCreate> & TExtraActions
  ) => TExtraActions
) {
  type State = BaseState<T> & BaseActions<T, TCreate> & TExtraActions;

  return create<State>((set, get) => {
    const baseActions: BaseActions<T, TCreate> = {
      subscribe: (userId: string) => {
        // Unsubscribe from previous subscription if any
        const currentUnsub = get().unsubscribe;
        if (currentUnsub) {
          currentUnsub();
        }

        try {
          // Build query - use custom query builder or default orderBy
          const entityQuery = config.queryBuilder
            ? config.queryBuilder(userId)
            : query(
                collection(db, `users/${userId}/${config.collectionName}`) as any,
                orderBy('createdAt', 'desc')
              );

          // Subscribe to collection
          const unsub = subscribeCol<T>(entityQuery as any, async (items, meta) => {
            set({
              items,
              isLoading: false,
              fromCache: meta.fromCache,
              hasPendingWrites: meta.hasPendingWrites,
              syncError: meta.error || null,
            } as Partial<State>);

            // Log sync errors
            if (meta.error) {
              console.error(`[${config.collectionName}] Sync error:`, meta.error);
            }

            // Call optional callback
            if (config.onSubscriptionData && !meta.fromCache) {
              await config.onSubscriptionData(items, userId);
            }
          });

          set({ unsubscribe: unsub, isLoading: true, syncError: null } as Partial<State>);
        } catch (error) {
          console.error(`[${config.collectionName}] Failed to set up subscription:`, error);
          set({
            isLoading: false,
            syncError: error as Error,
          } as Partial<State>);
        }
      },

      add: async (data: TCreate) => {
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Not authenticated');

        // Generate unique ID
        const entityId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Apply transformations (await in case it returns a Promise)
        const transformed = config.beforeCreate ? await config.beforeCreate(data) : {};

        // Build new entity
        const newEntity = {
          ...(config.defaultValues || {}),
          ...data,
          ...transformed,
          id: entityId,
          createdAt: new Date().toISOString(),
        } as unknown as T;

        await createAt(`users/${userId}/${config.collectionName}/${entityId}`, newEntity);
        return entityId;
      },

      update: async (id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>) => {
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Not authenticated');

        // Apply transformations (await in case it returns a Promise)
        const transformed = config.beforeUpdate ? await config.beforeUpdate(id, updates) : {};

        await updateAt(`users/${userId}/${config.collectionName}/${id}`, {
          ...updates,
          ...transformed,
          updatedAt: Date.now(),
        });
      },

      delete: async (id: string) => {
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Not authenticated');

        await deleteAt(`users/${userId}/${config.collectionName}/${id}`);
      },

      getById: (id: string) => {
        return get().items.find((item) => item.id === id);
      },
    };

    // Merge base state, base actions, and extra actions
    const baseState: BaseState<T> = {
      items: [],
      isLoading: true,
      fromCache: false,
      hasPendingWrites: false,
      syncError: null,
      unsubscribe: null,
    };

    const extras = extraActions ? extraActions(set, get) : ({} as TExtraActions);

    // Create the state object and properly merge getters
    const state = {
      ...baseState,
      ...baseActions,
    } as State;

    // Properly copy extra actions including getters
    if (extras) {
      Object.keys(extras).forEach((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(extras, key);
        if (descriptor) {
          Object.defineProperty(state, key, descriptor);
        }
      });
    }

    return state;
  });
}
