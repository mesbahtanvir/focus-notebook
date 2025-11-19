'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { toastError, toastInfo, toastSuccess } from '@/lib/toast-presets';
import { Download, Upload, Database, Trash2, AlertTriangle } from 'lucide-react';
import { useImportExport } from '@/hooks/useImportExport';
import { ImportPreviewModal } from '@/components/import-export/ImportPreviewModal';
import { ImportProgressModal } from '@/components/import-export/ImportProgressModal';
import { ExportOptionsModal } from '@/components/import-export/ExportOptionsModal';
import { ImportSelection, ImportOptions } from '@/types/import-export';
import { deleteAllUserData } from '@/lib/utils/data-management';

interface EnhancedDataManagementProps {
  onDataChanged?: () => void;
}

export function EnhancedDataManagement({ onDataChanged }: EnhancedDataManagementProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    parseFile,
    executeImport,
    cancelImport,
    resetImport,
    parsedData,
    importProgress,
    importResult,
    isImporting,
    exportData,
    exportAll,
    getAvailableCounts,
    getDataSummaries,
    isExporting,
  } = useImportExport();

  // Modal states
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [showImportProgress, setShowImportProgress] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const availableCounts = getAvailableCounts();
  const totalItems = Object.values(availableCounts).reduce((sum, count) => sum + count, 0);
  const dataSummaries = getDataSummaries();

  const statsEntries = useMemo(
    () => [
      { label: 'Tasks', value: availableCounts.tasks, accent: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', bg: 'bg-purple-50 dark:bg-purple-950/20' },
      { label: 'Projects', value: availableCounts.projects, accent: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', bg: 'bg-blue-50 dark:bg-blue-950/20' },
      { label: 'Goals', value: availableCounts.goals, accent: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
      { label: 'Thoughts', value: availableCounts.thoughts, accent: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
      { label: 'Moods', value: availableCounts.moods, accent: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800', bg: 'bg-pink-50 dark:bg-pink-950/20' },
      { label: 'Focus Sessions', value: availableCounts.focusSessions, accent: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800', bg: 'bg-cyan-50 dark:bg-cyan-950/20' },
      { label: 'People', value: availableCounts.people, accent: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800', bg: 'bg-teal-50 dark:bg-teal-950/20' },
      { label: 'Portfolios', value: availableCounts.portfolios, accent: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', bg: 'bg-amber-50 dark:bg-amber-950/20' },
      { label: 'Transactions', value: availableCounts.spending, accent: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800', bg: 'bg-green-50 dark:bg-green-950/20' },
      { label: 'Total Items', value: totalItems, accent: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-800', bg: 'bg-emerald-50 dark:bg-emerald-950/20', highlight: true },
    ],
    [availableCounts, totalItems]
  );

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
      toastError({
        title: 'Invalid File Type',
        description: 'Please select a JSON file.',
      });
      return;
    }

    try {
      // Parse the file with progress tracking
      await parseFile(file);
      // Show preview modal
      setShowImportPreview(true);
    } catch (error) {
      toastError({
        title: 'Failed to Parse File',
        description: error instanceof Error ? error.message : 'Could not read the file.',
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle import start
  const handleStartImport = async (
    selection: ImportSelection,
    options: ImportOptions
  ) => {
    if (!parsedData) return;

    setShowImportPreview(false);
    setShowImportProgress(true);

    try {
      const result = await executeImport(parsedData, selection, options);

      if (result.success) {
        toastSuccess({
          title: 'Import Successful',
          description: `Successfully imported ${result.totalImported} items.`,
        });
      } else if (result.cancelled) {
        toastInfo({
          title: 'Import Cancelled',
          description: 'Import was cancelled by user.',
        });
      } else {
        toastError({
          title: 'Import Completed with Errors',
          description: `Imported ${result.totalImported} items with ${result.errors.length} errors.`,
        });
      }

      if (result.totalImported > 0) {
        onDataChanged?.();
      }
    } catch (error) {
      toastError({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'An error occurred during import.',
      });
    }
  };

  // Handle export with options
  const handleExportWithOptions = async (filters: any) => {
    try {
      await exportData(filters);
      setShowExportOptions(false);
      toastSuccess({
        title: 'Export Successful',
        description: 'Your data has been exported successfully.',
      });
    } catch (error) {
      toastError({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export data.',
      });
    }
  };

  // Handle quick export all
  const handleQuickExportAll = async () => {
    try {
      await exportAll();
      toastSuccess({
        title: 'Export Successful',
        description: 'All your data has been exported successfully.',
      });
    } catch (error) {
      toastError({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export data.',
      });
    }
  };

  const handleDeleteAllData = async () => {
    try {
      setIsDeleting(true);
      await deleteAllUserData();
      toastSuccess({
        title: 'All Data Deleted',
        description: 'Your workspace has been cleared. You can restore from a backup at any time.',
      });
      setShowDeleteConfirm(false);
      onDataChanged?.();
    } catch (error) {
      toastError({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete data. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Close progress modal when import is complete
  useEffect(() => {
    if (
      importResult &&
      (importResult.completed || importResult.cancelled) &&
      showImportProgress
    ) {
      // Keep modal open for a bit to show final state
      const timer = setTimeout(() => {
        setShowImportProgress(false);
        resetImport();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [importResult, showImportProgress, resetImport]);

  return (
    <div className="pt-10 space-y-6 border-t-4 border-green-200 dark:border-green-700">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-lg">
          <Database className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
          Enhanced Data Management
        </h3>
      </div>

      <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-8 border-2 border-green-200 dark:border-green-800 shadow-sm">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
          Advanced import/export with preview, conflict resolution, and progress tracking.
        </p>

        {/* Data Statistics */}
        <div className="mb-8">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Overview</h4>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {statsEntries.map((entry) => (
            <div
              key={entry.label}
              className={`p-4 text-center rounded-lg border shadow-sm ${entry.border} ${entry.bg} ${
                entry.highlight ? 'ring-1 ring-emerald-400/60 shadow-lg' : ''
              }`}
            >
              <div className={`text-2xl font-bold ${entry.accent}`}>{entry.value}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {entry.label}
              </div>
            </div>
          ))}
          </div>
        </div>

        {totalItems === 0 && (
          <div className="mb-8 rounded-lg border border-dashed border-green-300 dark:border-green-800 bg-white/70 dark:bg-gray-900/40 p-4 text-sm text-gray-600 dark:text-gray-400 text-center">
            No data yet. Import a backup file or keep using the app and your insights will appear here.
          </div>
        )}

        {/* Individual Tool Summaries */}
        {totalItems > 0 && (
          <div className="mb-8 space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Detailed Insights</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tasks Summary */}
              {dataSummaries.tasks.total > 0 && (
                <div className="p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/10 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3">Tasks</div>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Active:</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">{dataSummaries.tasks.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">{dataSummaries.tasks.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>High Priority:</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">{dataSummaries.tasks.highPriority}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Projects Summary */}
              {dataSummaries.projects.total > 0 && (
                <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/10 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">Projects</div>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Active:</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">{dataSummaries.projects.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">{dataSummaries.projects.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>On Hold:</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">{dataSummaries.projects.onHold}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Goals Summary */}
              {dataSummaries.goals.total > 0 && (
                <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-3">Goals</div>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Short-term:</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">{dataSummaries.goals.shortTerm}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Long-term:</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">{dataSummaries.goals.longTerm}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active:</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">{dataSummaries.goals.active}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Thoughts Summary */}
              {dataSummaries.thoughts.total > 0 && (
                <div className="p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/10 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 mb-3">Thoughts</div>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Deep Thoughts:</span>
                      <span className="font-medium text-yellow-600 dark:text-yellow-400">{dataSummaries.thoughts.deepThoughts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>With AI Suggestions:</span>
                      <span className="font-medium text-yellow-600 dark:text-yellow-400">{dataSummaries.thoughts.withSuggestions}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Moods Summary */}
              {dataSummaries.moods.total > 0 && (
                <div className="p-4 rounded-lg border border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/10 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm font-semibold text-pink-700 dark:text-pink-300 mb-3">Moods</div>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Average Mood:</span>
                      <span className="font-medium text-pink-600 dark:text-pink-400">{dataSummaries.moods.averageMood}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span>This Month:</span>
                      <span className="font-medium text-pink-600 dark:text-pink-400">{dataSummaries.moods.thisMonth}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Focus Sessions Summary */}
              {dataSummaries.focusSessions.total > 0 && (
                <div className="p-4 rounded-lg border border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/10 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 mb-3">Focus Sessions</div>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Total Time:</span>
                      <span className="font-medium text-cyan-600 dark:text-cyan-400">{dataSummaries.focusSessions.totalMinutes} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Rating:</span>
                      <span className="font-medium text-cyan-600 dark:text-cyan-400">{dataSummaries.focusSessions.averageRating}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>This Week:</span>
                      <span className="font-medium text-cyan-600 dark:text-cyan-400">{dataSummaries.focusSessions.thisWeek}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* People Summary */}
              {dataSummaries.people.total > 0 && (
                <div className="p-4 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/10 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm font-semibold text-teal-700 dark:text-teal-300 mb-3">People</div>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Family:</span>
                      <span className="font-medium text-teal-600 dark:text-teal-400">{dataSummaries.people.family}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Friends:</span>
                      <span className="font-medium text-teal-600 dark:text-teal-400">{dataSummaries.people.friends}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Colleagues:</span>
                      <span className="font-medium text-teal-600 dark:text-teal-400">{dataSummaries.people.colleagues}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Portfolios Summary */}
              {dataSummaries.portfolios.total > 0 && (
                <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3">Portfolios</div>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Active:</span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">{dataSummaries.portfolios.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Investments:</span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">{dataSummaries.portfolios.totalInvestments}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Spending Summary */}
              {dataSummaries.spending.total > 0 && (
                <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm font-semibold text-green-700 dark:text-green-300 mb-3">Transactions</div>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">${dataSummaries.spending.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>This Month:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">{dataSummaries.spending.thisMonth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Transaction:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">${dataSummaries.spending.averageTransaction}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Export Button */}
          <Button
            onClick={() => setShowExportOptions(true)}
            disabled={isExporting || totalItems === 0}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Data'}
          </Button>

          {/* Quick Export All */}
          <Button
            onClick={handleQuickExportAll}
            disabled={isExporting || totalItems === 0}
            variant="outline"
            className="flex-1 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
          >
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>

          {/* Import Button */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isImporting ? 'Importing...' : 'Import Data'}
          </Button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Danger Zone */}
        <div className="mt-6">
          <div className="rounded-lg border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10 p-4">
            {!showDeleteConfirm ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-2">
                  <div className="p-2 bg-red-600/10 text-red-700 dark:text-red-300 rounded-full">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-red-700 dark:text-red-200">
                      Delete All Data
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-300">
                      Permanently remove all tasks, goals, projects, thoughts, moods, focus sessions, people, and transactions from your account.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={totalItems === 0}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Everything
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-red-700 dark:text-red-200 mb-1">
                      Confirm permanent deletion
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-300 mb-2">
                      This action cannot be undone and will remove:
                    </p>
                    <ul className="text-xs text-red-600 dark:text-red-300 list-disc list-inside space-y-0.5">
                      <li>{availableCounts.tasks} tasks</li>
                      <li>{availableCounts.projects} projects</li>
                      <li>{availableCounts.goals} goals</li>
                      <li>{availableCounts.thoughts} thoughts</li>
                      <li>{availableCounts.moods} moods</li>
                      <li>{availableCounts.focusSessions} focus sessions</li>
                      <li>{availableCounts.people} people</li>
                      <li>{availableCounts.spending} transactions</li>
                    </ul>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleDeleteAllData}
                    disabled={isDeleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isDeleting ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Yes, delete everything
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-red-700 dark:text-red-300">
            Tip: Export a backup before deleting so you can restore your data later from the Import flow.
          </p>
        </div>

        {/* Features List */}
        <div className="mt-6 p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            New Features:
          </p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>✓ Preview items before importing</li>
            <li>✓ Select specific items to import</li>
            <li>✓ Automatic conflict detection & resolution</li>
            <li>✓ Real-time import progress with metadata</li>
            <li>✓ Export with advanced filtering options</li>
            <li>✓ Maintains all relationships between items</li>
          </ul>
        </div>
      </div>

      {/* Modals */}
      <ImportPreviewModal
        isOpen={showImportPreview}
        parsedData={parsedData}
        onClose={() => {
          setShowImportPreview(false);
          resetImport();
        }}
        onStartImport={handleStartImport}
      />

      <ImportProgressModal
        isOpen={showImportProgress}
        progress={importProgress}
        onCancel={cancelImport}
        onClose={() => {
          setShowImportProgress(false);
          resetImport();
        }}
        canClose={
          importProgress?.phase === 'completed' ||
          importProgress?.phase === 'failed' ||
          importProgress?.phase === 'cancelled'
        }
      />

      <ExportOptionsModal
        isOpen={showExportOptions}
        onClose={() => setShowExportOptions(false)}
        onExport={handleExportWithOptions}
        availableCounts={availableCounts}
      />
    </div>
  );
}
