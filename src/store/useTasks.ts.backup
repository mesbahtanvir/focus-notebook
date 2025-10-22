import { create } from 'zustand'
import { db, toTask, toTaskRow } from '@/db'
import { pushItemToCloud, deleteItemFromCloud } from '@/lib/syncEngine'
import { auth } from '@/lib/firebase'
import { getCompactSource } from '@/lib/deviceDetection'

export type TaskStatus = 'active' | 'completed' | 'backlog'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskCategory = 'mastery' | 'pleasure'
export type RecurrenceType = 'none' | 'daily' | 'workweek' | 'weekly' | 'monthly'

export interface RecurrenceConfig {
  type: RecurrenceType
  frequency?: number // e.g., 4 times per week, 2-3 times per month
  frequencyMax?: number // for ranges like 2-3 times
  daysOfWeek?: number[] // 0-6 for Sunday-Saturday (for weekly tasks)
}

export interface Task {
  id: string
  title: string
  done: boolean
  status: TaskStatus
  priority: TaskPriority
  category?: TaskCategory
  createdAt: string
  updatedAt?: number
  dueDate?: string
  completedAt?: string
  notes?: string
  tags?: string[]
  estimatedMinutes?: number
  actualMinutes?: number
  recurrence?: RecurrenceConfig
  parentTaskId?: string // For tracking recurring task instances
  completionCount?: number // Track how many times completed this period
  projectId?: string // Link to project
  focusEligible?: boolean // Can be done during a focus session (laptop/notebook work)
  source?: string // Device/platform source (e.g., "iPhone-Safari", "Mac-Chrome")
  lastModifiedSource?: string // Source of last modification
}

// Helper functions for recurring tasks

// Check if today is a workday (Monday-Friday)
function isWorkday(date: Date = new Date()): boolean {
  const day = date.getDay()
  return day >= 1 && day <= 5 // Monday (1) to Friday (5)
}

// Get the date string in YYYY-MM-DD format
function getDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

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
function createTaskForToday(task: Task): Task {
  const today = getDateString(new Date())
  
  return {
    ...task,
    id: Date.now().toString() + Math.random().toString(36).substring(2),
    done: false,
    status: 'active',
    completedAt: undefined,
    completionCount: 0,
    dueDate: today,
    createdAt: new Date().toISOString(),
    parentTaskId: task.parentTaskId || task.id,
  }
}

// Generate missing recurring task instances
async function generateMissingRecurringTasks(tasks: Task[]): Promise<Task[]> {
  const newTasks: Task[] = []
  
  // Find all recurring task templates (original tasks with recurrence)
  const recurringTemplates = tasks.filter(t => 
    t.recurrence && 
    t.recurrence.type !== 'none' &&
    !t.parentTaskId // Only look at parent tasks, not instances
  )
  
  for (const template of recurringTemplates) {
    if (shouldCreateTaskForToday(template, tasks)) {
      newTasks.push(createTaskForToday(template))
    }
  }
  
  return newTasks
}

