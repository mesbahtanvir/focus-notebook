/**
 * Utility functions for handling task notes and metadata
 */

interface TaskMetadata {
  sourceThoughtId?: string;
  createdBy?: string;
  userNotes?: string;
  [key: string]: any;
}

/**
 * Parse metadata from task notes field
 * Returns null if notes are not valid JSON or don't contain metadata
 */
export function parseNotesMetadata(notes?: string): TaskMetadata | null {
  if (!notes) return null;

  try {
    const parsed = JSON.parse(notes);
    // Check if it's metadata by looking for known metadata fields
    if (typeof parsed === 'object' && parsed !== null &&
        (parsed.sourceThoughtId || parsed.createdBy === 'thought-processor')) {
      return parsed;
    }
  } catch (error) {
    // Not valid JSON, not metadata
    return null;
  }

  return null;
}

/**
 * Extract user-visible notes from task notes field
 * If notes contain metadata, extracts userNotes field
 * Otherwise returns notes as-is
 */
export function getUserNotes(notes?: string): string {
  if (!notes) return '';

  const metadata = parseNotesMetadata(notes);
  if (metadata) {
    return metadata.userNotes || '';
  }

  return notes;
}

/**
 * Update user notes while preserving metadata
 */
export function updateUserNotes(currentNotes: string | undefined, newUserNotes: string): string {
  const metadata = parseNotesMetadata(currentNotes);

  if (metadata) {
    // Preserve metadata, update userNotes
    return JSON.stringify({
      ...metadata,
      userNotes: newUserNotes
    });
  }

  // No metadata, just return the new notes
  return newUserNotes;
}
