import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  cloudSyncEnabled: boolean
  syncInterval: number // minutes
  lastSyncTime: number | null
}

interface SettingsActions {
  setCloudSyncEnabled: (enabled: boolean) => void
  setSyncInterval: (interval: number) => void
  updateLastSyncTime: (timestamp: number) => void
}

type SettingsStore = SettingsState & SettingsActions

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Initial state
      cloudSyncEnabled: false,
      syncInterval: 5, // Default to 5 minutes
      lastSyncTime: null,

      // Actions
      setCloudSyncEnabled: (enabled) => set({ cloudSyncEnabled: enabled }),
      setSyncInterval: (interval) => set({ syncInterval: interval }),
      updateLastSyncTime: (timestamp) => set({ lastSyncTime: timestamp }),
    }),
    {
      name: 'settings-storage', // name of the item in localStorage
    }
  )
)
