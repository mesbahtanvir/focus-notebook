import { create } from 'zustand'

export type RequestStatus = 'pending' | 'in-progress' | 'completed' | 'failed'

export interface RequestLog {
  id: string
  timestamp: string
  type: 'firebase' | 'api' | 'sync'
  method: string
  url: string
  request?: any
  response?: any
  error?: string
  duration?: number
  status?: number
  requestStatus: RequestStatus
  startTime?: number
  endTime?: number
}

interface RequestLogStore {
  logs: RequestLog[]
  queue: RequestLog[]
  addToQueue: (log: Omit<RequestLog, 'id' | 'timestamp' | 'requestStatus'>) => string
  updateRequestStatus: (id: string, status: RequestStatus, data?: Partial<RequestLog>) => void
  addLog: (log: Omit<RequestLog, 'id' | 'timestamp' | 'requestStatus'>) => void
  clearLogs: () => void
  getRecentLogs: (count?: number) => RequestLog[]
  getPendingRequests: () => RequestLog[]
  getInProgressRequests: () => RequestLog[]
}

export const useRequestLog = create<RequestLogStore>((set, get) => ({
  logs: [],
  queue: [],
  
  addToQueue: (logData) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const log: RequestLog = {
      ...logData,
      id,
      timestamp: new Date().toISOString(),
      requestStatus: 'pending',
      startTime: Date.now(),
    }
    
    set((state) => ({
      queue: [log, ...state.queue],
      logs: [log, ...state.logs].slice(0, 100)
    }))
    
    return id
  },
  
  updateRequestStatus: (id, status, data = {}) => {
    const now = Date.now()
    set((state) => {
      const updatedLogs = state.logs.map(log => {
        if (log.id === id) {
          const updated = {
            ...log,
            ...data,
            requestStatus: status,
          }
          
          if (status === 'in-progress' && !log.startTime) {
            updated.startTime = now
          }
          
          if ((status === 'completed' || status === 'failed') && !log.endTime) {
            updated.endTime = now
            updated.duration = log.startTime ? now - log.startTime : undefined
          }
          
          return updated
        }
        return log
      })
      
      const updatedQueue = state.queue.map(log => {
        if (log.id === id) {
          const updated = {
            ...log,
            ...data,
            requestStatus: status,
          }
          
          if (status === 'in-progress' && !log.startTime) {
            updated.startTime = now
          }
          
          if ((status === 'completed' || status === 'failed') && !log.endTime) {
            updated.endTime = now
            updated.duration = log.startTime ? now - log.startTime : undefined
          }
          
          return updated
        }
        return log
      }).filter(log => log.requestStatus === 'pending' || log.requestStatus === 'in-progress') // Remove completed/failed from queue
      
      return {
        logs: updatedLogs,
        queue: updatedQueue
      }
    })
  },
  
  addLog: (logData) => {
    const log: RequestLog = {
      ...logData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      requestStatus: 'completed',
      endTime: Date.now(),
    }
    
    set((state) => ({
      logs: [log, ...state.logs].slice(0, 100)
    }))
  },
  
  clearLogs: () => set({ logs: [], queue: [] }),
  
  getRecentLogs: (count = 20) => {
    return get().logs.slice(0, count)
  },
  
  getPendingRequests: () => {
    return get().queue.filter(log => log.requestStatus === 'pending')
  },
  
  getInProgressRequests: () => {
    return get().queue.filter(log => log.requestStatus === 'in-progress')
  },
}))
