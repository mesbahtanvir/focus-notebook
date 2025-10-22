"use client";

import { useState, useMemo, useEffect } from "react";
import { useThoughts, Thought } from "@/store/useThoughts";
import { useProcessQueue } from "@/store/useProcessQueue";
import { manualProcessor } from "@/lib/thoughtProcessor/manualProcessor";
import { approvalHandler } from "@/lib/thoughtProcessor/approvalHandler";
import { ProcessingApprovalDialog } from "@/components/ProcessingApprovalDialog";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Brain,
  Heart,
  Frown,
  Smile,
  CheckCircle2,
  Tag,
  Calendar,
  Sparkles,
  Loader2,
  Bell
} from "lucide-react";
import { ThoughtDetailModal } from "@/components/ThoughtDetailModal";
import {
  ToolPageLayout,
  ToolHeader,
  ToolFilters,
  FilterSelect,
  ToolContent,
  ToolList,
  ToolCard,
  EmptyState
} from "@/components/tools";

export default function ThoughtsPage() {
  const thoughts = useThoughts((s) => s.thoughts);
  const queue = useProcessQueue((s) => s.queue);
  const [showNewThought, setShowNewThought] = useState(false);
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingThoughtId, setProcessingThoughtId] = useState<string | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [currentApprovalItem, setCurrentApprovalItem] = useState<string | null>(null);

  // Get awaiting approval items
  const awaitingApproval = useMemo(() => {
    return queue.filter(q => q.status === 'awaiting-approval');
  }, [queue]);

  // Auto-show approval dialog when new items need approval
  useEffect(() => {
    if (awaitingApproval.length > 0 && !showApprovalDialog && !currentApprovalItem) {
      const firstItem = awaitingApproval[0];
      setCurrentApprovalItem(firstItem.id);
      setShowApprovalDialog(true);
    }
  }, [awaitingApproval, showApprovalDialog, currentApprovalItem]);

  const filteredThoughts = useMemo(() => {
    let filtered = thoughts.filter(thought => {
      if (!showCompleted && thought.done) return false;
      return true;
    });

    // Sort by created date, newest first
    filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return filtered;
  }, [thoughts, showCompleted]);

  const thoughtStats = useMemo(() => {
    const total = thoughts.length;
    const completed = thoughts.filter(t => t.done).length;
    const analyzed = thoughts.filter(t => t.cbtAnalysis).length;
    const unprocessed = thoughts.filter(t => !t.tags?.includes('processed')).length;

    return { total, completed, analyzed, unprocessed };
  }, [thoughts]);

  const handleProcessThought = async (thoughtId: string) => {
    setIsProcessing(true);
    setProcessingThoughtId(thoughtId);
    
    const result = await manualProcessor.processThought(thoughtId);
    
    if (result.success) {
      // Success - thought will be updated by the processor
    } else {
      alert(`Failed to process: ${result.error}`);
    }
    
    setIsProcessing(false);
    setProcessingThoughtId(null);
  };

  const handleProcessAll = async () => {
    const unprocessedThoughts = thoughts.filter(t => !t.tags?.includes('processed'));
    
    if (unprocessedThoughts.length === 0) {
      alert('No unprocessed thoughts found');
      return;
    }

    if (!confirm(`Process ${unprocessedThoughts.length} unprocessed thought(s)?\n\nYou'll need to approve each one.`)) {
      return;
    }

    setIsProcessing(true);
    
    const result = await manualProcessor.processMultiple(
      unprocessedThoughts.map(t => t.id)
    );
    
    alert(`Analysis complete!\n${result.successful} thought(s) ready for approval\n${result.failed} failed`);
    
    setIsProcessing(false);
  };

  const handleApprove = async (approvedActionIds: string[]) => {
    if (!currentApprovalItem) return;
    
    const result = await approvalHandler.approveAndExecute(currentApprovalItem, approvedActionIds);
    
    if (result.success) {
      setShowApprovalDialog(false);
      setCurrentApprovalItem(null);
      
      // Show next approval if any
      setTimeout(() => {
        if (awaitingApproval.length > 1) {
          const nextItem = awaitingApproval.find(q => q.id !== currentApprovalItem);
          if (nextItem) {
            setCurrentApprovalItem(nextItem.id);
            setShowApprovalDialog(true);
          }
        }
      }, 100);
    }
  };

  const handleReject = async () => {
    if (!currentApprovalItem) return;
    
    await approvalHandler.rejectProcessing(currentApprovalItem);
    setShowApprovalDialog(false);
    setCurrentApprovalItem(null);
    
    // Show next approval if any
    setTimeout(() => {
      if (awaitingApproval.length > 1) {
        const nextItem = awaitingApproval.find(q => q.id !== currentApprovalItem);
        if (nextItem) {
          setCurrentApprovalItem(nextItem.id);
          setShowApprovalDialog(true);
        }
      }
    }, 100);
  };


  return (
    <ToolPageLayout>
      <ToolHeader
        title="Thoughts"
        stats={[
          { label: 'total', value: thoughtStats.total },
          { label: 'unprocessed', value: thoughtStats.unprocessed, variant: 'warning' },
          { label: 'analyzed', value: thoughtStats.analyzed },
          { label: 'done', value: thoughtStats.completed, variant: 'success' }
        ]}
        action={{
          label: 'New Thought',
          icon: Plus,
          onClick: () => setShowNewThought(true)
        }}
      />

      {(awaitingApproval.length > 0 || thoughtStats.unprocessed > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {awaitingApproval.length > 0 && (
            <button
              onClick={() => {
                setCurrentApprovalItem(awaitingApproval[0].id);
                setShowApprovalDialog(true);
              }}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold hover:from-orange-600 hover:to-amber-600 transition-all flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 animate-pulse"
            >
              <Bell className="h-4 w-4" />
              Review ({awaitingApproval.length})
            </button>
          )}
          {thoughtStats.unprocessed > 0 && (
            <button
              onClick={handleProcessAll}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Process All ({thoughtStats.unprocessed})
                </>
              )}
            </button>
          )}
        </div>
      )}

      <ToolFilters>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          <span className="text-gray-600 dark:text-gray-400">Show completed</span>
        </label>
      </ToolFilters>

      <ToolContent>
        {filteredThoughts.length === 0 ? (
          <EmptyState
            icon={<Brain className="h-12 w-12" />}
            title="No thoughts found"
            description={thoughts.length === 0 ? "Capture your first thought to get started" : "Try adjusting your filters"}
            action={thoughts.length === 0 ? {
              label: 'Create Thought',
              onClick: () => setShowNewThought(true)
            } : undefined}
          />
        ) : (
          <ToolList>
            <AnimatePresence>
              {filteredThoughts.map((thought) => (
                <motion.div
                  key={thought.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <ToolCard onClick={() => setSelectedThought(thought)}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={thought.done}
                        onChange={(e) => {
                          e.stopPropagation();
                          useThoughts.getState().toggle(thought.id);
                        }}
                        className="h-4 w-4 rounded mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${thought.done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          {thought.text}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {thought.intensity && (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
                              <Heart className="h-3 w-3" />
                              {thought.intensity}/10
                            </span>
                          )}
                          {thought.cbtAnalysis && (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800">
                              <Brain className="h-3 w-3" />
                              Analyzed
                            </span>
                          )}
                          {thought.tags && Array.isArray(thought.tags) && thought.tags.length > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">
                              <Tag className="h-3 w-3" />
                              {thought.tags.join(', ')}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(thought.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {/* Process Now Button for unprocessed thoughts */}
                        {!thought.tags?.includes('processed') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProcessThought(thought.id);
                            }}
                            disabled={isProcessing && processingThoughtId === thought.id}
                            className="mt-3 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing && processingThoughtId === thought.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3" />
                                Process Now
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </ToolCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </ToolList>
        )}
      </ToolContent>

      {/* New Thought Modal */}
      {showNewThought && (
        <NewThoughtModal onClose={() => setShowNewThought(false)} />
      )}

      {/* Thought Detail Modal */}
      {selectedThought && (
        <ThoughtDetailModal
          thought={selectedThought}
          onClose={() => setSelectedThought(null)}
        />
      )}

      {/* Approval Dialog */}
      {showApprovalDialog && currentApprovalItem && (
        <ProcessingApprovalDialog
          queueItem={queue.find(q => q.id === currentApprovalItem)!}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </ToolPageLayout>
  );
}

function NewThoughtModal({ onClose }: { onClose: () => void }) {
  const addThought = useThoughts((s) => s.add);
  const [text, setText] = useState("");
  const [type, setType] = useState<'neutral' | 'task' | 'feeling-good' | 'feeling-bad'>('neutral');
  const [intensity, setIntensity] = useState<number>(5);
  const [tags, setTags] = useState("");
  const [showIntensity, setShowIntensity] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const tagsList = tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    await addThought({
      text: text.trim(),
      type,
      intensity: showIntensity ? intensity : undefined,
      tags: tagsList.length > 0 ? tagsList : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 md:p-8 border-4 border-purple-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-purple-100">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">💭 New Thought</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">What&apos;s on your mind?</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe your thought..."
              className="input w-full min-h-[100px]"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="input w-full"
            >
              <option value="neutral">💭 Neutral</option>
              <option value="task">✅ Task</option>
              <option value="feeling-good">😊 Good Feeling</option>
              <option value="feeling-bad">😔 Bad Feeling</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showIntensity}
                onChange={(e) => setShowIntensity(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              Track intensity (for feelings/emotions)
            </label>
          </div>

          {showIntensity && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Intensity: {intensity}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Tags (optional)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="work, family, health (comma separated)"
              className="input w-full"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-semibold rounded-full hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-md hover:shadow-lg transition-all transform hover:scale-105"
            >
              💾 Save Thought
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
