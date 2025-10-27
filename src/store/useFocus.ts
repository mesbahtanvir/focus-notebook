import { create } from 'zustand'
import { Task } from './useTasks'
import { collection, query, orderBy, where, getDocs } from 'firebase/firestore'
import { db, auth } from '@/lib/firebaseClient'
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway'
import { subscribeCol } from '@/lib/data/subscribe'

export interface FocusTask {
  task: Task
  timeSpent: number // in seconds
  completed: boolean
  notes?: string // Session notes for this task
  followUpTaskIds?: string[] // IDs of follow-up tasks created
}

export interface BreakSession {
  startTime: string
  endTime?: string
  duration: number // in minutes
  type: 'coffee' | 'meditation' | 'stretch'
}

export interface FocusSession {
  id: string
  duration: number // total session duration in minutes
  tasks: FocusTask[]
  startTime: string
  endTime?: string
  currentTaskIndex: number
  isActive: boolean
  isOnBreak: boolean
  currentBreak?: BreakSession
  breaks: BreakSession[]
  feedback?: string
  rating?: number
  pausedAt?: string // timestamp when paused
  totalPausedTime?: number // total time paused in milliseconds
  createdAt?: string | any
  updatedAt?: any
  updatedBy?: string
  version?: number
}

type State = {
  currentSession: FocusSession | null
  completedSession: FocusSession | null
  sessions: FocusSession[]
  isLoading: boolean
  fromCache: boolean
  hasPendingWrites: boolean
  unsubscribe: (() => void) | null
  subscribe: (userId: string) => void
  startSession: (tasks: Task[], duration: number) => Promise<void>
  endSession: (feedback?: string, rating?: number) => Promise<void>
  saveSessionFeedback: (feedback: string, rating: number) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
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
  addTimeToCurrentTask: (minutes: number) => Promise<void>
  nextTask: () => Promise<void>
  previousTask: () => Promise<void>
  startBreak: (type: 'coffee' | 'meditation' | 'stretch', duration: number) => Promise<void>
  endBreak: () => Promise<void>
}

// Balance tasks between mastery and pleasure
export function selectBalancedTasks(allTasks: Task[], sessionDurationMinutes: number): Task[] {
  // Filter active, non-completed, focus-eligible tasks
  const availableTasks = allTasks.filter(t => !t.done && t.status === 'active' && (t.focusEligible === true || t.focusEligible === undefined))
  
  if (availableTasks.length === 0) return []
  
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
  let totalTime = 0
  
  // Keep adding tasks while they fit in the time budget
  while (masteryIndex < masteryTasks.length || pleasureIndex < pleasureTasks.length) {
    let candidate: Task | null = null
    let candidateTime = 0
    
    // Try to pick from the preferred category
    if (pickMastery && masteryIndex < masteryTasks.length) {
      candidate = masteryTasks[masteryIndex]
      candidateTime = candidate.estimatedMinutes || 25
    } else if (!pickMastery && pleasureIndex < pleasureTasks.length) {
      candidate = pleasureTasks[pleasureIndex]
      candidateTime = candidate.estimatedMinutes || 25
    } else if (masteryIndex < masteryTasks.length) {
      // Fallback to mastery if pleasure is exhausted
      candidate = masteryTasks[masteryIndex]
      candidateTime = candidate.estimatedMinutes || 25
    } else if (pleasureIndex < pleasureTasks.length) {
      // Fallback to pleasure if mastery is exhausted
      candidate = pleasureTasks[pleasureIndex]
      candidateTime = candidate.estimatedMinutes || 25
    }
    
    // Check if candidate fits
    if (candidate && totalTime + candidateTime <= sessionDurationMinutes) {
      selected.push(candidate)
      totalTime += candidateTime
      
      // Advance the correct index
      if (masteryTasks.includes(candidate)) {
        masteryIndex++
      } else {
        pleasureIndex++
      }
      
      pickMastery = !pickMastery
    } else {
      // Task doesn't fit, try the other category once
      if (pickMastery && pleasureIndex < pleasureTasks.length) {
        candidate = pleasureTasks[pleasureIndex]
        candidateTime = candidate.estimatedMinutes || 25
        if (totalTime + candidateTime <= sessionDurationMinutes) {
          selected.push(candidate)
          totalTime += candidateTime
          pleasureIndex++
          pickMastery = !pickMastery
          continue
        }
      } else if (!pickMastery && masteryIndex < masteryTasks.length) {
        candidate = masteryTasks[masteryIndex]
        candidateTime = candidate.estimatedMinutes || 25
        if (totalTime + candidateTime <= sessionDurationMinutes) {
          selected.push(candidate)
          totalTime += candidateTime
          masteryIndex++
          pickMastery = !pickMastery
          continue
        }
      }
      
      // If we get here, nothing fits anymore
      break
    }
  }
  
  return selected
}

