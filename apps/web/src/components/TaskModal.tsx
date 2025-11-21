"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ListChecks } from "lucide-react";
import { TaskInput } from "./TaskInput";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: (taskId: string) => void;
  projectId?: string;
  projectTitle?: string;
}

export function TaskModal({
  isOpen,
  onClose,
  onTaskCreated,
  projectId,
  projectTitle,
}: TaskModalProps) {
  const handleTaskCreated = (taskId: string) => {
    if (onTaskCreated) {
      onTaskCreated(taskId);
    }
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
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
            className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full border-4 border-cyan-200 dark:border-cyan-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-100/20 to-blue-100/20 dark:from-cyan-900/10 dark:to-blue-900/10 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100/20 to-pink-100/20 dark:from-purple-900/10 dark:to-pink-900/10 rounded-full blur-3xl -z-10" />

            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/50 dark:to-blue-900/50 border-b-4 border-cyan-300 dark:border-cyan-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl shadow-lg">
                    <ListChecks className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                      Add New Task
                    </h3>
                    {projectTitle && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        to {projectTitle}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-cyan-200 dark:hover:bg-cyan-800 transition-colors"
                  title="Close"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Task Input Form */}
            <div className="p-6 bg-white dark:bg-gray-900 max-h-[calc(100vh-12rem)] overflow-y-auto">
              <TaskInput
                onClose={onClose}
                onTaskCreated={handleTaskCreated}
                defaultProjectId={projectId}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
