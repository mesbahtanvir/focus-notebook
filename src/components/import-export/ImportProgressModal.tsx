'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
  X,
  Clock,
  Zap,
  FileText,
  Folder,
  Target,
  Lightbulb,
  Smile,
  Timer,
  Users,
  Briefcase,
  ChevronDown,
  ChevronUp,
  DollarSign,
} from 'lucide-react';
import { ImportProgress, ImportPhase, EntityType } from '@/types/import-export';

interface ImportProgressModalProps {
  isOpen: boolean;
  progress: ImportProgress | null;
  onCancel: () => void;
  onClose: () => void;
  canClose: boolean;
}

const entityIcons: Record<EntityType, React.ComponentType<any>> = {
  tasks: FileText,
  projects: Folder,
  goals: Target,
  thoughts: Lightbulb,
  moods: Smile,
  focusSessions: Timer,
  people: Users,
  portfolios: Briefcase,
  spending: DollarSign,
};

const entityLabels: Record<EntityType, string> = {
  tasks: 'Tasks',
  projects: 'Projects',
  goals: 'Goals',
  thoughts: 'Thoughts',
  moods: 'Moods',
  focusSessions: 'Focus Sessions',
  people: 'People',
  portfolios: 'Portfolios',
  spending: 'Transactions',
};

const phaseLabels: Record<ImportPhase, string> = {
  [ImportPhase.PARSING]: 'Parsing file...',
  [ImportPhase.VALIDATING]: 'Validating data...',
  [ImportPhase.DETECTING_CONFLICTS]: 'Detecting conflicts...',
  [ImportPhase.PREPARING]: 'Preparing import...',
  [ImportPhase.IMPORTING_GOALS]: 'Importing goals...',
  [ImportPhase.IMPORTING_PROJECTS]: 'Importing projects...',
  [ImportPhase.IMPORTING_TASKS]: 'Importing tasks...',
  [ImportPhase.IMPORTING_THOUGHTS]: 'Importing thoughts...',
  [ImportPhase.IMPORTING_MOODS]: 'Importing moods...',
  [ImportPhase.IMPORTING_FOCUS_SESSIONS]: 'Importing focus sessions...',
  [ImportPhase.IMPORTING_PEOPLE]: 'Importing people...',
  [ImportPhase.IMPORTING_PORTFOLIOS]: 'Importing portfolios...',
  [ImportPhase.IMPORTING_SPENDING]: 'Importing transactions...',
  [ImportPhase.UPDATING_REFERENCES]: 'Updating references...',
  [ImportPhase.COMPLETING]: 'Completing import...',
  [ImportPhase.COMPLETED]: 'Import completed!',
  [ImportPhase.FAILED]: 'Import failed',
  [ImportPhase.CANCELLED]: 'Import cancelled',
};

