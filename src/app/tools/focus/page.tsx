"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTasks } from "@/store/useTasks";
import type { Task, TaskPriority } from "@/store/useTasks";
import { useProjects } from "@/store/useProjects";
import { useGoals } from "@/store/useGoals";
import { useFocus, selectBalancedTasks } from "@/store/useFocus";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Zap, Clock, Target, History, Star, TrendingUp, Brain, Rocket, Heart, Briefcase, X, Trash2, ArrowLeft, Eye, EyeOff, Search, Edit3 } from "lucide-react";
import { FocusSession } from "@/components/FocusSession";
import { FocusStatistics } from "@/components/FocusStatistics";
import { FocusSessionDetailModal } from "@/components/FocusSessionDetailModal";
import { FocusSession as FocusSessionType } from "@/store/useFocus";
import { formatDateTime } from "@/lib/formatDateTime";
import { useAuth } from "@/contexts/AuthContext";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { isWorkday, getDateString, isTaskCompletedToday } from "@/lib/utils/date";
import { isTaskRelevantForToday as determineTaskRelevanceForToday } from "./isTaskRelevantForToday";

const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function FocusPageContent() {
  useTrackToolUsage('focus');

  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tasks = useTasks((s) => s.tasks);
  const projects = useProjects((s) => s.projects);
  const goals = useGoals((s) => s.goals);
  const currentSession = useFocus((s) => s.currentSession);
  const completedSession = useFocus((s) => s.completedSession);
  const sessions = useFocus((s) => s.sessions);
  const startSession = useFocus((s) => s.startSession);
  const subscribe = useFocus((s) => s.subscribe);
  const subscribeProjects = useProjects((s) => s.subscribe);
  const subscribeGoals = useGoals((s) => s.subscribe);
  const loadActiveSession = useFocus((s) => s.loadActiveSession);
  const clearCompletedSession = useFocus((s) => s.clearCompletedSession);
  const deleteSession = useFocus((s) => s.deleteSession);

  // Get duration from URL or default to 60 minutes
  const urlDuration = searchParams.get('duration');
  const initialDuration = urlDuration ? parseInt(urlDuration) || 60 : 60;
  const [duration, setDuration] = useState(initialDuration);
  const [customDurationValue, setCustomDurationValue] = useState(String(initialDuration));
  const [isCustomDurationOpen, setIsCustomDurationOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<FocusSessionType | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [focusMode, setFocusMode] = useState<'regular' | 'philosopher' | 'beast' | 'selfcare'>('regular');
  const [showAlreadySelected, setShowAlreadySelected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter active tasks - ALL active tasks are candidates for focus selection
  const today = getDateString(new Date());
  const activeTasks = tasks.filter(t => {
    // Basic filter: active status only
    // Note: focusEligible is checked but undefined is treated as eligible (opt-out, not opt-in)
    if (t.status !== 'active' || t.focusEligible === false) {
      return false;
    }

    // Check if task is completed today (works for both recurring and non-recurring)
    if (isTaskCompletedToday(t)) {
      return false;
    }

    // Workweek tasks: only show on Mon-Fri
    if (t.recurrence?.type === 'workweek' && !isWorkday()) {
      return false;
    }

    return true;
  });

  const autoSuggestedTasks = selectBalancedTasks(tasks, duration);

  const projectMap = useMemo(() => {
    return new Map(projects.map(project => [project.id, project]));
  }, [projects]);

  const goalMap = useMemo(() => {
    return new Map(goals.map(goal => [goal.id, goal]));
  }, [goals]);

  const checkTaskRelevanceForToday = useCallback((task: Task) => {
    return determineTaskRelevanceForToday(task, today);
  }, [today]);

  const openCustomDuration = () => {
    setCustomDurationValue(String(duration));
    setIsCustomDurationOpen(true);
  };

  const parsedCustomDuration = parseInt(customDurationValue, 10);
  const isCustomDurationValid =
    !Number.isNaN(parsedCustomDuration) && parsedCustomDuration >= 15 && parsedCustomDuration <= 240;

  const applyCustomDuration = () => {
    if (!isCustomDurationValid) return;
    setDuration(parsedCustomDuration);
    setIsCustomDurationOpen(false);
  };

  const getDueDateScore = useCallback((dueDate?: string) => {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const dueStart = new Date(due);
    dueStart.setHours(0, 0, 0, 0);

    const diffDays = Math.round((dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 5;
    if (diffDays === 0) return 4;
    if (diffDays <= 2) return 3;
    if (diffDays <= 5) return 2;
    if (diffDays <= 7) return 1;
    return 0;
  }, []);

  const computeImportanceScore = useCallback((task: Task) => {
    const project = task.projectId ? projectMap.get(task.projectId) : undefined;
    const goalId = project?.goalId;
    const goal = goalId ? goalMap.get(goalId) : undefined;

    const taskPriorityScore = PRIORITY_WEIGHTS[task.priority] ?? 0;
    const projectPriorityScore = project ? (PRIORITY_WEIGHTS[project.priority] ?? 0) : 0;
    const goalPriorityScore = goal ? (PRIORITY_WEIGHTS[goal.priority] ?? 0) : 0;

    const dueDateScore = getDueDateScore(task.dueDate);

    return taskPriorityScore * 3 + projectPriorityScore * 2 + goalPriorityScore * 1.5 + dueDateScore;
  }, [goalMap, projectMap, getDueDateScore]);

  const shouldShowActiveTask = useCallback((task: Task) => {
    const isSelected = selectedTaskIds.includes(task.id);
    const isAutoSuggested = autoSuggestedTasks.some(t => t.id === task.id);
    const isRelevantToday = checkTaskRelevanceForToday(task);

    // Always show if task is selected or auto-suggested (handles initial render)
    if (isSelected || isAutoSuggested) {
      return true;
    }

    // If toggle is OFF (default): only show tasks relevant for today
    // If toggle is ON: show all tasks
    if (!showAlreadySelected && !isRelevantToday) {
      return false;
    }

    return true;
  }, [checkTaskRelevanceForToday, selectedTaskIds, showAlreadySelected, autoSuggestedTasks]);

  // Initialize selected tasks with auto-suggested tasks
  useEffect(() => {
    if (autoSuggestedTasks.length > 0 && selectedTaskIds.length === 0) {
      setSelectedTaskIds(autoSuggestedTasks.map(t => t.id));
    }
  }, [autoSuggestedTasks, selectedTaskIds.length]);

  // Quick Focus: Just auto-select tasks, don't auto-show confirmation modal
  // Users can manually click "Start Focus" when they're ready
  // This prevents the jarring immediate popup experience

  const checkForActiveSession = useCallback(async () => {
    // Check Firestore for active sessions (handled by useFocus store)
    // Note: Active session loading is now handled by FirestoreSubscriber
    setHasActiveSession(currentSession !== null);
  }, [currentSession]);

  // Subscribe to sessions and check for active session on mount
  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
    checkForActiveSession();
  }, [user?.uid, subscribe, checkForActiveSession]);

  useEffect(() => {
    if (user?.uid) {
      subscribeProjects(user.uid);
      subscribeGoals(user.uid);
    }
  }, [user?.uid, subscribeProjects, subscribeGoals]);

  const handleResumeSession = async () => {
    await loadActiveSession();
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));

  const visibleActiveTasks = activeTasks.filter(shouldShowActiveTask);

  const importanceScores = useMemo(() => {
    const scoreMap = new Map<string, number>();
    visibleActiveTasks.forEach(task => {
      scoreMap.set(task.id, computeImportanceScore(task));
    });
    return scoreMap;
  }, [visibleActiveTasks, computeImportanceScore]);

  const dailyStapleTasks = useMemo(() => {
    return activeTasks.filter(task =>
      task.recurrence?.type === 'daily' && checkTaskRelevanceForToday(task)
    );
  }, [activeTasks, checkTaskRelevanceForToday]);

  // Calculate hidden task count (tasks not relevant for today and not selected)
  const hiddenTaskCount = useMemo(() => {
    if (showAlreadySelected) return 0;
    return activeTasks.filter(task =>
      !shouldShowActiveTask(task) &&
      !selectedTaskIds.includes(task.id) &&
      !autoSuggestedTasks.some(t => t.id === task.id)
    ).length;
  }, [activeTasks, showAlreadySelected, shouldShowActiveTask, selectedTaskIds, autoSuggestedTasks]);

  // Sort tasks: selected first, then by priority (urgent → high → medium → low), then alphabetically
  const sortedVisibleTasks = useMemo(() => {
    // Filter by search query
    const searchFiltered = searchQuery.trim()
      ? visibleActiveTasks.filter(task =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : visibleActiveTasks;

    return [...searchFiltered].sort((a, b) => {
      const aSelected = selectedTaskIds.includes(a.id);
      const bSelected = selectedTaskIds.includes(b.id);

      // Selected tasks first
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      const aImportance = importanceScores.get(a.id) ?? 0;
      const bImportance = importanceScores.get(b.id) ?? 0;
      if (aImportance !== bImportance) return bImportance - aImportance;

      // Finally alphabetically by title
      return a.title.localeCompare(b.title);
    });
  }, [importanceScores, visibleActiveTasks, selectedTaskIds, searchQuery]);

  const handleStartSession = async () => {
    if (selectedTasks.length === 0) return;
    setShowConfirmModal(true);
  };

  const handleConfirmStart = async () => {
    if (selectedTasks.length === 0) return;
    setShowConfirmModal(false);
    await startSession(selectedTasks, duration);
    // Don't need to setShowSetup(false) - the component will automatically render FocusSession when currentSession exists
  };

  const selectModeTask = (mode: 'regular' | 'philosopher' | 'beast' | 'selfcare') => {
    setFocusMode(mode);
    let modeTasks: string[] = [];

    switch (mode) {
      case 'regular':
        // Balanced mix of mastery and pleasure
        modeTasks = selectBalancedTasks(tasks, duration).map(t => t.id);
        break;
      
      case 'philosopher':
        // Deep thinking: CBT, thoughts, notes, deep thought tasks
        modeTasks = activeTasks
          .filter(t => 
            t.title.toLowerCase().includes('think') ||
            t.title.toLowerCase().includes('reflect') ||
            t.title.toLowerCase().includes('journal') ||
            t.title.toLowerCase().includes('write') ||
            t.title.toLowerCase().includes('read') ||
            t.tags?.some(tag => ['thinking', 'reading', 'reflection', 'journal'].includes(tag.toLowerCase()))
          )
          .slice(0, Math.floor(duration / 20))
          .map(t => t.id);
        break;
      
      case 'beast':
        // High productivity: urgent and high priority mastery tasks
        modeTasks = activeTasks
          .filter(t => 
            t.category === 'mastery' &&
            (t.priority === 'urgent' || t.priority === 'high')
          )
          .sort((a, b) => {
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          })
          .slice(0, Math.floor(duration / 15))
          .map(t => t.id);
        break;
      
      case 'selfcare':
        // Wellness: pleasure tasks, low priority, self-care activities
        modeTasks = activeTasks
          .filter(t => 
            t.category === 'pleasure' ||
            t.title.toLowerCase().includes('relax') ||
            t.title.toLowerCase().includes('rest') ||
            t.title.toLowerCase().includes('exercise') ||
            t.title.toLowerCase().includes('hobby') ||
            t.tags?.some(tag => ['wellness', 'selfcare', 'hobby', 'fun'].includes(tag.toLowerCase()))
          )
          .slice(0, Math.floor(duration / 25))
          .map(t => t.id);
        break;
    }

    // If mode-specific selection is empty, fall back to balanced
    if (modeTasks.length === 0) {
      modeTasks = selectBalancedTasks(tasks, duration).map(t => t.id);
    }

    setSelectedTaskIds(modeTasks);
  };

  // Show statistics if session is completed
  if (completedSession) {
    return <FocusStatistics />;
  }

  // Show session if one is active
  if (currentSession) {
    return <FocusSession />;
  }

  return (
    <div className="w-full max-w-none px-4 py-4 md:py-8 pb-28">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-4"
        >
            {/* Header */}
            <div className="rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-4 border-purple-200 dark:border-purple-800 shadow-xl p-6 mb-6">
              <div className="flex items-start gap-3">
                {/* Back Button */}
                <button
                  onClick={() => router.back()}
                  className="group flex items-center justify-center p-2 rounded-xl bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg shrink-0"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5 text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors" />
                </button>

                {/* Title and Description */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
                    <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    Focus Session
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Deep work mode
                  </p>
                </div>
              </div>
            </div>

            {/* Active Session Alert */}
            {hasActiveSession && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Play className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-pulse" />
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-100">Session In Progress</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">Resume where you left off</p>
                  </div>
                </div>
                <button
                  onClick={handleResumeSession}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Resume
                </button>
              </div>
            )}

            {/* Two-Column Layout: Desktop | Stacked: Mobile/Tablet */}
            <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
              
              {/* Left Column: Setup (1/3 width on desktop) */}
              <div className="lg:col-span-1 space-y-4">
                {/* Focus Controls */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      Duration
                    </label>
                    <button
                      onClick={openCustomDuration}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Custom
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[25, 50, 90, 120].map((min) => (
                      <button
                        key={min}
                        onClick={() => setDuration(min)}
                        className={`p-2 rounded-lg border text-center text-sm font-semibold transition-all ${
                          duration === min
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-purple-300 dark:hover:border-purple-600'
                        }`}
                      >
                        {min}m
                      </button>
                    ))}
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-gray-700" />

                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2 mb-2">
                      <Target className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      Focus Mode
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => selectModeTask('regular')}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          focusMode === 'regular'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                        }`}
                      >
                        <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400 mb-1" />
                        <div className="text-xs font-bold text-gray-900 dark:text-white">Regular</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">Balanced</div>
                      </button>

                      <button
                        onClick={() => selectModeTask('philosopher')}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          focusMode === 'philosopher'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                        }`}
                      >
                        <Brain className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mb-1" />
                        <div className="text-xs font-bold text-gray-900 dark:text-white">Philosopher</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">Deep work</div>
                      </button>

                      <button
                        onClick={() => selectModeTask('beast')}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          focusMode === 'beast'
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/30 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600'
                        }`}
                      >
                        <Rocket className="h-4 w-4 text-red-600 dark:text-red-400 mb-1" />
                        <div className="text-xs font-bold text-gray-900 dark:text-white">Beast</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">High output</div>
                      </button>

                      <button
                        onClick={() => selectModeTask('selfcare')}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          focusMode === 'selfcare'
                            ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-600'
                        }`}
                      >
                        <Heart className="h-4 w-4 text-pink-600 dark:text-pink-400 mb-1" />
                        <div className="text-xs font-bold text-gray-900 dark:text-white">Self Care</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">Wellness</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Task Selection (2/3 width on desktop) */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Select Tasks ({selectedTasks.length} selected)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAlreadySelected(!showAlreadySelected)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all border ${
                        showAlreadySelected
                          ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
                          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500'
                      }`}
                      title={showAlreadySelected
                        ? "Show only today's tasks"
                        : `Show all tasks (${hiddenTaskCount} hidden)`
                      }
                    >
                      {showAlreadySelected ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      <span className="hidden sm:inline">{showAlreadySelected ? 'All Tasks' : "Today's Tasks"}</span>
                      <span className="sm:hidden">{showAlreadySelected ? 'All' : 'Today'}</span>
                      {!showAlreadySelected && hiddenTaskCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-xs font-semibold">
                          +{hiddenTaskCount}
                        </span>
                      )}
                    </button>
                    {selectedTasks.length > 0 && (
                      <button
                        onClick={() => setSelectedTaskIds([])}
                        className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 font-medium px-2"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                {/* Search Input */}
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tasks..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/50 outline-none transition-colors"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      >
                        <X className="h-3 w-3 text-gray-500" />
                      </button>
                    )}
                  </div>
                </div>

                {dailyStapleTasks.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <Star className="h-3.5 w-3.5 text-yellow-500" />
                      Daily staples
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dailyStapleTasks.map((task) => {
                        const isSelected = selectedTaskIds.includes(task.id);
                        return (
                          <button
                            key={task.id}
                            onClick={() => toggleTaskSelection(task.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-purple-400'
                            }`}
                          >
                            {task.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTasks.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="text-4xl mb-2">📝</div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      No active tasks available
                    </p>
                    <p className="text-xs text-gray-500">Create some tasks first!</p>
                  </div>
                ) : sortedVisibleTasks.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    {searchQuery ? (
                      <>
                        <div className="text-4xl mb-2">🔍</div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          No tasks found for &quot;{searchQuery}&quot;
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Try a different search term</p>
                      </>
                    ) : (
                      <>
                        <div className="text-4xl mb-2">✅</div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          All tasks for today are completed or not needed!
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Click <span className="font-semibold text-purple-600 dark:text-purple-400">&quot;All Tasks&quot;</span> button above to show all tasks.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="max-h-[55vh] lg:max-h-[60vh] xl:max-h-[70vh] overflow-y-auto pr-1">
                    <div className="grid gap-1.5 sm:grid-cols-2 2xl:grid-cols-3 auto-rows-fr">
                      <AnimatePresence mode="popLayout">
                        {sortedVisibleTasks.map((task) => {
                          const isSelected = selectedTaskIds.includes(task.id);
                          return (
                            <motion.button
                              key={task.id}
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{
                                layout: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 },
                                y: { duration: 0.2 }
                              }}
                              type="button"
                              onClick={() => toggleTaskSelection(task.id)}
                              className={`w-full h-full flex items-start gap-2 p-3 rounded-lg transition-colors text-left ${
                                isSelected
                                  ? 'bg-purple-600 text-white border border-purple-600 shadow-md'
                                  : 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white hover:border-purple-300 dark:hover:border-purple-600 border border-gray-200 dark:border-gray-700'
                              }`}
                            >
                            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isSelected 
                                ? 'bg-white' 
                                : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-semibold leading-snug ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                {task.title}
                              </div>
                              {task.dueDate && (
                                <div className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                  Due {new Date(task.dueDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : task.category === 'mastery'
                                    ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                    : 'bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300'
                                }`}
                              >
                                {task.category === 'mastery' ?  '🧠': '💝'} <span className="hidden sm:inline">{task.category || 'pleasure'}</span>
                              </span>
                              {task.estimatedMinutes && (
                                <span className={`text-[10px] font-medium ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {task.estimatedMinutes}m
                                </span>
                              )}
                            </div>
                            </motion.button>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Session History Button */}
            {sessions.length > 0 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowHistory(!showHistory)}
                className="w-full py-3 rounded-lg border-2 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 font-semibold flex items-center justify-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors"
              >
                <History className="h-5 w-5" />
                {showHistory ? 'Hide' : 'View'} Session History ({sessions.length})
              </motion.button>
            )}

            {/* Session History */}
            <AnimatePresence>
              {showHistory && sessions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="card p-6 space-y-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm overflow-hidden"
                >
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <History className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                    Previous Sessions
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sessions.slice(0, 10).map((session) => {
                      const totalTime = (session.tasks || []).reduce((sum, t) => sum + t.timeSpent, 0);
                      const completed = (session.tasks || []).filter(t => t.completed).length;
                      const completionRate = session.tasks?.length ? (completed / session.tasks.length) * 100 : 0;
                      
                      return (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start gap-2"
                        >
                          <button
                            onClick={() => setSelectedSession(session)}
                            className="flex-1 text-left p-4 rounded-lg bg-accent/50 dark:bg-gray-700/50 hover:bg-accent dark:hover:bg-gray-700 transition-colors space-y-2 cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {formatDateTime(session.startTime)}
                              </span>
                              {session.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-gray-700 text-gray-700 dark:fill-gray-300 dark:text-gray-300" />
                                  <span className="text-sm font-medium text-foreground">{session.rating}/5</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                                <span className="font-medium text-foreground">
                                  {Math.floor(totalTime / 60)}m
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
                                <span className="font-medium text-foreground">
                                  {Math.round(completionRate)}%
                                </span>
                              </div>
                              <span className="text-muted-foreground">
                                {completed}/{session.tasks?.length || 0} tasks
                              </span>
                            </div>
                            {session.feedback && (
                              <p className="text-sm text-muted-foreground italic line-clamp-2">
                                &quot;{session.feedback}&quot;
                              </p>
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(session.id);
                            }}
                            className="p-2 mt-4 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
                            title="Delete session"
                          >
                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-500" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
      </AnimatePresence>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Zap className="h-6 w-6" />
                  Start Focus Session?
                </h2>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <p className="text-white/80 text-sm mt-2">
                Review your selected tasks and mode before starting
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Session Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Duration</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{duration} min</div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Mode</div>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 capitalize flex items-center gap-2">
                    {focusMode === 'regular' && <><Briefcase className="h-5 w-5" /> Regular</>}
                    {focusMode === 'philosopher' && <><Brain className="h-5 w-5" /> Philosopher</>}
                    {focusMode === 'beast' && <><Rocket className="h-5 w-5" /> Beast</>}
                    {focusMode === 'selfcare' && <><Heart className="h-5 w-5" /> Self Care</>}
                  </div>
                </div>
              </div>

              {/* Selected Tasks */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                  Selected Tasks ({selectedTasks.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{task.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {task.category === 'mastery' ? '🎯 Mastery' : '🎉 Pleasure'}
                          {task.estimatedMinutes && ` • ${task.estimatedMinutes} min`}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleTaskSelection(task.id)}
                        className="ml-3 p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition"
                        title="Remove from session"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
                {selectedTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No tasks selected. Go back and select at least one task.
                  </div>
                )}
              </div>

              {/* Mode Description */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {focusMode === 'regular' && '💼 Balanced work session with a mix of mastery and pleasure tasks.'}
                  {focusMode === 'philosopher' && '🧠 Deep thinking session focused on reflection, reading, and intellectual work.'}
                  {focusMode === 'beast' && '🚀 High-intensity productivity session tackling urgent and high-priority tasks.'}
                  {focusMode === 'selfcare' && '💖 Wellness-focused session with relaxing and enjoyable activities.'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 p-6 rounded-b-2xl border-t flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-medium"
              >
                Back
              </button>
              <button
                onClick={handleConfirmStart}
                disabled={selectedTasks.length === 0}
                className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Play className="h-5 w-5" />
                Start Focus ({selectedTasks.length})
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <FocusSessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}

      {!currentSession && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <button
            onClick={handleStartSession}
            disabled={selectedTasks.length === 0}
            className={`w-full py-3 px-5 rounded-xl font-semibold text-base shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${
              selectedTasks.length === 0
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white'
                : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-700 text-white'
            }`}
            title={selectedTasks.length > 0 ? `Start Focus Session with ${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'}` : "Select tasks to start"}
          >
            <Play className="h-5 w-5" />
            <span>
              {selectedTasks.length === 0
                ? 'Select Tasks to Start'
                : `Start Focus (${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'})`
              }
            </span>
          </button>
        </div>
      )}

      <CustomDurationModal
        isOpen={isCustomDurationOpen}
        onClose={() => setIsCustomDurationOpen(false)}
        value={customDurationValue}
        onChange={setCustomDurationValue}
        onApply={applyCustomDuration}
        isValid={isCustomDurationValid}
      />
    </div>
  );
}


function CustomDurationModal({
  isOpen,
  onClose,
  value,
  onChange,
  onApply,
  isValid,
}: {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  isValid: boolean;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-gray-200 dark:border-gray-700"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Custom Duration
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close custom duration modal"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter a duration between 15 and 240 minutes.
            </p>
            <input
              type="number"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              min={15}
              max={240}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/50 outline-none transition-colors"
              placeholder="Minutes"
            />
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onApply}
                disabled={!isValid}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function FocusPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <FocusPageContent />
    </Suspense>
  );
}
