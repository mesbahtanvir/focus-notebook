import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { act } from '@testing-library/react'
import MoodTrackerPage from '@/app/tools/moodtracker/page'

// Mock the useMoods store
const mockMoods = jest.fn()
const mockAddMood = jest.fn()

jest.mock('@/store/useMoods', () => ({
  useMoods: (selector: any) => {
    const state = {
      moods: mockMoods(),
      add: mockAddMood,
      isLoading: false,
      fromCache: false,
      hasPendingWrites: false,
      subscribe: jest.fn(),
      delete: jest.fn(),
    }
    
    if (typeof selector === 'function') {
      return selector(state)
    }
    
    return state
  }
}))

// Mock the useThoughts store
jest.mock('@/store/useThoughts', () => ({
  useThoughts: (selector: any) => {
    const state = {
      thoughts: [],
      add: jest.fn(),
      deleteThought: jest.fn(),
      updateThought: jest.fn(),
      subscribe: jest.fn(),
    }
    
    if (typeof selector === 'function') {
      return selector(state)
    }
    
    return state
  }
}))

describe('MoodTracker Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMoods.mockReturnValue([])
  })

  describe('Rendering', () => {
    it('should render the mood tracker title', () => {
      render(<MoodTrackerPage />)
      expect(screen.getByText('💭 Mood Tracker')).toBeInTheDocument()
    })

    it('should render the description', () => {
      render(<MoodTrackerPage />)
      expect(screen.getByText(/Track your emotional state based on Feeling Good principles/i)).toBeInTheDocument()
    })

    it('should render "Rate Your Emotions" heading', () => {
      render(<MoodTrackerPage />)
      expect(screen.getByText('🎭 Rate Your Emotions')).toBeInTheDocument()
    })

    it('should show common emotions by default', () => {
      render(<MoodTrackerPage />)
      
      // Check for common emotions
      expect(screen.getByText('Anxious')).toBeInTheDocument()
      expect(screen.getByText('Sad')).toBeInTheDocument()
      expect(screen.getByText('Stressed')).toBeInTheDocument()
      expect(screen.getByText('Angry')).toBeInTheDocument()
      expect(screen.getByText('Tired')).toBeInTheDocument()
      expect(screen.getByText('Happy')).toBeInTheDocument()
      expect(screen.getByText('Overwhelmed')).toBeInTheDocument()
    })

    it('should render expand button with correct text', () => {
      render(<MoodTrackerPage />)
      expect(screen.getByText(/Show All Emotions/i)).toBeInTheDocument()
    })

    it('should render notes textarea', () => {
      render(<MoodTrackerPage />)
      expect(screen.getByPlaceholderText(/What's affecting your mood/i)).toBeInTheDocument()
    })

    it('should render save button', () => {
      render(<MoodTrackerPage />)
      expect(screen.getByRole('button', { name: /Save Mood/i })).toBeInTheDocument()
    })
  })

  describe('Emotion Sliders', () => {
    it('should render all emotion sliders with initial value of 0', () => {
      render(<MoodTrackerPage />)
      const sliders = screen.getAllByRole('slider')
      
      expect(sliders.length).toBeGreaterThan(0)
      sliders.forEach(slider => {
        expect(slider).toHaveValue('0')
      })
    })

    it('should update slider value when changed', () => {
      render(<MoodTrackerPage />)
      const sliders = screen.getAllByRole('slider')
      const firstSlider = sliders[0]

      fireEvent.change(firstSlider, { target: { value: '50' } })
      
      expect(firstSlider).toHaveValue('50')
    })

    it('should display the percentage value next to slider', () => {
      render(<MoodTrackerPage />)
      const sliders = screen.getAllByRole('slider')
      
      fireEvent.change(sliders[0], { target: { value: '75' } })
      
      // Should show 75 somewhere near the slider
      expect(screen.getByText('75')).toBeInTheDocument()
    })

    it('should allow values from 0 to 100', () => {
      render(<MoodTrackerPage />)
      const slider = screen.getAllByRole('slider')[0]

      fireEvent.change(slider, { target: { value: '0' } })
      expect(slider).toHaveValue('0')

      fireEvent.change(slider, { target: { value: '100' } })
      expect(slider).toHaveValue('100')
    })

    it('should handle multiple emotion sliders independently', () => {
      render(<MoodTrackerPage />)
      const sliders = screen.getAllByRole('slider')

      fireEvent.change(sliders[0], { target: { value: '30' } })
      fireEvent.change(sliders[1], { target: { value: '70' } })
      fireEvent.change(sliders[2], { target: { value: '50' } })

      expect(sliders[0]).toHaveValue('30')
      expect(sliders[1]).toHaveValue('70')
      expect(sliders[2]).toHaveValue('50')
    })
  })

  describe('Expand/Collapse Emotions', () => {
    it('should expand to show all emotions when clicked', async () => {
      render(<MoodTrackerPage />)
      
      const expandButton = screen.getByText(/Show All Emotions/i)
      
      await act(async () => {
        fireEvent.click(expandButton)
      })

      // Should now show additional emotions not in the common list
      expect(screen.getByText('Depressed')).toBeInTheDocument()
      expect(screen.getByText('Hopeless')).toBeInTheDocument()
    })

    it('should change button text after expanding', async () => {
      render(<MoodTrackerPage />)
      
      const expandButton = screen.getByText(/Show All Emotions/i)
      
      await act(async () => {
        fireEvent.click(expandButton)
      })

      expect(screen.getByText(/Show Less/i)).toBeInTheDocument()
    })

    it('should collapse back to common emotions', async () => {
      render(<MoodTrackerPage />)
      
      const expandButton = screen.getByText(/Show All Emotions/i)
      
      await act(async () => {
        fireEvent.click(expandButton)
      })

      expect(screen.getByText('Depressed')).toBeInTheDocument()
      
      const collapseButton = screen.getByText(/Show Less/i)
      
      await act(async () => {
        fireEvent.click(collapseButton)
      })

      expect(screen.queryByText('Depressed')).not.toBeInTheDocument()
    })
  })

  describe('Notes Input', () => {
    it('should update note text when typed', () => {
      render(<MoodTrackerPage />)
      const textarea = screen.getByPlaceholderText(/What's affecting your mood/i) as HTMLTextAreaElement

      fireEvent.change(textarea, { target: { value: 'Had a great day!' } })

      expect(textarea.value).toBe('Had a great day!')
    })

    it('should handle multiline notes', () => {
      render(<MoodTrackerPage />)
      const textarea = screen.getByPlaceholderText(/What's affecting your mood/i) as HTMLTextAreaElement

      const multilineNote = 'Line 1\nLine 2\nLine 3'
      fireEvent.change(textarea, { target: { value: multilineNote } })

      expect(textarea.value).toBe(multilineNote)
    })
  })

  describe('Saving Mood', () => {
    it('should call add function when save button is clicked', async () => {
      render(<MoodTrackerPage />)
      
      const saveButton = screen.getByRole('button', { name: /Save Mood/i })
      
      await act(async () => {
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(mockAddMood).toHaveBeenCalled()
      })
    })

    it('should save mood with emotion slider values', async () => {
      render(<MoodTrackerPage />)
      
      const sliders = screen.getAllByRole('slider')
      fireEvent.change(sliders[0], { target: { value: '70' } })
      fireEvent.change(sliders[1], { target: { value: '30' } })

      const saveButton = screen.getByRole('button', { name: /Save Mood/i })
      
      await act(async () => {
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(mockAddMood).toHaveBeenCalledWith(
          expect.objectContaining({
            note: expect.stringContaining('Emotions:'),
          })
        )
      })
    })

    it('should save mood with note text', async () => {
      render(<MoodTrackerPage />)
      
      const textarea = screen.getByPlaceholderText(/What's affecting your mood/i)
      fireEvent.change(textarea, { target: { value: 'Feeling anxious today' } })

      const saveButton = screen.getByRole('button', { name: /Save Mood/i })
      
      await act(async () => {
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(mockAddMood).toHaveBeenCalledWith(
          expect.objectContaining({
            note: expect.stringContaining('Feeling anxious today'),
          })
        )
      })
    })

    it('should reset sliders after saving', async () => {
      render(<MoodTrackerPage />)
      
      const sliders = screen.getAllByRole('slider')
      fireEvent.change(sliders[0], { target: { value: '50' } })

      const saveButton = screen.getByRole('button', { name: /Save Mood/i })
      
      await act(async () => {
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(sliders[0]).toHaveValue('0')
      })
    })

    it('should reset note text after saving', async () => {
      render(<MoodTrackerPage />)
      
      const textarea = screen.getByPlaceholderText(/What's affecting your mood/i) as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: 'Test note' } })

      const saveButton = screen.getByRole('button', { name: /Save Mood/i })
      
      await act(async () => {
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(textarea.value).toBe('')
      })
    })

    it('should show "Saved!" message after saving', async () => {
      render(<MoodTrackerPage />)
      
      const saveButton = screen.getByRole('button', { name: /Save Mood/i })
      
      await act(async () => {
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/Saved!/i)).toBeInTheDocument()
      })
    })

    it('should disable save button while saving', async () => {
      mockAddMood.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<MoodTrackerPage />)
      
      const saveButton = screen.getByRole('button', { name: /Save Mood/i })
      
      act(() => {
        fireEvent.click(saveButton)
      })

      expect(saveButton).toBeDisabled()
    })
  })

  describe('Recent Entries Display', () => {
    it('should show "No mood entries yet" when there are no moods', () => {
      render(<MoodTrackerPage />)
      
      expect(screen.getByText(/No mood entries yet/i)).toBeInTheDocument()
    })

    it('should display recent mood entries', () => {
      const testMoods = [
        {
          id: '1',
          value: 8,
          note: 'Feeling great!',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          value: 5,
          note: 'Neutral day',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ]

      mockMoods.mockReturnValue(testMoods)
      
      render(<MoodTrackerPage />)
      
      expect(screen.getByText('Feeling great!')).toBeInTheDocument()
      expect(screen.getByText('Neutral day')).toBeInTheDocument()
    })

    it('should display mood value in recent entries', () => {
      const testMoods = [
        {
          id: '1',
          value: 9,
          note: 'Excellent',
          createdAt: new Date().toISOString(),
        },
      ]

      mockMoods.mockReturnValue(testMoods)
      
      render(<MoodTrackerPage />)
      
      expect(screen.getByText('9/10')).toBeInTheDocument()
    })

    it('should display formatted date for entries', () => {
      const fixedDate = new Date('2024-01-15T12:00:00')
      const testMoods = [
        {
          id: '1',
          value: 7,
          note: 'Good mood',
          createdAt: fixedDate.toISOString(),
        },
      ]

      mockMoods.mockReturnValue(testMoods)
      
      render(<MoodTrackerPage />)
      
      // Should show date in some format
      expect(screen.getByText(fixedDate.toLocaleDateString())).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle saving with no emotions selected', async () => {
      render(<MoodTrackerPage />)
      
      const saveButton = screen.getByRole('button', { name: /Save Mood/i })
      
      await act(async () => {
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(mockAddMood).toHaveBeenCalled()
      })
    })

    it('should handle saving with only notes and no emotions', async () => {
      render(<MoodTrackerPage />)
      
      const textarea = screen.getByPlaceholderText(/What's affecting your mood/i)
      fireEvent.change(textarea, { target: { value: 'Just a note' } })

      const saveButton = screen.getByRole('button', { name: /Save Mood/i })
      
      await act(async () => {
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(mockAddMood).toHaveBeenCalledWith(
          expect.objectContaining({
            note: 'Just a note',
          })
        )
      })
    })

    it('should handle very long notes', async () => {
      render(<MoodTrackerPage />)
      
      const longNote = 'A'.repeat(1000)
      const textarea = screen.getByPlaceholderText(/What's affecting your mood/i)
      fireEvent.change(textarea, { target: { value: longNote } })

      const saveButton = screen.getByRole('button', { name: /Save Mood/i })
      
      await act(async () => {
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(mockAddMood).toHaveBeenCalledWith(
          expect.objectContaining({
            note: expect.stringContaining('A'.repeat(100)),
          })
        )
      })
    })
  })
})
