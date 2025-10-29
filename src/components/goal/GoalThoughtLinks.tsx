"use client";

import { useState, useMemo } from "react";
import { Brain, LinkIcon, Plus, X, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { NewThoughtModal } from "./NewThoughtModal";
import type { Thought } from "@/store/useThoughts";

interface GoalThoughtLinksProps {
  goalId: string;
  linkedThoughts: Thought[];
  allThoughts: Thought[];
  onLinkThoughts: (thoughtIds: string[]) => Promise<void>;
  onCreateThought: (text: string) => Promise<void>;
}

/**
 * Component for managing thought links to a goal
 */
export function GoalThoughtLinks({
  goalId,
  linkedThoughts,
  allThoughts,
  onLinkThoughts,
  onCreateThought,
}: GoalThoughtLinksProps) {
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedThoughts, setSelectedThoughts] = useState<Set<string>>(new Set());

  const unlinkedThoughts = useMemo(() => {
    return allThoughts.filter(t => !t.tags?.includes(goalId));
  }, [allThoughts, goalId]);

  const toggleThoughtSelection = (thoughtId: string) => {
    const newSelected = new Set(selectedThoughts);
    if (newSelected.has(thoughtId)) {
      newSelected.delete(thoughtId);
    } else {
      newSelected.add(thoughtId);
    }
    setSelectedThoughts(newSelected);
  };

  const handleLinkThoughts = async () => {
    await onLinkThoughts(Array.from(selectedThoughts));
    setSelectedThoughts(new Set());
    setShowAttachModal(false);
  };

  const handleCreateThought = async (text: string) => {
    await onCreateThought(text);
    setShowCreateModal(false);
  };

  return (
    <>
      <div className="rounded-xl p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">
              Related Thoughts ({linkedThoughts.length})
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAttachModal(true)}
              className="p-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-lg transition-colors"
              title="Attach Existing Thought"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
              title="Create New Thought"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {linkedThoughts.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">No thoughts linked to this goal yet</p>
            </div>
          ) : (
            linkedThoughts.slice(0, 5).map((thought) => (
              <Link
                key={thought.id}
                href={`/tools/thoughts?id=${thought.id}`}
                className="block p-3 rounded-lg bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-all hover:shadow-lg group text-sm"
              >
                <div className="font-medium text-purple-700 dark:text-purple-300 group-hover:text-purple-800 dark:group-hover:text-purple-200 transition-colors line-clamp-2">
                  {thought.text}
                </div>
                {thought.tags && thought.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {thought.tags.slice(0, 2).map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))
          )}
          {linkedThoughts.length > 5 && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
              +{linkedThoughts.length - 5} more thoughts
            </div>
          )}
        </div>
      </div>

      {/* Attach Thought Modal */}
      <AnimatePresence>
        {showAttachModal && unlinkedThoughts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowAttachModal(false);
              setSelectedThoughts(new Set());
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  Attach Thoughts ({selectedThoughts.size} selected)
                </h2>
                <button
                  onClick={() => {
                    setShowAttachModal(false);
                    setSelectedThoughts(new Set());
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {unlinkedThoughts.map((thought) => (
                  <button
                    key={thought.id}
                    onClick={() => toggleThoughtSelection(thought.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md group ${
                      selectedThoughts.has(thought.id)
                        ? 'border-purple-500 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selectedThoughts.has(thought.id)
                          ? 'bg-purple-500 border-purple-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedThoughts.has(thought.id) && (
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
                          {thought.text}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                <button
                  onClick={() => {
                    setShowAttachModal(false);
                    setSelectedThoughts(new Set());
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkThoughts}
                  disabled={selectedThoughts.size === 0}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Attach {selectedThoughts.size} {selectedThoughts.size === 1 ? 'Thought' : 'Thoughts'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Thought Modal */}
      <NewThoughtModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateThought}
      />
    </>
  );
}
