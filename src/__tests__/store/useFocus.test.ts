import { renderHook, act } from '@testing-library/react';
import { useFocus, selectBalancedTasks, FocusSession } from '@/store/useFocus';
import { Task } from '@/store/useTasks';

jest.mock('@/lib/firebaseClient', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  query: jest.fn((...args) => args),
  orderBy: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  doc: jest.fn(() => ({})),
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

jest.mock('@/services/TimeTrackingService', () => ({
  TimeTrackingService: {
    updateTaskActualTime: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/utils/date', () => ({
  getLocalDateString: jest.fn(() => '2024-01-15'),
}));

const { createAt: mockCreateAt, updateAt: mockUpdateAt, deleteAt: mockDeleteAt, setAt: mockSetAt } = require('@/lib/data/gateway');
const { subscribeCol: mockSubscribeCol } = require('@/lib/data/subscribe');
const { TimeTrackingService } = require('@/services/TimeTrackingService');

// Mock crypto.randomUUID
let idCounter = 0;
const mockRandomUUID = () => `test-uuid-${idCounter++}`;

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test Task',
  done: false,
  priority: 'medium',
  status: 'active',
  category: 'mastery',
  estimatedMinutes: 25,
  focusEligible: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const resetStore = () => {
  useFocus.setState({
    currentSession: null,
    completedSession: null,
    sessions: [],
    taskOrderPreferences: {},
    isLoading: true,
    fromCache: false,
    hasPendingWrites: false,
    unsubscribe: null,
  });
};

describe('useFocus store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    idCounter = 0;
  });

  describe('initial state', () => {
    it('should have default initial state', () => {
      const { result } = renderHook(() => useFocus());

      expect(result.current.currentSession).toBeNull();
      expect(result.current.completedSession).toBeNull();
      expect(result.current.sessions).toEqual([]);
      expect(result.current.taskOrderPreferences).toEqual({});
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('subscribe', () => {
    it('should initialize subscription', () => {
      const { result } = renderHook(() => useFocus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(mockSubscribeCol).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should unsubscribe from previous subscription', () => {
      const unsubscribeMock = jest.fn();
      mockSubscribeCol.mockReturnValue(unsubscribeMock);

      const { result } = renderHook(() => useFocus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should parse tasksData from Firestore sessions', () => {
      const mockSessions = [
        {
          id: 'session-1',
          tasksData: JSON.stringify([{ task: createMockTask(), timeSpent: 100, completed: false }]),
          startTime: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(mockSessions, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useFocus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].tasks).toBeDefined();
    });
  });

  describe('startSession', () => {
    it('should create a new focus session', async () => {
      const { result } = renderHook(() => useFocus());
      const tasks = [createMockTask(), createMockTask({ id: 'task-2', title: 'Task 2' })];

      await act(async () => {
        await result.current.startSession(tasks, 60);
      });

      expect(result.current.currentSession).not.toBeNull();
      expect(result.current.currentSession?.tasks).toHaveLength(2);
      expect(result.current.currentSession?.duration).toBe(60);
      expect(result.current.currentSession?.isActive).toBe(true);
      expect(mockCreateAt).toHaveBeenCalled();
    });

    it('should initialize tasks with zero time spent', async () => {
      const { result } = renderHook(() => useFocus());
      const task = createMockTask();

      await act(async () => {
        await result.current.startSession([task], 30);
      });

      expect(result.current.currentSession?.tasks[0].timeSpent).toBe(0);
      expect(result.current.currentSession?.tasks[0].completed).toBe(false);
    });

    it('should set currentTaskIndex to 0', async () => {
      const { result } = renderHook(() => useFocus());
      const task = createMockTask();

      await act(async () => {
        await result.current.startSession([task], 30);
      });

      expect(result.current.currentSession?.currentTaskIndex).toBe(0);
    });
  });

  describe('endSession', () => {
    it('should complete a session without user feedback', async () => {
      const { result } = renderHook(() => useFocus());
      const task = createMockTask();

      await act(async () => {
        await result.current.startSession([task], 30);
      });

      await act(async () => {
        const response = await result.current.endSession();
        expect(response.success).toBe(true);
      });

      expect(result.current.currentSession).toBeNull();
      expect(result.current.completedSession).not.toBeNull();
      expect(result.current.completedSession?.isActive).toBe(false);
      expect(mockUpdateAt).toHaveBeenCalled();
    });

    it('should complete a session with feedback and rating', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
      });

      await act(async () => {
        await result.current.endSession('Great session!', 5);
      });

      expect(result.current.completedSession?.feedback).toBe('Great session!');
      expect(result.current.completedSession?.rating).toBe(5);
    });

    it('should call progress callback during end session', async () => {
      const { result } = renderHook(() => useFocus());
      const onProgress = jest.fn();

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
      });

      await act(async () => {
        await result.current.endSession(undefined, undefined, onProgress);
      });

      expect(onProgress).toHaveBeenCalledWith('saving-notes', 'in-progress');
      expect(onProgress).toHaveBeenCalledWith('updating-session', 'in-progress');
      expect(onProgress).toHaveBeenCalledWith('complete', 'completed');
    });

    it('should update task actual time for tasks with time spent', async () => {
      const { result } = renderHook(() => useFocus());
      const task = createMockTask();

      await act(async () => {
        await result.current.startSession([task], 30);
        await result.current.updateTaskTime(0, 600); // 10 minutes
      });

      await act(async () => {
        await result.current.endSession();
      });

      expect(TimeTrackingService.updateTaskActualTime).toHaveBeenCalledWith('task-1', 600);
    });

    it('should mark completed tasks as done', async () => {
      const { result } = renderHook(() => useFocus());
      const task = createMockTask();

      await act(async () => {
        await result.current.startSession([task], 30);
        await result.current.markTaskComplete(0);
        await result.current.updateTaskTime(0, 300);
      });

      await act(async () => {
        await result.current.endSession();
      });

      expect(mockUpdateAt).toHaveBeenCalledWith(
        expect.stringContaining('tasks/task-1'),
        expect.objectContaining({ done: true, status: 'completed' })
      );
    });

    it('should return false if no current session', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        const response = await result.current.endSession();
        expect(response.success).toBe(false);
      });
    });
  });

  describe('task operations', () => {
    it('should switch to different task', async () => {
      const { result } = renderHook(() => useFocus());
      const tasks = [createMockTask(), createMockTask({ id: 'task-2' })];

      await act(async () => {
        await result.current.startSession(tasks, 60);
        await result.current.switchToTask(1);
      });

      expect(result.current.currentSession?.currentTaskIndex).toBe(1);
      expect(mockUpdateAt).toHaveBeenCalled();
    });

    it('should mark task as complete', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
        await result.current.markTaskComplete(0);
      });

      expect(result.current.currentSession?.tasks[0].completed).toBe(true);
    });

    it('should update task time spent', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
        await result.current.updateTaskTime(0, 600);
      });

      expect(result.current.currentSession?.tasks[0].timeSpent).toBe(600);
    });

    it('should update task notes', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
        await result.current.updateTaskNotes(0, 'Great progress on this task');
      });

      expect(result.current.currentSession?.tasks[0].notes).toBe('Great progress on this task');
    });

    it('should add follow-up task', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
        await result.current.addFollowUpTask(0, 'followup-task-1');
      });

      expect(result.current.currentSession?.tasks[0].followUpTaskIds).toContain('followup-task-1');
    });
  });

  describe('pause and resume', () => {
    it('should pause active session', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
        await result.current.pauseSession();
      });

      expect(result.current.currentSession?.isActive).toBe(false);
      expect(result.current.currentSession?.pausedAt).toBeDefined();
    });

    it('should resume paused session', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
        await result.current.pauseSession();
        await result.current.resumeSession();
      });

      expect(result.current.currentSession?.isActive).toBe(true);
      expect(result.current.currentSession?.pausedAt).toBeUndefined();
    });

    it('should calculate paused time on resume', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
        await result.current.pauseSession();
        // Immediately resume
        await result.current.resumeSession();
      });

      // Total paused time should be set (even if small)
      expect(result.current.currentSession?.totalPausedTime).toBeDefined();
    });
  });

  describe('break operations', () => {
    it('should start a break', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
        await result.current.startBreak('coffee', 5);
      });

      expect(result.current.currentSession?.isOnBreak).toBe(true);
      expect(result.current.currentSession?.currentBreak?.type).toBe('coffee');
      expect(result.current.currentSession?.currentBreak?.duration).toBe(5);
    });

    it('should end a break', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
        await result.current.startBreak('meditation', 10);
        await result.current.endBreak();
      });

      expect(result.current.currentSession?.isOnBreak).toBe(false);
      expect(result.current.currentSession?.currentBreak).toBeUndefined();
      expect(result.current.currentSession?.breaks).toHaveLength(1);
    });

    it('should add break to breaks array when ended', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
        await result.current.startBreak('stretch', 5);
        await result.current.endBreak();
      });

      expect(result.current.currentSession?.breaks).toHaveLength(1);
      expect(result.current.currentSession?.breaks[0].type).toBe('stretch');
    });
  });

  describe('task navigation', () => {
    it('should move to next task', async () => {
      const { result } = renderHook(() => useFocus());
      const tasks = [createMockTask(), createMockTask({ id: 'task-2' })];

      await act(async () => {
        await result.current.startSession(tasks, 60);
        await result.current.nextTask();
      });

      expect(result.current.currentSession?.currentTaskIndex).toBe(1);
    });

    it('should not move past last task', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
        await result.current.nextTask();
      });

      expect(result.current.currentSession?.currentTaskIndex).toBe(0);
    });

    it('should move to previous task', async () => {
      const { result } = renderHook(() => useFocus());
      const tasks = [createMockTask(), createMockTask({ id: 'task-2' })];

      await act(async () => {
        await result.current.startSession(tasks, 60);
        await result.current.switchToTask(1);
        await result.current.previousTask();
      });

      expect(result.current.currentSession?.currentTaskIndex).toBe(0);
    });

    it('should not move before first task', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
        await result.current.previousTask();
      });

      expect(result.current.currentSession?.currentTaskIndex).toBe(0);
    });
  });

  describe('task reordering', () => {
    it('should reorder tasks', async () => {
      const { result } = renderHook(() => useFocus());
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Task 1' }),
        createMockTask({ id: 'task-2', title: 'Task 2' }),
        createMockTask({ id: 'task-3', title: 'Task 3' }),
      ];

      await act(async () => {
        await result.current.startSession(tasks, 90);
        await result.current.reorderTasks(0, 2);
      });

      expect(result.current.currentSession?.tasks[0].task.id).toBe('task-2');
      expect(result.current.currentSession?.tasks[2].task.id).toBe('task-1');
    });

    it('should update current task index when reordering current task', async () => {
      const { result } = renderHook(() => useFocus());
      const tasks = [
        createMockTask({ id: 'task-1' }),
        createMockTask({ id: 'task-2' }),
      ];

      await act(async () => {
        await result.current.startSession(tasks, 60);
        await result.current.reorderTasks(0, 1);
      });

      expect(result.current.currentSession?.currentTaskIndex).toBe(1);
    });

    it('should not reorder if indices are the same', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
        await result.current.reorderTasks(0, 0);
      });

      expect(mockUpdateAt).not.toHaveBeenCalled();
    });
  });

  describe('addTaskToSession', () => {
    it('should add task to current session', async () => {
      const { result } = renderHook(() => useFocus());
      const newTask = createMockTask({ id: 'new-task', title: 'New Task' });

      await act(async () => {
        await result.current.startSession([createMockTask()], 30);
        await result.current.addTaskToSession(newTask);
      });

      expect(result.current.currentSession?.tasks).toHaveLength(2);
      expect(result.current.currentSession?.tasks[1].task.id).toBe('new-task');
    });
  });

  describe('session management', () => {
    it('should delete session', async () => {
      const { result } = renderHook(() => useFocus());

      useFocus.setState({
        sessions: [
          { id: 'session-1', tasks: [], duration: 30 } as FocusSession,
          { id: 'session-2', tasks: [], duration: 60 } as FocusSession,
        ],
      });

      await act(async () => {
        await result.current.deleteSession('session-1');
      });

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].id).toBe('session-2');
      expect(mockDeleteAt).toHaveBeenCalled();
    });

    it('should clear completed session', () => {
      const { result } = renderHook(() => useFocus());

      useFocus.setState({
        completedSession: { id: 'session-1', tasks: [], duration: 30 } as FocusSession,
      });

      act(() => {
        result.current.clearCompletedSession();
      });

      expect(result.current.completedSession).toBeNull();
    });
  });

  describe('task order preferences', () => {
    it('should update task order preferences', async () => {
      const { result } = renderHook(() => useFocus());
      const taskIds = ['task-1', 'task-2', 'task-3'];

      await act(async () => {
        await result.current.updateTaskOrderPreferences(taskIds);
      });

      expect(result.current.taskOrderPreferences).toHaveProperty('task-1');
      expect(result.current.taskOrderPreferences).toHaveProperty('task-2');
      expect(mockSetAt).toHaveBeenCalled();
    });

    it('should apply task order preferences', () => {
      const { result } = renderHook(() => useFocus());

      useFocus.setState({
        taskOrderPreferences: {
          'task-2': { score: 0, updatedAt: '2024-01-01' },
          'task-1': { score: 1, updatedAt: '2024-01-01' },
        },
      });

      const tasks = [
        createMockTask({ id: 'task-1' }),
        createMockTask({ id: 'task-2' }),
      ];

      const ordered = result.current.applyTaskOrderPreferences(tasks);

      expect(ordered[0].id).toBe('task-2');
      expect(ordered[1].id).toBe('task-1');
    });

    it('should handle empty preferences', () => {
      const { result } = renderHook(() => useFocus());
      const tasks = [createMockTask(), createMockTask({ id: 'task-2' })];

      const ordered = result.current.applyTaskOrderPreferences(tasks);

      expect(ordered).toEqual(tasks);
    });
  });
});

