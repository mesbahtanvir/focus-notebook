/**
 * Test Helper Utilities
 * Common functions for setting up tests
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { DIProvider } from '@/contexts/DIContext';
import { createTestContainer } from '@/di/testSetup';
import type { Container } from '@/di/Container';

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    container,
    ...renderOptions
  }: RenderOptions & { container?: Container } = {}
) {
  const testContainer = container || createTestContainer();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <DIProvider container={testContainer}>
        {children}
      </DIProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    container: testContainer,
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 1000
): Promise<void> {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Condition not met within timeout');
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

// Re-export everything from testing library
export * from '@testing-library/react';
