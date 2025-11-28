import { Migration, MigrationResult } from './types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { updateAt } from '@/lib/data/gateway';

/**
 * Migration: Archive Status Field
 *
 * Changes the task archiving system from using a separate `archived` boolean field
 * to using the `status` field with value 'archived'.
 *
 * This migration:
 * - Finds all tasks with archived=true
 * - Updates their status to 'archived'
 * - Maintains the archivedAt timestamp
 */
export const migration20250113_01: Migration = {
  id: '20250113-01-archive-status-field',
  version: 1,
  name: 'Archive Status Field Migration',
  description: 'Migrate archived tasks to use status field instead of archived boolean',

  execute: async (userId: string, onProgress?: (current: number, total: number) => void): Promise<MigrationResult> => {
    try {
      const tasksRef = collection(db, `users/${userId}/tasks`);
      const archivedQuery = query(tasksRef, where('archived', '==', true));
      const snapshot = await getDocs(archivedQuery);

      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter to only tasks that don't already have status='archived'
      const tasksToMigrate = tasks.filter((task: any) => task.status !== 'archived');

      if (tasksToMigrate.length === 0) {
        onProgress?.(0, 0);
        return {
          success: true,
          itemsProcessed: 0
        };
      }

      // Update tasks one by one to track progress
      let completed = 0;
      for (const task of tasksToMigrate) {
        await updateAt(`users/${userId}/tasks/${task.id}`, {
          status: 'archived',
          // Keep archived field for backward compatibility during transition
          archived: true,
        });
        completed++;
        onProgress?.(completed, tasksToMigrate.length);
      }

      return {
        success: true,
        itemsProcessed: tasksToMigrate.length
      };
    } catch (error) {
      console.error('Migration 20250113-01 failed:', error);
      return {
        success: false,
        itemsProcessed: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};
