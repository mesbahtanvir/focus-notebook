import { Thought } from "@/store/useThoughts";

/**
 * Filters thoughts that have the 'cbt' tag but not the 'cbt-processed' tag
 */
export function filterUnprocessedThoughts(thoughts: Thought[], searchQuery: string = ""): Thought[] {
  const searchLower = searchQuery.toLowerCase();
  return thoughts.filter(thought => {
    const tags = thought.tags || [];
    const isCBT = tags.includes('cbt') && !tags.includes('cbt-processed');

    if (!isCBT) return false;

    // Apply search filter
    if (searchQuery) {
      const textMatch = thought.text?.toLowerCase().includes(searchLower);
      const tagsMatch = thought.tags?.some(tag => tag.toLowerCase().includes(searchLower));
      return textMatch || tagsMatch;
    }

    return true;
  });
}

/**
 * Filters thoughts that have been processed with CBT
 */
export function filterProcessedThoughts(thoughts: Thought[], searchQuery: string = ""): Thought[] {
  const searchLower = searchQuery.toLowerCase();
  return thoughts.filter(thought => {
    const tags = thought.tags || [];
    const isProcessed = tags.includes('cbt-processed') && thought.cbtAnalysis;

    if (!isProcessed) return false;

    // Apply search filter
    if (searchQuery) {
      const textMatch = thought.text?.toLowerCase().includes(searchLower);
      const tagsMatch = thought.tags?.some(tag => tag.toLowerCase().includes(searchLower));
      return textMatch || tagsMatch;
    }

    return true;
  }).sort((a, b) => {
    const dateA = a.cbtAnalysis?.analyzedAt ? new Date(a.cbtAnalysis.analyzedAt).getTime() : 0;
    const dateB = b.cbtAnalysis?.analyzedAt ? new Date(b.cbtAnalysis.analyzedAt).getTime() : 0;
    return dateB - dateA; // Most recent first
  });
}

/**
 * Calculates CBT statistics from a list of thoughts
 */
export function calculateCBTStats(thoughts: Thought[], unprocessedCount: number): {
  toProcess: number;
  processed: number;
  total: number;
} {
  const processed = thoughts.filter(t => t.tags?.includes('cbt-processed')).length;
  const total = thoughts.filter(t => t.tags?.includes('cbt')).length;
  
  return { 
    toProcess: unprocessedCount, 
    processed, 
    total 
  };
}

/**
 * Formats a date to a readable string
 * Handles various date formats including Firestore Timestamp objects
 */
export function formatDate(date: any): string {
  try {
    if (!date) return 'N/A';
    
    // Check for invalid types
    if (typeof date === 'boolean' || Array.isArray(date)) {
      return 'N/A';
    }
    
    let dateObj: Date;
    
    // Handle Firestore Timestamp
    if (typeof date === 'object' && 'toDate' in date) {
      dateObj = date.toDate();
    }
    // Handle Firestore Timestamp with seconds
    else if (typeof date === 'object' && 'seconds' in date) {
      if (isNaN(date.seconds)) {
        return 'N/A';
      }
      dateObj = new Date(date.seconds * 1000);
    }
    // Handle string dates
    else if (typeof date === 'string') {
      dateObj = new Date(date);
    }
    // Handle Date objects
    else if (date instanceof Date) {
      dateObj = date;
    }
    // Handle number timestamps
    else if (typeof date === 'number') {
      dateObj = new Date(date);
    }
    // Invalid object structure
    else {
      return 'N/A';
    }
    
    // Check if date is invalid
    if (isNaN(dateObj.getTime())) {
      return 'N/A';
    }
    
    return dateObj.toLocaleDateString();
  } catch {
    return 'N/A';
  }
}

/**
 * Formats a date to a detailed readable string with time
 */
export function formatDetailedDate(date: string | undefined): string {
  try {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    
    // Check if date is invalid
    if (isNaN(dateObj.getTime())) {
      return 'N/A';
    }
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Adds the 'cbt-processed' tag to a thought's tags array
 */
export function addCBTProcessedTag(tags: string[]): string[] {
  const updatedTags = [...tags];
  if (!updatedTags.includes('cbt-processed')) {
    updatedTags.push('cbt-processed');
  }
  return updatedTags;
}

