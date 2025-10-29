'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Database } from 'lucide-react';
import { useImportExport } from '@/hooks/useImportExport';
import { ImportPreviewModal } from '@/components/import-export/ImportPreviewModal';
import { ImportProgressModal } from '@/components/import-export/ImportProgressModal';
import { ExportOptionsModal } from '@/components/import-export/ExportOptionsModal';
import { ImportSelection, ImportOptions } from '@/types/import-export';

export function EnhancedDataManagement() {
  const { toast } = useToast();
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
    isExporting,
  } = useImportExport();

  // Modal states
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [showImportProgress, setShowImportProgress] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  const availableCounts = getAvailableCounts();
  const totalItems = Object.values(availableCounts).reduce((sum, count) => sum + count, 0);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select a JSON file.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Parse the file with progress tracking
      await parseFile(file);
      // Show preview modal
      setShowImportPreview(true);
    } catch (error) {
      toast({
        title: 'Failed to Parse File',
        description: error instanceof Error ? error.message : 'Could not read the file.',
        variant: 'destructive',
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
        toast({
          title: 'Import Successful',
          description: `Successfully imported ${result.totalImported} items.`,
        });
      } else if (result.cancelled) {
        toast({
          title: 'Import Cancelled',
          description: 'Import was cancelled by user.',
        });
      } else {
        toast({
          title: 'Import Completed with Errors',
          description: `Imported ${result.totalImported} items with ${result.errors.length} errors.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'An error occurred during import.',
        variant: 'destructive',
      });
    }
  };

  // Handle export with options
  const handleExportWithOptions = async (filters: any) => {
    try {
      await exportData(filters);
      setShowExportOptions(false);
      toast({
        title: 'Export Successful',
        description: 'Your data has been exported successfully.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export data.',
        variant: 'destructive',
      });
    }
  };

  // Handle quick export all
  const handleQuickExportAll = async () => {
    try {
      await exportAll();
      toast({
        title: 'Export Successful',
        description: 'All your data has been exported successfully.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export data.',
        variant: 'destructive',
      });
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
    <div className="pt-8 space-y-4 border-t-4 border-green-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full">
          <Database className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
          Enhanced Data Management
        </h3>
      </div>

      <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-6 border-2 border-green-200 dark:border-green-800">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          Advanced import/export with preview, conflict resolution, and progress tracking.
        </p>

        {/* Data Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {availableCounts.tasks}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {availableCounts.projects}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Projects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {availableCounts.goals}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Goals</div>
          </div>
          <div className="text-center border-l-2 border-gray-300 dark:border-gray-600">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {totalItems}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Items</div>
          </div>
        </div>

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

        {/* Features List */}
        <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800">
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
