"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTasks } from "@/store/useTasks";
import { useFocus, selectBalancedTasks } from "@/store/useFocus";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Zap, Clock, Target, History, Star, TrendingUp } from "lucide-react";
import { FocusSession } from "@/components/FocusSession";
import { FocusStatistics } from "@/components/FocusStatistics";
import { FocusSessionDetailModal } from "@/components/FocusSessionDetailModal";
import { FocusSession as FocusSessionType } from "@/store/useFocus";
import { formatDateTime } from "@/lib/formatDateTime";
import { useAuth } from "@/contexts/AuthContext";

function FocusPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tasks = useTasks((s) => s.tasks);
  const currentSession = useFocus((s) => s.currentSession);
  const completedSession = useFocus((s) => s.completedSession);
  const sessions = useFocus((s) => s.sessions);
  const startSession = useFocus((s) => s.startSession);
  const subscribe = useFocus((s) => s.subscribe);
  const loadActiveSession = useFocus((s) => s.loadActiveSession);
  
  // Get duration from URL or default to 60 minutes
  const urlDuration = searchParams.get('duration');
  const [duration, setDuration] = useState(urlDuration ? parseInt(urlDuration) : 60);
  const [showSetup, setShowSetup] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<FocusSessionType | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  const activeTasks = tasks.filter(t => !t.done && t.status === 'active' && (t.focusEligible === true || t.focusEligible === undefined));
  const autoSuggestedTasks = selectBalancedTasks(tasks, duration);

  // Initialize selected tasks with auto-suggested tasks
  useEffect(() => {
    if (autoSuggestedTasks.length > 0 && selectedTaskIds.length === 0) {
      setSelectedTaskIds(autoSuggestedTasks.map(t => t.id));
    }
  }, [autoSuggestedTasks, selectedTaskIds.length]);

  // Auto-start session if coming from Quick Focus (has duration param)
  useEffect(() => {
    const shouldAutoStart = urlDuration && autoSuggestedTasks.length > 0 && !currentSession && !hasActiveSession;
    
    if (shouldAutoStart && selectedTaskIds.length > 0) {
      const tasksToStart = tasks.filter(t => selectedTaskIds.includes(t.id));
      if (tasksToStart.length === 0) return;
      
      // Small delay to ensure UI is ready
      const timer = setTimeout(async () => {
        await startSession(tasksToStart, duration);
        setShowSetup(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlDuration, autoSuggestedTasks.length, currentSession, hasActiveSession, selectedTaskIds.length]);

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

  const handleStartSession = async () => {
    if (selectedTasks.length === 0) return;
    await startSession(selectedTasks, duration);
    setShowSetup(false);
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
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
      <AnimatePresence mode="wait">
        {showSetup && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
                Focus Session
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Deep work mode
              </p>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Left Column: Setup (1/3 width on desktop) */}
              <div className="lg:col-span-1 space-y-4">
                
                {/* Duration Selection */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    Duration
                  </label>
                  
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {[25, 50, 90, 120].map((min) => (
                      <button
                        key={min}
                        onClick={() => setDuration(min)}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          duration === min
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                        }`}
                      >
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{min}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">min</div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3">
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Custom</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                      min="15"
                      max="240"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
                      placeholder="Minutes"
                    />
                  </div>
                </div>

                {/* Start Button (Desktop - in sidebar) */}
                <button
                  onClick={handleStartSession}
                  disabled={selectedTasks.length === 0}
                  className="hidden lg:flex w-full items-center justify-center gap-2 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  <Play className="h-5 w-5" />
                  Start ({selectedTasks.length})
                </button>
              </div>

              {/* Right Column: Task Selection (2/3 width on desktop) */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-600" />
                    Tasks ({selectedTasks.length} selected)
                  </label>
                  {selectedTasks.length > 0 && (
                    <button
                      onClick={() => setSelectedTaskIds([])}
                      className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {activeTasks.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="text-4xl mb-2">📝</div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      No active tasks available
                    </p>
                    <p className="text-xs text-gray-500">Create some tasks first!</p>
                  </div>
                ) : (
                  <div className="max-h-[500px] lg:max-h-[600px] overflow-y-auto space-y-1.5 pr-1">
                    {activeTasks.map((task) => {
                      const isSelected = selectedTaskIds.includes(task.id);
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => toggleTaskSelection(task.id)}
                          className={`w-full flex items-center gap-2 p-2.5 rounded-lg transition-all text-left ${
                            isSelected
                              ? 'bg-purple-600 text-white border border-purple-600'
                              : 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white hover:border-purple-300 dark:hover:border-purple-600 border border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
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
                            <div className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                              {task.title}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : task.category === 'mastery'
                                  ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                  : 'bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300'
                              }`}
                            >
                              {task.category === 'mastery' ? '🧠' : '💝'} <span className="hidden sm:inline">{task.category || 'task'}</span>
                            </span>
                            {task.estimatedMinutes && (
                              <span className={`text-[10px] font-medium ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                {task.estimatedMinutes}m
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Start Button (Mobile/Tablet - bottom) */}
            <button
              onClick={handleStartSession}
              disabled={selectedTasks.length === 0}
              className="lg:hidden w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold transition-colors disabled:cursor-not-allowed"
            >
              <Play className="h-5 w-5" />
              Start Focus Session ({selectedTasks.length} tasks)
            </button>

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
                        <motion.button
                          key={session.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          onClick={() => setSelectedSession(session)}
                          className="w-full text-left p-4 rounded-lg bg-accent/50 dark:bg-gray-700/50 hover:bg-accent dark:hover:bg-gray-700 transition-colors space-y-2 cursor-pointer"
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
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Detail Modal */}
      {selectedSession && (
        <FocusSessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
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
