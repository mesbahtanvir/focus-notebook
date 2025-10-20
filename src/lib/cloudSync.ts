import { db as localDb } from '@/db'
import { db as firestore, auth } from '@/lib/firebase'
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  writeBatch,
  query,
  where
} from 'firebase/firestore'
import { useRequestLog } from '@/store/useRequestLog'

interface SyncResult {
  success: boolean
  error?: string
  timestamp: number
}

/**
 * Remove undefined values from an object recursively
 * Firebase doesn't allow undefined values
 */
function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined).filter(item => item !== null && item !== undefined)
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {}
    Object.keys(obj).forEach(key => {
      const value = obj[key]
      if (value !== undefined) {
        cleaned[key] = cleanUndefined(value)
      }
    })
    return cleaned
  }
  
  return obj
}

/**
 * Syncs local data to Firebase Firestore
 */
export async function syncToCloud(): Promise<SyncResult> {
  const startTime = Date.now()
  
  // Add to queue
  const requestId = useRequestLog.getState().addToQueue({
    type: 'sync',
    method: 'syncToCloud',
    url: 'Firebase Firestore',
  })
  
  try {
    const user = auth.currentUser
    if (!user) {
      useRequestLog.getState().updateRequestStatus(requestId, 'failed', {
        error: 'User not authenticated',
        status: 401
      })
      return {
        success: false,
        error: 'User not authenticated',
        timestamp: Date.now()
      }
    }

    const userId = user.uid
    
    // Update to in-progress
    useRequestLog.getState().updateRequestStatus(requestId, 'in-progress', {
      url: `Firebase Firestore - users/${userId}`
    })

    // Get all data from IndexedDB
    const [tasks, thoughts, moods, focusSessions] = await Promise.all([
      localDb.tasks.toArray(),
      localDb.thoughts.toArray(),
      localDb.moods.toArray(),
      localDb.focusSessions.toArray(),
    ])

    const requestData = {
      tasks: tasks.length,
      thoughts: thoughts.length,
      moods: moods.length,
      focusSessions: focusSessions.length,
      userId
    }

    // Use batch writes for better performance
    const batch = writeBatch(firestore)

    // Sync tasks - clean undefined values
    tasks.forEach((task) => {
      const taskRef = doc(firestore, `users/${userId}/tasks`, task.id)
      const cleanedTask = cleanUndefined({ ...task, updatedAt: Date.now() })
      batch.set(taskRef, cleanedTask)
    })

    // Sync thoughts - clean undefined values
    thoughts.forEach((thought) => {
      const thoughtRef = doc(firestore, `users/${userId}/thoughts`, thought.id)
      const cleanedThought = cleanUndefined({ ...thought, updatedAt: Date.now() })
      batch.set(thoughtRef, cleanedThought)
    })

    // Sync moods - clean undefined values
    moods.forEach((mood) => {
      const moodRef = doc(firestore, `users/${userId}/moods`, mood.id)
      const cleanedMood = cleanUndefined({ ...mood, updatedAt: Date.now() })
      batch.set(moodRef, cleanedMood)
    })

    // Sync focus sessions - clean undefined values
    focusSessions.forEach((session) => {
      const sessionRef = doc(firestore, `users/${userId}/focusSessions`, session.id)
      const cleanedSession = cleanUndefined({ ...session, updatedAt: Date.now() })
      batch.set(sessionRef, cleanedSession)
    })

    await batch.commit()

    // Update to completed
    useRequestLog.getState().updateRequestStatus(requestId, 'completed', {
      request: requestData,
      response: { success: true, itemsCount: requestData },
      status: 200
    })

    return {
      success: true,
      timestamp: Date.now()
    }
  } catch (error) {
    console.error('Cloud sync error:', error)
    
    // Update to failed
    useRequestLog.getState().updateRequestStatus(requestId, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 500
    })
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }
  }
}

/**
 * Syncs data from Firebase Firestore to local IndexedDB
 */
export async function syncFromCloud(): Promise<SyncResult> {
  try {
    const user = auth.currentUser
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
        timestamp: Date.now()
      }
    }

    const userId = user.uid

    // Fetch all data from Firestore
    const [tasksSnapshot, thoughtsSnapshot, moodsSnapshot, sessionsSnapshot] = await Promise.all([
      getDocs(collection(firestore, `users/${userId}/tasks`)),
      getDocs(collection(firestore, `users/${userId}/thoughts`)),
      getDocs(collection(firestore, `users/${userId}/moods`)),
      getDocs(collection(firestore, `users/${userId}/focusSessions`)),
    ])

    // Clear local database
    await Promise.all([
      localDb.tasks.clear(),
      localDb.thoughts.clear(),
      localDb.moods.clear(),
      localDb.focusSessions.clear(),
    ])

    // Sync tasks
    const tasks = tasksSnapshot.docs.map(doc => {
      const data = doc.data()
      delete data.updatedAt // Remove sync metadata
      return data
    })
    if (tasks.length > 0) {
      await localDb.tasks.bulkAdd(tasks as any)
    }

    // Sync thoughts
    const thoughts = thoughtsSnapshot.docs.map(doc => {
      const data = doc.data()
      delete data.updatedAt
      return data
    })
    if (thoughts.length > 0) {
      await localDb.thoughts.bulkAdd(thoughts as any)
    }

    // Sync moods
    const moods = moodsSnapshot.docs.map(doc => {
      const data = doc.data()
      delete data.updatedAt
      return data
    })
    if (moods.length > 0) {
      await localDb.moods.bulkAdd(moods as any)
    }

    // Sync focus sessions
    const sessions = sessionsSnapshot.docs.map(doc => {
      const data = doc.data()
      delete data.updatedAt
      return data
    })
    if (sessions.length > 0) {
      await localDb.focusSessions.bulkAdd(sessions as any)
    }

    return {
      success: true,
      timestamp: Date.now()
    }
  } catch (error) {
    console.error('Cloud sync from error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }
  }
}

/**
 * Performs a full bidirectional sync
 * This is a simple implementation - in production, you'd want conflict resolution
 */
export async function performFullSync(): Promise<SyncResult> {
  try {
    // First, push local changes to cloud
    const uploadResult = await syncToCloud()
    if (!uploadResult.success) {
      return uploadResult
    }

    // Then, pull any cloud changes (this will overwrite local in this simple implementation)
    // In a real app, you'd want proper conflict resolution here
    const downloadResult = await syncFromCloud()
    
    return downloadResult
  } catch (error) {
    console.error('Full sync error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }
  }
}