export const useFocus = create<State>((set, get) => ({
  currentSession: null,
  completedSession: null,
  sessions: [],
  isLoading: true,
  fromCache: false,
  hasPendingWrites: false,
  unsubscribe: null,
  
  subscribe: (userId: string) => {
    // Unsubscribe from previous subscription if any
    const currentUnsub = get().unsubscribe
    if (currentUnsub) {
      currentUnsub()
    }

    // Subscribe to completed sessions only
    const sessionsQuery = query(
      collection(db, `users/${userId}/focusSessions`),
      where('isActive', '==', false),
      orderBy('startTime', 'desc')
    )

    const unsub = subscribeCol<FocusSession>(sessionsQuery, (sessions, meta) => {
      set({ 
        sessions, 
        isLoading: false,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
      })
    })

    set({ unsubscribe: unsub })
  },
  
  startSession: async (tasks, duration) => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    const session: FocusSession = {
      id: `session_${Date.now()}`,
      duration,
      tasks: tasks.map(task => ({
        task,
        timeSpent: 0,
        completed: false,
        notes: '',
        followUpTaskIds: []
      })),
      startTime: new Date().toISOString(),
      currentTaskIndex: 0,
      isActive: true,
      isOnBreak: false,
      breaks: [],
      feedback: '',
      rating: 0,
      totalPausedTime: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser.uid,
      version: 1
    };
    
    set({ currentSession: session })
    
    // Persist to Firestore immediately
    try {
      await createAt(`users/${auth.currentUser.uid}/focusSessions/${session.id}`, {
        duration: session.duration,
        startTime: session.startTime,
        tasksData: JSON.stringify(session.tasks),
        isActive: true,
        isOnBreak: false,
        breaks: [],
        currentTaskIndex: 0,
        totalPausedTime: 0,
        createdAt: session.startTime,
        updatedAt: session.updatedAt,
        updatedBy: session.updatedBy,
        version: session.version
      })
    } catch (error) {
      console.error('Failed to persist focus session:', error)
    }
  },
  
  endSession: async (feedback, rating) => {
    const current = get().currentSession
    if (!current) return
    
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')
    
    const completedSession: FocusSession = {
      ...current,
      endTime: new Date().toISOString(),
      isActive: false,
      isOnBreak: false,
      currentBreak: undefined,
      feedback,
      rating,
    }
    
    // Update Firestore - mark as completed
    try {
      await updateAt(`users/${userId}/focusSessions/${completedSession.id}`, {
        endTime: completedSession.endTime,
        isActive: false,
        isOnBreak: false,
        currentBreak: null,
        tasksData: JSON.stringify(completedSession.tasks),
        feedback,
        rating,
      })
    } catch (error) {
      console.error('Failed to save focus session:', error)
    }
    
    // Set completed session for display
    set({
      currentSession: null,
      completedSession,
    })
  },
  
  saveSessionFeedback: async (feedback, rating) => {
    const completed = get().completedSession
    if (!completed) return
    
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')
    
    const updatedSession = {
      ...completed,
      feedback,
      rating,
    }
    
    // Update in Firestore
    try {
      await updateAt(`users/${userId}/focusSessions/${completed.id}`, {
        feedback,
        rating,
      })
      
      set((state) => ({
        completedSession: updatedSession,
        sessions: state.sessions.map(s => s.id === completed.id ? updatedSession : s),
      }))
    } catch (error) {
      console.error('Failed to save feedback:', error)
    }
  },
  
  clearCompletedSession: () => {
    set({ completedSession: null })
  },
  
  deleteSession: async (sessionId: string) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')
    
    try {
      await deleteAt(`users/${userId}/focusSessions/${sessionId}`)
      
      // Remove from local state
      set((state) => ({
        sessions: state.sessions.filter(s => s.id !== sessionId),
      }))
    } catch (error) {
      console.error('Failed to delete session:', error)
      throw error
    }
  },
  
  loadSessions: async () => {
    // This is now handled by subscribe(), but keep for backward compatibility
    console.log('loadSessions() is deprecated - use subscribe() instead')
  },
  
  loadActiveSession: async () => {
    // Load active session from Firestore on mount
    const userId = auth.currentUser?.uid
    if (!userId) return
    
    try {
      const sessionsQuery = query(
        collection(db, `users/${userId}/focusSessions`),
        where('isActive', '==', true)
      )
      
      const snapshot = await getDocs(sessionsQuery)
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        const data = doc.data()
        
        const session: FocusSession = {
          id: doc.id,
          duration: data.duration,
          startTime: data.startTime,
          endTime: data.endTime,
          tasks: JSON.parse(data.tasksData || '[]'),
          currentTaskIndex: data.currentTaskIndex || 0,
          isActive: false, // Will be resumed when loaded
          isOnBreak: data.isOnBreak || false,
          currentBreak: data.currentBreak || undefined,
          breaks: data.breaks || [],
          feedback: data.feedback,
          rating: data.rating,
          pausedAt: data.pausedAt,
          totalPausedTime: data.totalPausedTime || 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
          version: data.version || 1
        }
        
        // Calculate additional paused time if session was left active
        if (data.pausedAt) {
          const now = new Date().getTime()
          const pausedTime = new Date(data.pausedAt).getTime()
          const additionalPause = now - pausedTime
          session.totalPausedTime = (session.totalPausedTime || 0) + additionalPause
        }
        
        set({ currentSession: session })
        
        // Update Firestore with new pause time
        await updateAt(`users/${userId}/focusSessions/${session.id}`, {
          pausedAt: new Date().toISOString(),
          totalPausedTime: session.totalPausedTime,
        })
      }
    } catch (error) {
      console.error('Failed to load active session:', error)
    }
  },
  
  persistActiveSession: async () => {
    const { currentSession } = get()
    if (!currentSession || !auth.currentUser) return
    
    try {
      await updateAt(`users/${auth.currentUser.uid}/focusSessions/${currentSession.id}`, {
        tasksData: JSON.stringify(currentSession.tasks),
        currentTaskIndex: currentSession.currentTaskIndex,
        isActive: currentSession.isActive,
        isOnBreak: currentSession.isOnBreak,
        currentBreak: currentSession.currentBreak || null,
        breaks: currentSession.breaks || [],
        pausedAt: currentSession.pausedAt,
        totalPausedTime: currentSession.totalPausedTime || 0,
        updatedAt: new Date().toISOString(),
        version: (currentSession.version || 0) + 1
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
    if (!current) return
    
    // If not paused, just ensure active state is true
    if (!current.pausedAt) {
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
  
  addTimeToCurrentTask: async (minutes) => {
    const { currentSession } = get()
    if (!currentSession) return
    
    const currentTask = currentSession.tasks[currentSession.currentTaskIndex]
    if (currentTask) {
      currentTask.timeSpent += minutes * 60
      await get().persistActiveSession()
    }
  },
  
  nextTask: async () => {
    const { currentSession } = get()
    if (!currentSession) return
    
    const nextIndex = currentSession.currentTaskIndex + 1
    if (nextIndex < currentSession.tasks.length) {
      currentSession.currentTaskIndex = nextIndex
      await get().persistActiveSession()
    }
  },
  
  previousTask: async () => {
    const { currentSession } = get()
    if (!currentSession) return
    
    const prevIndex = currentSession.currentTaskIndex - 1
    if (prevIndex >= 0) {
      currentSession.currentTaskIndex = prevIndex
      await get().persistActiveSession()
    }
  },
  
  startBreak: async (type, duration) => {
    const { currentSession } = get()
    if (!currentSession || currentSession.isOnBreak) return
    
    const breakSession: BreakSession = {
      startTime: new Date().toISOString(),
      duration,
      type
    }
    
    // Pause the current session
    await get().pauseSession()
    
    set({
      currentSession: {
        ...currentSession,
        isOnBreak: true,
        currentBreak: breakSession,
      },
    })
    
    // Auto-end break after duration
    setTimeout(() => {
      const { currentSession } = get()
      if (currentSession?.isOnBreak) {
        get().endBreak()
      }
    }, duration * 60 * 1000)
  },
  
  endBreak: async () => {
    const { currentSession } = get()
    if (!currentSession?.isOnBreak || !currentSession.currentBreak) return
    
    const breakEndTime = new Date().toISOString()
    const completedBreak: BreakSession = {
      ...currentSession.currentBreak,
      endTime: breakEndTime,
    }
    
    // Resume the session
    await get().resumeSession()
    
    set({
      currentSession: {
        ...currentSession,
        isOnBreak: false,
        currentBreak: undefined,
        breaks: [...(currentSession.breaks || []), completedBreak],
      },
    })
    
    await get().persistActiveSession()
  },
}))