type State = {
  tasks: Task[]
  isLoading: boolean
  loadTasks: () => Promise<void>
  add: (task: Omit<Task, 'id' | 'done'>) => Promise<string>
  toggle: (id: string) => Promise<void>
  updateTask: (id: string, updates: Partial<Omit<Task, 'id'>>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  getTasksByStatus: (status: TaskStatus) => Task[]
  resetDailyTasks: () => Promise<void>
  resetWeeklyTasks: () => Promise<void>
}

export const useTasks = create<State>((set, get) => ({
  tasks: [],
  isLoading: true,
  
  loadTasks: async () => {
    try {
      const tasks = await db.tasks.toArray()
      const loadedTasks = tasks.map(toTask)
      
      // Generate missing recurring task instances for today
      const newRecurringTasks = await generateMissingRecurringTasks(loadedTasks)
      
      // Add new recurring tasks to database
      if (newRecurringTasks.length > 0) {
        for (const newTask of newRecurringTasks) {
          await db.tasks.add(toTaskRow(newTask))
        }
        
        // Update state with all tasks including newly created ones
        set({ tasks: [...loadedTasks, ...newRecurringTasks], isLoading: false })
      } else {
        set({ tasks: loadedTasks, isLoading: false })
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
      set({ isLoading: false })
    }
  },
  
  add: async (task) => {
    const source = getCompactSource();
    const now = Date.now();
    // Add random suffix to ensure unique IDs even if called in same millisecond
    const uniqueId = `${now}-${Math.random().toString(36).substr(2, 9)}`;
    const newTask: Task = {
      ...task,
      id: uniqueId,
      done: false,
      status: task.status || 'active',
      priority: task.priority || 'medium',
      category: task.category,
      createdAt: new Date(now).toISOString(),
      source,
      lastModifiedSource: source,
      focusEligible: task.focusEligible !== undefined ? task.focusEligible : true,
    }
    
    try {
      await db.tasks.add(toTaskRow(newTask))
      set((state) => ({
        tasks: [...state.tasks, newTask]
      }))
      
      // Push to cloud immediately if user is authenticated
      if (auth.currentUser) {
        pushItemToCloud('tasks', newTask).catch(err => 
          console.error('Failed to push new task to cloud:', err)
        )
      }
      
      return newTask.id
    } catch (error) {
      console.error('Failed to add task:', error)
      return ''
    }
  },
  
  toggle: async (id) => {
    // Get fresh state each time to avoid stale closures
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    
    const isRecurring = task.recurrence && task.recurrence.type !== 'none'
    const nowDone = !task.done
    
    const updatedTask = {
      ...task,
      done: nowDone,
      // Recurring tasks stay 'active' even when done, non-recurring become 'completed'
      status: (nowDone && !isRecurring) ? 'completed' : 'active' as TaskStatus,
      completedAt: nowDone ? new Date().toISOString() : undefined,
      // Increment count every time task is marked as done
      completionCount: nowDone && isRecurring
        ? (task.completionCount || 0) + 1 
        : task.completionCount,
    }
    
    try {
      await db.tasks.update(id, toTaskRow(updatedTask))
      set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? updatedTask : t)
      }))
      
      // Push to cloud immediately if user is authenticated
      if (auth.currentUser) {
        pushItemToCloud('tasks', updatedTask).catch(err => 
          console.error('Failed to push task update to cloud:', err)
        )
      }
    } catch (error) {
      console.error('Failed to toggle task:', error)
    }
  },
  
  updateTask: async (id, updates) => {
    try {
      const source = getCompactSource();
      const updatesWithTimestamp = { 
        ...updates, 
        updatedAt: Date.now(),
        lastModifiedSource: source 
      }
      const serializedUpdates = toTaskRow({ id, ...updatesWithTimestamp } as any)
      const { id: _, ...updateData } = serializedUpdates
      
      await db.tasks.update(id, updateData)
      
      const updatedTask = get().tasks.find(t => t.id === id)
      const finalTask = updatedTask ? { ...updatedTask, ...updatesWithTimestamp } : null
      
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, ...updatesWithTimestamp } : task
        ),
      }))
      
      // Push to cloud immediately if user is authenticated
      if (auth.currentUser && finalTask) {
        pushItemToCloud('tasks', finalTask).catch(err => 
          console.error('Failed to push task update to cloud:', err)
        )
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  },
  
  deleteTask: async (id) => {
    try {
      await db.tasks.delete(id)
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
      }))
      
      // Delete from cloud immediately if user is authenticated
      if (auth.currentUser) {
        deleteItemFromCloud('tasks', id).catch(err => 
          console.error('Failed to delete task from cloud:', err)
        )
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  },
  
  getTasksByStatus: (status) => {
    return get().tasks.filter(t => t.status === status)
  },
  
  resetDailyTasks: async () => {
    const tasks = get().tasks
    const dailyTasks = tasks.filter(t => t.recurrence?.type === 'daily' && t.done)
    
    for (const task of dailyTasks) {
      const { completedAt, ...updates } = toTaskRow({ ...task, done: false, status: 'active' })
      await db.tasks.update(task.id, updates)
    }
    
    set((state) => ({
      tasks: state.tasks.map(t => {
        if (t.recurrence?.type === 'daily' && t.done) {
          const { completedAt, ...rest } = t
          return { ...rest, done: false, status: 'active' }
        }
        return t
      })
    }))
  },
  
  resetWeeklyTasks: async () => {
    const tasks = get().tasks
    const weeklyTasks = tasks.filter(t => t.recurrence?.type === 'weekly' && t.done)
    
    for (const task of weeklyTasks) {
      const { completedAt, ...updates } = toTaskRow({ 
        ...task, 
        done: false, 
        status: 'active',
        completionCount: 0 // Reset completion count for new week
      })
      await db.tasks.update(task.id, updates)
    }
    
    set((state) => ({
      tasks: state.tasks.map(t => {
        if (t.recurrence?.type === 'weekly' && t.done) {
          const { completedAt, ...rest } = t
          return { ...rest, done: false, status: 'active', completionCount: 0 }
        }
        return t
      })
    }))
  },
}))

// Load tasks when the store is first used
if (typeof window !== 'undefined') {
  useTasks.getState().loadTasks()
}
