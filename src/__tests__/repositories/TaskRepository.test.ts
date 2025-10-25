/**
 * Tests for Task Repository
 * Demonstrates testing repositories in isolation
 */

import { MockAuthService } from '@/repositories/mock/MockAuthService';
import { MockTaskRepository } from '@/repositories/mock/MockTaskRepository';
import { aTask } from '../utils/builders';

describe('TaskRepository', () => {
  let authService: MockAuthService;
  let repository: MockTaskRepository;

  beforeEach(() => {
    authService = new MockAuthService();
    authService.simulateLogin('test-user-123');
    repository = new MockTaskRepository(authService);
  });

  afterEach(() => {
    repository.clear();
  });

  describe('create', () => {
    it('should create a task', async () => {
      const taskData = aTask()
        .withTitle('Buy groceries')
        .withPriority('high')
        .build();

      const id = await repository.create(taskData);

      expect(id).toBeTruthy();
      expect(id).toMatch(/^mock-/);
    });

    it('should throw error when not authenticated', async () => {
      authService.simulateLogout();

      const taskData = aTask().build();

      await expect(repository.create(taskData)).rejects.toThrow('Not authenticated');
    });

    it('should set default values', async () => {
      const id = await repository.create({
        title: 'Test',
        done: false,
        status: 'active',
        priority: 'medium',
      });

      const task = await repository.getById(id);
      expect(task?.focusEligible).toBe(true);
      expect(task?.status).toBe('active');
    });
  });

  describe('getAll', () => {
    it('should return empty array when no tasks', async () => {
      const tasks = await repository.getAll();
      expect(tasks).toEqual([]);
    });

    it('should return all tasks', async () => {
      const task1 = aTask().withTitle('Task 1').build();
      const task2 = aTask().withTitle('Task 2').build();

      await repository.create(task1);
      await repository.create(task2);

      const tasks = await repository.getAll();
      expect(tasks).toHaveLength(2);
    });
  });

  describe('getById', () => {
    it('should return task by id', async () => {
      const taskData = aTask().withTitle('Find me').build();
      const id = await repository.create(taskData);

      const task = await repository.getById(id);

      expect(task).toBeTruthy();
      expect(task?.title).toBe('Find me');
    });

    it('should return null for non-existent id', async () => {
      const task = await repository.getById('non-existent');
      expect(task).toBeNull();
    });
  });

  describe('update', () => {
    it('should update task', async () => {
      const taskData = aTask().withTitle('Original').build();
      const id = await repository.create(taskData);

      await repository.update(id, { title: 'Updated' });

      const task = await repository.getById(id);
      expect(task?.title).toBe('Updated');
    });

    it('should partially update task', async () => {
      const taskData = aTask()
        .withTitle('Original')
        .withPriority('low')
        .build();
      const id = await repository.create(taskData);

      await repository.update(id, { priority: 'high' });

      const task = await repository.getById(id);
      expect(task?.title).toBe('Original');
      expect(task?.priority).toBe('high');
    });

    it('should throw error for non-existent task', async () => {
      await expect(
        repository.update('non-existent', { title: 'Fail' })
      ).rejects.toThrow('Task not found');
    });
  });

  describe('delete', () => {
    it('should delete task', async () => {
      const taskData = aTask().build();
      const id = await repository.create(taskData);

      await repository.delete(id);

      const task = await repository.getById(id);
      expect(task).toBeNull();
    });

    it('should not throw for non-existent task', async () => {
      await expect(repository.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('subscribe', () => {
    it('should call callback immediately with current data', () => {
      const callback = jest.fn();

      repository.subscribe(callback);

      expect(callback).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          fromCache: false,
          hasPendingWrites: false,
        })
      );
    });

    it('should notify subscribers when data changes', async () => {
      const callback = jest.fn();
      repository.subscribe(callback);

      callback.mockClear();

      const taskData = aTask().build();
      await repository.create(taskData);

      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ title: taskData.title })]),
        expect.anything()
      );
    });

    it('should allow unsubscribe', async () => {
      const callback = jest.fn();
      const unsubscribe = repository.subscribe(callback);

      unsubscribe();
      callback.mockClear();

      const taskData = aTask().build();
      await repository.create(taskData);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('test helpers', () => {
    it('should set mock data', () => {
      const tasks = aTask().buildMany(3);
      repository.setMockData(tasks);

      const result = repository.getMockData();
      expect(result).toHaveLength(3);
    });

    it('should clear data', async () => {
      await repository.create(aTask().build());
      expect(repository.getMockData()).toHaveLength(1);

      repository.clear();
      expect(repository.getMockData()).toHaveLength(0);
    });
  });
});
