import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";
import { motion } from "framer-motion";
import type { Goal } from "@/store/useGoals";

interface CurrentFocusGoalProps {
  goal: Goal | null;
  projectsCompleted?: number;
  projectsTotal?: number;
  tasksCompleted?: number;
  tasksTotal?: number;
}

export default function CurrentFocusGoal({
  goal,
  projectsCompleted = 0,
  projectsTotal = 0,
  tasksCompleted = 0,
  tasksTotal = 0,
}: CurrentFocusGoalProps) {
  if (!goal) {
    return null;
  }

  const progress = projectsTotal > 0 ? (projectsCompleted / projectsTotal) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-4 border-blue-200 shadow-xl bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950">
        <CardHeader className="bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 border-b-4 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg shadow-md">
              <Target className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl font-bold text-blue-700 dark:text-blue-300">
              Current Focus Goal
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {goal.title}
            </h3>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {progress.toFixed(1)}% complete
                </span>
                <span className="text-gray-500 dark:text-gray-400">100%</span>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <div className="flex-1 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <div className="text-gray-600 dark:text-gray-400 mb-1">Projects</div>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {projectsCompleted}/{projectsTotal}
                </div>
              </div>
              <div className="flex-1 p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/20">
                <div className="text-gray-600 dark:text-gray-400 mb-1">Tasks</div>
                <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                  {tasksCompleted}/{tasksTotal}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
