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
  ChevronRight,
  GripVertical,
  Minimize2,
  Maximize2,
  Minimize
} from "lucide-react";
import { FormattedNotes } from '@/lib/formatNotes';
import { ConfirmModal } from "./ConfirmModal";
import { formatTimeGentle } from '@/lib/utils/date';
import { TimeTrackingService } from '@/services/TimeTrackingService';
import * as EntityService from '@/services/entityService';
import { UnifiedEndSession } from './UnifiedEndSession';
import RichTextEditor from "@/components/RichTextEditor";

type FocusStore = ReturnType<typeof useFocus.getState>;

// Panel state types
type PanelState = 'normal' | 'minimized' | 'maximized';

interface PanelLayout {
  left: PanelState;
  right: PanelState;
  leftWidth: number;
  rightWidth: number;
}

// Panel width constraints
const PANEL_CONSTRAINTS = {
  left: {
    min: 200,
    max: 400,
    default: 256,
    minimized: 48,
  },
  right: {
    min: 300,
    max: 600,
    default: 384,
    minimized: 48,
  },
  main: {
    min: 400,
  },
};

export function FocusSession() {
  const router = useRouter();
  const currentSession = useFocus((s) => s.currentSession);
  const sessions = useFocus((s) => s.sessions);
  const {
    endSession,
    switchToTask,
    markTaskComplete,
    updateTaskTime,
    updateTaskNotes,
    addFollowUpTask,
    pauseSession,
    resumeSession,
    reorderTasks,
  } = useFocus((s) => ({
    endSession: s.endSession,
    switchToTask: s.switchToTask,
    markTaskComplete: s.markTaskComplete,
    updateTaskTime: s.updateTaskTime,
    updateTaskNotes: s.updateTaskNotes,
    addFollowUpTask: s.addFollowUpTask,
    pauseSession: s.pauseSession,
    resumeSession: s.resumeSession,
    reorderTasks: s.reorderTasks,
  }));
  const toggleTask = useTasks((s) => s.toggle);

  const [isEndingSession, setIsEndingSession] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [completedSessionData, setCompletedSessionData] = useState<FocusSessionType | null>(null);

  const handleStartNewSession = useCallback(() => {
    setShowSummary(false);
    setCompletedSessionData(null);
    router.push('/tools/focus');
  }, [router]);

  const handleViewHistory = useCallback(() => {
    setShowSummary(false);
    setCompletedSessionData(null);
    router.push('/tools/focus?tab=history');
  }, [router]);

  if (isEndingSession || (showSummary && completedSessionData)) {
    return (
      <UnifiedEndSession
        isLoading={isEndingSession && !showSummary}
        showSummary={showSummary}
        completedSession={completedSessionData}
        onStartNewSession={handleStartNewSession}
        onViewHistory={handleViewHistory}
      />
    );
  }

  if (!currentSession) {
    return null;
  }

  return (
    <FocusSessionContent
      currentSession={currentSession}
      sessions={sessions}
      actions={{
        endSession,
        switchToTask,
        markTaskComplete,
        updateTaskTime,
        updateTaskNotes,
        addFollowUpTask,
        pauseSession,
        resumeSession,
        reorderTasks,
      }}
      toggleTask={toggleTask}
      setIsEndingSession={setIsEndingSession}
      setShowSummary={setShowSummary}
      setCompletedSessionData={setCompletedSessionData}
    />
  );
}

type FocusSessionContentProps = {
  currentSession: FocusSessionType;
  sessions: FocusSessionType[];
  actions: {
    endSession: FocusStore['endSession'];
    switchToTask: FocusStore['switchToTask'];
    markTaskComplete: FocusStore['markTaskComplete'];
    updateTaskTime: FocusStore['updateTaskTime'];
    updateTaskNotes: FocusStore['updateTaskNotes'];
    addFollowUpTask: FocusStore['addFollowUpTask'];
    pauseSession: FocusStore['pauseSession'];
    resumeSession: FocusStore['resumeSession'];
    reorderTasks: FocusStore['reorderTasks'];
  };
  toggleTask: ReturnType<typeof useTasks.getState>['toggle'];
  setIsEndingSession: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSummary: React.Dispatch<React.SetStateAction<boolean>>;
  setCompletedSessionData: React.Dispatch<React.SetStateAction<FocusSessionType | null>>;
};

