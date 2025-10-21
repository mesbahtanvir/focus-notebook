import Dexie, { Table } from 'dexie'
import { Task } from '@/store/useTasks'

export type TaskRow = {
  id: string
  title: string
  done: boolean
  category: string
  status: string
  priority: string
  createdAt: string
  dueDate?: string
  completedAt?: string
  notes?: string
  tags?: string
  estimatedMinutes?: number
  recurrence?: string
  parentTaskId?: string
  completionCount?: number
  focusEligible?: boolean
}

// Thoughts table row type
export type ThoughtRow = {
  id: string
  text: string
  type: string
  done: boolean
  createdAt: string
  tags?: string
  intensity?: number
  notes?: string
  cbtAnalysis?: string
}

// Mood entries table row type
export type MoodRow = {
  id: string
  value: number // 1-10
  note?: string
  createdAt: string
}

// Focus session table row type
export type FocusSessionRow = {
  id: string
  duration: number // planned duration in minutes
  startTime: string
  endTime: string
  tasksData: string // JSON serialized FocusTask[]
  feedback?: string
  rating?: number // 1-5
}

class AppDB extends Dexie {
  tasks!: Table<TaskRow, string>
  thoughts!: Table<ThoughtRow, string>
  moods!: Table<MoodRow, string>
  focusSessions!: Table<FocusSessionRow, string>

  constructor() {
    super('personal-notebook')
    this.version(2).stores({
      tasks: '&id, title, done, category, status, createdAt, dueDate, completedAt',
    })
    this.version(3).stores({
      tasks: '&id, title, done, category, status, createdAt, dueDate, completedAt',
      thoughts: '&id, title, done, createdAt',
    })
    this.version(4).stores({
      tasks: '&id, title, done, category, status, createdAt, dueDate, completedAt',
      thoughts: '&id, title, done, createdAt',
      moods: '&id, value, createdAt',
    })
    this.version(5).stores({
      tasks: '&id, title, done, category, status, priority, createdAt, dueDate, completedAt',
      thoughts: '&id, title, done, createdAt',
      moods: '&id, value, createdAt',
    })
    this.version(6).stores({
      tasks: '&id, title, done, category, status, priority, createdAt, dueDate, completedAt',
      thoughts: '&id, text, type, done, createdAt',
      moods: '&id, value, createdAt',
    })
    this.version(7).stores({
      tasks: '&id, title, done, category, status, priority, createdAt, dueDate, completedAt, parentTaskId',
      thoughts: '&id, text, type, done, createdAt',
      moods: '&id, value, createdAt',
    })
    this.version(8).stores({
      tasks: '&id, title, done, category, status, priority, createdAt, dueDate, completedAt, parentTaskId',
      thoughts: '&id, text, type, done, createdAt',
      moods: '&id, value, createdAt',
      focusSessions: '&id, startTime, endTime',
    })
    this.version(9).stores({
      tasks: '&id, title, done, category, status, priority, createdAt, dueDate, completedAt, parentTaskId, focusEligible',
      thoughts: '&id, text, type, done, createdAt',
      moods: '&id, value, createdAt',
      focusSessions: '&id, startTime, endTime',
    })
  }
}

export const db = new AppDB()

// Helper function to convert Task to TaskRow
export function toTaskRow(task: any): TaskRow {
  return {
    id: task.id,
    title: task.title,
    done: task.done,
    category: task.category,
    status: task.status,
    priority: task.priority,
    createdAt: task.createdAt,
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    notes: task.notes,
    tags: task.tags ? JSON.stringify(task.tags) : undefined,
    estimatedMinutes: task.estimatedMinutes,
    recurrence: task.recurrence ? JSON.stringify(task.recurrence) : undefined,
    parentTaskId: task.parentTaskId,
    completionCount: task.completionCount,
    focusEligible: task.focusEligible,
  }
}

// Helper function to convert TaskRow to Task
export function toTask(row: TaskRow): any {
  return {
    id: row.id,
    title: row.title,
    done: row.done,
    category: row.category,
    status: row.status,
    priority: row.priority,
    createdAt: row.createdAt,
    dueDate: row.dueDate,
    completedAt: row.completedAt,
    notes: row.notes,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    estimatedMinutes: row.estimatedMinutes,
    recurrence: row.recurrence ? JSON.parse(row.recurrence) : undefined,
    parentTaskId: row.parentTaskId,
    completionCount: row.completionCount,
    focusEligible: row.focusEligible,
  }
}

// Helper functions for Thought serialization
export function toThoughtRow(thought: any): ThoughtRow {
  return {
    id: thought.id,
    text: thought.text,
    type: thought.type,
    done: thought.done,
    createdAt: thought.createdAt,
    tags: thought.tags ? JSON.stringify(thought.tags) : undefined,
    intensity: thought.intensity,
    notes: thought.notes,
    cbtAnalysis: thought.cbtAnalysis ? JSON.stringify(thought.cbtAnalysis) : undefined,
  }
}

export function toThought(row: ThoughtRow): any {
  return {
    id: row.id,
    text: row.text,
    type: row.type,
    done: row.done,
    createdAt: row.createdAt,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    intensity: row.intensity,
    notes: row.notes,
    cbtAnalysis: row.cbtAnalysis ? JSON.parse(row.cbtAnalysis) : undefined,
  }
}
