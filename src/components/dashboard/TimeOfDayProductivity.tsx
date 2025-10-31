import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

import type { TimeOfDayData } from "@/lib/analytics/dashboard";

export interface TimeOfDayProductivityProps {
  data: TimeOfDayData;
}

const periods = [
  { key: "morning", label: "Morning", emoji: "🌅", time: "5am-12pm", color: "from-amber-400 to-yellow-500" },
  { key: "afternoon", label: "Afternoon", emoji: "☀️", time: "12pm-5pm", color: "from-orange-400 to-amber-500" },
  { key: "evening", label: "Evening", emoji: "🌆", time: "5pm-9pm", color: "from-purple-400 to-pink-500" },
  { key: "night", label: "Night", emoji: "🌙", time: "9pm-5am", color: "from-indigo-500 to-purple-600" },
] as const;

const TimeOfDayProductivityComponent = ({ data }: TimeOfDayProductivityProps) => {
  const maxCompletion = useMemo(
    () => Math.max(...periods.map((period) => data[period.key].avgCompletion)),
    [data]
  );

  return (
    <div className="space-y-4">
      {periods.map((period) => {
        const periodData = data[period.key];
        const isMostProductive = periodData.avgCompletion === maxCompletion && maxCompletion > 0;

        return (
          <motion.div
            key={period.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 rounded-lg border-2 transition-all ${
              isMostProductive
                ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{period.emoji}</span>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {period.label}
                    {isMostProductive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500 text-white">Most Productive</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{period.time}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {periodData.avgCompletion.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">completion</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">Sessions</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{periodData.sessions}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">Focus Time</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(periodData.totalTime / 60)}m</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">Tasks Done</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{periodData.completedTasks}</div>
              </div>
            </div>

            <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${periodData.avgCompletion}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className={`h-full bg-gradient-to-r ${period.color}`}
              />
            </div>
          </motion.div>
        );
      })}

      {maxCompletion === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No focus sessions yet. Start tracking to see when you’re most productive!</p>
        </div>
      )}
    </div>
  );
};

export const TimeOfDayProductivity = memo(TimeOfDayProductivityComponent);

export default TimeOfDayProductivity;
