import { useEffect, useRef } from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useAuth } from '@/contexts/AuthContext'
import { performFullSync } from '@/lib/cloudSync'

/**
 * Hook to handle automatic periodic cloud sync
 * This will sync data to the cloud at the specified interval when enabled
 */
export function useCloudSync() {
  const { user } = useAuth()
  const { 
    cloudSyncEnabled, 
    syncInterval, 
    updateLastSyncTime 
  } = useSettingsStore()
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isSyncingRef = useRef(false)

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Only set up sync if:
    // 1. User is authenticated
    // 2. Cloud sync is enabled
    // 3. Sync interval is valid
    if (!user || !cloudSyncEnabled || syncInterval < 1) {
      return
    }

    // Function to perform sync
    const doSync = async () => {
      // Prevent multiple simultaneous syncs
      if (isSyncingRef.current) {
        console.log('Sync already in progress, skipping...')
        return
      }

      isSyncingRef.current = true
      
      try {
        console.log('Starting automatic cloud sync...')
        const result = await performFullSync()
        
        if (result.success) {
          updateLastSyncTime(result.timestamp)
          console.log('Automatic cloud sync completed successfully')
        } else {
          console.error('Automatic cloud sync failed:', result.error)
        }
      } catch (error) {
        console.error('Error during automatic cloud sync:', error)
      } finally {
        isSyncingRef.current = false
      }
    }

    // Set up periodic sync
    const intervalMs = syncInterval * 60 * 1000 // Convert minutes to milliseconds
    intervalRef.current = setInterval(doSync, intervalMs)

    // Do an initial sync when the hook is first set up
    doSync()

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [user, cloudSyncEnabled, syncInterval, updateLastSyncTime])
}
