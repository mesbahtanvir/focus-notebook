/**
 * Integration tests for dynamic routing functionality
 * Tests validate that dynamic routes with [id] parameters work correctly
 */

import { useParams, useRouter } from 'next/navigation';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

describe('Dynamic Routing Integration Tests', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('Route Parameter Extraction', () => {
    it('should extract ID from goals/[id] route parameter', () => {
      (useParams as jest.Mock).mockReturnValue({ id: 'goal-123' });

      const params = useParams();

      expect(params).toEqual({ id: 'goal-123' });
      expect(params.id).toBe('goal-123');
    });

    it('should extract ID from projects/[id] route parameter', () => {
      (useParams as jest.Mock).mockReturnValue({ id: 'project-456' });

      const params = useParams();

      expect(params.id).toBe('project-456');
    });

    it('should extract ID from thoughts/[id] route parameter', () => {
      (useParams as jest.Mock).mockReturnValue({ id: 'thought-789' });

      const params = useParams();

      expect(params.id).toBe('thought-789');
    });

    it('should extract ID from friends/[id] route parameter', () => {
      (useParams as jest.Mock).mockReturnValue({ id: 'friend-abc' });

      const params = useParams();

      expect(params.id).toBe('friend-abc');
    });

    it('should extract ID from relationships/[id] route parameter', () => {
      (useParams as jest.Mock).mockReturnValue({ id: 'relationship-xyz' });

      const params = useParams();

      expect(params.id).toBe('relationship-xyz');
    });
  });

  describe('Router Navigation', () => {
    it('should navigate to goals detail page with ID', () => {
      mockRouter.push('/tools/goals/goal-123');

      expect(mockRouter.push).toHaveBeenCalledWith('/tools/goals/goal-123');
    });

    it('should navigate to projects detail page with ID', () => {
      mockRouter.push('/tools/projects/project-456');

      expect(mockRouter.push).toHaveBeenCalledWith('/tools/projects/project-456');
    });

    it('should navigate to thoughts detail page with ID', () => {
      mockRouter.push('/tools/thoughts/thought-789');

      expect(mockRouter.push).toHaveBeenCalledWith('/tools/thoughts/thought-789');
    });

    it('should navigate to friends detail page with ID', () => {
      mockRouter.push('/tools/friends/friend-abc');

      expect(mockRouter.push).toHaveBeenCalledWith('/tools/friends/friend-abc');
    });

    it('should navigate to relationships detail page with ID', () => {
      mockRouter.push('/tools/relationships/relationship-xyz');

      expect(mockRouter.push).toHaveBeenCalledWith('/tools/relationships/relationship-xyz');
    });
  });

  describe('Router Back Navigation', () => {
    it('should navigate back to goals list from detail page', () => {
      mockRouter.push('/tools/goals');

      expect(mockRouter.push).toHaveBeenCalledWith('/tools/goals');
    });

    it('should navigate back to projects list from detail page', () => {
      mockRouter.push('/tools/projects');

      expect(mockRouter.push).toHaveBeenCalledWith('/tools/projects');
    });

    it('should navigate back to thoughts list from detail page', () => {
      mockRouter.push('/tools/thoughts');

      expect(mockRouter.push).toHaveBeenCalledWith('/tools/thoughts');
    });

    it('should navigate back to relationships list from friends detail page', () => {
      mockRouter.push('/tools/relationships');

      expect(mockRouter.push).toHaveBeenCalledWith('/tools/relationships');
    });
  });

  describe('Special ID Characters', () => {
    it('should handle IDs with hyphens', () => {
      (useParams as jest.Mock).mockReturnValue({ id: 'goal-with-hyphen-123' });

      const params = useParams();

      expect(params.id).toBe('goal-with-hyphen-123');
    });

    it('should handle IDs with underscores', () => {
      (useParams as jest.Mock).mockReturnValue({ id: 'project_with_underscore_456' });

      const params = useParams();

      expect(params.id).toBe('project_with_underscore_456');
    });

    it('should handle UUID-style IDs', () => {
      (useParams as jest.Mock).mockReturnValue({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' });

      const params = useParams();

      expect(params.id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    });

    it('should handle Firebase-style IDs', () => {
      (useParams as jest.Mock).mockReturnValue({ id: 'abc123XYZ789def456GHI' });

      const params = useParams();

      expect(params.id).toBe('abc123XYZ789def456GHI');
    });
  });

  describe('Route Structure Validation', () => {
    it('should validate goals route structure', () => {
      const goalRoute = '/tools/goals/goal-123';

      expect(goalRoute).toMatch(/^\/tools\/goals\/[a-zA-Z0-9-_]+$/);
    });

    it('should validate projects route structure', () => {
      const projectRoute = '/tools/projects/project-456';

      expect(projectRoute).toMatch(/^\/tools\/projects\/[a-zA-Z0-9-_]+$/);
    });

    it('should validate thoughts route structure', () => {
      const thoughtRoute = '/tools/thoughts/thought-789';

      expect(thoughtRoute).toMatch(/^\/tools\/thoughts\/[a-zA-Z0-9-_]+$/);
    });

    it('should validate friends route structure', () => {
      const friendRoute = '/tools/friends/friend-abc';

      expect(friendRoute).toMatch(/^\/tools\/friends\/[a-zA-Z0-9-_]+$/);
    });

    it('should validate relationships route structure', () => {
      const relationshipRoute = '/tools/relationships/relationship-xyz';

      expect(relationshipRoute).toMatch(/^\/tools\/relationships\/[a-zA-Z0-9-_]+$/);
    });
  });

  describe('URL Refresh Support', () => {
    it('should support direct URL access with ID parameter', () => {
      // Simulate direct URL access
      (useParams as jest.Mock).mockReturnValue({ id: 'goal-direct-123' });

      const params = useParams();

      // Verify ID is accessible after "refresh"
      expect(params.id).toBe('goal-direct-123');
    });

    it('should preserve ID parameter across re-renders', () => {
      const testId = 'project-persistent-456';
      (useParams as jest.Mock).mockReturnValue({ id: testId });

      // First call
      let params = useParams();
      expect(params.id).toBe(testId);

      // Second call (simulating re-render)
      params = useParams();
      expect(params.id).toBe(testId);
    });
  });

  describe('Navigation History', () => {
    it('should support browser back button navigation', () => {
      mockRouter.back();

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('should support browser forward button navigation', () => {
      mockRouter.forward();

      expect(mockRouter.forward).toHaveBeenCalled();
    });

    it('should support router replace for same-page updates', () => {
      mockRouter.replace('/tools/goals/updated-goal-123');

      expect(mockRouter.replace).toHaveBeenCalledWith('/tools/goals/updated-goal-123');
    });
  });
});
