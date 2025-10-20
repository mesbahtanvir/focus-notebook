"use client";

import { useState, useEffect } from "react";
import { useTasks } from "@/store/useTasks";
import { useFocus, selectBalancedTasks } from "@/store/useFocus";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Zap, Clock, Target, History, Star, TrendingUp } from "lucide-react";
import { FocusSession } from "@/components/FocusSession";
import { FocusStatistics } from "@/components/FocusStatistics";

export default function FocusPage() {
  const tasks = useTasks((s) => s.tasks);
  const currentSession = useFocus((s) => s.currentSession);
  const completedSession = useFocus((s) => s.completedSession);
  const sessions = useFocus((s) => s.sessions);
  const startSession = useFocus((s) => s.startSession);
  const loadSessions = useFocus((s) => s.loadSessions);
  
  const [duration, setDuration] = useState(60); // default 60 minutes
  const [showSetup, setShowSetup] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const activeTasks = tasks.filter(t => !t.done && t.status === 'active');
  const suggestedTasks = selectBalancedTasks(tasks, duration);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleStartSession = () => {
    if (suggestedTasks.length === 0) return;
    startSession(suggestedTasks, duration);
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

            {/* Task Preview */}
            <div className="card p-8 space-y-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Target className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                  Selected Tasks
                </label>
                <p className="text-sm text-muted-foreground">
                  Balanced selection of {suggestedTasks.length} tasks for your session
                </p>
              </div>

              {activeTasks.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="text-4xl">📝</div>
                  <p className="text-muted-foreground">
                    No active tasks available. Create some tasks first!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestedTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 dark:bg-gray-700/50"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{task.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              task.category === 'mastery'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                : 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                            }`}
                          >
                            {task.category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' :
                              task.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300' :
                              'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Start Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartSession}
              disabled={suggestedTasks.length === 0}
              className="w-full py-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-lg flex items-center justify-center gap-3 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <Play className="h-6 w-6" />
              Start Focus Session
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
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-4 rounded-lg bg-accent/50 dark:bg-gray-700/50 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {new Date(session.startTime).toLocaleDateString()} at{' '}
                              {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {session.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
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
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
