import { db as localDb, SyncHistoryRow } from '@/db'
import { db as firestore, auth } from '@/lib/firebase'
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  writeBatch,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore'
import { useRequestLog } from '@/store/useRequestLog'

/**
 * Log sync operation to local database
 */
async function logSyncOperation(entry: Omit<SyncHistoryRow, 'id' | 'timestamp'>) {
  try {
    await localDb.syncHistory.add({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      ...entry,
    })
  } catch (error) {
    console.error('Failed to log sync operation:', error)
  }
}

interface SyncResult {
  success: boolean
  error?: string
  mergedItems?: number
  conflicts?: number
}

/**
 * Clean undefined values from objects (Firebase doesn't support undefined)
 */
function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null
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
 * Merge strategy: Keep the most recently updated item
 * @param local - Local item
 * @param cloud - Cloud item
 * @returns Merged item
 */
function mergeItems<T extends { id: string; updatedAt?: number; createdAt?: string | number }>(
  local: T | undefined,
  cloud: T | undefined
): T | null {
  // If only one exists, return it
  if (!local && cloud) return cloud
  if (local && !cloud) return local
  if (!local && !cloud) return null

  // Both exist - compare timestamps
  const localTime = local!.updatedAt || new Date(local!.createdAt as string).getTime()
  const cloudTime = cloud!.updatedAt || new Date(cloud!.createdAt as string).getTime()

  // Return the most recent one
  return localTime >= cloudTime ? local! : cloud!
}

/**
 * Intelligent sync: Merges local and cloud data with conflict resolution
 */
