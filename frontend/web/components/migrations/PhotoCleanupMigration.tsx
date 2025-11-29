'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cleanupOrphanedThumbnails } from '@/lib/migrations/cleanupOrphanedThumbnails';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export function PhotoCleanupMigration() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    orphanedThumbnailsDeleted: number;
    photoBattlesFixed: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunMigration = async () => {
    if (!user || user.isAnonymous) {
      setError('You must be signed in to run this migration');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const migrationResult = await cleanupOrphanedThumbnails(user.uid);
      setResult(migrationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Photo Database Cleanup
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            This migration will clean up orphaned thumbnails and fix inconsistencies in your photo battles.
            It will:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 mt-2 space-y-1">
            <li>Remove deleted photos from active battle sessions</li>
            <li>Delete orphaned thumbnail files from storage</li>
            <li>Ensure database consistency across all photo-related collections</li>
          </ul>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
            ⚠️ This operation is safe but may take a few seconds. You only need to run it once.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleRunMigration}
          disabled={isRunning || !user || user.isAnonymous}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running cleanup...
            </>
          ) : (
            'Run Cleanup'
          )}
        </Button>

        {result && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span>
              Cleanup complete! Fixed {result.photoBattlesFixed} battles, deleted {result.orphanedThumbnailsDeleted} orphaned files
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-200">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && result.errors.length > 0 && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 p-3">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
            Warnings:
          </p>
          <ul className="list-disc list-inside text-xs text-amber-700 dark:text-amber-300 space-y-1">
            {result.errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div className="rounded-md bg-purple-50 dark:bg-purple-900/20 p-3 text-xs text-gray-600 dark:text-gray-300">
          <p>
            <strong>Photo battles fixed:</strong> {result.photoBattlesFixed}
          </p>
          <p>
            <strong>Orphaned files deleted:</strong> {result.orphanedThumbnailsDeleted}
          </p>
          <p>
            <strong>Status:</strong> {result.errors.length > 0 ? 'Completed with warnings' : 'Success'}
          </p>
        </div>
      )}
    </div>
  );
}
