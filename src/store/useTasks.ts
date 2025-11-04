import { create } from 'zustand'
import { collection, query, orderBy } from 'firebase/firestore'
import { db, auth } from '@/lib/firebaseClient'
import { createAt, setAt, updateAt, deleteAt } from '@/lib/data/gateway'
import { subscribeCol } from '@/lib/data/subscribe'
import { isWorkday, getDateString } from '@/lib/utils/date'
import { AIActionMetadata } from '@/types/aiMetadata'

export type TaskStatus = 'active' | 'completed' | 'backlog'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskCategory = 'mastery' | 'pleasure'
export type RecurrenceType = 'none' | 'daily' | 'workweek' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'halfyearly' | 'yearly'

export interface RecurrenceConfig {
  type: RecurrenceType
  frequency?: number // e.g., 4 times per week, 2-3 times per month
  frequencyMax?: number // for ranges like 2-3 times
  daysOfWeek?: number[] // 0-6 for Sunday-Saturday (for weekly tasks)
}

export interface TaskStep {
  id: string
  text: string
  completed: boolean
}

export interface TaskCompletion {
  date: string // ISO date string (YYYY-MM-DD)
  completedAt: string // ISO timestamp
  note?: string // Optional note for this specific completion
}

export interface Task {
  id: string
  title: string
  done: boolean
  status: TaskStatus
  priority: TaskPriority
  category?: TaskCategory
  createdAt: string | any // Firebase Timestamp or ISO string
  updatedAt?: any // Firebase Timestamp
  updatedBy?: string
  version?: number
  dueDate?: string
  completedAt?: string
  notes?: string
  steps?: TaskStep[] // Subtasks/checklist for breaking down the task
  tags?: string[]
  estimatedMinutes?: number
  actualMinutes?: number
  recurrence?: RecurrenceConfig
  parentTaskId?: string // DEPRECATED - For backward compatibility with old recurring task instances
  completionCount?: number // Track how many times completed this period
  completionHistory?: TaskCompletion[] // Track when task was completed (for recurring tasks)
  projectId?: string // Link to project
  thoughtId?: string // Link to thought that created this task
  focusEligible?: boolean // Can be done during a focus session (laptop/notebook work)

  // AI Action Tracking (Bug 1)
  createdBy?: 'ai' | 'user' // Who created this task
  aiMetadata?: AIActionMetadata // Metadata for AI-created/modified items
  aiActionHistory?: AIActionMetadata[] // Full history of AI actions on this task
}

// Helper functions for recurring tasks

// Check if we need to create a recurring task instance for today
function shouldCreateTaskForToday(task: Task, existingTasks: Task[]): boolean {
  if (!task.recurrence || task.recurrence.type === 'none') return false
  
  const today = getDateString(new Date())
  const { type } = task.recurrence
  
  // For workweek tasks, only create on weekdays
  if (type === 'workweek' && !isWorkday()) return false
  
  // Check if there's already a task for today (completed or active)
  const hasTaskForToday = existingTasks.some(t => 
    (t.id === task.id || t.parentTaskId === task.id || t.parentTaskId === task.parentTaskId) &&
    t.dueDate === today
  )
  
  if (hasTaskForToday) return false
  
  // Check if this task should have an instance for today
  const taskDueDate = task.dueDate
  if (!taskDueDate) return true // No due date, create for today
  
  const taskDate = new Date(taskDueDate)
  const nowDate = new Date()
  
  // If task's due date is in the past or today, and it's completed, create new instance
  if (task.done && taskDate <= nowDate) {
    return true
  }
  
  return false
}

// Create a task instance for today
function createTaskForToday(task: Task): Omit<Task, 'id'> {
  const today = getDateString(new Date())
  
  return {
    title: task.title,
    done: false,
    status: 'active',
    priority: task.priority,
    category: task.category,
    createdAt: new Date().toISOString(),
    completedAt: undefined,
    completionCount: 0,
    dueDate: today,
    notes: task.notes,
    tags: task.tags,
    estimatedMinutes: task.estimatedMinutes,
    recurrence: task.recurrence,
    parentTaskId: task.parentTaskId || task.id,
    projectId: task.projectId,
    focusEligible: task.focusEligible,
  }
}

// Generate missing recurring task instances
async function generateMissingRecurringTasks(tasks: Task[], userId: string): Promise<void> {
  // Find all recurring task templates (original tasks with recurrence)
  const recurringTemplates = tasks.filter(t => 
    t.recurrence && 
    t.recurrence.type !== 'none' &&
    !t.parentTaskId // Only look at parent tasks, not instances
  )
  
  for (const template of recurringTemplates) {
    if (shouldCreateTaskForToday(template, tasks)) {
      const newTask = createTaskForToday(template)
      const taskId = Date.now().toString() + Math.random().toString(36).substring(2)
      await createAt(`users/${userId}/tasks/${taskId}`, newTask)
    }
  }
}

