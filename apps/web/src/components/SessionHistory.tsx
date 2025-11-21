"use client";

import { useState, useEffect } from 'react';
import { TimeTrackingService, SessionTimeEntry } from '@/services/TimeTrackingService';
import { Clock, CheckCircle2, Circle } from 'lucide-react';

interface SessionHistoryProps {
  taskId: string;
  className?: string;
}

export function SessionHistory({ taskId, className = '' }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<SessionTimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      const history = await TimeTrackingService.getTaskSessionHistory(taskId);
      setSessions(history);
      setIsLoading(false);
    };

    loadHistory();
  }, [taskId]);

  if (isLoading) {
    return (
      <div className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        Loading session history...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        No focus sessions yet. Start a focus session to track time!
      </div>
    );
  }

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.completed).length;
  const totalTime = sessions.reduce((sum, s) => sum + s.timeSpent, 0);

  return (
    <div className={className}>
      <div className="space-y-3">
        {/* Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>
              {totalSessions} session{totalSessions !== 1 ? 's' : ''} • {TimeTrackingService.formatTime(totalTime)} total
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* Session List - Expanded */}
        {isExpanded && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sessions.map((session, idx) => (
              <div
                key={session.sessionId}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  {session.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-400" />
                  )}
                  <div className="text-sm">
                    <div className="text-gray-900 dark:text-gray-100">
                      {new Date(session.date).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {' • '}
                      {new Date(session.date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {session.completed ? 'Completed' : 'In Progress'}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {TimeTrackingService.formatTime(session.timeSpent)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
