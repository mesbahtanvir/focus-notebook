"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ArrowLeft, Database, ShieldCheck, Zap, Trash2, Loader2 } from 'lucide-react';
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
    <div className="container mx-auto py-6 sm:py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Link href="/settings" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
          Settings
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100 font-medium">Data Management</span>
      </div>

      {/* Page Header */}
      <Card className="border-4 border-purple-200 shadow-xl bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-900/20">
        <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 border-b-4 border-purple-200 dark:border-purple-700">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Data Management
                </CardTitle>
              </div>
              <CardDescription className="text-gray-600 dark:text-gray-300 font-medium text-base">
                Import, export, and manage your Focus Notebook data with advanced controls
              </CardDescription>
            </div>
            <Link href="/settings">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Settings
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-800">
              <div className="p-2 bg-blue-500 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  Conflict Detection
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Automatically detect and resolve data conflicts during import
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800">
              <div className="p-2 bg-green-500 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-green-900 dark:text-green-100">
                  Preview & Select
                </div>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Preview all items before importing and choose what to include
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-800">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-purple-900 dark:text-purple-100">
                  Real-time Progress
                </div>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  Track import progress with detailed status for each data type
                </p>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="rounded-lg border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4 mb-6">
            <div className="flex items-start gap-2">
              <div className="text-yellow-600 dark:text-yellow-400 text-lg">💡</div>
              <div>
                <div className="font-semibold text-yellow-900 dark:text-yellow-100 text-sm mb-1">
                  Data Safety Tips
                </div>
                <ul className="text-xs text-yellow-800 dark:text-yellow-300 space-y-1">
                  <li>• Always export a backup before making major changes</li>
                  <li>• Preview imported data carefully to avoid duplicates</li>
                  <li>• Use conflict resolution to handle duplicate items</li>
                  <li>• All relationships between items are preserved during import/export</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Diagnostics & Migration */}
      <DataDiagnostics />

      {/* Photo Database Cleanup Migration */}
      <PhotoCleanupMigration />

      {/* Enhanced Data Management Component */}
      <EnhancedDataManagement onDataChanged={refreshAllStores} />

      {/* Photo Feedback Cleanup */}
      <Card className="border-2 border-red-200 dark:border-red-800 bg-white dark:bg-gray-900/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-red-700 dark:text-red-300">
            Dating Photo Gallery
          </CardTitle>
          <CardDescription className="text-sm text-red-700/80 dark:text-red-200/80">
            Remove the entire gallery, including Storage files and library stats. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span>
              {libraryLoading ? 'Checking your gallery…' : `${library.length} photo${library.length === 1 ? '' : 's'} currently stored.`}
            </span>
            <Badge variant="outline" className="border-red-200 text-red-700 dark:border-red-700 dark:text-red-200">
              Destructive action
            </Badge>
          </div>
          <Button
            onClick={() => setShowDeleteAllConfirm(true)}
            disabled={libraryLoading || isClearingGallery || library.length === 0}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete all dating photos
          </Button>
          {showDeleteAllConfirm && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 p-4 space-y-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                This permanently removes every uploaded dating photo and their stats. Your friends&apos; results will keep their votes, but
                the gallery will be empty.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteAllConfirm(false)}
                  disabled={isClearingGallery}
                >
                  Keep photos
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleDeleteAllPhotos}
                  disabled={isClearingGallery}
                >
                  {isClearingGallery ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deleting…
                    </>
                  ) : (
                    'Yes, delete everything'
                  )}
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Tip: export your data first if you might need these photos later. Deleting the gallery also removes their stats inside
            the Photo Feedback tool.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