export function ImportProgressModal({
  isOpen,
  progress,
  onCancel,
  onClose,
  canClose,
}: ImportProgressModalProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  const isComplete =
    progress?.phase === ImportPhase.COMPLETED ||
    progress?.phase === ImportPhase.FAILED ||
    progress?.phase === ImportPhase.CANCELLED;

  const isSuccess = progress?.phase === ImportPhase.COMPLETED;
  const isFailed = progress?.phase === ImportPhase.FAILED;
  const isCancelled = progress?.phase === ImportPhase.CANCELLED;

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatSpeed = (speed: number): string => {
    if (speed > 10) {
      return `${speed.toFixed(0)} items/sec`;
    } else {
      return `${speed.toFixed(1)} items/sec`;
    }
  };

  if (!isOpen || !progress) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 shadow-2xl border border-purple-500/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            {isSuccess ? (
              <CheckCircle2 className="h-6 w-6 text-green-400" />
            ) : isFailed ? (
              <XCircle className="h-6 w-6 text-red-400" />
            ) : isCancelled ? (
              <AlertCircle className="h-6 w-6 text-yellow-400" />
            ) : (
              <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
            )}
            <div>
              <h2 className="text-xl font-bold text-white">
                {isSuccess
                  ? 'Import Successful'
                  : isFailed
                  ? 'Import Failed'
                  : isCancelled
                  ? 'Import Cancelled'
                  : 'Importing Data'}
              </h2>
              <p className="text-sm text-gray-400">{phaseLabels[progress.phase]}</p>
            </div>
          </div>
          {canClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300 font-medium">Overall Progress</span>
              <span className="text-purple-400 font-bold">{progress.overallProgress}%</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress.overallProgress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
              />
            </div>
          </div>

          {/* Current Item Being Imported */}
          {progress.currentEntityName && !isComplete && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <Loader2 className="h-5 w-5 text-purple-400 animate-spin mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-gray-400">Currently importing:</p>
                  <p className="text-white font-medium">{progress.currentEntityName}</p>
                  {progress.currentEntityDetails && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {progress.currentEntityDetails.category && (
                        <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300">
                          {progress.currentEntityDetails.category}
                        </span>
                      )}
                      {progress.currentEntityDetails.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <FileText className="h-4 w-4" />
                <span>Items</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {progress.itemsProcessed} / {progress.itemsTotal}
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Clock className="h-4 w-4" />
                <span>Elapsed</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatTime(progress.elapsedTime)}
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Zap className="h-4 w-4" />
                <span>Speed</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {progress.speed ? formatSpeed(progress.speed) : '--'}
              </p>
            </div>
          </div>

          {/* ETA */}
          {progress.estimatedTimeRemaining !== undefined &&
            progress.estimatedTimeRemaining > 0 &&
            !isComplete && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-300 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>
                    Estimated time remaining: {formatTime(progress.estimatedTimeRemaining)}
                  </span>
                </div>
              </div>
            )}

          {/* Entity Breakdown */}
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full mb-3 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <span className="font-medium">Import Details</span>
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  {Object.entries(progress.itemsByType).map(([type, stats]) => {
                    const Icon = entityIcons[type as EntityType];
                    const label = entityLabels[type as EntityType];

                    if (stats.total === 0) return null;

                    return (
                      <div
                        key={type}
                        className="bg-gray-800/30 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-300">{label}</span>
                          </div>
                          <span className="text-sm text-gray-400">
                            {stats.processed} / {stats.total}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.progress}%` }}
                            transition={{ duration: 0.3 }}
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logs */}
          {progress.logs.length > 0 && (
            <div>
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="flex items-center justify-between w-full mb-3 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <span className="font-medium">Activity Log</span>
                {showLogs ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              <AnimatePresence>
                {showLogs && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gray-800/30 rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto"
                  >
                    {progress.logs.slice().reverse().map((log, index) => (
                      <div
                        key={index}
                        className={`text-xs flex items-start gap-2 ${
                          log.level === 'error'
                            ? 'text-red-400'
                            : log.level === 'warning'
                            ? 'text-yellow-400'
                            : log.level === 'success'
                            ? 'text-green-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {log.level === 'error' ? (
                          <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        ) : log.level === 'warning' ? (
                          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        ) : log.level === 'success' ? (
                          <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        ) : (
                          <div className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        )}
                        <span>{log.message}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Errors */}
          {progress.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-2">
                <AlertCircle className="h-4 w-4" />
                <span>Errors ({progress.errors.length})</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {progress.errors.slice(0, 5).map((error, index) => (
                  <p key={index} className="text-xs text-red-300">
                    {error.entityName ? `${error.entityName}: ` : ''}
                    {error.message}
                  </p>
                ))}
                {progress.errors.length > 5 && (
                  <p className="text-xs text-red-400">
                    ...and {progress.errors.length - 5} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {progress.warnings.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-2">
                <AlertCircle className="h-4 w-4" />
                <span>Warnings ({progress.warnings.length})</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {progress.warnings.slice(0, 5).map((warning, index) => (
                  <p key={index} className="text-xs text-yellow-300">
                    {warning.entityName ? `${warning.entityName}: ` : ''}
                    {warning.message}
                  </p>
                ))}
                {progress.warnings.length > 5 && (
                  <p className="text-xs text-yellow-400">
                    ...and {progress.warnings.length - 5} more warnings
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-purple-500/20">
          {!isComplete && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              Cancel Import
            </button>
          )}
          {canClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
            >
              {isComplete ? 'Close' : 'Close'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
