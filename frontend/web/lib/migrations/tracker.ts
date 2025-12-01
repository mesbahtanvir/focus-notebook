import { collection, doc, getDocs, setDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { MigrationRecord } from './types';

/**
 * Migration Tracker
 *
 * Tracks which migrations have been executed for each user.
 * Migration records are stored in Firestore at: users/{userId}/migrations/{migrationId}
 */

/**
 * Get all executed migrations for a user
 */
export async function getExecutedMigrations(userId: string): Promise<MigrationRecord[]> {
  try {
    const migrationsRef = collection(db, `users/${userId}/migrations`);
    const q = query(migrationsRef, orderBy('version', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MigrationRecord[];
  } catch (error) {
    console.error('Failed to get executed migrations:', error);
    return [];
  }
}

/**
 * Check if a specific migration has been executed
 */
export async function hasMigrationExecuted(userId: string, migrationId: string): Promise<boolean> {
  const executed = await getExecutedMigrations(userId);
  return executed.some(m => m.id === migrationId && m.success);
}

/**
 * Get the highest executed migration version
 */
export async function getLatestMigrationVersion(userId: string): Promise<number> {
  const executed = await getExecutedMigrations(userId);
  const successful = executed.filter(m => m.success);
  if (successful.length === 0) return 0;
  return Math.max(...successful.map(m => m.version));
}

/**
 * Record a migration execution
 */
export async function recordMigration(
  userId: string,
  migrationRecord: MigrationRecord
): Promise<void> {
  try {
    const migrationRef = doc(db, `users/${userId}/migrations`, migrationRecord.id);
    await setDoc(migrationRef, migrationRecord);
  } catch (error) {
    console.error('Failed to record migration:', error);
    throw error;
  }
}

/**
 * Check if all previous migrations have been executed successfully
 */
export async function canExecuteMigration(userId: string, version: number): Promise<boolean> {
  if (version === 1) return true; // First migration can always run

  const latestVersion = await getLatestMigrationVersion(userId);
  return latestVersion >= version - 1;
}
