import { create } from 'zustand'
import { db, toThought, toThoughtRow } from '@/db'

export type ThoughtType = 'task' | 'feeling-good' | 'feeling-bad' | 'neutral'

export interface Thought {
  id: string
  text: string
  type: ThoughtType
  done: boolean
  createdAt: string
  tags?: string[]
  intensity?: number // 1-10 for feelings
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
  loadThoughts: () => Promise<void>
  add: (data: Omit<Thought, 'id' | 'done'>) => Promise<void>
  toggle: (id: string) => Promise<void>
  updateThought: (id: string, updates: Partial<Omit<Thought, 'id'>>) => Promise<void>
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
      set({ thoughts: rows.map(toThought), isLoading: false })
    } catch (e) {
      console.error('Failed to load thoughts:', e)
      set({ isLoading: false })
    }
  },

  add: async (data) => {
    const newThought: Thought = {
      id: Date.now().toString(),
      text: data.text,
      type: data.type,
      createdAt: data.createdAt,
      done: false,
      tags: data.tags,
      intensity: data.intensity,
      cbtAnalysis: data.cbtAnalysis,
    }
    try {
      if ((db as any)?.thoughts && typeof window !== 'undefined' && (window as any).indexedDB) {
        await db.thoughts.add(toThoughtRow(newThought))
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
        await db.thoughts.update(id, toThoughtRow(updated))
      }
      set((s) => ({ thoughts: s.thoughts.map((x) => (x.id === id ? updated : x)) }))
    } catch (e) {
      console.error('Failed to toggle thought:', e)
    }
  },

  updateThought: async (id, updates) => {
    try {
      const serializedUpdates = toThoughtRow({ id, ...updates } as any)
      const { id: _, ...updateData } = serializedUpdates
      
      if ((db as any)?.thoughts && typeof window !== 'undefined' && (window as any).indexedDB) {
        await db.thoughts.update(id, updateData)
      }
      set((s) => ({
        thoughts: s.thoughts.map((thought) =>
          thought.id === id ? { ...thought, ...updates } : thought
        ),
      }))
    } catch (e) {
      console.error('Failed to update thought:', e)
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
