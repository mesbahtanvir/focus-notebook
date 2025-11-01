"use client";

import { useEffect } from "react";
import { useToolUsage, ToolName } from "@/store/useToolUsage";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  CheckSquare,
  Brain,
  Target,
  FolderKanban,
  Zap,
  Lightbulb,
  StickyNote,
  Users,
  Smile,
  Heart,
  ShoppingCart,
  Sparkles,
  Plane,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import Link from "next/link";

const toolIcons: Record<ToolName, any> = {
  tasks: CheckSquare,
  thoughts: Brain,
  goals: Target,
  projects: FolderKanban,
  focus: Zap,
  brainstorming: Lightbulb,
  notes: StickyNote,
  relationships: Users,
  moodtracker: Smile,
  cbt: Heart,
  errands: ShoppingCart,
  deepreflect: Sparkles,
  'vacation-packing': Plane,
  'apple-kindle-connector': BookOpen,
};

const toolColors: Record<ToolName, string> = {
  tasks: "from-blue-500 to-cyan-500",
  thoughts: "from-purple-500 to-pink-500",
  goals: "from-green-500 to-emerald-500",
  projects: "from-orange-500 to-amber-500",
  focus: "from-indigo-500 to-purple-500",
  brainstorming: "from-yellow-500 to-orange-500",
  notes: "from-teal-500 to-green-500",
  relationships: "from-pink-500 to-rose-500",
  moodtracker: "from-amber-500 to-yellow-500",
  cbt: "from-red-500 to-pink-500",
  errands: "from-cyan-500 to-blue-500",
  deepreflect: "from-violet-500 to-purple-500",
  'vacation-packing': "from-teal-500 to-cyan-500",
  'apple-kindle-connector': "from-indigo-500 to-purple-500",
};

const toolLabels: Record<ToolName, string> = {
  tasks: "Tasks",
  thoughts: "Thoughts",
  goals: "Goals",
  projects: "Projects",
  focus: "Focus",
  brainstorming: "Brainstorming",
  notes: "Notes",
  relationships: "People",
  moodtracker: "Mood",
  cbt: "CBT",
  errands: "Errands",
  deepreflect: "Deep Reflect",
  'vacation-packing': "Vacation Packing",
  'apple-kindle-connector': "Reading Connector",
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
    return null;
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
          const Icon = toolIcons[tool.toolName];
          const gradient = toolColors[tool.toolName];
          const label = toolLabels[tool.toolName];

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
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>{tool.clickCount} clicks</span>
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
