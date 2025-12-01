// Mock database for testing
const mockData: {
  tasks: any[]
  thoughts: any[]
  moods: any[]
  focusSessions: any[]
} = {
  tasks: [],
  thoughts: [],
  moods: [],
  focusSessions: [],
}

export const db = {
  tasks: {
    toArray: jest.fn(async () => mockData.tasks),
    add: jest.fn(async (item: any) => {
      mockData.tasks.push(item)
      return item.id
    }),
    update: jest.fn(async (id: string, updates: any) => {
      const index = mockData.tasks.findIndex(t => t.id === id)
      if (index !== -1) {
        mockData.tasks[index] = { ...mockData.tasks[index], ...updates }
      }
    }),
    delete: jest.fn(async (id: string) => {
      mockData.tasks = mockData.tasks.filter(t => t.id !== id)
    }),
    clear: jest.fn(async () => {
      mockData.tasks = []
    }),
  },
  thoughts: {
    toArray: jest.fn(async () => mockData.thoughts),
    add: jest.fn(async (item: any) => {
      // Store the serialized version
      mockData.thoughts.push(item)
      return item.id
    }),
    update: jest.fn(async (id: string, updates: any) => {
      const index = mockData.thoughts.findIndex(t => t.id === id)
      if (index !== -1) {
        // Merge updates with existing data
        mockData.thoughts[index] = { ...mockData.thoughts[index], ...updates }
      }
    }),
    delete: jest.fn(async (id: string) => {
      mockData.thoughts = mockData.thoughts.filter(t => t.id !== id)
    }),
    clear: jest.fn(async () => {
      mockData.thoughts = []
    }),
  },
  moods: {
    toArray: jest.fn(async () => mockData.moods),
    add: jest.fn(async (item: any) => {
      mockData.moods.push(item)
      return item.id
    }),
    update: jest.fn(async (id: string, updates: any) => {
      const index = mockData.moods.findIndex(m => m.id === id)
      if (index !== -1) {
        mockData.moods[index] = { ...mockData.moods[index], ...updates }
      }
    }),
    delete: jest.fn(async (id: string) => {
      mockData.moods = mockData.moods.filter(m => m.id !== id)
    }),
    clear: jest.fn(async () => {
      mockData.moods = []
    }),
  },
  focusSessions: {
    toArray: jest.fn(async () => mockData.focusSessions),
    add: jest.fn(async (item: any) => {
      mockData.focusSessions.push(item)
      return item.id
    }),
    update: jest.fn(async (id: string, updates: any) => {
      const index = mockData.focusSessions.findIndex(s => s.id === id)
      if (index !== -1) {
        mockData.focusSessions[index] = { ...mockData.focusSessions[index], ...updates }
      }
    }),
    delete: jest.fn(async (id: string) => {
      mockData.focusSessions = mockData.focusSessions.filter(s => s.id !== id)
    }),
    clear: jest.fn(async () => {
      mockData.focusSessions = []
    }),
  },
}

// Helper to clear all mock data
export function clearMockDatabase() {
  mockData.tasks = []
  mockData.thoughts = []
  mockData.moods = []
  mockData.focusSessions = []
}

// Export helper functions from the original module
export function toTask(row: any) {
  return row
}

export function toTaskRow(task: any) {
  return task
}

export function toThought(row: any) {
  if (!row) return row
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
    updatedAt: row.updatedAt,
  }
}

export function toThoughtRow(thought: any) {
  if (!thought) return { id: undefined }
  
  const result: any = {}
  
  if (thought.id !== undefined) result.id = thought.id
  if (thought.text !== undefined) result.text = thought.text
  if (thought.type !== undefined) result.type = thought.type
  if (thought.done !== undefined) result.done = thought.done
  if (thought.createdAt !== undefined) result.createdAt = thought.createdAt
  if (thought.tags !== undefined) result.tags = JSON.stringify(thought.tags)
  if (thought.intensity !== undefined) result.intensity = thought.intensity
  if (thought.notes !== undefined) result.notes = thought.notes
  if (thought.cbtAnalysis !== undefined) result.cbtAnalysis = JSON.stringify(thought.cbtAnalysis)
  if (thought.updatedAt !== undefined) result.updatedAt = thought.updatedAt
  
  return result
}

export function toMood(row: any) {
  return row
}

export function toMoodRow(mood: any) {
  return mood
}

export function toFocusSession(row: any) {
  return row
}

export function toFocusSessionRow(session: any) {
  return session
}
