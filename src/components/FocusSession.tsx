"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Plus,
  ChevronLeft,
  ChevronRight
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
  const [isEndingSession, setIsEndingSession] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const hasPendingChangesRef = useRef<boolean>(false);
  const pendingNotesTaskIndexRef = useRef<number>(0);

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
      setIsEndingSession(true);
      const timer = setTimeout(async () => {
        await endSession();
        // Redirect to summary page
        router.push(`/tools/focus/summary?sessionId=${currentSession.id}`);
      }, 1500);
      return () => {
        clearTimeout(timer);
        setIsEndingSession(false);
      };
    }
  }, [currentSession, endSession, router]);

  // Load notes for current task (only when task index changes, not on every session update)
  useEffect(() => {
    if (currentSession) {
      // If there are pending changes, save them immediately before switching
      if (hasPendingChangesRef.current && autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
        // Save using the previously captured task index
        updateTaskNotes(pendingNotesTaskIndexRef.current, localNotes).catch(error => {
          console.error('Failed to save notes before task switch:', error);
        });
      }

      const currentTask = currentSession.tasks[currentSession.currentTaskIndex];
      setLocalNotes(currentTask.notes || "");
      // Reset pending changes flag since we're loading fresh notes for this task
      hasPendingChangesRef.current = false;
    }
    // Only depend on task index to prevent note clearing on other session updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.currentTaskIndex]);

  // Auto-save notes with debouncing
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (currentSession && localNotes !== (currentSession.tasks[currentSession.currentTaskIndex].notes || "")) {
      // Capture the task index when notes change to prevent race condition
      const taskIndexForTheseNotes = currentSession.currentTaskIndex;
      pendingNotesTaskIndexRef.current = taskIndexForTheseNotes;

      hasPendingChangesRef.current = true;
      setAutoSaving(true);
      autoSaveTimeoutRef.current = setTimeout(async () => {
        if (currentSession) {
          try {
            // Use the captured task index, not the current index
            await updateTaskNotes(pendingNotesTaskIndexRef.current, localNotes);

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

  // Swipe gesture handling for mobile
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!currentSession) return;

    const swipeThreshold = 75;
    const diff = touchStartX.current - touchEndX.current;
    const currentTaskIndex = currentSession.currentTaskIndex;
    const totalTasks = currentSession.tasks.length;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0 && currentTaskIndex < totalTasks - 1) {
        // Swipe left - next task
        switchToTask(currentTaskIndex + 1);
        setCurrentTime(currentSession.tasks[currentTaskIndex + 1].timeSpent);
      } else if (diff < 0 && currentTaskIndex > 0) {
        // Swipe right - previous task
        switchToTask(currentTaskIndex - 1);
        setCurrentTime(currentSession.tasks[currentTaskIndex - 1].timeSpent);
      }
    }
  }, [currentSession, switchToTask]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!currentSession) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in textarea
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      const currentTaskIndex = currentSession.currentTaskIndex;
      const totalTasks = currentSession.tasks.length;

      if (e.key === 'ArrowLeft' && currentTaskIndex > 0) {
        e.preventDefault();
        switchToTask(currentTaskIndex - 1);
        setCurrentTime(currentSession.tasks[currentTaskIndex - 1].timeSpent);
      } else if (e.key === 'ArrowRight' && currentTaskIndex < totalTasks - 1) {
        e.preventDefault();
        switchToTask(currentTaskIndex + 1);
        setCurrentTime(currentSession.tasks[currentTaskIndex + 1].timeSpent);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSession, switchToTask]);

  if (!currentSession) return null;

  const currentTaskIndex = currentSession.currentTaskIndex;
  const currentFocusTask = currentSession.tasks[currentTaskIndex];
  const totalTasks = currentSession.tasks.length;
  const completedTasks = currentSession.tasks.filter(t => t.completed).length;

  // Show completion screen while ending session
  if (isEndingSession) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 mx-auto"
          >
            <div className="w-full h-full rounded-full border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
              Session Complete!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Preparing your summary...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

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
      if (newTask) {
        await addFollowUpTask(currentTaskIndex, newTask);
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
      {/* Enhanced Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="w-full px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Pause/Resume + Progress indicator for mobile */}
            <div className="flex items-center gap-4">
              <button
                onClick={handlePause}
                className={`group relative w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                  currentSession.isActive
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 dark:shadow-purple-900/50'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
                title={currentSession.isActive ? "Pause Session" : "Resume Session"}
              >
                {currentSession.isActive ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
                {currentSession.isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-purple-400"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </button>

              {/* Mobile: Progress dots */}
              <div className="flex lg:hidden items-center gap-2">
                {currentSession.tasks.map((task, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      task.completed
                        ? 'bg-green-500'
                        : index === currentTaskIndex
                        ? 'bg-purple-600 w-6'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {completedTasks}/{totalTasks}
                </span>
              </div>
            </div>

            {/* Right: End Session */}
            <button
              onClick={handleEndSession}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-all shadow-lg shadow-red-200 dark:shadow-red-900/50 flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">End Session</span>
            </button>
          </div>
        </div>

        {/* Thin Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full">
          <div className="h-full flex">
            {/* Desktop: Task Navigation Sidebar */}
            <div className="hidden lg:block w-64 border-r border-gray-200 dark:border-gray-800 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
              <div className="p-4 space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Tasks ({completedTasks}/{totalTasks})
                </h3>
                {currentSession.tasks.map((focusTask, index) => (
                  <button
                    key={index}
                    onClick={async () => {
                      await switchToTask(index);
                      setCurrentTime(focusTask.timeSpent);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      index === currentTaskIndex
                        ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500 shadow-sm'
                        : focusTask.completed
                        ? 'bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-900 hover:border-green-300'
                        : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-1 flex-shrink-0">
                        {focusTask.completed ? (
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : index === currentTaskIndex ? (
                          <div className="h-4 w-4 rounded-full bg-purple-600 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          focusTask.completed
                            ? 'line-through text-gray-500 dark:text-gray-500'
                            : index === currentTaskIndex
                            ? 'text-purple-900 dark:text-purple-100'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {focusTask.task.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatTimeGentle(focusTask.timeSpent)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content Area with Swipe Support */}
            <div
              className="flex-1 overflow-y-auto"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTaskIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 sm:p-6 lg:p-8">
                    {/* Task Details Column */}
                    <div className="space-y-6">
                      {/* Mobile: Task Navigation Arrows */}
                      <div className="lg:hidden flex items-center justify-between">
                        <button
                          onClick={async () => {
                            if (currentTaskIndex > 0) {
                              await switchToTask(currentTaskIndex - 1);
                              setCurrentTime(currentSession.tasks[currentTaskIndex - 1].timeSpent);
                            }
                          }}
                          disabled={currentTaskIndex === 0}
                          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Task {currentTaskIndex + 1} of {totalTasks}
                        </div>
                        <button
                          onClick={async () => {
                            if (currentTaskIndex < totalTasks - 1) {
                              await switchToTask(currentTaskIndex + 1);
                              setCurrentTime(currentSession.tasks[currentTaskIndex + 1].timeSpent);
                            }
                          }}
                          disabled={currentTaskIndex === totalTasks - 1}
                          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Task Title */}
                      <div className="space-y-3">
                        <h1 className={`text-2xl md:text-3xl font-bold ${
                          currentFocusTask.completed
                            ? 'line-through text-gray-400 dark:text-gray-600'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {currentFocusTask.task.title}
                        </h1>

                        {/* Timer */}
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          <span className="text-2xl font-mono font-bold text-purple-600 dark:text-purple-400">
                            {formatTimeGentle(currentFocusTask.timeSpent)}
                          </span>
                        </div>

                        {/* Time Context */}
                        {(currentFocusTask.task.actualMinutes || currentFocusTask.task.estimatedMinutes) && (
                          <div className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-3">
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
                        {/* Follow-up Task Button */}
                        <button
                          onClick={() => setShowFollowUpModal(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-indigo-300 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors text-indigo-600 dark:text-indigo-400 font-medium text-sm"
                        >
                          <Plus className="h-4 w-4" />
                          Create Follow-up Task
                        </button>

                        <div className="flex gap-3">
                          {!currentFocusTask.completed ? (
                            <button
                              onClick={handleMarkComplete}
                              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors shadow-lg"
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
                              className="lg:hidden px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium text-gray-700 dark:text-gray-300"
                            >
                              Next →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notes Column */}
                    <div className="space-y-2 lg:sticky lg:top-4 lg:self-start">
                      {autoSaving && (
                        <div className="flex justify-end">
                          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-amber-600 dark:bg-amber-400 rounded-full animate-pulse" />
                            Saving...
                          </span>
                        </div>
                      )}
                      <textarea
                        value={localNotes}
                        onChange={(e) => setLocalNotes(e.target.value)}
                        placeholder="Session notes... (auto-saved per task)"
                        className="w-full h-[calc(100vh-16rem)] lg:h-[calc(100vh-12rem)] px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-purple-500 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/50 resize-none bg-white dark:bg-gray-800 text-sm transition-colors outline-none"
                      />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
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
