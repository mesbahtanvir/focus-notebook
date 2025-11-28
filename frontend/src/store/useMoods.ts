import { create } from 'zustand'
import { collection, query, orderBy } from 'firebase/firestore'
import { db, auth } from '@/lib/firebaseClient'
import { createAt, deleteAt } from '@/lib/data/gateway'
import { subscribeCol } from '@/lib/data/subscribe'

export interface MoodEntry {
  id: string
  value: number // 1-10
  note?: string
  createdAt: string | any // Firebase Timestamp or ISO string
  updatedAt?: any // Firebase Timestamp
  updatedBy?: string
  version?: number
  metadata?: {
    sourceThoughtId?: string
    createdBy?: string
    dimensions?: { [emotionId: string]: number } // Store emotion levels
  }
}

type State = {
  moods: MoodEntry[]
  isLoading: boolean
  fromCache: boolean
  hasPendingWrites: boolean
  unsubscribe: (() => void) | null
  subscribe: (userId: string) => void
  add: (entry: Omit<MoodEntry, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>) => Promise<string>
  delete: (id: string) => Promise<void>
}

export const useMoods = create<State>((set, get) => ({
  moods: [],
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

    // Subscribe to moods collection
    const moodsQuery = query(
      collection(db, `users/${userId}/moods`),
      orderBy('createdAt', 'desc')
    )

    const unsub = subscribeCol<MoodEntry>(moodsQuery, (moods, meta) => {
      set({ 
        moods, 
        isLoading: false,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
      })
    })

    set({ unsubscribe: unsub })
  },

  add: async (entry) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')

    const moodId = Date.now().toString()
    const newEntry: Omit<MoodEntry, 'id'> = {
      value: Math.min(10, Math.max(1, Math.round(entry.value))),
      note: entry.note,
      createdAt: new Date().toISOString(),
      metadata: entry.metadata,
    }

    await createAt(`users/${userId}/moods/${moodId}`, newEntry)
    return moodId
  },

  delete: async (id) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')

    await deleteAt(`users/${userId}/moods/${id}`)
  },
}))
