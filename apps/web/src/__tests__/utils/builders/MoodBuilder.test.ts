/**
 * Tests for MoodBuilder test utility
 */

import { MoodBuilder, aMood } from './MoodBuilder';
import type { MoodEntry } from '@/store/useMoods';

describe('MoodBuilder', () => {
  describe('basic construction', () => {
    it('should create a mood with default values', () => {
      const mood = new MoodBuilder().build();

      expect(mood).toHaveProperty('id');
      expect(mood.value).toBe(5);
      expect(mood.createdAt).toBeDefined();
      expect(typeof mood.createdAt).toBe('string');
    });

    it('should create a mood using aMood() helper', () => {
      const mood = aMood().build();

      expect(mood).toHaveProperty('id');
      expect(mood.value).toBe(5);
    });

    it('should generate unique IDs for each mood', () => {
      const mood1 = aMood().build();
      const mood2 = aMood().build();

      expect(mood1.id).not.toBe(mood2.id);
    });
  });

  describe('withValue', () => {
    it('should set mood value within range', () => {
      const mood = aMood().withValue(7).build();
      expect(mood.value).toBe(7);
    });

    it('should clamp value to minimum of 1', () => {
      const mood = aMood().withValue(0).build();
      expect(mood.value).toBe(1);

      const mood2 = aMood().withValue(-5).build();
      expect(mood2.value).toBe(1);
    });

    it('should clamp value to maximum of 10', () => {
      const mood = aMood().withValue(11).build();
      expect(mood.value).toBe(10);

      const mood2 = aMood().withValue(100).build();
      expect(mood2.value).toBe(10);
    });
  });

  describe('withNote', () => {
    it('should set note text', () => {
      const mood = aMood().withNote('Feeling great today!').build();
      expect(mood.note).toBe('Feeling great today!');
    });

    it('should handle empty note', () => {
      const mood = aMood().withNote('').build();
      expect(mood.note).toBe('');
    });
  });

  describe('withCreatedAt', () => {
    it('should accept ISO string date', () => {
      const dateStr = '2024-01-15T10:00:00.000Z';
      const mood = aMood().withCreatedAt(dateStr).build();
      expect(mood.createdAt).toBe(dateStr);
    });

    it('should accept Date object and convert to ISO string', () => {
      const date = new Date('2024-01-15T10:00:00.000Z');
      const mood = aMood().withCreatedAt(date).build();
      expect(mood.createdAt).toBe(date.toISOString());
    });
  });

  describe('withMetadata', () => {
    it('should set metadata object', () => {
      const metadata = {
        sourceThoughtId: 'thought-123',
        dimensions: { joy: 8, anxiety: 2 },
      };
      const mood = aMood().withMetadata(metadata).build();
      expect(mood.metadata).toEqual(metadata);
    });

    it('should handle empty metadata', () => {
      const mood = aMood().withMetadata({}).build();
      expect(mood.metadata).toEqual({});
    });
  });

  describe('withSourceThought', () => {
    it('should set source thought ID in metadata', () => {
      const mood = aMood().withSourceThought('thought-456').build();
      expect(mood.metadata?.sourceThoughtId).toBe('thought-456');
    });

    it('should preserve existing metadata when setting source thought', () => {
      const mood = aMood()
        .withMetadata({ dimensions: { joy: 9 } })
        .withSourceThought('thought-789')
        .build();

      expect(mood.metadata?.sourceThoughtId).toBe('thought-789');
      expect(mood.metadata?.dimensions).toEqual({ joy: 9 });
    });
  });

  describe('withDimensions', () => {
    it('should set emotion dimensions in metadata', () => {
      const dimensions = { joy: 8, sadness: 3, anxiety: 2 };
      const mood = aMood().withDimensions(dimensions).build();
      expect(mood.metadata?.dimensions).toEqual(dimensions);
    });

    it('should preserve existing metadata when setting dimensions', () => {
      const mood = aMood()
        .withSourceThought('thought-123')
        .withDimensions({ joy: 7 })
        .build();

      expect(mood.metadata?.dimensions).toEqual({ joy: 7 });
      expect(mood.metadata?.sourceThoughtId).toBe('thought-123');
    });
  });

  describe('asManual', () => {
    it('should mark mood as manually created', () => {
      const mood = aMood().asManual().build();
      expect(mood.metadata?.createdBy).toBe('manual');
    });

    it('should preserve existing metadata when marking as manual', () => {
      const mood = aMood()
        .withSourceThought('thought-123')
        .asManual()
        .build();

      expect(mood.metadata?.createdBy).toBe('manual');
      expect(mood.metadata?.sourceThoughtId).toBe('thought-123');
    });
  });

  describe('asAI', () => {
    it('should mark mood as AI-created', () => {
      const mood = aMood().asAI().build();
      expect(mood.metadata?.createdBy).toBe('ai');
    });

    it('should preserve existing metadata when marking as AI', () => {
      const mood = aMood()
        .withDimensions({ joy: 8 })
        .asAI()
        .build();

      expect(mood.metadata?.createdBy).toBe('ai');
      expect(mood.metadata?.dimensions).toEqual({ joy: 8 });
    });
  });

  describe('buildMany', () => {
    it('should create multiple moods', () => {
      const moods = aMood().buildMany(3);
      expect(moods).toHaveLength(3);
      expect(moods[0]).toHaveProperty('id');
      expect(moods[1]).toHaveProperty('id');
      expect(moods[2]).toHaveProperty('id');
    });

    it('should create moods with same configuration', () => {
      const builder = aMood().withValue(8).withNote('Test note');
      const moods = builder.buildMany(2);

      expect(moods[0].value).toBe(8);
      expect(moods[1].value).toBe(8);
      expect(moods[0].note).toBe('Test note');
      expect(moods[1].note).toBe('Test note');
    });

    it('should create empty array when count is 0', () => {
      const moods = aMood().buildMany(0);
      expect(moods).toHaveLength(0);
    });
  });

  describe('reset', () => {
    it('should reset builder to default state', () => {
      const builder = aMood()
        .withValue(9)
        .withNote('Custom note')
        .asAI();

      const mood1 = builder.build();
      expect(mood1.value).toBe(9);
      expect(mood1.note).toBe('Custom note');

      builder.reset();
      const mood2 = builder.build();
      expect(mood2.value).toBe(5);
      expect(mood2.note).toBeUndefined();
      expect(mood2.metadata).toBeUndefined();
    });
  });

  describe('method chaining', () => {
    it('should support fluent interface', () => {
      const mood = aMood()
        .withValue(8)
        .withNote('Complex mood')
        .withSourceThought('thought-123')
        .withDimensions({ joy: 7, anxiety: 3 })
        .asManual()
        .build();

      expect(mood.value).toBe(8);
      expect(mood.note).toBe('Complex mood');
      expect(mood.metadata?.sourceThoughtId).toBe('thought-123');
      expect(mood.metadata?.dimensions).toEqual({ joy: 7, anxiety: 3 });
      expect(mood.metadata?.createdBy).toBe('manual');
    });
  });

  describe('complex scenarios', () => {
    it('should create a complete mood with all fields', () => {
      const customDate = new Date('2024-06-15T14:30:00.000Z');
      const mood = aMood()
        .withValue(9)
        .withNote('Had a breakthrough in therapy')
        .withCreatedAt(customDate)
        .withSourceThought('thought-abc')
        .withDimensions({
          joy: 9,
          gratitude: 8,
          anxiety: 2,
          sadness: 1
        })
        .asAI()
        .build();

      expect(mood.value).toBe(9);
      expect(mood.note).toBe('Had a breakthrough in therapy');
      expect(mood.createdAt).toBe(customDate.toISOString());
      expect(mood.metadata).toEqual({
        sourceThoughtId: 'thought-abc',
        dimensions: { joy: 9, gratitude: 8, anxiety: 2, sadness: 1 },
        createdBy: 'ai',
      });
    });
  });
});
