import { create } from 'zustand'
import { db, toTask, toTaskRow } from '@/db'

export type TaskStatus = 'active' | 'completed' | 'backlog'
export type TaskCategory = 'mastery' | 'pleasure'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

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
}

type State = {
  tasks: Task[]
  isLoading: boolean
  loadTasks: () => Promise<void>
  add: (task: Omit<Task, 'id' | 'done'>) => Promise<void>
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
      set({ tasks: tasks.map(toTask), isLoading: false })
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
    }
    
    try {
      await db.tasks.add(toTaskRow(newTask))
      set((state) => ({
        tasks: [...state.tasks, newTask]
      }))
    } catch (error) {
      console.error('Failed to add task:', error)
    }
  },
  
  toggle: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    
    const updatedTask = {
      ...task,
      done: !task.done,
      status: !task.done ? 'completed' : 'active' as TaskStatus,
      completedAt: !task.done ? new Date().toISOString() : undefined
    }
    
    try {
      await db.tasks.update(id, toTaskRow(updatedTask))
      set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? updatedTask : t)
      }))
    } catch (error) {
      console.error('Failed to toggle task:', error)
    }
  },
  
  updateTask: async (id, updates) => {
    try {
      await db.tasks.update(id, updates)
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, ...updates } : task
        ),
      }))
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
