"use client";

import { createContext, useContext, ReactNode } from 'react';
import { Container, appContainer } from '@/di/Container';

/**
 * Dependency Injection Context
 * Provides access to the DI container throughout the React tree
 */

const DIContext = createContext<Container>(appContainer);

export interface DIProviderProps {
  children: ReactNode;
  container?: Container; // Optional: for testing with custom container
}

/**
 * Provider component for dependency injection
 */
export function DIProvider({ children, container = appContainer }: DIProviderProps) {
  return (
    <DIContext.Provider value={container}>
      {children}
    </DIContext.Provider>
  );
}

/**
 * Hook to access the DI container
 */
export function useContainer(): Container {
  const container = useContext(DIContext);
  if (!container) {
    throw new Error('useContainer must be used within DIProvider');
  }
  return container;
}

/**
 * Hook to resolve a service from the container
 */
export function useService<T>(key: string): T {
  const container = useContainer();
  return container.resolve<T>(key);
}
