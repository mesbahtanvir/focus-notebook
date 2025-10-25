import type { IRepository, SubscriptionMeta } from '../interfaces/IRepository';
import type { IAuthService } from '../interfaces/IAuthService';
import type { MoodEntry } from '@/store/useMoods';

/**
 * Mock mood repository for testing
 */
export class MockMoodRepository implements IRepository<MoodEntry> {
  private moods: MoodEntry[] = [];
  private subscribers: Array<(data: MoodEntry[], meta: SubscriptionMeta) => void> = [];

  constructor(private authService: IAuthService) {}

  private getUserId(): string {
    const userId = this.authService.getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');
    return userId;
  }

  async getAll(): Promise<MoodEntry[]> {
    this.getUserId();
    await new Promise(resolve => setTimeout(resolve, 0));
    return [...this.moods];
  }

  async getById(id: string): Promise<MoodEntry | null> {
    this.getUserId();
    await new Promise(resolve => setTimeout(resolve, 0));
    return this.moods.find(m => m.id === id) ?? null;
  }

  async create(data: Omit<MoodEntry, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>): Promise<string> {
    this.getUserId();
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const id = `mock-mood-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newMood: MoodEntry = {
      ...data,
      id,
      value: Math.min(10, Math.max(1, Math.round(data.value))),
      createdAt: new Date().toISOString(),
    };

    this.moods.push(newMood);
    this.notifySubscribers();
    return id;
  }

  async update(id: string, updates: Partial<Omit<MoodEntry, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>>): Promise<void> {
    throw new Error('Mood updates not supported');
  }

  async delete(id: string): Promise<void> {
    this.getUserId();
    await new Promise(resolve => setTimeout(resolve, 0));
    
    this.moods = this.moods.filter(m => m.id !== id);
    this.notifySubscribers();
  }

  subscribe(callback: (data: MoodEntry[], meta: SubscriptionMeta) => void): () => void {
    this.subscribers.push(callback);
    
    callback([...this.moods], {
      fromCache: false,
      hasPendingWrites: false,
    });

    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  // Test helpers
  setMockData(moods: MoodEntry[]): void {
    this.moods = [...moods];
    this.notifySubscribers();
  }

  getMockData(): MoodEntry[] {
    return [...this.moods];
  }

  clear(): void {
    this.moods = [];
    this.notifySubscribers();
  }

  private notifySubscribers(): void {
    const data = [...this.moods];
    const meta: SubscriptionMeta = {
      fromCache: false,
      hasPendingWrites: false,
    };
    this.subscribers.forEach(subscriber => subscriber(data, meta));
  }
}
