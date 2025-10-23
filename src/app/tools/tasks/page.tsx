"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useTasks, Task, TaskStatus, TaskCategory, TaskPriority } from "@/store/useTasks";
import { useThoughts } from "@/store/useThoughts";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Filter, 
  SortAsc, 
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Tag,
  ChevronDown,
  Repeat,
  MessageCircle,
  ExternalLink
} from "lucide-react";
import { getNotesPreview } from "@/lib/formatNotes";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { TaskInput } from "@/components/TaskInput";
import { SourceBadge } from "@/components/SourceBadge";
import Link from "next/link";

type SortOption = 'priority' | 'dueDate' | 'createdAt' | 'title';
type ViewMode = 'list' | 'kanban';

function TasksPageContent() {
  const tasks = useTasks((s) => s.tasks);
  const thoughts = useThoughts((s) => s.thoughts);
  const searchParams = useSearchParams();
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Auto-open task detail if navigating from notes page
  useEffect(() => {
    const taskId = searchParams.get('id');
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
      }
    }
  }, [searchParams, tasks]);

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      // If showCompleted is true, show all tasks
      if (!showCompleted) {
        // Hide completed one-time tasks, but show completed recurring tasks (they're "done for today")
        if (task.done && (!task.recurrence || task.recurrence.type === 'none')) return false;
      }
      if (filterStatus !== 'all' && task.status !== filterStatus) return false;
      if (filterCategory !== 'all' && task.category !== filterCategory) return false;
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
      return true;
    });

    const priorityOrder: Record<TaskPriority, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1
    };

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [tasks, filterStatus, filterCategory, filterPriority, sortBy, showCompleted]);

  // Group tasks by frequency
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {
      'one-time': [],
      'daily': [],
      'workweek': [],
      'weekly': [],
      'monthly': []
    };

    filteredAndSortedTasks.forEach(task => {
      const recurrenceType = task.recurrence?.type || 'none';
      if (recurrenceType === 'none') {
        groups['one-time'].push(task);
      } else if (groups[recurrenceType]) {
        groups[recurrenceType].push(task);
      }
    });

    return groups;
  }, [filteredAndSortedTasks]);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.done).length;
    const active = tasks.filter(t => t.status === 'active' && !t.done).length;
    const backlog = tasks.filter(t => t.status === 'backlog').length;
    const overdue = tasks.filter(t => {
      if (!t.dueDate || t.done) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    return { total, completed, active, backlog, overdue };
  }, [tasks]);

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getPriorityIcon = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="h-4 w-4" />;
      case 'high': return <AlertCircle className="h-4 w-4" />;
      case 'medium': return <Circle className="h-4 w-4" />;
      case 'low': return <Circle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header with inline stats */}
      <div className="rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-4 border-purple-200 dark:border-purple-800 shadow-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">📋 Tasks</h1>
            <div className="flex items-center gap-4 mt-2 text-sm font-medium">
              <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">{taskStats.active} active</span>
              <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300">{taskStats.completed} done</span>
              {taskStats.overdue > 0 && (
                <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300">{taskStats.overdue} overdue</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-4 border-amber-200 dark:border-amber-800 shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-amber-900 dark:text-amber-100 text-sm">Complete Tasks During Work</h3>
            <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
              Tasks can only be completed in <strong>Focus Mode</strong> (for desk work) or <strong>Errands Page</strong> (for out-of-office tasks). This ensures intentional task completion.
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-4 border-blue-200 dark:border-blue-800 shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              {showCompleted ? 'Hide' : 'Show'} completed
            </button>
          </div>
          <div className="flex items-center gap-2">
            <SortAsc className="h-4 w-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="input py-1 text-sm"
            >
              <option value="priority">Priority</option>
              <option value="dueDate">Due Date</option>
              <option value="createdAt">Created Date</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-4 pt-4 border-t"
          >
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
                className="input py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="backlog">Backlog</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as TaskCategory | 'all')}
                className="input py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="mastery">Mastery</option>
                <option value="pleasure">Pleasure</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Priority</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
                className="input py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </motion.div>
        )}
      </div>

      {/* Task List - Grouped by Frequency */}
      <div className="space-y-6">
        <div className="text-sm text-muted-foreground">
          Showing {filteredAndSortedTasks.length} of {tasks.length} tasks
        </div>

        {filteredAndSortedTasks.length === 0 && (
          <div className="card p-12 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tasks found</h3>
            <p className="text-muted-foreground mb-4">
              {tasks.length === 0 
                ? "Create your first task to get started"
                : "Try adjusting your filters"
              }
            </p>
            {tasks.length === 0 && (
              <button
                onClick={() => setShowNewTask(true)}
                className="btn-primary mx-auto"
              >
                Create Task
              </button>
            )}
          </div>
        )}

        {/* Render each frequency group */}
        {Object.entries(groupedTasks).map(([frequency, groupTasks]) => {
          if (groupTasks.length === 0) return null;

          const groupTitles: Record<string, string> = {
            'one-time': '📋 One-Time Tasks',
            'daily': '🌅 Daily Tasks',
            'workweek': '💼 Workweek Tasks (Mon-Fri)',
            'weekly': '📅 Weekly Tasks',
            'monthly': '📆 Monthly Tasks'
          };

          const groupColors: Record<string, string> = {
            'one-time': 'from-gray-500 to-slate-600',
            'daily': 'from-orange-500 to-amber-600',
            'workweek': 'from-blue-500 to-indigo-600',
            'weekly': 'from-green-500 to-emerald-600',
            'monthly': 'from-purple-500 to-violet-600'
          };

          return (
            <div key={frequency} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className={`text-lg font-bold bg-gradient-to-r ${groupColors[frequency]} bg-clip-text text-transparent`}>
                  {groupTitles[frequency]}
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({groupTasks.length})
                </span>
              </div>

              <AnimatePresence>
                {groupTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`p-4 rounded-xl cursor-pointer transition-all transform hover:scale-[1.02] hover:shadow-xl border-2 ${
                      task.done 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-300 dark:border-green-800' 
                        : task.category === 'mastery'
                        ? 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 border-blue-300 dark:border-blue-800'
                        : 'bg-gradient-to-r from-pink-50 via-rose-50 to-red-50 dark:from-pink-950/20 dark:via-rose-950/20 dark:to-red-950/20 border-pink-300 dark:border-pink-800'
                    }`}
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Visual indicator only - not clickable */}
                      <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 shadow-md ${
                        task.done 
                          ? 'bg-gradient-to-br from-green-400 to-emerald-500 border-green-600 dark:from-green-600 dark:to-emerald-700 dark:border-green-500' 
                          : 'bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                      }`}>
                        {task.done && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </div>
                      
                      {/* Single line with all info */}
                      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <h3 className={`font-medium shrink-0 ${task.done && !task.recurrence ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </h3>
                        
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 shrink-0 ${getPriorityColor(task.priority)}`}>
                          {getPriorityIcon(task.priority)}
                          {task.priority}
                        </span>
                        
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm shrink-0 ${
                          task.category === "mastery"
                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0"
                            : "bg-gradient-to-r from-pink-500 to-rose-600 text-white border-0"
                        }`}>
                          {task.category === "mastery" ? "🧠 " : "💝 "}{task.category}
                        </span>
                        
                        {task.focusEligible !== false && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm shrink-0">
                            🎯 Focus
                          </span>
                        )}
                        
                        {task.done && task.recurrence && task.recurrence.type !== 'none' && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold shadow-sm shrink-0">
                            ✓ Done today
                          </span>
                        )}
                        
                        {task.recurrence && task.recurrence.type !== 'none' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-sm flex items-center gap-1 shrink-0">
                            <Repeat className="h-3 w-3" />
                            {task.recurrence.type}
                            {task.recurrence.frequency && ` (${task.completionCount || 0}/${task.recurrence.frequency})`}
                          </span>
                        )}
                        
                        {task.dueDate && (
                          <span className="text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 shadow-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        
                        {task.estimatedMinutes && (
                          <span className="text-xs font-semibold bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 shadow-sm">
                            <Clock className="h-3 w-3" />
                            {task.estimatedMinutes}m
                          </span>
                        )}
                        
                        {task.tags && Array.isArray(task.tags) && task.tags.length > 0 && (
                          <span className="text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 shadow-sm">
                            <Tag className="h-3 w-3" />
                            {task.tags.join(', ')}
                          </span>
                        )}
                        
                        {task.thoughtId && (() => {
                          const thought = thoughts.find(t => t.id === task.thoughtId);
                          if (!thought) return null;
                          return (
                            <Link
                              href={`/tools/thoughts?id=${task.thoughtId}`}
                              className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm flex items-center gap-1 shrink-0 hover:from-indigo-600 hover:to-purple-700 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MessageCircle className="h-3 w-3" />
                              From Thought
                            </Link>
                          );
                        })()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* New Task Modal */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-background rounded-lg shadow-xl max-w-2xl w-full my-8"
            >
              <div className="sticky top-0 bg-background rounded-t-lg border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">New Task</h2>
                <button
                  onClick={() => setShowNewTask(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <TaskInput onClose={() => setShowNewTask(false)} />
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setShowNewTask(true)}
        className="fixed bottom-8 right-8 h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-2xl hover:shadow-3xl transition-all flex items-center justify-center z-40 hover:scale-110"
        title="New Task"
      >
        <Plus className="h-8 w-8" />
      </button>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <TasksPageContent />
    </Suspense>
  );
}
