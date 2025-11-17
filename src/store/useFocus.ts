import { create } from 'zustand'
import { Task } from './useTasks'
import { collection, query, orderBy, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db, auth } from '@/lib/firebaseClient'
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway'
import { setAt } from '@/lib/data/gateway'
import { subscribeCol } from '@/lib/data/subscribe'
import { TimeTrackingService } from '@/services/TimeTrackingService'
import { EndSessionStep } from '@/components/EndSessionProgress'

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

type TaskOrderPreference = {
  score: number
  updatedAt: string
}

type TaskOrderPreferenceMap = Record<string, TaskOrderPreference>

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

export type EndSessionProgressCallback = (
  step: EndSessionStep,
  status: 'pending' | 'in-progress' | 'completed' | 'error',
  current?: number,
  total?: number,
  error?: string
) => void

type State = {
  currentSession: FocusSession | null
  completedSession: FocusSession | null
  sessions: FocusSession[]
  taskOrderPreferences: TaskOrderPreferenceMap
  isLoading: boolean
  fromCache: boolean
  hasPendingWrites: boolean
  unsubscribe: (() => void) | null
  subscribe: (userId: string) => void
  startSession: (tasks: Task[], duration: number) => Promise<void>
  endSession: (
    feedback?: string,
    rating?: number,
    onProgress?: EndSessionProgressCallback
  ) => Promise<{ success: boolean; failedTasks?: string[] }>
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
  reorderTasks: (fromIndex: number, toIndex: number) => Promise<void>
  addTaskToSession: (task: Task) => Promise<void>
  loadTaskOrderPreferences: () => Promise<void>
  updateTaskOrderPreferences: (orderedTaskIds: string[]) => Promise<void>
  applyTaskOrderPreferences: (tasks: Task[]) => Task[]
}

