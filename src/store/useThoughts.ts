import { create } from 'zustand'
import { collection, query, orderBy } from 'firebase/firestore'
import { db, auth } from '@/lib/firebaseClient'
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway'
import { subscribeCol } from '@/lib/data/subscribe'
import type { TextChangeType } from '@/constants/aiTags'

export interface TextChange {
  type: TextChangeType
  from: string
  to: string
}

export type AISuggestionType =
  | 'createTask'
  | 'enhanceTask'
  | 'createMood'
  | 'addTag'
  | 'createProject'
  | 'createGoal'
  | 'linkToProject'
  | 'linkToGoal'
  | 'linkToTask'
  | 'linkToPerson'
  | 'linkToRelationship'
  | 'createRelationship'
  | 'linkToMood'
  | 'linkToNote'
  | 'enhanceProject'
  | 'enhanceGoal'
  | 'enhanceRelationship'
  | 'createErrand'
  | 'createNote';

export interface AISuggestion {
  id: string
  type: AISuggestionType
  confidence: number // 0-100
  data: any
  reasoning: string
  createdAt: string
  status: 'pending' | 'accepted' | 'rejected'
  // Track if accepted suggestion created an entity
  createdEntityId?: string
  createdEntityType?: 'task' | 'project' | 'goal' | 'relationship'
}

export interface ProcessingHistoryEntry {
  processedAt: string
  trigger: 'auto' | 'manual' | 'reprocess'
  status: 'completed' | 'failed'
  tokensUsed?: number
  changesApplied: number
  suggestionsCount: number
  revertedAt?: string
  revertedChanges?: any
}

export interface AIAppliedChanges {
  textEnhanced: boolean
  textChanges?: TextChange[]
  tagsAdded: string[]
  appliedAt: string
  appliedBy: 'auto' | 'manual-trigger'
}

export interface ManualEdits {
  textEditedAfterAI: boolean
  tagsAddedManually: string[]
  tagsRemovedManually: string[]
  lastManualEditAt?: string
}

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

  // ===== AI PROCESSING FIELDS =====

  // Processing State
  aiProcessingStatus?: 'pending' | 'processing' | 'completed' | 'failed' | 'blocked'
  aiError?: string

  // Original Data (for revert)
  originalText?: string  // Text before AI enhancement
  originalTags?: string[]  // Tags before AI processing

  // Applied Changes Tracking
  aiAppliedChanges?: AIAppliedChanges

  // Manual Edits Tracking (after AI processing)
  manualEdits?: ManualEdits

  // Processing History
  processingHistory?: ProcessingHistoryEntry[]

  // Reprocess Counter
  reprocessCount?: number

  // AI Suggestions
  aiSuggestions?: AISuggestion[]
  confidenceScore?: number

  // Linked items (for manual linking)
  linkedTaskIds?: string[] // Tasks manually linked to this thought
  linkedMoodIds?: string[] // Mood entries manually linked to this thought
  linkedProjectIds?: string[] // Projects manually linked to this thought
  linkedGoalIds?: string[] // Goals manually linked to this thought
  linkedPersonIds?: string[] // People manually linked to this thought
}

type State = {
  thoughts: Thought[]
  isLoading: boolean
  fromCache: boolean
  hasPendingWrites: boolean
  syncError: Error | null
  isSubscribed: boolean
  unsubscribe: (() => void) | null
  subscribe: (userId: string) => void
  add: (data: Omit<Thought, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>) => Promise<void>
  updateThought: (id: string, updates: Partial<Omit<Thought, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>>) => Promise<void>
  deleteThought: (id: string) => Promise<void>
}

export const useThoughts = create<State>((set, get) => ({
  thoughts: [],
  isLoading: true,
  fromCache: false,
  hasPendingWrites: false,
  syncError: null,
  isSubscribed: false,
  unsubscribe: null,

  subscribe: (userId: string) => {
    // Unsubscribe from previous subscription if any
    const currentUnsub = get().unsubscribe
    if (currentUnsub) {
      currentUnsub()
    }

    console.log('[useThoughts] Starting subscription for user:', userId);

    try {
      // Mark subscription as started
      set({ isSubscribed: true, isLoading: true, syncError: null })

      // Subscribe to ALL thoughts (no pagination)
      const thoughtsQuery = query(
        collection(db, `users/${userId}/thoughts`),
        orderBy('createdAt', 'desc')
      )

      const unsub = subscribeCol<Thought>(thoughtsQuery, (thoughts, meta) => {
        console.log('[useThoughts] Snapshot received:', {
          thoughtCount: thoughts.length,
          fromCache: meta.fromCache,
          hasError: !!meta.error,
          error: meta.error?.message
        });

        set({
          thoughts,
          isLoading: false,
          fromCache: meta.fromCache,
          hasPendingWrites: meta.hasPendingWrites,
          syncError: meta.error || null,
        })

        // Log sync errors to help with debugging
        if (meta.error) {
          console.error('[useThoughts] Sync error:', meta.error);
        }
      })

      set({ unsubscribe: unsub })
    } catch (error) {
      console.error('[useThoughts] Failed to set up subscription:', error);
      set({
        isLoading: false,
        syncError: error as Error,
        isSubscribed: false,
      })
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

    const thought = get().thoughts.find(t => t.id === id)
    if (!thought) {
      await updateAt(`users/${userId}/thoughts/${id}`, updates)
      return
    }

    // Track manual edits after AI processing
    const isManualEdit = thought.aiAppliedChanges && (
      (updates.text && updates.text !== thought.text) ||
      (updates.tags && JSON.stringify(updates.tags) !== JSON.stringify(thought.tags))
    )

    if (isManualEdit) {
      const manualEdits: ManualEdits = {
        textEditedAfterAI: !!(updates.text && updates.text !== thought.text),
        tagsAddedManually: updates.tags
          ? updates.tags.filter(t => !(thought.tags || []).includes(t))
          : [],
        tagsRemovedManually: thought.tags
          ? thought.tags.filter(t => !(updates.tags || []).includes(t))
          : [],
        lastManualEditAt: new Date().toISOString()
      }

      updates = { ...updates, manualEdits }
    }

    await updateAt(`users/${userId}/thoughts/${id}`, updates)
  },

  deleteThought: async (id) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')

    await deleteAt(`users/${userId}/thoughts/${id}`)
  },
}))
