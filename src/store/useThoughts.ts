import { create } from 'zustand'
import { collection, query, orderBy } from 'firebase/firestore'
import { db, auth } from '@/lib/firebaseClient'
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway'
import { subscribeCol } from '@/lib/data/subscribe'

export type ThoughtType = 'task' | 'feeling-good' | 'feeling-bad' | 'neutral'

export interface Thought {
  id: string
  text: string
  type: ThoughtType
  done: boolean
  createdAt: string | any // Firebase Timestamp or ISO string
  updatedAt?: any // Firebase Timestamp
  updatedBy?: string
  version?: number
  tags?: string[]
  intensity?: number // 1-10 for feelings
  notes?: string // Additional notes or conversation data
  isDeepThought?: boolean // Marked for deep reflection
  deepThoughtNotes?: string // Notes from deep thought sessions
  deepThoughtSessionsCount?: number // Track number of deep thought sessions
  cbtAnalysis?: {
    situation?: string
    automaticThought?: string
    emotion?: string
    evidence?: string
    alternativeThought?: string
    outcome?: string
    analyzedAt?: string
  }
}

type State = {
  thoughts: Thought[]
  isLoading: boolean
  fromCache: boolean
  hasPendingWrites: boolean
  unsubscribe: (() => void) | null
  subscribe: (userId: string) => void
  add: (data: Omit<Thought, 'id' | 'done' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>) => Promise<void>
  toggle: (id: string) => Promise<void>
  updateThought: (id: string, updates: Partial<Omit<Thought, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>>) => Promise<void>
  deleteThought: (id: string) => Promise<void>
}

export const useThoughts = create<State>((set, get) => ({
  thoughts: [],
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

    // Subscribe to thoughts collection
    const thoughtsQuery = query(
      collection(db, `users/${userId}/thoughts`),
      orderBy('createdAt', 'desc')
    )

    const unsub = subscribeCol<Thought>(thoughtsQuery, (thoughts, meta) => {
      set({ 
        thoughts, 
        isLoading: false,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
      })
    })

    set({ unsubscribe: unsub })
  },

  add: async (data) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')

    const thoughtId = Date.now().toString()
    const newThought: Omit<Thought, 'id'> = {
      text: data.text,
      type: data.type,
      createdAt: new Date().toISOString(),
      done: false,
      tags: data.tags,
      intensity: data.intensity,
      notes: data.notes,
      cbtAnalysis: data.cbtAnalysis,
    }

    await createAt(`users/${userId}/thoughts/${thoughtId}`, newThought)
  },

  toggle: async (id) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')

    const thought = get().thoughts.find((x) => x.id === id)
    if (!thought) return

    await updateAt(`users/${userId}/thoughts/${id}`, {
      done: !thought.done,
    })
  },

  updateThought: async (id, updates) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')

    await updateAt(`users/${userId}/thoughts/${id}`, updates)
  },

  deleteThought: async (id) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')

    await deleteAt(`users/${userId}/thoughts/${id}`)
  },
}))