// Balance tasks between mastery and pleasure
export function selectBalancedTasks(allTasks: Task[], sessionDurationMinutes: number): Task[] {
  // Filter active, non-completed, focus-eligible tasks (status='active' excludes archived, completed, and backlog)
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
  taskOrderPreferences: {},
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

    const unsub = subscribeCol<any>(sessionsQuery, (firestoreSessions, meta) => {
      // Transform Firestore sessions to properly parse tasksData
      const sessions: FocusSession[] = firestoreSessions.map((session: any) => ({
        ...session,
        tasks: session.tasksData ? JSON.parse(session.tasksData) : (session.tasks || []),
      }));

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
  
  endSession: async (feedback, rating, onProgress) => {
    const current = get().currentSession
    if (!current) return { success: false }

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

    const failedTasks: string[] = []

    // Step 1: Save notes (already auto-saved, mark as complete)
    onProgress?.('saving-notes', 'in-progress')
    await new Promise(resolve => setTimeout(resolve, 300)) // Brief delay for UX
    onProgress?.('saving-notes', 'completed')

    // Step 2: Update Firestore - mark session as completed
    onProgress?.('updating-session', 'in-progress')
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
      onProgress?.('updating-session', 'completed')
    } catch (error) {
      console.error('Failed to save focus session:', error)
      onProgress?.('updating-session', 'error', undefined, undefined, 'Failed to save session')
      throw error // This is critical, don't continue
    }

    // Step 3: Update actual time and completion status for each task worked on
    onProgress?.('updating-tasks', 'in-progress')
    const tasksToUpdate = completedSession.tasks.filter(t => t.timeSpent > 0)

    for (let i = 0; i < tasksToUpdate.length; i++) {
      const focusTask = tasksToUpdate[i]
      onProgress?.('updating-tasks', 'in-progress', i + 1, tasksToUpdate.length)

      try {
        // Update task time
        await TimeTrackingService.updateTaskActualTime(
          focusTask.task.id,
          focusTask.timeSpent
        )

        // If task was marked complete during session, update completion status
        if (focusTask.completed && !focusTask.task.done) {
          const { getLocalDateString } = await import('@/lib/utils/date')
          const today = getLocalDateString(new Date())
          const isRecurring = focusTask.task.recurrence && focusTask.task.recurrence.type !== 'none'

          if (isRecurring) {
            // For recurring tasks, add to completion history
            const completionHistory = focusTask.task.completionHistory || []
            const todayCompletion = completionHistory.find((c: any) => c.date === today)

            if (!todayCompletion) {
              await updateAt(`users/${userId}/tasks/${focusTask.task.id}`, {
                done: true,
                completedAt: new Date().toISOString(),
                completionHistory: [
                  ...completionHistory,
                  {
                    date: today,
                    completedAt: new Date().toISOString(),
                    note: 'Completed during focus session'
                  }
                ],
                completionCount: (focusTask.task.completionCount || 0) + 1,
              })
            }
          } else {
            // For one-time tasks, simple completion
            await updateAt(`users/${userId}/tasks/${focusTask.task.id}`, {
              done: true,
              status: 'completed',
              completedAt: new Date().toISOString(),
            })
          }
        }
      } catch (error) {
        console.error(`Failed to update task ${focusTask.task.title}:`, error)
        failedTasks.push(focusTask.task.title)
      }
    }

    if (failedTasks.length > 0) {
      onProgress?.(
        'updating-tasks',
        'error',
        tasksToUpdate.length,
        tasksToUpdate.length,
        `Failed to update ${failedTasks.length} task(s)`
      )
    } else {
      onProgress?.('updating-tasks', 'completed', tasksToUpdate.length, tasksToUpdate.length)
    }

    // Step 4: Calculate stats and prepare summary
    onProgress?.('calculating-stats', 'in-progress')
    await new Promise(resolve => setTimeout(resolve, 300)) // Brief processing time
    onProgress?.('calculating-stats', 'completed')

    // Step 5: Set completed session for display
    set({
      currentSession: null,
      completedSession,
    })
    await get().updateTaskOrderPreferences(completedSession.tasks.map((t) => t.task.id))

    // Step 6: Complete
    onProgress?.('complete', 'completed')

    return {
      success: failedTasks.length === 0,
      failedTasks: failedTasks.length > 0 ? failedTasks : undefined,
    }
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
    // Method deprecated - use subscribe() instead
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

  reorderTasks: async (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return

    set((state) => {
      if (!state.currentSession) return state

      const tasks = [...state.currentSession.tasks]
      if (fromIndex < 0 || fromIndex >= tasks.length || toIndex < 0 || toIndex >= tasks.length) {
        return state
      }

      const [movedTask] = tasks.splice(fromIndex, 1)
      tasks.splice(toIndex, 0, movedTask)

      let currentTaskIndex = state.currentSession.currentTaskIndex

      if (fromIndex === currentTaskIndex) {
        currentTaskIndex = toIndex
      } else if (fromIndex < currentTaskIndex && toIndex >= currentTaskIndex) {
        currentTaskIndex -= 1
      } else if (fromIndex > currentTaskIndex && toIndex <= currentTaskIndex) {
        currentTaskIndex += 1
      }

      return {
        currentSession: {
          ...state.currentSession,
          tasks,
          currentTaskIndex,
        },
      }
    })

    await get().persistActiveSession()
  },

  addTaskToSession: async (task) => {
    set((state) => {
      if (!state.currentSession) return state

      const newFocusTask: FocusTask = {
        task,
        timeSpent: 0,
        completed: false,
        notes: '',
        followUpTaskIds: []
      }

      return {
        currentSession: {
          ...state.currentSession,
          tasks: [...state.currentSession.tasks, newFocusTask],
        },
      }
    })

    await get().persistActiveSession()
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
    const current = get().currentSession
    if (!current) return

    const userId = auth.currentUser?.uid
    if (!userId) {
      return
    }

    // Update actual time for tasks with time spent (partial session)
    try {
      for (const focusTask of current.tasks) {
        if (focusTask.timeSpent > 0) {
          await TimeTrackingService.updateTaskActualTime(
            focusTask.task.id,
            focusTask.timeSpent
          )
        }
      }
    } catch (error) {
      console.error('Failed to update task actual times on pause:', error)
      // Continue with pause even if time update fails
    }

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

  loadTaskOrderPreferences: async () => {
    const userId = auth.currentUser?.uid
    if (!userId) return

    try {
      const prefRef = doc(db, `users/${userId}/preferences/focusTaskOrder`)
      const snapshot = await getDoc(prefRef)
      if (snapshot.exists()) {
        const data = snapshot.data() as { preferences?: TaskOrderPreferenceMap }
        set({ taskOrderPreferences: data.preferences || {} })
      } else {
        set({ taskOrderPreferences: {} })
      }
    } catch (error) {
      console.error('Failed to load focus task order preferences:', error)
    }
  },

  updateTaskOrderPreferences: async (orderedTaskIds) => {
    if (!orderedTaskIds || orderedTaskIds.length === 0) return
    const userId = auth.currentUser?.uid
    if (!userId) return

    const now = new Date().toISOString()
    let updatedPreferences: TaskOrderPreferenceMap = {}

    set((state) => {
      const currentPrefs = state.taskOrderPreferences || {}
      const prefsCopy: TaskOrderPreferenceMap = { ...currentPrefs }

      orderedTaskIds.forEach((taskId, index) => {
        const existing = prefsCopy[taskId]
        const newScore = existing ? (existing.score * 0.7 + index * 0.3) : index
        prefsCopy[taskId] = { score: newScore, updatedAt: now }
      })

      updatedPreferences = prefsCopy
      return { taskOrderPreferences: prefsCopy }
    })

    try {
      await setAt(`users/${userId}/preferences/focusTaskOrder`, {
        preferences: updatedPreferences,
        updatedAt: now,
      })
    } catch (error) {
      console.error('Failed to save focus task order preferences:', error)
    }
  },

  applyTaskOrderPreferences: (tasks) => {
    const prefs = get().taskOrderPreferences
    if (!prefs || Object.keys(prefs).length === 0) {
      return [...tasks]
    }

    const baseOrder = new Map(tasks.map((task, index) => [task.id, index]))

    return [...tasks].sort((a, b) => {
      const prefA = prefs[a.id]?.score
      const prefB = prefs[b.id]?.score

      if (prefA === undefined && prefB === undefined) {
        return (baseOrder.get(a.id) ?? 0) - (baseOrder.get(b.id) ?? 0)
      }
      if (prefA === undefined) return 1
      if (prefB === undefined) return -1
      if (prefA === prefB) {
        return (baseOrder.get(a.id) ?? 0) - (baseOrder.get(b.id) ?? 0)
      }
      return prefA - prefB
    })
  },
}))
