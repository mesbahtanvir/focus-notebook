import React from 'react';
import { TimeTrackingService } from '@/services/TimeTrackingService';
import { TimeProgressBar } from './TimeProgressBar';

interface TimeDisplayProps {
  actual?: number; // in minutes
  estimated?: number; // in minutes
  variant?: 'inline' | 'badge' | 'detailed';
  showProgressBar?: boolean;
  className?: string;
}

export function TimeDisplay({
  actual = 0,
  estimated,
  variant = 'inline',
  showProgressBar = true,
  className = '',
}: TimeDisplayProps) {
  // Don't show anything if no time data
  if (actual === 0 && !estimated) {
    return null;
  }

  const efficiency = estimated ? TimeTrackingService.calculateEfficiency(actual, estimated) : undefined;
  const status = TimeTrackingService.getEfficiencyStatus(efficiency);
  const color = TimeTrackingService.getEfficiencyColor(status);

  const actualFormatted = TimeTrackingService.formatTime(actual);
  const estimatedFormatted = estimated ? TimeTrackingService.formatTime(estimated) : null;

  // Inline variant - compact display for task lists
  if (variant === 'inline') {
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">⏱️</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {actualFormatted}
          </span>
          {estimatedFormatted && (
            <>
              <span className="text-gray-400 dark:text-gray-500">/</span>
              <span className="text-gray-500 dark:text-gray-400">
                {estimatedFormatted} est
              </span>
            </>
          )}
          {efficiency && efficiency > 100 && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}20`, color }}>
              +{efficiency - 100}%
            </span>
          )}
        </div>
        {showProgressBar && estimated && (
          <TimeProgressBar actual={actual} estimated={estimated} height="sm" />
        )}
      </div>
    );
  }

  // Badge variant - compact badge display
  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}
        style={{
          backgroundColor: estimated ? `${color}20` : '#f3f4f6',
          color: estimated ? color : '#6b7280',
        }}
      >
        <span>⏱️</span>
        <span>{actualFormatted}</span>
        {estimatedFormatted && (
          <>
            <span className="opacity-50">/</span>
            <span className="opacity-75">{estimatedFormatted}</span>
          </>
        )}
      </div>
    );
  }

  // Detailed variant - full breakdown
  if (variant === 'detailed') {
    const variance = estimated ? actual - estimated : undefined;
    const varianceFormatted = variance ? TimeTrackingService.formatTime(Math.abs(variance)) : null;

    return (
      <div className={`space-y-3 ${className}`}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Actual Time</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {actualFormatted}
            </div>
          </div>
          {estimatedFormatted && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estimated</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {estimatedFormatted}
              </div>
            </div>
          )}
        </div>

        {estimated && (
          <>
            <TimeProgressBar actual={actual} estimated={estimated} height="md" />

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-gray-600 dark:text-gray-400">
                  {status === 'on-track' && 'On track'}
                  {status === 'warning' && 'Slight overrun'}
                  {status === 'over-budget' && 'Over budget'}
                </span>
              </div>
              {variance !== undefined && (
                <span
                  className="font-medium"
                  style={{ color }}
                >
                  {variance > 0 ? '+' : ''}{varianceFormatted}
                </span>
              )}
            </div>

            {efficiency && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Efficiency: {efficiency}% of estimate
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return null;
}
