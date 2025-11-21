import {
  isToolRelationship,
  isToolProcessed,
  isPendingProcessing,
  isAISuggestion,
  getToolId,
  getRelationshipDescription,
  getBidirectionalPair,
  isValidStrength,
  isValidRelationshipType,
  canTransitionStatus,
  type Relationship,
  type RelationshipType,
  type RelationshipStatus,
} from '@/types/entityGraph';

describe('Relationship Type Helpers', () => {
  // Mock relationships for testing
  const mockToolRelationship: Relationship = {
    id: 'rel-1',
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
  };

  const mockProcessedToolRelationship: Relationship = {
    ...mockToolRelationship,
    relationshipType: 'processed-by',
    toolProcessingData: {
      processingCount: 1,
      processedAt: '2025-01-02T00:00:00Z',
      cbtAnalysis: {
        situation: 'Work meeting',
        automaticThought: 'I will fail',
        emotion: 'Anxious',
      },
    },
  };

  const mockEntityRelationship: Relationship = {
    id: 'rel-2',
    sourceType: 'thought',
    sourceId: 'thought-123',
    targetType: 'task',
    targetId: 'task-456',
    relationshipType: 'created-from',
    strength: 100,
    createdBy: 'user',
    createdAt: '2025-01-01T00:00:00Z',
    status: 'active',
  };

  const mockAISuggestion: Relationship = {
    ...mockEntityRelationship,
    createdBy: 'ai',
    strength: 85,
    reasoning: 'This thought mentions a specific action',
  };

  describe('isToolRelationship', () => {
    it('should return true for tool relationships', () => {
      expect(isToolRelationship(mockToolRelationship)).toBe(true);
    });

    it('should return false for entity relationships', () => {
      expect(isToolRelationship(mockEntityRelationship)).toBe(false);
    });

    it('should handle all entity types', () => {
      const types: Array<Relationship['targetType']> = [
        'task',
        'project',
        'goal',
        'mood',
        'person',
        'thought',
      ];

      types.forEach((targetType) => {
        const rel: Relationship = { ...mockEntityRelationship, targetType };
        expect(isToolRelationship(rel)).toBe(false);
      });
    });
  });

  describe('isToolProcessed', () => {
    it('should return true for processed tool relationships', () => {
      expect(isToolProcessed(mockProcessedToolRelationship)).toBe(true);
    });

    it('should return false for pending tool relationships', () => {
      expect(isToolProcessed(mockToolRelationship)).toBe(false);
    });

    it('should return false for entity relationships', () => {
      expect(isToolProcessed(mockEntityRelationship)).toBe(false);
    });

    it('should return false when processingCount is 0', () => {
      const rel: Relationship = {
        ...mockToolRelationship,
        toolProcessingData: { processingCount: 0 },
      };
      expect(isToolProcessed(rel)).toBe(false);
    });

    it('should return false when toolProcessingData is undefined', () => {
      const rel: Relationship = {
        ...mockToolRelationship,
        toolProcessingData: undefined,
      };
      expect(isToolProcessed(rel)).toBe(false);
    });

    it('should return true for multiple processings', () => {
      const rel: Relationship = {
        ...mockProcessedToolRelationship,
        toolProcessingData: { processingCount: 5 },
      };
      expect(isToolProcessed(rel)).toBe(true);
    });
  });

  describe('isPendingProcessing', () => {
    it('should return true for pending tool relationships', () => {
      expect(isPendingProcessing(mockToolRelationship)).toBe(true);
    });

    it('should return false for processed tool relationships', () => {
      expect(isPendingProcessing(mockProcessedToolRelationship)).toBe(false);
    });

    it('should return false for entity relationships', () => {
      expect(isPendingProcessing(mockEntityRelationship)).toBe(false);
    });

    it('should return false when relationshipType is not should-be-processed-by', () => {
      const rel: Relationship = {
        ...mockToolRelationship,
        relationshipType: 'analyzed-with',
      };
      expect(isPendingProcessing(rel)).toBe(false);
    });

    it('should return false when already processed even with should-be-processed-by type', () => {
      const rel: Relationship = {
        ...mockToolRelationship,
        toolProcessingData: { processingCount: 1 },
      };
      expect(isPendingProcessing(rel)).toBe(false);
    });
  });

  describe('isAISuggestion', () => {
    it('should return true for AI-created low-confidence relationships', () => {
      expect(isAISuggestion(mockAISuggestion)).toBe(true);
    });

    it('should return false for high-confidence AI relationships', () => {
      const rel: Relationship = { ...mockAISuggestion, strength: 95 };
      expect(isAISuggestion(rel)).toBe(false);
    });

    it('should return false for user-created relationships', () => {
      expect(isAISuggestion(mockEntityRelationship)).toBe(false);
    });

    it('should return false for archived suggestions', () => {
      const rel: Relationship = { ...mockAISuggestion, status: 'archived' };
      expect(isAISuggestion(rel)).toBe(false);
    });

    it('should return false for rejected suggestions', () => {
      const rel: Relationship = { ...mockAISuggestion, status: 'rejected' };
      expect(isAISuggestion(rel)).toBe(false);
    });

    it('should handle edge case of strength exactly 95', () => {
      const rel: Relationship = { ...mockAISuggestion, strength: 95 };
      expect(isAISuggestion(rel)).toBe(false);
    });

    it('should handle strength of 94', () => {
      const rel: Relationship = { ...mockAISuggestion, strength: 94 };
      expect(isAISuggestion(rel)).toBe(true);
    });
  });

  describe('getToolId', () => {
    it('should return tool ID for tool relationships', () => {
      expect(getToolId(mockToolRelationship)).toBe('cbt');
    });

    it('should return null for entity relationships', () => {
      expect(getToolId(mockEntityRelationship)).toBe(null);
    });

    it('should handle various tool IDs', () => {
      const toolIds = ['cbt', 'tasks', 'brainstorming', 'focus', 'moodtracker'];

      toolIds.forEach((toolId) => {
        const rel: Relationship = { ...mockToolRelationship, targetId: toolId };
        expect(getToolId(rel)).toBe(toolId);
      });
    });
  });

  describe('getRelationshipDescription', () => {
    it('should return description for tool relationships', () => {
      expect(getRelationshipDescription(mockToolRelationship)).toBe('should be processed by');
    });

    it('should return description for entity relationships', () => {
      expect(getRelationshipDescription(mockEntityRelationship)).toBe('created from');
    });

    it('should handle all relationship types', () => {
      const types: RelationshipType[] = [
        'should-be-processed-by',
        'processed-by',
        'analyzed-with',
        'created-from',
        'inspired-by',
        'part-of',
        'related-to',
        'mentions',
        'blocks',
        'depends-on',
      ];

      types.forEach((type) => {
        const rel: Relationship = { ...mockEntityRelationship, relationshipType: type };
        const description = getRelationshipDescription(rel);
        expect(description).toBeTruthy();
        expect(typeof description).toBe('string');
      });
    });

    it('should return relationship type itself for unknown types', () => {
      const rel: Relationship = {
        ...mockEntityRelationship,
        relationshipType: 'unknown-type' as any,
      };
      expect(getRelationshipDescription(rel)).toBe('unknown-type');
    });
  });

  describe('getBidirectionalPair', () => {
    it('should return bidirectional pair for parent-child relationships', () => {
      const rel: Relationship = { ...mockEntityRelationship, relationshipType: 'parent-of' };
      const pair = getBidirectionalPair(rel);
      expect(pair).toEqual(['parent-of', 'sub-item-of']);
    });

    it('should return bidirectional pair for sub-item relationships', () => {
      const rel: Relationship = { ...mockEntityRelationship, relationshipType: 'sub-item-of' };
      const pair = getBidirectionalPair(rel);
      expect(pair).toEqual(['sub-item-of', 'parent-of']);
    });

    it('should return bidirectional pair for blocking relationships', () => {
      const rel: Relationship = { ...mockEntityRelationship, relationshipType: 'blocks' };
      const pair = getBidirectionalPair(rel);
      expect(pair).toEqual(['blocks', 'blocked-by']);
    });

    it('should return null for non-bidirectional relationships', () => {
      const rel: Relationship = { ...mockEntityRelationship, relationshipType: 'created-from' };
      const pair = getBidirectionalPair(rel);
      expect(pair).toBeNull();
    });

    it('should handle all bidirectional pairs', () => {
      const pairs: Array<[RelationshipType, RelationshipType]> = [
        ['parent-of', 'sub-item-of'],
        ['blocks', 'blocked-by'],
        ['depends-on', 'required-by'],
        ['precedes', 'follows'],
        ['supersedes', 'superseded-by'],
      ];

      pairs.forEach(([forward, reverse]) => {
        const rel: Relationship = { ...mockEntityRelationship, relationshipType: forward };
        const pair = getBidirectionalPair(rel);
        expect(pair).toEqual([forward, reverse]);
      });
    });
  });

  describe('isValidStrength', () => {
    it('should return true for valid strengths', () => {
      expect(isValidStrength(0)).toBe(true);
      expect(isValidStrength(50)).toBe(true);
      expect(isValidStrength(100)).toBe(true);
    });

    it('should return false for negative strengths', () => {
      expect(isValidStrength(-1)).toBe(false);
      expect(isValidStrength(-100)).toBe(false);
    });

    it('should return false for strengths over 100', () => {
      expect(isValidStrength(101)).toBe(false);
      expect(isValidStrength(200)).toBe(false);
    });

    it('should handle decimal strengths', () => {
      expect(isValidStrength(50.5)).toBe(true);
      expect(isValidStrength(99.9)).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(isValidStrength(0.0)).toBe(true);
      expect(isValidStrength(100.0)).toBe(true);
      expect(isValidStrength(NaN)).toBe(false);
      expect(isValidStrength(Infinity)).toBe(false);
      expect(isValidStrength(-Infinity)).toBe(false);
    });
  });

  describe('isValidRelationshipType', () => {
    it('should validate tool relationships correctly', () => {
      expect(isValidRelationshipType('thought', 'tool', 'should-be-processed-by')).toBe(true);
      expect(isValidRelationshipType('thought', 'tool', 'processed-by')).toBe(true);
      expect(isValidRelationshipType('thought', 'tool', 'analyzed-with')).toBe(true);
    });

    it('should reject tool relationship types for non-tool targets', () => {
      expect(isValidRelationshipType('thought', 'task', 'should-be-processed-by')).toBe(false);
      expect(isValidRelationshipType('thought', 'project', 'processed-by')).toBe(false);
    });

    it('should allow general relationships for any entity type', () => {
      expect(isValidRelationshipType('thought', 'task', 'created-from')).toBe(true);
      expect(isValidRelationshipType('thought', 'project', 'part-of')).toBe(true);
      expect(isValidRelationshipType('task', 'project', 'part-of')).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(isValidRelationshipType('thought', 'thought', 'related-to')).toBe(true);
      expect(isValidRelationshipType('tool', 'thought', 'should-be-processed-by')).toBe(false);
    });
  });

  describe('canTransitionStatus', () => {
    it('should allow valid transitions from active', () => {
      expect(canTransitionStatus('active', 'archived')).toBe(true);
      expect(canTransitionStatus('active', 'rejected')).toBe(true);
    });

    it('should allow valid transitions from archived', () => {
      expect(canTransitionStatus('archived', 'active')).toBe(true);
    });

    it('should allow valid transitions from rejected', () => {
      expect(canTransitionStatus('rejected', 'active')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(canTransitionStatus('active', 'active')).toBe(false);
      expect(canTransitionStatus('archived', 'rejected')).toBe(false);
      expect(canTransitionStatus('rejected', 'archived')).toBe(false);
    });

    it('should handle self-transitions', () => {
      expect(canTransitionStatus('active', 'active')).toBe(false);
      expect(canTransitionStatus('archived', 'archived')).toBe(false);
      expect(canTransitionStatus('rejected', 'rejected')).toBe(false);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle relationship with no toolProcessingData', () => {
      const rel: Relationship = {
        ...mockToolRelationship,
        toolProcessingData: undefined,
      };
      expect(isToolRelationship(rel)).toBe(true);
      expect(isToolProcessed(rel)).toBe(false);
    });

    it('should handle relationship with empty toolProcessingData', () => {
      const rel: Relationship = {
        ...mockToolRelationship,
        toolProcessingData: { processingCount: 0 },
      };
      expect(isToolProcessed(rel)).toBe(false);
      expect(isPendingProcessing(rel)).toBe(true);
    });

    it('should handle relationship with minimal required fields', () => {
      const minimalRel: Relationship = {
        id: 'rel-min',
        sourceType: 'thought',
        sourceId: 'thought-1',
        targetType: 'task',
        targetId: 'task-1',
        relationshipType: 'linked-to',
        strength: 100,
        createdBy: 'user',
        createdAt: '2025-01-01T00:00:00Z',
        status: 'active',
      };

      expect(isToolRelationship(minimalRel)).toBe(false);
      expect(isValidStrength(minimalRel.strength)).toBe(true);
      expect(canTransitionStatus(minimalRel.status, 'archived')).toBe(true);
    });

    it('should handle complex tool processing data', () => {
      const complexRel: Relationship = {
        ...mockProcessedToolRelationship,
        toolProcessingData: {
          processingCount: 3,
          processedAt: '2025-01-05T00:00:00Z',
          actionsGenerated: ['rel-1', 'rel-2', 'rel-3'],
          cbtAnalysis: {
            situation: 'Meeting with boss',
            automaticThought: 'I will get fired',
            emotion: 'Anxious',
            evidence: 'No actual evidence',
            alternativeThought: 'I am doing well',
            outcome: 'Felt better',
            distortions: ['Catastrophizing', 'Mind Reading'],
          },
          tokensUsed: 1500,
          model: 'gpt-4',
        },
      };

      expect(isToolProcessed(complexRel)).toBe(true);
      expect(complexRel.toolProcessingData?.processingCount).toBe(3);
      expect(complexRel.toolProcessingData?.cbtAnalysis?.distortions).toHaveLength(2);
    });

    it('should validate all relationship types', () => {
      const allTypes: RelationshipType[] = [
        'should-be-processed-by',
        'processed-by',
        'analyzed-with',
        'created-from',
        'inspired-by',
        'derived-from',
        'part-of',
        'sub-item-of',
        'parent-of',
        'blocks',
        'blocked-by',
        'depends-on',
        'required-by',
        'related-to',
        'mentions',
        'references',
        'linked-to',
        'precedes',
        'follows',
        'supersedes',
        'superseded-by',
        'triggered-by',
        'contributed-to',
        'affected-by',
      ];

      allTypes.forEach((type) => {
        const description = getRelationshipDescription({
          ...mockEntityRelationship,
          relationshipType: type,
        });
        expect(description).toBeTruthy();
      });
    });
  });
});
