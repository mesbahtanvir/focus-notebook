"use client";

import { ProcessQueueItem } from '@/store/useProcessQueue';
import { X, AlertTriangle, Trash2, Tag, FileEdit, RefreshCw } from 'lucide-react';

interface RevertProcessingDialogProps {
  queueItem: ProcessQueueItem;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RevertProcessingDialog({ queueItem, onConfirm, onCancel }: RevertProcessingDialogProps) {
  const { revertData } = queueItem;
  
  const hasChanges = 
    revertData.createdItems.taskIds.length > 0 ||
    revertData.addedTags.length > 0 ||
    revertData.thoughtChanges.textChanged ||
    revertData.thoughtChanges.typeChanged;

  if (!hasChanges) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">No Changes to Revert</h3>
            <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-600 mb-4">This processing didn&apos;t make any changes.</p>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <h3 className="text-lg font-semibold">Revert Processing?</h3>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning */}
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-orange-800">
            This will completely undo all processing actions. The thought will return to unprocessed state.
          </p>
        </div>

        {/* Actions that will be reversed */}
        <div className="mb-6">
          <h4 className="font-semibold text-sm text-gray-700 mb-3">Actions that will be reversed:</h4>
          <div className="space-y-2">
            {/* Created Tasks */}
            {revertData.createdItems.taskIds.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <Trash2 className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-red-600">Delete {revertData.createdItems.taskIds.length} task(s)</span>
                </div>
              </div>
            )}

            {/* Added Tags */}
            {revertData.addedTags.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <Tag className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-blue-600">Remove tags:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {revertData.addedTags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Text Changes */}
            {revertData.thoughtChanges.textChanged && (
              <div className="flex items-start gap-2 text-sm">
                <FileEdit className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-purple-600">Restore original text</span>
                  {revertData.thoughtChanges.originalText && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      &quot;{revertData.thoughtChanges.originalText}&quot;
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Type Changes */}
            {revertData.thoughtChanges.typeChanged && (
              <div className="flex items-start gap-2 text-sm">
                <RefreshCw className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-green-600">
                    Restore type to: {revertData.thoughtChanges.originalType || 'neutral'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
          >
            Yes, Revert All
          </button>
        </div>
      </div>
    </div>
  );
}
