import type { IRepository, SubscriptionMeta } from '../interfaces/IRepository';
import type { IAuthService } from '../interfaces/IAuthService';
import type { Task } from '@/store/useTasks';

/**
 * Mock task repository for testing
 * Stores data in memory and simulates async operations
 */
export class MockTaskRepository implements IRepository<Task> {
  private tasks: Task[] = [];
  private subscribers: Array<(data: Task[], meta: SubscriptionMeta) => void> = [];

  constructor(private authService: IAuthService) {}

  private getUserId(): string {
    const userId = this.authService.getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');
    return userId;
  }

  async getAll(): Promise<Task[]> {
    this.getUserId(); // Check authentication
    // Simulate async
    await new Promise(resolve => setTimeout(resolve, 0));
    return [...this.tasks];
  }

  async getById(id: string): Promise<Task | null> {
    this.getUserId(); // Check authentication
    await new Promise(resolve => setTimeout(resolve, 0));
    return this.tasks.find(t => t.id === id) ?? null;
  }

  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>): Promise<string> {
    this.getUserId(); // Check authentication
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const id = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTask: Task = {
      ...data,
      id,
      title: data.title || 'Untitled Task',
      done: false,
      status: data.status || 'active',
      priority: data.priority || 'medium',
      focusEligible: data.focusEligible !== undefined ? data.focusEligible : true,
      createdAt: new Date().toISOString(),
    };

    this.tasks.push(newTask);
    this.notifySubscribers();
    return id;
  }

  async update(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>>): Promise<void> {
    this.getUserId(); // Check authentication
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Task not found');

    this.tasks[index] = { ...this.tasks[index], ...updates };
    this.notifySubscribers();
  }

  async delete(id: string): Promise<void> {
    this.getUserId(); // Check authentication
    await new Promise(resolve => setTimeout(resolve, 0));
    
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.notifySubscribers();
  }

  subscribe(callback: (data: Task[], meta: SubscriptionMeta) => void): () => void {
    this.subscribers.push(callback);
    
    // Immediately call with current data
    callback([...this.tasks], {
      fromCache: false,
      hasPendingWrites: false,
    });

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  // Test helper methods
  setMockData(tasks: Task[]): void {
    this.tasks = [...tasks];
    this.notifySubscribers();
  }

  getMockData(): Task[] {
    return [...this.tasks];
  }

  clear(): void {
    this.tasks = [];
    this.notifySubscribers();
  }

  private notifySubscribers(): void {
    const data = [...this.tasks];
    const meta: SubscriptionMeta = {
      fromCache: false,
      hasPendingWrites: false,
    };
    this.subscribers.forEach(subscriber => subscriber(data, meta));
  }
}
