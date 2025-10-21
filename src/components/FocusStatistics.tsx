"use client";

import { useState } from "react";
import { useFocus } from "@/store/useFocus";
import { motion } from "framer-motion";
import { Star, TrendingUp, Clock, CheckCircle2, BarChart3 } from "lucide-react";

export function FocusStatistics() {
  const completedSession = useFocus((s) => s.completedSession);
  const saveSessionFeedback = useFocus((s) => s.saveSessionFeedback);
  const clearCompletedSession = useFocus((s) => s.clearCompletedSession);
  
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  if (!completedSession) return null;

  const totalTimeSpent = completedSession.tasks.reduce((sum, t) => sum + t.timeSpent, 0);
  const completedTasks = completedSession.tasks.filter(t => t.completed).length;
  const totalTasks = completedSession.tasks.length;
  const completionRate = (completedTasks / totalTasks) * 100;

  // Calculate mastery vs pleasure ratio
  const masteryTime = completedSession.tasks
    .filter(t => t.task.category === 'mastery')
    .reduce((sum, t) => sum + t.timeSpent, 0);
  const pleasureTime = completedSession.tasks
    .filter(t => t.task.category === 'pleasure')
    .reduce((sum, t) => sum + t.timeSpent, 0);
  
  const masteryPercentage = totalTimeSpent > 0 ? (masteryTime / totalTimeSpent) * 100 : 50;
  const pleasurePercentage = totalTimeSpent > 0 ? (pleasureTime / totalTimeSpent) * 100 : 50;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins}m`;
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please provide a rating');
      return;
    }
    
    await saveSessionFeedback(feedback, rating);
    setSubmitted(true);
    
    // Close after a delay
    setTimeout(() => {
      clearCompletedSession();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/30 dark:to-gray-900 z-50 overflow-auto">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white"
            >
              <CheckCircle2 className="h-8 w-8" />
            </motion.div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Session Complete! 
            </h1>
            <p className="text-muted-foreground text-lg">
              Great work! Here&apos;s your session summary
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Time */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-6 text-center space-y-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
            >
              <Clock className="h-8 w-8 text-purple-500 dark:text-purple-400 mx-auto" />
              <div className="text-3xl font-bold text-foreground">{formatDuration(totalTimeSpent)}</div>
              <div className="text-sm text-muted-foreground">Total Focus Time</div>
            </motion.div>

            {/* Completion Rate */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6 text-center space-y-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
            >
              <TrendingUp className="h-8 w-8 text-green-500 dark:text-green-400 mx-auto" />
              <div className="text-3xl font-bold text-foreground">{Math.round(completionRate)}%</div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
            </motion.div>

            {/* Tasks Completed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6 text-center space-y-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
            >
              <CheckCircle2 className="h-8 w-8 text-blue-500 dark:text-blue-400 mx-auto" />
              <div className="text-3xl font-bold text-foreground">{completedTasks}/{totalTasks}</div>
              <div className="text-sm text-muted-foreground">Tasks Completed</div>
            </motion.div>
          </div>

          {/* Work Balance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-8 space-y-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-purple-500 dark:text-purple-400" />
              <h2 className="text-2xl font-bold text-foreground">Work Balance</h2>
            </div>
            
            {/* Balance Bar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-blue-600 dark:text-blue-400">Mastery {Math.round(masteryPercentage)}%</span>
                <span className="font-medium text-pink-600 dark:text-pink-400">Pleasure {Math.round(pleasurePercentage)}%</span>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${masteryPercentage}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="bg-gradient-to-r from-blue-500 to-blue-600"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pleasurePercentage}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="bg-gradient-to-r from-pink-500 to-pink-600"
                />
              </div>
            </div>

            {/* Time per category */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <div className="text-sm text-muted-foreground">Mastery Time</div>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatDuration(masteryTime)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Pleasure Time</div>
                <div className="text-xl font-bold text-pink-600 dark:text-pink-400">{formatDuration(pleasureTime)}</div>
              </div>
            </div>
          </motion.div>

          {/* Task Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card p-8 space-y-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          >
            <h2 className="text-2xl font-bold text-foreground">Task Breakdown</h2>
            <div className="space-y-3">
              {completedSession.tasks.map((focusTask, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-accent/50 dark:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {focusTask.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                    )}
                    <span className={`font-medium ${focusTask.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {focusTask.task.title}
                    </span>
                    {focusTask.task.category && (
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          focusTask.task.category === 'mastery'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                        }`}
                      >
                        {focusTask.task.category}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-mono text-muted-foreground">
                    {formatDuration(focusTask.timeSpent)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Feedback Form */}
          {!submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="card p-8 space-y-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
            >
              <h2 className="text-2xl font-bold text-foreground">How was your session?</h2>
              
              {/* Star Rating */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground">Rate your focus session</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-10 w-10 ${
                          star <= (hoveredRating || rating)
                            ? 'fill-gray-800 text-gray-800 dark:fill-gray-200 dark:text-gray-200'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Text */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground">
                  Share your thoughts (optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What worked well? What could be improved?"
                  className="input w-full min-h-[120px] bg-white dark:bg-gray-700 text-foreground"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  className="flex-1 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 shadow-lg"
                >
                  Submit Feedback
                </motion.button>
                <button
                  onClick={() => clearCompletedSession()}
                  className="px-6 py-3 rounded-lg border border-border hover:bg-accent text-foreground"
                >
                  Skip
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-8 text-center space-y-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
            >
              <CheckCircle2 className="h-16 w-16 text-green-500 dark:text-green-400 mx-auto" />
              <h3 className="text-2xl font-bold text-foreground">Thank you!</h3>
              <p className="text-muted-foreground">Your feedback has been saved.</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
