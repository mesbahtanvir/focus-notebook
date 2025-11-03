"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useTasks, Task, TaskStatus, TaskPriority, TaskCategory } from '@/store/useTasks';
import { useThoughts } from '@/store/useThoughts';
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Filter,
  SortAsc,
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  Repeat,
  Trash2,
  ChevronDown,
  MessageCircle,
  Search,
  Loader2,
  FileText,
  ArrowLeft
} from "lucide-react";
import { getNotesPreview } from "@/lib/formatNotes";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { TaskInput } from "@/components/TaskInput";
import { SourceBadge } from "@/components/SourceBadge";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import Link from "next/link";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { toolThemes, ToolHeader, SearchAndFilters, ToolPageLayout } from "@/components/tools";

type SortOption = 'priority' | 'dueDate' | 'createdAt' | 'title';
type ViewMode = 'list' | 'kanban';

function TasksPageContent() {
  useTrackToolUsage('tasks');

  const router = useRouter();
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
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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

  // Helper function to extract user notes from task.notes
  const getUserNotes = (notes?: string): string => {
    if (!notes) return '';
    try {
      const parsed = JSON.parse(notes);
      // Check if it's metadata
      if (parsed.sourceThoughtId || parsed.createdBy === 'thought-processor') {
        return parsed.userNotes || '';
      }
    } catch {
      // Not JSON, return as-is
    }
    return notes;
  };

  const filteredAndSortedTasks = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    let filtered = tasks.filter(task => {
      // If showCompleted is true, show all tasks
      if (!showCompleted) {
        // Hide completed one-time tasks, but show completed recurring tasks (they're "done for today")
        if (task.done && (!task.recurrence || task.recurrence.type === 'none')) return false;
      }
      if (filterStatus !== 'all' && task.status !== filterStatus) return false;
      if (filterCategory !== 'all' && task.category !== filterCategory) return false;
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
      
      // Search in title and notes
      if (searchTerm) {
        const titleMatch = task.title.toLowerCase().includes(searchLower);
        const notesMatch = task.notes?.toLowerCase().includes(searchLower) || false;
        const tagsMatch = task.tags?.some(tag => tag.toLowerCase().includes(searchLower)) || false;
        
        if (!titleMatch && !notesMatch && !tagsMatch) {
          return false;
        }
      }
      
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
  }, [tasks, filterStatus, filterCategory, filterPriority, sortBy, showCompleted, searchTerm]);

  // Group tasks by frequency
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {
      'one-time': [],
      'daily': [],
      'workweek': [],
      'weekly': [],
      'biweekly': [],
      'monthly': [],
      'bimonthly': [],
      'halfyearly': [],
      'yearly': []
    };

    filteredAndSortedTasks.forEach(task => {
      const recurrenceType = task.recurrence?.type || 'none';
      if (recurrenceType === 'none') {
        groups['one-time'].push(task);
      } else if (groups[recurrenceType]) {
        groups[recurrenceType].push(task);
      }
    });

    // Filter out empty groups
    const nonEmptyGroups: Record<string, Task[]> = {};
    Object.entries(groups).forEach(([key, tasks]) => {
      if (tasks.length > 0) {
        nonEmptyGroups[key] = tasks;
      }
    });

    return nonEmptyGroups;
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

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const theme = toolThemes.purple;

  return (
    <ToolPageLayout>
      <ToolHeader
        title="Tasks"
        emoji="📋"
        showBackButton
        stats={[
          { label: 'active', value: taskStats.active, variant: 'info' },
          { label: 'done', value: taskStats.completed, variant: 'success' },
          ...(taskStats.overdue > 0 ? [{ label: 'overdue', value: taskStats.overdue, variant: 'warning' as const }] : [])
        ]}
        theme={theme}
      />

      <SearchAndFilters
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search tasks..."
        totalCount={tasks.length}
        filteredCount={filteredAndSortedTasks.length}
        showFilterToggle
        filterContent={
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
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
          </>
        }
        additionalControls={
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-sm px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              {showCompleted ? 'Hide' : 'Show'} completed
            </button>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <SortAsc className="h-4 w-4" />
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="input py-2 text-sm"
              >
                <option value="priority">Priority</option>
                <option value="dueDate">Due Date</option>
                <option value="createdAt">Created Date</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>
        }
        theme={theme}
      />

      {/* Task List - Grouped by Frequency */}
      <div className="space-y-6">
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
        {Object.entries(groupedTasks).map(([frequency, groupTasks]) => (
          <TaskGroup
            key={frequency}
            frequency={frequency}
            tasks={groupTasks}
            isCollapsed={collapsedGroups.has(frequency)}
            onToggle={() => toggleGroupCollapse(frequency)}
            onTaskClick={setSelectedTask}
            setSelectedTask={setSelectedTask}
            thoughts={thoughts}
            getPriorityColor={getPriorityColor}
            getPriorityIcon={getPriorityIcon}
          />
        ))}
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

      <FloatingActionButton
        onClick={() => setShowNewTask(true)}
        title="New Task"
      />
    </ToolPageLayout>
  );
}

