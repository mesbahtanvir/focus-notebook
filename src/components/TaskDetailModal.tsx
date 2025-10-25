"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTasks, Task, TaskCategory, TaskPriority, TaskStatus, RecurrenceType, TaskStep } from "@/store/useTasks";
import { useThoughts } from "@/store/useThoughts";
import { FormattedNotes } from "@/lib/formatNotes";
import { TaskSteps } from "@/components/TaskSteps";
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
  ExternalLink
} from "lucide-react";

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
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

  const updateTask = useTasks((s) => s.updateTask);
  const deleteTask = useTasks((s) => s.deleteTask);
  const toggleTask = useTasks((s) => s.toggle);

  const thoughts = useThoughts((s) => s.thoughts);
  const currentThoughtId = isEditing ? selectedThoughtId : getThoughtIdFromTask(task);
  const linkedThought = thoughts.find(t => t.id === currentThoughtId);

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
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(task.id);
      onClose();
    }
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggleTask(task.id)}
              className="h-5 w-5 rounded"
            />
            <h2 className="text-xl font-bold">Task Details</h2>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2 text-sm rounded hover:bg-accent"
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
                  onClick={handleDelete}
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
        <div className="p-6 space-y-6">
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
                <span>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
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
                  {(task.category || 'mastery').charAt(0).toUpperCase() + (task.category || 'mastery').slice(1)}
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
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
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
                className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-900 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-950/50 dark:hover:to-purple-950/50 transition-colors group"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                      From Thought
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {linkedThought.text}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ) : (
              <span className="text-muted-foreground">No linked thought</span>
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
                  <option value="monthly">Monthly</option>
                </select>
                {recurrenceType !== 'none' && (
                  <div>
                    <input
                      type="number"
                      value={recurrenceFrequency}
                      onChange={(e) => setRecurrenceFrequency(parseInt(e.target.value) || 0)}
                      placeholder={`Times per ${recurrenceType === 'weekly' ? 'week' : recurrenceType === 'monthly' ? 'month' : recurrenceType === 'workweek' ? 'work week' : 'day'}`}
                      className="input w-full"
                      min="1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {recurrenceType === 'daily' && 'Leave blank for every day'}
                      {recurrenceType === 'workweek' && 'e.g., 5 for every workday (Mon-Fri)'}
                      {recurrenceType === 'weekly' && 'e.g., 4 for 4 times per week'}
                      {recurrenceType === 'monthly' && 'e.g., 3 for 3 times per month'}
                    </p>
                  </div>
                )}
              </div>
            ) : task.recurrence && task.recurrence.type !== 'none' ? (
              <div className="space-y-2">
                <span className="capitalize">{task.recurrence.type}</span>
                {task.recurrence.frequency && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Progress: </span>
                    <span className="font-medium">{task.completionCount || 0} / {task.recurrence.frequency}</span>
                    <span className="text-muted-foreground"> times</span>
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
    </div>
  );
}