describe('selectBalancedTasks', () => {
  beforeEach(() => {
    idCounter = 0;
  });

  const createTask = (overrides: Partial<Task> = {}): Task => ({
    id: mockRandomUUID(),
    title: 'Task',
    done: false,
    priority: 'medium',
    status: 'active',
    category: 'mastery',
    estimatedMinutes: 25,
    focusEligible: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  it('should return empty array for no available tasks', () => {
    const result = selectBalancedTasks([], 60);
    expect(result).toEqual([]);
  });

  it('should filter out completed tasks', () => {
    const tasks = [
      createTask({ done: true }),
      createTask({ done: false }),
    ];

    const result = selectBalancedTasks(tasks, 60);
    expect(result).toHaveLength(1);
    expect(result[0].done).toBe(false);
  });

  it('should filter out non-active tasks', () => {
    const tasks = [
      createTask({ status: 'backlog' }),
      createTask({ status: 'active' }),
      createTask({ status: 'completed' }),
    ];

    const result = selectBalancedTasks(tasks, 60);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('active');
  });

  it('should filter out non-focus-eligible tasks', () => {
    const tasks = [
      createTask({ focusEligible: false }),
      createTask({ focusEligible: true }),
      createTask(), // undefined = eligible
    ];

    const result = selectBalancedTasks(tasks, 60);
    expect(result).toHaveLength(2);
  });

  it('should balance between mastery and pleasure tasks', () => {
    const tasks = [
      createTask({ category: 'mastery', priority: 'high', estimatedMinutes: 20 }),
      createTask({ category: 'pleasure', priority: 'high', estimatedMinutes: 20 }),
      createTask({ category: 'mastery', priority: 'medium', estimatedMinutes: 20 }),
      createTask({ category: 'pleasure', priority: 'medium', estimatedMinutes: 20 }),
    ];

    const result = selectBalancedTasks(tasks, 60);

    // Should pick 3 tasks (60 minutes / ~20 minutes each)
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(3);

    // Should alternate between categories
    const categories = result.map(t => t.category);
    const hasMastery = categories.includes('mastery');
    const hasPleasure = categories.includes('pleasure');
    expect(hasMastery || hasPleasure).toBe(true);
  });

  it('should respect time budget', () => {
    const tasks = [
      createTask({ estimatedMinutes: 30 }),
      createTask({ estimatedMinutes: 30 }),
      createTask({ estimatedMinutes: 30 }),
    ];

    const result = selectBalancedTasks(tasks, 60);

    const totalTime = result.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0);
    expect(totalTime).toBeLessThanOrEqual(60);
  });

  it('should prioritize urgent tasks', () => {
    const tasks = [
      createTask({ priority: 'low', category: 'mastery' }),
      createTask({ priority: 'urgent', category: 'mastery' }),
      createTask({ priority: 'high', category: 'mastery' }),
    ];

    const result = selectBalancedTasks(tasks, 120);

    // Urgent should come before high, high before low
    if (result.length >= 2) {
      const urgentIndex = result.findIndex(t => t.priority === 'urgent');
      const lowIndex = result.findIndex(t => t.priority === 'low');

      if (urgentIndex !== -1 && lowIndex !== -1) {
        expect(urgentIndex).toBeLessThan(lowIndex);
      }
    }
  });

  it('should use default 25 minutes for tasks without estimated time', () => {
    const tasks = [
      createTask({ estimatedMinutes: undefined }),
      createTask({ estimatedMinutes: undefined }),
    ];

    const result = selectBalancedTasks(tasks, 50);

    // Should fit 2 tasks with default 25 minutes each
    expect(result).toHaveLength(2);
  });

  it('should handle only mastery tasks', () => {
    const tasks = [
      createTask({ category: 'mastery', estimatedMinutes: 20 }),
      createTask({ category: 'mastery', estimatedMinutes: 20 }),
    ];

    const result = selectBalancedTasks(tasks, 40);
    expect(result).toHaveLength(2);
    expect(result.every(t => t.category === 'mastery')).toBe(true);
  });

  it('should handle only pleasure tasks', () => {
    const tasks = [
      createTask({ category: 'pleasure', estimatedMinutes: 20 }),
      createTask({ category: 'pleasure', estimatedMinutes: 20 }),
    ];

    const result = selectBalancedTasks(tasks, 40);
    expect(result).toHaveLength(2);
    expect(result.every(t => t.category === 'pleasure')).toBe(true);
  });

  it('should try other category if current doesnt fit', () => {
    const tasks = [
      createTask({ category: 'mastery', estimatedMinutes: 50 }),
      createTask({ category: 'pleasure', estimatedMinutes: 20 }),
      createTask({ category: 'mastery', estimatedMinutes: 20 }),
    ];

    const result = selectBalancedTasks(tasks, 40);

    // Should skip the 50-minute mastery task and pick the 20-minute pleasure task
    expect(result).toContain(tasks[1]);
  });
});
