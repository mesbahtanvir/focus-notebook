import { renderHook } from '@testing-library/react';
import { useTrackToolUsage } from '@/hooks/useTrackToolUsage';
import React from 'react';

// Mock dependencies
const mockTrackToolClick = jest.fn();
const mockSubscribe = jest.fn();
const mockUser = { uid: 'test-user-123' };

jest.mock('@/store/useToolUsage', () => ({
  useToolUsage: (selector: any) => selector({
    trackToolClick: mockTrackToolClick,
    subscribe: mockSubscribe,
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = require('@/contexts/AuthContext');

describe('useTrackToolUsage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should subscribe and track tool click when user is authenticated', () => {
    useAuth.mockReturnValue({ user: mockUser });

    renderHook(() => useTrackToolUsage('tasks'));

    expect(mockSubscribe).toHaveBeenCalledWith('test-user-123');
    expect(mockTrackToolClick).toHaveBeenCalledWith('tasks');
  });

  it('should not subscribe when user is null', () => {
    useAuth.mockReturnValue({ user: null });

    renderHook(() => useTrackToolUsage('tasks'));

    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(mockTrackToolClick).not.toHaveBeenCalled();
  });

  it('should not subscribe when user is undefined', () => {
    useAuth.mockReturnValue({ user: undefined });

    renderHook(() => useTrackToolUsage('tasks'));

    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(mockTrackToolClick).not.toHaveBeenCalled();
  });

  it('should track different tool names', () => {
    useAuth.mockReturnValue({ user: mockUser });

    const { rerender } = renderHook(
      ({ toolName }) => useTrackToolUsage(toolName),
      { initialProps: { toolName: 'tasks' as any } }
    );

    expect(mockTrackToolClick).toHaveBeenCalledWith('tasks');

    rerender({ toolName: 'thoughts' as any });

    expect(mockTrackToolClick).toHaveBeenCalledWith('thoughts');
  });

  it('should handle user login', () => {
    useAuth.mockReturnValue({ user: null });

    const { rerender } = renderHook(() => useTrackToolUsage('goals'));

    expect(mockSubscribe).not.toHaveBeenCalled();

    // User logs in
    useAuth.mockReturnValue({ user: mockUser });
    rerender();

    expect(mockSubscribe).toHaveBeenCalledWith('test-user-123');
    expect(mockTrackToolClick).toHaveBeenCalledWith('goals');
  });

  it('should handle user logout', () => {
    useAuth.mockReturnValue({ user: mockUser });

    const { rerender } = renderHook(() => useTrackToolUsage('focus'));

    expect(mockSubscribe).toHaveBeenCalledWith('test-user-123');
    expect(mockTrackToolClick).toHaveBeenCalledWith('focus');

    jest.clearAllMocks();

    // User logs out
    useAuth.mockReturnValue({ user: null });
    rerender();

    // Should not call again after logout
    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(mockTrackToolClick).not.toHaveBeenCalled();
  });

  it('should track different tools', () => {
    useAuth.mockReturnValue({ user: mockUser });

    const tools = ['tasks', 'thoughts', 'goals', 'focus', 'spending'] as const;

    tools.forEach((tool) => {
      jest.clearAllMocks();
      renderHook(() => useTrackToolUsage(tool));
      expect(mockTrackToolClick).toHaveBeenCalledWith(tool);
    });
  });

  it('should use correct user ID', () => {
    const user1 = { uid: 'user-1' };
    const user2 = { uid: 'user-2' };

    useAuth.mockReturnValue({ user: user1 });

    const { rerender } = renderHook(() => useTrackToolUsage('tasks'));

    expect(mockSubscribe).toHaveBeenCalledWith('user-1');

    jest.clearAllMocks();

    // Different user logs in
    useAuth.mockReturnValue({ user: user2 });
    rerender();

    expect(mockSubscribe).toHaveBeenCalledWith('user-2');
  });
});
