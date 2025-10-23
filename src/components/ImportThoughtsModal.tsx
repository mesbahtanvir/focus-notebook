"use client";

import { motion } from "framer-motion";
import { X, Upload, CheckCircle, AlertCircle, FileText } from "lucide-react";

interface ImportedThought {
  text: string;
  tags?: string[];
  intensity?: number;
  notes?: string;
  isDeepThought?: boolean;
  deepThoughtNotes?: string;
  cbtAnalysis?: {
    situation?: string;
    automaticThought?: string;
    emotion?: string;
    evidence?: string;
    alternativeThought?: string;
    outcome?: string;
  };
}

interface ImportThoughtsModalProps {
  thoughts: ImportedThought[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImportThoughtsModal({ thoughts, onConfirm, onCancel }: ImportThoughtsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Import Thoughts
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Review {thoughts.length} thought{thoughts.length !== 1 ? 's' : ''} before importing
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {thoughts.map((thought, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800/50 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-gray-100 font-medium mb-2 break-words">
                    {thought.text}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    {thought.tags && thought.tags.length > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md">
                        <FileText className="h-3 w-3" />
                        {thought.tags.length} tag{thought.tags.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    
                    {thought.intensity && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-md">
                        Intensity: {thought.intensity}/10
                      </div>
                    )}
                    
                    {thought.notes && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md">
                        Has notes
                      </div>
                    )}
                    
                    {thought.isDeepThought && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md">
                        Deep thought
                      </div>
                    )}
                    
                    {thought.cbtAnalysis && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md">
                        CBT analysis
                      </div>
                    )}
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <AlertCircle className="h-4 w-4" />
              These thoughts will be added to your collection
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Import {thoughts.length} Thought{thoughts.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
