"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks, Task, TaskCategory, TaskPriority, TaskStatus, RecurrenceType, TaskStep } from "@/store/useTasks";
import { useThoughts } from "@/store/useThoughts";
import { useProjects } from "@/store/useProjects";
import { useFocus } from "@/store/useFocus";
import { FormattedNotes } from "@/lib/formatNotes";
import { TaskSteps } from "@/components/TaskSteps";
import { ConfirmModal } from "@/components/ConfirmModal";
import { TimeDisplay } from "@/components/TimeDisplay";
import { SessionHistory } from "@/components/SessionHistory";
import Link from "next/link";
import {
  X,
  Calendar,
  Clock,
  Tag,
  Trash2,
  Save,
  AlertCircle,
  Repeat,
  ListChecks,
  MessageCircle,
  ExternalLink,
  Target,
  Link2,
  CheckCircle2,
  FileText,
  Plus
} from "lucide-react";

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  // Helper function to capitalize first letter of each word
  const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Helper function to format recurrence type for display
  const formatRecurrenceType = (type: string): string => {
    if (type === 'workweek') return 'Work Week';
    if (type === 'biweekly') return 'Bi-weekly';
    if (type === 'bimonthly') return 'Bi-monthly';
    if (type === 'halfyearly') return 'Half-yearly';
    return capitalize(type);
  };

  // Helper functions to extract thoughtId and parse metadata from task notes
  const getMetadataFromNotes = (notes?: string): any => {
    if (!notes) return null;
    try {
      const parsed = JSON.parse(notes);
      // Check if it's metadata (has sourceThoughtId, createdBy, etc.)
      if (parsed.sourceThoughtId || parsed.createdBy === 'thought-processor') {
        return parsed;
      }
    } catch {
      // Not JSON, regular notes
    }
    return null;
  };

  const getThoughtIdFromTask = (task: Task): string => {
    // First check the thoughtId field
    if (task.thoughtId) {
      return task.thoughtId;
    }

    // Then check if it's in the notes as metadata
    const metadata = getMetadataFromNotes(task.notes);
    return metadata?.sourceThoughtId || '';
  };

  const getUserNotesFromTask = (task: Task): string => {
    // If notes contain metadata, return empty string (metadata shouldn't be edited)
    const metadata = getMetadataFromNotes(task.notes);
    if (metadata) {
      return metadata.userNotes || '';
    }
    // Otherwise return the notes as-is
    return task.notes || '';
  };

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(getUserNotesFromTask(task));
  const [category, setCategory] = useState<TaskCategory>(task.category || 'mastery');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [estimatedMinutes, setEstimatedMinutes] = useState(task.estimatedMinutes || 0);
  const [tagsInput, setTagsInput] = useState(task.tags?.join(', ') || '');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(task.recurrence?.type || 'none');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(task.recurrence?.frequency || 0);
  const [steps, setSteps] = useState<TaskStep[]>(task.steps || []);
  const [selectedThoughtId, setSelectedThoughtId] = useState<string>(getThoughtIdFromTask(task));
  const [selectedProjectId, setSelectedProjectId] = useState<string>(task.projectId || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { user } = useAuth();

  const updateTask = useTasks((s) => s.updateTask);
  const deleteTask = useTasks((s) => s.deleteTask);
  const toggleTask = useTasks((s) => s.toggle);

  const thoughts = useThoughts((s) => s.thoughts);
  const projects = useProjects((s) => s.projects);
  const subscribeProjects = useProjects((s) => s.subscribe);
  const subscribeThoughts = useThoughts((s) => s.subscribe);
  const currentThoughtId = isEditing ? selectedThoughtId : getThoughtIdFromTask(task);
  const linkedThought = thoughts.find(t => t.id === currentThoughtId);
  const linkedProject = projects.find(p => p.id === (isEditing ? selectedProjectId : task.projectId));

  const focusSessions = useFocus((s) => s.sessions);
  const subscribeFocus = useFocus((s) => s.subscribe);

  // Get focus sessions that contain notes for this task
  const taskFocusNotes = focusSessions
    .filter(session => {
      return session.tasks?.some(ft => ft.task.id === task.id && ft.notes);
    })
    .map(session => ({
      sessionDate: new Date(session.startTime),
      notes: session.tasks?.find(ft => ft.task.id === task.id)?.notes || '',
      sessionId: session.id,
    }))
    .filter(item => item.notes.trim().length > 0)
    .sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime()); // Most recent first

  // Subscribe to projects, thoughts, and focus sessions when modal opens
  useEffect(() => {
    if (user?.uid) {
      subscribeProjects(user.uid);
      subscribeThoughts(user.uid);
      subscribeFocus(user.uid);
    }
  }, [user?.uid, subscribeProjects, subscribeThoughts, subscribeFocus]);

  const handleSave = async () => {
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const recurrenceConfig = recurrenceType !== 'none' ? {
      type: recurrenceType,
      frequency: recurrenceFrequency || undefined,
    } : undefined;

    // Handle notes field carefully to preserve metadata if it exists
    let notesToSave: string | undefined;
    const existingMetadata = getMetadataFromNotes(task.notes);

    if (existingMetadata) {
      // If task has metadata, preserve it and add user notes
      notesToSave = JSON.stringify({
        ...existingMetadata,
        userNotes: notes || undefined,
        // Update sourceThoughtId if changed
        sourceThoughtId: selectedThoughtId || existingMetadata.sourceThoughtId,
      });
    } else {
      // No metadata, just save regular notes
      notesToSave = notes || undefined;
    }

    await updateTask(task.id, {
      title,
      notes: notesToSave,
      category,
      priority,
      status,
      dueDate: dueDate || undefined,
      estimatedMinutes: estimatedMinutes || undefined,
      tags: tags.length > 0 ? tags : undefined,
      recurrence: recurrenceConfig,
      steps: steps.length > 0 ? steps : undefined,
      thoughtId: selectedThoughtId || undefined,
      projectId: selectedProjectId || undefined,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative min-h-full flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border-2 border-purple-300 dark:border-purple-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-purple-100 via-indigo-100 to-blue-100 dark:from-purple-900/40 dark:via-indigo-900/40 dark:to-blue-900/40 border-b-2 border-purple-300 dark:border-purple-700 p-4 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-3">
              {task.done && (
                <div className="text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-6 w-6 drop-shadow-lg" />
                </div>
              )}
              {task.done && (
                <span className="text-sm px-3 py-1.5 rounded-full bg-green-500 text-white font-bold shadow-md">
                  ✨ Completed
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold transition-all flex items-center gap-2 shadow-md"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold transition-all"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-all shadow-md"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-md"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-all shadow-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* 1. Title - Prominent */}
          <div>
            {isEditing ? (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">📝 Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input w-full text-2xl font-bold"
                />
              </div>
            ) : (
              <h1 className="text-3xl font-bold leading-tight bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-400 dark:via-indigo-400 dark:to-blue-400 bg-clip-text text-transparent">
                {task.title}
              </h1>
            )}
          </div>

          {/* 2. Notes */}
          {(!isEditing && (notes || taskFocusNotes.length > 0)) || isEditing ? (
            <section className="border-t-2 border-dashed border-purple-200 dark:border-purple-800 pt-4">
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  📝 Notes
                </h3>
                {isEditing ? (
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes or description..."
                    className="input w-full min-h-[120px] resize-none"
                  />
                ) : notes ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <FormattedNotes notes={notes} className="text-gray-700 dark:text-gray-300" />
                  </div>
                ) : null}

                {/* Focus Session Notes */}
                {!isEditing && taskFocusNotes.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                      Focus Session Notes ({taskFocusNotes.length})
                    </h4>
                    <div className="space-y-2">
                      {taskFocusNotes.map((item) => (
                        <div key={item.sessionId} className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                              {item.sessionDate.toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {item.sessionDate.toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {item.notes}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {/* Create Subtask Button */}
          {!isEditing && (
            <section className="border-t-2 border-dashed border-purple-200 dark:border-purple-800 pt-4">
              <button
                onClick={() => {
                  const subtaskTitle = prompt("Enter subtask title:");
                  if (subtaskTitle && subtaskTitle.trim()) {
                    addTask({
                      title: `${task.title} → ${subtaskTitle.trim()}`,
                      priority: task.priority,
                      category: task.category,
                      status: 'active',
                      projectId: task.projectId,
                      thoughtId: task.thoughtId,
                      notes: `Subtask of: ${task.title}`,
                    });
                    onClose();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg font-semibold shadow-md transition-all"
              >
                <Plus className="h-5 w-5" />
                Create Subtask
              </button>
            </section>
          )}

          {/* 3. Task Steps */}
          {(!isEditing && steps.length > 0) || isEditing ? (
            <section className="border-t-2 border-dashed border-purple-200 dark:border-purple-800 pt-4">
              <h3 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                ✅ Task Steps
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <TaskSteps
                  steps={steps}
                  onUpdate={setSteps}
                  editable={isEditing || true}
                />
              </div>
            </section>
          ) : null}

          {/* 4. Time Tracking & Completion History */}
          {!isEditing && (task.actualMinutes || task.estimatedMinutes || (task.completionHistory && task.completionHistory.length > 0)) && (
            <section className="border-t-2 border-dashed border-purple-200 dark:border-purple-800 pt-4 space-y-4">
              <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-2">
                <Clock className="h-4 w-4" />
                📊 Progress & Statistics
              </h3>

              {/* Time Tracking */}
              {(task.actualMinutes || task.estimatedMinutes) && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 space-y-4">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Time Tracking
                  </h4>
                  <TimeDisplay
                    actual={task.actualMinutes}
                    estimated={task.estimatedMinutes}
                    variant="detailed"
                    showProgressBar={true}
                  />

                  {/* Session History */}
                  {task.actualMinutes && task.actualMinutes > 0 && (
                    <div className="pt-3 border-t border-blue-200 dark:border-blue-800">
                      <SessionHistory taskId={task.id} />
                    </div>
                  )}
                </div>
              )}

              {/* Completion History for Recurring Tasks */}
              {task.completionHistory && task.completionHistory.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                  <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Completion History ({task.completionHistory.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {task.completionHistory
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((completion, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {new Date(completion.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(completion.completedAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 5. Linked Items */}
          {(!isEditing && (linkedThought || linkedProject)) || isEditing ? (
            <section className="border-t-2 border-dashed border-purple-200 dark:border-purple-800 pt-4 space-y-4">
              <h3 className="text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase tracking-wide flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                🔗 Linked Items
              </h3>

              {/* Linked Thought */}
              <div>
                {isEditing ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Linked Thought</label>
                    <select
                      value={selectedThoughtId}
                      onChange={(e) => setSelectedThoughtId(e.target.value)}
                      className="input w-full"
                    >
                      <option value="">No linked thought</option>
                      {thoughts.map((thought) => (
                        <option key={thought.id} value={thought.id}>
                          {thought.text.length > 80 ? `${thought.text.slice(0, 80)}...` : thought.text}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : linkedThought ? (
                  <Link
                    href={`/tools/thoughts?id=${linkedThought.id}`}
                    className="block p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-lg transition-all duration-200 group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                        <MessageCircle className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                            From Thought
                          </span>
                          <ExternalLink className="h-3 w-3 text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-sm text-indigo-900 dark:text-indigo-100 line-clamp-3 leading-relaxed">
                          {linkedThought.text}
                        </p>
                      </div>
                    </div>
                  </Link>
                ) : null}
              </div>

              {/* Linked Project */}
              <div>
                {isEditing ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Linked Project</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="input w-full"
                    >
                      <option value="">No linked project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : linkedProject ? (
                  <Link
                    href={`/tools/projects/${linkedProject.id}`}
                    className="block p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-lg transition-all duration-200 group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                        <Target className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                            Project
                          </span>
                          <ExternalLink className="h-3 w-3 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-base font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                          {linkedProject.title}
                        </p>
                        {linkedProject.objective && (
                          <p className="text-sm text-emerald-800 dark:text-emerald-200 line-clamp-2">
                            {linkedProject.objective}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* 6. Other Details */}
          <section className="border-t-2 border-dashed border-purple-200 dark:border-purple-800 pt-4 space-y-4">
            <h3 className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide flex items-center gap-2">
              ⚙️ Task Details
            </h3>

            {/* Priority & Category Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">🚨 Priority</label>
                {isEditing ? (
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="input w-full"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${getPriorityColor(task.priority)} shadow-md`} />
                    <span className="text-sm font-bold">{capitalize(task.priority)}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">🎯 Category</label>
                {isEditing ? (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TaskCategory)}
                    className="input w-full"
                  >
                    <option value="mastery">Mastery</option>
                    <option value="pleasure">Pleasure</option>
                  </select>
                ) : (
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-bold inline-block shadow-sm ${
                    (task.category || 'mastery') === "mastery"
                      ? "bg-gradient-to-r from-blue-400 to-cyan-400 text-blue-900"
                      : "bg-gradient-to-r from-pink-400 to-rose-400 text-pink-900"
                  }`}>
                    {(task.category || 'mastery') === "mastery" ? "💪 Mastery" : "🎉 Pleasure"}
                  </span>
                )}
              </div>
            </div>

            {/* Status & Due Date Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">📍 Status</label>
                {isEditing ? (
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="input w-full"
                  >
                    <option value="active">Active</option>
                    <option value="backlog">Backlog</option>
                    <option value="completed">Completed</option>
                  </select>
                ) : (
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-bold inline-block shadow-sm ${
                    task.status === 'active'
                      ? "bg-gradient-to-r from-green-400 to-emerald-400 text-green-900"
                      : task.status === 'completed'
                      ? "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800"
                      : "bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900"
                  }`}>
                    {task.status === 'active' ? "🟢 Active" : task.status === 'completed' ? "✅ Completed" : "⏸️ Backlog"}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">📅 Due Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="input w-full"
                  />
                ) : task.dueDate ? (
                  <span className="text-sm font-semibold">{new Date(task.dueDate).toLocaleDateString()}</span>
                ) : (
                  <span className="text-sm text-gray-400 dark:text-gray-500">Not set</span>
                )}
              </div>
            </div>

            {/* Estimated Time */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">⏱️ Estimated Time</label>
              {isEditing ? (
                <input
                  type="number"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 0)}
                  className="input w-full"
                  min="0"
                  placeholder="Minutes"
                />
              ) : task.estimatedMinutes ? (
                <span className="text-sm font-semibold">{task.estimatedMinutes} minutes</span>
              ) : (
                <span className="text-sm text-gray-400 dark:text-gray-500">Not set</span>
              )}
            </div>

            {/* Recurrence */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">🔄 Recurrence</label>
              {isEditing ? (
                <div className="space-y-3">
                  <select
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                    className="input w-full"
                  >
                    <option value="none">One-time task</option>
                    <option value="daily">Daily</option>
                    <option value="workweek">Work Week</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="bimonthly">Bi-monthly</option>
                    <option value="halfyearly">Half-yearly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  {recurrenceType !== 'none' && (
                    <input
                      type="number"
                      value={recurrenceFrequency}
                      onChange={(e) => setRecurrenceFrequency(parseInt(e.target.value) || 0)}
                      placeholder="Frequency (optional)"
                      className="input w-full"
                      min="1"
                    />
                  )}
                </div>
              ) : task.recurrence && task.recurrence.type !== 'none' ? (
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">{formatRecurrenceType(task.recurrence.type)}</span>
                  {task.recurrence.frequency && (
                    <span className="text-sm text-gray-500">
                      ({task.completionCount || 0} / {task.recurrence.frequency})
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-gray-400 dark:text-gray-500">One-time task</span>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">🏷️ Tags</label>
              {isEditing ? (
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Enter tags separated by commas"
                  className="input w-full"
                />
              ) : task.tags && task.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-gradient-to-r from-purple-300 to-pink-300 dark:from-purple-700 dark:to-pink-700 rounded-full text-xs font-bold text-purple-900 dark:text-purple-100 shadow-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-400 dark:text-gray-500">No tags</span>
              )}
            </div>
          </section>

          {/* AI Generated Task Info */}
          {!isEditing && getMetadataFromNotes(task.notes) && (() => {
            const metadata = getMetadataFromNotes(task.notes);
            return (
              <section className="border-t border-gray-200 dark:border-gray-800 pt-6">
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    AI Generated Task
                  </h4>
                  <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    {metadata.aiReasoning && (
                      <div>
                        <span className="font-medium">AI Reasoning: </span>
                        <span>{metadata.aiReasoning}</span>
                      </div>
                    )}
                    {metadata.processedAt && (
                      <div className="text-xs text-blue-600 dark:text-blue-300">
                        Generated: {new Date(metadata.processedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })()}

          {/* Metadata - Timestamps */}
          <section className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <div>
                <span className="font-medium">Created:</span> {task.createdAt && typeof task.createdAt === 'object' && 'toDate' in task.createdAt
                  ? task.createdAt.toDate().toLocaleString()
                  : task.createdAt
                    ? new Date(task.createdAt).toLocaleString()
                    : 'N/A'}
              </div>
              {task.completedAt && (
                <div>
                  <span className="font-medium">Completed:</span> {typeof task.completedAt === 'object' && task.completedAt !== null && 'toDate' in task.completedAt
                    ? (task.completedAt as any).toDate().toLocaleString()
                    : new Date(task.completedAt).toLocaleString()}
                </div>
              )}
            </div>
          </section>
        </div>
        </motion.div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          title="Delete Task?"
          message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
          confirmText="Delete Task"
          cancelText="Cancel"
          variant="danger"
        />
      </div>
    </div>
  );
}
