import { renderHook, act } from '@testing-library/react';
import { useProjects, Project } from '@/store/useProjects';

jest.mock('@/lib/firebaseClient', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } },
}));

jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn().mockResolvedValue(undefined),
  updateAt: jest.fn().mockResolvedValue(undefined),
  deleteAt: jest.fn().mockResolvedValue(undefined),
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
  useProjects.setState({
    projects: [],
    isLoading: true,
    fromCache: false,
    hasPendingWrites: false,
    unsubscribe: null,
  });
};

describe('useProjects store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    jest.spyOn(Date, 'now').mockReturnValue(1234567890000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('subscribe', () => {
    it('should initialize subscription', () => {
      const { result } = renderHook(() => useProjects());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(mockSubscribeCol).toHaveBeenCalled();
    });

    it('should unsubscribe from previous subscription', () => {
      const unsubscribeMock = jest.fn();
      mockSubscribeCol.mockReturnValue(unsubscribeMock);

      const { result } = renderHook(() => useProjects());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should update projects from subscription callback', () => {
      const testProjects: Project[] = [
        {
          id: 'project-1',
          title: 'Build Web App',
          objective: 'Create a production app',
          actionPlan: ['Design', 'Develop', 'Deploy'],
          timeframe: 'long-term',
          status: 'active',
          priority: 'high',
          category: 'mastery',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testProjects, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useProjects());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.projects).toEqual(testProjects);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('add', () => {
    it('should add a new project with defaults', async () => {
      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.add({
          title: 'New Project',
          objective: 'Complete something',
          actionPlan: ['Step 1', 'Step 2'],
          timeframe: 'short-term',
          category: 'wealth',
          status: 'active',
          priority: 'medium',
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        'users/test-user-id/projects/1234567890000',
        expect.objectContaining({
          title: 'New Project',
          objective: 'Complete something',
          timeframe: 'short-term',
          category: 'wealth',
          status: 'active',
          priority: 'medium',
          createdAt: expect.any(String),
        })
      );
    });

    it('should use default values for optional fields', async () => {
      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.add({
          title: 'Project without defaults',
          objective: 'Test',
          actionPlan: [],
          timeframe: 'short-term',
          category: 'mastery',
        } as any);
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: 'active',
          priority: 'medium',
        })
      );
    });

    it('should return project ID', async () => {
      const { result } = renderHook(() => useProjects());

      let projectId: string = '';
      await act(async () => {
        projectId = await result.current.add({
          title: 'Test',
          objective: 'Test',
          actionPlan: [],
          timeframe: 'short-term',
          status: 'active',
          priority: 'medium',
          category: 'health',
        });
      });

      expect(projectId).toBe('1234567890000');
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useProjects());

      await expect(
        act(async () => {
          await result.current.add({
            title: 'Test',
            objective: 'Test',
            actionPlan: [],
            timeframe: 'short-term',
            status: 'active',
            priority: 'medium',
            category: 'mastery',
          });
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('update', () => {
    it('should update project with timestamp', async () => {
      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.update('project-1', {
          title: 'Updated Title',
          progress: 50,
        });
      });

      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/projects/project-1', {
        title: 'Updated Title',
        progress: 50,
        updatedAt: 1234567890000,
      });
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useProjects());

      await expect(
        act(async () => {
          await result.current.update('project-1', { title: 'New Title' });
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('delete', () => {
    it('should delete a project', async () => {
      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.delete('project-1');
      });

      expect(mockDeleteAt).toHaveBeenCalledWith('users/test-user-id/projects/project-1');
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useProjects());

      await expect(
        act(async () => {
          await result.current.delete('project-1');
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('getProjectsByStatus', () => {
    it('should filter projects by status', () => {
      const projects: Project[] = [
        { id: 'p1', title: 'Active', objective: '', actionPlan: [], timeframe: 'short-term', status: 'active', priority: 'high', category: 'mastery', createdAt: '2024-01-01' },
        { id: 'p2', title: 'Completed', objective: '', actionPlan: [], timeframe: 'short-term', status: 'completed', priority: 'medium', category: 'wealth', createdAt: '2024-01-02' },
        { id: 'p3', title: 'On Hold', objective: '', actionPlan: [], timeframe: 'long-term', status: 'on-hold', priority: 'low', category: 'health', createdAt: '2024-01-03' },
      ];

      useProjects.setState({ projects });
      const { result } = renderHook(() => useProjects());

      expect(result.current.getProjectsByStatus('active')).toHaveLength(1);
      expect(result.current.getProjectsByStatus('completed')).toHaveLength(1);
      expect(result.current.getProjectsByStatus('on-hold')).toHaveLength(1);
      expect(result.current.getProjectsByStatus('cancelled')).toHaveLength(0);
    });
  });

  describe('getProjectsByTimeframe', () => {
    it('should filter projects by timeframe', () => {
      const projects: Project[] = [
        { id: 'p1', title: 'Short', objective: '', actionPlan: [], timeframe: 'short-term', status: 'active', priority: 'high', category: 'mastery', createdAt: '2024-01-01' },
        { id: 'p2', title: 'Long', objective: '', actionPlan: [], timeframe: 'long-term', status: 'active', priority: 'medium', category: 'wealth', createdAt: '2024-01-02' },
      ];

      useProjects.setState({ projects });
      const { result } = renderHook(() => useProjects());

      expect(result.current.getProjectsByTimeframe('short-term')).toHaveLength(1);
      expect(result.current.getProjectsByTimeframe('long-term')).toHaveLength(1);
    });
  });

  describe('getProjectsByGoal', () => {
    it('should filter top-level projects by goal ID', () => {
      const projects: Project[] = [
        { id: 'p1', title: 'Project 1', objective: '', actionPlan: [], goalId: 'goal-1', timeframe: 'short-term', status: 'active', priority: 'high', category: 'mastery', createdAt: '2024-01-01' },
        { id: 'p2', title: 'Sub-project', objective: '', actionPlan: [], goalId: 'goal-1', parentProjectId: 'p1', timeframe: 'short-term', status: 'active', priority: 'medium', category: 'mastery', createdAt: '2024-01-02' },
        { id: 'p3', title: 'Project 3', objective: '', actionPlan: [], goalId: 'goal-2', timeframe: 'long-term', status: 'active', priority: 'low', category: 'wealth', createdAt: '2024-01-03' },
      ];

      useProjects.setState({ projects });
      const { result } = renderHook(() => useProjects());

      const goal1Projects = result.current.getProjectsByGoal('goal-1');
      expect(goal1Projects).toHaveLength(1);
      expect(goal1Projects[0].id).toBe('p1');
    });
  });

  describe('getSubProjects', () => {
    it('should return sub-projects of a project', () => {
      const projects: Project[] = [
        { id: 'p1', title: 'Parent', objective: '', actionPlan: [], timeframe: 'long-term', status: 'active', priority: 'high', category: 'mastery', createdAt: '2024-01-01' },
        { id: 'p2', title: 'Child 1', objective: '', actionPlan: [], parentProjectId: 'p1', timeframe: 'short-term', status: 'active', priority: 'medium', category: 'mastery', createdAt: '2024-01-02' },
        { id: 'p3', title: 'Child 2', objective: '', actionPlan: [], parentProjectId: 'p1', timeframe: 'short-term', status: 'active', priority: 'medium', category: 'mastery', createdAt: '2024-01-03' },
        { id: 'p4', title: 'Other', objective: '', actionPlan: [], timeframe: 'short-term', status: 'active', priority: 'low', category: 'wealth', createdAt: '2024-01-04' },
      ];

      useProjects.setState({ projects });
      const { result } = renderHook(() => useProjects());

      const subProjects = result.current.getSubProjects('p1');
      expect(subProjects).toHaveLength(2);
      expect(subProjects[0].id).toBe('p2');
      expect(subProjects[1].id).toBe('p3');
    });
  });

  describe('getTopLevelProjects', () => {
    it('should return only top-level projects', () => {
      const projects: Project[] = [
        { id: 'p1', title: 'Top 1', objective: '', actionPlan: [], timeframe: 'long-term', status: 'active', priority: 'high', category: 'mastery', createdAt: '2024-01-01' },
        { id: 'p2', title: 'Child', objective: '', actionPlan: [], parentProjectId: 'p1', timeframe: 'short-term', status: 'active', priority: 'medium', category: 'mastery', createdAt: '2024-01-02' },
        { id: 'p3', title: 'Top 2', objective: '', actionPlan: [], timeframe: 'short-term', status: 'active', priority: 'low', category: 'wealth', createdAt: '2024-01-03' },
      ];

      useProjects.setState({ projects });
      const { result } = renderHook(() => useProjects());

      const topLevel = result.current.getTopLevelProjects();
      expect(topLevel).toHaveLength(2);
      expect(topLevel[0].id).toBe('p1');
      expect(topLevel[1].id).toBe('p3');
    });
  });

  describe('getProjectHierarchy', () => {
    it('should return project hierarchy from root to target', () => {
      const projects: Project[] = [
        { id: 'p1', title: 'Root', objective: '', actionPlan: [], timeframe: 'long-term', status: 'active', priority: 'high', category: 'mastery', createdAt: '2024-01-01' },
        { id: 'p2', title: 'Level 1', objective: '', actionPlan: [], parentProjectId: 'p1', timeframe: 'short-term', status: 'active', priority: 'medium', category: 'mastery', createdAt: '2024-01-02' },
        { id: 'p3', title: 'Level 2', objective: '', actionPlan: [], parentProjectId: 'p2', timeframe: 'short-term', status: 'active', priority: 'low', category: 'mastery', createdAt: '2024-01-03' },
      ];

      useProjects.setState({ projects });
      const { result } = renderHook(() => useProjects());

      const hierarchy = result.current.getProjectHierarchy('p3');
      expect(hierarchy).toHaveLength(3);
      expect(hierarchy[0].id).toBe('p1');
      expect(hierarchy[1].id).toBe('p2');
      expect(hierarchy[2].id).toBe('p3');
    });

    it('should return single item for top-level project', () => {
      const projects: Project[] = [
        { id: 'p1', title: 'Top', objective: '', actionPlan: [], timeframe: 'short-term', status: 'active', priority: 'high', category: 'mastery', createdAt: '2024-01-01' },
      ];

      useProjects.setState({ projects });
      const { result } = renderHook(() => useProjects());

      const hierarchy = result.current.getProjectHierarchy('p1');
      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0].id).toBe('p1');
    });

    it('should return empty array for non-existent project', () => {
      useProjects.setState({ projects: [] });
      const { result } = renderHook(() => useProjects());

      const hierarchy = result.current.getProjectHierarchy('nonexistent');
      expect(hierarchy).toHaveLength(0);
    });
  });

  describe('isLeafProject', () => {
    it('should return true for project with no sub-projects', () => {
      const projects: Project[] = [
        { id: 'p1', title: 'Leaf', objective: '', actionPlan: [], timeframe: 'short-term', status: 'active', priority: 'high', category: 'mastery', createdAt: '2024-01-01' },
      ];

      useProjects.setState({ projects });
      const { result } = renderHook(() => useProjects());

      expect(result.current.isLeafProject('p1')).toBe(true);
    });

    it('should return false for project with sub-projects', () => {
      const projects: Project[] = [
        { id: 'p1', title: 'Parent', objective: '', actionPlan: [], timeframe: 'long-term', status: 'active', priority: 'high', category: 'mastery', createdAt: '2024-01-01' },
        { id: 'p2', title: 'Child', objective: '', actionPlan: [], parentProjectId: 'p1', timeframe: 'short-term', status: 'active', priority: 'medium', category: 'mastery', createdAt: '2024-01-02' },
      ];

      useProjects.setState({ projects });
      const { result } = renderHook(() => useProjects());

      expect(result.current.isLeafProject('p1')).toBe(false);
    });

    it('should return false for non-existent project', () => {
      useProjects.setState({ projects: [] });
      const { result } = renderHook(() => useProjects());

      expect(result.current.isLeafProject('nonexistent')).toBe(false);
    });

    it('should respect explicit isLeaf flag', () => {
      const projects: Project[] = [
        { id: 'p1', title: 'Parent', objective: '', actionPlan: [], isLeaf: true, timeframe: 'long-term', status: 'active', priority: 'high', category: 'mastery', createdAt: '2024-01-01' },
      ];

      useProjects.setState({ projects });
      const { result } = renderHook(() => useProjects());

      expect(result.current.isLeafProject('p1')).toBe(true);
    });
  });
});
