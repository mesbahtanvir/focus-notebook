import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { createAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';
import type { IRepository, SubscriptionMeta } from '../interfaces/IRepository';
import type { IAuthService } from '../interfaces/IAuthService';
import type { MoodEntry } from '@/store/useMoods';

/**
 * Firebase implementation of Mood repository
 */
export class FirebaseMoodRepository implements IRepository<MoodEntry> {
  constructor(private authService: IAuthService) {}

  private getUserId(): string {
    const userId = this.authService.getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');
    return userId;
  }

  private getCollectionPath(): string {
    const userId = this.getUserId();
    return `users/${userId}/moods`;
  }

  async getAll(): Promise<MoodEntry[]> {
    const q = query(
      collection(db, this.getCollectionPath()),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MoodEntry));
  }

  async getById(id: string): Promise<MoodEntry | null> {
    const moods = await this.getAll();
    return moods.find(m => m.id === id) ?? null;
  }

  async create(data: Omit<MoodEntry, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>): Promise<string> {
    const userId = this.getUserId();
    const moodId = Date.now().toString();
    
    const newEntry: Omit<MoodEntry, 'id'> = {
      value: Math.min(10, Math.max(1, Math.round(data.value))),
      note: data.note,
      createdAt: new Date().toISOString(),
      metadata: data.metadata,
    };

    await createAt(`users/${userId}/moods/${moodId}`, newEntry);
    return moodId;
  }

  async update(id: string, updates: Partial<Omit<MoodEntry, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>>): Promise<void> {
    // Moods typically aren't updated, but implementing for completeness
    throw new Error('Mood updates not supported');
  }

  async delete(id: string): Promise<void> {
    const userId = this.getUserId();
    await deleteAt(`users/${userId}/moods/${id}`);
  }

  subscribe(callback: (data: MoodEntry[], meta: SubscriptionMeta) => void): () => void {
    const moodsQuery = query(
      collection(db, this.getCollectionPath()),
      orderBy('createdAt', 'desc')
    );

    return subscribeCol<MoodEntry>(moodsQuery, callback);
  }
}
