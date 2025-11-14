/**
 * Integration tests for refactored stores using createEntityStore factory
 * Tests that the refactored stores maintain backward compatibility and work correctly
 */

import { renderHook, act } from '@testing-library/react';

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
    callback([], { fromCache: false, hasPendingWrites: false, error: null });
    return jest.fn();
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

describe('Refactored Stores Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useGoals Store', () => {
    it('should maintain backward compatibility with old API', async () => {
      const { useGoals } = require('@/store/useGoals');
      const { result } = renderHook(() => useGoals());

      // Check backward compatible properties
      expect(result.current.goals).toBeDefined();
      expect(result.current.subscribe).toBeDefined();
      expect(result.current.add).toBeDefined();
      expect(result.current.update).toBeDefined();
      expect(result.current.delete).toBeDefined();
    });

    it('should create goals with default values', async () => {
      const { useGoals } = require('@/store/useGoals');
      const { result } = renderHook(() => useGoals());

      await act(async () => {
        await result.current.add({
          title: 'Learn TypeScript',
          objective: 'Master TypeScript for better code quality',
          timeframe: 'short-term',
        });
      });

      expect(createAtMock).toHaveBeenCalledWith(
        expect.stringContaining('goals/'),
        expect.objectContaining({
          title: 'Learn TypeScript',
          status: 'active',
          priority: 'medium',
          progress: 0,
        })
      );
    });

    it('should toggle goal status', async () => {
      const { useGoals } = require('@/store/useGoals');

      const mockGoals = [
        {
          id: 'goal-1',
          title: 'Test Goal',
          objective: 'Test',
          timeframe: 'short-term',
          status: 'active',
          priority: 'high',
          createdAt: '2024-01-01',
        },
      ];

      subscribeColMock.mockImplementation((query, callback) => {
        callback(mockGoals, { fromCache: false, hasPendingWrites: false, error: null });
        return jest.fn();
      });

      const { result } = renderHook(() => useGoals());

      act(() => {
        result.current.subscribe('test-user');
      });

      await act(async () => {
        await result.current.toggleStatus('goal-1');
      });

      expect(updateAtMock).toHaveBeenCalledWith(
        expect.stringContaining('goals/goal-1'),
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(String),
          progress: 100,
        })
      );
    });
  });

  describe('useProjects Store', () => {
    it('should maintain backward compatibility', () => {
      const { useProjects } = require('@/store/useProjects');
      const { result } = renderHook(() => useProjects());

      expect(result.current.projects).toBeDefined();
      expect(result.current.subscribe).toBeDefined();
      expect(result.current.add).toBeDefined();
      expect(result.current.update).toBeDefined();
      expect(result.current.delete).toBeDefined();
      expect(result.current.linkThought).toBeDefined();
      expect(result.current.unlinkThought).toBeDefined();
    });

    it('should create projects with default values', async () => {
      const { useProjects } = require('@/store/useProjects');
      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.add({
          title: 'Build App',
          objective: 'Create mobile app',
          actionPlan: ['Step 1', 'Step 2'],
          timeframe: 'long-term',
          category: 'mastery',
        });
      });

      expect(createAtMock).toHaveBeenCalledWith(
        expect.stringContaining('projects/'),
        expect.objectContaining({
          title: 'Build App',
          linkedThoughtIds: [],
          linkedTaskIds: [],
          priority: 'medium',
          status: 'active',
        })
      );
    });

    it('should link and unlink thoughts', async () => {
      const { useProjects } = require('@/store/useProjects');

      const mockProjects = [
        {
          id: 'project-1',
          title: 'Test Project',
          objective: 'Test',
          actionPlan: [],
          timeframe: 'short-term',
          category: 'mastery',
          linkedThoughtIds: [],
          linkedTaskIds: [],
          createdAt: '2024-01-01',
        },
      ];

      subscribeColMock.mockImplementation((query, callback) => {
        callback(mockProjects, { fromCache: false, hasPendingWrites: false, error: null });
        return jest.fn();
      });

      const { result } = renderHook(() => useProjects());

      act(() => {
        result.current.subscribe('test-user');
      });

      // Link thought
      await act(async () => {
        await result.current.linkThought('project-1', 'thought-1');
      });

      expect(updateAtMock).toHaveBeenCalledWith(
        expect.stringContaining('projects/project-1'),
        expect.objectContaining({
          linkedThoughtIds: ['thought-1'],
        })
      );

      // Update mock to reflect linked thought
      mockProjects[0].linkedThoughtIds = ['thought-1'];
      updateAtMock.mockClear();

      // Unlink thought
      await act(async () => {
        await result.current.unlinkThought('project-1', 'thought-1');
      });

      expect(updateAtMock).toHaveBeenCalledWith(
        expect.stringContaining('projects/project-1'),
        expect.objectContaining({
          linkedThoughtIds: [],
        })
      );
    });

    it('should query projects by status', () => {
      const { useProjects } = require('@/store/useProjects');

      const mockProjects = [
        {
          id: '1',
          title: 'Active Project',
          status: 'active',
          timeframe: 'short-term',
          category: 'mastery',
          linkedThoughtIds: [],
          linkedTaskIds: [],
          createdAt: '2024-01-01',
        },
        {
          id: '2',
          title: 'Completed Project',
          status: 'completed',
          timeframe: 'short-term',
          category: 'mastery',
          linkedThoughtIds: [],
          linkedTaskIds: [],
          createdAt: '2024-01-02',
        },
      ];

      subscribeColMock.mockImplementation((query, callback) => {
        callback(mockProjects, { fromCache: false, hasPendingWrites: false, error: null });
        return jest.fn();
      });

      const { result } = renderHook(() => useProjects());

      act(() => {
        result.current.subscribe('test-user');
      });

      const activeProjects = result.current.getProjectsByStatus('active');
      expect(activeProjects).toHaveLength(1);
      expect(activeProjects[0].title).toBe('Active Project');
    });
  });

  describe('useSubscriptions Store', () => {
    it('should maintain backward compatibility', () => {
      const { useSubscriptions } = require('@/store/useSubscriptions');
      const { result } = renderHook(() => useSubscriptions());

      expect(result.current.subscriptions).toBeDefined();
      expect(result.current.subscribe).toBeDefined();
      expect(result.current.add).toBeDefined();
      expect(result.current.update).toBeDefined();
      expect(result.current.delete).toBeDefined();
      expect(result.current.getTotalMonthlyCost).toBeDefined();
      expect(result.current.getTotalYearlyCost).toBeDefined();
    });

    it('should calculate monthly costs correctly', () => {
      const { useSubscriptions } = require('@/store/useSubscriptions');

      const mockSubscriptions = [
        {
          id: '1',
          name: 'Netflix',
          category: 'entertainment',
          cost: 15.99,
          billingCycle: 'monthly',
          status: 'active',
          nextBillingDate: '2024-02-01',
          startDate: '2024-01-01',
          autoRenew: true,
          createdAt: '2024-01-01',
        },
        {
          id: '2',
          name: 'Spotify',
          category: 'entertainment',
          cost: 119.88,
          billingCycle: 'yearly',
          status: 'active',
          nextBillingDate: '2025-01-01',
          startDate: '2024-01-01',
          autoRenew: true,
          createdAt: '2024-01-01',
        },
      ];

      subscribeColMock.mockImplementation((query, callback) => {
        callback(mockSubscriptions, { fromCache: false, hasPendingWrites: false, error: null });
        return jest.fn();
      });

      const { result } = renderHook(() => useSubscriptions());

      act(() => {
        result.current.subscribe('test-user');
      });

      const monthlyCost = result.current.getTotalMonthlyCost();
      expect(monthlyCost).toBeCloseTo(15.99 + 119.88 / 12, 2);
    });
  });

  describe('useAdmiredPeople Store', () => {
    it('should maintain backward compatibility', () => {
      const { useAdmiredPeople } = require('@/store/useAdmiredPeople');
      const { result } = renderHook(() => useAdmiredPeople());

      expect(result.current.people).toBeDefined();
      expect(result.current.subscribe).toBeDefined();
      expect(result.current.add).toBeDefined();
      expect(result.current.update).toBeDefined();
      expect(result.current.delete).toBeDefined();
      expect(result.current.getByCategory).toBeDefined();
      expect(result.current.getByTag).toBeDefined();
    });

    it('should create admired people with default aiEnriched flag', async () => {
      const { useAdmiredPeople } = require('@/store/useAdmiredPeople');
      const { result } = renderHook(() => useAdmiredPeople());

      await act(async () => {
        await result.current.add({
          name: 'Elon Musk',
          category: 'entrepreneur',
        });
      });

      expect(createAtMock).toHaveBeenCalledWith(
        expect.stringContaining('admiredPeople/'),
        expect.objectContaining({
          name: 'Elon Musk',
          aiEnriched: false,
        })
      );
    });

    it('should filter by category and tags', () => {
      const { useAdmiredPeople } = require('@/store/useAdmiredPeople');

      const mockPeople = [
        {
          id: '1',
          name: 'Elon Musk',
          category: 'entrepreneur',
          tags: ['tech', 'space'],
          createdAt: '2024-01-01',
        },
        {
          id: '2',
          name: 'Steve Jobs',
          category: 'entrepreneur',
          tags: ['tech', 'design'],
          createdAt: '2024-01-02',
        },
        {
          id: '3',
          name: 'Albert Einstein',
          category: 'scientist',
          tags: ['physics'],
          createdAt: '2024-01-03',
        },
      ];

      subscribeColMock.mockImplementation((query, callback) => {
        callback(mockPeople, { fromCache: false, hasPendingWrites: false, error: null });
        return jest.fn();
      });

      const { result } = renderHook(() => useAdmiredPeople());

      act(() => {
        result.current.subscribe('test-user');
      });

      const entrepreneurs = result.current.getByCategory('entrepreneur');
      expect(entrepreneurs).toHaveLength(2);

      const techPeople = result.current.getByTag('tech');
      expect(techPeople).toHaveLength(2);
    });
  });

  describe('useRelationships Store', () => {
    it('should maintain backward compatibility', () => {
      const { useRelationships } = require('@/store/useRelationships');
      const { result } = renderHook(() => useRelationships());

      expect(result.current.people).toBeDefined();
      expect(result.current.subscribe).toBeDefined();
      expect(result.current.add).toBeDefined();
      expect(result.current.update).toBeDefined();
      expect(result.current.delete).toBeDefined();
      expect(result.current.linkThought).toBeDefined();
      expect(result.current.unlinkThought).toBeDefined();
      expect(result.current.addInteractionLog).toBeDefined();
    });

    it('should create relationships with default values', async () => {
      const { useRelationships } = require('@/store/useRelationships');
      const { result } = renderHook(() => useRelationships());

      await act(async () => {
        await result.current.add({
          name: 'John Doe',
          relationshipType: 'friend',
          connectionStrength: 8,
          trustLevel: 9,
        });
      });

      expect(createAtMock).toHaveBeenCalledWith(
        expect.stringContaining('people/'),
        expect.objectContaining({
          name: 'John Doe',
          linkedThoughtIds: [],
          version: 1,
        })
      );
    });

    it('should add interaction logs', async () => {
      const { useRelationships } = require('@/store/useRelationships');

      const mockPeople = [
        {
          id: 'person-1',
          name: 'John Doe',
          relationshipType: 'friend',
          connectionStrength: 8,
          trustLevel: 9,
          linkedThoughtIds: [],
          interactionLogs: [],
          createdAt: '2024-01-01',
        },
      ];

      subscribeColMock.mockImplementation((query, callback) => {
        callback(mockPeople, { fromCache: false, hasPendingWrites: false, error: null });
        return jest.fn();
      });

      const { result } = renderHook(() => useRelationships());

      act(() => {
        result.current.subscribe('test-user');
      });

      await act(async () => {
        await result.current.addInteractionLog('person-1', {
          date: '2024-01-15',
          type: 'meeting',
          summary: 'Coffee catch-up',
          mood: 9,
        });
      });

      expect(updateAtMock).toHaveBeenCalledWith(
        expect.stringContaining('people/person-1'),
        expect.objectContaining({
          interactionLogs: expect.arrayContaining([
            expect.objectContaining({
              date: '2024-01-15',
              type: 'meeting',
              summary: 'Coffee catch-up',
              mood: 9,
            }),
          ]),
          lastInteraction: '2024-01-15',
        })
      );
    });
  });

  describe('Cross-Store Consistency', () => {
    it('should use consistent patterns across all stores', () => {
      const { useGoals } = require('@/store/useGoals');
      const { useProjects } = require('@/store/useProjects');
      const { useSubscriptions } = require('@/store/useSubscriptions');

      const { result: goalsResult } = renderHook(() => useGoals());
      const { result: projectsResult } = renderHook(() => useProjects());
      const { result: subscriptionsResult } = renderHook(() => useSubscriptions());

      // All should have consistent base properties
      const baseProperties = ['items', 'isLoading', 'fromCache', 'hasPendingWrites', 'syncError'];
      const baseMethods = ['subscribe', 'add', 'update', 'delete', 'getById'];

      for (const store of [goalsResult, projectsResult, subscriptionsResult]) {
        for (const prop of baseProperties) {
          expect(store.current).toHaveProperty(prop);
        }
        for (const method of baseMethods) {
          expect(store.current).toHaveProperty(method);
          expect(typeof store.current[method as keyof typeof store.current]).toBe('function');
        }
      }
    });
  });
});