// Task Group Component with Infinite Scroll
function TaskGroup({
  frequency,
  tasks,
  isCollapsed,
  onToggle,
  onTaskClick,
  setSelectedTask,
  thoughts,
  getPriorityColor,
  getPriorityIcon
}: {
  frequency: string;
  tasks: Task[];
  isCollapsed: boolean;
  onToggle: () => void;
  onTaskClick: (task: Task) => void;
  setSelectedTask: (task: Task) => void;
  thoughts: any[];
  getPriorityColor: (priority: TaskPriority) => string;
  getPriorityIcon: (priority: TaskPriority) => React.ReactNode;
}) {
  const { displayedItems, hasMore, observerTarget } = useInfiniteScroll(tasks, {
    initialItemsPerPage: 15,
    threshold: 0.8
  });

  // Helper function to extract user notes from task.notes
  const getUserNotes = (notes?: string): string => {
    if (!notes) return '';
    try {
      const parsed = JSON.parse(notes);
      // Check if it's metadata
      if (parsed.sourceThoughtId || parsed.createdBy === 'thought-processor') {
        return parsed.userNotes || '';
      }
    } catch {
      // Not JSON, return as-is
    }
    return notes;
  };

  if (tasks.length === 0) return null;

  const groupTitles: Record<string, string> = {
    'one-time': '📋 One-Time Tasks',
    'daily': '🌅 Daily Tasks',
    'workweek': '💼 Workweek Tasks (Mon-Fri)',
    'weekly': '📅 Weekly Tasks',
    'biweekly': '📅 Biweekly Tasks (Every 2 Weeks)',
    'monthly': '📆 Monthly Tasks',
    'bimonthly': '📆 Bimonthly Tasks (Every 2 Months)',
    'halfyearly': '📅 Half-Yearly Tasks (Twice a Year)',
    'yearly': '🎊 Yearly Tasks'
  };

  const groupColors: Record<string, string> = {
    'one-time': 'from-gray-500 to-slate-600',
    'daily': 'from-orange-500 to-amber-600',
    'workweek': 'from-blue-500 to-indigo-600',
    'weekly': 'from-green-500 to-emerald-600',
    'biweekly': 'from-teal-500 to-cyan-600',
    'monthly': 'from-purple-500 to-violet-600',
    'bimonthly': 'from-fuchsia-500 to-pink-600',
    'halfyearly': 'from-rose-500 to-red-600',
    'yearly': 'from-yellow-500 to-orange-600'
  };

  const toTitleCase = (value: string): string =>
    value.replace(/\b\w/g, char => char.toUpperCase());

  const formatDate = (value: string): string => {
    try {
      return new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: new Date(value).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return value;
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity"
      >
        <ChevronDown className={`h-5 w-5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
        <h2 className={`text-lg font-bold bg-gradient-to-r ${groupColors[frequency]} bg-clip-text text-transparent`}>
          {groupTitles[frequency]}
        </h2>
        <span className="text-sm text-muted-foreground">
          ({tasks.length})
        </span>
      </button>

      {!isCollapsed && (
        <>
          <AnimatePresence>
            {displayedItems.map((task) => (
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
                onClick={() => onTaskClick(task)}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 shadow-md ${
                        task.done
                          ? 'bg-gradient-to-br from-green-400 to-emerald-500 border-green-600 dark:from-green-600 dark:to-emerald-700 dark:border-green-500'
                          : 'bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                      }`}
                    >
                      {task.done && <CheckCircle2 className="h-4 w-4 text-white" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <h3
                          className={`text-base font-semibold leading-snug ${task.done && !task.recurrence ? 'line-through text-muted-foreground' : 'text-gray-900 dark:text-white'}`}
                        >
                          {toTitleCase(task.title)}
                        </h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm inline-flex items-center gap-1 shrink-0 ${getPriorityColor(task.priority)}`}>
                          {getPriorityIcon(task.priority)}
                          <span className="capitalize">
                            {toTitleCase(task.priority)}
                          </span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                        {task.dueDate && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(task.dueDate)}
                          </span>
                        )}

                        {task.recurrence && task.recurrence.type !== 'none' && (
                          <span className="inline-flex items-center gap-1 capitalize">
                            <Repeat className="h-3 w-3" />
                            {toTitleCase(task.recurrence.type)}
                            {task.recurrence.frequency && ` (${task.completionCount || 0}/${task.recurrence.frequency})`}
                          </span>
                        )}

                        {task.done && task.recurrence && task.recurrence.type !== 'none' && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Done Today
                          </span>
                        )}

                        {(() => {
                          let thoughtId = task.thoughtId;
                          if (!thoughtId && task.notes) {
                            try {
                              const metadata = JSON.parse(task.notes);
                              if (metadata.sourceThoughtId) {
                                thoughtId = metadata.sourceThoughtId;
                              }
                            } catch {
                              // ignore
                            }
                          }
                          if (!thoughtId) return null;
                          const thought = thoughts.find(t => t.id === thoughtId);
                          if (!thought) return null;
                          return (
                            <Link
                              href={`/tools/thoughts?id=${thoughtId}`}
                              className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300 hover:underline transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MessageCircle className="h-3 w-3" />
                              From Thought
                            </Link>
                          );
                        })()}
                      </div>

                      {(() => {
                        const notes = getUserNotes(task.notes);
                        if (!notes) return null;
                        const preview = notes.length > 100 ? notes.substring(0, 100) + '…' : notes;
                        return (
                          <button
                            type="button"
                            className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                            }}
                          >
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="line-clamp-2 text-left capitalize">{toTitleCase(preview)}</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Infinite scroll trigger */}
          {hasMore && (
            <div ref={observerTarget} className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}
        </>
      )}
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
