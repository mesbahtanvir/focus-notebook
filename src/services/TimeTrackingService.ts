import { updateAt } from '@/lib/data/gateway';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, getDocs, query, collection, where } from 'firebase/firestore';
import type { Task } from '@/store/useTasks';
import type { Project } from '@/store/useProjects';
import type { Goal } from '@/store/useGoals';
import type { FocusSession } from '@/store/useFocus';

export interface TimeTracking {
  totalMinutes: number;
  lastSessionMinutes?: number;
  sessionCount?: number;
  lastTrackedAt?: string;
  variance?: number; // actual - estimated
}

export interface SessionTimeEntry {
  sessionId: string;
  date: string;
  timeSpent: number; // in minutes
  completed: boolean;
}

export class TimeTrackingService {
  /**
   * Update task's actual time by adding time from a focus session
   * @param taskId - The task to update
   * @param sessionSeconds - Time spent in the session (in seconds)
   */
  static async updateTaskActualTime(taskId: string, sessionSeconds: number): Promise<void> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const sessionMinutes = Math.round(sessionSeconds / 60);
    if (sessionMinutes === 0) return; // Don't update for sessions less than 1 minute

    try {
      // Get current task to read existing actualMinutes
      const taskRef = doc(db, `users/${userId}/tasks/${taskId}`);
      const taskDoc = await getDoc(taskRef);
      const task = taskDoc.data() as Task | undefined;

      if (!task) {
        console.warn(`Task ${taskId} not found, skipping time update`);
        return;
      }

      const currentActual = task.actualMinutes || 0;
      const newActual = currentActual + sessionMinutes;

      // Calculate variance if estimate exists
      const variance = task.estimatedMinutes
        ? newActual - task.estimatedMinutes
        : undefined;

      // Update task with new actual time
      await updateAt(`/users/${userId}/tasks/${taskId}`, {
        actualMinutes: newActual,
        'timeTracking.totalMinutes': newActual,
        'timeTracking.lastSessionMinutes': sessionMinutes,
        'timeTracking.lastTrackedAt': new Date().toISOString(),
        'timeTracking.variance': variance,
      });

      console.log(`Updated task ${taskId}: +${sessionMinutes}m (total: ${newActual}m)`);
    } catch (error) {
      console.error(`Failed to update task time for ${taskId}:`, error);
      // Don't throw - we don't want to block session completion if time update fails
    }
  }

  /**
   * Get task's session history from all focus sessions
   * @param taskId - The task to get history for
   * @returns Array of session time entries
   */
  static async getTaskSessionHistory(taskId: string): Promise<SessionTimeEntry[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    try {
      // Query all focus sessions
      const sessionsQuery = query(
        collection(db, `users/${userId}/focusSessions`),
        where('endTime', '!=', null) // Only completed sessions
      );

      const sessionDocs = await getDocs(sessionsQuery);
      const sessions = sessionDocs.docs.map(doc => doc.data() as FocusSession);

      // Filter sessions that include this task and extract time
      const history: SessionTimeEntry[] = [];

      for (const session of sessions) {
        const focusTask = session.tasks?.find(t => t.task.id === taskId);
        if (focusTask && focusTask.timeSpent > 0) {
          history.push({
            sessionId: session.id,
            date: session.endTime || session.startTime,
            timeSpent: Math.round(focusTask.timeSpent / 60), // Convert to minutes
            completed: focusTask.completed,
          });
        }
      }

      // Sort by date, most recent first
      return history.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } catch (error) {
      console.error(`Failed to get session history for task ${taskId}:`, error);
      return [];
    }
  }

  /**
   * Calculate total time for a project by summing linked task times
   * @param projectId - The project to calculate time for
   * @param tasks - All tasks (to avoid extra queries)
   * @returns Time tracking summary
   */
  static calculateProjectTime(project: Project, tasks: Task[]): TimeTracking {
    const linkedTasks = tasks.filter(t => t.projectId === project.id);

    const totalActual = linkedTasks.reduce((sum, task) =>
      sum + (task.actualMinutes || 0), 0
    );

    const totalEstimated = linkedTasks.reduce((sum, task) =>
      sum + (task.estimatedMinutes || 0), 0
    );

    const sessionCount = linkedTasks.filter(t =>
      (t.actualMinutes || 0) > 0
    ).length;

    return {
      totalMinutes: totalActual,
      sessionCount,
      variance: totalEstimated > 0 ? totalActual - totalEstimated : undefined,
    };
  }

  /**
   * Calculate total time for a goal by summing linked project times
   * @param goalId - The goal to calculate time for
   * @param projects - All projects
   * @param tasks - All tasks
   * @returns Time tracking summary
   */
  static calculateGoalTime(goal: Goal, projects: Project[], tasks: Task[]): TimeTracking {
    const linkedProjects = projects.filter(p => p.goalId === goal.id);

    let totalActual = 0;
    let totalEstimated = 0;
    let projectCount = 0;

    for (const project of linkedProjects) {
      const projectTime = this.calculateProjectTime(project, tasks);
      totalActual += projectTime.totalMinutes;

      const linkedTasks = tasks.filter(t => t.projectId === project.id);
      totalEstimated += linkedTasks.reduce((sum, task) =>
        sum + (task.estimatedMinutes || 0), 0
      );

      if (projectTime.totalMinutes > 0) {
        projectCount++;
      }
    }

    return {
      totalMinutes: totalActual,
      sessionCount: projectCount,
      variance: totalEstimated > 0 ? totalActual - totalEstimated : undefined,
    };
  }

  /**
   * Format time in minutes to human-readable format (e.g., "2h 15m")
   * @param minutes - Time in minutes
   * @returns Formatted string
   */
  static formatTime(minutes: number): string {
    if (minutes === 0) return '0m';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  /**
   * Calculate efficiency percentage (actual / estimated * 100)
   * @param actual - Actual time in minutes
   * @param estimated - Estimated time in minutes
   * @returns Efficiency percentage (e.g., 150 means 50% over estimate)
   */
  static calculateEfficiency(actual: number, estimated: number): number | undefined {
    if (!estimated || estimated === 0) return undefined;
    return Math.round((actual / estimated) * 100);
  }

  /**
   * Get efficiency status based on percentage
   * @param efficiency - Efficiency percentage
   * @returns Status: 'on-track' | 'warning' | 'over-budget'
   */
  static getEfficiencyStatus(efficiency: number | undefined): 'on-track' | 'warning' | 'over-budget' {
    if (!efficiency) return 'on-track';
    if (efficiency <= 100) return 'on-track';
    if (efficiency <= 120) return 'warning';
    return 'over-budget';
  }

  /**
   * Get color for efficiency status
   * @param status - Efficiency status
   * @returns Tailwind color class
   */
  static getEfficiencyColor(status: 'on-track' | 'warning' | 'over-budget'): string {
    switch (status) {
      case 'on-track': return '#10b981'; // green-500
      case 'warning': return '#f59e0b'; // amber-500
      case 'over-budget': return '#ef4444'; // red-500
    }
  }
}
