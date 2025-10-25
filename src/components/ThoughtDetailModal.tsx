"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useThoughts, Thought } from "@/store/useThoughts";
import { useProcessQueue } from "@/store/useProcessQueue";
import { actionExecutor } from "@/lib/thoughtProcessor/actionExecutor";
import { cascadingDelete } from "@/lib/thoughtProcessor/cascadingDelete";
import { approvalHandler } from "@/lib/thoughtProcessor/approvalHandler";
import { manualProcessor } from "@/lib/thoughtProcessor/manualProcessor";
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
  Sparkles,
  Check,
  RefreshCw,
  Target,
  Link as LinkIcon,
  AlertCircle,
  Key
} from "lucide-react";

interface ThoughtDetailModalProps {
  thought: Thought;
  onClose: () => void;
}

export function ThoughtDetailModal({ thought, onClose }: ThoughtDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(thought.text);
  const [tagsInput, setTagsInput] = useState(() => {
    if (!thought.tags) return '';
    if (Array.isArray(thought.tags)) return thought.tags.join(', ');
    if (typeof thought.tags === 'string') return thought.tags;
    return '';
  });
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const updateThought = useThoughts((s) => s.updateThought);
  const deleteThought = useThoughts((s) => s.deleteThought);
  
  // Processing queue
  const queue = useProcessQueue((s) => s.queue);
  const isProcessed = Array.isArray(thought.tags) && thought.tags.includes('processed');
  
  // Find queue items for this thought
  const completedQueueItem = queue
    .filter(q => q.thoughtId === thought.id && q.status === 'completed')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  
  // Find awaiting approval queue item
  const awaitingQueueItem = queue.find(
    q => q.thoughtId === thought.id && q.status === 'awaiting-approval'
  );
  
  const queueItem = awaitingQueueItem || completedQueueItem;
  
  // AI suggestions state
  const [selectedActions, setSelectedActions] = useState<Set<string>>(
    new Set(awaitingQueueItem?.actions.map(a => a.id) || [])
  );

  const handleSave = async () => {
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    await updateThought(thought.id, {
      text,
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
    if (!completedQueueItem) return;
    
    const result = await actionExecutor.revertProcessing(completedQueueItem.id);
    if (result.success) {
      setShowRevertDialog(false);
      onClose();
    } else {
      alert(`Failed to revert: ${result.error}`);
    }
  };
  
  const toggleAction = (actionId: string) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(actionId)) {
      newSelected.delete(actionId);
    } else {
      newSelected.add(actionId);
    }
    setSelectedActions(newSelected);
  };
  
  const handleApproveActions = async () => {
    if (!awaitingQueueItem) return;
    
    const result = await approvalHandler.approveAndExecute(
      awaitingQueueItem.id,
      Array.from(selectedActions)
    );
    
    if (result.success) {
      onClose();
    } else {
      alert(`Failed to approve: ${result.error || 'Unknown error'}`);
    }
  };
  
  const handleRejectActions = async () => {
    if (!awaitingQueueItem) return;

    await approvalHandler.rejectProcessing(awaitingQueueItem.id);
    onClose();
  };

  const handleProcessNow = async () => {
    if (isProcessed) {
      setErrorMessage('This thought has already been processed');
      setShowErrorModal(true);
      return;
    }

    setIsProcessing(true);

    const result = await manualProcessor.processThought(thought.id);

    if (result.success) {
      // Success - actions are now awaiting approval in the queue
      // The approval UI will show automatically when queue updates
    } else {
      const needsApiKey = result.error === 'OpenAI API key not configured';
      setErrorMessage(needsApiKey
        ? 'Please configure your OpenAI API key in Settings to enable AI-powered thought processing.'
        : `Failed to process: ${result.error || 'Unknown error'}`);
      setShowErrorModal(true);
    }

    setIsProcessing(false);
  };

  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    try {
      if (typeof date === 'object' && 'toDate' in date) {
        return date.toDate().toLocaleString();
      }
      if (typeof date === 'string') {
        return new Date(date).toLocaleString();
      }
      if (typeof date === 'object' && 'seconds' in date) {
        return new Date(date.seconds * 1000).toLocaleString();
      }
      return new Date(date).toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'createTask': return <CheckCircle2 className="h-4 w-4" />;
      case 'addTag': return <Tag className="h-4 w-4" />;
      case 'enhanceThought': return <Sparkles className="h-4 w-4" />;
      case 'changeType': return <RefreshCw className="h-4 w-4" />;
      case 'setIntensity': return <TrendingUp className="h-4 w-4" />;
      case 'createMoodEntry': return <Heart className="h-4 w-4" />;
      case 'createProject': return <Target className="h-4 w-4" />;
      case 'linkToProject': return <LinkIcon className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'createTask': return 'from-blue-500 to-cyan-500';
      case 'addTag': return 'from-purple-500 to-pink-500';
      case 'enhanceThought': return 'from-amber-500 to-orange-500';
      case 'changeType': return 'from-green-500 to-emerald-500';
      case 'setIntensity': return 'from-red-500 to-rose-500';
      case 'createMoodEntry': return 'from-pink-500 to-rose-500';
      case 'createProject': return 'from-blue-500 to-cyan-500';
      case 'linkToProject': return 'from-teal-500 to-emerald-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950/30 rounded-3xl shadow-2xl border-4 border-purple-200 dark:border-purple-800 ${queueItem ? 'max-w-7xl' : 'max-w-4xl'} w-full max-h-[90vh] flex flex-col overflow-hidden`}
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
              {!isProcessed && !awaitingQueueItem && (
                <button
                  onClick={handleProcessNow}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Process this thought with AI"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Process Now
                    </>
                  )}
                </button>
              )}
              {isProcessed && completedQueueItem && (
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

        {/* Content - Split Layout */}
        <div className="flex-1 overflow-hidden">
          <div className={`h-full ${queueItem ? 'grid grid-cols-1 lg:grid-cols-2 gap-0' : ''}`}>
            {/* Left Side - Thought Details */}
            <div className={`p-6 bg-white dark:bg-gray-900 overflow-y-auto ${queueItem ? 'border-r-2 border-purple-200 dark:border-purple-800' : ''}`}>
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
            </div>

            {/* Right Side - AI Suggestions */}
            {queueItem && (
              <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-purple-900/20 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-500" />
                      AI Suggestions
                    </h3>
                    {awaitingQueueItem && (
                      <span className="px-3 py-1 bg-gradient-to-r from-orange-400 to-amber-400 text-white text-xs font-bold rounded-full shadow-sm animate-pulse">
                        Awaiting Review
                      </span>
                    )}
                  </div>

                  {/* AI Response Summary */}
                  {queueItem.aiResponse && (
                    <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg text-white">
                          <Brain className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">AI Analysis</h4>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            Confidence: {Math.round((queueItem.aiResponse.confidence || 0.5) * 100)}%
                          </p>
                          {queueItem.aiResponse.suggestedTools && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              Tools: {queueItem.aiResponse.suggestedTools.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions List */}
                  <div className="space-y-3">
                    {queueItem.actions.map((action) => {
                      const isSelected = selectedActions.has(action.id);
                      const canSelect = !!awaitingQueueItem;
                      
                      return (
                        <div
                          key={action.id}
                          onClick={() => canSelect && toggleAction(action.id)}
                          className={`rounded-xl border-2 transition-all ${
                            canSelect ? 'cursor-pointer' : 'cursor-default'
                          } ${
                            isSelected
                              ? 'border-purple-300 bg-purple-100 dark:bg-purple-900/30 shadow-md'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="p-3">
                            <div className="flex items-start gap-2">
                              {canSelect && (
                                <div className="mt-0.5">
                                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                                    isSelected
                                      ? 'bg-purple-600 border-purple-600'
                                      : 'border-gray-300 dark:border-gray-600'
                                  }`}>
                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                  </div>
                                </div>
                              )}

                              <div className={`p-1.5 rounded-lg bg-gradient-to-r ${getActionColor(action.type)} text-white`}>
                                {getActionIcon(action.type)}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h5 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                                  {action.type === 'createTask' && `Task: ${action.data.title}`}
                                  {action.type === 'addTag' && `Tag: ${action.data.tag}`}
                                  {action.type === 'createProject' && `Project: ${action.data.title}`}
                                  {action.type === 'createMoodEntry' && `Mood: ${action.data.mood}`}
                                  {action.type === 'enhanceThought' && 'Enhance Text'}
                                </h5>
                                {action.aiReasoning && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {action.aiReasoning}
                                  </p>
                                )}
                                
                                {/* Action Details */}
                                {action.type === 'createTask' && (
                                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                                    <div>Category: {action.data.category}</div>
                                    <div>Time: {action.data.estimatedTime} min • Priority: {action.data.priority}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Approval Actions */}
                  {awaitingQueueItem && (
                    <div className="sticky bottom-0 pt-4 mt-4 border-t-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-purple-900/20">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectActions();
                          }}
                          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold text-sm"
                        >
                          Reject All
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveActions();
                          }}
                          disabled={selectedActions.size === 0}
                          className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Approve ({selectedActions.size})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Revert Dialog */}
      {showRevertDialog && completedQueueItem && (
        <RevertProcessingDialog
          queueItem={completedQueueItem}
          onConfirm={handleRevert}
          onCancel={() => setShowRevertDialog(false)}
        />
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => setShowErrorModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/90 dark:to-orange-950/90 rounded-2xl shadow-2xl border-4 border-red-300 dark:border-red-700 max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg">
                  {errorMessage?.includes('API key') ? (
                    <Key className="h-6 w-6 text-white" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-white" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-900 dark:text-red-100 mb-2">
                  {errorMessage?.includes('API key') ? 'API Key Required' : 'Processing Failed'}
                </h3>
                <p className="text-red-800 dark:text-red-200 mb-4 leading-relaxed">
                  {errorMessage}
                </p>
                <div className="flex gap-2">
                  {errorMessage?.includes('API key') && (
                    <a
                      href="/settings"
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm font-semibold"
                    >
                      <Key className="h-4 w-4" />
                      Go to Settings
                    </a>
                  )}
                  <button
                    onClick={() => setShowErrorModal(false)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors text-sm font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
