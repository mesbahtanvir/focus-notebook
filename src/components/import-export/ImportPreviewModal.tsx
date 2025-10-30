'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  FileText,
  AlertTriangle,
  Settings,
  Play,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
} from 'lucide-react';
import {
  ParsedImportData,
  ImportSelection,
  ImportOptions,
  EntityType,
  ConflictResolution,
} from '@/types/import-export';
import { EntityPreviewTable } from './EntityPreviewTable';
import { ConflictResolutionPanel } from './ConflictResolutionPanel';

interface ImportPreviewModalProps {
  isOpen: boolean;
  parsedData: ParsedImportData | null;
  onClose: () => void;
  onStartImport: (selection: ImportSelection, options: ImportOptions) => void;
}

enum WizardStep {
  UPLOAD = 0,
  PREVIEW = 1,
  CONFLICTS = 2,
  OPTIONS = 3,
  CONFIRM = 4,
}

const stepTitles = {
  [WizardStep.UPLOAD]: 'Upload File',
  [WizardStep.PREVIEW]: 'Preview & Select',
  [WizardStep.CONFLICTS]: 'Resolve Conflicts',
  [WizardStep.OPTIONS]: 'Import Options',
  [WizardStep.CONFIRM]: 'Confirm Import',
};

export function ImportPreviewModal({
  isOpen,
  parsedData,
  onClose,
  onStartImport,
}: ImportPreviewModalProps) {
  const [currentStep, setCurrentStep] = useState(WizardStep.PREVIEW);
  const [selectedTab, setSelectedTab] = useState<EntityType>('tasks');
  const [selection, setSelection] = useState<ImportSelection>({
    selectedItems: new Map(),
    skippedItems: new Map(),
    conflictResolutions: new Map(),
    totalSelected: 0,
    totalSkipped: 0,
  });
  const [options, setOptions] = useState<ImportOptions>({
    strategy: 'skip-existing',
    preserveIds: true,
    updateReferences: true,
    createBackup: false,
    autoResolveConflicts: false,
    defaultConflictResolution: ConflictResolution.SKIP,
  });

  // Initialize selection when parsed data changes
  useEffect(() => {
    if (parsedData) {
      const newSelection: ImportSelection = {
        selectedItems: new Map(),
        skippedItems: new Map(),
        conflictResolutions: new Map(),
        totalSelected: 0,
        totalSkipped: 0,
      };

      // Select all items by default
      const entityTypes: EntityType[] = [
        'tasks',
        'projects',
        'goals',
        'thoughts',
        'moods',
        'focusSessions',
        'people',
      ];

      for (const entityType of entityTypes) {
        const entities = parsedData.entities[entityType] || [];
        if (entities.length > 0) {
          const ids = new Set(entities.map((e: any) => e.id));
          newSelection.selectedItems.set(entityType, ids);
          newSelection.totalSelected += ids.size;
        }
      }

      setSelection(newSelection);

      // Set first available tab
      const firstType = entityTypes.find(
        (type) => parsedData.entities[type]?.length > 0
      );
      if (firstType) {
        setSelectedTab(firstType);
      }

      // Start at conflicts step if there are conflicts
      if (parsedData.conflicts.totalConflicts > 0) {
        setCurrentStep(WizardStep.CONFLICTS);
      } else {
        setCurrentStep(WizardStep.PREVIEW);
      }
    }
  }, [parsedData]);

  if (!isOpen || !parsedData) return null;

  const entityTypes: EntityType[] = [
    'tasks',
    'projects',
    'goals',
    'thoughts',
    'moods',
    'focusSessions',
    'people',
  ];

  const availableEntityTypes = entityTypes.filter(
    (type) => parsedData.entities[type]?.length > 0
  );

  const hasConflicts = parsedData.conflicts.totalConflicts > 0;
  const unresolvedConflicts = parsedData.conflicts.conflicts.filter(
    (c) => !c.resolution
  ).length;

  // Handlers
  const handleToggleItem = (entityType: EntityType, id: string) => {
    const selectedIds = selection.selectedItems.get(entityType) || new Set();
    const skippedIds = selection.skippedItems.get(entityType) || new Set();

    if (selectedIds.has(id)) {
      selectedIds.delete(id);
      skippedIds.add(id);
      selection.totalSelected--;
      selection.totalSkipped++;
    } else {
      selectedIds.add(id);
      skippedIds.delete(id);
      selection.totalSelected++;
      selection.totalSkipped--;
    }

    setSelection({ ...selection });
  };

  const handleToggleAll = (entityType: EntityType, selected: boolean) => {
    const entities = parsedData.entities[entityType] || [];
    const ids = new Set(entities.map((e: any) => e.id));

    const currentSelected = selection.selectedItems.get(entityType) || new Set();
    const currentSkipped = selection.skippedItems.get(entityType) || new Set();

    // Update counts
    selection.totalSelected -= currentSelected.size;
    selection.totalSkipped -= currentSkipped.size;

    if (selected) {
      selection.selectedItems.set(entityType, ids);
      selection.skippedItems.set(entityType, new Set());
      selection.totalSelected += ids.size;
    } else {
      selection.selectedItems.set(entityType, new Set());
      selection.skippedItems.set(entityType, ids);
      selection.totalSkipped += ids.size;
    }

    setSelection({ ...selection });
  };

  const handleResolveConflict = (conflictId: string, resolution: ConflictResolution) => {
    const conflict = parsedData.conflicts.conflicts.find((c) => c.id === conflictId);
    if (conflict) {
      conflict.resolution = resolution;
      selection.conflictResolutions.set(conflictId, resolution);

      // If skip, remove from selection
      if (resolution === ConflictResolution.SKIP) {
        const selectedIds =
          selection.selectedItems.get(conflict.entityType) || new Set();
        if (selectedIds.has(conflict.entityId)) {
          selectedIds.delete(conflict.entityId);
          selection.totalSelected--;
          selection.totalSkipped++;
        }
      }

      setSelection({ ...selection });
    }
  };

  const handleResolveAllConflicts = (resolution: ConflictResolution) => {
    for (const conflict of parsedData.conflicts.conflicts) {
      handleResolveConflict(conflict.id, resolution);
    }
  };

  const handleStartImport = () => {
    onStartImport(selection, options);
  };

  const canProceed = () => {
    if (currentStep === WizardStep.CONFLICTS && unresolvedConflicts > 0) {
      return false;
    }
    if (currentStep === WizardStep.CONFIRM && selection.totalSelected === 0) {
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (currentStep < WizardStep.CONFIRM) {
      // Skip conflicts step if no conflicts
      if (currentStep === WizardStep.PREVIEW && !hasConflicts) {
        setCurrentStep(WizardStep.OPTIONS);
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > WizardStep.PREVIEW) {
      // Skip conflicts step if no conflicts
      if (currentStep === WizardStep.OPTIONS && !hasConflicts) {
        setCurrentStep(WizardStep.PREVIEW);
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 shadow-2xl border border-purple-500/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <div>
            <h2 className="text-xl font-bold text-white">Import Data</h2>
            <p className="text-sm text-gray-400">{stepTitles[currentStep]}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            {[
              WizardStep.PREVIEW,
              ...(hasConflicts ? [WizardStep.CONFLICTS] : []),
              WizardStep.OPTIONS,
              WizardStep.CONFIRM,
            ].map((step, index, array) => (
              <React.Fragment key={step}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                      currentStep === step
                        ? 'border-purple-500 bg-purple-500 text-white'
                        : currentStep > step
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-600 bg-gray-800 text-gray-400'
                    }`}
                  >
                    {currentStep > step ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-bold">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      currentStep === step
                        ? 'text-white'
                        : currentStep > step
                        ? 'text-green-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {stepTitles[step]}
                  </span>
                </div>
                {index < array.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 ${
                      currentStep > step ? 'bg-green-500' : 'bg-gray-700'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
          <AnimatePresence mode="wait">
            {/* Preview Step */}
            {currentStep === WizardStep.PREVIEW && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-300 text-sm">
                    <FileText className="h-4 w-4" />
                    <span>
                      Found {parsedData.stats.totalItems} items to import
                      {hasConflicts && ` · ${parsedData.conflicts.totalConflicts} conflicts detected`}
                    </span>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-700">
                  {availableEntityTypes.map((type) => {
                    const count = parsedData.entities[type]?.length || 0;
                    const selected =
                      selection.selectedItems.get(type)?.size || 0;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedTab(type)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          selectedTab === type
                            ? 'border-purple-500 text-white'
                            : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)} ({selected}/{count})
                      </button>
                    );
                  })}
                </div>

                {/* Entity Table */}
                <EntityPreviewTable
                  entityType={selectedTab}
                  entities={parsedData.entities[selectedTab] || []}
                  selectedIds={selection.selectedItems.get(selectedTab) || new Set()}
                  conflicts={parsedData.conflicts.conflicts}
                  onToggle={(id) => handleToggleItem(selectedTab, id)}
                  onToggleAll={(selected) => handleToggleAll(selectedTab, selected)}
                />
              </motion.div>
            )}

            {/* Conflicts Step */}
            {currentStep === WizardStep.CONFLICTS && (
              <motion.div
                key="conflicts"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ConflictResolutionPanel
                  conflicts={parsedData.conflicts.conflicts}
                  onResolve={handleResolveConflict}
                  onResolveAll={handleResolveAllConflicts}
                />
              </motion.div>
            )}

            {/* Options Step */}
            {currentStep === WizardStep.OPTIONS && (
              <motion.div
                key="options"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
                  {/* Strategy */}
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">
                      Import Strategy
                    </label>
                    <select
                      value={options.strategy}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          strategy: e.target.value as any,
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="skip-existing">Skip existing items</option>
                      <option value="replace">Replace existing items</option>
                      <option value="merge">Merge with existing items</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      How to handle items that already exist
                    </p>
                  </div>

                  {/* Preserve IDs */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="preserveIds"
                      checked={options.preserveIds}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          preserveIds: e.target.checked,
                        })
                      }
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor="preserveIds" className="text-sm font-medium text-white">
                        Preserve original IDs
                      </label>
                      <p className="text-xs text-gray-400">
                        Keep the same IDs from the import file
                      </p>
                    </div>
                  </div>

                  {/* Update References */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="updateReferences"
                      checked={options.updateReferences}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          updateReferences: e.target.checked,
                        })
                      }
                      className="mt-1"
                    />
                    <div>
                      <label
                        htmlFor="updateReferences"
                        className="text-sm font-medium text-white"
                      >
                        Update references
                      </label>
                      <p className="text-xs text-gray-400">
                        Automatically update relationships between items
                      </p>
                    </div>
                  </div>

                  {/* Create Backup */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="createBackup"
                      checked={options.createBackup}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          createBackup: e.target.checked,
                        })
                      }
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor="createBackup" className="text-sm font-medium text-white">
                        Create backup before import
                      </label>
                      <p className="text-xs text-gray-400">
                        Save current data before importing (recommended)
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Confirm Step */}
            {currentStep === WizardStep.CONFIRM && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Ready to Import
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-white">
                        {selection.totalSelected}
                      </p>
                      <p className="text-sm text-gray-400">Items to import</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-gray-400">
                        {selection.totalSkipped}
                      </p>
                      <p className="text-sm text-gray-400">Items to skip</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {availableEntityTypes.map((type) => {
                      const selected =
                        selection.selectedItems.get(type)?.size || 0;
                      if (selected === 0) return null;
                      return (
                        <div key={type} className="flex justify-between text-gray-300">
                          <span>
                            {type.charAt(0).toUpperCase() + type.slice(1)}:
                          </span>
                          <span className="text-white font-medium">
                            {selected} items
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
                    <div className="text-sm text-yellow-300">
                      <p className="font-medium mb-1">Before you continue:</p>
                      <ul className="list-disc list-inside space-y-1 text-yellow-300/80">
                        <li>This action cannot be undone</li>
                        <li>
                          Existing items will be {options.strategy === 'skip-existing' ? 'kept' : options.strategy === 'replace' ? 'replaced' : 'merged'}
                        </li>
                        {options.createBackup && (
                          <li>A backup will be created automatically</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-purple-500/20">
          <div className="text-sm text-gray-400">
            {selection.totalSelected} items selected
            {unresolvedConflicts > 0 && (
              <span className="text-yellow-400 ml-2">
                · {unresolvedConflicts} conflicts unresolved
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep > WizardStep.PREVIEW && (
              <button
                onClick={prevStep}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}

            {currentStep < WizardStep.CONFIRM ? (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleStartImport}
                disabled={!canProceed()}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Play className="h-4 w-4" />
                Start Import
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
