"use client";

import { useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTasks, Task } from "@/store/useTasks";

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isTodayISO(iso?: string) {
  if (!iso) return false;
  const d = new Date(iso);
  return isSameDay(d, new Date());
}

export default function TaskList() {
  const tasks = useTasks((s) => s.tasks);
  const toggle = useTasks((s) => s.toggle);
  const prefersReducedMotion = useReducedMotion();

  const todays = useMemo(() => {
    const list = tasks.filter((t) => isTodayISO(t.dueDate) || isTodayISO(t.createdAt));
    // Sort: active first, then by createdAt desc
    return list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });
  }, [tasks]);

  // Get card styling based on category and priority
  const getCardStyle = (task: Task) => {
    if (task.done) {
      return "bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 dark:from-gray-900 dark:to-gray-800 dark:border-gray-700";
    }

    // Priority-based gradients
    if (task.priority === 'urgent') {
      return "bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 border-2 border-red-300 dark:from-red-950/30 dark:via-orange-950/30 dark:to-yellow-950/30 dark:border-red-800 shadow-md hover:shadow-xl hover:shadow-red-200/50 dark:hover:shadow-red-900/30";
    }
    if (task.priority === 'high') {
      return "bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-2 border-orange-300 dark:from-orange-950/30 dark:via-amber-950/30 dark:to-yellow-950/30 dark:border-orange-800 shadow-md hover:shadow-xl hover:shadow-orange-200/50 dark:hover:shadow-orange-900/30";
    }

    // Category-based gradients
    if (task.category === 'mastery') {
      return "bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 border-2 border-blue-300 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-sky-950/30 dark:border-blue-800 shadow-md hover:shadow-xl hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30";
    }
    
    return "bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 border-2 border-pink-300 dark:from-pink-950/30 dark:via-rose-950/30 dark:to-purple-950/30 dark:border-pink-800 shadow-md hover:shadow-xl hover:shadow-pink-200/50 dark:hover:shadow-pink-900/30";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent">
          Today&apos;s Tasks
        </h2>
      </div>
      {todays.length === 0 ? (
        <div className="text-center py-12 px-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <div className="text-6xl mb-3">📝</div>
          <div className="text-lg font-medium text-gray-600 dark:text-gray-400">No tasks for today</div>
          <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">Start your day by adding a new task!</div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {todays.map((t: Task) => (
              <motion.div
                key={t.id}
                layout
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -10 }}
                whileHover={prefersReducedMotion ? undefined : { y: -4, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 ${getCardStyle(t)} ${t.done ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <motion.input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggle(t.id)}
                      whileTap={{ scale: 0.9 }}
                      className="w-5 h-5 mt-0.5 rounded-md border-2 border-gray-400 dark:border-gray-600 checked:bg-gradient-to-br checked:from-purple-500 checked:to-pink-500 checked:border-transparent focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 cursor-pointer transition-all"
                      aria-label={`Mark ${t.title} as ${t.done ? 'incomplete' : 'complete'}`}
                    />
                    <div className="flex-1">
                      <div className={`font-semibold text-lg ${t.done ? "line-through text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"}`}>
                        {t.title}
                      </div>
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {t.priority && (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                              t.priority === 'urgent' 
                                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white' 
                                : t.priority === 'high' 
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' 
                                : t.priority === 'medium' 
                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900' 
                                : 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                            }`}
                          >
                            🔥 {t.priority.toUpperCase()}
                          </span>
                        )}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                            t.category === "mastery"
                              ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                              : "bg-gradient-to-r from-pink-500 to-rose-500 text-white"
                          }`}
                        >
                          {t.category === "mastery" ? "🎯 Mastery" : "🎨 Pleasure"}
                        </span>
                        {t.dueDate && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                            ⏰ {new Date(t.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <motion.div
                    initial={false}
                    animate={t.done ? { 
                      scale: [1, 1.3, 1], 
                      rotate: [0, 180, 360],
                      opacity: [0.8, 1, 0.8] 
                    } : {}}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className={`flex items-center justify-center w-8 h-8 rounded-full shadow-lg ${
                      t.done 
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                        : 'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700'
                    }`}
                  >
                    {t.done && (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
