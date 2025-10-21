import { create } from 'zustand'
import { db, type MoodRow } from '@/db'

export interface MoodEntry {
  id: string
  value: number // 1-10
  note?: string
  createdAt: string
  metadata?: {
    sourceThoughtId?: string;
    createdBy?: string;
    dimensions?: { [emotionId: string]: number }; // Store emotion levels
  }
}

type State = {
  moods: MoodEntry[]
  isLoading: boolean
  loadMoods: () => Promise<void>
  add: (entry: Omit<MoodEntry, 'id'>) => Promise<void>
  delete: (id: string) => Promise<void>
}

export const useMoods = create<State>((set, get) => ({
  moods: [],
  isLoading: true,

  loadMoods: async () => {
    try {
      if (typeof window === 'undefined' || !(window as any).indexedDB || !(db as any)?.moods) {
        set({ isLoading: false })
        return
        }
      const rows = await db.moods.toArray()
      set({ moods: rows as MoodRow[], isLoading: false })
    } catch (e) {
      console.error('Failed to load moods:', e)
      set({ isLoading: false })
    }
  },

  add: async (entry) => {
    const newEntry: MoodEntry = {
      id: Date.now().toString(),
      value: Math.min(10, Math.max(1, Math.round(entry.value))),
      note: entry.note,
      createdAt: entry.createdAt,
      metadata: entry.metadata,
    }
    try {
      if ((db as any)?.moods && typeof window !== 'undefined' && (window as any).indexedDB) {
        await db.moods.add(newEntry as MoodRow)
      }
      set((s) => ({ moods: [newEntry, ...s.moods] }))
    } catch (e) {
      console.error('Failed to add mood entry:', e)
    }
  },

  delete: async (id) => {
    try {
      if ((db as any)?.moods && typeof window !== 'undefined' && (window as any).indexedDB) {
        await db.moods.delete(id)
      }
      set((s) => ({ moods: s.moods.filter(m => m.id !== id) }))
    } catch (e) {
      console.error('Failed to delete mood entry:', e)
    }
  },
}))

if (typeof window !== 'undefined' && (window as any).indexedDB) {
  useMoods.getState().loadMoods()
}
