import { test as base } from '@playwright/test';
import { mockDateTime, hideDynamicElements, waitForPageReady } from '../helpers/screenshot';
import {
  mockFirebase,
  disableOfflineIndicators,
  disableRealtimeSync,
  waitForAllLoadingComplete,
  markSyncComplete,
} from '../helpers/sync';
import {
  connectToEmulators,
  initializeFirebaseWithEmulators,
  createTestUser,
  seedDataToEmulator,
  waitForEmulatorSync,
} from '../setup/emulator-data';
import { generateBaselineData } from './baseline-data';
import { setupMockAuth } from '../helpers/auth';
import { seedBaselineData } from './baseline-data';

// Check if emulators are available
async function areEmulatorsAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:4000');
    return response.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Global Test Fixtures
 *
 * Provides a consistent baseline setup for all screenshot tests:
 * - Firebase Local Emulator Suite (if Java installed) OR mocked Firebase
 * - Authenticated test user
 * - Realistic baseline data (tasks, thoughts, goals, etc.)
 * - Fixed time for consistency
 * - Hidden dynamic elements
 * - Sync handling to wait for loading states
 */

export const test = base.extend({
  page: async ({ page }, use) => {
    // Check if emulators are available
    const useEmulators = await areEmulatorsAvailable();

    if (useEmulators) {
      // PATH 1: Use Firebase Emulators (preferred)
      
      // 1. Configure Firebase to use emulators BEFORE page loads
      await connectToEmulators(page);
      
      // 2. Mock time for consistency
      await mockDateTime(page, new Date('2024-01-15T10:00:00Z'));
      
      // 3. Disable offline indicators
      await disableOfflineIndicators(page);
      
      // 4. Navigate to a page first (so Firebase SDK loads)
      await page.goto('/');
      
      // 5. Wait for Firebase to initialize
      await page.waitForFunction(
        () => typeof (window as any).firebase !== 'undefined',
        { timeout: 10000 }
      );
      
      // 6. Initialize Firebase with emulator connection
      await initializeFirebaseWithEmulators(page);
      
      // 7. Create test user in Auth emulator
      await createTestUser(page, {
        uid: 'test-user-123',
        email: 'demo@focusnotebook.com',
        displayName: 'Demo User',
      });

      // 8. Generate and seed baseline data to Firestore emulator
      const baselineData = generateBaselineData('test-user-123');
      await seedDataToEmulator(page, {
        tasks: baselineData.tasks,
        thoughts: baselineData.thoughts,
        goals: baselineData.goals,
        projects: baselineData.projects,
        focusSessions: baselineData.focusSessions,
      });

      // 9. Wait for emulator data to sync
      await waitForEmulatorSync(page);
    } else {
      // PATH 2: Fall back to mocked Firebase (existing code works fine)
      await mockFirebase(page);
      await disableOfflineIndicators(page);
      await disableRealtimeSync(page);
      await mockDateTime(page, new Date('2024-01-15T10:00:00Z'));
      await setupMockAuth(page, {
        uid: 'test-user-123',
        email: 'demo@focusnotebook.com',
        displayName: 'Demo User',
      });
      await seedBaselineData(page, 'test-user-123');
      await markSyncComplete(page);
    }

    // Use the page in the test
    await use(page);
  },
});