"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { migrateTaskThoughtIds, checkMigrationStatus } from "@/lib/migrations/migrateTaskThoughtIds";
import { Database, RefreshCw, CheckCircle2, AlertTriangle, Info } from "lucide-react";

/**
 * Data Migration Component
 * Allows users to migrate their task data to the latest schema
 */
export function DataMigration() {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  const handleCheck = async () => {
    if (!user?.uid) return;

    setIsChecking(true);
    setStatus(null);
    setResult(null);

    try {
      const migrationStatus = await checkMigrationStatus(user.uid);
      setStatus(migrationStatus);
    } catch (error) {
      console.error("Error checking migration status:", error);
      alert("Failed to check migration status. See console for details.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleMigrate = async () => {
    if (!user?.uid) return;

    if (!confirm("This will update your tasks to link them with their source thoughts. Continue?")) {
      return;
    }

    setIsMigrating(true);
    setResult(null);

    try {
      const migrationResult = await migrateTaskThoughtIds(user.uid);
      setResult(migrationResult);

      if (migrationResult.success) {
        alert(`Migration completed! ${migrationResult.tasksMigrated} tasks updated.`);
        // Refresh status
        handleCheck();
      } else {
        alert(`Migration failed: ${migrationResult.errors.join(", ")}`);
      }
    } catch (error) {
      console.error("Error running migration:", error);
      alert("Migration failed. See console for details.");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <Database className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-bold">Data Migration</h2>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Task-Thought Linking Migration</p>
              <p>
                This migration updates tasks created from thoughts to properly display the
                &quot;From Thought&quot; badge. If you have tasks that were created from AI suggestions
                but don&apos;t show their source thought, run this migration.
              </p>
            </div>
          </div>
        </div>

        {/* Check Status Button */}
        <button
          onClick={handleCheck}
          disabled={isChecking || isMigrating}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
          {isChecking ? "Checking..." : "Check Migration Status"}
        </button>

        {/* Status Display */}
        {status && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
            <h3 className="font-semibold mb-3">Migration Status</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Total Tasks:</span>
                <span className="ml-2 font-medium">{status.totalTasks}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Already Migrated:</span>
                <span className="ml-2 font-medium text-green-600">
                  {status.tasksWithThoughtId}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">With Metadata:</span>
                <span className="ml-2 font-medium">{status.tasksWithMetadata}</span>
              </div>
              <div>
                <span className="text-muted-foreground">To Migrate:</span>
                <span className="ml-2 font-medium text-orange-600">
                  {status.tasksToMigrate}
                </span>
              </div>
            </div>

            {status.tasksToMigrate > 0 && (
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={handleMigrate}
                  disabled={isMigrating}
                  className="btn-primary flex items-center gap-2"
                >
                  <Database className={`h-4 w-4 ${isMigrating ? "animate-pulse" : ""}`} />
                  {isMigrating ? "Migrating..." : `Migrate ${status.tasksToMigrate} Tasks`}
                </button>
              </div>
            )}

            {status.tasksToMigrate === 0 && (
              <div className="mt-4 flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">All tasks are up to date!</span>
              </div>
            )}
          </div>
        )}

        {/* Migration Result */}
        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.success
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
            }`}
          >
            <div className="flex items-start gap-2">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="text-sm">
                <p className="font-medium mb-2">
                  {result.success ? "Migration Completed" : "Migration Failed"}
                </p>
                <div className="space-y-1 text-muted-foreground">
                  <p>Total Tasks: {result.totalTasks}</p>
                  <p>Tasks with Metadata: {result.tasksWithMetadata}</p>
                  <p className="font-medium text-green-600">Tasks Migrated: {result.tasksMigrated}</p>
                  {result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-red-600">Errors:</p>
                      <ul className="list-disc list-inside">
                        {result.errors.map((error: string, i: number) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
