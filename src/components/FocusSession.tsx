"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFocus, FocusSession as FocusSessionType } from '@/store/useFocus';
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
import * as EntityService from '@/services/entityService';
import { EndSessionProgress, EndSessionStep, EndSessionStepStatus } from './EndSessionProgress';
import { SessionSummary } from './SessionSummary';

export function FocusSession() {
  const router = useRouter();
  const currentSession = useFocus((s) => s.currentSession);
  const sessions = useFocus((s) => s.sessions);
  const endSession = useFocus((s) => s.endSession);
  const switchToTask = useFocus((s) => s.switchToTask);
  const markTaskComplete = useFocus((s) => s.markTaskComplete);
  const updateTaskTime = useFocus ((s) => s.updateTaskTime);
  const updateTaskNotes = useFocus((s) => s.updateTaskNotes);
  const addFollowUpTask = useFocus((s) => s.addFollowUpTask);
  const pauseSession = useFocus((s) => s.pauseSession);
  const resumeSession = useFocus((s) => s.resumeSession);
  const toggleTask = useTasks((s) => s.toggle);

  const [currentTime, setCurrentTime] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [localNotes, setLocalNotes] = useState("");
  const [autoSaving, setAutoSaving] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [completedSessionData, setCompletedSessionData] = useState<FocusSessionType | null>(null);
  const [followUpCreated, setFollowUpCreated] = useState(false);
  const [createdTaskTitle, setCreatedTaskTitle] = useState("");
  const [progressSteps, setProgressSteps] = useState<EndSessionStepStatus[]>([]);
  const [currentProgressStep, setCurrentProgressStep] = useState<EndSessionStep>('saving-notes');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const hasPendingChangesRef = useRef<boolean>(false);
  const pendingNotesTaskIndexRef = useRef<number>(0);

  // Get previous session notes for the current task
  const previousSessionNotes = useMemo(() => {
    if (!currentSession) return [];

    const currentTaskId = currentSession.tasks[currentSession.currentTaskIndex].task.id;

    // Filter completed sessions that contain this task
    const relevantSessions = sessions
      .filter(session =>
        !session.isActive &&
        session.endTime &&
        session.id !== currentSession.id
      )
      .map(session => {
        const taskInSession = session.tasks.find(t => t.task.id === currentTaskId);
        if (taskInSession && taskInSession.notes && taskInSession.notes.trim()) {
          return {
            date: session.startTime,
            duration: taskInSession.timeSpent,
            notes: taskInSession.notes
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b!.date).getTime() - new Date(a!.date).getTime()); // Most recent first

    return relevantSessions as Array<{ date: string; duration: number; notes: string }>;
  }, [currentSession, sessions]);

  // Timer effect - calculates time from task switch timestamp to work reliably when browser is out of focus
  useEffect(() => {
    if (!currentSession || !currentSession.isActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const currentTaskIndex = currentSession.currentTaskIndex;
    const baseTimeSpent = currentSession.tasks[currentTaskIndex].timeSpent;

    // Initialize the timestamp when this task became active
    lastUpdateRef.current = Date.now();

    // Start timer that calculates elapsed time from when task became active
    timerRef.current = setInterval(() => {
      const now = Date.now();
      // Calculate elapsed time from when task became active (in seconds)
      const elapsedSinceTaskStart = Math.floor((now - lastUpdateRef.current) / 1000);

      // The new time is the base time spent when task started + elapsed time
      const newTime = baseTimeSpent + elapsedSinceTaskStart;

      // Update the time in store and local state
      updateTaskTime(currentTaskIndex, newTime);
      setCurrentTime(newTime);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
    // Only re-run when task index or active status changes, not on every session update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.currentTaskIndex, currentSession?.isActive]);

  // Auto-end session when all tasks completed
  useEffect(() => {
    if (currentSession && currentSession.tasks.filter(t => t.completed).length === currentSession.tasks.length && currentSession.tasks.length > 0) {
      const timer = setTimeout(async () => {
        await performEndSession();
      }, 1500);
      return () => {
        clearTimeout(timer);
        setIsEndingSession(false);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.tasks]);

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

  // Initialize progress steps
  const initializeProgressSteps = (): EndSessionStepStatus[] => {
    return [
      { step: 'saving-notes', status: 'pending' },
      { step: 'updating-session', status: 'pending' },
      { step: 'updating-tasks', status: 'pending' },
      { step: 'calculating-stats', status: 'pending' },
      { step: 'complete', status: 'pending' },
    ];
  };

  const handleProgressUpdate = (
    step: EndSessionStep,
    status: 'pending' | 'in-progress' | 'completed' | 'error',
    current?: number,
    total?: number,
    error?: string
  ) => {
    setCurrentProgressStep(step);
    setProgressSteps(prev => {
      const newSteps = [...prev];
      const stepIndex = newSteps.findIndex(s => s.step === step);
      if (stepIndex !== -1) {
        newSteps[stepIndex] = { step, status, current, total, error };
      }
      return newSteps;
    });
  };

  const performEndSession = async () => {
    if (!currentSession) return;

    // Store the current session data before it's cleared
    const sessionToComplete = { ...currentSession };

    setIsEndingSession(true);
    setProgressSteps(initializeProgressSteps());

    // Wait for any pending auto-save to complete
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      if (hasPendingChangesRef.current) {
        try {
          await updateTaskNotes(pendingNotesTaskIndexRef.current, localNotes);
          hasPendingChangesRef.current = false;
        } catch (error) {
          console.error('Failed to save final notes:', error);
        }
      }
    }

    try {
      const result = await endSession(undefined, undefined, handleProgressUpdate);

      // Brief delay to show completion state before transitioning
      await new Promise(resolve => setTimeout(resolve, 500));

      // Show summary instead of redirecting
      setCompletedSessionData({
        ...sessionToComplete,
        endTime: new Date().toISOString(),
        isActive: false,
      });
      setIsEndingSession(false);
      setShowSummary(true);
    } catch (error) {
      console.error('Failed to end session:', error);
      // On critical error, reset state
      setIsEndingSession(false);
    }
  };

  const handleRetryEndSession = async () => {
    // Retry only the failed parts
    await performEndSession();
  };

  const handleContinueAnyway = () => {
    // Continue to summary even with errors
    if (currentSession) {
      const sessionToComplete = { ...currentSession };
      setCompletedSessionData({
        ...sessionToComplete,
        endTime: new Date().toISOString(),
        isActive: false,
      });
      setIsEndingSession(false);
      setShowSummary(true);
    }
  };

  const handleStartNewSession = () => {
    setShowSummary(false);
    setCompletedSessionData(null);
    router.push('/tools/focus');
  };

  const handleViewHistory = () => {
    setShowSummary(false);
    setCompletedSessionData(null);
    router.push('/tools/focus?tab=history');
  };

  // Show end session flow (progress → summary) in a single seamless view
  if (isEndingSession || (showSummary && completedSessionData)) {
    return (
      <AnimatePresence mode="wait">
        {!showSummary ? (
          <motion.div
            key="progress"
            initial={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <EndSessionProgress
              currentStep={currentProgressStep}
              stepStatuses={progressSteps}
              onRetry={handleRetryEndSession}
              onContinue={handleContinueAnyway}
            />
          </motion.div>
        ) : (
          <motion.div
            key="summary"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <SessionSummary
              session={completedSessionData!}
              onStartNewSession={handleStartNewSession}
              onViewHistory={handleViewHistory}
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

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
    await performEndSession();
  };

  const handleCreateFollowUp = async () => {
    if (!followUpTitle.trim() || !currentSession) return;

    try {
      // Create a new task via EntityService for data consistency
      const result = await EntityService.createTask(
        {
          title: followUpTitle.trim(),
          category: currentFocusTask.task.category,
          priority: currentFocusTask.task.priority,
          status: 'active' as const,
          focusEligible: true,
          done: false,
        },
        {
          createdBy: 'user',
          // Create relationship with the current task
          sourceEntity: { type: 'task', id: currentFocusTask.task.id },
          relationshipType: 'linked-to', // Follow-up relationship
        }
      );

      // Link it as a follow-up task
      const newTask = result.data;
      if (newTask) {
        await addFollowUpTask(currentTaskIndex, newTask);
      }

      // Show success feedback
      setCreatedTaskTitle(followUpTitle.trim());
      setFollowUpCreated(true);

      // Reset and close modal
      setFollowUpTitle("");
      setShowFollowUpModal(false);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setFollowUpCreated(false);
      }, 3000);
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

                      {/* Description */}
                      {currentFocusTask.task.notes && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Description
                          </h3>
                          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                            <FormattedNotes notes={currentFocusTask.task.notes} />
                          </div>
                        </div>
                      )}

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

                        {/* Success Feedback */}
                        <AnimatePresence>
                          {followUpCreated && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="w-full flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm font-medium"
                            >
                              <Check className="h-4 w-4 flex-shrink-0" />
                              <span className="flex-1">
                                Follow-up task &quot;{createdTaskTitle}&quot; created successfully!
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>

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
                    <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                      {/* Previous Sessions */}
                      {previousSessionNotes.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Previous Sessions
                          </h3>
                          <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                            {previousSessionNotes.map((session, idx) => (
                              <div key={idx} className="text-sm">
                                <div className="flex items-center gap-2 mb-1 text-xs text-gray-600 dark:text-gray-400">
                                  <span className="font-semibold">
                                    Session {previousSessionNotes.length - idx}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {new Date(session.date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <span>•</span>
                                  <span>{formatTimeGentle(session.duration)}</span>
                                </div>
                                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  <FormattedNotes notes={session.notes} />
                                </div>
                                {idx < previousSessionNotes.length - 1 && (
                                  <div className="mt-3 border-b border-gray-300 dark:border-gray-600" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Current Session */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Current Session
                          </h3>
                          {autoSaving && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-amber-600 dark:bg-amber-400 rounded-full animate-pulse" />
                              Saving...
                            </span>
                          )}
                        </div>
                        <textarea
                          value={localNotes}
                          onChange={(e) => setLocalNotes(e.target.value)}
                          placeholder="Session notes... (auto-saved per task)"
                          className={`w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-purple-500 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/50 resize-none bg-white dark:bg-gray-800 text-sm transition-colors outline-none ${
                            previousSessionNotes.length > 0
                              ? 'h-[calc(100vh-32rem)] lg:h-[calc(100vh-28rem)]'
                              : 'h-[calc(100vh-16rem)] lg:h-[calc(100vh-12rem)]'
                          }`}
                        />
                      </div>
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
