import { 
  filterUnprocessedThoughts, 
  filterProcessedThoughts, 
  calculateCBTStats, 
  formatDate,
  formatDetailedDate,
  addCBTProcessedTag 
} from '@/lib/cbtUtils';
import { Thought } from '@/store/useThoughts';

describe('cbtUtils', () => {
  const mockThoughts: Thought[] = [
    {
      id: '1',
      text: 'I feel anxious about work',
      tags: ['cbt'],
      createdAt: '2025-01-01T00:00:00Z'
    },
    {
      id: '2',
      text: 'I am a failure',
      tags: ['cbt', 'anxiety'],
      createdAt: '2025-01-02T00:00:00Z'
    },
    {
      id: '3',
      text: 'Everyone dislikes me',
      tags: ['cbt'],
      createdAt: '2025-01-03T00:00:00Z'
    },
    {
      id: '4',
      text: 'I made a mistake at work today',
      tags: ['cbt', 'cbt-processed'],
      cbtAnalysis: {
        automaticThought: 'I always mess up',
        emotion: 'Sad',
        analyzedAt: '2025-01-04T00:00:00Z'
      },
      createdAt: '2025-01-04T00:00:00Z'
    },
    {
      id: '5',
      text: 'I can\'t do anything right',
      tags: ['cbt', 'cbt-processed'],
      cbtAnalysis: {
        automaticThought: 'I never succeed',
        emotion: 'Depressed',
        analyzedAt: '2025-01-05T00:00:00Z'
      },
      createdAt: '2025-01-05T00:00:00Z'
    }
  ];

  describe('filterUnprocessedThoughts', () => {
    it('should filter thoughts with cbt tag but not cbt-processed tag', () => {
      const result = filterUnprocessedThoughts(mockThoughts);
      expect(result).toHaveLength(3);
      expect(result.map(t => t.id).sort()).toEqual(['1', '2', '3']);
    });

    it('should return empty array when no unprocessed thoughts exist', () => {
      const processedOnly = mockThoughts.filter(t => t.tags?.includes('cbt-processed'));
      const result = filterUnprocessedThoughts(processedOnly);
      expect(result).toHaveLength(0);
    });

    it('should filter by search query', () => {
      const result = filterUnprocessedThoughts(mockThoughts, 'anxious');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('I feel anxious about work');
    });

    it('should filter by tags in search query', () => {
      const result = filterUnprocessedThoughts(mockThoughts, 'anxiety');
      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('anxiety');
    });

    it('should handle empty search query', () => {
      const result = filterUnprocessedThoughts(mockThoughts, '');
      expect(result).toHaveLength(3);
    });

    it('should handle thoughts without tags', () => {
      const thoughtsWithoutTags = [{ ...mockThoughts[0], tags: undefined }];
      const result = filterUnprocessedThoughts(thoughtsWithoutTags);
      expect(result).toHaveLength(0);
    });
  });

  describe('filterProcessedThoughts', () => {
    it('should filter thoughts with cbt-processed tag and cbtAnalysis', () => {
      const result = filterProcessedThoughts(mockThoughts);
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['5', '4']);
    });

    it('should sort processed thoughts by analyzedAt date descending', () => {
      const result = filterProcessedThoughts(mockThoughts);
      expect(result[0].id).toBe('5');
      expect(result[1].id).toBe('4');
    });

    it('should return empty array when no processed thoughts exist', () => {
      const unprocessedOnly = mockThoughts.filter(t => 
        t.tags?.includes('cbt') && !t.tags.includes('cbt-processed')
      );
      const result = filterProcessedThoughts(unprocessedOnly);
      expect(result).toHaveLength(0);
    });

    it('should filter by search query', () => {
      const result = filterProcessedThoughts(mockThoughts, 'mistake');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('I made a mistake at work today');
    });

    it('should handle thoughts without cbtAnalysis', () => {
      const thoughtWithoutAnalysis = {
        id: '6',
        text: 'Some thought',
        tags: ['cbt-processed'],
        createdAt: '2025-01-06T00:00:00Z'
      };
      const result = filterProcessedThoughts([thoughtWithoutAnalysis]);
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateCBTStats', () => {
    it('should calculate correct statistics', () => {
      const result = calculateCBTStats(mockThoughts, 3);
      expect(result).toEqual({
        toProcess: 3,
        processed: 2,
        total: 5 // All thoughts have 'cbt' tag (either just 'cbt' or 'cbt' + 'cbt-processed')
      });
    });

    it('should handle empty thoughts array', () => {
      const result = calculateCBTStats([], 0);
      expect(result).toEqual({
        toProcess: 0,
        processed: 0,
        total: 0
      });
    });

    it('should correctly count processed thoughts', () => {
      const processedOnly = mockThoughts.filter(t => t.tags?.includes('cbt-processed'));
      const result = calculateCBTStats(processedOnly, 0);
      expect(result.processed).toBe(2);
      // Total includes all thoughts with 'cbt' tag in the array
      expect(result.total).toBe(2); // All processed thoughts have 'cbt' tag or include 'cbt' in some form
    });
  });

  describe('formatDate', () => {
    it('should format Firestore Timestamp with toDate method', () => {
      const mockTimestamp = {
        toDate: () => new Date('2025-01-15T12:00:00Z')
      };
      const result = formatDate(mockTimestamp);
      expect(result).toBeTruthy();
      expect(result).not.toBe('N/A');
    });

    it('should format Firestore Timestamp with seconds', () => {
      const mockTimestamp = {
        seconds: 1736949600 // Jan 15, 2025
      };
      const result = formatDate(mockTimestamp);
      expect(result).toBeTruthy();
      expect(result).not.toBe('N/A');
    });

    it('should format ISO string date', () => {
      const result = formatDate('2025-01-15T12:00:00Z');
      expect(result).toBeTruthy();
      expect(result).not.toBe('N/A');
    });

    it('should handle null/undefined', () => {
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('should handle invalid date strings', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('N/A');
    });
  });

  describe('formatDetailedDate', () => {
    it('should format date with time', () => {
      const result = formatDetailedDate('2025-01-15T12:00:00Z');
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2025/);
    });

    it('should handle undefined', () => {
      const result = formatDetailedDate(undefined);
      expect(result).toBe('N/A');
    });

    it('should handle invalid dates', () => {
      const result = formatDetailedDate('invalid-date');
      expect(result).toBe('N/A');
    });
  });

  describe('addCBTProcessedTag', () => {
    it('should add cbt-processed tag to array', () => {
      const result = addCBTProcessedTag(['cbt', 'anxiety']);
      expect(result).toEqual(['cbt', 'anxiety', 'cbt-processed']);
    });

    it('should not add duplicate tag', () => {
      const result = addCBTProcessedTag(['cbt', 'cbt-processed']);
      expect(result).toEqual(['cbt', 'cbt-processed']);
    });

    it('should handle empty array', () => {
      const result = addCBTProcessedTag([]);
      expect(result).toEqual(['cbt-processed']);
    });

    it('should handle array with only cbt-processed tag', () => {
      const result = addCBTProcessedTag(['cbt-processed']);
      expect(result).toEqual(['cbt-processed']);
    });

    it('should handle array with multiple tags', () => {
      const result = addCBTProcessedTag(['cbt', 'urgent', 'work']);
      expect(result).toEqual(['cbt', 'urgent', 'work', 'cbt-processed']);
    });

    it('should handle array with cbt-processed at the beginning', () => {
      const result = addCBTProcessedTag(['cbt-processed', 'other']);
      expect(result).toEqual(['cbt-processed', 'other']);
    });

    it('should handle array with cbt-processed in the middle', () => {
      const result = addCBTProcessedTag(['cbt', 'cbt-processed', 'urgent']);
      expect(result).toEqual(['cbt', 'cbt-processed', 'urgent']);
    });
  });

  describe('filterUnprocessedThoughts - Edge Cases', () => {
    it('should handle thoughts with null text', () => {
      const thoughtsWithNull: Thought[] = [
        {
          id: '1',
          text: null as any,
          tags: ['cbt'],
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];
      const result = filterUnprocessedThoughts(thoughtsWithNull);
      expect(result).toHaveLength(1);
    });

    it('should handle thoughts with empty string text', () => {
      const thoughtsWithEmpty: Thought[] = [
        {
          id: '1',
          text: '',
          tags: ['cbt'],
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];
      const result = filterUnprocessedThoughts(thoughtsWithEmpty);
      expect(result).toHaveLength(1);
    });

    it('should handle large search queries', () => {
      const longSearchQuery = 'a'.repeat(1000);
      const result = filterUnprocessedThoughts(mockThoughts, longSearchQuery);
      expect(result).toHaveLength(0);
    });

    it('should handle special characters in search query', () => {
      const thoughts: Thought[] = [
        {
          id: '1',
          text: 'I\'m feeling great!',
          tags: ['cbt'],
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];
      const result = filterUnprocessedThoughts(thoughts, "I'm");
      expect(result).toHaveLength(1);
    });

    it('should handle unicode characters in search query', () => {
      const thoughts: Thought[] = [
        {
          id: '1',
          text: 'I feel 😊 happy',
          tags: ['cbt'],
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];
      const result = filterUnprocessedThoughts(thoughts, 'happy');
      expect(result).toHaveLength(1);
    });

    it('should handle thoughts with only cbt tag', () => {
      const thoughts: Thought[] = [
        {
          id: '1',
          text: 'Simple thought',
          tags: ['cbt'],
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];
      const result = filterUnprocessedThoughts(thoughts);
      expect(result).toHaveLength(1);
    });

    it('should handle case-insensitive search', () => {
      const thoughts: Thought[] = [
        {
          id: '1',
          text: 'ANXIETY about work',
          tags: ['cbt'],
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];
      const result = filterUnprocessedThoughts(thoughts, 'anxiety');
      expect(result).toHaveLength(1);
    });

    it('should handle partial word matches in search', () => {
      const thoughts: Thought[] = [
        {
          id: '1',
          text: 'feeling anxious',
          tags: ['cbt'],
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];
      const result = filterUnprocessedThoughts(thoughts, 'feeling');
      expect(result).toHaveLength(1);
    });

    it('should handle empty tags array', () => {
      const thoughts: Thought[] = [
        {
          id: '1',
          text: 'Some thought',
          tags: [],
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];
      const result = filterUnprocessedThoughts(thoughts);
      expect(result).toHaveLength(0);
    });

    it('should handle thoughts with whitespace only in tags', () => {
      const thoughts: Thought[] = [
        {
          id: '1',
          text: 'Some thought',
          tags: ['cbt', '   ', ''],
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];
      const result = filterUnprocessedThoughts(thoughts, 'some');
      expect(result).toHaveLength(1);
    });
  });

  describe('filterProcessedThoughts - Edge Cases', () => {
    it('should handle thoughts with malformed cbtAnalysis', () => {
      const thoughts: Thought[] = [
        {
          id: '1',
          text: 'Some thought',
          tags: ['cbt-processed'],
          cbtAnalysis: null as any,
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];
      const result = filterProcessedThoughts(thoughts);
      expect(result).toHaveLength(0);
    });

    it('should handle thoughts with incomplete cbtAnalysis', () => {
      const thoughts: Thought[] = [
        {
          id: '1',
          text: 'Some thought',
          tags: ['cbt-processed'],
          cbtAnalysis: {} as any,
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];
      const result = filterProcessedThoughts(thoughts);
      expect(result).toHaveLength(1);
    });

    it('should handle very old analyzedAt dates', () => {
      const thoughts: Thought[] = [
        {
          id: '1',
          text: 'Old thought',
          tags: ['cbt', 'cbt-processed'],
          cbtAnalysis: {
            analyzedAt: '1970-01-01T00:00:00Z'
          },
          createdAt: '2025-01-01T00:00:00Z'
        },
        {
          id: '2',
          text: 'New thought',
          tags: ['cbt', 'cbt-processed'],
          cbtAnalysis: {
            analyzedAt: '2025-01-01T00:00:00Z'
          },
          createdAt: '2025-01-02T00:00:00Z'
        }
      ];
      const result = filterProcessedThoughts(thoughts);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('2'); // Newer first
    });

    it('should handle thoughts with same analyzedAt timestamp', () => {
      const thoughts: Thought[] = [
        {
          id: '1',
          text: 'Thought 1',
          tags: ['cbt', 'cbt-processed'],
          cbtAnalysis: {
            analyzedAt: '2025-01-01T00:00:00Z'
          },
          createdAt: '2025-01-01T00:00:00Z'
        },
        {
          id: '2',
          text: 'Thought 2',
          tags: ['cbt', 'cbt-processed'],
          cbtAnalysis: {
            analyzedAt: '2025-01-01T00:00:00Z'
          },
          createdAt: '2025-01-02T00:00:00Z'
        }
      ];
      const result = filterProcessedThoughts(thoughts);
      expect(result).toHaveLength(2);
    });

    it('should handle search with no matching processed thoughts', () => {
      const result = filterProcessedThoughts(mockThoughts, 'nonexistent');
      expect(result).toHaveLength(0);
    });

    it('should handle very long text in thoughts', () => {
      const longText = 'a'.repeat(10000);
      const thoughts: Thought[] = [
        {
          id: '1',
          text: longText,
          tags: ['cbt', 'cbt-processed'],
          cbtAnalysis: {
            automaticThought: 'test',
            analyzedAt: '2025-01-01T00:00:00Z'
          },
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];
      const result = filterProcessedThoughts(thoughts, 'a');
      expect(result).toHaveLength(1);
    });
  });

  describe('formatDate - Edge Cases', () => {
    it('should handle Firestore Timestamp object', () => {
      const mockTimestamp = {
        toDate: () => new Date('2025-01-15T12:00:00Z'),
        seconds: 1736949600,
        nanoseconds: 0
      };
      const result = formatDate(mockTimestamp);
      expect(result).toBeTruthy();
      expect(result).not.toBe('N/A');
    });

    it('should handle number as date', () => {
      const result = formatDate(1736949600000);
      expect(result).toBeTruthy();
      expect(result).not.toBe('N/A');
    });

    it('should handle empty string', () => {
      const result = formatDate('');
      expect(result).toBe('N/A');
    });

    it('should handle boolean value', () => {
      const result = formatDate(true as any);
      expect(result).toBe('N/A');
    });

    it('should handle array as input', () => {
      const result = formatDate(['2025-01-15'] as any);
      expect(result).toBe('N/A');
    });

    it('should handle object without proper date structure', () => {
      const result = formatDate({ some: 'property' });
      expect(result).toBe('N/A');
    });

    it('should handle invalid seconds value', () => {
      const invalidTimestamp = {
        seconds: NaN
      };
      const result = formatDate(invalidTimestamp);
      expect(result).toBe('N/A');
    });
  });

  describe('formatDetailedDate - Edge Cases', () => {
    it('should handle empty string', () => {
      const result = formatDetailedDate('');
      expect(result).toBe('N/A');
    });

    it('should handle date with timezone', () => {
      const result = formatDetailedDate('2025-01-15T12:00:00+05:00');
      expect(result).toBeTruthy();
      expect(result).not.toBe('N/A');
    });

    it('should handle date without time', () => {
      const result = formatDetailedDate('2025-01-15');
      expect(result).toBeTruthy();
    });

    it('should handle far future dates', () => {
      const result = formatDetailedDate('2099-12-31T23:59:59Z');
      expect(result).toMatch(/2099/);
    });

    it('should handle far past dates', () => {
      const result = formatDetailedDate('1900-01-01T00:00:00Z');
      // Note: Date may show as 1899 due to timezone conversion
      expect(result).toMatch(/189|1900/);
    });

    it('should handle very long ISO strings', () => {
      const longString = '2025-01-15T' + '0'.repeat(1000);
      const result = formatDetailedDate(longString);
      expect(result).toBe('N/A');
    });
  });

  describe('calculateCBTStats - Edge Cases', () => {
    it('should handle thoughts with empty tags', () => {
      const thoughts: Thought[] = [
        {
          id: '1',
          text: 'Thought',
          tags: [],
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];
      const result = calculateCBTStats(thoughts, 0);
      expect(result).toEqual({
        toProcess: 0,
        processed: 0,
        total: 0
      });
    });

    it('should handle thoughts with only cbt-processed tag', () => {
      const thoughts: Thought[] = [
        {
          id: '1',
          text: 'Thought',
          tags: ['cbt-processed'],
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];
      const result = calculateCBTStats(thoughts, 0);
      expect(result).toEqual({
        toProcess: 0,
        processed: 1,
        total: 0
      });
    });

    it('should handle mixed tag scenarios', () => {
      const thoughts: Thought[] = [
        {
          id: '1',
          text: 'Thought 1',
          tags: ['cbt'],
          createdAt: '2025-01-01T00:00:00Z'
        },
        {
          id: '2',
          text: 'Thought 2',
          tags: ['cbt', 'cbt-processed'],
          cbtAnalysis: { analyzedAt: '2025-01-01T00:00:00Z' },
          createdAt: '2025-01-02T00:00:00Z'
        },
        {
          id: '3',
          text: 'Thought 3',
          tags: ['other-tag'],
          createdAt: '2025-01-03T00:00:00Z'
        }
      ];
      const result = calculateCBTStats(thoughts, 1);
      expect(result).toEqual({
        toProcess: 1,
        processed: 1,
        total: 2
      });
    });

    it('should handle very large thought arrays', () => {
      const largeThoughts: Thought[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `thought-${i}`,
        text: `Thought ${i}`,
        tags: i % 2 === 0 ? ['cbt'] : ['cbt', 'cbt-processed'],
        cbtAnalysis: i % 2 !== 0 ? { analyzedAt: `2025-01-01T00:00:00Z` } : undefined,
        createdAt: '2025-01-01T00:00:00Z'
      }));
      const result = calculateCBTStats(largeThoughts, 500);
      expect(result.processed).toBe(500);
      expect(result.total).toBe(1000);
    });

    it('should handle unprocessed count greater than thoughts array', () => {
      const result = calculateCBTStats(mockThoughts, 100);
      expect(result.toProcess).toBe(100);
    });
  });

  describe('Integration Tests - Real World Scenarios', () => {
    it('should handle complete workflow: filter, process, calculate stats', () => {
      // Filter unprocessed
      const unprocessed = filterUnprocessedThoughts(mockThoughts);
      expect(unprocessed).toHaveLength(3);

      // Add cbt-processed tag to all unprocessed thoughts
      const updatedThoughts = mockThoughts.map(thought => {
        if (unprocessed.some(u => u.id === thought.id)) {
          return {
            ...thought,
            tags: addCBTProcessedTag(thought.tags || []),
            cbtAnalysis: { analyzedAt: '2025-01-01T00:00:00Z' }
          };
        }
        return thought;
      });

      // Calculate stats after processing
      const stats = calculateCBTStats(updatedThoughts, 0);
      expect(stats.processed).toBeGreaterThan(2); // All 5 should now be processed (3 newly + 2 existing)
      expect(stats.total).toBe(5);
    });

    it('should handle search across filtered thoughts', () => {
      const processed = filterProcessedThoughts(mockThoughts, 'mistake');
      expect(processed).toHaveLength(1);
      
      const stats = calculateCBTStats(processed, 0);
      expect(stats.processed).toBe(1);
    });

    it('should format dates for both processed and unprocessed thoughts', () => {
      const unprocessed = filterUnprocessedThoughts(mockThoughts);
      const processed = filterProcessedThoughts(mockThoughts);
      
      unprocessed.forEach(thought => {
        const formatted = formatDate(thought.createdAt);
        expect(formatted).toBeTruthy();
        expect(formatted).not.toBe('N/A');
      });

      processed.forEach(thought => {
        const analyzed = formatDetailedDate(thought.cbtAnalysis?.analyzedAt);
        expect(analyzed).toBeTruthy();
        expect(analyzed).not.toBe('N/A');
      });
    });
  });
});

