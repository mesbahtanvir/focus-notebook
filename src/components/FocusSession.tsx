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
  Target,
  FileText,
  Plus,
  ListPlus
} from "lucide-react";
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
  const [showNotes, setShowNotes] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [localNotes, setLocalNotes] = useState("");
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

  // Load notes for current task
  useEffect(() => {
    if (currentSession) {
      const currentTask = currentSession.tasks[currentSession.currentTaskIndex];
      setLocalNotes(currentTask.notes || "");
    }
  }, [currentSession?.currentTaskIndex, currentSession]);

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
    // Save current notes before ending
    if (localNotes) {
      updateTaskNotes(currentTaskIndex, localNotes);
    }
    await endSession();
  };

  const handleSaveNotes = async () => {
    // Save to focus session
    updateTaskNotes(currentTaskIndex, localNotes);
    
    // Also save to the actual task
    const taskId = currentFocusTask.task.id;
    const currentTaskNotes = currentFocusTask.task.notes || '';
    const sessionNotes = localNotes.trim();
    
    if (sessionNotes) {
      // Append session notes to task notes with timestamp
      const timestamp = new Date().toLocaleString();
      const updatedNotes = currentTaskNotes 
        ? `${currentTaskNotes}\n\n---\n**Focus Session Notes (${timestamp})**\n${sessionNotes}`
        : `**Focus Session Notes (${timestamp})**\n${sessionNotes}`;
      
      await useTasks.getState().updateTask(taskId, { notes: updatedNotes });
    }
    
    setShowNotes(false);
  };

  const handleTaskCreated = (taskId: string) => {
    addFollowUpTask(currentTaskIndex, taskId);
    setShowCreateTask(false);
  };

  const progressPercentage = (completedTasks / totalTasks) * 100;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 z-50 overflow-auto">
      {/* Simplified Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePause}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {currentSession.isActive ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>
            <div>
              <div className="text-sm font-semibold">Focus Session</div>
              <div className="text-xs text-muted-foreground">
                {completedTasks}/{totalTasks} completed • {Math.round(progressPercentage)}%
              </div>
            </div>
          </div>

          <button
            onClick={handleEndSession}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
          >
            End Session
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
          />
        </div>
      </div>

      {/* Main content - Current Task */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Task Card */}
        <div className="card p-8 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTaskIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Task Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>Task {currentTaskIndex + 1} of {totalTasks}</span>
                  </div>
                  <h1 className={`text-3xl font-bold ${currentFocusTask.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {currentFocusTask.task.title}
                  </h1>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      currentFocusTask.task.category === 'mastery'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                    }`}>
                      {currentFocusTask.task.category}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      currentFocusTask.task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      currentFocusTask.task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      currentFocusTask.task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {currentFocusTask.task.priority}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-2xl font-mono font-bold">{formatTimeGentle(currentFocusTask.timeSpent)}</span>
                </div>
              </div>

              {/* Task Notes from original task */}
              {currentFocusTask.task.notes && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="text-sm font-medium mb-2">Task Description:</div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentFocusTask.task.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevious}
                  disabled={currentTaskIndex === 0}
                  className="btn-secondary disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                
                {!currentFocusTask.completed && (
                  <button
                    onClick={handleMarkComplete}
                    className="btn-primary flex-1"
                  >
                    <Check className="h-5 w-5" />
                    Complete Task
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  disabled={currentTaskIndex === totalTasks - 1}
                  className="btn-secondary disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Utility Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  {currentFocusTask.notes ? 'Edit Notes' : 'Add Notes'}
                </button>
                <button
                  onClick={() => setShowCreateTask(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors"
                >
                  <ListPlus className="h-4 w-4" />
                  Create Follow-up
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Task Navigation */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold mb-3">All Tasks</h3>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {currentSession.tasks.map((focusTask, index) => (
              <button
                key={index}
                onClick={() => {
                  switchToTask(index);
                  setCurrentTime(focusTask.timeSpent);
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  index === currentTaskIndex
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                    : focusTask.completed
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {focusTask.completed && <Check className="h-4 w-4 inline mr-1" />}
                {index + 1}. {focusTask.task.title.substring(0, 30)}{focusTask.task.title.length > 30 ? '...' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes Modal */}
      {showNotes && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-lg shadow-xl max-w-2xl w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Session Notes</h2>
              <button
                onClick={() => setShowNotes(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Document your findings, insights, or any information gathered while working on this task.
            </p>
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Add notes about this task..."
              className="input w-full min-h-[200px] resize-y"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowNotes(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleSaveNotes} className="btn-primary flex-1">
                <Check className="h-4 w-4" />
                Save Notes
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