type State = {
  tasks: Task[]
  isLoading: boolean
  fromCache: boolean
  hasPendingWrites: boolean
  syncError: Error | null
  unsubscribe: (() => void) | null
  subscribe: (userId: string) => void
  add: (task: Omit<Task, 'id' | 'done' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>) => Promise<string>
  toggle: (id: string) => Promise<void>
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  getTasksByStatus: (status: TaskStatus) => Task[]
  resetDailyTasks: () => Promise<void>
  resetWeeklyTasks: () => Promise<void>
}

export const useTasks = create<State>((set, get) => ({
  tasks: [],
  isLoading: true,
  fromCache: false,
  hasPendingWrites: false,
  syncError: null,
  unsubscribe: null,
  
  subscribe: (userId: string) => {
    // Unsubscribe from previous subscription if any
    const currentUnsub = get().unsubscribe
    if (currentUnsub) {
      currentUnsub()
    }
    
    // Subscribe to tasks collection
    const tasksQuery = query(
      collection(db, `users/${userId}/tasks`),
      orderBy('createdAt', 'desc')
    )
    
    const unsub = subscribeCol<Task>(tasksQuery, async (tasks, meta) => {
      set({
        tasks,
        isLoading: false,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
        syncError: meta.error || null,
      })

      // Log sync errors to help with debugging
      if (meta.error) {
        console.error('Tasks sync error:', meta.error);
      }

      // DISABLED: Recurring tasks now track completions by date instead of creating instances
      // Generate missing recurring tasks (only on first load, not from cache)
      // if (!meta.fromCache && tasks.length > 0) {
      //   await generateMissingRecurringTasks(tasks, userId)
      // }
    })
    
    set({ unsubscribe: unsub })
  },
  
  add: async (task) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')

    const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const newTask: Omit<Task, 'id'> = {
      ...task, // Spread all fields from the input task
      title: task.title || 'Untitled Task',
      done: false,
      status: task.status || 'active',
      priority: task.priority || 'medium',
      focusEligible: task.focusEligible !== undefined ? task.focusEligible : true,
      createdAt: new Date().toISOString(),
    }

    await createAt(`users/${userId}/tasks/${taskId}`, newTask)
    return taskId
  },
  
  toggle: async (id) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')
    
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    
    const isRecurring = task.recurrence && task.recurrence.type !== 'none'
    const nowDone = !task.done
    const today = getDateString(new Date())
    
    let updates: Partial<Task> = {}
    
    if (isRecurring) {
      // For recurring tasks, track completion by date
      const completionHistory = task.completionHistory || []
      const todayCompletion = completionHistory.find(c => c.date === today)
      
      if (nowDone && !todayCompletion) {
        // Add today's completion
        updates = {
          done: true, // Mark as done for today
          completedAt: new Date().toISOString(),
          completionHistory: [
            ...completionHistory,
            {
              date: today,
              completedAt: new Date().toISOString(),
            }
          ],
          completionCount: (task.completionCount || 0) + 1,
        }
      } else if (!nowDone && todayCompletion) {
        // Remove today's completion
        updates = {
          done: false,
          completedAt: undefined,
          completionHistory: completionHistory.filter(c => c.date !== today),
          completionCount: Math.max(0, (task.completionCount || 0) - 1),
        }
      }
    } else {
      // For one-time tasks, simple toggle
      updates = {
        done: nowDone,
        status: nowDone ? 'completed' : 'active',
        completedAt: nowDone ? new Date().toISOString() : undefined,
      }
    }
    
    await updateAt(`users/${userId}/tasks/${id}`, updates)
  },
  
  updateTask: async (id, updates) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')
    
    await updateAt(`users/${userId}/tasks/${id}`, updates)
  },
  
  deleteTask: async (id) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')
    
    await deleteAt(`users/${userId}/tasks/${id}`)
  },
  
  getTasksByStatus: (status) => {
    return get().tasks.filter(t => t.status === status)
  },
  
  resetDailyTasks: async () => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')
    
    const tasks = get().tasks
    const dailyTasks = tasks.filter(t => t.recurrence?.type === 'daily' && t.done)
    
    for (const task of dailyTasks) {
      await updateAt(`users/${userId}/tasks/${task.id}`, {
        done: false,
        status: 'active',
        completedAt: undefined,
      })
    }
  },
  
  resetWeeklyTasks: async () => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')
    
    const tasks = get().tasks
    const weeklyTasks = tasks.filter(t => t.recurrence?.type === 'weekly' && t.done)
    
    for (const task of weeklyTasks) {
      await updateAt(`users/${userId}/tasks/${task.id}`, {
        done: false,
        status: 'active',
        completedAt: undefined,
        completionCount: 0, // Reset completion count for new week
      })
    }
  },
}))