export async function smartSync(): Promise<SyncResult> {
  try {
    const user = auth.currentUser
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const userId = user.uid
    let mergedItems = 0
    let conflicts = 0

    // === TASKS SYNC ===
    const [localTasks, cloudTasksSnapshot] = await Promise.all([
      localDb.tasks.toArray(),
      getDocs(collection(firestore, `users/${userId}/tasks`))
    ])

    const cloudTasks = cloudTasksSnapshot.docs.map(doc => doc.data())
    const taskMap = new Map<string, any>()

    // Add local tasks to map
    localTasks.forEach(task => {
      taskMap.set(task.id, { local: task })
    })

    // Add cloud tasks to map
    cloudTasks.forEach(task => {
      const existing = taskMap.get(task.id)
      if (existing) {
        taskMap.set(task.id, { ...existing, cloud: task })
      } else {
        taskMap.set(task.id, { cloud: task })
      }
    })

    // Merge and sync
    const batch = writeBatch(firestore)
    const tasksToUpdate: any[] = []

    for (const [id, { local, cloud }] of taskMap.entries()) {
      const merged = mergeItems(local, cloud)
      if (!merged) continue

      // Count conflicts
      if (local && cloud && local.updatedAt !== cloud.updatedAt) {
        conflicts++
      }

      // Update cloud if needed
      if (!cloud || (local && local.updatedAt && local.updatedAt > (cloud.updatedAt || 0))) {
        const taskRef = doc(firestore, `users/${userId}/tasks`, id)
        const cleanedTask = cleanUndefined({ ...merged, updatedAt: Date.now() })
        batch.set(taskRef, cleanedTask)
      }

      // Queue for local update
      tasksToUpdate.push(merged)
      mergedItems++
    }

    // === THOUGHTS SYNC ===
    const [localThoughts, cloudThoughtsSnapshot] = await Promise.all([
      localDb.thoughts.toArray(),
      getDocs(collection(firestore, `users/${userId}/thoughts`))
    ])

    const cloudThoughts = cloudThoughtsSnapshot.docs.map(doc => doc.data())
    const thoughtMap = new Map<string, any>()

    localThoughts.forEach(thought => {
      thoughtMap.set(thought.id, { local: thought })
    })

    cloudThoughts.forEach(thought => {
      const existing = thoughtMap.get(thought.id)
      if (existing) {
        thoughtMap.set(thought.id, { ...existing, cloud: thought })
      } else {
        thoughtMap.set(thought.id, { cloud: thought })
      }
    })

    const thoughtsToUpdate: any[] = []

    for (const [id, { local, cloud }] of thoughtMap.entries()) {
      const merged = mergeItems(local, cloud)
      if (!merged) continue

      if (local && cloud && local.updatedAt !== cloud.updatedAt) {
        conflicts++
      }

      if (!cloud || (local && local.updatedAt && local.updatedAt > (cloud.updatedAt || 0))) {
        const thoughtRef = doc(firestore, `users/${userId}/thoughts`, id)
        const cleanedThought = cleanUndefined({ ...merged, updatedAt: Date.now() })
        batch.set(thoughtRef, cleanedThought)
      }

      thoughtsToUpdate.push(merged)
      mergedItems++
    }

    // === MOODS SYNC ===
    const [localMoods, cloudMoodsSnapshot] = await Promise.all([
      localDb.moods.toArray(),
      getDocs(collection(firestore, `users/${userId}/moods`))
    ])

    const cloudMoods = cloudMoodsSnapshot.docs.map(doc => doc.data())
    const moodMap = new Map<string, any>()

    localMoods.forEach(mood => {
      moodMap.set(mood.id, { local: mood })
    })

    cloudMoods.forEach(mood => {
      const existing = moodMap.get(mood.id)
      if (existing) {
        moodMap.set(mood.id, { ...existing, cloud: mood })
      } else {
        moodMap.set(mood.id, { cloud: mood })
      }
    })

    const moodsToUpdate: any[] = []

    for (const [id, { local, cloud }] of moodMap.entries()) {
      const merged = mergeItems(local, cloud)
      if (!merged) continue

      if (local && cloud && local.updatedAt !== cloud.updatedAt) {
        conflicts++
      }

      if (!cloud || (local && local.updatedAt && local.updatedAt > (cloud.updatedAt || 0))) {
        const moodRef = doc(firestore, `users/${userId}/moods`, id)
        const cleanedMood = cleanUndefined({ ...merged, updatedAt: Date.now() })
        batch.set(moodRef, cleanedMood)
      }

      moodsToUpdate.push(merged)
      mergedItems++
    }

    // === FOCUS SESSIONS SYNC ===
    const [localSessions, cloudSessionsSnapshot] = await Promise.all([
      localDb.focusSessions.toArray(),
      getDocs(collection(firestore, `users/${userId}/focusSessions`))
    ])

    const cloudSessions = cloudSessionsSnapshot.docs.map(doc => doc.data())
    const sessionMap = new Map<string, any>()

    localSessions.forEach(session => {
      sessionMap.set(session.id, { local: session })
    })

    cloudSessions.forEach(session => {
      const existing = sessionMap.get(session.id)
      if (existing) {
        sessionMap.set(session.id, { ...existing, cloud: session })
      } else {
        sessionMap.set(session.id, { cloud: session })
      }
    })

    const sessionsToUpdate: any[] = []

    for (const [id, { local, cloud }] of sessionMap.entries()) {
      const merged = mergeItems(local, cloud)
      if (!merged) continue

      if (local && cloud && local.updatedAt !== cloud.updatedAt) {
        conflicts++
      }

      if (!cloud || (local && local.updatedAt && local.updatedAt > (cloud.updatedAt || 0))) {
        const sessionRef = doc(firestore, `users/${userId}/focusSessions`, id)
        const cleanedSession = cleanUndefined({ ...merged, updatedAt: Date.now() })
        batch.set(sessionRef, cleanedSession)
      }

      sessionsToUpdate.push(merged)
      mergedItems++
    }

    // Commit cloud updates
    await batch.commit()

    // Update local database with merged data
    await localDb.transaction('rw', [localDb.tasks, localDb.thoughts, localDb.moods, localDb.focusSessions], async () => {
      if (tasksToUpdate.length > 0) {
        await localDb.tasks.clear()
        await localDb.tasks.bulkAdd(tasksToUpdate)
      }
      if (thoughtsToUpdate.length > 0) {
        await localDb.thoughts.clear()
        await localDb.thoughts.bulkAdd(thoughtsToUpdate)
      }
      if (moodsToUpdate.length > 0) {
        await localDb.moods.clear()
        await localDb.moods.bulkAdd(moodsToUpdate)
      }
      if (sessionsToUpdate.length > 0) {
        await localDb.focusSessions.clear()
        await localDb.focusSessions.bulkAdd(sessionsToUpdate)
      }
    })

    console.log(`✅ Smart sync complete: ${mergedItems} items synced, ${conflicts} conflicts resolved`)

    return { 
      success: true, 
      mergedItems,
      conflicts 
    }
  } catch (error) {
    console.error('Smart sync error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Push single item to cloud immediately (for real-time sync)
 * Includes retry logic and better error handling
 */
export async function pushItemToCloud(
  collection: 'tasks' | 'thoughts' | 'moods' | 'focusSessions',
  item: any,
  retries: number = 3
): Promise<boolean> {
  // Emit sync start event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('syncStart'));
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const user = auth.currentUser
      if (!user) {
        console.warn('⚠️ Cannot push to cloud: User not authenticated');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('syncError', { 
            detail: { error: 'Not authenticated' }
          }));
        }
        return false;
      }

      const userId = user.uid
      const itemRef = doc(firestore, `users/${userId}/${collection}`, item.id)
      const cleanedItem = cleanUndefined({ ...item, updatedAt: Date.now() })
      
      await setDoc(itemRef, cleanedItem)
      console.log(`✅ Pushed ${collection}/${item.id} to cloud (attempt ${attempt}/${retries})`);
      
      // Log successful push
      await logSyncOperation({
        operation: 'push',
        collection,
        itemId: item.id,
        status: 'success',
        itemsAffected: 1,
      })
      
      // Emit sync success event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('syncSuccess'));
      }
      
      return true
    } catch (error: any) {
      console.error(`❌ Failed to push ${collection}/${item.id} (attempt ${attempt}/${retries}):`, error);
      
      // If this is the last attempt, log the failure
      if (attempt === retries) {
        const errorMessage = error?.message || error?.code || 'Unknown error';
        console.error(`❌ All ${retries} attempts failed for ${collection}/${item.id}`);
        
        // Log failed push
        await logSyncOperation({
          operation: 'push',
          collection,
          itemId: item.id,
          status: 'failed',
          errorMessage,
        })
        
        // Emit sync error event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('syncError', { 
            detail: { error: errorMessage }
          }));
        }
        
        return false
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  return false;
}

/**
 * Delete item from cloud
 */
export async function deleteItemFromCloud(
  collection: 'tasks' | 'thoughts' | 'moods' | 'focusSessions',
  itemId: string
): Promise<boolean> {
  try {
    const user = auth.currentUser
    if (!user) return false

    const userId = user.uid
    const itemRef = doc(firestore, `users/${userId}/${collection}`, itemId)
    
    await deleteDoc(itemRef)
    console.log(`✅ Deleted ${collection}/${itemId} from cloud`)
    
    // Log successful delete
    await logSyncOperation({
      operation: 'push',
      collection,
      itemId,
      status: 'success',
      details: 'Item deleted from cloud',
    })
    return true
  } catch (error) {
    console.error(`Failed to delete ${collection} item:`, error)
    return false
  }
}
