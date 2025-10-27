"use client";

import { useTasks } from "@/store/useTasks";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, MapPin, Car, Package, CheckCircle2, Circle, Trash2, Plus, Search, Filter, ChevronDown, ArrowLeft } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getNotesPreview } from "@/lib/formatNotes";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";

export default function ErrandsPage() {
  useTrackToolUsage('errands');

  const router = useRouter();
  const tasks = useTasks((s) => s.tasks);
  const toggle = useTasks((s) => s.toggle);
  const deleteTask = useTasks((s) => s.deleteTask);
  const updateTask = useTasks((s) => s.updateTask);

  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filter for non-focus-eligible tasks (errands)
  const errandTasks = tasks.filter(t => t.focusEligible === false);
  
  const filterErrandsBySearch = (errandsList: typeof errandTasks) => {
    if (!searchQuery.trim()) return errandsList;
    const query = searchQuery.toLowerCase();
    return errandsList.filter(t => 
      t.title.toLowerCase().includes(query) ||
      t.notes?.toLowerCase().includes(query) ||
      t.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  };
  
  const activeErrands = filterErrandsBySearch(errandTasks.filter(t => !t.done && t.status === 'active'));
  const completedErrands = filterErrandsBySearch(errandTasks.filter(t => t.done));

  const toggleFocusEligible = async (taskId: string, currentValue: boolean | undefined) => {
    await updateTask(taskId, { focusEligible: !currentValue });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-4 border-orange-200 dark:border-orange-800 shadow-xl p-6">
        <div className="flex items-start gap-3">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="group flex items-center justify-center p-2 rounded-xl bg-white dark:bg-gray-800 border-2 border-orange-300 dark:border-orange-700 hover:border-orange-500 dark:hover:border-orange-500 transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors" />
          </button>

          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              🛍️ Errands & Out-of-Office Tasks
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
              Tasks that need to be done outside or away from your desk
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-4 border-blue-200 dark:border-blue-800 shadow-xl p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search errands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {activeErrands.length + completedErrands.length} total errands
          </div>
        </div>

        {/* Filter Options (placeholder for future filters) */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-4 pt-4 border-t border-blue-200 dark:border-blue-700"
          >
            <div className="text-sm text-gray-600 dark:text-gray-400">
              No additional filters available
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-4 border-orange-200 dark:border-orange-800 shadow-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-xl">
              <MapPin className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent">{activeErrands.length}</div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Errands</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-4 border-green-200 dark:border-green-800 shadow-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">{completedErrands.length}</div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Errands */}
      <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-4 border-blue-200 dark:border-blue-800 shadow-xl p-6 space-y-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
          🎯 Active Errands
        </h2>

        {activeErrands.length === 0 ? (
          <div className="p-8 text-center space-y-3 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700">
            <div className="text-6xl mb-2">🎉</div>
            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
              No active errands
            </p>
            <p className="text-sm text-gray-500">
              All caught up! Create tasks and toggle &quot;Focus Eligible&quot; off to add errands.
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
                className="p-4 rounded-lg bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 hover:border-orange-400 dark:hover:border-orange-600 hover:shadow-md transition-all"
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
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {getNotesPreview(task.notes, 100)}
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
        <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-4 border-green-200 dark:border-green-800 shadow-xl p-6 space-y-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
            ✅ Recently Completed
          </h2>
          <div className="space-y-3">
            {completedErrands.slice(0, 5).map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-lg bg-white dark:bg-gray-800 border-2 border-green-200 dark:border-green-700 opacity-75"
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
      <div className="rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-4 border-purple-200 dark:border-purple-800 shadow-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
            <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-2">
              📌 About Errands
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              These are tasks that can&apos;t be done during a focus session at your desk. Examples include:
              shopping at the mall, picking up packages, running errands, attending in-person meetings, 
              or any other activity that requires you to leave your workspace.
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              When creating a task in the Tasks tool, you can mark it as an errand by toggling the 
              &quot;Focus Eligible&quot; option <strong>OFF</strong>. Tasks marked as errands can only be completed here or remain as non-focus tasks.
            </p>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        href="/tools/tasks"
        title="New Errand"
        icon={<Plus className="h-6 w-6" />}
      />
    </div>
  );
}
