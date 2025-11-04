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
  CheckCircle2
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950/30 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border-4 border-blue-200 dark:border-blue-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-900/50 dark:via-indigo-900/50 dark:to-purple-900/50 border-b-4 border-blue-200 dark:border-blue-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {task.done && (
              <div className="text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            )}
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Task Details</h2>
            {task.done && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 font-semibold">
                Completed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold shadow-lg transition-all flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold transition-all"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-2 text-sm rounded hover:bg-accent"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input w-full"
              />
            ) : (
              <h3 className={`text-lg ${task.done ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </h3>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Priority
            </label>
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
                <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} />
                <span>{capitalize(task.priority)}</span>
              </div>
            )}
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
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
                <span className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${
                  (task.category || 'mastery') === "mastery"
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
                    : "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-900"
                }`}>
                  {capitalize(task.category || 'mastery')}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
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
                <span className={`px-3 py-1 rounded-full text-sm font-medium border inline-block ${
                  task.status === 'active'
                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900"
                    : task.status === 'completed'
                    ? "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/40 dark:text-gray-300 dark:border-gray-900"
                    : "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900"
                }`}>
                  {capitalize(task.status)}
                </span>
              )}
            </div>
          </div>

          {/* Due Date & Estimated Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Date
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input w-full"
                />
              ) : task.dueDate ? (
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              ) : (
                <span className="text-muted-foreground">Not set</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Estimated Time (minutes)
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 0)}
                  className="input w-full"
                  min="0"
                />
              ) : task.estimatedMinutes ? (
                <span>{task.estimatedMinutes} minutes</span>
              ) : (
                <span className="text-muted-foreground">Not set</span>
              )}
            </div>
          </div>

          {/* Time Tracking - Show when there's actual time spent */}
          {!isEditing && (task.actualMinutes || task.estimatedMinutes) && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800 space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Clock className="h-4 w-4" />
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

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </label>
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
                    className="px-2 py-1 bg-accent rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">No tags</span>
            )}
          </div>

          {/* Linked Thought */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Linked Thought
            </label>
            {isEditing ? (
              <div className="space-y-2">
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
                {selectedThoughtId && (
                  <p className="text-xs text-muted-foreground">
                    This task will be linked to the selected thought
                  </p>
                )}
              </div>
            ) : linkedThought ? (
              <Link
                href={`/tools/thoughts?id=${linkedThought.id}`}
                className="block p-4 rounded-xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-pink-950/40 border-2 border-indigo-300 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-lg transition-all duration-200 group"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-md group-hover:scale-110 transition-transform">
                    <MessageCircle className="h-5 w-5 text-white" />
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
            ) : (
              <span className="text-muted-foreground">No linked thought</span>
            )}
          </div>

          {/* Linked Project */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Linked Project
            </label>
            {isEditing ? (
              <div className="space-y-2">
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
                {selectedProjectId && (
                  <p className="text-xs text-muted-foreground">
                    This task will be linked to the selected project
                  </p>
                )}
              </div>
            ) : linkedProject ? (
              <Link
                href={`/tools/projects/${linkedProject.id}`}
                className="block p-4 rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-cyan-950/40 border-2 border-emerald-300 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-lg transition-all duration-200 group"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-md group-hover:scale-110 transition-transform">
                    <Target className="h-5 w-5 text-white" />
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
            ) : (
              <span className="text-muted-foreground">No linked project</span>
            )}
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Recurrence
            </label>
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
                  <option value="biweekly">Bi-weekly (Every 2 weeks)</option>
                  <option value="monthly">Monthly</option>
                  <option value="bimonthly">Bi-monthly (Every 2 months)</option>
                  <option value="halfyearly">Half-yearly (Every 6 months)</option>
                  <option value="yearly">Yearly</option>
                </select>
                {recurrenceType !== 'none' && (
                  <div>
                    <input
                      type="number"
                      value={recurrenceFrequency}
                      onChange={(e) => setRecurrenceFrequency(parseInt(e.target.value) || 0)}
                      placeholder={`Times per ${
                        recurrenceType === 'weekly' ? 'week' :
                        recurrenceType === 'biweekly' ? 'two weeks' :
                        recurrenceType === 'monthly' ? 'month' :
                        recurrenceType === 'bimonthly' ? 'two months' :
                        recurrenceType === 'halfyearly' ? 'six months' :
                        recurrenceType === 'yearly' ? 'year' :
                        recurrenceType === 'workweek' ? 'work week' : 'day'
                      }`}
                      className="input w-full"
                      min="1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {recurrenceType === 'daily' && 'Leave blank for every day'}
                      {recurrenceType === 'workweek' && 'e.g., 5 for every workday (Mon-Fri)'}
                      {recurrenceType === 'weekly' && 'e.g., 4 for 4 times per week'}
                      {recurrenceType === 'biweekly' && 'Leave blank for every two weeks'}
                      {recurrenceType === 'monthly' && 'e.g., 3 for 3 times per month'}
                      {recurrenceType === 'bimonthly' && 'Leave blank for every two months'}
                      {recurrenceType === 'halfyearly' && 'Leave blank for every six months'}
                      {recurrenceType === 'yearly' && 'Leave blank for once per year'}
                    </p>
                  </div>
                )}
              </div>
            ) : task.recurrence && task.recurrence.type !== 'none' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-purple-600" />
                  <span className="font-semibold">{formatRecurrenceType(task.recurrence.type)}</span>
                </div>
                {task.recurrence.frequency && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Progress: </span>
                    <span className="font-bold text-purple-600">{task.completionCount || 0} / {task.recurrence.frequency}</span>
                    <span className="text-muted-foreground"> times</span>
                  </div>
                )}
                
                {/* Completion History */}
                {task.completionHistory && task.completionHistory.length > 0 && (
                  <div className="mt-3 p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800">
                    <h4 className="text-sm font-bold text-purple-800 dark:text-purple-200 mb-3 flex items-center gap-2">
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
              </div>
            ) : (
              <span className="text-muted-foreground">One-time task</span>
            )}
          </div>

          {/* Task Steps */}
          <div>
            <label className="block text-sm font-medium mb-3 flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Task Steps
            </label>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <TaskSteps
                steps={steps}
                onUpdate={setSteps}
                editable={isEditing || true}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Break down your task into smaller steps for easier execution
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Additional Notes</label>
            {isEditing ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes or description..."
                className="input w-full min-h-[120px]"
              />
            ) : notes ? (
              <FormattedNotes notes={notes} className="text-gray-700 dark:text-gray-300" />
            ) : (
              <p className="text-sm text-muted-foreground">No notes</p>
            )}
          </div>

          {/* Focus Session Notes History */}
          {!isEditing && taskFocusNotes.length > 0 && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
              <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Focus Session Notes ({taskFocusNotes.length})
              </h4>
              <div className="space-y-3">
                {taskFocusNotes.map((item, index) => (
                  <div key={item.sessionId} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-100 dark:border-purple-900">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                        Session on {item.sessionDate.toLocaleDateString(undefined, {
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

          {/* AI Generated Task Info */}
          {!isEditing && getMetadataFromNotes(task.notes) && (() => {
            const metadata = getMetadataFromNotes(task.notes);
            return (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
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
            );
          })()}

          {/* Metadata */}
          <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
            <div>
              Created: {task.createdAt && typeof task.createdAt === 'object' && 'toDate' in task.createdAt
                ? task.createdAt.toDate().toLocaleString()
                : task.createdAt
                  ? new Date(task.createdAt).toLocaleString()
                  : 'N/A'}
            </div>
            {task.completedAt && (
              <div>
                Completed: {typeof task.completedAt === 'object' && task.completedAt !== null && 'toDate' in task.completedAt
                  ? (task.completedAt as any).toDate().toLocaleString()
                  : new Date(task.completedAt).toLocaleString()}
              </div>
            )}
          </div>
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
  );
}
