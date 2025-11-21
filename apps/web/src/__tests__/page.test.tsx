// src/__tests__/page.test.tsx
import { render, screen, fireEvent, act } from '@testing-library/react'
import Page from '@/app/page'
import type { Task, TaskStatus, TaskCategory } from '@/store/useTasks'
import { useTasks } from '@/store/useTasks'
import { useThoughts } from '@/store/useThoughts'

// Mock the modules
jest.mock('@/store/useTasks', () => ({
  __esModule: true,
  useTasks: jest.fn(),
}))

jest.mock('@/store/useThoughts', () => ({
  __esModule: true,
  useThoughts: jest.fn(),
}))

describe('Home Page', () => {
  const mockTasks: Task[] = []
  const mockAdd = jest.fn()
  const mockToggle = jest.fn()
  const mockLoadTasks = jest.fn()

  // Mock the Zustand task store
  const mockTaskStore = {
    tasks: mockTasks,
    isLoading: false,
    fromCache: false,
    add: mockAdd,
    toggle: mockToggle,
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    loadTasks: mockLoadTasks,
    getTasksByStatus: (status: TaskStatus) => mockTasks.filter(task => task.status === status),
    getTasksByCategory: (category: TaskCategory) => mockTasks.filter(task => task.category === category),
  }

  // Mock the Zustand thought store
  const mockThoughtStore = {
    thoughts: [],
    isLoading: false,
    fromCache: false,
    add: jest.fn(),
    deleteThought: jest.fn(),
  }

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()

    // Setup the task store mock
    ;(useTasks as unknown as jest.Mock).mockImplementation((selector) => {
      if (selector) {
        return selector(mockTaskStore)
      }
      return mockTaskStore
    })

    // Setup the thought store mock
    ;(useThoughts as unknown as jest.Mock).mockImplementation((selector) => {
      if (selector) {
        return selector(mockThoughtStore)
      }
      return mockThoughtStore
    })
  })

  it('renders empty state', () => {
    render(<Page />)
    expect(screen.getByText(/No thoughts yet/i)).toBeInTheDocument()
  })
})