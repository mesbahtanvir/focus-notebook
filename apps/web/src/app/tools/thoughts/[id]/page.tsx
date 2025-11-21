"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useThoughts, Thought } from "@/store/useThoughts";
import { ThoughtProcessingService } from "@/services/thoughtProcessingService";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/cbtUtils";
import {
  ArrowLeft,
  Brain,
  Calendar,
  Tag,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export default function ThoughtDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const thoughts = useThoughts((s) => s.thoughts);
  
  const [thought, setThought] = useState<Thought | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Find thought
  useEffect(() => {
    const foundThought = thoughts.find((t) => t.id === id);
    if (foundThought) {
      setThought(foundThought);
    }
  }, [id, thoughts]);

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

  const handleProcess = async () => {
    if (!thought) return;
    setIsProcessing(true);
    try {
      const result = await ThoughtProcessingService.processThought(thought.id);
      if (result.success) {
        // Success - actions have been executed automatically
        router.push("/tools/thoughts");
      } else {
        console.error("Processing failed:", result.error);
      }
    } catch (error) {
      console.error("Error processing thought:", error);
    } finally {
      setIsProcessing(false);
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
                Thought Details
              </h1>
            </div>
            {!thought.tags?.includes('processed') && (
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {isProcessing ? 'Processing...' : 'Process with AI'}
              </button>
            )}
          </div>
        </div>
      </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm"
        >
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
            {/* Tags */}
            {thought.tags && thought.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">Tags:</span>
                <div className="flex flex-wrap gap-1">
                  {thought.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Created Date */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">Created:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatDate(thought.createdAt)}
              </span>
            </div>

            {/* Processed Status */}
            {thought.tags?.includes('processed') && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Processed with AI
                </span>
              </div>
            )}
          </div>
        </motion.div>
        </div>
      </div>
  );
}
