import React from 'react';
import { TimeTrackingService } from '@/services/TimeTrackingService';

interface TimeProgressBarProps {
  actual: number; // in minutes
  estimated: number; // in minutes
  height?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

export function TimeProgressBar({
  actual,
  estimated,
  height = 'md',
  showPercentage = false,
}: TimeProgressBarProps) {
  if (!estimated || estimated === 0) {
    // No estimate - just show a neutral bar
    return null;
  }

  const efficiency = TimeTrackingService.calculateEfficiency(actual, estimated);
  const status = TimeTrackingService.getEfficiencyStatus(efficiency);
  const color = TimeTrackingService.getEfficiencyColor(status);

  // Calculate width percentage (cap at 100% for visual purposes)
  const widthPercentage = Math.min((actual / estimated) * 100, 100);

  // Height classes
  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${heightClasses[height]}`}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${widthPercentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {showPercentage && efficiency && (
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-right">
          {efficiency}%
        </div>
      )}
    </div>
  );
}
