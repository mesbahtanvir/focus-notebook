import React from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, AlertCircle, Circle } from 'lucide-react';

export type EndSessionStep =
  | 'saving-notes'
  | 'updating-session'
  | 'updating-tasks'
  | 'calculating-stats'
  | 'complete';

export interface EndSessionStepStatus {
  step: EndSessionStep;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  current?: number;
  total?: number;
  error?: string;
}

export interface EndSessionProgressProps {
  currentStep: EndSessionStep;
  stepStatuses: EndSessionStepStatus[];
  onRetry?: () => void;
  onContinue?: () => void;
}

const stepLabels: Record<EndSessionStep, string> = {
  'saving-notes': 'Saving session notes',
  'updating-session': 'Updating session status',
  'updating-tasks': 'Updating task progress',
  'calculating-stats': 'Preparing your summary',
  'complete': 'Complete',
};

const StepIcon: React.FC<{ status: EndSessionStepStatus['status'] }> = ({ status }) => {
  switch (status) {
    case 'completed':
      return <Check className="h-5 w-5 text-green-600 dark:text-green-400" />;
    case 'in-progress':
      return <Loader2 className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-spin" />;
    case 'error':
      return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
    default:
      return <Circle className="h-5 w-5 text-gray-400 dark:text-gray-600" />;
  }
};

export const EndSessionProgress: React.FC<EndSessionProgressProps> = ({
  currentStep,
  stepStatuses,
  onRetry,
  onContinue,
}) => {
  const hasErrors = stepStatuses.some(s => s.status === 'error');
  const completedSteps = stepStatuses.filter(s => s.status === 'completed').length;
  const totalSteps = stepStatuses.length;
  const progressPercent = (completedSteps / totalSteps) * 100;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {hasErrors ? 'Session Saved with Issues' : currentStep === 'complete' ? 'Session Complete! 🎉' : 'Ending Your Focus Session'}
          </h2>
          {!hasErrors && currentStep !== 'complete' && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please wait while we save your progress...
            </p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="space-y-4 mb-6">
          {stepStatuses.map((stepStatus) => (
            <motion.div
              key={stepStatus.step}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3"
            >
              <div className="flex-shrink-0 mt-0.5">
                <StepIcon status={stepStatus.status} />
              </div>

              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${
                  stepStatus.status === 'completed'
                    ? 'text-green-700 dark:text-green-400'
                    : stepStatus.status === 'in-progress'
                    ? 'text-purple-700 dark:text-purple-400'
                    : stepStatus.status === 'error'
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {stepLabels[stepStatus.step]}
                </div>

                {/* Show progress for task updates */}
                {stepStatus.step === 'updating-tasks' && stepStatus.current != null && stepStatus.total != null && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Completed {stepStatus.current} of {stepStatus.total} tasks
                  </div>
                )}

                {/* Show error message */}
                {stepStatus.error && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {stepStatus.error}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Progress Bar */}
        {currentStep !== 'complete' && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
              <span>Progress</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600"
              />
            </div>
          </div>
        )}

        {/* Success Summary */}
        {currentStep === 'complete' && !hasErrors && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <div className="space-y-1 text-sm text-green-800 dark:text-green-300">
              {stepStatuses.map((step) => (
                step.status === 'completed' && (
                  <div key={step.step} className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    <span>{stepLabels[step.step]}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Error Actions */}
        {hasErrors && (
          <div className="flex gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                Retry Failed
              </button>
            )}
            {onContinue && (
              <button
                onClick={onContinue}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium text-sm transition-colors"
              >
                Continue Anyway
              </button>
            )}
          </div>
        )}

        {/* Complete message */}
        {currentStep === 'complete' && !hasErrors && (
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Loading your summary...
          </p>
        )}
      </motion.div>
    </div>
  );
};
