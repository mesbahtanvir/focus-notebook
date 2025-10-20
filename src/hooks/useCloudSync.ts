import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { performFullSync } from '@/lib/cloudSync'

// Fixed sync interval: 5 minutes
const SYNC_INTERVAL_MINUTES = 5

/**
 * Hook to handle automatic periodic cloud sync
 * Cloud sync is ALWAYS enabled for authenticated users
 */
export function useCloudSync() {
  const { user } = useAuth()
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isSyncingRef = useRef(false)

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Only set up sync if user is authenticated
    if (!user) {
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
          console.log('Automatic cloud sync completed successfully at', new Date().toISOString())
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
    const intervalMs = SYNC_INTERVAL_MINUTES * 60 * 1000 // Convert minutes to milliseconds
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
  }, [user])
}
