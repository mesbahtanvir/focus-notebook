"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useThoughts, Thought } from "@/store/useThoughts";
import { useProcessQueue } from "@/store/useProcessQueue";
import { useSearchParams } from "next/navigation";
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
  Bell,
  Download,
  Upload
} from "lucide-react";
import { thoughtsToCSV, downloadCSV, csvToThoughts } from '@/lib/csvUtils';
import { ImportThoughtsModal } from '@/components/ImportThoughtsModal';
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
  const [showNewThought, setShowNewThought] = useState(false);
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingThoughtId, setProcessingThoughtId] = useState<string | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [currentApprovalItem, setCurrentApprovalItem] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImportThoughts, setPendingImportThoughts] = useState<any[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  // Auto-show approval dialog when new items need approval
  useEffect(() => {
    if (awaitingApproval.length > 0 && !showApprovalDialog && !currentApprovalItem) {
      const firstItem = awaitingApproval[0];
      setCurrentApprovalItem(firstItem.id);
      setShowApprovalDialog(true);
    }
  }, [awaitingApproval, showApprovalDialog, currentApprovalItem]);

  const filteredThoughts = useMemo(() => {
    // Sort by created date, newest first
    const sorted = [...thoughts].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return sorted;
  }, [thoughts]);

  const thoughtStats = useMemo(() => {
    const total = thoughts.length;
    const analyzed = thoughts.filter(t => t.cbtAnalysis).length;
    const unprocessed = thoughts.filter(t => !t.tags?.includes('processed')).length;

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

  const handleExport = () => {
    const csv = thoughtsToCSV(thoughts);
    const filename = `thoughts-export-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvContent = e.target?.result as string;
        const importedThoughts = csvToThoughts(csvContent);
        
        if (importedThoughts.length === 0) {
          alert('No valid thoughts found in CSV file');
          return;
        }

        setPendingImportThoughts(importedThoughts);
        setShowImportModal(true);
      } catch (error) {
        alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleConfirmImport = async () => {
    try {
      const addThought = useThoughts.getState().add;
      for (const thought of pendingImportThoughts) {
        // Remove 'processed' tag so thoughts can be processed again
        const cleanedThought = {
          ...thought,
          tags: thought.tags?.filter((tag: string) => tag !== 'processed')
        };
        await addThought(cleanedThought);
      }
      
      alert(`Successfully imported ${pendingImportThoughts.length} thought(s)`);
      setShowImportModal(false);
      setPendingImportThoughts([]);
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelImport = () => {
    setShowImportModal(false);
    setPendingImportThoughts([]);
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

      <ToolFilters>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          
          <label className="px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer">
            <Upload className="h-4 w-4" />
            Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
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
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg">
                        <Brain className="h-4 w-4 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900 dark:text-gray-100 flex-1 min-w-0">
                            {thought.text}
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {thought.intensity && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {thought.intensity}/10
                            </span>
                          )}
                          
                          {thought.cbtAnalysis && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm flex items-center gap-1">
                              <Brain className="h-3 w-3" />
                              CBT
                            </span>
                          )}
                          
                          {thought.tags && Array.isArray(thought.tags) && thought.tags.filter(t => t !== 'processed').length > 0 && (
                            <span className="text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                              <Tag className="h-3 w-3" />
                              {thought.tags.filter(t => t !== 'processed').join(', ')}
                            </span>
                          )}
                          
                          {thought.tags?.includes('processed') && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-sm flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Processed
                            </span>
                          )}
                          
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-auto flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(thought.createdAt)}
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

      {/* Import Preview Modal */}
      {showImportModal && (
        <ImportThoughtsModal
          thoughts={pendingImportThoughts}
          onConfirm={handleConfirmImport}
          onCancel={handleCancelImport}
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

export default function ThoughtsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ThoughtsPageContent />
    </Suspense>
  );
}
