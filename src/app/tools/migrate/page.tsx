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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Play,
  Loader2,
  AlertCircle,
  Database,
  ArrowRight
} from 'lucide-react';

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
          ? { ...s, status: 'running' as MigrationStatus, progress: { current: 0, total: 0 } }
          : s
      )
    );

    try {
      const result = await migrationState.migration.execute(
        userId,
        (current: number, total: number) => {
          // Update progress
          setMigrationStates(prev =>
            prev.map(s =>
              s.migration.id === migrationState.migration.id
                ? { ...s, progress: { current, total } }
                : s
            )
          );
        }
      );

      const record: MigrationRecord = {
        id: migrationState.migration.id,
        version: migrationState.migration.version,
        name: migrationState.migration.name,
        executedAt: new Date().toISOString(),
        success: result.success,
        itemsProcessed: result.itemsProcessed,
        ...(result.error && { error: result.error }),
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

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const record: MigrationRecord = {
        id: migrationState.migration.id,
        version: migrationState.migration.version,
        name: migrationState.migration.name,
        executedAt: new Date().toISOString(),
        success: false,
        itemsProcessed: 0,
        error: errorMessage,
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

  const getStatusIcon = (status: MigrationStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'blocked':
        return <Lock className="h-5 w-5 text-gray-400 dark:text-gray-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
    }
  };

  const getStatusBadge = (status: MigrationStatus) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700">
            Completed
          </Badge>
        );
      case 'running':
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700">
            Running
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700">
            Failed
          </Badge>
        );
      case 'blocked':
        return (
          <Badge variant="outline" className="text-gray-600 dark:text-gray-400">
            Blocked
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-700">
            Pending
          </Badge>
        );
    }
  };

  const pendingCount = migrationStates.filter(s => s.status === 'pending' && s.canRun).length;
  const completedCount = migrationStates.filter(s => s.status === 'completed').length;
  const totalCount = migrationStates.length;

  return (
    <div className="container mx-auto py-4 px-3 space-y-4 max-w-4xl">
      {/* Compact Header */}
      <div className="flex items-baseline gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <RefreshCw className="h-6 w-6 text-orange-600" />
          Database Migrations
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Summary Card */}
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-600" />
                Migration Status
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completedCount}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingCount}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Pending</div>
                </div>
              </div>

              {pendingCount > 0 && (
                <Button
                  onClick={executeAllPending}
                  disabled={runningMigrationId !== null}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  {runningMigrationId ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running migrations...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run All Pending ({pendingCount})
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Info Alert */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">About Migrations</p>
              <p className="text-blue-700 dark:text-blue-300">
                Migrations update your data structure. They run sequentially and must complete successfully before the next one can run.
              </p>
            </div>
          </div>

          {/* Migration List */}
          <div className="space-y-3">
            {migrationStates.map((state) => {
              const statusColor = {
                completed: 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10',
                running: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10',
                failed: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10',
                blocked: 'border-gray-200 dark:border-gray-700',
                pending: 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10',
              }[state.status];

              return (
                <Card key={state.migration.id} className={`${statusColor} transition-all`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(state.status)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                v{state.migration.version}
                              </span>
                              {getStatusBadge(state.status)}
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                              {state.migration.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {state.migration.description}
                            </p>
                          </div>

                          {/* Action Button */}
                          {state.status === 'pending' && state.canRun && (
                            <Button
                              onClick={() => executeMigration(state)}
                              disabled={runningMigrationId !== null}
                              size="sm"
                              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700"
                            >
                              <Play className="h-3 w-3" />
                              Run
                            </Button>
                          )}

                          {state.status === 'failed' && (
                            <Button
                              onClick={() => executeMigration(state)}
                              disabled={runningMigrationId !== null}
                              size="sm"
                              variant="outline"
                              className="flex-shrink-0 border-red-300 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Retry
                            </Button>
                          )}
                        </div>

                        {/* Progress Bar */}
                        {state.status === 'running' && state.progress && state.progress.total > 0 && (
                          <div className="space-y-1.5">
                            <Progress
                              value={(state.progress.current / state.progress.total) * 100}
                              className="h-2 bg-blue-200 dark:bg-blue-800"
                            />
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Processing: {state.progress.current} / {state.progress.total} items
                            </div>
                          </div>
                        )}

                        {/* Record Details */}
                        {state.record && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">Executed:</span>
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {new Date(state.record.executedAt).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">Items processed:</span>
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {state.record.itemsProcessed}
                                </span>
                              </div>
                            </div>
                            {state.record.error && (
                              <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                  <div className="text-xs text-red-800 dark:text-red-200">
                                    <span className="font-semibold">Error: </span>
                                    {state.record.error}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Blocked Message */}
                        {state.status === 'blocked' && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Lock className="h-3 w-3" />
                            Previous migrations must be completed first
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {totalCount === 0 && (
              <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="py-12 text-center">
                  <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No migrations available</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Success Message */}
          {completedCount === totalCount && totalCount > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-green-900 dark:text-green-100">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-semibold">All migrations completed successfully!</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
