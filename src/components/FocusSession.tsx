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
  ChevronLeft, 
  ChevronRight,
  Clock,
  Target,
  FileText,
  Plus,
  ListPlus
} from "lucide-react";
import { FormattedNotes } from '@/lib/formatNotes';
import { ConfirmModal } from "./ConfirmModal";
import { TaskInput } from "./TaskInput";

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
  const addFollowUpTask = useFocus((s) => s.addFollowUpTask);
  const pauseSession = useFocus((s) => s.pauseSession);
  const resumeSession = useFocus((s) => s.resumeSession);
  const toggleTask = useTasks((s) => s.toggle);

  const [currentTime, setCurrentTime] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
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

  const handlePrevious = async () => {
    if (currentTaskIndex > 0) {
      await switchToTask(currentTaskIndex - 1);
      setCurrentTime(currentSession.tasks[currentTaskIndex - 1].timeSpent);
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


  const handleTaskCreated = (taskId: string) => {
    addFollowUpTask(currentTaskIndex, taskId);
    setShowCreateTask(false);
  };

  const progressPercentage = (completedTasks / totalTasks) * 100;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20 z-50 flex flex-col">
      {/* Minimal Header */}
      <div className="flex-shrink-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePause}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
              title={currentSession.isActive ? "Pause" : "Resume"}
            >
              {currentSession.isActive ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
            <div>
              <div className="text-xs text-muted-foreground">Task {currentTaskIndex + 1} of {totalTasks}</div>
              <div className="text-sm font-semibold">
                {completedTasks}/{totalTasks} completed
              </div>
            </div>
          </div>

          <button
            onClick={handleEndSession}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            End Session
          </button>
        </div>
        
        {/* Thin Progress bar */}
        <div className="h-0.5 bg-gray-100 dark:bg-gray-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            className="h-full bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500"
          />
        </div>
      </div>

      {/* Main Split View Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Task Info */}
            <div className="flex flex-col space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTaskIndex}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="card p-6 space-y-4 flex-1 overflow-y-auto"
                >
                  {/* Timer */}
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="h-4 w-4" />
                      <span>Task {currentTaskIndex + 1} of {totalTasks}</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                      <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-lg font-mono font-bold text-purple-600 dark:text-purple-400">
                        {formatTimeGentle(currentFocusTask.timeSpent)}
                      </span>
                    </div>
                  </div>

                  {/* Task Title */}
                  <div className="space-y-3">
                    <h1 className={`text-2xl lg:text-3xl font-bold leading-tight ${
                      currentFocusTask.completed ? 'line-through text-muted-foreground' : ''
                    }`}>
                      {currentFocusTask.task.title}
                    </h1>
                    <div className="flex items-center gap-2 flex-wrap">
                      {currentFocusTask.task.category && (
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                          currentFocusTask.task.category === 'mastery'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                        }`}>
                          {currentFocusTask.task.category}
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                        currentFocusTask.task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' :
                        currentFocusTask.task.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' :
                        currentFocusTask.task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300' :
                        'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                      }`}>
                        {currentFocusTask.task.priority}
                      </span>
                    </div>
                  </div>

                  {/* Task Description */}
                  {currentFocusTask.task.notes && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-2">
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Description</div>
                      <FormattedNotes notes={currentFocusTask.task.notes} className="text-gray-700 dark:text-gray-300" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 space-y-3">
                    {!currentFocusTask.completed ? (
                      <button
                        onClick={handleMarkComplete}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 font-semibold shadow-md transition-all"
                      >
                        <Check className="h-5 w-5" />
                        Mark Complete
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-lg font-semibold">
                        <Check className="h-5 w-5" />
                        Completed ✓
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handlePrevious}
                        disabled={currentTaskIndex === 0}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={currentTaskIndex === totalTasks - 1}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => setShowCreateTask(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm border-2 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 font-medium transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Create Follow-up Task
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Quick Task Switcher */}
              <div className="card p-4 max-h-48 overflow-y-auto">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">All Tasks</div>
                <div className="space-y-2">
                  {currentSession.tasks.map((focusTask, index) => (
                    <button
                      key={index}
                      onClick={async () => {
                        await switchToTask(index);
                        setCurrentTime(focusTask.timeSpent);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        index === currentTaskIndex
                          ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500'
                          : focusTask.completed
                          ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {focusTask.completed ? (
                          <Check className="h-3.5 w-3.5 flex-shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-current flex-shrink-0" />
                        )}
                        <span className="truncate">{index + 1}. {focusTask.task.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Notepad */}
            <div className="flex flex-col">
              <div className="card p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h2 className="text-lg font-bold">Session Notes</h2>
                  </div>
                  {autoSaving && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  )}
                </div>
                <textarea
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  placeholder="Take notes while you work...\n\n• Key findings\n• Ideas and insights\n• Next steps\n• Resources needed\n\nNotes auto-save as you type."
                  className="flex-1 w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-purple-500 dark:focus:border-purple-600 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 resize-none bg-gray-50 dark:bg-gray-800/50 font-mono text-sm leading-relaxed transition-colors"
                />
                <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    💡 Auto-saves to task notes every 1.5 seconds
                  </span>
                  <span>{localNotes.split(/\s+/).filter(w => w).length} words</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Follow-up Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-background rounded-lg shadow-xl max-w-2xl w-full my-8"
            >
              <div className="sticky top-0 bg-background rounded-t-lg border-b border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold">Create Follow-up Task</h2>
                  <button
                    onClick={() => setShowCreateTask(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Create a new task based on outcomes or next steps from &quot;{currentFocusTask.task.title}&quot;
                </p>
              </div>
              <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <TaskInput 
                  onClose={() => setShowCreateTask(false)}
                  onTaskCreated={handleTaskCreated}
                />
              </div>
            </motion.div>
          </div>
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
