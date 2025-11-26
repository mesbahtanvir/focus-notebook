"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FocusSession } from '@/store/useFocus';
import { SessionSummary } from './SessionSummary';

interface UnifiedEndSessionProps {
  // Loading phase
  isLoading: boolean;

  // Summary phase
  showSummary: boolean;
  completedSession: FocusSession | null;
  onStartNewSession?: () => void;
  onViewHistory?: () => void;
}

export function UnifiedEndSession({
  isLoading,
  showSummary,
  completedSession,
  onStartNewSession,
  onViewHistory,
}: UnifiedEndSessionProps) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
      <div className="relative w-full h-full overflow-hidden">
        <AnimatePresence mode="wait">
          {isLoading && !showSummary ? (
            <motion.div
              key="loading"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-20 h-20 mx-auto"
                >
                  <div className="w-full h-full rounded-full border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400" />
                </motion.div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                    Saving Your Progress...
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Just a moment
                  </p>
                </div>
              </motion.div>
            </motion.div>
          ) : showSummary && completedSession ? (
            <motion.div
              key="summary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <SessionSummary
                session={completedSession}
                onStartNewSession={onStartNewSession}
                onViewHistory={onViewHistory}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
