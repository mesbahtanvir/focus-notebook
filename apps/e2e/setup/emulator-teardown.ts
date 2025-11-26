import { clearEmulatorData } from './emulator-setup';

/**
 * Global Teardown for Firebase Emulators
 *
 * Runs after all tests complete to clean up emulator state
 */
export default async function globalTeardown() {
  console.log('🧹 Cleaning up Firebase emulators...');

  // Clear data
  await clearEmulatorData();

  // Note: We don't stop emulators here because they might be shared
  // across multiple test runs. Users can manually stop with:
  // firebase emulators:stop

  console.log('✅ Cleanup complete');
}
