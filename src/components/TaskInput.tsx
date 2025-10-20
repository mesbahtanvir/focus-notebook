'use client'

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check } from 'lucide-react';
import { useTasks, TaskCategory, TaskPriority } from '@/store/useTasks';

type TaskDestination = 'today' | 'backlog';

interface TaskInputProps {
  onClose?: () => void;
}

export function TaskInput({ onClose }: TaskInputProps = {}) {
  const [taskName, setTaskName] = useState('');
  const [category, setCategory] = useState<TaskCategory>('mastery');
  const [destination, setDestination] = useState<TaskDestination>('today');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addTask = useTasks((state) => state.add);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskName.trim()) return;

    const tagArray = tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    // Add task with metadata
    addTask({
      title: taskName.trim(),
      category,
      priority,
      createdAt: new Date().toISOString(),
      dueDate: dueDate || (destination === 'today' ? new Date().toISOString().split('T')[0] : undefined),
      status: destination === 'today' ? 'active' : 'backlog',
      notes: notes.trim() || undefined,
      tags: tagArray.length > 0 ? tagArray : undefined,
      estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined,
    });

    // Show success feedback
    setShowSuccess(true);
    setTaskName('');
    setNotes('');
    setTags('');
    setEstimatedMinutes('');
    setDueDate('');
    
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
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="What do you want to accomplish?"
              className="input flex-1 pr-12"
              autoFocus
            />
            <button
              type="submit"
              disabled={!taskName.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes or description (optional)"
            className="input w-full min-h-[80px] text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <div className="inline-flex rounded-md shadow-sm w-full" role="group">
              <button
                type="button"
                onClick={() => setCategory('mastery')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-l-lg border ${
                  category === 'mastery'
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-background hover:bg-accent border-border'
                }`}
              >
                Mastery
              </button>
              <button
                type="button"
                onClick={() => setCategory('pleasure')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-r-lg border ${
                  category === 'pleasure'
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-background hover:bg-accent border-border'
                }`}
              >
                Pleasure
              </button>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium mb-2">Priority</label>
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
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Destination */}
          <div>
            <label className="block text-sm font-medium mb-2">Add to</label>
            <div className="inline-flex rounded-md shadow-sm w-full" role="group">
              <button
                type="button"
                onClick={() => setDestination('today')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-l-lg border ${
                  destination === 'today'
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-background hover:bg-accent border-border'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDestination('backlog')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-r-lg border ${
                  destination === 'backlog'
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-background hover:bg-accent border-border'
                }`}
              >
                Backlog
              </button>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Due Date (optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Estimated Time */}
          <div>
            <label className="block text-sm font-medium mb-2">Estimated Time (minutes)</label>
            <input
              type="number"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              placeholder="e.g., 30"
              className="input w-full"
              min="0"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., urgent, work"
              className="input w-full"
            />
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
