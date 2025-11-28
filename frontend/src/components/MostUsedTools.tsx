"use client";

import { useEffect } from "react";
import { useToolUsage } from "@/store/useToolUsage";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { toolVisuals } from "./tools/toolVisuals";

const TOOL_LABEL_OVERRIDES: Record<string, string> = {
  moodtracker: "Mood",
};

export function MostUsedTools() {
  const { user } = useAuth();
  const subscribe = useToolUsage((s) => s.subscribe);
  const getMostUsedTools = useToolUsage((s) => s.getMostUsedTools);

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  const mostUsed = getMostUsedTools(5);

  if (mostUsed.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
        <div className="flex items-center justify-center gap-2 mb-3 text-purple-600 dark:text-purple-400">
          <TrendingUp className="h-5 w-5" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Tools</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Start using tools to see your most-used workflows.
        </p>
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
        >
          Browse All Tools
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Most Used Tools
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {mostUsed.map((tool, index) => {
          const visual = toolVisuals[tool.toolName];
          const Icon = visual?.icon || TrendingUp;
          const gradient = visual?.gradient || "from-gray-500 to-gray-700";
          const label = TOOL_LABEL_OVERRIDES[tool.toolName] ?? visual?.label ?? tool.toolName;

          return (
            <Link
              key={tool.toolName}
              href={`/tools/${tool.toolName}`}
              className="block"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 transition-all hover:shadow-lg group"
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>

                {/* Label */}
                <div className="mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {label}
                  </h3>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-end text-xs text-gray-600 dark:text-gray-400">
                  <span className="text-purple-600 dark:text-purple-400 font-medium group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>

      {mostUsed.length < 5 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          Use more tools to see your top 5 favorites
        </p>
      )}
    </div>
  );
}
