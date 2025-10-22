import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { db as firestore } from '@/lib/firebase'
import { db as localDb } from '@/db/index'
import { 
  collection, 
  query, 
  where,
  onSnapshot,
  Unsubscribe,
  Timestamp
} from 'firebase/firestore'
import { useTasks } from '@/store/useTasks'
import { useThoughts } from '@/store/useThoughts'
import { useSyncStatus } from '@/store/useSyncStatus'

/**
 * Real-time sync hook with Firestore listeners
 * Provides near-instant sync (< 1 second) across devices
 * 
 * Features:
 * - Listens to cloud changes in real-time
 * - Auto-updates local store when changes detected
 * - Incremental updates (only changed items)
 * - Handles offline/online transitions
 */
export function useRealtimeSync() {
  const { user } = useAuth()
  const unsubscribesRef = useRef<Unsubscribe[]>([])
  const lastSyncTimeRef = useRef<{ [key: string]: number }>({})
  const { setSyncStatus, incrementSynced } = useSyncStatus()

  /**
   * Setup listener for a collection
   */
  const setupCollectionListener = useCallback((
    collectionName: 'tasks' | 'thoughts' | 'moods' | 'focusSessions',
    onUpdate: (items: any[]) => Promise<void>
  ) => {
    if (!user) return

    const userId = user.uid
    const lastSync = lastSyncTimeRef.current[collectionName] || 0
    
    // Query for items updated after last sync time
    const collectionRef = collection(firestore, `users/${userId}/${collectionName}`)
    const q = query(
      collectionRef,
      where('updatedAt', '>', lastSync)
    )

    console.log(`🔄 Setting up real-time listener for ${collectionName}`)

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty) {
          console.log(`📭 No new changes in ${collectionName}`)
          return
        }

        const changes = snapshot.docChanges()
        console.log(`📥 Received ${changes.length} changes in ${collectionName}`)

        const items = changes.map(change => change.doc.data())
        
        if (items.length > 0) {
          setSyncStatus('syncing')
          
          try {
            await onUpdate(items)
            
            // Update last sync time
            const maxUpdatedAt = Math.max(...items.map(item => item.updatedAt || 0))
            lastSyncTimeRef.current[collectionName] = maxUpdatedAt
            
            incrementSynced(items.length)
            setSyncStatus('synced')
            
            console.log(`✅ Synced ${items.length} items from ${collectionName}`)
          } catch (error) {
            console.error(`❌ Failed to sync ${collectionName}:`, error)
            setSyncStatus('error')
          }
        }
      },
      (error) => {
        console.error(`❌ Listener error for ${collectionName}:`, error)
        setSyncStatus('error')
      }
    )

    unsubscribesRef.current.push(unsubscribe)
  }, [user, setSyncStatus, incrementSynced])

  /**
   * Merge and update tasks
   */
  const updateTasks = useCallback(async (cloudTasks: any[]) => {
    const localTasks = await localDb.tasks.toArray()
    const localMap = new Map(localTasks.map(t => [t.id, t]))

    for (const cloudTask of cloudTasks) {
      const localTask = localMap.get(cloudTask.id)
      
      // Only update if cloud version is newer or doesn't exist locally
      if (!localTask || (cloudTask.updatedAt || 0) > (localTask.updatedAt || 0)) {
        await localDb.tasks.put(cloudTask)
      }
    }

    // Reload tasks in store
    await useTasks.getState().loadTasks()
  }, [])

  /**
   * Merge and update thoughts
   */
  const updateThoughts = useCallback(async (cloudThoughts: any[]) => {
    const localThoughts = await localDb.thoughts.toArray()
    const localMap = new Map(localThoughts.map(t => [t.id, t]))

    for (const cloudThought of cloudThoughts) {
      const localThought = localMap.get(cloudThought.id)
      
      if (!localThought || (cloudThought.updatedAt || 0) > (localThought.updatedAt || 0)) {
        await localDb.thoughts.put(cloudThought)
      }
    }

    // Reload thoughts in store
    await useThoughts.getState().loadThoughts()
  }, [])

  /**
   * Merge and update moods
   */
  const updateMoods = useCallback(async (cloudMoods: any[]) => {
    const localMoods = await localDb.moods.toArray()
    const localMap = new Map(localMoods.map(m => [m.id, m]))

    for (const cloudMood of cloudMoods) {
      const localMood = localMap.get(cloudMood.id)
      
      if (!localMood || (cloudMood.updatedAt || 0) > (localMood.updatedAt || 0)) {
        await localDb.moods.put(cloudMood)
      }
    }
  }, [])

  /**
   * Merge and update focus sessions
   */
  const updateFocusSessions = useCallback(async (cloudSessions: any[]) => {
    const localSessions = await localDb.focusSessions.toArray()
    const localMap = new Map(localSessions.map(s => [s.id, s]))

    for (const cloudSession of cloudSessions) {
      const localSession = localMap.get(cloudSession.id)
      
      if (!localSession || (cloudSession.updatedAt || 0) > (localSession.updatedAt || 0)) {
        await localDb.focusSessions.put(cloudSession)
      }
    }
  }, [])

  /**
   * Setup all listeners
   */
  useEffect(() => {
    if (!user) {
      // Clean up listeners when user logs out
      unsubscribesRef.current.forEach(unsubscribe => unsubscribe())
      unsubscribesRef.current = []
      lastSyncTimeRef.current = {}
      return
    }

    console.log('🚀 Starting real-time sync listeners')
    setSyncStatus('syncing')

    // Setup listeners for all collections
    setupCollectionListener('tasks', updateTasks)
    setupCollectionListener('thoughts', updateThoughts)
    setupCollectionListener('moods', updateMoods)
    setupCollectionListener('focusSessions', updateFocusSessions)

    // Initial status
    setTimeout(() => setSyncStatus('synced'), 2000)

    // Cleanup function
    return () => {
      console.log('🛑 Stopping real-time sync listeners')
      unsubscribesRef.current.forEach(unsubscribe => unsubscribe())
      unsubscribesRef.current = []
    }
  }, [user, setupCollectionListener, updateTasks, updateThoughts, updateMoods, updateFocusSessions, setSyncStatus])

  return null
}
