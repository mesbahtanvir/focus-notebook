/**
 * Generic repository interface for CRUD operations
 * This abstraction allows for easy testing and swapping implementations
 */
export interface IRepository<T extends { id: string }> {
  /**
   * Get all items for the current user
   */
  getAll(): Promise<T[]>;

  /**
   * Get a single item by ID
   */
  getById(id: string): Promise<T | null>;

  /**
   * Create a new item
   * @returns The ID of the created item
   */
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>): Promise<string>;

  /**
   * Update an existing item
   */
  update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>>): Promise<void>;

  /**
   * Delete an item
   */
  delete(id: string): Promise<void>;

  /**
   * Subscribe to real-time updates
   * @param callback Called when data changes
   * @returns Unsubscribe function
   */
  subscribe(callback: (data: T[], meta: SubscriptionMeta) => void): () => void;
}

export interface SubscriptionMeta {
  fromCache: boolean;
  hasPendingWrites: boolean;
}
