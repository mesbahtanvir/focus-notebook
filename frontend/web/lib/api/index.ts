/**
 * API Client Module
 *
 * This module provides all the tools needed to communicate with the Go backend.
 * It replaces direct Firebase communication for all CRUD operations.
 *
 * Usage:
 * ```typescript
 * import { api, subscribeToCollection } from '@/lib/api';
 *
 * // CRUD operations
 * const tasks = await api.list<Task>('tasks');
 * const task = await api.get<Task>('tasks', taskId);
 * const newTask = await api.create<Task>('tasks', { title: 'New Task' });
 * const updated = await api.update<Task>('tasks', taskId, { status: 'done' });
 * await api.delete('tasks', taskId);
 *
 * // Real-time subscriptions
 * const unsubscribe = subscribeToCollection<Task>('tasks', {
 *   onAdded: (id, task) => console.log('Added:', id, task),
 *   onModified: (id, task) => console.log('Modified:', id, task),
 *   onRemoved: (id) => console.log('Removed:', id),
 *   onError: (error) => console.error('Error:', error),
 * });
 *
 * // Cleanup
 * unsubscribe();
 * ```
 */

export {
  // Core API client
  api,
  apiRequest,
  APIError,

  // Storage API
  storageApi,

  // SSE subscriptions
  subscribeToCollection,
  subscribeToMultipleCollections,

  // Types
  type APIResponse,
  type RequestOptions,
  type SSEEventHandlers,
} from './client';

export * from './types';

// Default export for convenience
export { default } from './client';
