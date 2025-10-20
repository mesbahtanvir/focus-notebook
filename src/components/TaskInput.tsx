'use client'

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, Repeat } from 'lucide-react';
import { useTasks, TaskCategory, TaskPriority, RecurrenceType } from '@/store/useTasks';

type TaskDestination = 'today' | 'backlog';

interface TaskInputProps {
  onClose?: () => void;
  onTaskCreated?: (taskId: string) => void;
}

export function TaskInput({ onClose, onTaskCreated }: TaskInputProps = {}) {
  const [taskName, setTaskName] = useState('');
  const [category, setCategory] = useState<TaskCategory>('mastery');
  const [destination, setDestination] = useState<TaskDestination>('today');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addTask = useTasks((state) => state.add);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskName.trim()) return;

    const tagArray = tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    // Prepare recurrence config
    const recurrenceConfig = recurrenceType !== 'none' ? {
      type: recurrenceType,
      frequency: recurrenceFrequency ? parseInt(recurrenceFrequency) : undefined,
    } : undefined;

    // Add task with metadata
    const taskId = await addTask({
      title: taskName.trim(),
      category,
      priority,
      createdAt: new Date().toISOString(),
      dueDate: dueDate || (destination === 'today' ? new Date().toISOString().split('T')[0] : undefined),
      status: destination === 'today' ? 'active' : 'backlog',
      notes: notes.trim() || undefined,
      tags: tagArray.length > 0 ? tagArray : undefined,
      estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined,
      recurrence: recurrenceConfig,
      completionCount: 0,
    });

    // Call onTaskCreated callback if provided
    if (onTaskCreated && taskId) {
      onTaskCreated(taskId);
    }

    // Show success feedback
    setShowSuccess(true);
    setTaskName('');
    setNotes('');
    setTags('');
    setEstimatedMinutes('');
    setDueDate('');
    setRecurrenceType('none');
    setRecurrenceFrequency('');
    
    // Reset form
    setTimeout(() => {
      setShowSuccess(false);
      if (onClose) {
        onClose();
      } else {
        inputRef.current?.focus();
      }
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <div className="flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="What do you want to accomplish? ✨"
              className="input flex-1 pr-12 text-lg font-medium border-2 focus:border-purple-500 dark:focus:border-purple-400"
              autoFocus
            />
            <button
              type="submit"
              disabled={!taskName.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
              aria-label="Add task"
            >
              <AnimatePresence mode="wait">
                {showSuccess ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="block"
                  >
                    <Check className="h-5 w-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="plus"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="block"
                  >
                    <Plus className="h-5 w-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">📝 Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes or description (optional)"
            className="input w-full min-h-[80px] text-sm bg-white dark:bg-gray-800"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category */}
          <div className="bg-gradient-to-br from-blue-50 to-pink-50 dark:from-blue-950/20 dark:to-pink-950/20 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800">
            <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">🎯 Category</label>
            <div className="inline-flex rounded-lg shadow-sm w-full" role="group">
              <button
                type="button"
                onClick={() => setCategory('mastery')}
                className={`flex-1 px-4 py-3 text-sm font-bold rounded-l-lg border-2 transition-all ${
                  category === 'mastery'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-500 shadow-lg scale-105'
                    : 'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 border-gray-300 dark:border-gray-600'
                }`}
              >
                🎯 Mastery
              </button>
              <button
                type="button"
                onClick={() => setCategory('pleasure')}
                className={`flex-1 px-4 py-3 text-sm font-bold rounded-r-lg border-2 transition-all ${
                  category === 'pleasure'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-500 shadow-lg scale-105'
                    : 'bg-white dark:bg-gray-800 hover:bg-pink-50 dark:hover:bg-pink-950/50 border-gray-300 dark:border-gray-600'
                }`}
              >
                🎨 Pleasure
              </button>
            </div>
          </div>

          {/* Priority */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 p-4 rounded-xl border-2 border-orange-200 dark:border-orange-800">
            <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">🔥 Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="input w-full text-sm font-medium border-2 focus:border-orange-500"
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🟠 High</option>
              <option value="urgent">🔴 Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Destination */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-800">
            <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">📅 Add to</label>
            <div className="inline-flex rounded-lg shadow-sm w-full" role="group">
              <button
                type="button"
                onClick={() => setDestination('today')}
                className={`flex-1 px-4 py-3 text-sm font-bold rounded-l-lg border-2 transition-all ${
                  destination === 'today'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-purple-500 shadow-lg scale-105'
                    : 'bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 border-gray-300 dark:border-gray-600'
                }`}
              >
                ☀️ Today
              </button>
              <button
                type="button"
                onClick={() => setDestination('backlog')}
                className={`flex-1 px-4 py-3 text-sm font-bold rounded-r-lg border-2 transition-all ${
                  destination === 'backlog'
                    ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white border-indigo-500 shadow-lg scale-105'
                    : 'bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border-gray-300 dark:border-gray-600'
                }`}
              >
                📋 Backlog
              </button>
            </div>
          </div>

          {/* Due Date */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 p-4 rounded-xl border-2 border-cyan-200 dark:border-cyan-800">
            <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">⏰ Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input w-full border-2 focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Estimated Time */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 p-4 rounded-xl border-2 border-teal-200 dark:border-teal-800">
            <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">⏱️ Estimated Time</label>
            <input
              type="number"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              placeholder="e.g., 30"
              className="input w-full border-2 focus:border-teal-500"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">In minutes</p>
          </div>

          {/* Tags */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 p-4 rounded-xl border-2 border-amber-200 dark:border-amber-800">
            <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">🏷️ Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., urgent, work"
              className="input w-full border-2 focus:border-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated</p>
          </div>
        </div>

        {/* Recurrence */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 p-4 rounded-xl border-2 border-violet-200 dark:border-violet-800">
          <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Repeat className="h-5 w-5 text-violet-500" />
            🔁 Recurrence
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
              className="input w-full border-2 focus:border-violet-500 font-medium"
            >
              <option value="none">⚡ One-time task</option>
              <option value="daily">📆 Daily</option>
              <option value="workweek">💼 Work Week</option>
              <option value="weekly">📅 Weekly</option>
              <option value="monthly">🗓️ Monthly</option>
            </select>
            {recurrenceType !== 'none' && (
              <div>
                <input
                  type="number"
                  value={recurrenceFrequency}
                  onChange={(e) => setRecurrenceFrequency(e.target.value)}
                  placeholder={`Times per ${recurrenceType === 'weekly' ? 'week' : recurrenceType === 'monthly' ? 'month' : recurrenceType === 'workweek' ? 'work week' : 'day'}`}
                  className="input w-full border-2 focus:border-violet-500"
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {recurrenceType === 'daily' && '💡 Leave blank for every day'}
                  {recurrenceType === 'workweek' && '💡 e.g., 5 for every workday (Mon-Fri)'}
                  {recurrenceType === 'weekly' && '💡 e.g., 4 for 4 times per week'}
                  {recurrenceType === 'monthly' && '💡 e.g., 3 for 3 times per month'}
                </p>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Success message */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-green-600 dark:text-green-400"
          >
            Task added to {destination}!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
