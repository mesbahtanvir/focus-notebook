"use client";

import { useTasks } from "@/store/useTasks";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Car, Package, CheckCircle2, Circle, Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { getNotesPreview } from "@/lib/formatNotes";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { toolThemes, ToolHeader, SearchAndFilters, ToolPageLayout } from "@/components/tools";

export default function ErrandsPage() {
  useTrackToolUsage('errands');

  const tasks = useTasks((s) => s.tasks);
  const toggle = useTasks((s) => s.toggle);
  const deleteTask = useTasks((s) => s.deleteTask);
  const updateTask = useTasks((s) => s.updateTask);

  const [searchQuery, setSearchQuery] = useState("");

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

  const theme = toolThemes.orange;

  return (
    <ToolPageLayout>
      <ToolHeader
        title="Errands & Out-of-Office Tasks"
        emoji="🛍️"
        subtitle="Tasks that need to be done outside or away from your desk"
        showBackButton
        stats={[
          { label: 'active', value: activeErrands.length, variant: 'warning' },
          { label: 'completed', value: completedErrands.length, variant: 'success' }
        ]}
        theme={theme}
      />

      <SearchAndFilters
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search errands..."
        totalCount={errandTasks.length}
        filteredCount={activeErrands.length + completedErrands.length}
        theme={theme}
      />

      {/* Main Content */}

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
    </ToolPageLayout>
  );
}
