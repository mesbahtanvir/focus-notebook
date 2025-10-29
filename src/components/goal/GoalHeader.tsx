"use client";

import { ArrowLeft, Edit3, Trash2, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Goal } from "@/store/useGoals";

interface GoalHeaderProps {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Header component for goal detail page with title, metadata, and action buttons
 */
export function GoalHeader({ goal, onEdit, onDelete }: GoalHeaderProps) {
  const router = useRouter();

  return (
    <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-rose-950/20 p-6 rounded-2xl border-4 border-purple-200 dark:border-purple-800 shadow-xl">
      <button
        onClick={() => router.push("/tools/goals")}
        className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 font-semibold mb-4 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Goals
      </button>

      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
            <Target className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              {goal.title}
            </h1>
            <p className="text-gray-700 dark:text-gray-300 text-lg mb-3">{goal.objective}</p>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span
                className={`px-3 py-1 rounded-full font-semibold ${
                  goal.status === "active"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    : goal.status === "completed"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {goal.status}
              </span>

              <span
                className={`px-3 py-1 rounded-full font-semibold ${
                  goal.priority === "urgent"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    : goal.priority === "high"
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                    : goal.priority === "medium"
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                    : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                }`}
              >
                {goal.priority} priority
              </span>

              <span className="px-3 py-1 rounded-full font-semibold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                {goal.timeframe === 'immediate' && '⚡ Immediate'}
                {goal.timeframe === 'short-term' && '🎯 Short-term'}
                {goal.timeframe === 'long-term' && '🌟 Long-term'}
                {!goal.timeframe && '🎯 Short-term'}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
            title="Edit Goal"
          >
            <Edit3 className="h-5 w-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
            title="Delete Goal"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
