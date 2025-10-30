"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFocus } from '@/store/useFocus';
import { useTasks } from '@/store/useTasks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pause,
  Play,
  X,
  Check,
  Clock,
  Plus
} from "lucide-react";
import { FormattedNotes } from '@/lib/formatNotes';
import { ConfirmModal } from "./ConfirmModal";
import { formatTimeGentle } from '@/lib/utils/date';
import { TimeTrackingService } from '@/services/TimeTrackingService';

export function FocusSession() {
  const router = useRouter();
  const currentSession = useFocus((s) => s.currentSession);
  const endSession = useFocus((s) => s.endSession);
  const switchToTask = useFocus((s) => s.switchToTask);
  const markTaskComplete = useFocus((s) => s.markTaskComplete);
  const updateTaskTime = useFocus ((s) => s.updateTaskTime);
  const updateTaskNotes = useFocus((s) => s.updateTaskNotes);
  const addFollowUpTask = useFocus((s) => s.addFollowUpTask);
  const pauseSession = useFocus((s) => s.pauseSession);
  const resumeSession = useFocus((s) => s.resumeSession);
  const toggleTask = useTasks((s) => s.toggle);
  const addTask = useTasks((s) => s.add);

  const [currentTime, setCurrentTime] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [localNotes, setLocalNotes] = useState("");
  const [autoSaving, setAutoSaving] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const hasPendingChangesRef = useRef<boolean>(false);

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
        // Redirect to summary page
        router.push(`/tools/focus/summary?sessionId=${currentSession.id}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentSession, endSession, router]);

  // Load notes for current task (only when task index changes, not on every session update)
  useEffect(() => {
    if (currentSession && !hasPendingChangesRef.current) {
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
      hasPendingChangesRef.current = true;
      setAutoSaving(true);
      autoSaveTimeoutRef.current = setTimeout(async () => {
        if (currentSession) {
          try {
            await updateTaskNotes(currentSession.currentTaskIndex, localNotes);
            // Also save to actual task
            const currentFocusTask = currentSession.tasks[currentSession.currentTaskIndex];
            const taskId = currentFocusTask.task.id;
            const sessionNotes = localNotes.trim();

            if (sessionNotes) {
              const timestamp = new Date().toLocaleString();
              const updatedNotes = `**Focus Session Notes (${timestamp})**\n${sessionNotes}`;
              await useTasks.getState().updateTask(taskId, { notes: updatedNotes });
            }
            hasPendingChangesRef.current = false;
            setAutoSaving(false);
          } catch (error) {
            console.error('Failed to save notes:', error);
            setAutoSaving(false);
            // Keep pending changes flag set on error so notes aren't overwritten
          }
        }
      }, 1500); // Auto-save after 1.5 seconds of no typing
    } else {
      hasPendingChangesRef.current = false;
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
    if (currentSession) {
      await endSession();
      // Redirect to summary page
      router.push(`/tools/focus/summary?sessionId=${currentSession.id}`);
    }
  };

  const handleCreateFollowUp = async () => {
    if (!followUpTitle.trim() || !currentSession) return;

    try {
      // Create a new task
      const newTask = await addTask({
        title: followUpTitle.trim(),
        category: currentFocusTask.task.category,
        priority: currentFocusTask.task.priority,
        status: 'active' as const,
        focusEligible: true,
      });

      // Link it as a follow-up task
      if (newTask?.id) {
        await addFollowUpTask(currentTaskIndex, newTask.id);
      }

      // Reset and close modal
      setFollowUpTitle("");
      setShowFollowUpModal(false);
    } catch (error) {
      console.error('Failed to create follow-up task:', error);
    }
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
                <div className="flex flex-col items-center gap-3">
                  {/* Current Session Timer */}
                  <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
                    <Clock className="h-5 w-5" />
                    <span className="text-2xl font-mono font-bold">
                      {formatTimeGentle(currentFocusTask.timeSpent)}
                    </span>
                  </div>

                  {/* Total Time Context */}
                  {(currentFocusTask.task.actualMinutes || currentFocusTask.task.estimatedMinutes) && (
                    <div className="flex flex-col items-center gap-1 text-xs">
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                        {currentFocusTask.task.actualMinutes && (
                          <span>
                            📊 Total: {TimeTrackingService.formatTime(currentFocusTask.task.actualMinutes + Math.floor(currentFocusTask.timeSpent / 60))}
                          </span>
                        )}
                        {currentFocusTask.task.estimatedMinutes && (
                          <span>
                            🎯 Est: {TimeTrackingService.formatTime(currentFocusTask.task.estimatedMinutes)}
                          </span>
                        )}
                      </div>
                      {currentFocusTask.task.estimatedMinutes && (
                        <div className="text-gray-500 dark:text-gray-500">
                          {(() => {
                            const totalMinutes = (currentFocusTask.task.actualMinutes || 0) + Math.floor(currentFocusTask.timeSpent / 60);
                            const efficiency = TimeTrackingService.calculateEfficiency(totalMinutes, currentFocusTask.task.estimatedMinutes);
                            const status = TimeTrackingService.getEfficiencyStatus(efficiency);

                            if (status === 'on-track') return '✨ Right on track!';
                            if (status === 'warning') return '⚠️ Slightly over estimate';
                            return '🔴 Over budget';
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Task Steps */}
              {currentFocusTask.task.steps && currentFocusTask.task.steps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Steps:</h3>
                  <div className="space-y-2">
                    {currentFocusTask.task.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                          step.completed
                            ? 'bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800'
                            : 'bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                          step.completed
                            ? 'bg-green-500 border-green-600 dark:bg-green-600 dark:border-green-500'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                        }`}>
                          {step.completed && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className={`flex-1 text-sm ${
                          step.completed
                            ? 'line-through text-gray-500 dark:text-gray-500'
                            : 'text-gray-800 dark:text-gray-200'
                        }`}>
                          {step.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Primary Actions */}
              <div className="space-y-3">
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

                {/* Follow-up Task Button */}
                <button
                  onClick={() => setShowFollowUpModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-indigo-300 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors text-indigo-600 dark:text-indigo-400 font-medium text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Create Follow-up Task
                </button>
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

      {/* Follow-up Task Modal */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Follow-up Task</h3>
                <button
                  onClick={() => {
                    setShowFollowUpModal(false);
                    setFollowUpTitle("");
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Task Title
                  </label>
                  <input
                    type="text"
                    value={followUpTitle}
                    onChange={(e) => setFollowUpTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateFollowUp();
                      }
                    }}
                    placeholder="e.g., Review notes from this session"
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 bg-white dark:bg-gray-800 outline-none transition-colors"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowFollowUpModal(false);
                      setFollowUpTitle("");
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateFollowUp}
                    disabled={!followUpTitle.trim()}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                  >
                    Create Task
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

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
