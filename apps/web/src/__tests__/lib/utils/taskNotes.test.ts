import {
  parseNotesMetadata,
  getUserNotes,
  updateUserNotes,
} from '@/lib/utils/taskNotes';

describe('taskNotes utilities', () => {
  describe('parseNotesMetadata', () => {
    it('should return null for undefined notes', () => {
      expect(parseNotesMetadata(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseNotesMetadata('')).toBeNull();
    });

    it('should return null for plain text notes', () => {
      expect(parseNotesMetadata('This is a regular note')).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      expect(parseNotesMetadata('{ invalid json')).toBeNull();
    });

    it('should return null for JSON without metadata fields', () => {
      const notes = JSON.stringify({ someField: 'value' });
      expect(parseNotesMetadata(notes)).toBeNull();
    });

    it('should parse metadata with sourceThoughtId', () => {
      const metadata = { sourceThoughtId: 'thought-123' };
      const notes = JSON.stringify(metadata);
      const result = parseNotesMetadata(notes);

      expect(result).toEqual(metadata);
    });

    it('should parse metadata with createdBy thought-processor', () => {
      const metadata = { createdBy: 'thought-processor' };
      const notes = JSON.stringify(metadata);
      const result = parseNotesMetadata(notes);

      expect(result).toEqual(metadata);
    });

    it('should parse metadata with both sourceThoughtId and createdBy', () => {
      const metadata = {
        sourceThoughtId: 'thought-456',
        createdBy: 'thought-processor',
      };
      const notes = JSON.stringify(metadata);
      const result = parseNotesMetadata(notes);

      expect(result).toEqual(metadata);
    });

    it('should parse metadata with userNotes', () => {
      const metadata = {
        sourceThoughtId: 'thought-789',
        userNotes: 'User added note',
      };
      const notes = JSON.stringify(metadata);
      const result = parseNotesMetadata(notes);

      expect(result).toEqual(metadata);
    });

    it('should parse metadata with additional fields', () => {
      const metadata = {
        sourceThoughtId: 'thought-999',
        customField: 'custom value',
        anotherField: 123,
      };
      const notes = JSON.stringify(metadata);
      const result = parseNotesMetadata(notes);

      expect(result).toEqual(metadata);
    });

    it('should return null for null JSON value', () => {
      const notes = JSON.stringify(null);
      expect(parseNotesMetadata(notes)).toBeNull();
    });

    it('should return null for createdBy with different value', () => {
      const notes = JSON.stringify({ createdBy: 'user' });
      expect(parseNotesMetadata(notes)).toBeNull();
    });

    it('should handle JSON array', () => {
      const notes = JSON.stringify(['item1', 'item2']);
      expect(parseNotesMetadata(notes)).toBeNull();
    });

    it('should handle JSON number', () => {
      const notes = JSON.stringify(42);
      expect(parseNotesMetadata(notes)).toBeNull();
    });

    it('should handle JSON boolean', () => {
      const notes = JSON.stringify(true);
      expect(parseNotesMetadata(notes)).toBeNull();
    });
  });

  describe('getUserNotes', () => {
    it('should return empty string for undefined notes', () => {
      expect(getUserNotes(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(getUserNotes('')).toBe('');
    });

    it('should return plain text notes as-is', () => {
      const notes = 'This is a regular note';
      expect(getUserNotes(notes)).toBe(notes);
    });

    it('should return invalid JSON as-is', () => {
      const notes = '{ invalid json';
      expect(getUserNotes(notes)).toBe(notes);
    });

    it('should extract userNotes from metadata', () => {
      const metadata = {
        sourceThoughtId: 'thought-123',
        userNotes: 'User note content',
      };
      const notes = JSON.stringify(metadata);
      const result = getUserNotes(notes);

      expect(result).toBe('User note content');
    });

    it('should return empty string for metadata without userNotes', () => {
      const metadata = {
        sourceThoughtId: 'thought-456',
        createdBy: 'thought-processor',
      };
      const notes = JSON.stringify(metadata);
      const result = getUserNotes(notes);

      expect(result).toBe('');
    });

    it('should handle metadata with empty userNotes', () => {
      const metadata = {
        sourceThoughtId: 'thought-789',
        userNotes: '',
      };
      const notes = JSON.stringify(metadata);
      const result = getUserNotes(notes);

      expect(result).toBe('');
    });

    it('should handle multiline user notes', () => {
      const userNotesText = 'Line 1\nLine 2\nLine 3';
      const metadata = {
        sourceThoughtId: 'thought-multi',
        userNotes: userNotesText,
      };
      const notes = JSON.stringify(metadata);
      const result = getUserNotes(notes);

      expect(result).toBe(userNotesText);
    });

    it('should handle special characters in user notes', () => {
      const userNotesText = 'Note with "quotes" and \'apostrophes\'';
      const metadata = {
        sourceThoughtId: 'thought-special',
        userNotes: userNotesText,
      };
      const notes = JSON.stringify(metadata);
      const result = getUserNotes(notes);

      expect(result).toBe(userNotesText);
    });

    it('should return JSON without metadata as-is', () => {
      const notes = JSON.stringify({ someField: 'value' });
      expect(getUserNotes(notes)).toBe(notes);
    });
  });

  describe('updateUserNotes', () => {
    it('should create plain notes when no existing notes', () => {
      const result = updateUserNotes(undefined, 'New note');

      expect(result).toBe('New note');
    });

    it('should replace plain notes with new notes', () => {
      const result = updateUserNotes('Old note', 'New note');

      expect(result).toBe('New note');
    });

    it('should preserve metadata when updating user notes', () => {
      const existingMetadata = {
        sourceThoughtId: 'thought-123',
        createdBy: 'thought-processor',
        userNotes: 'Old user note',
      };
      const existingNotes = JSON.stringify(existingMetadata);

      const result = updateUserNotes(existingNotes, 'New user note');
      const parsed = JSON.parse(result);

      expect(parsed.sourceThoughtId).toBe('thought-123');
      expect(parsed.createdBy).toBe('thought-processor');
      expect(parsed.userNotes).toBe('New user note');
    });

    it('should preserve all metadata fields', () => {
      const existingMetadata = {
        sourceThoughtId: 'thought-456',
        customField: 'custom value',
        anotherField: 123,
        userNotes: 'Old note',
      };
      const existingNotes = JSON.stringify(existingMetadata);

      const result = updateUserNotes(existingNotes, 'Updated note');
      const parsed = JSON.parse(result);

      expect(parsed.sourceThoughtId).toBe('thought-456');
      expect(parsed.customField).toBe('custom value');
      expect(parsed.anotherField).toBe(123);
      expect(parsed.userNotes).toBe('Updated note');
    });

    it('should add userNotes to existing metadata', () => {
      const existingMetadata = {
        sourceThoughtId: 'thought-789',
        createdBy: 'thought-processor',
      };
      const existingNotes = JSON.stringify(existingMetadata);

      const result = updateUserNotes(existingNotes, 'First user note');
      const parsed = JSON.parse(result);

      expect(parsed.userNotes).toBe('First user note');
    });

    it('should handle empty new notes with metadata', () => {
      const existingMetadata = {
        sourceThoughtId: 'thought-999',
        userNotes: 'Old note',
      };
      const existingNotes = JSON.stringify(existingMetadata);

      const result = updateUserNotes(existingNotes, '');
      const parsed = JSON.parse(result);

      expect(parsed.sourceThoughtId).toBe('thought-999');
      expect(parsed.userNotes).toBe('');
    });

    it('should handle multiline new notes', () => {
      const existingMetadata = {
        sourceThoughtId: 'thought-multi',
      };
      const existingNotes = JSON.stringify(existingMetadata);

      const newNotes = 'Line 1\nLine 2\nLine 3';
      const result = updateUserNotes(existingNotes, newNotes);
      const parsed = JSON.parse(result);

      expect(parsed.userNotes).toBe(newNotes);
    });

    it('should handle special characters in new notes', () => {
      const existingMetadata = {
        sourceThoughtId: 'thought-special',
      };
      const existingNotes = JSON.stringify(existingMetadata);

      const newNotes = 'Note with "quotes" and \'apostrophes\'';
      const result = updateUserNotes(existingNotes, newNotes);
      const parsed = JSON.parse(result);

      expect(parsed.userNotes).toBe(newNotes);
    });

    it('should not create metadata for plain text existing notes', () => {
      const result = updateUserNotes('Plain old note', 'Plain new note');

      expect(result).toBe('Plain new note');
      expect(() => JSON.parse(result)).toThrow(); // Should not be JSON
    });

    it('should handle invalid JSON existing notes', () => {
      const result = updateUserNotes('{ invalid json', 'New note');

      expect(result).toBe('New note');
    });

    it('should handle empty string as existing notes', () => {
      const result = updateUserNotes('', 'New note');

      expect(result).toBe('New note');
    });
  });

  describe('integration scenarios', () => {
    it('should handle full workflow: create, update, extract', () => {
      // Start with metadata
      const initialMetadata = {
        sourceThoughtId: 'thought-workflow',
        createdBy: 'thought-processor',
      };
      const initialNotes = JSON.stringify(initialMetadata);

      // Update user notes
      const updated1 = updateUserNotes(initialNotes, 'First note');
      expect(getUserNotes(updated1)).toBe('First note');

      // Update again
      const updated2 = updateUserNotes(updated1, 'Second note');
      expect(getUserNotes(updated2)).toBe('Second note');

      // Verify metadata preserved
      const finalMetadata = parseNotesMetadata(updated2);
      expect(finalMetadata?.sourceThoughtId).toBe('thought-workflow');
      expect(finalMetadata?.createdBy).toBe('thought-processor');
    });

    it('should handle transition from plain to metadata notes', () => {
      // Start with plain notes
      let notes = 'Plain note';
      expect(getUserNotes(notes)).toBe('Plain note');

      // Update (should remain plain)
      notes = updateUserNotes(notes, 'Updated plain note');
      expect(getUserNotes(notes)).toBe('Updated plain note');
      expect(parseNotesMetadata(notes)).toBeNull();
    });

    it('should preserve metadata through multiple updates', () => {
      const metadata = {
        sourceThoughtId: 'thought-preserve',
        createdBy: 'thought-processor',
        customData: { nested: 'value' },
      };
      let notes = JSON.stringify(metadata);

      // Multiple updates
      notes = updateUserNotes(notes, 'Note 1');
      notes = updateUserNotes(notes, 'Note 2');
      notes = updateUserNotes(notes, 'Note 3');

      // Verify metadata still intact
      const finalMetadata = parseNotesMetadata(notes);
      expect(finalMetadata?.sourceThoughtId).toBe('thought-preserve');
      expect(finalMetadata?.customData).toEqual({ nested: 'value' });
      expect(getUserNotes(notes)).toBe('Note 3');
    });
  });
});
