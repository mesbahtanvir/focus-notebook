"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, RefreshCcw } from "lucide-react";
import { useThoughts, AISuggestion, Thought } from "@/store/useThoughts";
import { useAuth } from "@/contexts/AuthContext";
import { ToolPageLayout, ToolHeader } from "@/components/tools";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ThoughtProcessingService } from "@/services/thoughtProcessingService";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";

interface SuggestionCard {
  thoughtId: string;
  thoughtText: string;
  thoughtCreatedAt?: Thought["createdAt"];
  suggestion: AISuggestion;
}

const formatActionType = (type: string) => {
  const map: Record<string, string> = {
    createTask: "Create Task",
    enhanceTask: "Enhance Task",
    createMood: "Create Mood",
    addTag: "Add Tag",
    createProject: "Create Project",
    createGoal: "Create Goal",
    linkToProject: "Link to Project",
    linkToGoal: "Link to Goal",
    linkToTask: "Link to Task",
    createErrand: "Create Errand",
    createNote: "Create Note",
  };
  return map[type] || type;
};

export default function ThoughtSuggestionSwipePage() {
  useTrackToolUsage("thoughts-swipe");

  const { user } = useAuth();
  const subscribe = useThoughts((s) => s.subscribe);
  const thoughts = useThoughts((s) => s.thoughts);
  const { toast } = useToast();

  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  const allSuggestions = useMemo(() => {
    const cards: SuggestionCard[] = [];
    thoughts.forEach((thought) => {
      if (!thought.aiSuggestions) return;
      thought.aiSuggestions.forEach((suggestion) => {
        if (suggestion.status === "pending") {
          cards.push({
            thoughtId: thought.id,
            thoughtText: thought.text,
            thoughtCreatedAt: thought.createdAt,
            suggestion,
          });
        }
      });
    });

    return cards.sort((a, b) => {
      const aDate = new Date(a.suggestion.createdAt ?? 0).getTime();
      const bDate = new Date(b.suggestion.createdAt ?? 0).getTime();
      return bDate - aDate;
    });
  }, [thoughts]);

  const queue = useMemo(() => {
    return allSuggestions.filter(
      (card) => !processedIds.has(`${card.thoughtId}:${card.suggestion.id}`)
    );
  }, [allSuggestions, processedIds]);

  useEffect(() => {
    if (currentIndex >= queue.length) {
      setCurrentIndex(Math.max(queue.length - 1, 0));
    }
  }, [queue.length, currentIndex]);

  const activeCard = queue[currentIndex] || null;

  const markProcessed = (card: SuggestionCard) => {
    setProcessedIds((prev) => {
      const next = new Set(prev);
      next.add(`${card.thoughtId}:${card.suggestion.id}`);
      return next;
    });
    setCurrentIndex((prev) => (queue.length <= 1 ? 0 : Math.min(prev, queue.length - 2)));
  };

  const handleDecision = async (decision: "accept" | "reject") => {
    if (!activeCard || isProcessing) return;
    setIsProcessing(true);
    setError(null);

    try {
      if (decision === "accept") {
        await ThoughtProcessingService.applySuggestion(activeCard.thoughtId, activeCard.suggestion.id, {
          source: "swipe",
        });
        toast({ title: "Suggestion applied", description: "We linked this idea for you." });
      } else {
        await ThoughtProcessingService.rejectSuggestion(activeCard.thoughtId, activeCard.suggestion.id, {
          source: "swipe",
        });
        toast({ title: "Suggestion dismissed", description: "Thanks for the feedback." });
      }
      markProcessed(activeCard);
    } catch (err: any) {
      setError(err?.message || "Unable to process suggestion");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragEnd = (_: any, info: { offset: { x: number } }) => {
    if (!activeCard || isProcessing) return;
    if (info.offset.x > 150) {
      handleDecision("accept");
    } else if (info.offset.x < -150) {
      handleDecision("reject");
    }
  };

  return (
    <ToolPageLayout>
      <ToolHeader
        title="AI Suggestion Review"
        emoji="✨"
        subtitle="Swipe through AI-generated ideas and capture the best ones"
        showBackButton
        stats={[
          { label: "pending", value: queue.length, variant: queue.length ? "warning" : "success" },
        ]}
      />

      {!activeCard ? (
        <div className="px-6">
          <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 py-16 text-center">
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">No pending suggestions 🎉</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Once AI generates more ideas we’ll queue them up here for review.
            </p>
            {processedIds.size > 0 && (
              <Button
                variant="ghost"
                className="mt-4"
                onClick={() => {
                  setProcessedIds(new Set());
                  setCurrentIndex(0);
                }}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Review again
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="px-6 max-w-3xl mx-auto space-y-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Tip: drag right to accept or left to reject, or use the buttons below.
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeCard.thoughtId}-${activeCard.suggestion.id}`}
              drag="x"
              dragElastic={0.2}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-2xl p-6 space-y-4"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
            >
              <div className="text-xs uppercase font-semibold text-purple-600 dark:text-purple-300">Thought</div>
              <p className="text-gray-900 dark:text-gray-100 text-base leading-relaxed whitespace-pre-wrap">
                {activeCard.thoughtText}
              </p>

              <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700" />

              <div>
                <div className="text-xs uppercase font-semibold text-blue-600 dark:text-blue-300 mb-1">Suggestion</div>
                <p className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
                  {formatActionType(activeCard.suggestion.type)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {activeCard.suggestion.reasoning || "No reasoning provided"}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span>
                    Confidence {Math.round((activeCard.suggestion.confidence ?? 0) * 100)}%
                  </span>
                  <span>•</span>
                  <span>{new Date(activeCard.suggestion.createdAt || Date.now()).toLocaleString()}</span>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 text-sm px-3 py-2">
                  {error}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              disabled={isProcessing}
              onClick={() => handleDecision("reject")}
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300"
            >
              {isProcessing ? (
                <RefreshCcw className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              <span className="ml-2">Reject</span>
            </Button>

            <Button
              disabled={isProcessing}
              onClick={() => handleDecision("accept")}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? (
                <RefreshCcw className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span className="ml-2">Accept</span>
            </Button>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
