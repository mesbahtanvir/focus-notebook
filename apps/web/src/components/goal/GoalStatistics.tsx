"use client";

import { Flag, Brain, Target, Calendar } from "lucide-react";
import type { Goal } from "@/store/useGoals";

interface GoalStatisticsProps {
  goal: Goal;
  projectCount: number;
  thoughtCount: number;
}

/**
 * Component displaying statistics about a goal
 */
export function GoalStatistics({ goal, projectCount, thoughtCount }: GoalStatisticsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Projects Count */}
      <div className="rounded-xl p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-2 border-blue-200 dark:border-blue-800 shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <Flag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">Projects</div>
        </div>
        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{projectCount}</div>
        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">linked</div>
      </div>

      {/* Thoughts Count */}
      <div className="rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800 shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">Thoughts</div>
        </div>
        <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{thoughtCount}</div>
        <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">related</div>
      </div>

      {/* Priority Level */}
      <div className="rounded-xl p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-800 shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <div className="text-xs font-semibold text-orange-600 dark:text-orange-400">Priority</div>
        </div>
        <div className="text-2xl font-bold text-orange-700 dark:text-orange-300 capitalize">
          {goal.priority}
        </div>
        <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">level</div>
      </div>

      {/* Timeframe */}
      <div className="rounded-xl p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div className="text-xs font-semibold text-green-600 dark:text-green-400">
            Timeframe
          </div>
        </div>
        <div className="text-2xl font-bold text-green-700 dark:text-green-300 capitalize">
          {goal.timeframe || 'short-term'}
        </div>
        <div className="text-xs text-green-600 dark:text-green-400 mt-1">goal</div>
      </div>
    </div>
  );
}
