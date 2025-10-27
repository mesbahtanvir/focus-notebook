export interface Task {
  id: string
  title: string
  category: 'mastery' | 'pleasure'
  completed: boolean
  createdAt: number
  isBacklog?: boolean
  estimatedPleasure?: number // 0-100 percentage
}

export interface MoodEntry {
  id: string
  date: string // ISO date string
  mood: number // 1-10 scale
  note?: string
}

// Re-export AISuggestion for shared use
export type { AISuggestion } from '@/store/useThoughts'
