import { renderHook, act } from '@testing-library/react';
import { createEntityStore, BaseEntity } from '@/store/createEntityStore';

// Mock Firebase dependencies
jest.mock('@/lib/firebaseClient', () => ({
  auth: { currentUser: { uid: 'test-user-id' } },
  db: {},
}));

jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn().mockResolvedValue(undefined),
  updateAt: jest.fn().mockResolvedValue(undefined),
  deleteAt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/data/subscribe', () => ({
  subscribeCol: jest.fn((query, callback) => {
    // Immediately call with empty data
    callback([], { fromCache: false, hasPendingWrites: false, error: null as Error | null });
    return jest.fn(); // Return unsubscribe function
  }),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
}));

import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';

const createAtMock = jest.mocked(createAt);
const updateAtMock = jest.mocked(updateAt);
const deleteAtMock = jest.mocked(deleteAt);
const subscribeColMock = jest.mocked(subscribeCol);

interface TestEntity extends BaseEntity {
  name: string;
  value: number;
  status?: string;
}

describe('createEntityStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic CRUD Operations', () => {
    it('should create a store with initial state', () => {
      const useTestStore = createEntityStore<TestEntity>({
        collectionName: 'testEntities',
      });

      const { result } = renderHook(() => useTestStore());

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.fromCache).toBe(false);
      expect(result.current.hasPendingWrites).toBe(false);
      expect(result.current.syncError).toBe(null);
      expect(result.current.unsubscribe).toBe(null);
    });

    it('should subscribe to collection and update state', () => {
      const useTestStore = createEntityStore<TestEntity>({
        collectionName: 'testEntities',
      });

      const testData: TestEntity[] = [
        { id: '1', name: 'Test 1', value: 10, createdAt: '2024-01-01' },
        { id: '2', name: 'Test 2', value: 20, createdAt: '2024-01-02' },
      ];

      subscribeColMock.mockImplementation((query, callback) => {
        callback(testData, { fromCache: false, hasPendingWrites: false, error: null as Error | null });
        return jest.fn();
      });

      const { result } = renderHook(() => useTestStore());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.items).toEqual(testData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.fromCache).toBe(false);
    });

    it('should add a new entity', async () => {
      const useTestStore = createEntityStore<TestEntity>({
        collectionName: 'testEntities',
        defaultValues: { status: 'active' },
      });

      const { result } = renderHook(() => useTestStore());

      const newEntity = { name: 'New Test', value: 30 };

      let entityId: string = '';
      await act(async () => {
        entityId = await result.current.add(newEntity);
      });

      expect(entityId).toBeTruthy();
      expect(createAtMock).toHaveBeenCalledWith(
        expect.stringContaining('users/test-user-id/testEntities/'),
        expect.objectContaining({
          name: 'New Test',
          value: 30,
          status: 'active',
          id: expect.any(String),
          createdAt: expect.any(String),
        })
      );
    });

    it('should update an entity', async () => {
      const useTestStore = createEntityStore<TestEntity>({
        collectionName: 'testEntities',
      });

      const { result } = renderHook(() => useTestStore());

      await act(async () => {
        await result.current.update('test-id', { name: 'Updated Name' });
      });

      expect(updateAtMock).toHaveBeenCalledWith(
        'users/test-user-id/testEntities/test-id',
        expect.objectContaining({
          name: 'Updated Name',
          updatedAt: expect.any(Number),
        })
      );
    });

    it('should delete an entity', async () => {
      const useTestStore = createEntityStore<TestEntity>({
        collectionName: 'testEntities',
      });

      const { result } = renderHook(() => useTestStore());

      await act(async () => {
        await result.current.delete('test-id');
      });

      expect(deleteAtMock).toHaveBeenCalledWith('users/test-user-id/testEntities/test-id');
    });

    it('should get entity by id', () => {
      const useTestStore = createEntityStore<TestEntity>({
        collectionName: 'testEntities',
      });

      const testData: TestEntity[] = [
        { id: '1', name: 'Test 1', value: 10, createdAt: '2024-01-01' },
        { id: '2', name: 'Test 2', value: 20, createdAt: '2024-01-02' },
      ];

      subscribeColMock.mockImplementation((query, callback) => {
        callback(testData, { fromCache: false, hasPendingWrites: false, error: null as Error | null });
        return jest.fn();
      });

      const { result } = renderHook(() => useTestStore());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      const entity = result.current.getById('1');
      expect(entity).toEqual(testData[0]);

      const nonExistent = result.current.getById('999');
      expect(nonExistent).toBeUndefined();
    });
  });

  describe('Configuration Options', () => {
    it('should apply default values when creating entities', async () => {
      const useTestStore = createEntityStore<TestEntity>({
        collectionName: 'testEntities',
        defaultValues: {
          status: 'active',
          value: 0,
        } as Partial<TestEntity>,
      });

      const { result } = renderHook(() => useTestStore());

      await act(async () => {
        await result.current.add({ name: 'Test' });
      });

      expect(createAtMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: 'Test',
          status: 'active',
          value: 0,
        })
      );
    });

    it('should apply beforeCreate transformation', async () => {
      const useTestStore = createEntityStore<TestEntity>({
        collectionName: 'testEntities',
        beforeCreate: (data) => ({
          value: (data as any).value * 2,
        }),
      });

      const { result } = renderHook(() => useTestStore());

      await act(async () => {
        await result.current.add({ name: 'Test', value: 10 });
      });

      expect(createAtMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: 'Test',
          value: 20, // Doubled by beforeCreate
        })
      );
    });

    it('should apply beforeUpdate transformation', async () => {
      const useTestStore = createEntityStore<TestEntity>({
        collectionName: 'testEntities',
        beforeUpdate: (id, updates) => ({
          status: 'modified',
        }),
      });

      const { result } = renderHook(() => useTestStore());

      await act(async () => {
        await result.current.update('test-id', { name: 'Updated' });
      });

      expect(updateAtMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: 'Updated',
          status: 'modified',
          updatedAt: expect.any(Number),
        })
      );
    });

    it('should call onSubscriptionData callback', () => {
      const onSubscriptionData = jest.fn();
      const testData: TestEntity[] = [
        { id: '1', name: 'Test 1', value: 10, createdAt: '2024-01-01' },
      ];

      subscribeColMock.mockImplementation((query, callback) => {
        callback(testData, { fromCache: false, hasPendingWrites: false, error: null as Error | null });
        return jest.fn();
      });

      const useTestStore = createEntityStore<TestEntity>({
        collectionName: 'testEntities',
        onSubscriptionData,
      });

      const { result } = renderHook(() => useTestStore());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(onSubscriptionData).toHaveBeenCalledWith(testData, 'test-user-id');
    });
  });

  describe('Extra Actions', () => {
    it('should support custom actions via extraActions parameter', () => {
      const useTestStore = createEntityStore<TestEntity>(
        {
          collectionName: 'testEntities',
        },
        (set, get) => ({
          getActiveItems: () => {
            return get().items.filter((item) => item.status === 'active');
          },
          getTotalValue: () => {
            return get().items.reduce((sum, item) => sum + item.value, 0);
          },
        })
      );

      const testData: TestEntity[] = [
        { id: '1', name: 'Test 1', value: 10, status: 'active', createdAt: '2024-01-01' },
        { id: '2', name: 'Test 2', value: 20, status: 'inactive', createdAt: '2024-01-02' },
        { id: '3', name: 'Test 3', value: 30, status: 'active', createdAt: '2024-01-03' },
      ];

      subscribeColMock.mockImplementation((query, callback) => {
        callback(testData, { fromCache: false, hasPendingWrites: false, error: null as Error | null });
        return jest.fn();
      });

      const { result } = renderHook(() => useTestStore());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.getActiveItems()).toHaveLength(2);
      expect(result.current.getTotalValue()).toBe(60);
    });
  });

  describe('Error Handling', () => {
    it('should handle subscription errors', () => {
      const testError = new Error('Subscription failed');

      subscribeColMock.mockImplementation((query, callback) => {
        callback([], { fromCache: false, hasPendingWrites: false, error: testError });
        return jest.fn();
      });

      const useTestStore = createEntityStore<TestEntity>({
        collectionName: 'testEntities',
      });

      const { result } = renderHook(() => useTestStore());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.syncError).toBe(testError);
      expect(result.current.isLoading).toBe(false);
    });

    it('should throw error when not authenticated', async () => {
      // Mock unauthenticated state
      jest.resetModules();
      jest.doMock('@/lib/firebaseClient', () => ({
        auth: { currentUser: null },
        db: {},
      }));

      const { createEntityStore: createEntityStoreUnauth } = require('@/store/createEntityStore');

      const useTestStore = createEntityStoreUnauth<TestEntity>({
        collectionName: 'testEntities',
      });

      const { result } = renderHook(() => useTestStore());

      await expect(async () => {
        await act(async () => {
          await result.current.add({ name: 'Test', value: 10 });
        });
      }).rejects.toThrow('Not authenticated');
    });
  });

  describe('Unsubscribe Handling', () => {
    it('should call previous unsubscribe when subscribing again', () => {
      const unsubscribe1 = jest.fn();
      const unsubscribe2 = jest.fn();

      subscribeColMock
        .mockImplementationOnce((query, callback) => {
          callback([], { fromCache: false, hasPendingWrites: false, error: null as Error | null });
          return unsubscribe1;
        })
        .mockImplementationOnce((query, callback) => {
          callback([], { fromCache: false, hasPendingWrites: false, error: null as Error | null });
          return unsubscribe2;
        });

      const useTestStore = createEntityStore<TestEntity>({
        collectionName: 'testEntities',
      });

      const { result } = renderHook(() => useTestStore());

      act(() => {
        result.current.subscribe('user1');
      });

      expect(unsubscribe1).not.toHaveBeenCalled();

      act(() => {
        result.current.subscribe('user2');
      });

      expect(unsubscribe1).toHaveBeenCalledTimes(1);
    });
  });

  describe('Real-world Store Examples', () => {
    it('should work like useGoals store', () => {
      interface Goal extends BaseEntity {
        title: string;
        status: 'active' | 'completed';
        priority: 'high' | 'medium' | 'low';
      }

      const useGoals = createEntityStore<Goal>(
        {
          collectionName: 'goals',
          defaultValues: {
            status: 'active',
            priority: 'medium',
          } as Partial<Goal>,
        },
        (set, get) => ({
          get goals() {
            return get().items;
          },
          toggleStatus: async (id: string) => {
            const goal = get().items.find((g) => g.id === id);
            if (!goal) return;
            const newStatus = goal.status === 'completed' ? 'active' : 'completed';
            await get().update(id, { status: newStatus });
          },
        })
      );

      const testGoals: Goal[] = [
        {
          id: '1',
          title: 'Learn TypeScript',
          status: 'active',
          priority: 'high',
          createdAt: '2024-01-01',
        },
      ];

      subscribeColMock.mockImplementation((query, callback) => {
        callback(testGoals, { fromCache: false, hasPendingWrites: false, error: null as Error | null });
        return jest.fn();
      });

      const { result } = renderHook(() => useGoals());

      act(() => {
        result.current.subscribe('test-user');
      });

      expect(result.current.goals).toEqual(testGoals);
      expect(result.current.goals[0].status).toBe('active');

      act(() => {
        result.current.toggleStatus('1');
      });

      expect(updateAtMock).toHaveBeenCalledWith(
        expect.stringContaining('goals/1'),
        expect.objectContaining({
          status: 'completed',
        })
      );
    });
  });
});
