"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/store/useTasks';
import { useGoals } from '@/store/useGoals';
import { useProjects } from '@/store/useProjects';
import { useThoughts } from '@/store/useThoughts';
import { useMoods } from '@/store/useMoods';
import { useFocus } from '@/store/useFocus';
import { EnhancedDataManagement } from '@/components/EnhancedDataManagement';
import { DataDiagnostics } from '@/components/DataDiagnostics';
import { PhotoCleanupMigration } from '@/components/migrations/PhotoCleanupMigration';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { ShieldCheck, Zap, Database, Trash2, Loader2, AlertCircle, Info } from 'lucide-react';
import { usePhotoFeedback } from '@/store/usePhotoFeedback';
import { toastError, toastSuccess } from '@/lib/toast-presets';

export default function DataManagementPage() {
  const { user } = useAuth();
  const { loadLibrary, library, libraryLoading, deleteAllLibraryPhotos } = usePhotoFeedback();
  const [isClearingGallery, setIsClearingGallery] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const tasksSubscribe = useTasks((s) => s.subscribe);
  const goalsSubscribe = useGoals((s) => s.subscribe);
  const projectsSubscribe = useProjects((s) => s.subscribe);
  const thoughtsSubscribe = useThoughts((s) => s.subscribe);
  const moodsSubscribe = useMoods((s) => s.subscribe);
  const focusSubscribe = useFocus((s) => s.subscribe);

  useEffect(() => {
    if (!user?.uid) return;
    void loadLibrary();
  }, [user?.uid, loadLibrary]);

  const refreshAllStores = () => {
    if (!user?.uid) {
      return;
    }
    tasksSubscribe(user.uid);
    goalsSubscribe(user.uid);
    projectsSubscribe(user.uid);
    thoughtsSubscribe(user.uid);
    moodsSubscribe(user.uid);
    focusSubscribe(user.uid);
  };

  const handleDeleteAllPhotos = async () => {
    if (!user?.uid) {
      toastError({
        title: 'Sign in required',
        description: 'You need to be signed in to manage your dating photo gallery.',
      });
      return;
    }

    setIsClearingGallery(true);
    try {
      await deleteAllLibraryPhotos();
      toastSuccess({
        title: 'Gallery cleared',
        description: 'All dating photos have been removed from your account.',
      });
      setShowDeleteAllConfirm(false);
    } catch (error) {
      toastError({
        title: 'Could not delete photos',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsClearingGallery(false);
    }
  };

  return (
    <SettingsLayout
      title="Data Management"
      description="Import, export, and manage your Focus Notebook data"
    >
      <div className="space-y-8">
        {/* Feature Overview */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                  Conflict Detection
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Automatic conflict resolution during import
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
              <Zap className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                  Preview & Select
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Review data before importing
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800">
              <Database className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                  Real-time Progress
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Track import/export status
                </p>
              </div>
            </div>
          </div>

          {/* Safety Tips */}
          <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm text-gray-900 dark:text-white mb-2">
                  Data Safety Tips
                </div>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Always export a backup before making major changes</li>
                  <li>• Preview imported data carefully to avoid duplicates</li>
                  <li>• Use conflict resolution to handle duplicate items</li>
                  <li>• All relationships between items are preserved during import/export</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Data Diagnostics */}
        <section>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Diagnostics
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View and analyze your data storage
            </p>
          </div>
          <DataDiagnostics />
        </section>

        <Separator />

        {/* Migrations */}
        <section>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Migrations
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Run database migrations and cleanup tasks
            </p>
          </div>
          <PhotoCleanupMigration />
        </section>

        <Separator />

        {/* Import/Export */}
        <section>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Import & Export
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Backup and restore your data
            </p>
          </div>
          <EnhancedDataManagement onDataChanged={refreshAllStores} />
        </section>

        <Separator />

        {/* Photo Gallery Cleanup */}
        <section>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Dating Photo Gallery
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage your photo feedback gallery
            </p>
          </div>

          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                  Delete All Photos
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  This will permanently remove all photos from your gallery and their stats. This action cannot be undone.
                </p>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <span>
                    {libraryLoading ? 'Checking gallery...' : `${library.length} photo${library.length === 1 ? '' : 's'} stored`}
                  </span>
                  <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-700 dark:text-red-300">
                    Destructive
                  </Badge>
                </div>

                {!showDeleteAllConfirm ? (
                  <Button
                    onClick={() => setShowDeleteAllConfirm(true)}
                    disabled={libraryLoading || isClearingGallery || library.length === 0}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete all photos
                  </Button>
                ) : (
                  <div className="space-y-3 p-3 rounded-md bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-900 dark:text-red-200">
                      Are you sure? This will permanently delete all photos and their stats.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteAllConfirm(false)}
                        disabled={isClearingGallery}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteAllPhotos}
                        disabled={isClearingGallery}
                      >
                        {isClearingGallery ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Deleting...
                          </>
                        ) : (
                          'Yes, delete all'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </SettingsLayout>
  );
}
