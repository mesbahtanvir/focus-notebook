"use client";

import { useTasks } from "@/store/useTasks";
import { motion } from "framer-motion";
import { ShoppingBag, MapPin, Car, Package, CheckCircle2, Circle, Trash2, Plus } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function ErrandsPage() {
  const tasks = useTasks((s) => s.tasks);
  const toggle = useTasks((s) => s.toggle);
  const deleteTask = useTasks((s) => s.deleteTask);
  const updateTask = useTasks((s) => s.updateTask);

  const [showAddForm, setShowAddForm] = useState(false);

  // Filter for non-focus-eligible tasks (errands)
  const errandTasks = tasks.filter(t => t.focusEligible === false);
  const activeErrands = errandTasks.filter(t => !t.done && t.status === 'active');
  const completedErrands = errandTasks.filter(t => t.done);

  const toggleFocusEligible = async (taskId: string, currentValue: boolean | undefined) => {
    await updateTask(taskId, { focusEligible: !currentValue });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center space-y-3 mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg"
        >
          <ShoppingBag className="h-8 w-8" />
        </motion.div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent">
          Errands & Out-of-Office Tasks
        </h1>
        <p className="text-muted-foreground text-lg">
          Tasks that need to be done outside or away from your desk
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-orange-500" />
            <div>
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{activeErrands.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Errands</div>
            </div>
          </div>
        </div>
        <div className="card p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{completedErrands.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Errands */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Active Errands</h2>
          <Link
            href="/tools/tasks"
            className="text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
          >
            Create New Task →
          </Link>
        </div>

        {activeErrands.length === 0 ? (
          <div className="card p-12 text-center space-y-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700">
            <div className="text-6xl mb-2">🎉</div>
            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
              No active errands
            </p>
            <p className="text-sm text-gray-500">
              All caught up! Create tasks and mark them as errands to see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeErrands.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card p-4 hover:shadow-lg transition-all bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggle(task.id)}
                    className="mt-1 text-gray-400 hover:text-green-600 transition-colors"
                  >
                    <Circle className="h-6 w-6" />
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                          {task.title}
                        </h3>
                        {task.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {task.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              task.category === 'mastery'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                : 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                            }`}
                          >
                            {task.category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              task.priority === 'urgent'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                                : task.priority === 'high'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
                                : task.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                            }`}
                          >
                            {task.priority}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            Errand
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        aria-label="Delete task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Errands */}
      {completedErrands.length > 0 && (
        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Recently Completed</h2>
          <div className="space-y-3">
            {completedErrands.slice(0, 5).map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card p-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 opacity-75"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggle(task.id)}
                    className="mt-1 text-green-600"
                  >
                    <CheckCircle2 className="h-6 w-6" />
                  </button>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-lg line-through">
                      {task.title}
                    </h3>
                    {task.completedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Completed {new Date(task.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-12 card p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Package className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              About Errands
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              These are tasks that can&apos;t be done during a focus session at your desk. Examples include:
              shopping at the mall, picking up packages, running errands, attending in-person meetings, 
              or any other activity that requires you to leave your workspace.
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
              When creating a task in the Tasks tool, you can mark it as an errand by toggling the 
              &quot;Focus Eligible&quot; option off.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
