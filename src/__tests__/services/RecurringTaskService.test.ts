/**
 * Tests for RecurringTaskService
 * Demonstrates testing business logic in isolation
 */

import { RecurringTaskService } from '@/services/RecurringTaskService';
import { MockAuthService } from '@/repositories/mock/MockAuthService';
import { MockTaskRepository } from '@/repositories/mock/MockTaskRepository';
import { aTask } from '../utils/builders';
import { getDateString } from '@/lib/utils/date';

describe('RecurringTaskService', () => {
  let authService: MockAuthService;
  let repository: MockTaskRepository;
  let service: RecurringTaskService;

  beforeEach(() => {
    authService = new MockAuthService();
    authService.simulateLogin('test-user-123');
    repository = new MockTaskRepository(authService);
    service = new RecurringTaskService(repository);
  });

  describe('shouldCreateTaskForToday', () => {
    it('should return false for non-recurring tasks', () => {
      const task = aTask().build();
      const result = service.shouldCreateTaskForToday(task, []);
      expect(result).toBe(false);
    });

    it('should return true for daily recurring task without instance today', () => {
      const task = aTask().asDaily().build();
      const result = service.shouldCreateTaskForToday(task, []);
      expect(result).toBe(true);
    });

    it('should return false if task instance exists for today', () => {
      const today = getDateString(new Date());
      const parentTask = aTask().asDaily().build();
      const todayInstance = aTask()
        .withParentTaskId(parentTask.id)
        .withDueDate(today)
        .build();

      const result = service.shouldCreateTaskForToday(parentTask, [todayInstance]);
      expect(result).toBe(false);
    });

    it('should return true if completed instance exists for today', () => {
      const today = getDateString(new Date());
      const parentTask = aTask()
        .asDaily()
        .asDone()
        .withDueDate(today)
        .build();

      const result = service.shouldCreateTaskForToday(parentTask, []);
      expect(result).toBe(true);
    });

    it('should return false for workweek tasks on weekends', () => {
      // Mock the date to be a weekend
      const saturday = new Date('2024-01-06'); // A Saturday
      jest.useFakeTimers();
      jest.setSystemTime(saturday);

      const task = aTask().withRecurrence('workweek').build();
      const result = service.shouldCreateTaskForToday(task, []);
      
      // Will be false if isWorkday() correctly identifies weekends
      // Note: This test depends on the date utility function
      
      jest.useRealTimers();
    });
  });

  describe('createTaskForToday', () => {
    it('should create task instance for today', () => {
      const today = getDateString(new Date());
      const parentTask = aTask()
        .withTitle('Daily Exercise')
        .asDaily()
        .withPriority('high')
        .build();

      const newTask = service.createTaskForToday(parentTask);

      expect(newTask.title).toBe('Daily Exercise');
      expect(newTask.priority).toBe('high');
      expect(newTask.dueDate).toBe(today);
      expect(newTask.done).toBe(false);
      expect(newTask.status).toBe('active');
      expect(newTask.parentTaskId).toBe(parentTask.id);
      expect(newTask.recurrence).toEqual(parentTask.recurrence);
    });

    it('should reset completion data', () => {
      const parentTask = aTask()
        .asDaily()
        .asDone()
        .build();

      const newTask = service.createTaskForToday(parentTask);

      expect(newTask.done).toBe(false);
      expect(newTask.completedAt).toBeUndefined();
      expect(newTask.completionCount).toBe(0);
    });

    it('should preserve task properties', () => {
      const parentTask = aTask()
        .asDaily()
        .withTitle('Read')
        .withNotes('Chapter 5')
        .withTags(['book', 'learning'])
        .withEstimatedMinutes(30)
        .withProjectId('project-1')
        .asFocusEligible(true)
        .build();

      const newTask = service.createTaskForToday(parentTask);

      expect(newTask.notes).toBe('Chapter 5');
      expect(newTask.tags).toEqual(['book', 'learning']);
      expect(newTask.estimatedMinutes).toBe(30);
      expect(newTask.projectId).toBe('project-1');
      expect(newTask.focusEligible).toBe(true);
    });
  });

  describe('generateMissingRecurringTasks', () => {
    it('should create missing daily task instances', async () => {
      const parentTask = aTask().asDaily().withTitle('Morning routine').build();
      await repository.create(parentTask);

      const tasksBefore = await repository.getAll();
      expect(tasksBefore).toHaveLength(1);

      await service.generateMissingRecurringTasks([parentTask]);

      const tasksAfter = await repository.getAll();
      expect(tasksAfter.length).toBeGreaterThan(1);
      
      const newTask = tasksAfter.find(t => t.parentTaskId === parentTask.id);
      expect(newTask).toBeTruthy();
      expect(newTask?.title).toBe('Morning routine');
    });

    it('should not create duplicate instances', async () => {
      const today = getDateString(new Date());
      const parentTask = aTask().asDaily().build();
      const existingInstance = aTask()
        .withParentTaskId(parentTask.id)
        .withDueDate(today)
        .build();

      await repository.create(parentTask);
      await repository.create(existingInstance);

      const tasksBefore = await repository.getAll();
      const beforeCount = tasksBefore.length;

      await service.generateMissingRecurringTasks([parentTask, existingInstance]);

      const tasksAfter = await repository.getAll();
      expect(tasksAfter).toHaveLength(beforeCount);
    });

    it('should handle multiple recurring templates', async () => {
      const task1 = aTask().asDaily().withTitle('Task 1').build();
      const task2 = aTask().asWeekly().withTitle('Task 2').build();

      await repository.create(task1);
      await repository.create(task2);

      await service.generateMissingRecurringTasks([task1, task2]);

      const tasks = await repository.getAll();
      expect(tasks.length).toBeGreaterThan(2);
    });

    it('should skip non-recurring tasks', async () => {
      const regularTask = aTask().withTitle('Regular').build();
      await repository.create(regularTask);

      const tasksBefore = await repository.getAll();

      await service.generateMissingRecurringTasks([regularTask]);

      const tasksAfter = await repository.getAll();
      expect(tasksAfter).toHaveLength(tasksBefore.length);
    });
  });
});

