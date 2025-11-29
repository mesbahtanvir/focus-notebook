'use client';

import { useMemo, useState } from 'react';
import { useFocus } from '@/store/useFocus';
import { Check, Circle } from 'lucide-react';
import { TimeTrackingService } from '@/services/TimeTrackingService';

interface WorkActivityProps {
  taskId: string;
}

interface WorkDay {
  date: string;           // "2024-12-18"
  dayLabel: string;       // "Today", "Yesterday", "Mon 12/16"
  shortLabel: string;     // "Mon" or "12/16"
  workedOn: boolean;      // Has sessions with timeSpent > 0
  totalMinutes: number;   // Sum of all session time that day
  sessionCount: number;   // Number of sessions
  isToday: boolean;
  sessions: Array<{
    sessionId: string;
    startTime: string;
    timeSpent: number;
    notes?: string;
  }>;
}

export function WorkActivity({ taskId }: WorkActivityProps) {
  const sessions = useFocus((s) => s.sessions);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const workDays = useMemo((): WorkDay[] => {
    const days: WorkDay[] = [];
    const now = new Date();

    // Generate last 10 days
    for (let i = 0; i < 10; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dateString = date.toISOString().split('T')[0]; // "2024-12-18"
      const isToday = i === 0;
      const isYesterday = i === 1;

      // Get day label
      let dayLabel: string;
      let shortLabel: string;

      if (isToday) {
        dayLabel = 'Today';
        shortLabel = 'Today';
      } else if (isYesterday) {
        dayLabel = 'Yesterday';
        shortLabel = 'Yest';
      } else {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const monthDay = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
        dayLabel = `${dayName} ${monthDay}`;
        shortLabel = dayName;
      }

      // Find sessions for this task on this day
      const daySessions = sessions
        .filter(session => {
          if (session.isActive) return false; // Skip active sessions

          const sessionDate = new Date(session.startTime);
          sessionDate.setHours(0, 0, 0, 0);
          const sessionDateString = sessionDate.toISOString().split('T')[0];

          if (sessionDateString !== dateString) return false;

          // Check if task was in this session and had time spent > 0
          const taskInSession = session.tasks?.find(t => t.task.id === taskId);
          return taskInSession && taskInSession.timeSpent > 0;
        })
        .map(session => {
          const taskInSession = session.tasks.find(t => t.task.id === taskId)!;
          return {
            sessionId: session.id,
            startTime: session.startTime,
            timeSpent: Math.floor(taskInSession.timeSpent / 60), // Convert to minutes
            notes: taskInSession.notes,
          };
        });

      const totalMinutes = daySessions.reduce((sum, s) => sum + s.timeSpent, 0);

      days.push({
        date: dateString,
        dayLabel,
        shortLabel,
        workedOn: daySessions.length > 0,
        totalMinutes,
        sessionCount: daySessions.length,
        isToday,
        sessions: daySessions,
      });
    }

    return days.reverse(); // Show oldest to newest (left to right)
  }, [sessions, taskId]);

  const stats = useMemo(() => {
    const daysActive = workDays.filter(d => d.workedOn).length;
    const totalMinutes = workDays.reduce((sum, d) => sum + d.totalMinutes, 0);
    return { daysActive, totalMinutes };
  }, [workDays]);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
        📅 Work Activity
      </h4>

      {/* Calendar Grid */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800">
        {/* Desktop View */}
        <div className="hidden md:grid grid-cols-10 gap-2">
          {workDays.map((day) => (
            <div
              key={day.date}
              className="relative"
              onMouseEnter={() => setHoveredDay(day.date)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <div
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all cursor-pointer ${
                  day.isToday
                    ? 'bg-purple-100 dark:bg-purple-900/40 border-2 border-purple-500 dark:border-purple-400'
                    : 'bg-white dark:bg-gray-800 border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                {/* Day Label */}
                <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 text-center h-8 flex items-center">
                  {day.shortLabel}
                </div>

                {/* Date */}
                <div className="text-[9px] text-gray-500 dark:text-gray-500 mb-1">
                  {new Date(day.date).getDate()}
                </div>

                {/* Status Indicator */}
                <div className="flex items-center justify-center h-6">
                  {day.workedOn ? (
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 dark:bg-green-600">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" fill="currentColor" />
                  )}
                </div>

                {/* Time Spent */}
                <div className="text-[10px] font-medium text-center h-8 flex items-center">
                  {day.workedOn ? (
                    <span className="text-green-700 dark:text-green-400">
                      {TimeTrackingService.formatTime(day.totalMinutes)}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600">-</span>
                  )}
                </div>
              </div>

              {/* Hover Tooltip */}
              {hoveredDay === day.date && day.workedOn && (
                <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-blue-300 dark:border-blue-700 p-3 text-xs">
                  <div className="font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {day.dayLabel}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                      <span>Sessions:</span>
                      <span className="font-semibold">{day.sessionCount}</span>
                    </div>

                    <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                      <span>Total time:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {TimeTrackingService.formatTime(day.totalMinutes)}
                      </span>
                    </div>

                    {day.sessions.some(s => s.notes) && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-gray-600 dark:text-gray-400 mb-1">Notes:</div>
                        {day.sessions
                          .filter(s => s.notes)
                          .map((session, idx) => (
                            <div key={idx} className="text-gray-700 dark:text-gray-300 text-[11px] italic line-clamp-2">
                              &ldquo;{session.notes}&rdquo;
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Tooltip Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[2px] w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-blue-300 dark:border-t-blue-700" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile View - Show last 7 days */}
        <div className="md:hidden grid grid-cols-7 gap-1.5">
          {workDays.slice(-7).map((day) => (
            <div
              key={day.date}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-lg ${
                day.isToday
                  ? 'bg-purple-100 dark:bg-purple-900/40 border-2 border-purple-500'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Day Letter */}
              <div className="text-[9px] font-semibold text-gray-600 dark:text-gray-400">
                {day.shortLabel.charAt(0)}
              </div>

              {/* Status */}
              <div className="flex items-center justify-center">
                {day.workedOn ? (
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                ) : (
                  <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600" fill="currentColor" />
                )}
              </div>

              {/* Time */}
              {day.workedOn && (
                <div className="text-[8px] font-medium text-green-700 dark:text-green-400">
                  {day.totalMinutes >= 60 ? `${Math.floor(day.totalMinutes / 60)}h` : `${day.totalMinutes}m`}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-3 border-t-2 border-blue-200 dark:border-blue-800 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">🎯 Active:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {stats.daysActive} of 10 days
            </span>
          </div>

          <div className="hidden sm:block w-px h-4 bg-blue-200 dark:bg-blue-800" />

          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">📊 Total time:</span>
            <span className="font-bold text-green-600 dark:text-green-400">
              {TimeTrackingService.formatTime(stats.totalMinutes)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
