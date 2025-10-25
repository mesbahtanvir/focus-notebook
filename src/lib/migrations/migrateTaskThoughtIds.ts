/**
 * Migration utility to update existing tasks with thoughtId field
 * from sourceThoughtId in notes metadata
 *
 * This migration is needed because older tasks stored the thought link
 * in the notes field as JSON metadata, but the new implementation uses
 * a dedicated thoughtId field for better querying and reliability.
 */

import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

interface TaskMetadata {
  sourceThoughtId?: string;
  createdBy?: string;
  processQueueId?: string;
  aiReasoning?: string;
  processedAt?: string;
  userNotes?: string;
}

export interface MigrationResult {
  success: boolean;
  totalTasks: number;
  tasksWithMetadata: number;
  tasksMigrated: number;
  errors: string[];
}

/**
 * Migrate all tasks for a specific user
 * Extracts thoughtId from notes metadata and sets it as a dedicated field
 */
export async function migrateTaskThoughtIds(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    totalTasks: 0,
    tasksWithMetadata: 0,
    tasksMigrated: 0,
    errors: [],
  };

  try {
    // Get all tasks for the user
    const tasksRef = collection(db, `users/${userId}/tasks`);
    const snapshot = await getDocs(tasksRef);

    result.totalTasks = snapshot.size;

    if (snapshot.empty) {
      result.success = true;
      return result;
    }

    // Batch updates for efficiency (max 500 operations per batch)
    let batch = writeBatch(db);
    let operationCount = 0;
    const batchLimit = 500;

    for (const taskDoc of snapshot.docs) {
      const taskData = taskDoc.data();

      // Skip if task already has thoughtId field
      if (taskData.thoughtId) {
        continue;
      }

      // Try to extract thoughtId from notes metadata
      if (taskData.notes && typeof taskData.notes === 'string') {
        try {
          const metadata: TaskMetadata = JSON.parse(taskData.notes);

          // Check if this is metadata (has sourceThoughtId or createdBy)
          if (metadata.sourceThoughtId || metadata.createdBy === 'thought-processor') {
            result.tasksWithMetadata++;

            // Update the task with thoughtId field
            if (metadata.sourceThoughtId) {
              const taskRef = doc(db, `users/${userId}/tasks/${taskDoc.id}`);
              batch.update(taskRef, {
                thoughtId: metadata.sourceThoughtId,
                updatedAt: Date.now(),
              });

              operationCount++;
              result.tasksMigrated++;

              // Commit batch if we hit the limit
              if (operationCount >= batchLimit) {
                await batch.commit();
                batch = writeBatch(db);
                operationCount = 0;
              }
            }
          }
        } catch (error) {
          // Not JSON or invalid format, skip
          continue;
        }
      }
    }

    // Commit remaining operations
    if (operationCount > 0) {
      await batch.commit();
    }

    result.success = true;
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

/**
 * Dry run - Check how many tasks would be migrated without actually migrating
 */
export async function checkMigrationStatus(userId: string): Promise<{
  totalTasks: number;
  tasksWithThoughtId: number;
  tasksWithMetadata: number;
  tasksToMigrate: number;
}> {
  const tasksRef = collection(db, `users/${userId}/tasks`);
  const snapshot = await getDocs(tasksRef);

  let tasksWithThoughtId = 0;
  let tasksWithMetadata = 0;
  let tasksToMigrate = 0;

  for (const taskDoc of snapshot.docs) {
    const taskData = taskDoc.data();

    if (taskData.thoughtId) {
      tasksWithThoughtId++;
      continue;
    }

    if (taskData.notes && typeof taskData.notes === 'string') {
      try {
        const metadata: TaskMetadata = JSON.parse(taskData.notes);
        if (metadata.sourceThoughtId || metadata.createdBy === 'thought-processor') {
          tasksWithMetadata++;
          if (metadata.sourceThoughtId) {
            tasksToMigrate++;
          }
        }
      } catch {
        // Not JSON, skip
      }
    }
  }

  return {
    totalTasks: snapshot.size,
    tasksWithThoughtId,
    tasksWithMetadata,
    tasksToMigrate,
  };
}
