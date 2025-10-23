"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useThoughts, Thought } from "@/store/useThoughts";
import { useProcessQueue, ProcessQueueItem, ProcessAction } from "@/store/useProcessQueue";
import { approvalHandler } from "@/lib/thoughtProcessor/approvalHandler";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Brain,
  Heart,
  Frown,
  Smile,
  Meh,
  Calendar,
  Tag,
  Sparkles,
  CheckCircle2,
  X,
  Check,
  FileEdit,
  RefreshCw,
  TrendingUp,
  Target,
  Link as LinkIcon,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function ThoughtDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const thoughts = useThoughts((s) => s.thoughts);
  const updateThought = useThoughts((s) => s.updateThought);
  const queue = useProcessQueue((s) => s.queue);
  
  const [thought, setThought] = useState<Thought | null>(null);
  const [queueItem, setQueueItem] = useState<ProcessQueueItem | null>(null);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [isApproving, setIsApproving] = useState(false);

  // Find thought and related queue item
  useEffect(() => {
    const foundThought = thoughts.find((t) => t.id === id);
    if (foundThought) {
      setThought(foundThought);
    }

    // Find queue item for this thought that needs approval
    const foundQueueItem = queue.find(
      (q) => q.thoughtId === id && q.status === "awaiting-approval"
    );
    if (foundQueueItem) {
      setQueueItem(foundQueueItem);
      // Select all actions by default
      setSelectedActions(new Set(foundQueueItem.actions.map((a) => a.id)));
    }
  }, [id, thoughts, queue]);

  if (!thought) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading thought...</p>
        </div>
      </div>
    );
  }

  const toggleAction = (actionId: string) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(actionId)) {
      newSelected.delete(actionId);
    } else {
      newSelected.add(actionId);
    }
    setSelectedActions(newSelected);
  };

  const handleApprove = async () => {
    if (!queueItem) return;
    setIsApproving(true);
    try {
      await approvalHandler.approveAndExecute(
        queueItem.id,
        Array.from(selectedActions)
      );
      router.push("/tools/thoughts");
    } catch (error) {
      console.error("Error approving actions:", error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!queueItem) return;
    setIsApproving(true);
    try {
      await approvalHandler.rejectProcessing(queueItem.id);
      router.push("/tools/thoughts");
    } catch (error) {
      console.error("Error rejecting actions:", error);
    } finally {
      setIsApproving(false);
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case "positive":
        return <Smile className="h-5 w-5 text-green-600" />;
      case "negative":
        return <Frown className="h-5 w-5 text-red-600" />;
      case "neutral":
        return <Meh className="h-5 w-5 text-gray-600" />;
      default:
        return <Brain className="h-5 w-5 text-purple-600" />;
    }
  };

  // Extract type and intensity from tags or queue item
  const thoughtType = thought.tags?.find(t => ['positive', 'negative', 'neutral'].includes(t));
  const intensityTag = thought.tags?.find(t => t.startsWith('intensity:'));
  const thoughtIntensity = intensityTag ? parseInt(intensityTag.split(':')[1]) : undefined;
  const isProcessed = thought.tags?.includes('processed') || false;

  const getActionIcon = (type: string) => {
    switch (type) {
      case "createTask":
        return <CheckCircle2 className="h-5 w-5" />;
      case "addTag":
        return <Tag className="h-5 w-5" />;
      case "enhanceThought":
        return <Sparkles className="h-5 w-5" />;
      case "changeType":
        return <RefreshCw className="h-5 w-5" />;
      case "setIntensity":
        return <TrendingUp className="h-5 w-5" />;
      case "createMoodEntry":
        return <Heart className="h-5 w-5" />;
      case "createProject":
        return <Target className="h-5 w-5" />;
      case "linkToProject":
        return <LinkIcon className="h-5 w-5" />;
      default:
        return <FileEdit className="h-5 w-5" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case "createTask":
        return "from-blue-500 to-cyan-500";
      case "addTag":
        return "from-purple-500 to-pink-500";
      case "enhanceThought":
        return "from-amber-500 to-orange-500";
      case "changeType":
        return "from-green-500 to-emerald-500";
      case "setIntensity":
        return "from-red-500 to-rose-500";
      case "createMoodEntry":
        return "from-pink-500 to-rose-500";
      case "createProject":
        return "from-blue-500 to-cyan-500";
      case "linkToProject":
        return "from-teal-500 to-emerald-500";
      default:
        return "from-gray-500 to-slate-500";
    }
  };

  const getActionTitle = (action: ProcessAction) => {
    switch (action.type) {
      case "createTask":
        return `Create Task: "${action.data.title}"`;
      case "addTag":
        return `Add Tag: "${action.data.tag}"`;
      case "enhanceThought":
        return "Enhance Thought Text";
      case "changeType":
        return `Change Type to: ${action.data.type}`;
      case "setIntensity":
        return `Set Intensity: ${action.data.intensity}/10`;
      case "createMoodEntry":
        return `Create Mood Entry: ${action.data.mood}`;
      case "createProject":
        return `Create Project: "${action.data.title}"`;
      case "linkToProject":
        return `Link to Project: "${action.data.projectTitle}"`;
      default:
        return action.type;
    }
  };

  const getActionDetails = (action: ProcessAction) => {
    switch (action.type) {
      case "createTask":
        return (
          <div className="mt-2 text-sm space-y-1">
            <div>
              <strong>Category:</strong> {action.data.category}
            </div>
            <div>
              <strong>Estimated Time:</strong> {action.data.estimatedTime} minutes
            </div>
            <div>
              <strong>Priority:</strong> {action.data.priority}
            </div>
            {action.data.recurrence && action.data.recurrence.type !== "none" && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                <strong className="text-blue-700 dark:text-blue-300">
                  🔄 Recurring Task:
                </strong>
                <div className="text-blue-600 dark:text-blue-400 mt-1">
                  {action.data.recurrence.type === "daily" && "📅 Daily"}
                  {action.data.recurrence.type === "weekly" && "📅 Weekly"}
                  {action.data.recurrence.type === "workweek" &&
                    "📅 Workdays (Mon-Fri)"}
                  {action.data.recurrence.type === "monthly" && "📅 Monthly"}
                </div>
              </div>
            )}
          </div>
        );
      case "createProject":
        return (
          <div className="mt-2 text-sm space-y-1">
            <div>
              <strong>Description:</strong> {action.data.description || "N/A"}
            </div>
            <div>
              <strong>Timeframe:</strong>{" "}
              {action.data.timeframe === "short-term"
                ? "⏱️ Short-term"
                : "🎯 Long-term"}
            </div>
          </div>
        );
      case "enhanceThought":
        return (
          <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
            <strong className="text-amber-700 dark:text-amber-300">
              ✨ Enhanced Text:
            </strong>
            <div className="text-amber-900 dark:text-amber-100 mt-2 text-sm">
              {action.data.enhancedText}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/tools/thoughts")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Brain className="h-6 w-6 text-purple-600" />
                Thought Details & AI Suggestions
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT SIDE: Thought Details */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Thought Content
              </h2>

              {/* Thought Text */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
                <p className="text-gray-900 dark:text-gray-100 text-base leading-relaxed">
                  {thought.text}
                </p>
              </div>

              {/* Metadata */}
              <div className="space-y-3 text-sm">
                {/* Type */}
                {thoughtType && (
                  <div className="flex items-center gap-2">
                    {getTypeIcon(thoughtType)}
                    <span className="font-medium">Type:</span>
                    <span className="capitalize">{thoughtType}</span>
                  </div>
                )}

                {/* Intensity */}
                {thoughtIntensity !== undefined && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                    <span className="font-medium">Intensity:</span>
                    <span>{thoughtIntensity}/10</span>
                    <div className="flex-1 flex gap-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 flex-1 rounded ${
                            i < thoughtIntensity
                              ? thoughtIntensity <= 3
                                ? "bg-green-400"
                                : thoughtIntensity <= 6
                                ? "bg-yellow-400"
                                : "bg-red-400"
                              : "bg-gray-200 dark:bg-gray-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {thought.tags && thought.tags.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Tag className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span className="font-medium">Tags:</span>
                    <div className="flex flex-wrap gap-2">
                      {thought.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Created */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">Created:</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {thought.createdAt &&
                    typeof thought.createdAt === "object" &&
                    "toDate" in thought.createdAt
                      ? thought.createdAt.toDate().toLocaleString()
                      : thought.createdAt
                      ? new Date(thought.createdAt).toLocaleString()
                      : "N/A"}
                  </span>
                </div>

                {/* Processed */}
                {isProcessed && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-600 dark:text-green-400">
                      AI Processed
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: AI Suggestions */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600" />
                AI Suggestions
              </h2>

              {queueItem && queueItem.actions.length > 0 ? (
                <>
                  {/* Actions List */}
                  <div className="space-y-3 mb-6 max-h-[600px] overflow-y-auto">
                    <AnimatePresence>
                      {queueItem.actions.map((action) => {
                        const isSelected = selectedActions.has(action.id);
                        return (
                          <motion.div
                            key={action.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
                              isSelected
                                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                            }`}
                            onClick={() => toggleAction(action.id)}
                          >
                            <div className="flex items-start gap-3">
                              {/* Checkbox */}
                              <div className="flex-shrink-0 mt-1">
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                    isSelected
                                      ? "bg-purple-600 border-purple-600"
                                      : "border-gray-300 dark:border-gray-600"
                                  }`}
                                >
                                  {isSelected && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </div>
                              </div>

                              {/* Icon */}
                              <div
                                className={`flex-shrink-0 p-2 rounded-lg bg-gradient-to-r ${getActionColor(
                                  action.type
                                )} text-white`}
                              >
                                {getActionIcon(action.type)}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {getActionTitle(action)}
                                </div>
                                {action.aiReasoning && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {action.aiReasoning}
                                  </div>
                                )}
                                {getActionDetails(action)}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <button
                      onClick={handleReject}
                      disabled={isApproving}
                      className="flex-1 px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="h-5 w-5" />
                      Reject All
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={selectedActions.size === 0 || isApproving}
                      className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="h-5 w-5" />
                          Approve ({selectedActions.size})
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    No AI Suggestions
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">
                    {isProcessed
                      ? "This thought has already been processed."
                      : "AI suggestions will appear here once processing is complete."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
