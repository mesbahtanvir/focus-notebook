"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFocus, FocusSession } from "@/store/useFocus";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  Star,
  Home,
  RefreshCw,
  BarChart3,
  Zap
} from "lucide-react";

function FocusSessionSummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [session, setSession] = useState<FocusSession | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const sessions = useFocus((s) => s.sessions);
  const saveSessionFeedback = useFocus((s) => s.saveSessionFeedback);
  const clearCompletedSession = useFocus((s) => s.clearCompletedSession);

  useEffect(() => {
    if (sessionId) {
      const foundSession = sessions.find(s => s.id === sessionId);
      if (foundSession) {
        setSession(foundSession);
        if (foundSession.rating) setRating(foundSession.rating);
        if (foundSession.feedback) setFeedback(foundSession.feedback);
      }
    }
  }, [sessionId, sessions]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  const tasks = session.tasks || [];
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalTimeSpent = tasks.reduce((sum, task) => sum + (task.timeSpent || 0), 0);
  const totalTimeInMinutes = Math.floor(totalTimeSpent / 60);

  const sessionDuration = session.endTime && session.startTime
    ? Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000 / 60)
    : session.duration;

  const handleSaveFeedback = async () => {
    if (session && (rating > 0 || feedback.trim())) {
      await saveSessionFeedback(feedback, rating);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950/20 dark:to-blue-950/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Celebration Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex p-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-xl">
            <CheckCircle2 className="h-16 w-16 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
            Session Complete! 🎉
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Great work! Here&apos;s how your focus session went.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border-4 border-green-200 dark:border-green-800"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-xl">
                <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {completedTasks}/{totalTasks}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Tasks Completed</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border-4 border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {totalTimeInMinutes}m
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Time Focused</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border-4 border-purple-200 dark:border-purple-800"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
                <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {completionRate}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Task Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border-4 border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-purple-600" />
            Task Breakdown
          </h2>
          <div className="space-y-3">
            {tasks.map((focusTask, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-2 ${
                  focusTask.completed
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {focusTask.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-gray-300 rounded-full shrink-0" />
                    )}
                    <span className={focusTask.completed ? 'line-through text-gray-500' : ''}>
                      {focusTask.task.title}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {Math.floor((focusTask.timeSpent || 0) / 60)}m
                  </div>
                </div>
                {focusTask.notes && focusTask.notes.trim().length > 0 && (
                  <div className="mt-3 pl-8 pr-4 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div className="font-medium text-xs text-purple-600 dark:text-purple-400 mb-1">
                      Session notes:
                    </div>
                    <div className="whitespace-pre-wrap italic">
                      {focusTask.notes}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Feedback Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border-4 border-yellow-200 dark:border-yellow-800"
        >
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-600" />
            How was your focus?
          </h2>

          {/* Star Rating */}
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-10 w-10 ${
                    star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Feedback Text */}
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Any notes or reflections on this session? (optional)"
            className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 min-h-[100px] focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all"
          />

          <button
            onClick={handleSaveFeedback}
            disabled={rating === 0 && !feedback.trim()}
            className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Saved!
              </>
            ) : (
              'Save Feedback'
            )}
          </button>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <button
            onClick={() => {
              clearCompletedSession();
              router.push('/tools/focus');
            }}
            className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold shadow-lg transition-all transform hover:scale-105"
          >
            <RefreshCw className="h-5 w-5" />
            Start Another Session
          </button>

          <button
            onClick={() => router.push('/tools/focus?tab=history')}
            className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 font-bold shadow-lg transition-all transform hover:scale-105"
          >
            <Zap className="h-5 w-5" />
            View All Sessions
          </button>
        </motion.div>
      </div>
    </div>
  );
}

export default function FocusSessionSummaryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <FocusSessionSummaryContent />
    </Suspense>
  );
}
