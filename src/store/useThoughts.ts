import { create } from 'zustand'
import { db, type ThoughtRow } from '@/db'

export interface Thought {
  id: string
  text: string
  done: boolean
  createdAt: string
}

type State = {
  thoughts: Thought[]
  isLoading: boolean
  loadThoughts: () => Promise<void>
  add: (data: Omit<Thought, 'id' | 'done'>) => Promise<void>
  toggle: (id: string) => Promise<void>
  deleteThought: (id: string) => Promise<void>
}

export const useThoughts = create<State>((set, get) => ({
  thoughts: [],
  isLoading: true,

  loadThoughts: async () => {
    try {
      if (typeof window === 'undefined' || !(window as any).indexedDB || !(db as any)?.thoughts) {
        set({ isLoading: false })
        return
      }
      const rows = await db.thoughts.toArray()
      set({ thoughts: rows as ThoughtRow[], isLoading: false })
    } catch (e) {
      console.error('Failed to load thoughts:', e)
      set({ isLoading: false })
    }
  },

  add: async (data) => {
    const newThought: Thought = {
      id: Date.now().toString(),
      text: data.text,
      createdAt: data.createdAt,
      done: false,
    }
    try {
      if ((db as any)?.thoughts && typeof window !== 'undefined' && (window as any).indexedDB) {
        await db.thoughts.add(newThought as ThoughtRow)
      }
      set((s) => ({ thoughts: [...s.thoughts, newThought] }))
    } catch (e) {
      console.error('Failed to add thought:', e)
    }
  },

  toggle: async (id) => {
    const t = get().thoughts.find((x) => x.id === id)
    if (!t) return
    const updated: Thought = { ...t, done: !t.done }
    try {
      if ((db as any)?.thoughts && typeof window !== 'undefined' && (window as any).indexedDB) {
        await db.thoughts.update(id, updated)
      }
      set((s) => ({ thoughts: s.thoughts.map((x) => (x.id === id ? updated : x)) }))
    } catch (e) {
      console.error('Failed to toggle thought:', e)
    }
  },

  deleteThought: async (id) => {
    try {
      if ((db as any)?.thoughts && typeof window !== 'undefined' && (window as any).indexedDB) {
        await db.thoughts.delete(id)
      }
      set((s) => ({ thoughts: s.thoughts.filter((x) => x.id !== id) }))
    } catch (e) {
      console.error('Failed to delete thought:', e)
    }
  },
}))

// Auto-load client-side
if (typeof window !== 'undefined' && (window as any).indexedDB) {
  useThoughts.getState().loadThoughts()
}
