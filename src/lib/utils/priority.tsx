import { AlertCircle, Circle } from 'lucide-react'
import { TaskPriority } from '@/store/useTasks'

/**
 * Get Tailwind CSS classes for a task priority level
 */
export function getPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case 'urgent':
      return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-400'
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400'
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400'
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/40 dark:text-green-400'
  }
}

/**
 * Get icon component for a task priority level
 */
export function getPriorityIcon(priority: TaskPriority) {
  switch (priority) {
    case 'urgent':
    case 'high':
      return <AlertCircle className="h-4 w-4" />
    case 'medium':
    case 'low':
      return <Circle className="h-4 w-4" />
  }
}

/**
 * Get badge classes for priority display (used in goal cards)
 */
export function getPriorityBadgeClasses(priority: TaskPriority): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
    case 'high':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400'
    case 'low':
      return 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
  }
}
