"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useThoughts, Thought } from "@/store/useThoughts";
import { useFriends } from "@/store/useFriends";
import ErrorBoundary from "@/components/ErrorBoundary";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Plus,
  Brain,
  CheckCircle2,
  Tag,
  Calendar,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ArrowLeft,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { ThoughtDetailModal } from "@/components/ThoughtDetailModal";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import {
  ToolPageLayout,
  ToolContent,
  ToolList,
  ToolCard,
  EmptyState
} from "@/components/tools";

function ThoughtsPageContent() {
  useTrackToolUsage('thoughts');

  const thoughts = useThoughts((s) => s.thoughts);
  const friends = useFriends((s) => s.friends);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [showNewThought, setShowNewThought] = useState(false);
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'processed' | 'unprocessed'>('all');
  const [showFilters, setShowFilters] = useState(false);

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

  // Approval system removed - actions are executed instantly

  const filteredThoughts = useMemo(() => {
    if (!thoughts || !Array.isArray(thoughts)) return [];

    const searchLower = searchTerm.toLowerCase();

    // Filter by search term and type
    let filtered = thoughts;

    // Apply type filter
    if (filterType === 'processed') {
      filtered = thoughts.filter(thought => thought.tags?.includes('processed'));
    } else if (filterType === 'unprocessed') {
      filtered = thoughts.filter(thought => !thought.tags?.includes('processed'));
    }

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(thought => {
        const textMatch = thought.text?.toLowerCase().includes(searchLower);
        const tagsMatch = thought.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        return textMatch || tagsMatch;
      });
    }

    // Sort by created date, newest first
    const sorted = [...filtered].sort((a, b) => {
      const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return sorted;
  }, [thoughts, searchTerm, filterType]);

  // Use infinite scroll
  const { displayedItems, hasMore, observerTarget } = useInfiniteScroll(filteredThoughts, {
    initialItemsPerPage: 20,
    threshold: 0.8
  });

  const thoughtStats = useMemo(() => {
    if (!thoughts || !Array.isArray(thoughts)) {
      return { total: 0, analyzed: 0, unprocessed: 0, awaitingApproval: 0 };
    }

    const total = thoughts.length;
    const analyzed = thoughts.filter(t => t && t.cbtAnalysis).length;
    const unprocessed = thoughts.filter(t => t && !t.tags?.includes('processed')).length;
    const awaitingApproval = thoughts.filter(t => 
      t && 
      t.aiSuggestions && 
      Array.isArray(t.aiSuggestions) && 
      t.aiSuggestions.some(s => s.status === 'pending')
    ).length;

    return { total, analyzed, unprocessed, awaitingApproval };
  }, [thoughts]);

  // Get thoughts with pending AI suggestions
  const awaitingApprovalThoughts = useMemo(() => {
    return thoughts.filter(t => 
      t && 
      t.aiSuggestions && 
      Array.isArray(t.aiSuggestions) && 
      t.aiSuggestions.some(s => s.status === 'pending')
    );
  }, [thoughts]);

  // Helper function to get shortname from full name
  const getShortName = (name: string): string => {
    const firstName = name.split(' ')[0];
    return firstName.toLowerCase().trim();
  };

  // Render tag component - makes person tags clickable
  const renderTag = (tag: string) => {
    if (tag.startsWith('person-')) {
      const shortName = tag.replace('person-', '');
      const friend = friends.find(f => getShortName(f.name) === shortName);
      
      if (friend) {
        return (
          <Link
            key={tag}
            href={`/tools/relationships/${friend.id}`}
            className="hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {friend.name}
          </Link>
        );
      }
    }
    return <span key={tag}>{tag}</span>;
  };


  // Approval is no longer needed - actions are executed instantly



  return (
    <ToolPageLayout>
      {/* Header with inline stats */}
      <div className="rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-4 border-purple-200 dark:border-purple-800 shadow-xl p-6 mx-4 mt-4 mb-4">
        <div className="flex items-start gap-3">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="group flex items-center justify-center p-2 rounded-xl bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors" />
          </button>

          {/* Title and Stats */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">💭 Thoughts</h1>
            <div className="flex items-center gap-3 mt-2 text-sm font-medium flex-wrap">
              <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">{thoughtStats.total} total</span>
              <span className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300">{thoughtStats.unprocessed} unprocessed</span>
              <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300">{thoughtStats.analyzed} analyzed</span>
              {thoughtStats.awaitingApproval > 0 && (
                <span className="px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {thoughtStats.awaitingApproval} await approval
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-4 py-3 mb-4">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-4 border-blue-200 dark:border-blue-800 shadow-xl p-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search thoughts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Showing {filteredThoughts.length} of {thoughts.length} thoughts
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-4 pt-4 border-t border-blue-200 dark:border-blue-700"
            >
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'processed' | 'unprocessed')}
                  className="input py-1 text-sm min-w-[150px]"
                >
                  <option value="all">All Thoughts</option>
                  <option value="processed">Processed</option>
                  <option value="unprocessed">Unprocessed</option>
                </select>
              </div>
            </motion.div>
          )}
        </div>
      </div>

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
              {displayedItems.map((thought) => {
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
                              <span className="flex flex-wrap gap-1">
                                {thought.tags.filter((t) => t && t !== 'processed').map((t) => renderTag(t))}
                              </span>
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

            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={observerTarget} className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            )}
          </ToolList>
        )}
      </ToolContent>

      {/* AI Suggestions Awaiting Approval Section */}
      {awaitingApprovalThoughts.length > 0 && (
        <div className="px-4 py-4 my-6">
          <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-4 border-yellow-200 dark:border-yellow-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  AI Suggestions Awaiting Approval
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {awaitingApprovalThoughts.length} thought{awaitingApprovalThoughts.length !== 1 ? 's' : ''} have AI suggestions ready for review
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {awaitingApprovalThoughts.map((thought) => {
                const pendingSuggestions = thought.aiSuggestions?.filter(s => s.status === 'pending') || [];
                return (
                  <motion.div
                    key={thought.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg p-4 bg-white dark:bg-gray-800 border-2 border-yellow-300 dark:border-yellow-700 hover:border-yellow-400 dark:hover:border-yellow-600 cursor-pointer transition-all hover:shadow-lg"
                    onClick={() => setSelectedThought(thought)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex-shrink-0">
                        <Brain className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
                          {thought.text}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">
                            {pendingSuggestions.length} suggestion{pendingSuggestions.length !== 1 ? 's' : ''} pending
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-semibold whitespace-nowrap">
                          Review →
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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


      {/* Floating Action Button */}
      <FloatingActionButton
        onClick={() => setShowNewThought(true)}
        title="New Thought"
        icon={<Plus className="h-6 w-6" />}
      />
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
