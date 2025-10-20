import Dexie, { Table } from 'dexie'
import { Task } from '@/store/useTasks'

export type TaskRow = Omit<Task, 'id'> & { id: string }

// Thoughts table row type
export type ThoughtRow = {
  id: string
  text: string
  done: boolean
  createdAt: string
}

// Mood entries table row type
export type MoodRow = {
  id: string
  value: number // 1-10
  note?: string
  createdAt: string
}

class AppDB extends Dexie {
  tasks!: Table<TaskRow, string>
  thoughts!: Table<ThoughtRow, string>
  moods!: Table<MoodRow, string>

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
  }
}

export const db = new AppDB()

// Helper function to convert Task to TaskRow
export function toTaskRow(task: Task): TaskRow {
  return {
    ...task,
    id: task.id,
  }
}

// Helper function to convert TaskRow to Task
export function toTask(row: TaskRow): Task {
  return {
    ...row,
    id: row.id,
  }
}
