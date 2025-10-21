"use client";

import { FocusSession } from "@/store/useFocus";
import { motion } from "framer-motion";
import { X, Clock, TrendingUp, CheckCircle2, Star, BarChart3, FileText } from "lucide-react";
import { formatDateTime } from "@/lib/formatDateTime";

interface Props {
  session: FocusSession;
  onClose: () => void;
}

export function FocusSessionDetailModal({ session, onClose }: Props) {
  const totalTimeSpent = session.tasks.reduce((sum, t) => sum + t.timeSpent, 0);
  const completedTasks = session.tasks.filter(t => t.completed).length;
  const totalTasks = session.tasks.length;
  const completionRate = (completedTasks / totalTasks) * 100;

  // Calculate mastery vs pleasure ratio
  const masteryTime = session.tasks
    .filter(t => t.task.category === 'mastery')
    .reduce((sum, t) => sum + t.timeSpent, 0);
  const pleasureTime = session.tasks
    .filter(t => t.task.category === 'pleasure')
    .reduce((sum, t) => sum + t.timeSpent, 0);
  
  const masteryPercentage = totalTimeSpent > 0 ? (masteryTime / totalTimeSpent) * 100 : 0;
  const pleasurePercentage = totalTimeSpent > 0 ? (pleasureTime / totalTimeSpent) * 100 : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Focus Session Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDateTime(session.startTime)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatDuration(totalTimeSpent)}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Focus Time</div>
            </div>

            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{Math.round(completionRate)}%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Completion</div>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{completedTasks}/{totalTasks}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Tasks Done</div>
            </div>
          </div>

          {/* Rating */}
          {session.rating && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Session Rating</span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= session.rating!
                        ? 'fill-gray-800 text-gray-800 dark:fill-gray-200 dark:text-gray-200'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                ))}
                <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                  {session.rating}/5
                </span>
              </div>
            </div>
          )}

          {/* Work Balance */}
          {(masteryTime > 0 || pleasureTime > 0) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Work Balance</h3>
              </div>
              
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                {masteryPercentage > 0 && (
                  <div
                    style={{ width: `${masteryPercentage}%` }}
                    className="bg-blue-500"
                  />
                )}
                {pleasurePercentage > 0 && (
                  <div
                    style={{ width: `${pleasurePercentage}%` }}
                    className="bg-pink-500"
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-gray-600 dark:text-gray-400">Mastery</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatDuration(masteryTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-pink-500" />
                  <span className="text-gray-600 dark:text-gray-400">Pleasure</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatDuration(pleasureTime)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tasks */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Tasks
            </h3>
            <div className="space-y-2">
              {session.tasks.map((focusTask, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      {focusTask.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${focusTask.completed ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                          {focusTask.task.title}
                        </div>
                        {focusTask.notes && (
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                            {focusTask.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                      {formatDuration(focusTask.timeSpent)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback */}
          {session.feedback && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Session Feedback</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 italic">
                &quot;{session.feedback}&quot;
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
