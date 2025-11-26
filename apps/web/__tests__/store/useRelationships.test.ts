import { renderHook, act } from '@testing-library/react';
import { useRelationships, Person } from '@/store/useRelationships';

jest.mock('@/lib/firebaseClient', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } },
}));

jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn().mockResolvedValue(undefined),
  updateAt: jest.fn().mockResolvedValue(undefined),
  deleteAt: jest.fn().mockResolvedValue(undefined),
  setAt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/data/subscribe', () => ({
  subscribeCol: jest.fn((query, callback) => {
    callback([], { fromCache: false, hasPendingWrites: false });
    return jest.fn();
  }),
}));

const { createAt: mockCreateAt, updateAt: mockUpdateAt, deleteAt: mockDeleteAt } = require('@/lib/data/gateway') as {
  createAt: jest.Mock;
  updateAt: jest.Mock;
  deleteAt: jest.Mock;
};

const { subscribeCol: mockSubscribeCol } = require('@/lib/data/subscribe') as {
  subscribeCol: jest.Mock;
};

const resetStore = () => {
  useRelationships.setState({
    people: [],
    loading: false,
    error: null,
  });
};

describe('useRelationships store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('add', () => {
    it('should add a new person', async () => {
      const { result } = renderHook(() => useRelationships());

      await act(async () => {
        await result.current.add({
          name: 'John Doe',
          relationshipType: 'friend',
          connectionStrength: 8,
          trustLevel: 9,
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.stringMatching(/users\/test-user-id\/people\/.+/),
        expect.objectContaining({
          name: 'John Doe',
          relationshipType: 'friend',
          connectionStrength: 8,
          trustLevel: 9,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          updatedBy: 'test-user-id',
          version: 1,
        })
      );
    });

    it('should return person ID', async () => {
      const { result } = renderHook(() => useRelationships());

      let personId: string = '';
      await act(async () => {
        personId = await result.current.add({
          name: 'Jane Smith',
          relationshipType: 'colleague',
          connectionStrength: 6,
          trustLevel: 7,
        });
      });

      expect(personId).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it('should include optional fields when provided', async () => {
      const { result } = renderHook(() => useRelationships());

      await act(async () => {
        await result.current.add({
          name: 'Bob Johnson',
          relationshipType: 'family',
          connectionStrength: 10,
          trustLevel: 10,
          contactInfo: {
            email: 'bob@example.com',
            phone: '555-1234',
          },
          tags: ['important', 'family'],
          notes: 'My brother',
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          contactInfo: {
            email: 'bob@example.com',
            phone: '555-1234',
          },
          tags: ['important', 'family'],
          notes: 'My brother',
        })
      );
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useRelationships());

      await expect(
        act(async () => {
          await result.current.add({
            name: 'Test',
            relationshipType: 'friend',
            connectionStrength: 5,
            trustLevel: 5,
          });
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('update', () => {
    it('should update a person', async () => {
      const { result } = renderHook(() => useRelationships());

      await act(async () => {
        await result.current.update('person-1', {
          name: 'Updated Name',
          connectionStrength: 9,
        });
      });

      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/people/person-1', {
        name: 'Updated Name',
        connectionStrength: 9,
      });
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useRelationships());

      await expect(
        act(async () => {
          await result.current.update('person-1', { name: 'New Name' });
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('delete', () => {
    it('should delete a person', async () => {
      const { result } = renderHook(() => useRelationships());

      await act(async () => {
        await result.current.delete('person-1');
      });

      expect(mockDeleteAt).toHaveBeenCalledWith('users/test-user-id/people/person-1');
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useRelationships());

      await expect(
        act(async () => {
          await result.current.delete('person-1');
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('addInteractionLog', () => {
    it('should add interaction log to person', async () => {
      const person: Person = {
        id: 'person-1',
        name: 'Test Person',
        relationshipType: 'friend',
        connectionStrength: 8,
        trustLevel: 9,
        createdAt: '2024-01-01T00:00:00.000Z',
        interactionLogs: [],
      };

      useRelationships.setState({ people: [person] });
      const { result } = renderHook(() => useRelationships());

      await act(async () => {
        await result.current.addInteractionLog('person-1', {
          date: '2024-01-15',
          type: 'meeting',
          summary: 'Had coffee',
          mood: 8,
        });
      });

      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/people/person-1', {
        interactionLogs: [
          expect.objectContaining({
            date: '2024-01-15',
            type: 'meeting',
            summary: 'Had coffee',
            mood: 8,
            id: expect.any(String),
          }),
        ],
        lastInteraction: '2024-01-15',
      });
    });

    it('should append to existing interaction logs', async () => {
      const person: Person = {
        id: 'person-1',
        name: 'Test Person',
        relationshipType: 'friend',
        connectionStrength: 8,
        trustLevel: 9,
        createdAt: '2024-01-01T00:00:00.000Z',
        interactionLogs: [
          {
            id: 'log-1',
            date: '2024-01-01',
            type: 'call',
            summary: 'First call',
          },
        ],
      };

      useRelationships.setState({ people: [person] });
      const { result } = renderHook(() => useRelationships());

      await act(async () => {
        await result.current.addInteractionLog('person-1', {
          date: '2024-01-15',
          type: 'message',
          summary: 'Sent text',
        });
      });

      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/people/person-1', {
        interactionLogs: [
          {
            id: 'log-1',
            date: '2024-01-01',
            type: 'call',
            summary: 'First call',
          },
          expect.objectContaining({
            date: '2024-01-15',
            type: 'message',
            summary: 'Sent text',
            id: expect.any(String),
          }),
        ],
        lastInteraction: '2024-01-15',
      });
    });

    it('should handle missing person gracefully', async () => {
      useRelationships.setState({ people: [] });
      const { result } = renderHook(() => useRelationships());

      await act(async () => {
        await result.current.addInteractionLog('nonexistent', {
          date: '2024-01-15',
          type: 'meeting',
          summary: 'Test',
        });
      });

      expect(mockUpdateAt).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should initialize subscription', () => {
      const { result } = renderHook(() => useRelationships());

      let unsubscribe: (() => void) | undefined;
      act(() => {
        unsubscribe = result.current.subscribe('test-user-id');
      });

      expect(mockSubscribeCol).toHaveBeenCalled();
      expect(unsubscribe).toBeDefined();
    });

    it('should update people from subscription callback', () => {
      const testPeople: Person[] = [
        {
          id: 'person-1',
          name: 'Test Person',
          relationshipType: 'friend',
          connectionStrength: 8,
          trustLevel: 9,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testPeople);
        return jest.fn();
      });

      const { result } = renderHook(() => useRelationships());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.people).toEqual(testPeople);
      expect(result.current.loading).toBe(false);
    });

    it('should handle missing db', () => {
      const { db } = require('@/lib/firebaseClient');
      const originalDb = db;
      require('@/lib/firebaseClient').db = null;

      const { result } = renderHook(() => useRelationships());

      let unsubscribe: (() => void) | undefined;
      act(() => {
        unsubscribe = result.current.subscribe('test-user-id');
      });

      expect(unsubscribe).toBeUndefined();
      require('@/lib/firebaseClient').db = originalDb;
    });

    it('should handle missing userId', () => {
      const { result } = renderHook(() => useRelationships());

      let unsubscribe: (() => void) | undefined;
      act(() => {
        unsubscribe = result.current.subscribe('');
      });

      expect(unsubscribe).toBeUndefined();
    });
  });
});
