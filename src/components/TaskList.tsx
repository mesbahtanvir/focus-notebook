"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTasks, Task } from "@/store/useTasks";
import { useThoughts } from "@/store/useThoughts";
import { isTodayISO, isTaskCompletedToday } from "@/lib/utils/date";
import Link from "next/link";
import { MessageCircle, ExternalLink } from "lucide-react";
import { TimeDisplay } from "./TimeDisplay";

export default function TaskList() {
  const tasks = useTasks((s) => s.tasks);
  const thoughts = useThoughts((s) => s.thoughts);
  const toggle = useTasks((s) => s.toggle);
  const prefersReducedMotion = useReducedMotion();
  const [showCompleted, setShowCompleted] = useState(false);

  const todays = useMemo(() => {
    const list = tasks.filter((t) => {
      // Show tasks for today
      const isToday = isTodayISO(t.dueDate) || isTodayISO(t.createdAt);
      if (!isToday) return false;

      // If showCompleted is true, show all tasks
      if (showCompleted) return true;

      // Hide completed tasks (checks completion for today for recurring tasks)
      const completedToday = isTaskCompletedToday(t);
      if (completedToday && (!t.recurrence || t.recurrence.type === 'none')) {
        // Hide completed one-time tasks
        return false;
      }

      return true;
    });
    // Sort by createdAt desc
    return list.sort((a, b) => {
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });
  }, [tasks, showCompleted]);

  // Get card styling based on category and priority
  const getCardStyle = (task: Task) => {
    if (isTaskCompletedToday(task)) {
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
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Today</h2>
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          {showCompleted ? 'Hide' : 'Show'} completed
        </button>
      </div>
      {todays.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700">
          <div className="text-sm text-gray-400">No tasks</div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {todays.map((t: Task) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`group relative overflow-hidden rounded-lg p-3 transition-all duration-300 border ${isTaskCompletedToday(t) ? "opacity-50 bg-gray-50 dark:bg-gray-800/30 border-gray-300 dark:border-gray-700" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"}`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={isTaskCompletedToday(t)}
                    onChange={() => toggle(t.id)}
                    className="w-4 h-4 mt-0.5 rounded border-2 border-gray-400 dark:border-gray-600 checked:bg-purple-600 checked:border-transparent cursor-pointer transition-all"
                    aria-label={`Mark ${t.title} as ${isTaskCompletedToday(t) ? 'incomplete' : 'complete'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-medium ${isTaskCompletedToday(t) && !t.recurrence ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"}`}>
                        {t.title}
                      </div>
                      {isTaskCompletedToday(t) && t.recurrence && t.recurrence.type !== 'none' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400">
                          ✓ Done for today
                        </span>
                      )}
                    </div>

                    {/* Time Tracking - Always visible */}
                    {(t.actualMinutes || t.estimatedMinutes) && (
                      <div className="mt-2">
                        <TimeDisplay
                          actual={t.actualMinutes}
                          estimated={t.estimatedMinutes}
                          variant="inline"
                          showProgressBar={true}
                        />
                      </div>
                    )}

                    {/* Tags - Hidden by default, shown on hover */}
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap opacity-0 group-hover:opacity-100 transition-opacity">
                      {t.priority && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          t.priority === 'urgent' ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' :
                          t.priority === 'high' ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400' :
                          t.priority === 'medium' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400' :
                          'bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400'
                        }`}>
                          {t.priority}
                        </span>
                      )}
                      {t.dueDate && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          {new Date(t.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {t.thoughtId && (() => {
                        const thought = thoughts.find(th => th.id === t.thoughtId);
                        if (!thought) return null;
                        return (
                          <Link
                            href={`/tools/thoughts?id=${t.thoughtId}`}
                            className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageCircle className="h-3 w-3" />
                            From Thought
                          </Link>
                        );
                      })()}
                      {t.ctaButton && (() => {
                        const buttonIcons: Record<string, string> = {
                          leetcode: '💻',
                          chess: '♟️',
                          headspace: '🧘',
                          focus: '⚡',
                          brainstorming: '💡',
                          notes: '📝',
                          custom: '🔗',
                        };
                        const icon = buttonIcons[t.ctaButton.type] || '🔗';
                        const url = t.ctaButton.toolPath || t.ctaButton.url || '#';
                        const isExternal = url.startsWith('http');

                        return (
                          <a
                            href={url}
                            target={isExternal ? '_blank' : '_self'}
                            rel={isExternal ? 'noopener noreferrer' : undefined}
                            className="text-xs px-2 py-0.5 rounded bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 dark:from-purple-950/40 dark:to-indigo-950/40 dark:text-purple-300 hover:from-purple-200 hover:to-indigo-200 dark:hover:from-purple-900/60 dark:hover:to-indigo-900/60 transition-colors flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                            title={t.ctaButton.label || 'Quick action'}
                          >
                            <span>{icon}</span>
                            {t.ctaButton.label && <span className="max-w-[80px] truncate">{t.ctaButton.label}</span>}
                            {isExternal && <ExternalLink className="h-2.5 w-2.5" />}
                          </a>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
