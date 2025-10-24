"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useThoughts, Thought } from "@/store/useThoughts";
import { useProcessQueue } from "@/store/useProcessQueue";
import { manualProcessor } from "@/lib/thoughtProcessor/manualProcessor";
import { approvalHandler } from "@/lib/thoughtProcessor/approvalHandler";
import { ProcessingApprovalDialog } from "@/components/ProcessingApprovalDialog";
import ErrorBoundary from "@/components/ErrorBoundary";
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
import { ErrorModal } from '@/components/ErrorModal';
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

function ThoughtsPageContent() {
  const thoughts = useThoughts((s) => s.thoughts);
  const queue = useProcessQueue((s) => s.queue);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [showNewThought, setShowNewThought] = useState(false);
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingThoughtId, setProcessingThoughtId] = useState<string | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [currentApprovalItem, setCurrentApprovalItem] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Date formatting function
  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    try {
      // Handle Firebase Timestamp
      if (typeof date === 'object' && 'toDate' in date) {
        return date.toDate().toLocaleDateString();
      }
      // Handle ISO string
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString();
      }
      // Handle timestamp in seconds
      if (typeof date === 'object' && 'seconds' in date) {
        return new Date(date.seconds * 1000).toLocaleDateString();
      }
      return new Date(date).toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Auto-open thought detail if navigating from tasks page
  useEffect(() => {
    const thoughtId = searchParams.get('id');
    if (thoughtId) {
      const thought = thoughts.find(t => t.id === thoughtId);
      if (thought) {
        setSelectedThought(thought);
      }
    }
  }, [searchParams, thoughts]);

  // Get awaiting approval items
  const awaitingApproval = useMemo(() => {
    return queue.filter(q => q.status === 'awaiting-approval');
  }, [queue]);

  // Auto-navigate to detail page when new items need approval
  useEffect(() => {
    if (awaitingApproval.length > 0 && !showApprovalDialog && !currentApprovalItem) {
      // const firstItem = awaitingApproval[0];
      // // Navigate to thought detail page with AI suggestions
      // router.push(`/tools/thoughts/${firstItem.thoughtId}`);
    }
  }, [awaitingApproval, showApprovalDialog, currentApprovalItem, router]);

  const filteredThoughts = useMemo(() => {
    if (!thoughts || !Array.isArray(thoughts)) return [];
    
    // Sort by created date, newest first
    const sorted = [...thoughts].sort((a, b) => {
      const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return sorted;
  }, [thoughts]);

  const thoughtStats = useMemo(() => {
    if (!thoughts || !Array.isArray(thoughts)) {
      return { total: 0, analyzed: 0, unprocessed: 0 };
    }
    
    const total = thoughts.length;
    const analyzed = thoughts.filter(t => t && t.cbtAnalysis).length;
    const unprocessed = thoughts.filter(t => t && !t.tags?.includes('processed')).length;

    return { total, analyzed, unprocessed };
  }, [thoughts]);

  const handleProcessThought = async (thoughtId: string) => {
    setIsProcessing(true);
    setProcessingThoughtId(thoughtId);
    
    const result = await manualProcessor.processThought(thoughtId);
    
    if (result.success) {
      // Success - thought will be updated by the processor
    } else {
      const needsApiKey = result.error === 'OpenAI API key not configured';
      setErrorMessage(needsApiKey 
        ? 'Please configure your OpenAI API key in Settings to enable AI-powered thought processing.' 
        : `Failed to process: ${result.error}`);
      setShowErrorModal(true);
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
          { label: 'analyzed', value: thoughtStats.analyzed, variant: 'success' }
        ]}
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
              {filteredThoughts.map((thought) => {
                if (!thought || !thought.id) return null;
                
                return (
                  <motion.div
                    key={thought.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <ToolCard onClick={() => setSelectedThought(thought)}>
                      <div className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg">
                          <Brain className="h-4 w-4 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900 dark:text-gray-100 flex-1 min-w-0">
                              {thought.text || 'No content'}
                            </p>
                          </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {thought.cbtAnalysis && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm flex items-center gap-1">
                              <Brain className="h-3 w-3" />
                              CBT
                            </span>
                          )}
                          
                          {thought.tags && Array.isArray(thought.tags) && thought.tags.filter((t) => t && t !== 'processed').length > 0 && (
                            <span className="text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                              <Tag className="h-3 w-3" />
                              {thought.tags.filter((t) => t && t !== 'processed').join(', ')}
                            </span>
                          )}
                          
                          {thought.tags && Array.isArray(thought.tags) && thought.tags.includes('processed') && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-sm flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Processed
                            </span>
                          )}
                          
                          {thought.createdAt && (
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-auto flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(thought.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </ToolCard>
                </motion.div>
                );
              })}
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


      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Processing Failed"
        message={errorMessage}
        showSettingsButton={errorMessage.includes('OpenAI API key')}
      />

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  Success!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {successMessage}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold shadow-lg transition-all"
            >
              Got it!
            </button>
          </motion.div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setShowNewThought(true)}
        className="fixed bottom-8 right-8 h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-2xl hover:shadow-3xl transition-all flex items-center justify-center z-40 hover:scale-110"
        title="New Thought"
      >
        <Plus className="h-8 w-8" />
      </button>
    </ToolPageLayout>
  );
}

function NewThoughtModal({ onClose }: { onClose: () => void }) {
  const addThought = useThoughts((s) => s.add);
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const tagsList = tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    await addThought({
      text: text.trim(),
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

function ThoughtsPage() {
  return (
    <ErrorBoundary fallback={
      <div className="p-4 text-red-600">
        Something went wrong. Please refresh the page or try again later.
      </div>
    }>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      }>
        <ThoughtsPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}

export default ThoughtsPage;
