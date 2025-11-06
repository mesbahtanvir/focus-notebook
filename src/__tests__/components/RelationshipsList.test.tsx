import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { RelationshipsList } from '@/components/relationships/RelationshipsList';
import type { Relationship } from '@/types/relationship';

// Mock Next.js Link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'Link';
  return MockLink;
});

// Mock stores
jest.mock('@/store/useEntityRelationships', () => ({
  useEntityRelationships: jest.fn(),
}));

jest.mock('@/store/useTasks', () => ({
  useTasks: jest.fn(),
}));

jest.mock('@/store/useProjects', () => ({
  useProjects: jest.fn(),
}));

jest.mock('@/store/useGoals', () => ({
  useGoals: jest.fn(),
}));

jest.mock('@/store/useMoods', () => ({
  useMoods: jest.fn(),
}));

jest.mock('@/store/useToolEnrollment', () => ({
  useToolEnrollment: jest.fn(),
}));

// Mock toolSpecs
jest.mock('../../../shared/toolSpecs', () => ({
  getToolSpecById: jest.fn((id: string) => ({
    id,
    title: `${id.charAt(0).toUpperCase()}${id.slice(1)}`,
    description: `${id} tool`,
  })),
}));

import { useEntityRelationships } from '@/store/useEntityRelationships';
import { useTasks } from '@/store/useTasks';
import { useProjects } from '@/store/useProjects';
import { useGoals } from '@/store/useGoals';
import { useMoods } from '@/store/useMoods';

const mockUseEntityRelationships = useEntityRelationships as jest.MockedFunction<
  typeof useEntityRelationships
>;
const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
const mockUseProjects = useProjects as jest.MockedFunction<typeof useProjects>;
const mockUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
const mockUseMoods = useMoods as jest.MockedFunction<typeof useMoods>;

