import React from 'react';
import { render, screen } from '@testing-library/react';
import { MostUsedTools } from '@/components/MostUsedTools';

// Define the ToolUsageRecord type for tests
type ToolUsageRecord = {
  toolName: string;
  clickCount: number;
  lastAccessed: string;
};

// Mock dependencies
const mockSubscribe = jest.fn();
const mockGetMostUsedTools = jest.fn<ToolUsageRecord[], [number?]>(() => []);
const mockTrackToolClick = jest.fn();

jest.mock('@/store/useToolUsage', () => ({
  useToolUsage: jest.fn((selector) => {
    const state = {
      usageRecords: [],
      isLoading: false,
      fromCache: false,
      hasPendingWrites: false,
      unsubscribe: null,
      subscribe: mockSubscribe,
      trackToolClick: mockTrackToolClick,
      getMostUsedTools: mockGetMostUsedTools,
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { uid: 'test-user-123' },
    loading: false,
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
  })),
}));

describe('MostUsedTools Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMostUsedTools.mockReturnValue([]);
  });

  it('renders call-to-action when no tools have been used', () => {
    mockGetMostUsedTools.mockReturnValue([]);

    render(<MostUsedTools />);

    expect(screen.getByText('Your Tools')).toBeInTheDocument();
    expect(screen.getByText('Start using tools to see your most-used workflows.')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /Browse All Tools/i });
    expect(cta).toHaveAttribute('href', '/tools');
  });

  it('renders most used tools when data is available', () => {
    mockGetMostUsedTools.mockReturnValue([
      { toolName: 'tasks', clickCount: 50, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'thoughts', clickCount: 30, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'goals', clickCount: 20, lastAccessed: '2025-01-01T00:00:00.000Z' },
    ]);

    render(<MostUsedTools />);

    expect(screen.getByText('Most Used Tools')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Thoughts')).toBeInTheDocument();
    expect(screen.getByText('Goals')).toBeInTheDocument();
  });

  it('renders a card for each tool returned by the store', () => {
    const mockData: ToolUsageRecord[] = [
      { toolName: 'tasks', clickCount: 50, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'thoughts', clickCount: 30, lastAccessed: '2025-01-01T00:00:00.000Z' },
    ];
    mockGetMostUsedTools.mockReturnValue(mockData);

    render(<MostUsedTools />);

    const toolLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/tools/'));

    expect(toolLinks).toHaveLength(mockData.length);
    mockData.forEach(({ toolName }) => {
      expect(toolLinks.some((link) => link.getAttribute('href') === `/tools/${toolName}`)).toBe(true);
    });
  });

  it('displays tools without rank badges', () => {
    mockGetMostUsedTools.mockReturnValue([
      { toolName: 'tasks', clickCount: 50, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'thoughts', clickCount: 30, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'goals', clickCount: 20, lastAccessed: '2025-01-01T00:00:00.000Z' },
    ]);

    render(<MostUsedTools />);

    // Verify tools are displayed without rank badges
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Thoughts')).toBeInTheDocument();
    expect(screen.getByText('Goals')).toBeInTheDocument();
    
    // Verify rank numbers are NOT displayed
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('subscribes to tool usage data when user is logged in', () => {
    mockGetMostUsedTools.mockReturnValue([]);

    render(<MostUsedTools />);

    expect(mockSubscribe).toHaveBeenCalledWith('test-user-123');
  });

  it('does not subscribe when user is not logged in', () => {
    const { useAuth } = require('@/contexts/AuthContext');
    useAuth.mockReturnValueOnce({
      user: null,
      loading: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    });

    mockGetMostUsedTools.mockReturnValue([]);

    render(<MostUsedTools />);

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('renders links to tool pages', () => {
    mockGetMostUsedTools.mockReturnValue([
      { toolName: 'tasks', clickCount: 50, lastAccessed: '2025-01-01T00:00:00.000Z' },
    ]);

    render(<MostUsedTools />);

    const link = screen.getByRole('link', { name: /Tasks/ });
    expect(link).toHaveAttribute('href', '/tools/tasks');
  });

  it('displays hint when less than 5 tools are used', () => {
    mockGetMostUsedTools.mockReturnValue([
      { toolName: 'tasks', clickCount: 50, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'thoughts', clickCount: 30, lastAccessed: '2025-01-01T00:00:00.000Z' },
    ]);

    render(<MostUsedTools />);

    expect(screen.getByText(/Use more tools to see your top 5 favorites/)).toBeInTheDocument();
  });

  it('does not display hint when 5 tools are shown', () => {
    mockGetMostUsedTools.mockReturnValue([
      { toolName: 'tasks', clickCount: 50, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'thoughts', clickCount: 40, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'goals', clickCount: 30, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'projects', clickCount: 20, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'focus', clickCount: 10, lastAccessed: '2025-01-01T00:00:00.000Z' },
    ]);

    render(<MostUsedTools />);

    expect(screen.queryByText(/Use more tools to see your top 5 favorites/)).not.toBeInTheDocument();
  });

  it('limits display to 5 tools maximum', () => {
    mockGetMostUsedTools.mockReturnValue([
      { toolName: 'tasks', clickCount: 60, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'thoughts', clickCount: 50, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'goals', clickCount: 40, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'projects', clickCount: 30, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'focus', clickCount: 20, lastAccessed: '2025-01-01T00:00:00.000Z' },
    ]);

    render(<MostUsedTools />);

    const toolLinks = screen.getAllByRole('link').filter(link => link.getAttribute('href')?.startsWith('/tools/'));
    expect(toolLinks).toHaveLength(5);
  });

  it('calls getMostUsedTools with limit of 5', () => {
    mockGetMostUsedTools.mockReturnValue([]);

    render(<MostUsedTools />);

    expect(mockGetMostUsedTools).toHaveBeenCalledWith(5);
  });

  it('handles all tool types correctly', () => {
    const allTools = [
      { toolName: 'tasks' as const, clickCount: 12, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'thoughts' as const, clickCount: 11, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'goals' as const, clickCount: 10, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'projects' as const, clickCount: 9, lastAccessed: '2025-01-01T00:00:00.000Z' },
      { toolName: 'focus' as const, clickCount: 8, lastAccessed: '2025-01-01T00:00:00.000Z' },
    ];

    mockGetMostUsedTools.mockReturnValue(allTools);

    render(<MostUsedTools />);

    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Thoughts')).toBeInTheDocument();
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
  });
});
