import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EntityGraphList } from '@/components/entity-graph/EntityGraphList';
import type { Relationship } from '@/types/entityGraph';

// Mock Next.js Link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'Link';
  return MockLink;
});

// Mock stores
jest.mock('@/store/useEntityGraph', () => ({
  useEntityGraph: jest.fn(),
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

// Mock toolSpecs
jest.mock('../../../shared/toolSpecs', () => ({
  getToolSpecById: jest.fn((id: string) => ({
    id,
    title: `${id.charAt(0).toUpperCase()}${id.slice(1)}`,
    description: `${id} tool`,
  })),
}));

import { useEntityGraph } from '@/store/useEntityGraph';
import { useTasks } from '@/store/useTasks';
import { useProjects } from '@/store/useProjects';
import { useGoals } from '@/store/useGoals';
import { useMoods } from '@/store/useMoods';

const mockUseEntityGraph = useEntityGraph as jest.MockedFunction<typeof useEntityGraph>;
const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
const mockUseProjects = useProjects as jest.MockedFunction<typeof useProjects>;
const mockUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
const mockUseMoods = useMoods as jest.MockedFunction<typeof useMoods>;

describe('EntityGraphList Component', () => {
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
    timeframe: 'short-term' as const,
    createdAt: new Date().toISOString(),
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

    // Default mock implementations - implement Zustand selector pattern
    mockUseTasks.mockImplementation((selector) =>
      selector({ tasks: [mockTask] } as any)
    );
    mockUseProjects.mockImplementation((selector) =>
      selector({ projects: [mockProject] } as any)
    );
    mockUseGoals.mockImplementation((selector) => selector({ goals: [] } as any));
    mockUseMoods.mockImplementation((selector) => selector({ moods: [] } as any));
  });

  describe('Empty State', () => {
    it('should display empty state when no relationships exist', () => {
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('No relationships yet')).toBeInTheDocument();
    });
  });

  describe('Task Relationships', () => {
    it('should render task relationships', () => {
      const taskRel = createMockRelationship({ targetType: 'task', targetId: 'task-456' });
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([taskRel]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('Tasks (1)')).toBeInTheDocument();
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('should show relationship type description', () => {
      const taskRel = createMockRelationship({
        targetType: 'task',
        targetId: 'task-456',
        relationshipType: 'created-from',
      });
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([taskRel]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('created from')).toBeInTheDocument();
    });

    it('should show reasoning when provided', () => {
      const taskRel = createMockRelationship({
        targetType: 'task',
        targetId: 'task-456',
        reasoning: 'This is a test reason',
      });
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([taskRel]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText(/This is a test reason/)).toBeInTheDocument();
    });

    it('should display created by info', () => {
      const taskRel = createMockRelationship({ createdBy: 'ai' });
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([taskRel]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText(/🤖 AI-created/)).toBeInTheDocument();
    });

    it('should display user-created info', () => {
      const taskRel = createMockRelationship({ createdBy: 'user' });
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([taskRel]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText(/👤 User-created/)).toBeInTheDocument();
    });
  });

  describe('Tool Relationships', () => {
    it('should render tool relationships', () => {
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([mockToolRelationship]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('Tools (1)')).toBeInTheDocument();
      expect(screen.getByText('Cbt')).toBeInTheDocument(); // Tool title from mock
    });

    it('should show processed badge for processed tools', () => {
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([mockToolRelationship]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

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
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([pendingRel]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should display processing count and date', () => {
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([mockToolRelationship]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

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
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([projectRel]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

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
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([suggestion]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('AI Suggestions (1)')).toBeInTheDocument();
      expect(screen.getByText(/AI Suggestion \(85%\)/)).toBeInTheDocument();
    });

    it('should not show high-confidence AI relationships as suggestions', () => {
      const highConfidence = createMockRelationship({
        createdBy: 'ai',
        strength: 95, // 95 or higher
      });
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([highConfidence]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

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
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue(relationships),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('Tools (1)')).toBeInTheDocument();
      expect(screen.getByText('Tasks (1)')).toBeInTheDocument();
      expect(screen.getByText('Projects (1)')).toBeInTheDocument();
    });

    it('should not display empty groups', () => {
      const taskRel = createMockRelationship({ targetType: 'task' });
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([taskRel]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('Tasks (1)')).toBeInTheDocument();
      expect(screen.queryByText('Projects')).not.toBeInTheDocument();
      expect(screen.queryByText('Goals')).not.toBeInTheDocument();
      expect(screen.queryByText('Moods')).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should show delete button when showActions is true', () => {
      const taskRel = createMockRelationship();
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([taskRel]),
        } as any)
      );
      const onDelete = jest.fn();

      render(
        <EntityGraphList
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
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([taskRel]),
        } as any)
      );

      render(
        <EntityGraphList
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
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([suggestion]),
        } as any)
      );
      const onAccept = jest.fn();
      const onReject = jest.fn();

      render(
        <EntityGraphList
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
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([taskRel]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      const link = screen.getByRole('link', { name: /Test Task/ });
      expect(link).toHaveAttribute('href', '/tools/tasks?taskId=task-456');
    });

    it('should render clickable links for tools', () => {
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([mockToolRelationship]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

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
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([taskRel]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText(/via cbt/)).toBeInTheDocument();
    });

    it('should show formatted creation date', () => {
      const taskRel = createMockRelationship({
        createdAt: '2025-01-15T12:00:00Z', // Use noon UTC to avoid timezone boundary issues
      });
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([taskRel]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText(/1\/15\/2025/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle relationships with missing entity data', () => {
      const taskRel = createMockRelationship({ targetId: 'non-existent-task' });
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([taskRel]),
        } as any)
      );
      mockUseTasks.mockImplementation((selector) => selector({ tasks: [] } as any));

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      // Should still render with the ID as fallback
      expect(screen.getByText('non-existent-task')).toBeInTheDocument();
    });

    it('should handle relationships without reasoning', () => {
      const taskRel = createMockRelationship({ reasoning: undefined });
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([taskRel]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      // Should render without errors
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('should handle tool relationships without processing data', () => {
      const toolRel: Relationship = {
        ...mockToolRelationship,
        toolProcessingData: undefined,
      };
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([toolRel]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('Cbt')).toBeInTheDocument();
      expect(screen.queryByText('Processed')).not.toBeInTheDocument();
    });

    it('should filter out archived relationships', () => {
      const archivedRel = createMockRelationship({ status: 'archived' });
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([archivedRel]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      // Only active relationships should be shown
      expect(screen.getByText('No relationships yet')).toBeInTheDocument();
    });

    it('should filter out rejected relationships', () => {
      const rejectedRel = createMockRelationship({ status: 'rejected' });
      mockUseEntityGraph.mockImplementation((selector) =>
        selector({
          getRelationshipsFor: jest.fn().mockReturnValue([rejectedRel]),
        } as any)
      );

      render(<EntityGraphList entityType="thought" entityId="thought-123" />);

      expect(screen.getByText('No relationships yet')).toBeInTheDocument();
    });
  });
});
