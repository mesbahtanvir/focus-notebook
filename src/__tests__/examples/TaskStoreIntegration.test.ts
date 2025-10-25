/**
 * Example: Complete Integration Test
 * Shows how to test the store with repositories and services
 */

import { createTaskStore } from '@/store/useTasksV2';
import { MockAuthService } from '@/repositories/mock/MockAuthService';
import { MockTaskRepository } from '@/repositories/mock/MockTaskRepository';
import { RecurringTaskService } from '@/services/RecurringTaskService';
import { aTask } from '../utils/builders';
import { waitFor } from '@testing-library/react';

describe('Task Store Integration', () => {
  let mockAuthService: MockAuthService;
  let mockTaskRepository: MockTaskRepository;
  let recurringTaskService: RecurringTaskService;
  let store: ReturnType<typeof createTaskStore>;

  beforeEach(() => {
    // Set up dependencies
    mockAuthService = new MockAuthService();
    mockAuthService.simulateLogin('test-user-123');
    
    mockTaskRepository = new MockTaskRepository(mockAuthService);
    recurringTaskService = new RecurringTaskService(mockTaskRepository);
    
    // Create store with dependencies
    store = createTaskStore(mockTaskRepository, recurringTaskService);
  });

  afterEach(() => {
    mockTaskRepository.clear();
  });

  describe('Basic CRUD operations', () => {
    it('should add a task', async () => {
      // Subscribe to get updates
      store.getState().subscribe('test-user-123');

      const taskData = aTask()
        .withTitle('Complete refactoring')
        .withPriority('high')
        .build();

      await store.getState().add(taskData);

      // Wait for subscription to update
      await waitFor(() => {
        const tasks = store.getState().tasks;
        expect(tasks).toHaveLength(1);
        expect(tasks[0].title).toBe('Complete refactoring');
      });
    });

    it('should toggle task completion', async () => {
      const task = aTask().asNotDone().build();
      const id = await mockTaskRepository.create(task);

      // Subscribe to updates
      store.getState().subscribe('test-user-123');

      await store.getState().toggle(id);

      await waitFor(() => {
        const updatedTask = store.getState().tasks.find(t => t.id === id);
        expect(updatedTask?.done).toBe(true);
        expect(updatedTask?.status).toBe('completed');
      });
    });

    it('should update task', async () => {
      const task = aTask().withTitle('Original').build();
      const id = await mockTaskRepository.create(task);

      store.getState().subscribe('test-user-123');

      await store.getState().updateTask(id, { 
        title: 'Updated',
        priority: 'urgent' 
      });

      await waitFor(() => {
        const updatedTask = store.getState().tasks.find(t => t.id === id);
        expect(updatedTask?.title).toBe('Updated');
        expect(updatedTask?.priority).toBe('urgent');
      });
    });

    it('should delete task', async () => {
      const task = aTask().build();
      const id = await mockTaskRepository.create(task);

      store.getState().subscribe('test-user-123');
      
      await store.getState().deleteTask(id);

      await waitFor(() => {
        const tasks = store.getState().tasks;
        expect(tasks.find(t => t.id === id)).toBeUndefined();
      });
    });
  });

  describe('Recurring tasks', () => {
    it('should keep recurring tasks active when toggled', async () => {
      const task = aTask()
        .asDaily()
        .asNotDone()
        .build();
      
      const id = await mockTaskRepository.create(task);
      store.getState().subscribe('test-user-123');

      await store.getState().toggle(id);

      await waitFor(() => {
        const updatedTask = store.getState().tasks.find(t => t.id === id);
        expect(updatedTask?.done).toBe(true);
        expect(updatedTask?.status).toBe('active'); // Still active!
      });
    });

    it('should increment completion count for recurring tasks', async () => {
      const task = aTask()
        .asDaily()
        .asNotDone()
        .build();
      
      const id = await mockTaskRepository.create(task);
      store.getState().subscribe('test-user-123');

      // Toggle twice
      await store.getState().toggle(id); // Mark done
      
      await waitFor(() => {
        const updatedTask = store.getState().tasks.find(t => t.id === id);
        expect(updatedTask?.completionCount).toBe(1);
      });

      await store.getState().toggle(id); // Mark undone
      await store.getState().toggle(id); // Mark done again

      await waitFor(() => {
        const updatedTask = store.getState().tasks.find(t => t.id === id);
        expect(updatedTask?.completionCount).toBe(2);
      });
    });

    it.skip('should reset daily tasks', async () => {
      const dailyTask1 = aTask().asDaily().asDone().build();
      const dailyTask2 = aTask().asDaily().asDone().build();

      await mockTaskRepository.create(dailyTask1);
      await mockTaskRepository.create(dailyTask2);

      store.getState().subscribe('test-user-123');

      // Wait for initial load
      await waitFor(() => {
        expect(store.getState().tasks).toHaveLength(2);
      });

      await store.getState().resetDailyTasks();

      await waitFor(() => {
        const allTasks = store.getState().tasks;
        const dailyTasks = allTasks.filter(t => t.recurrence?.type === 'daily');

        // Daily tasks should be reset
        expect(dailyTasks).toHaveLength(2);
        dailyTasks.forEach(t => {
          expect(t.done).toBe(false);
          expect(t.status).toBe('active');
        });
      });
    });
  });

  describe('Filtering and querying', () => {
    beforeEach(async () => {
      // Set up test data
      const tasks = [
        aTask().withTitle('Active 1').withStatus('active').build(),
        aTask().withTitle('Active 2').withStatus('active').build(),
        aTask().withTitle('Completed 1').withStatus('completed').asDone().build(),
        aTask().withTitle('Backlog 1').withStatus('backlog').build(),
      ];

      for (const task of tasks) {
        await mockTaskRepository.create(task);
      }

      store.getState().subscribe('test-user-123');
    });

    it('should get tasks by status', async () => {
      await waitFor(() => {
        expect(store.getState().tasks.length).toBeGreaterThan(0);
      });

      const activeTasks = store.getState().getTasksByStatus('active');
      const completedTasks = store.getState().getTasksByStatus('completed');
      const backlogTasks = store.getState().getTasksByStatus('backlog');

      expect(activeTasks).toHaveLength(2);
      expect(completedTasks).toHaveLength(1);
      expect(backlogTasks).toHaveLength(1);
    });
  });

  describe('Subscription and real-time updates', () => {
    it('should update store when repository data changes', async () => {
      store.getState().subscribe('test-user-123');

      // Initially empty
      expect(store.getState().tasks).toHaveLength(0);

      // Add task through repository (simulates real-time update)
      await mockTaskRepository.create(aTask().withTitle('New Task').build());

      await waitFor(() => {
        expect(store.getState().tasks).toHaveLength(1);
        expect(store.getState().tasks[0].title).toBe('New Task');
      });
    });

    it('should update loading state', async () => {
      expect(store.getState().isLoading).toBe(true);

      store.getState().subscribe('test-user-123');

      await waitFor(() => {
        expect(store.getState().isLoading).toBe(false);
      });
    });

    it('should handle multiple subscribers', async () => {
      const callbacks: any[] = [];
      
      // Subscribe multiple times (simulating multiple components)
      mockTaskRepository.subscribe((data, meta) => {
        callbacks.push({ data: data.length, meta });
      });
      
      mockTaskRepository.subscribe((data, meta) => {
        callbacks.push({ data: data.length, meta });
      });

      // Add task
      await mockTaskRepository.create(aTask().build());

      // Both callbacks should be called
      await waitFor(() => {
        expect(callbacks.length).toBeGreaterThan(2);
      });
    });
  });

  describe('Authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockAuthService.simulateLogout();

      await expect(
        store.getState().add(aTask().build())
      ).rejects.toThrow('Not authenticated');
    });

    it('should work after re-authentication', async () => {
      mockAuthService.simulateLogout();
      mockAuthService.simulateLogin('new-user-456');

      const task = aTask().build();
      await expect(store.getState().add(task)).resolves.toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty task list', async () => {
      store.getState().subscribe('test-user-123');

      await waitFor(() => {
        expect(store.getState().isLoading).toBe(false);
      });

      expect(store.getState().tasks).toHaveLength(0);
    });

    it('should handle rapid updates', async () => {
      store.getState().subscribe('test-user-123');

      // Add multiple tasks rapidly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          store.getState().add(aTask().withTitle(`Task ${i}`).build())
        );
      }

      await Promise.all(promises);

      await waitFor(() => {
        expect(store.getState().tasks.length).toBe(10);
      });
    });

    it('should handle unsubscribe', async () => {
      const callback = jest.fn();
      const unsubscribe = mockTaskRepository.subscribe(callback);

      callback.mockClear();
      unsubscribe();

      await mockTaskRepository.create(aTask().build());

      // Callback should not be called after unsubscribe
      expect(callback).not.toHaveBeenCalled();
    });
  });
});