function FocusSessionContent({
  currentSession,
  sessions,
  actions,
  toggleTask,
  setIsEndingSession,
  setShowSummary,
  setCompletedSessionData,
}: FocusSessionContentProps) {
  const {
    endSession,
    switchToTask,
    markTaskComplete,
    updateTaskTime,
    updateTaskNotes,
    addFollowUpTask,
    pauseSession,
    resumeSession,
    reorderTasks,
  } = actions;

  const [currentTime, setCurrentTime] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [localNotes, setLocalNotes] = useState("");
  const [autoSaving, setAutoSaving] = useState(false);
  const [followUpCreated, setFollowUpCreated] = useState(false);
  const [createdTaskTitle, setCreatedTaskTitle] = useState("");
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const hasPendingChangesRef = useRef<boolean>(false);
  const pendingNotesTaskIndexRef = useRef<number>(0);

  // Panel layout state
  const [panelLayout, setPanelLayout] = useState<PanelLayout>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('focusSession.panelLayout');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
    return {
      left: 'normal',
      right: 'normal',
      leftWidth: PANEL_CONSTRAINTS.left.default,
      rightWidth: PANEL_CONSTRAINTS.right.default,
    };
  });

  // Resize state
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  // Vertical resize state for notes sections
  const [isResizingVertical, setIsResizingVertical] = useState(false);
  const [previousNotesHeight, setPreviousNotesHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('focusSession.previousNotesHeight');
      if (saved) {
        return parseInt(saved, 10);
      }
    }
    return 200; // Default height in pixels
  });
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);
  // Save panel layout to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusSession.panelLayout', JSON.stringify(panelLayout));
    }
  }, [panelLayout]);

  // Save previous notes height to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusSession.previousNotesHeight', previousNotesHeight.toString());
    }
  }, [previousNotesHeight]);

  // Panel control handlers
  const handleMinimizeLeft = useCallback(() => {
    setPanelLayout(prev => ({
      ...prev,
      left: prev.left === 'minimized' ? 'normal' : 'minimized',
    }));
  }, []);

  const handleMinimizeRight = useCallback(() => {
    setPanelLayout(prev => ({
      ...prev,
      right: prev.right === 'minimized' ? 'normal' : 'minimized',
    }));
  }, []);

  const handleMaximizeRight = useCallback(() => {
    setPanelLayout(prev => {
      if (prev.right === 'maximized') {
        // Restore to normal
        return {
          ...prev,
          left: 'normal',
          right: 'normal',
        };
      } else {
        // Maximize right, minimize left
        return {
          ...prev,
          left: 'minimized',
          right: 'maximized',
        };
      }
    });
  }, []);

  // Resize handlers
  const handleResizeStart = useCallback((panel: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(panel);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = panel === 'left' ? panelLayout.leftWidth : panelLayout.rightWidth;
  }, [panelLayout]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const delta = e.clientX - resizeStartX.current;
    const newWidth = resizeStartWidth.current + (isResizing === 'left' ? delta : -delta);

    const constraints = isResizing === 'left' ? PANEL_CONSTRAINTS.left : PANEL_CONSTRAINTS.right;
    const clampedWidth = Math.max(constraints.min, Math.min(constraints.max, newWidth));

    // Snap to grid (8px)
    const snappedWidth = Math.round(clampedWidth / 8) * 8;

    setPanelLayout(prev => ({
      ...prev,
      [isResizing === 'left' ? 'leftWidth' : 'rightWidth']: snappedWidth,
    }));
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(null);
  }, []);

  // Vertical resize handlers for notes sections
  const handleVerticalResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingVertical(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = previousNotesHeight;
  }, [previousNotesHeight]);

  const handleVerticalResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingVertical) return;

    const delta = e.clientY - resizeStartY.current;
    const newHeight = resizeStartHeight.current + delta;

    // Min height: 100px, Max height: 600px
    const clampedHeight = Math.max(100, Math.min(600, newHeight));

    // Snap to grid (8px)
    const snappedHeight = Math.round(clampedHeight / 8) * 8;

    setPreviousNotesHeight(snappedHeight);
  }, [isResizingVertical]);

  const handleVerticalResizeEnd = useCallback(() => {
    setIsResizingVertical(false);
  }, []);

  // Resize mouse events
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Vertical resize mouse events
  useEffect(() => {
    if (isResizingVertical) {
      document.addEventListener('mousemove', handleVerticalResizeMove);
      document.addEventListener('mouseup', handleVerticalResizeEnd);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleVerticalResizeMove);
        document.removeEventListener('mouseup', handleVerticalResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizingVertical, handleVerticalResizeMove, handleVerticalResizeEnd]);

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
      // Only handle if not typing in textarea, input, or contentEditable elements (like RichTextEditor)
      if (e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLInputElement ||
          (e.target instanceof HTMLElement && e.target.isContentEditable)) {
        return;
      }

      const currentTaskIndex = currentSession.currentTaskIndex;
      const totalTasks = currentSession.tasks.length;

      // Task navigation
      if (e.key === 'ArrowLeft' && currentTaskIndex > 0) {
        e.preventDefault();
        switchToTask(currentTaskIndex - 1);
        setCurrentTime(currentSession.tasks[currentTaskIndex - 1].timeSpent);
      } else if (e.key === 'ArrowRight' && currentTaskIndex < totalTasks - 1) {
        e.preventDefault();
        switchToTask(currentTaskIndex + 1);
        setCurrentTime(currentSession.tasks[currentTaskIndex + 1].timeSpent);
      }
      // Panel controls
      else if (e.key === '[') {
        e.preventDefault();
        handleMinimizeLeft();
      } else if (e.key === ']') {
        e.preventDefault();
        handleMinimizeRight();
      } else if (e.key === '\\') {
        e.preventDefault();
        // Toggle distraction-free mode (both panels minimized)
        setPanelLayout(prev => {
          const bothMinimized = prev.left === 'minimized' && prev.right === 'minimized';
          return {
            ...prev,
            left: bothMinimized ? 'normal' : 'minimized',
            right: bothMinimized ? 'normal' : 'minimized',
          };
        });
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleMaximizeRight();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSession, switchToTask, handleMinimizeLeft, handleMinimizeRight, handleMaximizeRight]);

  const performEndSession = async () => {
    if (!currentSession) return;

    // Store the current session data before it's cleared
    const sessionToComplete = { ...currentSession };

    setIsEndingSession(true);

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
      // End session and save all data in background
      await endSession();

      // Show summary directly
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

  const handleMoveTask = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (!currentSession) return;
      if (fromIndex === toIndex) return;
      const maxIndex = currentSession.tasks.length;
      const targetIndex = Math.max(0, Math.min(maxIndex, toIndex));
      await reorderTasks(fromIndex, targetIndex);
    },
    [currentSession, reorderTasks]
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent, index: number) => {
      setDraggingIndex(index);
      setDragOverIndex(index);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    },
    []
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent, index: number) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (dragOverIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [dragOverIndex]
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent, index: number) => {
      event.preventDefault();
      if (draggingIndex === null) return;
      await handleMoveTask(draggingIndex, index);
      setDraggingIndex(null);
      setDragOverIndex(null);
    },
    [draggingIndex, handleMoveTask]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  }, []);

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
            <motion.div
              className="hidden lg:block border-r border-gray-200 dark:border-gray-800 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 flex-shrink-0"
              animate={{
                width: panelLayout.left === 'minimized'
                  ? PANEL_CONSTRAINTS.left.minimized
                  : panelLayout.leftWidth,
              }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {panelLayout.left === 'minimized' ? (
                // Minimized state - icon bar
                <div className="h-full flex flex-col items-center py-4 px-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 [writing-mode:vertical-lr] rotate-180 select-none mb-4">
                    TASKS
                  </span>
                  <button
                    onClick={handleMinimizeLeft}
                    className="mt-auto p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Expand Tasks Panel ([)"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              ) : (
                // Normal state - full panel
                <>
                  {/* Panel Header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Tasks ({completedTasks}/{totalTasks})
                    </h3>
                    <button
                      onClick={handleMinimizeLeft}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Minimize Tasks Panel ([)"
                    >
                      <Minimize2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>

                  {/* Panel Content */}
                  <div className="p-4 space-y-2">
                {currentSession.tasks.map((focusTask, index) => {
                  const isActive = index === currentTaskIndex;
                  const isDragOver = dragOverIndex === index && draggingIndex !== null && draggingIndex !== index;
                  const isDragging = draggingIndex === index;
                  return (
                    <div
                      key={focusTask.task.id}
                      className={`relative group rounded-lg ${isDragOver ? 'ring-2 ring-purple-400' : ''} ${isDragging ? 'opacity-70' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      onDragEnter={(e) => handleDragOver(e, index)}
                      onDragLeave={() => {
                        if (dragOverIndex === index) {
                          setDragOverIndex(null);
                        }
                      }}
                    >
                      <button
                        type="button"
                        onClick={async () => {
                          await switchToTask(index);
                          setCurrentTime(focusTask.timeSpent);
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          isActive
                            ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500 shadow-sm'
                            : focusTask.completed
                            ? 'bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-900 hover:border-green-300'
                            : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-1 flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium line-clamp-2 break-words ${
                              focusTask.completed
                                ? 'line-through text-gray-500 dark:text-gray-500'
                                : isActive
                                ? 'text-purple-900 dark:text-purple-100'
                                : 'text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            {focusTask.task.title}
                          </p>
                        </div>
                      </div>
                    </button>
                    </div>
                  );
                })}
                <div
                  className={`h-8 mt-2 rounded-lg border-2 border-dashed ${
                    dragOverIndex === currentSession.tasks.length && draggingIndex !== null ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/10' : 'border-transparent'
                  }`}
                  onDragOver={(e) => handleDragOver(e, currentSession.tasks.length)}
                  onDrop={(e) => handleDrop(e, currentSession.tasks.length)}
                  onDragLeave={() => {
                    if (dragOverIndex === currentSession.tasks.length) {
                      setDragOverIndex(null);
                    }
                  }}
                />
                  </div>
                </>
              )}
            </motion.div>

            {/* Left Resize Handle */}
            {panelLayout.left === 'normal' && (
              <div
                className="hidden lg:block w-1 hover:w-1.5 bg-gray-200 dark:bg-gray-800 hover:bg-purple-500 dark:hover:bg-purple-600 cursor-col-resize transition-all duration-150 relative group flex-shrink-0"
                onMouseDown={(e) => handleResizeStart('left', e)}
              >
                <div className="absolute inset-y-0 -left-8 w-16 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-xs text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    Drag to resize
                  </span>
                </div>
              </div>
            )}

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
                  <div className="h-full p-4 sm:p-6 lg:p-8">
                    {/* Task Details */}
                    <div className="space-y-6 max-w-4xl mx-auto lg:max-w-none lg:mx-0">
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
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <div dangerouslySetInnerHTML={{ __html: currentFocusTask.task.notes }} />
                            </div>
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
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right Resize Handle */}
            {panelLayout.right === 'normal' && (
              <div
                className="hidden lg:block w-1 hover:w-1.5 bg-gray-200 dark:bg-gray-800 hover:bg-purple-500 dark:hover:bg-purple-600 cursor-col-resize transition-all duration-150 relative group flex-shrink-0"
                onMouseDown={(e) => handleResizeStart('right', e)}
              >
                <div className="absolute inset-y-0 -right-8 w-16 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-xs text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    Drag to resize
                  </span>
                </div>
              </div>
            )}

            {/* Desktop: Notes Panel */}
            <motion.div
              className="hidden lg:block border-l border-gray-200 dark:border-gray-800 overflow-y-auto bg-white dark:bg-gray-900 flex-shrink-0"
              animate={{
                width: panelLayout.right === 'minimized'
                  ? PANEL_CONSTRAINTS.right.minimized
                  : panelLayout.right === 'maximized'
                  ? `calc(100vw - ${PANEL_CONSTRAINTS.left.minimized + PANEL_CONSTRAINTS.main.min}px)`
                  : panelLayout.rightWidth,
              }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {panelLayout.right === 'minimized' ? (
                // Minimized state - icon bar
                <div className="h-full flex flex-col items-center py-4 px-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 [writing-mode:vertical-lr] rotate-180 select-none mb-4">
                    NOTES
                  </span>
                  <button
                    onClick={handleMinimizeRight}
                    className="mt-auto p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Expand Notes Panel (])"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              ) : (
                // Normal or maximized state - full panel
                <>
                  {/* Panel Header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Notes
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleMinimizeRight}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Minimize Notes Panel (])"
                      >
                        <Minimize2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={handleMaximizeRight}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title={panelLayout.right === 'maximized' ? 'Restore Notes Panel' : 'Maximize Notes Panel (Ctrl+Shift+F)'}
                      >
                        {panelLayout.right === 'maximized' ? (
                          <Minimize className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <Maximize2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Panel Content */}
                  <div className="h-[calc(100vh-8rem)] flex flex-col p-4">
                      {/* Previous Sessions */}
                      {previousSessionNotes.length > 0 && (
                        <>
                          <div className="flex-shrink-0 space-y-2">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Previous Sessions
                            </h3>
                          </div>

                          {/* Previous Sessions Scrollable Area */}
                          <div
                            className="overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3 space-y-3 flex-shrink-0"
                            style={{ height: `${previousNotesHeight}px` }}
                          >
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
                                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                                  <div dangerouslySetInnerHTML={{ __html: session.notes }} />
                                </div>
                                {idx < previousSessionNotes.length - 1 && (
                                  <div className="mt-3 border-b border-gray-300 dark:border-gray-600" />
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Vertical Resize Handle */}
                          <div
                            className="h-1 hover:h-1.5 bg-gray-200 dark:bg-gray-800 hover:bg-purple-500 dark:hover:bg-purple-600 cursor-row-resize transition-all duration-150 relative group flex-shrink-0 my-2"
                            onMouseDown={handleVerticalResizeStart}
                          >
                            <div className="absolute inset-x-0 -top-8 h-16 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <span className="text-xs text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                Drag to resize sections
                              </span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Current Session */}
                      <div className="flex-1 flex flex-col space-y-2 min-h-0">
                        <div className="flex items-center justify-between flex-shrink-0">
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
                        <div className="flex-1 min-h-0">
                          <RichTextEditor
                            content={localNotes}
                            onChange={setLocalNotes}
                            placeholder="Session notes... (auto-saved per task)"
                            minHeight="h-full"
                          />
                        </div>
                      </div>
                  </div>
                </>
              )}
            </motion.div>
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
