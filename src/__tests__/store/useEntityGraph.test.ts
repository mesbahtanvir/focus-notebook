import { act } from '@testing-library/react';
import type { Relationship, CreateRelationshipOptions } from '@/types/entityGraph';

// Mock Firebase and gateways before importing store
jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn().mockResolvedValue(undefined),
  updateAt: jest.fn().mockResolvedValue(undefined),
  deleteAt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/data/subscribe', () => ({
  subscribeCol: jest.fn(),
}));

jest.mock('@/lib/firebaseClient', () => ({
  auth: { currentUser: { uid: 'test-user-id' } },
  db: {},
}));

import { useEntityGraph } from '@/store/useEntityGraph';
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';

const createAtMock = jest.mocked(createAt);
const updateAtMock = jest.mocked(updateAt);
const deleteAtMock = jest.mocked(deleteAt);
const subscribeColMock = jest.mocked(subscribeCol);

describe('useEntityGraph store', () => {
  const resetStore = () => {
    useEntityGraph.setState({
      relationships: [],
      isLoading: false,
      error: null as Error | null,
      isSubscribed: false,
      unsubscribe: null,
    });
  };

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

  const createMockToolRelationship = (overrides: Partial<Relationship> = {}): Relationship => ({
    id: 'rel-tool-1',
    sourceType: 'thought',
    sourceId: 'thought-123',
    targetType: 'tool',
    targetId: 'cbt',
    relationshipType: 'should-be-processed-by',
    strength: 95,
    createdBy: 'ai',
    createdAt: '2025-01-01T00:00:00Z',
    status: 'active',
    reasoning: 'Detected cognitive distortion',
    toolProcessingData: {
      processingCount: 0,
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('createRelationship', () => {
    it('should create a new relationship with user defaults', async () => {
      const options: CreateRelationshipOptions = {
        sourceType: 'thought',
        sourceId: 'thought-123',
        targetType: 'task',
        targetId: 'task-456',
        relationshipType: 'created-from',
        createdBy: 'user',
      };

      const result = await useEntityGraph.getState().createRelationship(options);

      expect(result).toMatchObject({
        sourceType: 'thought',
        sourceId: 'thought-123',
        targetType: 'task',
        targetId: 'task-456',
        relationshipType: 'created-from',
        strength: 100, // Default for user
        createdBy: 'user',
        status: 'active',
      });

      expect(createAtMock).toHaveBeenCalledWith(
        expect.stringContaining('users/test-user-id/relationships/'),
        expect.objectContaining({
          sourceType: 'thought',
          targetType: 'task',
        })
      );
    });

    it('should create a new relationship with AI defaults', async () => {
      const options: CreateRelationshipOptions = {
        sourceType: 'thought',
        sourceId: 'thought-123',
        targetType: 'tool',
        targetId: 'cbt',
        relationshipType: 'should-be-processed-by',
        createdBy: 'ai',
      };

      const result = await useEntityGraph.getState().createRelationship(options);

      expect(result.strength).toBe(80); // Default for AI
      expect(result.createdBy).toBe('ai');
    });

    it('should respect custom strength values', async () => {
      const options: CreateRelationshipOptions = {
        sourceType: 'thought',
        sourceId: 'thought-123',
        targetType: 'task',
        targetId: 'task-456',
        relationshipType: 'created-from',
        createdBy: 'user',
        strength: 85,
      };

      const result = await useEntityGraph.getState().createRelationship(options);

      expect(result.strength).toBe(85);
    });

    it('should throw error for invalid strength', async () => {
      const options: CreateRelationshipOptions = {
        sourceType: 'thought',
        sourceId: 'thought-123',
        targetType: 'task',
        targetId: 'task-456',
        relationshipType: 'created-from',
        createdBy: 'user',
        strength: 150, // Invalid
      };

      await expect(
        useEntityGraph.getState().createRelationship(options)
      ).rejects.toThrow('Invalid strength');
    });

    it('should include optional metadata and reasoning', async () => {
      const options: CreateRelationshipOptions = {
        sourceType: 'thought',
        sourceId: 'thought-123',
        targetType: 'tool',
        targetId: 'cbt',
        relationshipType: 'should-be-processed-by',
        createdBy: 'ai',
        reasoning: 'Detected catastrophizing',
        metadata: { aiSuggestionId: 'sug-1' },
      };

      const result = await useEntityGraph.getState().createRelationship(options);

      expect(result.reasoning).toBe('Detected catastrophizing');
      expect(result.metadata).toEqual({ aiSuggestionId: 'sug-1' });
    });

    it('should include toolProcessingData for tool relationships', async () => {
      const options: CreateRelationshipOptions = {
        sourceType: 'thought',
        sourceId: 'thought-123',
        targetType: 'tool',
        targetId: 'cbt',
        relationshipType: 'should-be-processed-by',
        createdBy: 'ai',
        toolProcessingData: {
          processingCount: 0,
        },
      };

      const result = await useEntityGraph.getState().createRelationship(options);

      expect(result.toolProcessingData).toEqual({ processingCount: 0 });
    });
  });

  describe('updateRelationship', () => {
    it('should update relationship strength', async () => {
      const mockRel = createMockRelationship();
      useEntityGraph.setState({ relationships: [mockRel] });

      await useEntityGraph.getState().updateRelationship('rel-1', { strength: 90 });

      expect(updateAtMock).toHaveBeenCalledWith(
        'users/test-user-id/relationships/rel-1',
        expect.objectContaining({
          strength: 90,
        })
      );
    });

    it('should update relationship status', async () => {
      const mockRel = createMockRelationship();
      useEntityGraph.setState({ relationships: [mockRel] });

      await useEntityGraph.getState().updateRelationship('rel-1', { status: 'archived' });

      expect(updateAtMock).toHaveBeenCalledWith(
        'users/test-user-id/relationships/rel-1',
        expect.objectContaining({
          status: 'archived',
        })
      );
    });

    it('should reject invalid status transitions', async () => {
      const mockRel = createMockRelationship({ status: 'archived' });
      useEntityGraph.setState({ relationships: [mockRel] });

      await expect(
        useEntityGraph.getState().updateRelationship('rel-1', { status: 'rejected' })
      ).rejects.toThrow('Cannot transition from archived to rejected');
    });

    it('should merge toolProcessingData updates', async () => {
      const mockRel = createMockToolRelationship({
        toolProcessingData: {
          processingCount: 1,
          processedAt: '2025-01-01T00:00:00Z',
        },
      });
      useEntityGraph.setState({ relationships: [mockRel] });

      await useEntityGraph.getState().updateRelationship('rel-tool-1', {
        toolProcessingData: {
          processingCount: 2,
          tokensUsed: 1500,
        },
      });

      expect(updateAtMock).toHaveBeenCalledWith(
        'users/test-user-id/relationships/rel-tool-1',
        expect.objectContaining({
          toolProcessingData: {
            processingCount: 2,
            processedAt: '2025-01-01T00:00:00Z',
            tokensUsed: 1500,
          },
        })
      );
    });

    it('should merge metadata updates', async () => {
      const mockRel = createMockRelationship({
        metadata: { existingKey: 'value1' },
      });
      useEntityGraph.setState({ relationships: [mockRel] });

      await useEntityGraph.getState().updateRelationship('rel-1', {
        metadata: { newKey: 'value2' },
      });

      expect(updateAtMock).toHaveBeenCalledWith(
        'users/test-user-id/relationships/rel-1',
        expect.objectContaining({
          metadata: {
            existingKey: 'value1',
            newKey: 'value2',
          },
        })
      );
    });

    it('should throw error for non-existent relationship', async () => {
      useEntityGraph.setState({ relationships: [] });

      await expect(
        useEntityGraph.getState().updateRelationship('non-existent', { strength: 90 })
      ).rejects.toThrow('Relationship non-existent not found');
    });

    it('should validate strength on update', async () => {
      const mockRel = createMockRelationship();
      useEntityGraph.setState({ relationships: [mockRel] });

      await expect(
        useEntityGraph.getState().updateRelationship('rel-1', { strength: 150 })
      ).rejects.toThrow('Invalid strength');
    });
  });

  describe('deleteRelationship', () => {
    it('should delete a relationship', async () => {
      await useEntityGraph.getState().deleteRelationship('rel-1');

      expect(deleteAtMock).toHaveBeenCalledWith('users/test-user-id/relationships/rel-1');
    });
  });

  describe('status update helpers', () => {
    beforeEach(() => {
      const mockRel = createMockRelationship();
      useEntityGraph.setState({ relationships: [mockRel] });
    });

    it('should archive relationship', async () => {
      await useEntityGraph.getState().archiveRelationship('rel-1');

      expect(updateAtMock).toHaveBeenCalledWith(
        'users/test-user-id/relationships/rel-1',
        expect.objectContaining({ status: 'archived' })
      );
    });

    it('should reject relationship', async () => {
      await useEntityGraph.getState().rejectRelationship('rel-1');

      expect(updateAtMock).toHaveBeenCalledWith(
        'users/test-user-id/relationships/rel-1',
        expect.objectContaining({ status: 'rejected' })
      );
    });

    it('should reactivate relationship', async () => {
      const mockRel = createMockRelationship({ status: 'archived' });
      useEntityGraph.setState({ relationships: [mockRel] });

      await useEntityGraph.getState().reactivateRelationship('rel-1');

      expect(updateAtMock).toHaveBeenCalledWith(
        'users/test-user-id/relationships/rel-1',
        expect.objectContaining({ status: 'active' })
      );
    });
  });

  describe('batch operations', () => {
    it('should create multiple relationships', async () => {
      const options: CreateRelationshipOptions[] = [
        {
          sourceType: 'thought',
          sourceId: 'thought-123',
          targetType: 'task',
          targetId: 'task-1',
          relationshipType: 'created-from',
          createdBy: 'user',
        },
        {
          sourceType: 'thought',
          sourceId: 'thought-123',
          targetType: 'task',
          targetId: 'task-2',
          relationshipType: 'created-from',
          createdBy: 'user',
        },
      ];

      const results = await useEntityGraph.getState().createRelationships(options);

      expect(results).toHaveLength(2);
      expect(createAtMock).toHaveBeenCalledTimes(2);
    });

    it('should delete multiple relationships', async () => {
      await useEntityGraph.getState().deleteRelationships(['rel-1', 'rel-2']);

      expect(deleteAtMock).toHaveBeenCalledTimes(2);
      expect(deleteAtMock).toHaveBeenCalledWith('users/test-user-id/relationships/rel-1');
      expect(deleteAtMock).toHaveBeenCalledWith('users/test-user-id/relationships/rel-2');
    });
  });

  describe('query helpers', () => {
    beforeEach(() => {
      const mockRelationships: Relationship[] = [
        createMockRelationship({ id: 'rel-1', targetType: 'task', targetId: 'task-1' }),
        createMockRelationship({ id: 'rel-2', targetType: 'project', targetId: 'proj-1' }),
        createMockRelationship({ id: 'rel-3', targetType: 'task', targetId: 'task-2' }),
        createMockToolRelationship({
          id: 'rel-tool-1',
          toolProcessingData: { processingCount: 0 },
        }),
        createMockToolRelationship({
          id: 'rel-tool-2',
          targetId: 'brainstorming',
          relationshipType: 'processed-by',
          toolProcessingData: { processingCount: 2, processedAt: '2025-01-02T00:00:00Z' },
        }),
      ];
      useEntityGraph.setState({ relationships: mockRelationships });
    });

    it('should get relationship by ID', () => {
      const rel = useEntityGraph.getState().getRelationship('rel-1');
      expect(rel).toBeDefined();
      expect(rel?.id).toBe('rel-1');
    });

    it('should return undefined for non-existent relationship', () => {
      const rel = useEntityGraph.getState().getRelationship('non-existent');
      expect(rel).toBeUndefined();
    });

    it('should query relationships by type', () => {
      const tasks = useEntityGraph.getState().queryRelationships({ targetType: 'task' });
      expect(tasks).toHaveLength(2);
      expect(tasks.every((r) => r.targetType === 'task')).toBe(true);
    });

    it('should query relationships by source', () => {
      const rels = useEntityGraph
        .getState()
        .queryRelationships({ sourceType: 'thought', sourceId: 'thought-123' });
      expect(rels.length).toBeGreaterThan(0);
      expect(rels.every((r) => r.sourceId === 'thought-123')).toBe(true);
    });

    it('should query relationships by strength range', () => {
      const highStrength = useEntityGraph
        .getState()
        .queryRelationships({ minStrength: 95 });
      expect(highStrength.length).toBeGreaterThan(0);
      expect(highStrength.every((r) => r.strength >= 95)).toBe(true);
    });

    it('should get relationships for entity (bidirectional)', () => {
      const rels = useEntityGraph
        .getState()
        .getRelationshipsFor('thought', 'thought-123');
      expect(rels.length).toBeGreaterThan(0);
    });

    it('should get relationships between specific entities', () => {
      const rels = useEntityGraph
        .getState()
        .getRelationshipsBetween('thought', 'thought-123', 'task', 'task-1');
      expect(rels).toHaveLength(1);
      expect(rels[0].id).toBe('rel-1');
    });
  });

  describe('tool-specific queries', () => {
    beforeEach(() => {
      const mockRelationships: Relationship[] = [
        createMockToolRelationship({
          id: 'rel-tool-pending',
          relationshipType: 'should-be-processed-by',
          toolProcessingData: { processingCount: 0 },
        }),
        createMockToolRelationship({
          id: 'rel-tool-processed',
          targetId: 'tasks',
          relationshipType: 'processed-by',
          toolProcessingData: { processingCount: 1, processedAt: '2025-01-02T00:00:00Z' },
        }),
        createMockRelationship({ id: 'rel-task', targetType: 'task' }),
      ];
      useEntityGraph.setState({ relationships: mockRelationships });
    });

    it('should get all tool relationships for a thought', () => {
      const tools = useEntityGraph.getState().getToolRelationships('thought-123');
      expect(tools).toHaveLength(2);
      expect(tools.every((r) => r.targetType === 'tool')).toBe(true);
    });

    it('should get pending tool processing relationships', () => {
      const pending = useEntityGraph.getState().getPendingToolProcessing('thought-123');
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('rel-tool-pending');
    });

    it('should get processed tool relationships', () => {
      const processed = useEntityGraph.getState().getProcessedTools('thought-123');
      expect(processed).toHaveLength(1);
      expect(processed[0].id).toBe('rel-tool-processed');
    });

    it('should get tool processing data', () => {
      const data = useEntityGraph
        .getState()
        .getToolProcessingData('thought-123', 'tasks');
      expect(data).toBeDefined();
      expect(data?.processingCount).toBe(1);
    });

    it('should return null for non-existent tool processing data', () => {
      const data = useEntityGraph
        .getState()
        .getToolProcessingData('thought-123', 'nonexistent' as any);
      expect(data).toBeNull();
    });
  });

  describe('entity relationship queries', () => {
    beforeEach(() => {
      const mockRelationships: Relationship[] = [
        createMockRelationship({ id: 'rel-task-1', targetType: 'task', targetId: 'task-1' }),
        createMockRelationship({ id: 'rel-task-2', targetType: 'task', targetId: 'task-2' }),
        createMockRelationship({ id: 'rel-project', targetType: 'project', targetId: 'proj-1' }),
        createMockRelationship({ id: 'rel-goal', targetType: 'goal', targetId: 'goal-1' }),
        createMockRelationship({ id: 'rel-mood', targetType: 'mood', targetId: 'mood-1' }),
      ];
      useEntityGraph.setState({ relationships: mockRelationships });
    });

    it('should get linked tasks', () => {
      const tasks = useEntityGraph.getState().getLinkedTasks('thought', 'thought-123');
      expect(tasks).toHaveLength(2);
      expect(tasks.every((r) => r.targetType === 'task')).toBe(true);
    });

    it('should get linked projects', () => {
      const projects = useEntityGraph
        .getState()
        .getLinkedProjects('thought', 'thought-123');
      expect(projects).toHaveLength(1);
      expect(projects[0].targetId).toBe('proj-1');
    });

    it('should get linked goals', () => {
      const goals = useEntityGraph.getState().getLinkedGoals('thought', 'thought-123');
      expect(goals).toHaveLength(1);
      expect(goals[0].targetId).toBe('goal-1');
    });

    it('should get linked moods', () => {
      const moods = useEntityGraph.getState().getLinkedMoods('thought', 'thought-123');
      expect(moods).toHaveLength(1);
      expect(moods[0].targetId).toBe('mood-1');
    });
  });

  describe('AI suggestions', () => {
    beforeEach(() => {
      const mockRelationships: Relationship[] = [
        createMockRelationship({
          id: 'rel-suggestion-1',
          createdBy: 'ai',
          strength: 85,
          sourceId: 'thought-123',
        }),
        createMockRelationship({
          id: 'rel-suggestion-2',
          createdBy: 'ai',
          strength: 90,
          sourceId: 'thought-123',
        }),
        createMockRelationship({
          id: 'rel-high-confidence',
          createdBy: 'ai',
          strength: 95,
          sourceId: 'thought-123',
        }),
        createMockRelationship({ id: 'rel-user', createdBy: 'user', sourceId: 'thought-123' }),
      ];
      useEntityGraph.setState({ relationships: mockRelationships });
    });

    it('should get AI suggestions (confidence < 95)', () => {
      const suggestions = useEntityGraph.getState().getAISuggestions('thought-123');
      expect(suggestions).toHaveLength(2);
      expect(suggestions.every((r) => r.createdBy === 'ai' && r.strength < 95)).toBe(true);
    });

    it('should accept suggestion by increasing strength', async () => {
      const mockRel = createMockRelationship({ createdBy: 'ai', strength: 85 });
      useEntityGraph.setState({ relationships: [mockRel] });

      await useEntityGraph.getState().acceptSuggestion('rel-1');

      expect(updateAtMock).toHaveBeenCalledWith(
        'users/test-user-id/relationships/rel-1',
        expect.objectContaining({ strength: 100 })
      );
    });
  });

  describe('statistics', () => {
    beforeEach(() => {
      const mockRelationships: Relationship[] = [
        createMockRelationship({ id: 'rel-1', sourceId: 'thought-123' }),
        createMockRelationship({ id: 'rel-2', sourceId: 'thought-123' }),
        createMockRelationship({ id: 'rel-3', sourceId: 'thought-456' }),
        createMockToolRelationship({
          id: 'rel-cbt-1',
          targetId: 'cbt',
          relationshipType: 'processed-by',
          strength: 95,
          toolProcessingData: { processingCount: 1 },
        }),
        createMockToolRelationship({
          id: 'rel-cbt-2',
          targetId: 'cbt',
          relationshipType: 'processed-by',
          strength: 90,
          toolProcessingData: { processingCount: 2 },
        }),
      ];
      useEntityGraph.setState({ relationships: mockRelationships });
    });

    it('should count relationships for an entity', () => {
      const count = useEntityGraph.getState().getRelationshipCount('thought', 'thought-123');
      expect(count).toBe(4); // 2 regular relationships + 2 tool relationships
    });

    it('should get tool usage statistics', () => {
      const stats = useEntityGraph.getState().getToolUsageStats('cbt');
      expect(stats.totalProcessed).toBe(2);
      expect(stats.averageStrength).toBe(92.5);
    });

    it('should return zero stats for unused tool', () => {
      const stats = useEntityGraph.getState().getToolUsageStats('unused' as any);
      expect(stats.totalProcessed).toBe(0);
      expect(stats.averageStrength).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty relationships array', () => {
      useEntityGraph.setState({ relationships: [] });

      expect(useEntityGraph.getState().queryRelationships({})).toHaveLength(0);
      expect(useEntityGraph.getState().getToolRelationships('any')).toHaveLength(0);
      expect(useEntityGraph.getState().getAISuggestions('any')).toHaveLength(0);
    });

    it('should handle relationships with archived status', () => {
      const mockRel = createMockRelationship({ status: 'archived' });
      useEntityGraph.setState({ relationships: [mockRel] });

      const active = useEntityGraph.getState().getLinkedTasks('thought', 'thought-123');
      expect(active).toHaveLength(0); // Archived should be filtered out
    });

    it('should handle relationships with rejected status', () => {
      const mockRel = createMockRelationship({ status: 'rejected' });
      useEntityGraph.setState({ relationships: [mockRel] });

      const suggestions = useEntityGraph.getState().getAISuggestions('thought-123');
      expect(suggestions).toHaveLength(0); // Rejected should be filtered out
    });
  });
});
