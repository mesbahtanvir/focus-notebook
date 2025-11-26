/**
 * Builder pattern for creating test MoodEntry objects
 */

import type { MoodEntry } from '@/store/useMoods';

export class MoodBuilder {
  private mood: Partial<MoodEntry> = {
    value: 5,
    createdAt: new Date().toISOString(),
  };

  /**
   * Set mood value (1-10)
   */
  withValue(value: number): this {
    this.mood.value = Math.min(10, Math.max(1, value));
    return this;
  }

  /**
   * Set note
   */
  withNote(note: string): this {
    this.mood.note = note;
    return this;
  }

  /**
   * Set creation date
   */
  withCreatedAt(date: string | Date): this {
    this.mood.createdAt = typeof date === 'string' ? date : date.toISOString();
    return this;
  }

  /**
   * Set metadata
   */
  withMetadata(metadata: MoodEntry['metadata']): this {
    this.mood.metadata = metadata;
    return this;
  }

  /**
   * Set source thought ID
   */
  withSourceThought(thoughtId: string): this {
    this.mood.metadata = {
      ...this.mood.metadata,
      sourceThoughtId: thoughtId,
    };
    return this;
  }

  /**
   * Set emotion dimensions
   */
  withDimensions(dimensions: { [emotionId: string]: number }): this {
    this.mood.metadata = {
      ...this.mood.metadata,
      dimensions,
    };
    return this;
  }

  /**
   * Set as manually created
   */
  asManual(): this {
    this.mood.metadata = {
      ...this.mood.metadata,
      createdBy: 'manual',
    };
    return this;
  }

  /**
   * Set as AI-created
   */
  asAI(): this {
    this.mood.metadata = {
      ...this.mood.metadata,
      createdBy: 'ai',
    };
    return this;
  }

  /**
   * Build the final MoodEntry object
   */
  build(): MoodEntry {
    const id = this.mood.id || `test-mood-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id,
      value: this.mood.value || 5,
      createdAt: this.mood.createdAt || new Date().toISOString(),
      ...this.mood,
    } as MoodEntry;
  }

  /**
   * Build multiple moods
   */
  buildMany(count: number): MoodEntry[] {
    const moods: MoodEntry[] = [];
    for (let i = 0; i < count; i++) {
      moods.push(this.build());
    }
    return moods;
  }

  /**
   * Reset builder
   */
  reset(): this {
    this.mood = {
      value: 5,
      createdAt: new Date().toISOString(),
    };
    return this;
  }
}

/**
 * Convenience function to create a MoodBuilder
 */
export function aMood(): MoodBuilder {
  return new MoodBuilder();
}

