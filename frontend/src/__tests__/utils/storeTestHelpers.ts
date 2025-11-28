/**
 * Test utilities for Zustand store testing
 * Provides helpers for common test patterns to reduce boilerplate
 */

import { act } from '@testing-library/react';

/**
 * Safely sets Zustand store state within act() to avoid React warnings
 *
 * @example
 * ```typescript
 * setStoreState(useTasks, {
 *   tasks: [mockTask1, mockTask2],
 *   isLoading: false
 * });
 * ```
 *
 * @param store - The Zustand store instance
 * @param state - Partial state to set
 */
export function setStoreState<T>(
  store: { setState: (state: Partial<T>) => void },
  state: Partial<T>
): void {
  act(() => {
    store.setState(state);
  });
}

/**
 * Async wrapper for setting store state and waiting for effects
 *
 * @example
 * ```typescript
 * await setStoreStateAsync(useTasks, {
 *   tasks: [mockTask1, mockTask2]
 * });
 * ```
 *
 * @param store - The Zustand store instance
 * @param state - Partial state to set
 */
export async function setStoreStateAsync<T>(
  store: { setState: (state: Partial<T>) => void },
  state: Partial<T>
): Promise<void> {
  await act(async () => {
    store.setState(state);
  });
}

/**
 * Resets store state to initial values within act()
 *
 * @example
 * ```typescript
 * resetStoreState(useTasks);
 * ```
 *
 * @param store - The Zustand store instance with getInitialState method
 */
export function resetStoreState<T>(
  store: { setState: (state: Partial<T>) => void; getInitialState?: () => T }
): void {
  act(() => {
    if (store.getInitialState) {
      store.setState(store.getInitialState());
    }
  });
}

/**
 * Wraps a callback in act() for synchronous operations
 * Useful for testing store actions that modify state
 *
 * @example
 * ```typescript
 * actSync(() => {
 *   result.current.addTask(mockTask);
 * });
 * ```
 *
 * @param callback - The synchronous callback to execute
 */
export function actSync(callback: () => void): void {
  act(() => {
    callback();
  });
}

/**
 * Wraps an async callback in act() for asynchronous operations
 * Useful for testing store actions that involve async operations
 *
 * @example
 * ```typescript
 * await actAsync(async () => {
 *   await result.current.fetchTasks();
 * });
 * ```
 *
 * @param callback - The async callback to execute
 */
export async function actAsync(callback: () => Promise<void>): Promise<void> {
  await act(async () => {
    await callback();
  });
}
