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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <AnimatePresence mode="wait">
        {showSetup && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="text-center space-y-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg"
              >
                <Zap className="h-8 w-8" />
              </motion.div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Focus Session
              </h1>
              <p className="text-muted-foreground text-lg">
                Deep work mode with balanced task selection
              </p>
            </div>

            {/* Active Session Alert / New Session Prompt */}
            {hasActiveSession ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-4 border-amber-300 dark:border-amber-800 shadow-xl p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
                    <Play className="h-6 w-6 text-amber-600 dark:text-amber-400 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent mb-1">
                      ⚡ Session In Progress
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      You have an active focus session waiting for you. Resume where you left off!
                    </p>
                    <button
                      onClick={handleResumeSession}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                      <Play className="h-5 w-5" />
                      Resume Session
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-4 border-blue-200 dark:border-blue-800 shadow-xl p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                    <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent mb-1">
                      🚀 Ready to Focus?
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      No active session. Select your duration and tasks below to start a new focus session.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Duration Selection */}
            <div className="card p-8 space-y-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Clock className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                  Session Duration
                </label>
                <p className="text-sm text-muted-foreground">
                  How long do you want to focus?
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[30, 60, 90, 120].map((min) => (
                  <motion.button
                    key={min}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDuration(min)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      duration === min
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-foreground'
                        : 'border-border hover:border-purple-300 dark:hover:border-purple-600 text-foreground'
                    }`}
                  >
                    <div className="text-2xl font-bold">{min}</div>
                    <div className="text-xs text-muted-foreground">minutes</div>
                  </motion.button>
                ))}
              </div>

              {/* Custom Duration */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Duration</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                  min="15"
                  max="240"
                  className="input w-full"
                  placeholder="Enter duration in minutes"
                />
              </div>
            </div>

            {/* Task Selection */}
            <div className="card p-8 space-y-6 bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950/30 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-800">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  <Target className="h-6 w-6 text-purple-500 dark:text-purple-400" />
                  Select Tasks for Session
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  ✨ Auto-selected {autoSuggestedTasks.length} balanced tasks • Click to add/remove tasks
                </p>
              </div>

              {activeTasks.length === 0 ? (
                <div className="text-center py-12 space-y-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
                  <div className="text-6xl mb-2">📝</div>
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                    No active tasks available
                  </p>
                  <p className="text-sm text-gray-500">Create some tasks first!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {selectedTasks.length} selected
                    </span>
                    {selectedTasks.length > 0 && (
                      <button
                        onClick={() => setSelectedTaskIds([])}
                        className="text-xs font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto space-y-1.5 pr-1">
                    {activeTasks.map((task, index) => {
                      const isSelected = selectedTaskIds.includes(task.id);
                      return (
                        <motion.button
                          key={task.id}
                          type="button"
                          onClick={() => toggleTaskSelection(task.id)}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          className={`w-full flex items-center gap-2 p-2.5 rounded-lg transition-all ${
                            isSelected
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md border border-transparent'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:border-purple-300 dark:hover:border-purple-700 border border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                            isSelected 
                              ? 'bg-white' 
                              : 'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600'
                          }`}>
                            {isSelected && (
                              <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                              {task.title}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : task.category === 'mastery'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                  : 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                              }`}
                            >
                              {task.category?.[0] || 'T'}
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
                  </div>
                </div>
              )}
            </div>

            {/* Start Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartSession}
              disabled={selectedTasks.length === 0}
              className="w-full py-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg flex items-center justify-center gap-3 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl transition-all"
            >
              <Play className="h-6 w-6" />
              Start Focus Session ({selectedTasks.length} tasks)
            </motion.button>

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
                      const totalTime = session.tasks.reduce((sum, t) => sum + t.timeSpent, 0);
                      const completed = session.tasks.filter(t => t.completed).length;
                      const completionRate = (completed / session.tasks.length) * 100;
                      
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
                              {completed}/{session.tasks.length} tasks
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
