import { collection, query, orderBy, doc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';
import type { IRepository, SubscriptionMeta } from '../interfaces/IRepository';
import type { IAuthService } from '../interfaces/IAuthService';
import type { Task } from '@/store/useTasks';

/**
 * Firebase implementation of Task repository
 */
export class FirebaseTaskRepository implements IRepository<Task> {
  constructor(private authService: IAuthService) {}

  private getUserId(): string {
    const userId = this.authService.getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');
    return userId;
  }

  private getCollectionPath(): string {
    const userId = this.getUserId();
    return `users/${userId}/tasks`;
  }

  async getAll(): Promise<Task[]> {
    const q = query(
      collection(db, this.getCollectionPath()),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
  }

  async getById(id: string): Promise<Task | null> {
    const tasks = await this.getAll();
    return tasks.find(t => t.id === id) ?? null;
  }

  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>): Promise<string> {
    const userId = this.getUserId();
    const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newTask: Omit<Task, 'id'> = {
      ...data,
      title: data.title || 'Untitled Task',
      done: false,
      status: data.status || 'active',
      priority: data.priority || 'medium',
      focusEligible: data.focusEligible !== undefined ? data.focusEligible : true,
      createdAt: new Date().toISOString(),
    };

    await createAt(`users/${userId}/tasks/${taskId}`, newTask);
    return taskId;
  }

  async update(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>>): Promise<void> {
    const userId = this.getUserId();
    await updateAt(`users/${userId}/tasks/${id}`, updates);
  }

  async delete(id: string): Promise<void> {
    const userId = this.getUserId();
    await deleteAt(`users/${userId}/tasks/${id}`);
  }

  subscribe(callback: (data: Task[], meta: SubscriptionMeta) => void): () => void {
    const tasksQuery = query(
      collection(db, this.getCollectionPath()),
      orderBy('createdAt', 'desc')
    );

    return subscribeCol<Task>(tasksQuery, callback);
  }
}
