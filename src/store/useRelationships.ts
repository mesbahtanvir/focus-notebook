import { create } from 'zustand'
import { collection, query, orderBy, Timestamp } from 'firebase/firestore'
import { db, auth } from '@/lib/firebaseClient'
import { createAt, setAt, updateAt, deleteAt } from '@/lib/data/gateway'
import { subscribeCol } from '@/lib/data/subscribe'

export type RelationshipType = 
  | 'friend' 
  | 'family' 
  | 'colleague' 
  | 'romantic' 
  | 'mentor' 
  | 'mentee' 
  | 'acquaintance' 
  | 'other'

export interface ImportantDate {
  type: string // birthday, anniversary, met date, etc.
  date: string
  notes?: string
}

export interface ContactInfo {
  email?: string
  phone?: string
  address?: string
  social?: {
    twitter?: string
    linkedin?: string
    instagram?: string
  }
}

export interface InteractionLog {
  id: string
  date: string
  type: 'call' | 'meeting' | 'message' | 'other'
  summary: string
  mood?: number // 1-10 scale
  notes?: string
}

export interface Person {
  id: string
  name: string
  relationshipType: RelationshipType
  avatar?: string
  contactInfo?: ContactInfo
  importantDates?: ImportantDate[]
  connectionStrength: number // 1-10 scale
  trustLevel: number // 1-10 scale
  interactionLogs?: InteractionLog[]
  lastInteraction?: string // date
  communicationFrequency?: 'daily' | 'weekly' | 'monthly' | 'rarely'
  notes?: string
  tags?: string[]
  createdAt: string | any
  updatedAt?: any
  updatedBy?: string
  version?: number
}

interface State {
  people: Person[]
  loading: boolean
  error: string | null
  add: (data: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => Promise<string>
  update: (id: string, data: Partial<Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>>) => Promise<void>
  delete: (id: string) => Promise<void>
  addInteractionLog: (personId: string, log: Omit<InteractionLog, 'id'>) => Promise<void>
  subscribe: (userId: string) => (() => void) | undefined
}

export const useRelationships = create<State>((set, get) => ({
  people: [],
  loading: false,
  error: null,

  add: async (data) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')
    
    const personId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()
    
    const personData: Omit<Person, 'id'> = {
      ...data,
      createdAt: now,
      updatedAt: now,
      updatedBy: userId,
      version: 1,
    }

    await createAt(`users/${userId}/people/${personId}`, personData)
    return personId
  },

  update: async (id, data) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')
    
    await updateAt(`users/${userId}/people/${id}`, data)
  },

  delete: async (id) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('Not authenticated')

    await deleteAt(`users/${userId}/people/${id}`)
  },

  addInteractionLog: async (personId, log) => {
    const person = get().people.find(p => p.id === personId)
    if (!person) return

    const newLog: InteractionLog = {
      ...log,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }

    const interactionLogs = [...(person.interactionLogs || []), newLog]
    await get().update(personId, { 
      interactionLogs,
      lastInteraction: log.date 
    })
  },

  subscribe: (userId) => {
    if (!db || !userId) return

    const q = query(
      collection(db, 'users', userId, 'people'),
      orderBy('createdAt', 'desc')
    )

    return subscribeCol<Person>(q, (people) => {
      set({ people, loading: false })
    })
  },
}))
