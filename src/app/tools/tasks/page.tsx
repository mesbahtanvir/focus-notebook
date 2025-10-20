"use client";

import { useState, useMemo } from "react";
import { useTasks, Task, TaskStatus, TaskCategory, TaskPriority } from "@/store/useTasks";
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
  ChevronDown
} from "lucide-react";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { TaskInput } from "@/components/TaskInput";

type SortOption = 'priority' | 'dueDate' | 'createdAt' | 'title';
type ViewMode = 'list' | 'kanban';

export default function TasksPage() {
  const tasks = useTasks((s) => s.tasks);
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showFilters, setShowFilters] = useState(false);

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
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
  }, [tasks, filterStatus, filterCategory, filterPriority, sortBy]);

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
      case 'urgent': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900';
      case 'high': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-900';
      case 'low': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900';
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
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Manager</h1>
          <p className="text-muted-foreground mt-1">Organize and track your tasks</p>
        </div>
        <button
          onClick={() => setShowNewTask(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="card p-4">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold mt-1">{taskStats.total}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{taskStats.active}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{taskStats.completed}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted-foreground">Backlog</div>
          <div className="text-2xl font-bold mt-1 text-gray-600 dark:text-gray-400">{taskStats.backlog}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted-foreground">Overdue</div>
          <div className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">{taskStats.overdue}</div>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
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

      {/* Task List */}
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Showing {filteredAndSortedTasks.length} of {tasks.length} tasks
        </div>
        <AnimatePresence>
          {filteredAndSortedTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedTask(task)}
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={(e) => {
                      e.stopPropagation();
                      useTasks.getState().toggle(task.id);
                    }}
                    className="h-5 w-5 rounded"
                  />
                  <div className="flex-1">
                    <h3 className={`font-medium ${task.done ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </h3>
                    {task.notes && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.notes}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                        {getPriorityIcon(task.priority)}
                        {task.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                        task.category === "mastery"
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
                          : "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-900"
                      }`}>
                        {task.category}
                      </span>
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {task.estimatedMinutes && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.estimatedMinutes}m
                        </span>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {task.tags.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

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
      </div>

      {/* New Task Modal */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-lg shadow-xl max-w-2xl w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">New Task</h2>
              <button
                onClick={() => setShowNewTask(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <TaskInput onClose={() => setShowNewTask(false)} />
          </motion.div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
