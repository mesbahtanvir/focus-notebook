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
 * Deep JSON-level merge strategy
 * Combines data from both local and cloud versions field by field
 * @param local - Local item
 * @param cloud - Cloud item
 * @returns Intelligently merged item
 */
function mergeItems<T extends { id: string; updatedAt?: number; createdAt?: string | number }>(
  local: T | undefined,
  cloud: T | undefined
): T | null {
  // If only one exists, return it
  if (!local && cloud) return cloud
  if (local && !cloud) return local
  if (!local && !cloud) return null

  // Both exist - perform deep merge
  const localTime = local!.updatedAt || new Date(local!.createdAt as string).getTime()
  const cloudTime = cloud!.updatedAt || new Date(cloud!.createdAt as string).getTime()

  // Start with the newer version as base
  const base = localTime >= cloudTime ? { ...local! } : { ...cloud! }
  const other = localTime >= cloudTime ? cloud! : local!

  // Get all unique keys from both objects
  const allKeys = new Set([
    ...Object.keys(base),
    ...Object.keys(other)
  ])

  // Merge each field
  const merged: any = { ...base }

  for (const key of allKeys) {
    const baseValue = (base as any)[key]
    const otherValue = (other as any)[key]

    // Skip if same value
    if (JSON.stringify(baseValue) === JSON.stringify(otherValue)) {
      merged[key] = baseValue
      continue
    }

    // If key only exists in other, add it
    if (baseValue === undefined && otherValue !== undefined) {
      merged[key] = otherValue
      continue
    }

    // If key only exists in base, keep it
    if (otherValue === undefined && baseValue !== undefined) {
      merged[key] = baseValue
      continue
    }

    // Both exist but different - merge intelligently based on type
    if (Array.isArray(baseValue) && Array.isArray(otherValue)) {
      // Merge arrays - combine and deduplicate
      merged[key] = mergeArrays(baseValue, otherValue)
    } else if (typeof baseValue === 'object' && baseValue !== null && 
               typeof otherValue === 'object' && otherValue !== null) {
      // Merge nested objects recursively
      merged[key] = deepMergeObjects(baseValue, otherValue)
    } else if (typeof baseValue === 'string' && typeof otherValue === 'string') {
      // For strings, prefer non-empty and longer version
      merged[key] = mergeStrings(baseValue, otherValue, localTime, cloudTime, key === 'notes')
    } else if (typeof baseValue === 'number' && typeof otherValue === 'number') {
      // For numbers, use the larger value unless it's a timestamp
      const isTimestamp = key.toLowerCase().includes('time') || 
                         key.toLowerCase().includes('date') ||
                         key.toLowerCase().includes('at')
      merged[key] = isTimestamp ? Math.max(baseValue, otherValue) : baseValue
    } else {
      // For other types, keep the base value (from newer version)
      merged[key] = baseValue
    }
  }

  // Ensure we preserve the most recent updatedAt timestamp
  merged.updatedAt = Math.max(localTime, cloudTime)

  return merged as T
}

/**
 * Merge two arrays intelligently
 */
function mergeArrays(arr1: any[], arr2: any[]): any[] {
  // For primitive arrays, combine and deduplicate
  const combined = [...arr1, ...arr2]
  
  // If array contains objects, deduplicate by id if available
  if (combined.length > 0 && typeof combined[0] === 'object' && combined[0] !== null) {
    const map = new Map()
    combined.forEach(item => {
      const key = item.id || JSON.stringify(item)
      if (!map.has(key)) {
        map.set(key, item)
      }
    })
    return Array.from(map.values())
  }
  
  // For primitives, use Set to deduplicate
  return Array.from(new Set(combined))
}

/**
 * Deep merge two objects
 */
function deepMergeObjects(obj1: any, obj2: any): any {
  const result: any = { ...obj1 }
  
  for (const key in obj2) {
    if (obj2[key] === undefined) continue
    
    if (obj1[key] === undefined) {
      result[key] = obj2[key]
    } else if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
      result[key] = mergeArrays(obj1[key], obj2[key])
    } else if (typeof obj1[key] === 'object' && obj1[key] !== null &&
               typeof obj2[key] === 'object' && obj2[key] !== null) {
      result[key] = deepMergeObjects(obj1[key], obj2[key])
    } else {
      // Keep obj1 value (from newer version)
      result[key] = obj1[key]
    }
  }
  
  return result
}

/**
 * Merge two strings intelligently
 */
function mergeStrings(str1: string, str2: string, time1: number, time2: number, isNotes: boolean = false): string {
  // If one is empty, use the other
  if (!str1 || str1.trim() === '') return str2
  if (!str2 || str2.trim() === '') return str1
  
  // If identical, return either
  if (str1 === str2) return str1
  
  // For notes, combine both with timestamps if significantly different
  if (isNotes && str1.length > 20 && str2.length > 20) {
    // Check if one contains the other
    if (str1.includes(str2) || str2.includes(str1)) {
      // One is a subset, use the longer one
      return str1.length >= str2.length ? str1 : str2
    }
    
    // Both have substantial different content - combine them
    const date1 = new Date(time1).toLocaleString()
    const date2 = new Date(time2).toLocaleString()
    return `**Version from ${date1}:**\n${str1}\n\n---\n\n**Version from ${date2}:**\n${str2}`
  }
  
  // For other strings, prefer non-empty and longer version
  return str1.length >= str2.length ? str1 : str2
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

      // Count conflicts (when both exist with different data)
      if (local && cloud && JSON.stringify(local) !== JSON.stringify(cloud)) {
        conflicts++
      }

      // Always update cloud with merged data to ensure consistency
      const taskRef = doc(firestore, `users/${userId}/tasks`, id)
      const cleanedTask = cleanUndefined({ ...merged, updatedAt: Date.now() })
      batch.set(taskRef, cleanedTask)

      // Queue for local update (always update local with merged data)
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

      // Count conflicts (when both exist with different data)
      if (local && cloud && JSON.stringify(local) !== JSON.stringify(cloud)) {
        conflicts++
      }

      // Always update cloud with merged data to ensure consistency
      const thoughtRef = doc(firestore, `users/${userId}/thoughts`, id)
      const cleanedThought = cleanUndefined({ ...merged, updatedAt: Date.now() })
      batch.set(thoughtRef, cleanedThought)

      // Queue for local update (always update local with merged data)
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

      // Count conflicts (when both exist with different data)
      if (local && cloud && JSON.stringify(local) !== JSON.stringify(cloud)) {
        conflicts++
      }

      // Always update cloud with merged data to ensure consistency
      const moodRef = doc(firestore, `users/${userId}/moods`, id)
      const cleanedMood = cleanUndefined({ ...merged, updatedAt: Date.now() })
      batch.set(moodRef, cleanedMood)

      // Queue for local update (always update local with merged data)
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

      // Count conflicts (when both exist with different data)
      if (local && cloud && JSON.stringify(local) !== JSON.stringify(cloud)) {
        conflicts++
      }

      // Always update cloud with merged data to ensure consistency
      const sessionRef = doc(firestore, `users/${userId}/focusSessions`, id)
      const cleanedSession = cleanUndefined({ ...merged, updatedAt: Date.now() })
      batch.set(sessionRef, cleanedSession)

      // Queue for local update (always update local with merged data)
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
