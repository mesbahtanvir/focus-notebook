"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTasks, Task, TaskCategory, TaskPriority, TaskStatus, RecurrenceType } from "@/store/useTasks";
import { FormattedNotes } from "@/lib/formatNotes";
import { SourceInfo } from "@/components/SourceBadge";
import { 
  X, 
  Calendar, 
  Clock, 
  Tag, 
  Trash2,
  Save,
  AlertCircle,
  Repeat
} from "lucide-react";

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || '');
  const [category, setCategory] = useState<TaskCategory>(task.category || 'mastery');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [estimatedMinutes, setEstimatedMinutes] = useState(task.estimatedMinutes || 0);
  const [tagsInput, setTagsInput] = useState(task.tags?.join(', ') || '');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(task.recurrence?.type || 'none');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(task.recurrence?.frequency || 0);

  const updateTask = useTasks((s) => s.updateTask);
  const deleteTask = useTasks((s) => s.deleteTask);
  const toggleTask = useTasks((s) => s.toggle);

  const handleSave = async () => {
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const recurrenceConfig = recurrenceType !== 'none' ? {
      type: recurrenceType,
      frequency: recurrenceFrequency || undefined,
    } : undefined;

    await updateTask(task.id, {
      title,
      notes,
      category,
      priority,
      status,
      dueDate: dueDate || undefined,
      estimatedMinutes: estimatedMinutes || undefined,
      tags: tags.length > 0 ? tags : undefined,
      recurrence: recurrenceConfig,
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
                <span className="capitalize">{task.priority}</span>
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
                <span className={`px-3 py-1 rounded-full text-sm font-medium border inline-block ${
                  (task.category || 'mastery') === "mastery"
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
                    : "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-900"
                }`}>
                  {task.category || 'mastery'}
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
                <span className="capitalize">{task.status}</span>
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

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            {isEditing ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes or description..."
                className="input w-full min-h-[120px]"
              />
            ) : task.notes ? (
              <FormattedNotes notes={task.notes} className="text-gray-700 dark:text-gray-300" />
            ) : (
              <p className="text-sm text-muted-foreground">No notes</p>
            )}
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
            <div>Created: {new Date(task.createdAt).toLocaleString()}</div>
            {task.completedAt && (
              <div>Completed: {new Date(task.completedAt).toLocaleString()}</div>
            )}
            {(task.source || task.lastModifiedSource) && (
              <div className="pt-2">
                <SourceInfo 
                  source={task.source} 
                  lastModifiedSource={task.lastModifiedSource}
                  layout="vertical"
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
