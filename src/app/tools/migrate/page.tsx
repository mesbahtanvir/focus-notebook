'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebaseClient';
import { getAllMigrations } from '@/lib/migrations/registry';
import {
  getExecutedMigrations,
  recordMigration,
  canExecuteMigration,
} from '@/lib/migrations/tracker';
import { Migration, MigrationRecord } from '@/lib/migrations/types';

type MigrationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';

interface MigrationState {
  migration: Migration;
  status: MigrationStatus;
  record?: MigrationRecord;
  canRun: boolean;
  progress?: { current: number; total: number };
}

export default function MigratePage() {
  const [migrationStates, setMigrationStates] = useState<MigrationState[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningMigrationId, setRunningMigrationId] = useState<string | null>(null);

  useEffect(() => {
    loadMigrations();
  }, []);

  const loadMigrations = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const allMigrations = getAllMigrations();
      const executedRecords = await getExecutedMigrations(userId);
      const executedMap = new Map(executedRecords.map(r => [r.id, r]));

      const states: MigrationState[] = [];

      for (const migration of allMigrations) {
        const record = executedMap.get(migration.id);
        const canRun = await canExecuteMigration(userId, migration.version);

        let status: MigrationStatus;
        if (record?.success) {
          status = 'completed';
        } else if (record && !record.success) {
          status = 'failed';
        } else if (!canRun) {
          status = 'blocked';
        } else {
          status = 'pending';
        }

        states.push({
          migration,
          status,
          record,
          canRun,
        });
      }

      setMigrationStates(states);
    } catch (error) {
      console.error('Failed to load migrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeMigration = async (migrationState: MigrationState) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      alert('Not authenticated');
      return;
    }

    if (!migrationState.canRun) {
      alert('Previous migrations must be completed first');
      return;
    }

    setRunningMigrationId(migrationState.migration.id);

    // Update state to running
    setMigrationStates(prev =>
      prev.map(s =>
        s.migration.id === migrationState.migration.id
          ? { ...s, status: 'running' as MigrationStatus }
          : s
      )
    );

    try {
      const startTime = Date.now();
      const result = await migrationState.migration.execute(userId);
      const endTime = Date.now();

      const record: MigrationRecord = {
        id: migrationState.migration.id,
        version: migrationState.migration.version,
        name: migrationState.migration.name,
        executedAt: new Date().toISOString(),
        success: result.success,
        itemsProcessed: result.itemsProcessed,
        error: result.error,
      };

      await recordMigration(userId, record);

      // Update state to completed or failed
      setMigrationStates(prev =>
        prev.map(s =>
          s.migration.id === migrationState.migration.id
            ? {
                ...s,
                status: result.success ? ('completed' as MigrationStatus) : ('failed' as MigrationStatus),
                record,
              }
            : s
        )
      );

      // Reload to update canRun status for subsequent migrations
      await loadMigrations();
    } catch (error) {
      console.error('Migration execution failed:', error);

      const record: MigrationRecord = {
        id: migrationState.migration.id,
        version: migrationState.migration.version,
        name: migrationState.migration.name,
        executedAt: new Date().toISOString(),
        success: false,
        itemsProcessed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      await recordMigration(userId, record);

      setMigrationStates(prev =>
        prev.map(s =>
          s.migration.id === migrationState.migration.id
            ? { ...s, status: 'failed' as MigrationStatus, record }
            : s
        )
      );
    } finally {
      setRunningMigrationId(null);
    }
  };

  const executeAllPending = async () => {
    for (const state of migrationStates) {
      if (state.status === 'pending' && state.canRun) {
        await executeMigration(state);
        // Check if it failed, if so, stop
        const updatedState = migrationStates.find(s => s.migration.id === state.migration.id);
        if (updatedState?.status === 'failed') {
          break;
        }
      }
    }
  };

  const getStatusBadge = (status: MigrationStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            ✓ Completed
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            ⟳ Running...
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            ✗ Failed
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
            🔒 Blocked
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            ⏸ Pending
          </span>
        );
    }
  };

  const pendingCount = migrationStates.filter(s => s.status === 'pending' && s.canRun).length;
  const completedCount = migrationStates.filter(s => s.status === 'completed').length;
  const totalCount = migrationStates.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
            Database Migrations
          </h1>

          <div className="mb-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Database migrations help keep your data structure up to date. Migrations are executed in order,
              and each migration must complete successfully before the next one can run.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Migration Status
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">Total migrations:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{totalCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">Completed:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{completedCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">Pending:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{pendingCount}</span>
                  </div>
                </div>
              </div>

              {/* Run All Button */}
              {pendingCount > 0 && (
                <div className="mb-6">
                  <button
                    onClick={executeAllPending}
                    disabled={runningMigrationId !== null}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    {runningMigrationId ? 'Running...' : `Run All Pending Migrations (${pendingCount})`}
                  </button>
                </div>
              )}

              {/* Migration List */}
              <div className="space-y-4">
                {migrationStates.map((state) => (
                  <div
                    key={state.migration.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                            v{state.migration.version}
                          </span>
                          {getStatusBadge(state.status)}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {state.migration.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {state.migration.description}
                        </p>
                      </div>

                      {state.status === 'pending' && state.canRun && (
                        <button
                          onClick={() => executeMigration(state)}
                          disabled={runningMigrationId !== null}
                          className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
                        >
                          Run
                        </button>
                      )}
                    </div>

                    {state.record && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Executed:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">
                              {new Date(state.record.executedAt).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Items processed:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">
                              {state.record.itemsProcessed}
                            </span>
                          </div>
                        </div>
                        {state.record.error && (
                          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                            Error: {state.record.error}
                          </div>
                        )}
                      </div>
                    )}

                    {state.status === 'blocked' && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          This migration is blocked. Previous migrations must be completed first.
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {totalCount === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">No migrations available</p>
                  </div>
                )}
              </div>

              {completedCount === totalCount && totalCount > 0 && (
                <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-green-900 dark:text-green-100 text-center font-semibold">
                    ✓ All migrations completed successfully!
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
