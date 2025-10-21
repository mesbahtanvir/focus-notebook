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
  pausedAt?: string // timestamp when paused
  totalPausedTime?: number // total time paused in milliseconds
}

type State = {
  currentSession: FocusSession | null
  completedSession: FocusSession | null
  sessions: FocusSession[]
  startSession: (tasks: Task[], duration: number) => Promise<void>
  endSession: () => Promise<void>
  saveSessionFeedback: (feedback: string, rating: number) => Promise<void>
  clearCompletedSession: () => void
  loadSessions: () => Promise<void>
  loadActiveSession: () => Promise<void>
  switchToTask: (index: number) => Promise<void>
  markTaskComplete: (index: number) => Promise<void>
  updateTaskTime: (index: number, seconds: number) => Promise<void>
  updateTaskNotes: (index: number, notes: string) => Promise<void>
  addFollowUpTask: (index: number, taskId: string) => Promise<void>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  persistActiveSession: () => Promise<void>
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
  
  startSession: async (tasks, duration) => {
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
      totalPausedTime: 0,
    }
    
    set({ currentSession: newSession })
    
    // Persist to database immediately
    try {
      const sessionRow: FocusSessionRow = {
        id: newSession.id,
        duration: newSession.duration,
        startTime: newSession.startTime,
        tasksData: JSON.stringify(newSession.tasks),
        isActive: true,
        currentTaskIndex: 0,
        totalPausedTime: 0,
      }
      await db.focusSessions.add(sessionRow)
    } catch (error) {
      console.error('Failed to persist focus session:', error)
    }
  },
  
  endSession: async () => {
    const current = get().currentSession
    if (!current) return
    
    const completedSession = {
      ...current,
      endTime: new Date().toISOString(),
      isActive: false,
    }
    
    // Update database - mark as completed
    try {
      await db.focusSessions.update(completedSession.id, {
        endTime: completedSession.endTime,
        isActive: false,
        tasksData: JSON.stringify(completedSession.tasks),
      })
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
      // Filter out active sessions
      const completedRows = rows.filter(row => !row.isActive)
      const sessions: FocusSession[] = completedRows.map(row => ({
        id: row.id,
        duration: row.duration,
        startTime: row.startTime,
        endTime: row.endTime,
        tasks: JSON.parse(row.tasksData),
        currentTaskIndex: row.currentTaskIndex || 0,
        isActive: false,
        feedback: row.feedback,
        rating: row.rating,
        totalPausedTime: row.totalPausedTime || 0,
      }))
      set({ sessions })
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  },
  
  loadActiveSession: async () => {
    try {
      const allSessions = await db.focusSessions.toArray()
      const activeSessions = allSessions.filter(s => s.isActive === true)
      if (activeSessions.length > 0) {
        const row = activeSessions[0]
        const session: FocusSession = {
          id: row.id,
          duration: row.duration,
          startTime: row.startTime,
          endTime: row.endTime,
          tasks: JSON.parse(row.tasksData),
          currentTaskIndex: row.currentTaskIndex || 0,
          isActive: false, // Will be paused when reloaded
          feedback: row.feedback,
          rating: row.rating,
          pausedAt: row.pausedAt,
          totalPausedTime: row.totalPausedTime || 0,
        }
        
        // Calculate additional paused time if session was left active
        if (row.pausedAt) {
          const now = new Date().getTime()
          const pausedTime = new Date(row.pausedAt).getTime()
          const additionalPause = now - pausedTime
          session.totalPausedTime = (session.totalPausedTime || 0) + additionalPause
        }
        
        set({ currentSession: session })
        
        // Update database with new pause time
        await db.focusSessions.update(session.id, {
          pausedAt: new Date().toISOString(),
          totalPausedTime: session.totalPausedTime,
        })
      }
    } catch (error) {
      console.error('Failed to load active session:', error)
    }
  },
  
  persistActiveSession: async () => {
    const current = get().currentSession
    if (!current) return
    
    try {
      await db.focusSessions.update(current.id, {
        tasksData: JSON.stringify(current.tasks),
        currentTaskIndex: current.currentTaskIndex,
        isActive: current.isActive,
        pausedAt: current.pausedAt,
        totalPausedTime: current.totalPausedTime,
      })
    } catch (error) {
      console.error('Failed to persist active session:', error)
    }
  },
  
  switchToTask: async (index) => {
    set((state) => {
      if (!state.currentSession) return state
      
      return {
        currentSession: {
          ...state.currentSession,
          currentTaskIndex: index,
        },
      }
    })
    await get().persistActiveSession()
  },
  
  markTaskComplete: async (index) => {
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
    await get().persistActiveSession()
  },
  
  updateTaskTime: async (index, seconds) => {
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
    await get().persistActiveSession()
  },
  
  updateTaskNotes: async (index, notes) => {
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
    await get().persistActiveSession()
  },
  
  addFollowUpTask: async (index, taskId) => {
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
    await get().persistActiveSession()
  },
  
  pauseSession: async () => {
    set((state) => {
      if (!state.currentSession) return state
      
      return {
        currentSession: {
          ...state.currentSession,
          isActive: false,
          pausedAt: new Date().toISOString(),
        },
      }
    })
    await get().persistActiveSession()
  },
  
  resumeSession: async () => {
    const current = get().currentSession
    if (!current || !current.pausedAt) {
      set((state) => {
        if (!state.currentSession) return state
        return {
          currentSession: {
            ...state.currentSession,
            isActive: true,
          },
        }
      })
      await get().persistActiveSession()
      return
    }
    
    // Calculate pause duration
    const now = new Date().getTime()
    const pausedTime = new Date(current.pausedAt).getTime()
    const pauseDuration = now - pausedTime
    
    set((state) => {
      if (!state.currentSession) return state
      
      return {
        currentSession: {
          ...state.currentSession,
          isActive: true,
          pausedAt: undefined,
          totalPausedTime: (state.currentSession.totalPausedTime || 0) + pauseDuration,
        },
      }
    })
    await get().persistActiveSession()
  },
}))

// Load active session on app startup (client-side only)
if (typeof window !== 'undefined') {
  useFocus.getState().loadActiveSession()
}
