import { create } from 'zustand'
import { collection, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'
import { db, auth } from '@/lib/firebaseClient'
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway'
import { subscribeCol } from '@/lib/data/subscribe'

export interface Thought {
  id: string
  text: string
  createdAt: string | any // Firebase Timestamp or ISO string
  updatedAt?: any // Firebase Timestamp
  updatedBy?: string
  version?: number
  tags?: string[]
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
  lastDoc: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
  pageSize: number
  isLoadingMore: boolean
  subscribe: (userId: string, pageSize?: number) => void
  loadMore: (userId: string) => Promise<void>
  add: (data: Omit<Thought, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>) => Promise<void>
  updateThought: (id: string, updates: Partial<Omit<Thought, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>>) => Promise<void>
  deleteThought: (id: string) => Promise<void>
}

export const useThoughts = create<State>((set, get) => ({
  thoughts: [],
  isLoading: true,
  fromCache: false,
  hasPendingWrites: false,
  unsubscribe: null,
  lastDoc: null,
  hasMore: true,
  pageSize: 10,
  isLoadingMore: false,

  subscribe: (userId: string, pageSize = 10) => {
    // Unsubscribe from previous subscription if any
    const currentUnsub = get().unsubscribe
    if (currentUnsub) {
      currentUnsub()
    }

    // Subscribe to thoughts collection with pagination
    const thoughtsQuery = query(
      collection(db, `users/${userId}/thoughts`),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    )

    const unsub = subscribeCol<Thought>(thoughtsQuery, (thoughts, meta) => {
      set({
        thoughts,
        isLoading: false,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
        hasMore: thoughts.length === pageSize,
        pageSize,
      })
    })

    set({ unsubscribe: unsub })
  },

  loadMore: async (userId: string) => {
    const { thoughts, pageSize, isLoadingMore, hasMore } = get()

    if (isLoadingMore || !hasMore) return

    set({ isLoadingMore: true })

    try {
      // Get the last document from current thoughts
      const lastThought = thoughts[thoughts.length - 1]
      if (!lastThought) {
        set({ isLoadingMore: false, hasMore: false })
        return
      }

      // Create query for next page
      const thoughtsRef = collection(db, `users/${userId}/thoughts`)
      const nextQuery = query(
        thoughtsRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastThought.createdAt),
        limit(pageSize)
      )

      const snapshot = await getDocs(nextQuery)
      const newThoughts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Thought[]

      set({
        thoughts: [...thoughts, ...newThoughts],
        hasMore: newThoughts.length === pageSize,
        isLoadingMore: false,
      })
    } catch (error) {
      console.error('Error loading more thoughts:', error)
      set({ isLoadingMore: false })
    }
  },

  add: async (data) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')

    const id = Date.now().toString()
    const newThought: Thought = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    }

    await createAt(`users/${userId}/thoughts/${id}`, newThought)
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
