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

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Today&apos;s Tasks</h2>
      {todays.length === 0 ? (
        <div className="text-muted-foreground">No tasks for today</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {todays.map((t: Task) => (
              <motion.div
                key={t.id}
                layout
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.995, y: 4 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.995, y: 2 }}
                whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                transition={{ type: "spring", stiffness: 180, damping: 22 }}
                className={`card p-4 border ${t.done ? "opacity-70" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <motion.input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggle(t.id)}
                      whileTap={{ scale: 0.94 }}
                      aria-label={`Mark ${t.title} as ${t.done ? 'incomplete' : 'complete'}`}
                    />
                    <div>
                      <div className={`font-medium ${t.done ? "line-through text-muted-foreground" : ""}`}>
                        {t.title}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-2 flex-wrap">
                        {t.priority && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                              t.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900' :
                              t.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900' :
                              t.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900' :
                              'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900'
                            }`}
                          >
                            {t.priority}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                            t.category === "mastery"
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
                              : "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-900"
                          }`}
                        >
                          {t.category}
                        </span>
                        {t.dueDate && (
                          <span className="text-xs text-muted-foreground">Due {new Date(t.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <motion.div
                    initial={false}
                    animate={t.done ? { scale: [1, 1.05, 1], opacity: [1, 0.85, 1] } : {}}
                    transition={{ duration: 0.35 }}
                    className="w-2 h-2 rounded-full mt-1"
                    style={{ backgroundColor: t.done ? "#22c55e" : "#94a3b8" }}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
