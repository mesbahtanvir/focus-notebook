"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useThoughts, Thought } from "@/store/useThoughts";
import { useProcessQueue } from "@/store/useProcessQueue";
import { actionExecutor } from "@/lib/thoughtProcessor/actionExecutor";
import { cascadingDelete } from "@/lib/thoughtProcessor/cascadingDelete";
import { RevertProcessingDialog } from "./RevertProcessingDialog";
import { 
  X, 
  Trash2,
  Save,
  Brain,
  Tag,
  Heart,
  Calendar,
  Lightbulb,
  FileText,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  Sparkles
} from "lucide-react";

interface ThoughtDetailModalProps {
  thought: Thought;
  onClose: () => void;
}

export function ThoughtDetailModal({ thought, onClose }: ThoughtDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(thought.text);
  const [intensity, setIntensity] = useState(thought.intensity || 5);
  const [tagsInput, setTagsInput] = useState(() => {
    if (!thought.tags) return '';
    if (Array.isArray(thought.tags)) return thought.tags.join(', ');
    if (typeof thought.tags === 'string') return thought.tags;
    return '';
  });
  const [showRevertDialog, setShowRevertDialog] = useState(false);

  const updateThought = useThoughts((s) => s.updateThought);
  const deleteThought = useThoughts((s) => s.deleteThought);
  
  // Processing queue
  const queue = useProcessQueue((s) => s.queue);
  const isProcessed = Array.isArray(thought.tags) && thought.tags.includes('processed');
  
  // Find the queue item for this thought (most recent completed)
  const queueItem = queue
    .filter(q => q.thoughtId === thought.id && q.status === 'completed')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  const handleSave = async () => {
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    await updateThought(thought.id, {
      text,
      intensity: intensity,
      tags: tags.length > 0 ? tags : undefined,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    // Count related items
    const relatedItems = queue
      .filter(q => q.thoughtId === thought.id && (q.status === 'completed' || q.status === 'processing'))
      .reduce((acc, q) => {
        const taskIds = q.revertData?.createdItems?.taskIds || [];
        return acc + taskIds.length;
      }, 0);

    const message = relatedItems > 0
      ? `Are you sure you want to delete this thought?\n\nThis will also delete:\n• ${relatedItems} related task(s)\n• All processing history\n\nThis cannot be undone.`
      : 'Are you sure you want to delete this thought?\n\nThis cannot be undone.';

    if (confirm(message)) {
      const result = await cascadingDelete.deleteThoughtWithRelated(thought.id);
      if (result.success) {
        console.log(`Deleted: ${result.deleted.tasks} tasks, ${result.deleted.thoughts} thought(s)`);
      }
      onClose();
    }
  };

  const handleRevert = async () => {
    if (!queueItem) return;
    
    const result = await actionExecutor.revertProcessing(queueItem.id);
    if (result.success) {
      setShowRevertDialog(false);
      // Refresh to show updated state
      onClose();
    } else {
      alert(`Failed to revert: ${result.error}`);
    }
  };

  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    try {
      // Handle Firebase Timestamp
      if (typeof date === 'object' && 'toDate' in date) {
        return date.toDate().toLocaleString();
      }
      // Handle ISO string
      if (typeof date === 'string') {
        return new Date(date).toLocaleString();
      }
      // Handle timestamp in seconds
      if (typeof date === 'object' && 'seconds' in date) {
        return new Date(date.seconds * 1000).toLocaleString();
      }
      return new Date(date).toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950/30 rounded-3xl shadow-2xl border-4 border-purple-200 dark:border-purple-800 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 border-b-4 border-purple-300 dark:border-purple-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Thought Details</h2>
                {isProcessed && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 bg-gradient-to-r from-green-400 to-emerald-400 text-white text-xs font-semibold rounded-full shadow-md">
                    <CheckCircle2 className="h-3 w-3" />
                    AI Processed
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isProcessed && queueItem && (
                <button
                  onClick={() => setShowRevertDialog(true)}
                  className="px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm font-semibold"
                  title="Revert processing"
                >
                  <RotateCcw className="h-4 w-4" />
                  Revert
                </button>
              )}
              <button
                onClick={handleDelete}
                className="p-2.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

        </div>

        {/* Content */}
        <div className="p-6 bg-white dark:bg-gray-900 overflow-y-auto">
          {
            <div className="space-y-6">
              {/* Thought Text */}
              <div>
                <label className="block text-sm font-medium mb-2">Thought</label>
                {isEditing ? (
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full min-h-[120px] p-4 rounded-xl border-2 border-purple-200 dark:border-purple-800 focus:border-purple-400 dark:focus:border-purple-600 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 bg-white dark:bg-gray-800 transition-all"
                  />
                ) : (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-2 border-purple-200 dark:border-purple-800">
                    <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed">
                      {thought.text}
                    </p>
                  </div>
                )}
              </div>

              {/* Intensity */}
              {thought.intensity && (
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Intensity
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={intensity}
                        onChange={(e) => setIntensity(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>1 (Low)</span>
                        <span className="font-medium">{intensity}/10</span>
                        <span>10 (High)</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">{thought.intensity}/10</span>
                  )}
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="Enter tags separated by commas"
                      className="w-full p-3 rounded-xl border-2 border-purple-200 dark:border-purple-800 focus:border-purple-400 dark:focus:border-purple-600 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 bg-white dark:bg-gray-800 transition-all"
                    />
                  ) : thought.tags && Array.isArray(thought.tags) && thought.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {thought.tags.map((tag, i) => (
                        <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold shadow-sm">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 italic">No tags</span>
                  )}
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t-2 border-purple-200 dark:border-purple-800 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Created:</span> {formatDate(thought.createdAt)}
                </div>
                {thought.cbtAnalysis?.analyzedAt && (
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">CBT Analyzed:</span> {formatDate(thought.cbtAnalysis.analyzedAt)}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t-2 border-purple-200 dark:border-purple-800">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-5 py-2.5 text-sm font-semibold rounded-xl border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    ✏️ Edit Thought
                  </button>
                )}
              </div>
            </div>
          }
        </div>
      </motion.div>

      {/* Revert Dialog */}
      {showRevertDialog && queueItem && (
        <RevertProcessingDialog
          queueItem={queueItem}
          onConfirm={handleRevert}
          onCancel={() => setShowRevertDialog(false)}
        />
      )}
    </div>
  );
}
