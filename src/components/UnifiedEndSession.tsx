"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FocusSession } from '@/store/useFocus';
import { EndSessionStep, EndSessionStepStatus, EndSessionProgress } from './EndSessionProgress';
import { SessionSummary } from './SessionSummary';

interface UnifiedEndSessionProps {
  // Progress phase
  showProgress: boolean;
  currentStep: EndSessionStep;
  stepStatuses: EndSessionStepStatus[];
  onRetry?: () => void;
  onContinueAnyway?: () => void;

  // Summary phase
  showSummary: boolean;
  completedSession: FocusSession | null;
  onStartNewSession?: () => void;
  onViewHistory?: () => void;
}

export function UnifiedEndSession({
  showProgress,
  currentStep,
  stepStatuses,
  onRetry,
  onContinueAnyway,
  showSummary,
  completedSession,
  onStartNewSession,
  onViewHistory,
}: UnifiedEndSessionProps) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
      <div className="relative w-full h-full overflow-hidden">
        <AnimatePresence mode="wait">
          {showProgress && !showSummary ? (
            <motion.div
              key="progress"
              initial={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <EndSessionProgress
                currentStep={currentStep}
                stepStatuses={stepStatuses}
                onRetry={onRetry}
                onContinue={onContinueAnyway}
              />
            </motion.div>
          ) : showSummary && completedSession ? (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
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
