import { create } from 'zustand'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline'

interface SyncState {
  status: SyncStatus
  lastSyncTime: number | null
  itemsSynced: number
  error: string | null
  isOnline: boolean
}

interface SyncActions {
  setSyncStatus: (status: SyncStatus) => void
  setError: (error: string | null) => void
  setOnlineStatus: (isOnline: boolean) => void
  incrementSynced: (count: number) => void
  resetStats: () => void
}

type SyncStatusStore = SyncState & SyncActions

export const useSyncStatus = create<SyncStatusStore>((set) => ({
  // Initial state
  status: 'idle',
  lastSyncTime: null,
  itemsSynced: 0,
  error: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

  // Actions
  setSyncStatus: (status) =>
    set((state) => ({
      status,
      lastSyncTime: status === 'synced' ? Date.now() : state.lastSyncTime,
      error: status === 'synced' ? null : state.error,
    })),

  setError: (error) =>
    set({
      error,
      status: error ? 'error' : 'idle',
    }),

  setOnlineStatus: (isOnline) =>
    set({
      isOnline,
      status: isOnline ? 'idle' : 'offline',
    }),

  incrementSynced: (count) =>
    set((state) => ({
      itemsSynced: state.itemsSynced + count,
    })),

  resetStats: () =>
    set({
      itemsSynced: 0,
      error: null,
    }),
}))

// Hook to track online/offline status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useSyncStatus.getState().setOnlineStatus(true)
  })

  window.addEventListener('offline', () => {
    useSyncStatus.getState().setOnlineStatus(false)
  })
}
