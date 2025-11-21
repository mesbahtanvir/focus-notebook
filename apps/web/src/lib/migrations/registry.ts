import { Migration } from './types';
import { migration20250113_01 } from './20250113-01-archive-status-field';

/**
 * Migration Registry
 *
 * All migrations must be registered here in order.
 * The version number determines the execution order.
 *
 * Rules:
 * 1. Migrations are executed in order by version number
 * 2. A migration can only run if all previous migrations have succeeded
 * 3. Never remove or reorder existing migrations
 * 4. Always append new migrations to the end
 */
export const migrations: Migration[] = [
  migration20250113_01,
  // Add new migrations here
];

/**
 * Get all migrations in execution order
 */
export function getAllMigrations(): Migration[] {
  return [...migrations].sort((a, b) => a.version - b.version);
}

/**
 * Get a specific migration by ID
 */
export function getMigrationById(id: string): Migration | undefined {
  return migrations.find(m => m.id === id);
}

/**
 * Get a specific migration by version
 */
export function getMigrationByVersion(version: number): Migration | undefined {
  return migrations.find(m => m.version === version);
}
