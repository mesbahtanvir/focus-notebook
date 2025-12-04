/**
 * Backend API Client
 *
 * This module provides a type-safe client for communicating with the Go backend.
 * It handles authentication, error handling, retries, and provides both REST and SSE support.
 */

import { auth } from '../firebaseClient';

// API base URL - defaults to localhost for development
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

// Retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public statusText: string,
    public body?: unknown,
    public isRetryable: boolean = false
  ) {
    super(`API Error ${statusCode}: ${statusText}`);
    this.name = 'APIError';
  }
}

/**
 * Response metadata from the backend
 */
export interface APIResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

/**
 * Options for API requests
 */
export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  retries?: number;
  timeout?: number;
}

/**
 * Get the current user's ID token for authentication
 */
async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Failed to get ID token:', error);
    return null;
  }
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Make a request to the backend API
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    skipAuth = false,
    retries = DEFAULT_RETRY_CONFIG.maxRetries,
    timeout = 30000,
    body,
    ...fetchOptions
  } = options;

  const url = `${API_BASE_URL}${path}`;

  // Build headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Add auth token if not skipped
  if (!skipAuth) {
    const token = await getIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Build request init
  const init: RequestInit = {
    ...fetchOptions,
    headers,
  };

  // Add body if present
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  // Execute with retries
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        // Handle non-OK responses
        if (!response.ok) {
          let errorBody: unknown;
          try {
            errorBody = await response.json();
          } catch {
            errorBody = await response.text();
          }

          const isRetryable = DEFAULT_RETRY_CONFIG.retryableStatuses.includes(
            response.status
          );

          if (isRetryable && attempt < retries) {
            const delay = calculateBackoff(
              attempt,
              DEFAULT_RETRY_CONFIG.baseDelay,
              DEFAULT_RETRY_CONFIG.maxDelay
            );
            console.warn(
              `API request failed (${response.status}), retrying in ${delay}ms...`
            );
            await sleep(delay);
            continue;
          }

          throw new APIError(
            response.status,
            response.statusText,
            errorBody,
            isRetryable
          );
        }

        // Parse successful response
        const data = await response.json();

        // Handle wrapped response format
        if (data && typeof data === 'object' && 'success' in data) {
          if (!data.success && data.error) {
            throw new APIError(response.status, data.error, data, false);
          }
          return data.data as T;
        }

        return data as T;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error as Error;

      // Don't retry on abort or non-retryable errors
      if (error instanceof APIError && !error.isRetryable) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new APIError(408, 'Request Timeout', undefined, true);
      }

      // Retry on network errors
      if (attempt < retries) {
        const delay = calculateBackoff(
          attempt,
          DEFAULT_RETRY_CONFIG.baseDelay,
          DEFAULT_RETRY_CONFIG.maxDelay
        );
        console.warn(`API request failed, retrying in ${delay}ms...`, error);
        await sleep(delay);
        continue;
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('Unknown API error');
}

/**
 * CRUD API helper object
 */
