import { create } from 'zustand'
import { Task } from './useTasks'
import { db, FocusSessionRow } from '@/db'

export interface FocusTask {
  task: Task
  timeSpent: number // in seconds
  completed: boolean
  notes?: string // Session notes for this task
  followUpTaskIds?: string[] // IDs of follow-up tasks created
}

export interface FocusSession {
  id: string
  duration: number // total session duration in minutes
  tasks: FocusTask[]
  startTime: string
  endTime?: string
  currentTaskIndex: number
  isActive: boolean
  feedback?: string
  rating?: number
}

type State = {
  currentSession: FocusSession | null
  completedSession: FocusSession | null
  sessions: FocusSession[]
  startSession: (tasks: Task[], duration: number) => void
  endSession: () => Promise<void>
  saveSessionFeedback: (feedback: string, rating: number) => Promise<void>
  clearCompletedSession: () => void
  loadSessions: () => Promise<void>
  switchToTask: (index: number) => void
  markTaskComplete: (index: number) => void
  updateTaskTime: (index: number, seconds: number) => void
  updateTaskNotes: (index: number, notes: string) => void
  addFollowUpTask: (index: number, taskId: string) => void
  pauseSession: () => void
  resumeSession: () => void
}

// Balance tasks between mastery and pleasure
export function selectBalancedTasks(allTasks: Task[], sessionDurationMinutes: number): Task[] {
  // Filter active, non-completed, focus-eligible tasks
  const availableTasks = allTasks.filter(t => !t.done && t.status === 'active' && (t.focusEligible === true || t.focusEligible === undefined))
  
  if (availableTasks.length === 0) return []
  
  // Estimate ~20-30 min per task, adjust based on session duration
  const estimatedTaskCount = Math.max(2, Math.min(Math.ceil(sessionDurationMinutes / 25), 8))
  
  // Separate by category
  const masteryTasks = availableTasks.filter(t => t.category === 'mastery')
  const pleasureTasks = availableTasks.filter(t => t.category === 'pleasure')
  
  // Sort by priority
  const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
  const sortByPriority = (a: Task, b: Task) => 
    priorityOrder[b.priority] - priorityOrder[a.priority]
  
  masteryTasks.sort(sortByPriority)
  pleasureTasks.sort(sortByPriority)
  
  // Balance selection: alternate between mastery and pleasure
  const selected: Task[] = []
  let masteryIndex = 0
  let pleasureIndex = 0
  let pickMastery = true
  
  while (selected.length < estimatedTaskCount) {
    if (pickMastery && masteryIndex < masteryTasks.length) {
      selected.push(masteryTasks[masteryIndex++])
    } else if (!pickMastery && pleasureIndex < pleasureTasks.length) {
      selected.push(pleasureTasks[pleasureIndex++])
    } else if (masteryIndex < masteryTasks.length) {
      selected.push(masteryTasks[masteryIndex++])
    } else if (pleasureIndex < pleasureTasks.length) {
      selected.push(pleasureTasks[pleasureIndex++])
    } else {
      break // No more tasks
    }
    pickMastery = !pickMastery
  }
  
  return selected
}

export const useFocus = create<State>((set, get) => ({
  currentSession: null,
  completedSession: null,
  sessions: [],
  
  startSession: (tasks, duration) => {
    const newSession: FocusSession = {
      id: Date.now().toString(),
      duration,
      tasks: tasks.map(task => ({
        task,
        timeSpent: 0,
        completed: false,
      })),
      startTime: new Date().toISOString(),
      currentTaskIndex: 0,
      isActive: true,
    }
    
    set({ currentSession: newSession })
  },
  
  endSession: async () => {
    const current = get().currentSession
    if (!current) return
    
    const completedSession = {
      ...current,
      endTime: new Date().toISOString(),
      isActive: false,
    }
    
    // Save to database
    try {
      const sessionRow: FocusSessionRow = {
        id: completedSession.id,
        duration: completedSession.duration,
        startTime: completedSession.startTime,
        endTime: completedSession.endTime || new Date().toISOString(),
        tasksData: JSON.stringify(completedSession.tasks),
      }
      await db.focusSessions.add(sessionRow)
    } catch (error) {
      console.error('Failed to save focus session:', error)
    }
    
    set({
      currentSession: null,
      completedSession,
    })
  },
  
  saveSessionFeedback: async (feedback, rating) => {
    const completed = get().completedSession
    if (!completed) return
    
    const updatedSession = {
      ...completed,
      feedback,
      rating,
    }
    
    // Update in database
    try {
      await db.focusSessions.update(completed.id, {
        feedback,
        rating,
      })
      
      set((state) => ({
        completedSession: updatedSession,
        sessions: [...state.sessions, updatedSession],
      }))
    } catch (error) {
      console.error('Failed to save feedback:', error)
    }
  },
  
  clearCompletedSession: () => {
    set({ completedSession: null })
  },
  
  loadSessions: async () => {
    try {
      const rows = await db.focusSessions.orderBy('startTime').reverse().toArray()
      const sessions: FocusSession[] = rows.map(row => ({
        id: row.id,
        duration: row.duration,
        startTime: row.startTime,
        endTime: row.endTime,
        tasks: JSON.parse(row.tasksData),
        currentTaskIndex: 0,
        isActive: false,
        feedback: row.feedback,
        rating: row.rating,
      }))
      set({ sessions })
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  },
  
  switchToTask: (index) => {
    set((state) => {
      if (!state.currentSession) return state
      
      return {
        currentSession: {
          ...state.currentSession,
          currentTaskIndex: index,
        },
      }
    })
  },
  
  markTaskComplete: (index) => {
    set((state) => {
      if (!state.currentSession) return state
      
      const updatedTasks = [...state.currentSession.tasks]
      updatedTasks[index] = {
        ...updatedTasks[index],
        completed: true,
      }
      
      return {
        currentSession: {
          ...state.currentSession,
          tasks: updatedTasks,
        },
      }
    })
  },
  
  updateTaskTime: (index, seconds) => {
    set((state) => {
      if (!state.currentSession) return state
      
      const updatedTasks = [...state.currentSession.tasks]
      updatedTasks[index] = {
        ...updatedTasks[index],
        timeSpent: seconds,
      }
      
      return {
        currentSession: {
          ...state.currentSession,
          tasks: updatedTasks,
        },
      }
    })
  },
  
  updateTaskNotes: (index, notes) => {
    set((state) => {
      if (!state.currentSession) return state
      
      const updatedTasks = [...state.currentSession.tasks]
      updatedTasks[index] = {
        ...updatedTasks[index],
        notes,
      }
      
      return {
        currentSession: {
          ...state.currentSession,
          tasks: updatedTasks,
        },
      }
    })
  },
  
  addFollowUpTask: (index, taskId) => {
    set((state) => {
      if (!state.currentSession) return state
      
      const updatedTasks = [...state.currentSession.tasks]
      const followUpTaskIds = updatedTasks[index].followUpTaskIds || []
      updatedTasks[index] = {
        ...updatedTasks[index],
        followUpTaskIds: [...followUpTaskIds, taskId],
      }
      
      return {
        currentSession: {
          ...state.currentSession,
          tasks: updatedTasks,
        },
      }
    })
  },
  
  pauseSession: () => {
    set((state) => {
      if (!state.currentSession) return state
      
      return {
        currentSession: {
          ...state.currentSession,
          isActive: false,
        },
      }
    })
  },
  
  resumeSession: () => {
    set((state) => {
      if (!state.currentSession) return state
      
      return {
        currentSession: {
          ...state.currentSession,
          isActive: true,
        },
      }
    })
  },
}))
