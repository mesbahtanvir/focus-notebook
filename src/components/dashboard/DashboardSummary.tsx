import { memo } from "react";
import { TrendingUp } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface DashboardSummaryProps {
  summary: {
    tasksCompleted: number;
    mastery: number;
    pleasure: number;
    avgMood: number;
    focusTime: number;
  };
}

const DashboardSummaryComponent = ({ summary }: DashboardSummaryProps) => (
  <Card className="border-4 border-blue-200 shadow-xl bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950">
    <CardHeader className="bg-gradient-to-r from-blue-100 via-cyan-100 to-teal-100 dark:from-blue-900 dark:via-cyan-900 dark:to-teal-900 border-b-4 border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg shadow-md">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <CardTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
            📈 Summary
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 font-medium text-sm md:text-base">
            Your activity at a glance
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-4 md:p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 rounded-lg bg-white/50 dark:bg-gray-800/50">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tasks Completed</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{summary.tasksCompleted}</div>
        </div>
        <div className="text-center p-4 rounded-lg bg-white/50 dark:bg-gray-800/50">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Mastery 🧠</div>
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{summary.mastery}</div>
        </div>
        <div className="text-center p-4 rounded-lg bg-white/50 dark:bg-gray-800/50">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pleasure 💝</div>
          <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">{summary.pleasure}</div>
        </div>
        <div className="text-center p-4 rounded-lg bg-white/50 dark:bg-gray-800/50">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Mood</div>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{summary.avgMood.toFixed(1)}</div>
        </div>
      </div>
      <div className="mt-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-800">
        <div className="text-center">
          <div className="text-sm text-purple-700 dark:text-purple-300 mb-1">Focus Time</div>
          <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">{summary.focusTime}m</div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const DashboardSummary = memo(DashboardSummaryComponent);

export default DashboardSummary;
