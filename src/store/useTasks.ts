import { create } from 'zustand'
import { db, toTask, toTaskRow } from '@/db'
import { pushItemToCloud, deleteItemFromCloud } from '@/lib/syncEngine'
import { auth } from '@/lib/firebase'

export type TaskStatus = 'active' | 'completed' | 'backlog'
export type TaskCategory = 'mastery' | 'pleasure'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
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
  category: TaskCategory
  status: TaskStatus
  priority: TaskPriority
  createdAt: string
  dueDate?: string
  completedAt?: string
  notes?: string
  tags?: string[]
  estimatedMinutes?: number
  recurrence?: RecurrenceConfig
  parentTaskId?: string // For tracking recurring task instances
  completionCount?: number // Track how many times completed this period
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
  getTasksByCategory: (category: TaskCategory) => Task[]
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
    const newTask = {
      ...task,
      id: Date.now().toString(),
      done: false,
      updatedAt: Date.now(),
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
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    
    const updatedTask = {
      ...task,
      done: !task.done,
      status: !task.done ? 'completed' : 'active' as TaskStatus,
      completedAt: !task.done ? new Date().toISOString() : undefined,
      completionCount: !task.done && task.recurrence?.type !== 'none' 
        ? (task.completionCount || 0) + 1 
        : task.completionCount,
      updatedAt: Date.now(),
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
      const updatesWithTimestamp = { ...updates, updatedAt: Date.now() }
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
    return get().tasks.filter((task) => task.status === status)
  },
  
  getTasksByCategory: (category) => {
    return get().tasks.filter((task) => task.category === category)
  },
}))

// Load tasks when the store is first used
if (typeof window !== 'undefined') {
  useTasks.getState().loadTasks()
}
