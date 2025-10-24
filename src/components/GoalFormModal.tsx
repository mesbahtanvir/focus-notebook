"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Target, Save, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Goal, GoalTimeframe } from "@/store/useGoals";

interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    objective: string;
    timeframe: GoalTimeframe;
    priority: 'urgent' | 'high' | 'medium' | 'low';
  }) => void;
  editingGoal?: Goal | null;
}

export function GoalFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingGoal,
}: GoalFormModalProps) {
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [timeframe, setTimeframe] = useState<GoalTimeframe>('short-term');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');

  // Update form when editing goal changes
  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setObjective(editingGoal.objective);
      setTimeframe(editingGoal.timeframe || 'short-term');
      setPriority(editingGoal.priority);
    } else {
      setTitle("");
      setObjective("");
      setTimeframe('short-term');
      setPriority('medium');
    }
  }, [editingGoal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !objective.trim()) return;

    onSubmit({
      title: title.trim(),
      objective: objective.trim(),
      timeframe,
      priority,
    });

    // Reset form
    setTitle("");
    setObjective("");
    setTimeframe('short-term');
    setPriority('medium');
  };

  const handleClose = () => {
    setTitle("");
    setObjective("");
    setTimeframe('short-term');
    setPriority('medium');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full border-4 border-purple-200 dark:border-purple-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100/20 to-pink-100/20 dark:from-purple-900/10 dark:to-pink-900/10 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-100/20 to-cyan-100/20 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-full blur-3xl -z-10" />

            {/* Header */}
            <div className="bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/50 dark:to-indigo-900/50 border-b-4 border-purple-300 dark:border-purple-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {editingGoal ? 'Edit Goal' : 'Create New Goal'}
                  </h3>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                  title="Close"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white dark:bg-gray-900 max-h-[calc(100vh-12rem)] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-purple-200 dark:border-purple-800 focus:border-purple-400 dark:focus:border-purple-600 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 bg-white dark:bg-gray-800 transition-all outline-none"
                  placeholder="e.g., Launch my own business"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Objective *</label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-purple-200 dark:border-purple-800 focus:border-purple-400 dark:focus:border-purple-600 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 bg-white dark:bg-gray-800 transition-all outline-none"
                  rows={3}
                  placeholder="Why is this goal important? What will achieving it mean to you?"
                  required
                />
              </div>

              {/* Info about projects */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Tip:</strong> After creating your goal, you can attach existing projects or create new projects directly from the goal card.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Timeframe *</label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as GoalTimeframe)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none"
                    required
                  >
                    <option value="immediate">Immediate (Days-Weeks)</option>
                    <option value="short-term">Short-term (Months)</option>
                    <option value="long-term">Long-term (Years)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t-2 border-purple-200 dark:border-purple-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-5 py-2.5 text-sm font-semibold rounded-xl border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
