"use client";

import { useState, useEffect, useRef } from "react";
import { useFocus } from '@/store/useFocus';
import { useTasks } from '@/store/useTasks';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pause, 
  Play, 
  X, 
  Check,
  Clock
} from "lucide-react";
import { FormattedNotes } from '@/lib/formatNotes';
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
  const updateTaskNotes = useFocus((s) => s.updateTaskNotes);
  const pauseSession = useFocus((s) => s.pauseSession);
  const resumeSession = useFocus((s) => s.resumeSession);
  const toggleTask = useTasks((s) => s.toggle);

  const [currentTime, setCurrentTime] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [localNotes, setLocalNotes] = useState("");
  const [autoSaving, setAutoSaving] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // Timer effect - uses elapsed time instead of interval ticks to work reliably in background
  useEffect(() => {
    if (!currentSession || !currentSession.isActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Initialize last update time
    lastUpdateRef.current = Date.now();

    // Start timer for current task
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastUpdateRef.current) / 1000);
      
      if (elapsed >= 1) {
        const currentTaskIndex = currentSession.currentTaskIndex;
        const currentTaskTime = currentSession.tasks[currentTaskIndex].timeSpent;
        const newTime = currentTaskTime + elapsed;
        
        updateTaskTime(currentTaskIndex, newTime);
        setCurrentTime(newTime);
        lastUpdateRef.current = now;
      }
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

  // Load notes for current task (only when task index changes, not on every session update)
  useEffect(() => {
    if (currentSession) {
      const currentTask = currentSession.tasks[currentSession.currentTaskIndex];
      setLocalNotes(currentTask.notes || "");
    }
    // Only depend on task index to prevent note clearing on other session updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.currentTaskIndex]);

  // Auto-save notes with debouncing
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (localNotes !== (currentSession?.tasks[currentSession.currentTaskIndex].notes || "")) {
      setAutoSaving(true);
      autoSaveTimeoutRef.current = setTimeout(() => {
        if (currentSession) {
          updateTaskNotes(currentSession.currentTaskIndex, localNotes);
          // Also save to actual task
          const currentFocusTask = currentSession.tasks[currentSession.currentTaskIndex];
          const taskId = currentFocusTask.task.id;
          const sessionNotes = localNotes.trim();
          
          if (sessionNotes) {
            const timestamp = new Date().toLocaleString();
            const updatedNotes = `**Focus Session Notes (${timestamp})**\n${sessionNotes}`;
            useTasks.getState().updateTask(taskId, { notes: updatedNotes });
          }
          setAutoSaving(false);
        }
      }, 1500); // Auto-save after 1.5 seconds of no typing
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [localNotes, currentSession, updateTaskNotes]);

  if (!currentSession) return null;

  const currentTaskIndex = currentSession.currentTaskIndex;
  const currentFocusTask = currentSession.tasks[currentTaskIndex];
  const totalTasks = currentSession.tasks.length;
  const completedTasks = currentSession.tasks.filter(t => t.completed).length;

  const handlePause = async () => {
    if (currentSession.isActive) {
      await pauseSession();
    } else {
      await resumeSession();
    }
  };

  const handleNext = async () => {
    if (currentTaskIndex < totalTasks - 1) {
      await switchToTask(currentTaskIndex + 1);
      setCurrentTime(currentSession.tasks[currentTaskIndex + 1].timeSpent);
    }
  };

  const handleMarkComplete = async () => {
    // Mark complete in focus session
    await markTaskComplete(currentTaskIndex);
    
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
    // Notes are auto-saved, just end session
    await endSession();
  };

  const progressPercentage = (completedTasks / totalTasks) * 100;

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
      {/* Minimal Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePause}
              className="w-9 h-9 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
              title={currentSession.isActive ? "Pause" : "Resume"}
            >
              {currentSession.isActive ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {completedTasks}/{totalTasks} completed
            </div>
          </div>

          <button
            onClick={handleEndSession}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            End Session
          </button>
        </div>
        
        {/* Thin Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            className="h-full bg-purple-600"
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Centered Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTaskIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Task Title & Meta */}
              <div className="text-center space-y-4">
                <h1 className={`text-3xl md:text-4xl font-bold ${
                  currentFocusTask.completed ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-white'
                }`}>
                  {currentFocusTask.task.title}
                </h1>
                
                <div className="flex items-center justify-center gap-3 text-sm">
                  {currentFocusTask.task.category && (
                    <span className="text-gray-600 dark:text-gray-400">
                      {currentFocusTask.task.category === 'mastery' ? '🧠' : '💝'} {currentFocusTask.task.category}
                    </span>
                  )}
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {currentFocusTask.task.priority}
                  </span>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
                  <Clock className="h-5 w-5" />
                  <span className="text-2xl font-mono font-bold">
                    {formatTimeGentle(currentFocusTask.timeSpent)}
                  </span>
                </div>
              </div>

              {/* Task Description */}
              {currentFocusTask.task.notes && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <FormattedNotes notes={currentFocusTask.task.notes} className="text-gray-700 dark:text-gray-300 text-sm" />
                </div>
              )}

              {/* Primary Actions */}
              <div className="flex gap-3">
                {!currentFocusTask.completed ? (
                  <button
                    onClick={handleMarkComplete}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    <Check className="h-5 w-5" />
                    Mark Complete
                  </button>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-lg font-semibold">
                    <Check className="h-5 w-5" />
                    Completed
                  </div>
                )}
                
                {currentTaskIndex < totalTasks - 1 && (
                  <button
                    onClick={handleNext}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium text-gray-700 dark:text-gray-300"
                  >
                    Next →
                  </button>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                  {autoSaving && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">Saving...</span>
                  )}
                </div>
                <textarea
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  placeholder="Take notes while you work..."
                  className="w-full h-48 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-purple-500 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/50 resize-none bg-white dark:bg-gray-800 text-sm transition-colors outline-none"
                />
              </div>

              {/* Task Dots Navigation */}
              <div className="flex items-center justify-center gap-2 pt-4">
                {currentSession.tasks.map((focusTask, index) => (
                  <button
                    key={index}
                    onClick={async () => {
                      await switchToTask(index);
                      setCurrentTime(focusTask.timeSpent);
                    }}
                    className={`transition-all ${
                      index === currentTaskIndex
                        ? 'w-8 h-3 bg-purple-600 rounded-full'
                        : focusTask.completed
                        ? 'w-3 h-3 bg-green-500 rounded-full'
                        : 'w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full hover:bg-gray-400 dark:hover:bg-gray-500'
                    }`}
                    title={`${index + 1}. ${focusTask.task.title}`}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
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
