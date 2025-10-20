"use client";

import { useState, useEffect, useRef } from "react";
import { useFocus } from "@/store/useFocus";
import { useTasks } from "@/store/useTasks";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Pause, 
  Play, 
  X, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Target
} from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";

// Gentle timer - only show minutes, not seconds
function formatTimeGentle(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  
  if (hours > 0) {
    if (remainingMins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMins}m`;
  }
  if (mins === 0) {
    return 'Starting...';
  }
  return `${mins}m`;
}

export function FocusSession() {
  const currentSession = useFocus((s) => s.currentSession);
  const endSession = useFocus((s) => s.endSession);
  const switchToTask = useFocus((s) => s.switchToTask);
  const markTaskComplete = useFocus((s) => s.markTaskComplete);
  const updateTaskTime = useFocus ((s) => s.updateTaskTime);
  const pauseSession = useFocus((s) => s.pauseSession);
  const resumeSession = useFocus((s) => s.resumeSession);
  const toggleTask = useTasks((s) => s.toggle);

  const [currentTime, setCurrentTime] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (!currentSession || !currentSession.isActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Start timer for current task
    timerRef.current = setInterval(() => {
      const currentTaskIndex = currentSession.currentTaskIndex;
      const currentTaskTime = currentSession.tasks[currentTaskIndex].timeSpent;
      const newTime = currentTaskTime + 1;
      
      updateTaskTime(currentTaskIndex, newTime);
      setCurrentTime(newTime);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentSession, updateTaskTime]);

  // Auto-end session when all tasks completed
  useEffect(() => {
    if (currentSession && currentSession.tasks.filter(t => t.completed).length === currentSession.tasks.length && currentSession.tasks.length > 0) {
      const timer = setTimeout(async () => {
        await endSession();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentSession, endSession]);

  if (!currentSession) return null;

  const currentTaskIndex = currentSession.currentTaskIndex;
  const currentFocusTask = currentSession.tasks[currentTaskIndex];
  const totalTasks = currentSession.tasks.length;
  const completedTasks = currentSession.tasks.filter(t => t.completed).length;

  const handlePause = () => {
    if (currentSession.isActive) {
      pauseSession();
    } else {
      resumeSession();
    }
  };

  const handlePrevious = () => {
    if (currentTaskIndex > 0) {
      switchToTask(currentTaskIndex - 1);
      setCurrentTime(currentSession.tasks[currentTaskIndex - 1].timeSpent);
    }
  };

  const handleNext = () => {
    if (currentTaskIndex < totalTasks - 1) {
      switchToTask(currentTaskIndex + 1);
      setCurrentTime(currentSession.tasks[currentTaskIndex + 1].timeSpent);
    }
  };

  const handleMarkComplete = async () => {
    // Mark complete in focus session
    markTaskComplete(currentTaskIndex);
    
    // Also mark in main task list
    await toggleTask(currentFocusTask.task.id);
    
    // Move to next task if available
    if (currentTaskIndex < totalTasks - 1) {
      setTimeout(() => handleNext(), 500);
    }
  };

  const handleEndSession = () => {
    setShowExitConfirm(true);
  };

  const confirmEndSession = async () => {
    setShowExitConfirm(false);
    await endSession();
  };

  const progressPercentage = (completedTasks / totalTasks) * 100;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/30 dark:to-gray-900 z-50 overflow-hidden">
      {/* Header with controls */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <button
            onClick={handlePause}
            className="p-3 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
          >
            {currentSession.isActive ? (
              <Pause className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            ) : (
              <Play className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            )}
          </button>
          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {currentSession.isActive ? 'Focus Mode Active' : 'Paused'}
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={handleEndSession}
          className="p-3 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
        >
          <X className="h-5 w-5 text-gray-700 dark:text-gray-200" />
        </motion.button>
      </div>

      {/* Progress bar */}
      <div className="absolute top-20 left-6 right-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {completedTasks} of {totalTasks} tasks completed
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="h-2 bg-white/60 dark:bg-gray-700/60 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
          />
        </div>
      </div>

      {/* Main content - Current Task */}
      <div className="flex items-center justify-center min-h-screen px-6 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTaskIndex}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="max-w-3xl w-full space-y-8"
          >
            {/* Task number indicator */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg"
              >
                <Target className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Task {currentTaskIndex + 1} of {totalTasks}
                </span>
              </motion.div>
            </div>

            {/* Task title */}
            <motion.h1
              className={`text-5xl md:text-6xl font-bold text-center leading-tight ${
                currentFocusTask.completed
                  ? 'line-through text-gray-400 dark:text-gray-500'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {currentFocusTask.task.title}
            </motion.h1>

            {/* Task details */}
            <div className="flex items-center justify-center gap-4">
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  currentFocusTask.task.category === 'mastery'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                }`}
              >
                {currentFocusTask.task.category}
              </span>
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  currentFocusTask.task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' :
                  currentFocusTask.task.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' :
                  currentFocusTask.task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300' :
                  'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                }`}
              >
                {currentFocusTask.task.priority}
              </span>
            </div>

            {/* Timer */}
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-center"
            >
              <div 
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl">
                <Clock className="h-6 w-6 text-purple-500 dark:text-purple-400" />
                <span className="text-4xl font-mono font-bold text-foreground">
                  {formatTimeGentle(currentFocusTask.timeSpent)}
                </span>
              </div>
            </motion.div>

            {/* Task notes if available */}
            {currentFocusTask.task.notes && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center max-w-2xl mx-auto"
              >
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {currentFocusTask.task.notes}
                </p>
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePrevious}
                disabled={currentTaskIndex === 0}
                className="p-4 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-6 w-6 text-gray-700 dark:text-gray-200" />
              </motion.button>

              {!currentFocusTask.completed && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleMarkComplete}
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold flex items-center gap-3 shadow-xl hover:from-green-600 hover:to-emerald-600"
                >
                  <Check className="h-6 w-6" />
                  Complete Task
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                disabled={currentTaskIndex === totalTasks - 1}
                className="p-4 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-6 w-6 text-gray-700 dark:text-gray-200" />
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Task list at bottom */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
          {currentSession.tasks.map((focusTask, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                switchToTask(index);
                setCurrentTime(focusTask.timeSpent);
              }}
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                index === currentTaskIndex
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-110 shadow-lg'
                  : focusTask.completed
                  ? 'bg-green-500 text-white'
                  : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700'
              }`}
            >
              {focusTask.completed ? (
                <Check className="h-5 w-5" />
              ) : (
                index + 1
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      <ConfirmModal
        isOpen={showExitConfirm}
        onConfirm={confirmEndSession}
        onCancel={() => setShowExitConfirm(false)}
        title="End Focus Session?"
        message="Are you sure you want to end this session? Your progress will be saved."
        confirmText="End Session"
        cancelText="Keep Going"
      />
    </div>
  );
}