export const api = {
  /**
   * Create a new document
   */
  create: <T>(collection: string, data: Partial<T>): Promise<T> =>
    apiRequest<T>(`/api/${collection}`, {
      method: 'POST',
      body: data,
    }),

  /**
   * Get a single document by ID
   */
  get: <T>(collection: string, id: string): Promise<T> =>
    apiRequest<T>(`/api/${collection}/${id}`, {
      method: 'GET',
    }),

  /**
   * List all documents in a collection
   */
  list: <T>(
    collection: string,
    options?: {
      limit?: number;
      orderBy?: string;
      orderDir?: 'asc' | 'desc';
    }
  ): Promise<T[]> => {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.orderBy) params.set('orderBy', options.orderBy);
    if (options?.orderDir) params.set('orderDir', options.orderDir);

    const query = params.toString();
    return apiRequest<T[]>(`/api/${collection}${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  },

  /**
   * Update a document
   */
  update: <T>(collection: string, id: string, data: Partial<T>): Promise<T> =>
    apiRequest<T>(`/api/${collection}/${id}`, {
      method: 'PUT',
      body: data,
    }),

  /**
   * Delete a document
   */
  delete: (collection: string, id: string): Promise<{ id: string; deleted: boolean }> =>
    apiRequest<{ id: string; deleted: boolean }>(`/api/${collection}/${id}`, {
      method: 'DELETE',
    }),

  /**
   * Batch create multiple documents
   */
  batchCreate: <T>(collection: string, items: Partial<T>[]): Promise<{
    created: T[];
    count: number;
    errors?: string[];
  }> =>
    apiRequest(`/api/${collection}/batch`, {
      method: 'POST',
      body: items,
    }),

  /**
   * Batch delete multiple documents
   */
  batchDelete: (collection: string, ids: string[]): Promise<{
    deleted: string[];
    count: number;
    errors?: string[];
  }> =>
    apiRequest(`/api/${collection}/batch`, {
      method: 'DELETE',
      body: { ids },
    }),

  /**
   * Get list of available collections
   */
  getCollections: (): Promise<
    Array<{
      name: string;
      userScoped: boolean;
      requiredFields: string[];
    }>
  > => apiRequest('/api/collections', { method: 'GET' }),
};

/**
 * Type for SSE event handlers
 */
export interface SSEEventHandlers<T> {
  onConnected?: (data: { collection: string | string[]; timestamp: number }) => void;
  onAdded?: (docId: string, data: T) => void;
  onModified?: (docId: string, data: T) => void;
  onRemoved?: (docId: string) => void;
  onError?: (error: Error) => void;
  onHeartbeat?: () => void;
}

/**
 * Subscribe to real-time updates from a collection via SSE
 * Returns an unsubscribe function
 */
export function subscribeToCollection<T>(
  collection: string,
  handlers: SSEEventHandlers<T>
): () => void {
  let eventSource: EventSource | null = null;
  let isClosing = false;

  const connect = async () => {
    if (isClosing) return;

    try {
      const token = await getIdToken();
      if (!token) {
        handlers.onError?.(new Error('Not authenticated'));
        return;
      }

      // Note: EventSource doesn't support custom headers directly.
      // We need to pass the token as a query parameter or use a workaround.
      // For now, we'll use a query parameter approach.
      const url = `${API_BASE_URL}/api/subscribe/${collection}?token=${encodeURIComponent(token)}`;

      eventSource = new EventSource(url);

      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        handlers.onConnected?.(data);
      });

      eventSource.addEventListener('change', (event) => {
        const change = JSON.parse(event.data);
        switch (change.type) {
          case 'added':
            handlers.onAdded?.(change.docId, change.data);
            break;
          case 'modified':
            handlers.onModified?.(change.docId, change.data);
            break;
          case 'removed':
            handlers.onRemoved?.(change.docId);
            break;
        }
      });

      eventSource.addEventListener('heartbeat', () => {
        handlers.onHeartbeat?.();
      });

      eventSource.addEventListener('error', (event) => {
        if (!isClosing) {
          handlers.onError?.(new Error('SSE connection error'));
          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (!isClosing && eventSource) {
              eventSource.close();
              connect();
            }
          }, 5000);
        }
      });

      eventSource.onerror = () => {
        if (!isClosing) {
          handlers.onError?.(new Error('SSE connection lost'));
        }
      };
    } catch (error) {
      handlers.onError?.(error as Error);
    }
  };

  // Start connection
  connect();

  // Return unsubscribe function
  return () => {
    isClosing = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}

/**
 * Subscribe to multiple collections via SSE
 * Returns an unsubscribe function
 */
export function subscribeToMultipleCollections<T>(
  collections: string[],
  handlers: SSEEventHandlers<T> & {
    onCollectionAdded?: (collection: string, docId: string, data: T) => void;
    onCollectionModified?: (collection: string, docId: string, data: T) => void;
    onCollectionRemoved?: (collection: string, docId: string) => void;
  }
): () => void {
  let eventSource: EventSource | null = null;
  let isClosing = false;

  const connect = async () => {
    if (isClosing) return;

    try {
      const token = await getIdToken();
      if (!token) {
        handlers.onError?.(new Error('Not authenticated'));
        return;
      }

      const collectionsParam = encodeURIComponent(JSON.stringify(collections));
      const url = `${API_BASE_URL}/api/subscribe?collections=${collectionsParam}&token=${encodeURIComponent(token)}`;

      eventSource = new EventSource(url);

      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        handlers.onConnected?.(data);
      });

      eventSource.addEventListener('change', (event) => {
        const change = JSON.parse(event.data);
        switch (change.type) {
          case 'added':
            handlers.onCollectionAdded?.(change.collection, change.docId, change.data);
            break;
          case 'modified':
            handlers.onCollectionModified?.(change.collection, change.docId, change.data);
            break;
          case 'removed':
            handlers.onCollectionRemoved?.(change.collection, change.docId);
            break;
        }
      });

      eventSource.addEventListener('heartbeat', () => {
        handlers.onHeartbeat?.();
      });

      eventSource.addEventListener('error', () => {
        if (!isClosing) {
          handlers.onError?.(new Error('SSE connection error'));
          setTimeout(() => {
            if (!isClosing && eventSource) {
              eventSource.close();
              connect();
            }
          }, 5000);
        }
      });
    } catch (error) {
      handlers.onError?.(error as Error);
    }
  };

  connect();

  return () => {
    isClosing = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}

export default api;
