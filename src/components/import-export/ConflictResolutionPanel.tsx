'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  XCircle,
  CheckCircle,
  RefreshCw,
  PlusCircle,
  FileText,
  Folder,
  Target,
  Lightbulb,
  Smile,
  Timer,
  Users,
} from 'lucide-react';
import {
  Conflict,
  ConflictType,
  ConflictResolution,
  EntityType,
} from '@/types/import-export';

interface ConflictResolutionPanelProps {
  conflicts: Conflict[];
  onResolve: (conflictId: string, resolution: ConflictResolution) => void;
  onResolveAll: (resolution: ConflictResolution) => void;
}

const entityIcons: Record<EntityType, React.ComponentType<any>> = {
  tasks: FileText,
  projects: Folder,
  goals: Target,
  thoughts: Lightbulb,
  moods: Smile,
  focusSessions: Timer,
  people: Users,
};

const conflictTypeLabels: Record<ConflictType, string> = {
  [ConflictType.DUPLICATE_ID]: 'Duplicate ID',
  [ConflictType.BROKEN_REFERENCE]: 'Broken Reference',
  [ConflictType.VERSION_MISMATCH]: 'Version Mismatch',
  [ConflictType.DATA_CONSTRAINT]: 'Data Constraint',
};

const resolutionLabels: Record<ConflictResolution, string> = {
  [ConflictResolution.SKIP]: 'Skip',
  [ConflictResolution.REPLACE]: 'Replace',
  [ConflictResolution.MERGE]: 'Merge',
  [ConflictResolution.CREATE_NEW]: 'Create New',
  [ConflictResolution.ASK_USER]: 'Decide Later',
};

const resolutionIcons: Record<ConflictResolution, React.ComponentType<any>> = {
  [ConflictResolution.SKIP]: XCircle,
  [ConflictResolution.REPLACE]: RefreshCw,
  [ConflictResolution.MERGE]: CheckCircle,
  [ConflictResolution.CREATE_NEW]: PlusCircle,
  [ConflictResolution.ASK_USER]: AlertTriangle,
};

export function ConflictResolutionPanel({
  conflicts,
  onResolve,
  onResolveAll,
}: ConflictResolutionPanelProps) {
  const unresolvedConflicts = conflicts.filter((c) => !c.resolution);
  const duplicateIdConflicts = conflicts.filter(
    (c) => c.type === ConflictType.DUPLICATE_ID
  );
  const brokenRefConflicts = conflicts.filter(
    (c) => c.type === ConflictType.BROKEN_REFERENCE
  );

  if (conflicts.length === 0) {
    return (
      <div className="text-center py-8 text-green-400">
        <CheckCircle className="h-12 w-12 mx-auto mb-3" />
        <p className="font-medium">No conflicts detected</p>
        <p className="text-sm text-gray-400 mt-1">All items are ready to import</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-white font-medium mb-1">
              {unresolvedConflicts.length} conflict{unresolvedConflicts.length !== 1 ? 's' : ''} need
              {unresolvedConflicts.length !== 1 ? '' : 's'} resolution
            </h3>
            <p className="text-sm text-gray-300">
              {duplicateIdConflicts.length} duplicate ID{duplicateIdConflicts.length !== 1 ? 's' : ''}
              {brokenRefConflicts.length > 0 && `, ${brokenRefConflicts.length} broken reference${brokenRefConflicts.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {unresolvedConflicts.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400 font-medium">Apply to all conflicts:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onResolveAll(ConflictResolution.SKIP)}
              className="px-3 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors text-sm flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Skip All
            </button>
            <button
              onClick={() => onResolveAll(ConflictResolution.REPLACE)}
              className="px-3 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors text-sm flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Replace All
            </button>
            <button
              onClick={() => onResolveAll(ConflictResolution.CREATE_NEW)}
              className="px-3 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors text-sm flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Create New for All
            </button>
          </div>
        </div>
      )}

      {/* Conflicts List */}
      <div className="space-y-3">
        {conflicts.map((conflict) => {
          const Icon = entityIcons[conflict.entityType];
          const isResolved = !!conflict.resolution;

          return (
            <motion.div
              key={conflict.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg border p-4 ${
                isResolved
                  ? 'bg-gray-800/30 border-gray-700'
                  : 'bg-yellow-500/5 border-yellow-500/20'
              }`}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-medium">
                      {conflict.itemTitle || conflict.entityId}
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                      {conflictTypeLabels[conflict.type]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{conflict.message}</p>

                  {/* Broken reference details */}
                  {conflict.details && (
                    <div className="mt-2 text-xs text-gray-400">
                      <span className="font-medium">Referenced:</span>{' '}
                      {conflict.details.referencedEntity} ID {conflict.details.referencedId}
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution Options */}
              {isResolved ? (
                <div className="flex items-center gap-2 text-sm">
                  {React.createElement(resolutionIcons[conflict.resolution!], {
                    className: 'h-4 w-4 text-green-400',
                  })}
                  <span className="text-green-400">
                    Resolved: {resolutionLabels[conflict.resolution!]}
                  </span>
                  <button
                    onClick={() => onResolve(conflict.id, ConflictResolution.ASK_USER)}
                    className="ml-auto text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium">Choose resolution:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onResolve(conflict.id, ConflictResolution.SKIP)}
                      className="px-3 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors text-sm flex items-center gap-2 justify-center"
                    >
                      <XCircle className="h-4 w-4" />
                      Skip
                    </button>

                    {conflict.type === ConflictType.DUPLICATE_ID && (
                      <>
                        <button
                          onClick={() => onResolve(conflict.id, ConflictResolution.REPLACE)}
                          className="px-3 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors text-sm flex items-center gap-2 justify-center"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Replace
                        </button>
                        <button
                          onClick={() => onResolve(conflict.id, ConflictResolution.MERGE)}
                          className="px-3 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors text-sm flex items-center gap-2 justify-center"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Merge
                        </button>
                        <button
                          onClick={() => onResolve(conflict.id, ConflictResolution.CREATE_NEW)}
                          className="px-3 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors text-sm flex items-center gap-2 justify-center"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Create New
                        </button>
                      </>
                    )}

                    {conflict.type === ConflictType.BROKEN_REFERENCE && (
                      <button
                        onClick={() => onResolve(conflict.id, ConflictResolution.CREATE_NEW)}
                        className="px-3 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors text-sm flex items-center gap-2 justify-center"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Remove Reference
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
        <p className="text-sm text-gray-400 font-medium mb-3">Resolution Options:</p>
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
          <div>
            <span className="font-medium text-red-300">Skip:</span> Don&apos;t import this item
          </div>
          <div>
            <span className="font-medium text-blue-300">Replace:</span> Overwrite existing item
          </div>
          <div>
            <span className="font-medium text-purple-300">Merge:</span> Combine with existing
          </div>
          <div>
            <span className="font-medium text-green-300">Create New:</span> Generate new ID
          </div>
        </div>
      </div>
    </div>
  );
}
