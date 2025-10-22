// src/__tests__/page.test.tsx
import { render, screen, fireEvent, act } from '@testing-library/react'
import Page from '@/app/page'
import type { Task, TaskStatus, TaskCategory } from '@/store/useTasks'
import { useTasks } from '@/store/useTasks'

// Mock the module and define useTasks as a jest.fn inside the factory
jest.mock('@/store/useTasks', () => ({
  __esModule: true,
  // This jest.fn will be available via the imported useTasks symbol
  useTasks: jest.fn(),
}))

describe('Home Page', () => {
  const mockTasks: Task[] = []
  const mockAdd = jest.fn()
  const mockToggle = jest.fn()
  const mockLoadTasks = jest.fn()

  // Mock the Zustand store with all required methods and properties
  const mockStore = {
    tasks: mockTasks,
    isLoading: false,
    add: mockAdd,
    toggle: mockToggle,
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    loadTasks: mockLoadTasks,
    getTasksByStatus: (status: TaskStatus) => mockTasks.filter(task => task.status === status),
    getTasksByCategory: (category: TaskCategory) => mockTasks.filter(task => task.category === category),
  }

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    
    // Setup the mock implementation
    ;(useTasks as unknown as jest.Mock).mockImplementation((selector) => {
      if (selector) {
        return selector(mockStore)
      }
      return mockStore
    })
  })

  it('renders empty state', () => {
    render(<Page />)
    expect(screen.getByText(/No thoughts yet/i)).toBeInTheDocument()
  })
})