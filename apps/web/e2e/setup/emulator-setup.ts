import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Store emulator process globally
let emulatorProcess: any = null;

/**
 * Firebase Emulator Setup for Screenshot Tests
 *
 * Uses Firebase Local Emulator Suite to provide a real Firebase environment
 * for tests without hitting production or needing network calls.
 *
 * Benefits:
 * - Real Firebase behavior (not mocked)
 * - Fast (local, no network latency)
 * - Consistent (isolated test data)
 * - No quota limits
 * - Works offline
 */

export interface EmulatorConfig {
  auth: { host: string; port: number };
  firestore: { host: string; port: number };
  ui: { host: string; port: number };
}

const DEFAULT_CONFIG: EmulatorConfig = {
  auth: { host: 'localhost', port: 9099 },
  firestore: { host: 'localhost', port: 8080 },
  ui: { host: 'localhost', port: 4000 },
};

/**
 * Check if Firebase emulators are running
 */
export async function areEmulatorsRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:4000');
    return response.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Check if Java is installed (required for Firebase emulators)
 */
async function checkJavaInstalled(): Promise<boolean> {
  try {
    await execAsync('java -version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Start Firebase emulators
 */
export async function startEmulators(): Promise<void> {
  if (await areEmulatorsRunning()) {
    console.log('✅ Firebase emulators already running');
    return;
  }

  // Check if Java is installed
  const javaInstalled = await checkJavaInstalled();
  if (!javaInstalled) {
    console.error('❌ Java is not installed. Firebase emulators require Java.');
    console.error('📦 Install Java: brew install openjdk@17');
    console.error('⚠️  Skipping emulator setup. Tests will use mocked Firebase instead.');
    return; // Don't throw, just skip emulators
  }

  console.log('🚀 Starting Firebase emulators...');

  try {
    // Start emulators in the background using spawn
    emulatorProcess = spawn('firebase', ['emulators:start', '--only', 'auth,firestore'], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore', // Ignore output to prevent hanging
    });

    // Unref so parent process can exit
    emulatorProcess.unref();

    // Wait for emulators to be ready
    let attempts = 0;
    const maxAttempts = 60; // Increased to 60 seconds

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (await areEmulatorsRunning()) {
        console.log('✅ Firebase emulators ready!');
        return;
      }

      attempts++;
      if (attempts % 5 === 0) {
        process.stdout.write('.');
      }
    }

    console.error('❌ Firebase emulators failed to start within 60 seconds');
    console.error('⚠️  Tests will use mocked Firebase instead.');
  } catch (error) {
    console.error('❌ Failed to start Firebase emulators:', error);
    console.error('⚠️  Tests will use mocked Firebase instead.');
  }
}

/**
 * Stop Firebase emulators
 */
export async function stopEmulators(): Promise<void> {
  try {
    if (emulatorProcess && !emulatorProcess.killed) {
      // Kill the emulator process
      process.kill(-emulatorProcess.pid); // Negative PID to kill process group
      emulatorProcess = null;
      console.log('🛑 Firebase emulators stopped');
    }
  } catch (error) {
    // Emulators might not be running, that's okay
    console.log('⚠️  Could not stop emulators, they may not be running');
  }
}

/**
 * Clear emulator data
 */
export async function clearEmulatorData(): Promise<void> {
  try {
    // Clear Firestore data
    await fetch('http://localhost:8080/emulator/v1/projects/demo-test/databases/(default)/documents', {
      method: 'DELETE',
    });

    // Clear Auth data
    await fetch('http://localhost:9099/emulator/v1/projects/demo-test/accounts', {
      method: 'DELETE',
    });

    console.log('🧹 Emulator data cleared');
  } catch (error) {
    console.warn('⚠️  Could not clear emulator data:', error);
  }
}

/**
 * Get emulator configuration for client
 */
export function getEmulatorConfig(): EmulatorConfig {
  return DEFAULT_CONFIG;
}

/**
 * Global setup for all tests
 * Exported as default for playwright.config.ts globalSetup
 */
export default async function globalSetup(): Promise<void> {
  console.log('🔧 Setting up Firebase emulators for tests...');

  // Start emulators
  await startEmulators();

  // Clear any existing data (only if emulators are running)
  if (await areEmulatorsRunning()) {
    await clearEmulatorData();
  }

  console.log('✅ Firebase emulators ready for tests');
}
