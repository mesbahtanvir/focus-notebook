import { act } from '@testing-library/react'

// Mock indexedDB
const mockIndexedDB = {}
Object.defineProperty(global, 'window', {
  value: { indexedDB: mockIndexedDB },
  writable: true,
})

jest.mock('@/db', () => {
  const rows = new Map<string, any>()
  return {
    __esModule: true,
    __mock: { rows },
    db: {
      moods: {
        toArray: jest.fn(async () => Array.from(rows.values())),
        add: jest.fn(async (row: any) => { rows.set(row.id, { ...row }); return row.id }),
      },
    },
  }
})

describe('useMoods store', () => {
  let useMoods: any
  
  beforeEach(() => {
    // Reset in-memory DB and store state
    const { __mock } = require('@/db') as { __mock: { rows: Map<string, any> } }
    __mock.rows.clear()
    
    // Require store AFTER mock is established
    useMoods = require('@/store/useMoods').useMoods
    useMoods.setState({ moods: [], isLoading: false })
    jest.clearAllMocks()
  })

  describe('add mood entry', () => {
    it('should add a mood entry with all fields and persist to DB', async () => {
      const now = new Date().toISOString()
      await act(async () => {
        await useMoods.getState().add({
          value: 7,
          note: 'Feeling good today!',
          createdAt: now,
        })
      })

      const moods = useMoods.getState().moods
      expect(moods).toHaveLength(1)
      expect(moods[0].value).toBe(7)
      expect(moods[0].note).toBe('Feeling good today!')
      expect(moods[0].createdAt).toBe(now)
      expect(moods[0].id).toBeDefined()

      const { db } = await import('@/db')
      expect((db.moods.add as jest.Mock)).toHaveBeenCalledTimes(1)
    })

    it('should add a mood entry without a note', async () => {
      const now = new Date().toISOString()
      await act(async () => {
        await useMoods.getState().add({
          value: 5,
          createdAt: now,
        })
      })

      const moods = useMoods.getState().moods
      expect(moods).toHaveLength(1)
      expect(moods[0].value).toBe(5)
      expect(moods[0].note).toBeUndefined()
    })

    it('should clamp mood value to minimum of 1', async () => {
      await act(async () => {
        await useMoods.getState().add({
          value: -5,
        })
      })

      const moods = useMoods.getState().moods
      expect(moods[0].value).toBe(1)
    })

    it('should clamp mood value to maximum of 10', async () => {
      await act(async () => {
        await useMoods.getState().add({
          value: 15,
        })
      })

      const moods = useMoods.getState().moods
      expect(moods[0].value).toBe(10)
    })

    it('should round fractional mood values', async () => {
      await act(async () => {
        await useMoods.getState().add({
          value: 7.6,
        })
      })

      const moods = useMoods.getState().moods
      expect(moods[0].value).toBe(8)
    })

    it('should add mood entry with emotion tracking data in note', async () => {
      const emotionNote = `Emotions:
😰 Anxious: 70%
😢 Sad: 30%
😴 Tired: 50%

Additional notes about my day.`

      await act(async () => {
        await useMoods.getState().add({
          value: 6,
          note: emotionNote,
        })
      })

      const moods = useMoods.getState().moods
      expect(moods[0].note).toContain('Anxious: 70%')
      expect(moods[0].note).toContain('Sad: 30%')
      expect(moods[0].note).toContain('Tired: 50%')
    })

    it('should prepend new moods to the list (most recent first)', async () => {
      await act(async () => {
        await useMoods.getState().add({
          value: 5,
          note: 'First entry',
          createdAt: '2024-01-01T00:00:00.000Z',
        })
      })

      // Add delay to ensure different IDs
      await new Promise(resolve => setTimeout(resolve, 10))

      await act(async () => {
        await useMoods.getState().add({
          value: 8,
          note: 'Second entry',
          createdAt: '2024-01-02T00:00:00.000Z',
        })
      })

      const moods = useMoods.getState().moods
      expect(moods).toHaveLength(2)
      expect(moods[0].note).toBe('Second entry')
      expect(moods[1].note).toBe('First entry')
    })

    it('should generate unique IDs for each mood entry', async () => {
      await act(async () => {
        await useMoods.getState().add({
          value: 5,
        })
      })

      // Add a small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10))

      await act(async () => {
        await useMoods.getState().add({
          value: 7,
        })
      })

      const moods = useMoods.getState().moods
      expect(moods[0].id).not.toBe(moods[1].id)
    })
  })

  describe('loadMoods', () => {
    it('should load moods from DB', async () => {
      const now = new Date().toISOString()
      const { __mock } = require('@/db') as { __mock: { rows: Map<string, any> } }
      __mock.rows.set('1', {
        id: '1',
        value: 8,
        note: 'Loaded from DB',
        createdAt: now,
      })
      __mock.rows.set('2', {
        id: '2',
        value: 6,
        note: 'Another entry',
        createdAt: now,
      })

      await act(async () => {
        await useMoods.getState().loadMoods()
      })

      const moods = useMoods.getState().moods
      expect(moods).toHaveLength(2)
      expect(moods.find((m: any) => m.id === '1')?.note).toBe('Loaded from DB')
      expect(moods.find((m: any) => m.id === '2')?.note).toBe('Another entry')
    })

    it('should set isLoading to false after loading', async () => {
      useMoods.setState({ isLoading: true })

      await act(async () => {
        await useMoods.getState().loadMoods()
      })

      expect(useMoods.getState().isLoading).toBe(false)
    })

    it('should handle empty DB gracefully', async () => {
      await act(async () => {
        await useMoods.getState().loadMoods()
      })

      expect(useMoods.getState().moods).toEqual([])
      expect(useMoods.getState().isLoading).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle multiple rapid mood additions', async () => {
      // Add moods sequentially to avoid overlapping act() calls
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await useMoods.getState().add({
            value: i + 1,
          })
        })
        // Small delay to ensure unique IDs
        await new Promise(resolve => setTimeout(resolve, 5))
      }

      const moods = useMoods.getState().moods
      expect(moods).toHaveLength(5)
    })

    it('should handle very long note text', async () => {
      const longNote = 'A'.repeat(5000)
      
      await act(async () => {
        await useMoods.getState().add({
          value: 5,
          note: longNote,
        })
      })

      const moods = useMoods.getState().moods
      expect(moods[0].note?.length).toBe(5000)
    })

    it('should handle special characters in notes', async () => {
      const specialNote = '🎭 Test with émojis & spëcial çharacters! @#$%^&*()'
      
      await act(async () => {
        await useMoods.getState().add({
          value: 7,
          note: specialNote,
        })
      })

      const moods = useMoods.getState().moods
      expect(moods[0].note).toBe(specialNote)
    })
  })
})