describe('RelationshipsList Component', () => {
  const createMockRelationship = (overrides: Partial<Relationship> = {}): Relationship => ({
    id: 'rel-1',
    sourceType: 'thought',
    sourceId: 'thought-123',
    targetType: 'task',
    targetId: 'task-456',
    relationshipType: 'created-from',
    strength: 100,
    createdBy: 'user',
    createdAt: '2025-01-01T00:00:00Z',
    status: 'active',
    ...overrides,
  });

  const mockTask = {
    id: 'task-456',
    title: 'Test Task',
    done: false,
    status: 'active' as const,
    priority: 'medium' as const,
    category: 'mastery' as const,
    createdAt: '2025-01-01T00:00:00Z',
  };

  const mockProject = {
    id: 'proj-789',
    title: 'Test Project',
    objective: 'Test objective',
    actionPlan: [],
    status: 'active' as const,
    priority: 'high' as const,
    category: 'mastery' as const,
    linkedThoughtIds: [],
    linkedTaskIds: [],
  };

  const mockToolRelationship: Relationship = {
    id: 'rel-tool-1',
    sourceType: 'thought',
    sourceId: 'thought-123',
    targetType: 'tool',
    targetId: 'cbt',
    relationshipType: 'processed-by',
    strength: 100,
    createdBy: 'ai',
    createdAt: '2025-01-01T00:00:00Z',
    status: 'active',
    reasoning: 'Detected cognitive distortion',
    toolProcessingData: {
      processingCount: 1,
      processedAt: '2025-01-02T00:00:00Z',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseTasks.mockReturnValue({ tasks: [mockTask] } as any);
    mockUseProjects.mockReturnValue({ projects: [mockProject] } as any);
    mockUseGoals.mockReturnValue({ goals: [] } as any);
    mockUseMoods.mockReturnValue({ moods: [] } as any);
  });

  describe('Empty State', () => {
    it('should display empty state when no relationships exist', () => {
      mockUseEntityRelationships.mockReturnValue(() => []);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('No relationships yet')).toBeInTheDocument();
    });
  });

  describe('Task Relationships', () => {
    it('should render task relationships', () => {
      const taskRel = createMockRelationship({ targetType: 'task', targetId: 'task-456' });
      mockUseEntityRelationships.mockReturnValue(() => [taskRel]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('Tasks (1)')).toBeInTheDocument();
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('should show relationship type description', () => {
      const taskRel = createMockRelationship({
        targetType: 'task',
        targetId: 'task-456',
        relationshipType: 'created-from',
      });
      mockUseEntityRelationships.mockReturnValue(() => [taskRel]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('created from')).toBeInTheDocument();
    });

    it('should show reasoning when provided', () => {
      const taskRel = createMockRelationship({
        targetType: 'task',
        targetId: 'task-456',
        reasoning: 'This is a test reason',
      });
      mockUseEntityRelationships.mockReturnValue(() => [taskRel]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('"This is a test reason"')).toBeInTheDocument();
    });

    it('should display created by info', () => {
      const taskRel = createMockRelationship({ createdBy: 'ai' });
      mockUseEntityRelationships.mockReturnValue(() => [taskRel]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText(/🤖 AI-created/)).toBeInTheDocument();
    });

    it('should display user-created info', () => {
      const taskRel = createMockRelationship({ createdBy: 'user' });
      mockUseEntityRelationships.mockReturnValue(() => [taskRel]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText(/👤 User-created/)).toBeInTheDocument();
    });
  });

  describe('Tool Relationships', () => {
    it('should render tool relationships', () => {
      mockUseEntityRelationships.mockReturnValue(() => [mockToolRelationship]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('Tools (1)')).toBeInTheDocument();
      expect(screen.getByText('Cbt')).toBeInTheDocument(); // Tool title from mock
    });

    it('should show processed badge for processed tools', () => {
      mockUseEntityRelationships.mockReturnValue(() => [mockToolRelationship]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('Processed')).toBeInTheDocument();
    });

    it('should show pending badge for pending tool processing', () => {
      const pendingRel: Relationship = {
        ...mockToolRelationship,
        relationshipType: 'should-be-processed-by',
        toolProcessingData: {
          processingCount: 0,
        },
      };
      mockUseEntityRelationships.mockReturnValue(() => [pendingRel]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should display processing count and date', () => {
      mockUseEntityRelationships.mockReturnValue(() => [mockToolRelationship]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText(/Processed 1 time/)).toBeInTheDocument();
      expect(screen.getByText(/Last processed:/)).toBeInTheDocument();
    });
  });

  describe('Project Relationships', () => {
    it('should render project relationships', () => {
      const projectRel = createMockRelationship({
        targetType: 'project',
        targetId: 'proj-789',
        relationshipType: 'part-of',
      });
      mockUseEntityRelationships.mockReturnValue(() => [projectRel]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('Projects (1)')).toBeInTheDocument();
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  describe('AI Suggestions', () => {
    it('should render AI suggestions separately', () => {
      const suggestion = createMockRelationship({
        createdBy: 'ai',
        strength: 85, // Below 95
        reasoning: 'AI suggestion reason',
      });
      mockUseEntityRelationships.mockReturnValue(() => [suggestion]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('AI Suggestions (1)')).toBeInTheDocument();
      expect(screen.getByText(/AI Suggestion \(85%\)/)).toBeInTheDocument();
    });

    it('should not show high-confidence AI relationships as suggestions', () => {
      const highConfidence = createMockRelationship({
        createdBy: 'ai',
        strength: 95, // 95 or higher
      });
      mockUseEntityRelationships.mockReturnValue(() => [highConfidence]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      // Should appear in normal Tasks section, not suggestions
      expect(screen.queryByText('AI Suggestions')).not.toBeInTheDocument();
      expect(screen.getByText('Tasks (1)')).toBeInTheDocument();
    });
  });

  describe('Multiple Relationship Types', () => {
    it('should group relationships by type', () => {
      const relationships: Relationship[] = [
        createMockRelationship({ id: 'rel-1', targetType: 'task', targetId: 'task-456' }),
        createMockRelationship({ id: 'rel-2', targetType: 'project', targetId: 'proj-789' }),
        mockToolRelationship,
      ];
      mockUseEntityRelationships.mockReturnValue(() => relationships);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('Tools (1)')).toBeInTheDocument();
      expect(screen.getByText('Tasks (1)')).toBeInTheDocument();
      expect(screen.getByText('Projects (1)')).toBeInTheDocument();
    });

    it('should not display empty groups', () => {
      const taskRel = createMockRelationship({ targetType: 'task' });
      mockUseEntityRelationships.mockReturnValue(() => [taskRel]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('Tasks (1)')).toBeInTheDocument();
      expect(screen.queryByText('Projects')).not.toBeInTheDocument();
      expect(screen.queryByText('Goals')).not.toBeInTheDocument();
      expect(screen.queryByText('Moods')).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should show delete button when showActions is true', () => {
      const taskRel = createMockRelationship();
      mockUseEntityRelationships.mockReturnValue(() => [taskRel]);
      const onDelete = jest.fn();

      render(
        <RelationshipsList
          entityType="thought"
          entityId="thought-123"
          onDelete={onDelete}
          showActions={true}
        />
      );

      const deleteButton = screen.getByTitle('Remove relationship');
      expect(deleteButton).toBeInTheDocument();
    });

    it('should not show actions when showActions is false', () => {
      const taskRel = createMockRelationship();
      mockUseEntityRelationships.mockReturnValue(() => [taskRel]);

      render(
        <RelationshipsList
          entityType="thought"
          entityId="thought-123"
          showActions={false}
        />
      );

      expect(screen.queryByTitle('Remove relationship')).not.toBeInTheDocument();
    });

    it('should show accept/reject buttons for AI suggestions', () => {
      const suggestion = createMockRelationship({
        createdBy: 'ai',
        strength: 85,
      });
      mockUseEntityRelationships.mockReturnValue(() => [suggestion]);
      const onAccept = jest.fn();
      const onReject = jest.fn();

      render(
        <RelationshipsList
          entityType="thought"
          entityId="thought-123"
          onAccept={onAccept}
          onReject={onReject}
          showActions={true}
        />
      );

      expect(screen.getByTitle('Accept suggestion')).toBeInTheDocument();
      expect(screen.getByTitle('Reject suggestion')).toBeInTheDocument();
    });
  });

  describe('Links', () => {
    it('should render clickable links for entities', () => {
      const taskRel = createMockRelationship({ targetType: 'task', targetId: 'task-456' });
      mockUseEntityRelationships.mockReturnValue(() => [taskRel]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      const link = screen.getByRole('link', { name: /Test Task/ });
      expect(link).toHaveAttribute('href', '/tools/tasks?taskId=task-456');
    });

    it('should render clickable links for tools', () => {
      mockUseEntityRelationships.mockReturnValue(() => [mockToolRelationship]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      const link = screen.getByRole('link', { name: /Cbt/ });
      expect(link).toBeInTheDocument();
    });
  });

  describe('Metadata Display', () => {
    it('should show tool that created relationship', () => {
      const taskRel = createMockRelationship({
        metadata: {
          createdByTool: 'cbt',
        },
      });
      mockUseEntityRelationships.mockReturnValue(() => [taskRel]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText(/via cbt/)).toBeInTheDocument();
    });

    it('should show formatted creation date', () => {
      const taskRel = createMockRelationship({
        createdAt: '2025-01-15T00:00:00Z',
      });
      mockUseEntityRelationships.mockReturnValue(() => [taskRel]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText(/1\/15\/2025/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle relationships with missing entity data', () => {
      const taskRel = createMockRelationship({ targetId: 'non-existent-task' });
      mockUseEntityRelationships.mockReturnValue(() => [taskRel]);
      mockUseTasks.mockReturnValue({ tasks: [] } as any);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      // Should still render with the ID as fallback
      expect(screen.getByText('non-existent-task')).toBeInTheDocument();
    });

    it('should handle relationships without reasoning', () => {
      const taskRel = createMockRelationship({ reasoning: undefined });
      mockUseEntityRelationships.mockReturnValue(() => [taskRel]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      // Should render without errors
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('should handle tool relationships without processing data', () => {
      const toolRel: Relationship = {
        ...mockToolRelationship,
        toolProcessingData: undefined,
      };
      mockUseEntityRelationships.mockReturnValue(() => [toolRel]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('Cbt')).toBeInTheDocument();
      expect(screen.queryByText('Processed')).not.toBeInTheDocument();
    });

    it('should filter out archived relationships', () => {
      const archivedRel = createMockRelationship({ status: 'archived' });
      mockUseEntityRelationships.mockReturnValue(() => [archivedRel]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      // Only active relationships should be shown
      expect(screen.getByText('No relationships yet')).toBeInTheDocument();
    });

    it('should filter out rejected relationships', () => {
      const rejectedRel = createMockRelationship({ status: 'rejected' });
      mockUseEntityRelationships.mockReturnValue(() => [rejectedRel]);

      render(<RelationshipsList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('No relationships yet')).toBeInTheDocument();
    });
  });
});
