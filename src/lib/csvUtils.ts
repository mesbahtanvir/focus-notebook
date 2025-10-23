import { Thought } from '@/store/useThoughts';

/**
 * Convert thoughts to CSV format
 */
export function thoughtsToCSV(thoughts: Thought[]): string {
  if (thoughts.length === 0) {
    return 'id,text,createdAt,tags,intensity,notes,isDeepThought,deepThoughtNotes';
  }

  const headers = [
    'id',
    'text',
    'createdAt',
    'tags',
    'intensity',
    'notes',
    'isDeepThought',
    'deepThoughtNotes',
    'cbtSituation',
    'cbtAutomaticThought',
    'cbtEmotion',
    'cbtEvidence',
    'cbtAlternativeThought',
    'cbtOutcome'
  ];

  const escapeCsvValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // Escape double quotes and wrap in quotes if contains comma, newline, or quote
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const rows = thoughts.map(thought => {
    return [
      escapeCsvValue(thought.id),
      escapeCsvValue(thought.text),
      escapeCsvValue(typeof thought.createdAt === 'string' ? thought.createdAt : new Date(thought.createdAt?.seconds * 1000 || Date.now()).toISOString()),
      escapeCsvValue(thought.tags?.join(';') || ''),
      escapeCsvValue(thought.intensity || ''),
      escapeCsvValue(thought.notes || ''),
      escapeCsvValue(thought.isDeepThought || ''),
      escapeCsvValue(thought.deepThoughtNotes || ''),
      escapeCsvValue(thought.cbtAnalysis?.situation || ''),
      escapeCsvValue(thought.cbtAnalysis?.automaticThought || ''),
      escapeCsvValue(thought.cbtAnalysis?.emotion || ''),
      escapeCsvValue(thought.cbtAnalysis?.evidence || ''),
      escapeCsvValue(thought.cbtAnalysis?.alternativeThought || ''),
      escapeCsvValue(thought.cbtAnalysis?.outcome || '')
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Parse CSV content to thoughts
 */
export function csvToThoughts(csvContent: string): Omit<Thought, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const thoughts: Omit<Thought, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length < 2) continue; // Skip invalid rows
    
    const thought: any = {
      text: values[headers.indexOf('text')] || '',
    };

    // Parse optional fields
    const tagsValue = values[headers.indexOf('tags')];
    if (tagsValue) {
      thought.tags = tagsValue.split(';').filter(t => t.trim());
    }

    const intensityValue = values[headers.indexOf('intensity')];
    if (intensityValue && !isNaN(Number(intensityValue))) {
      thought.intensity = Number(intensityValue);
    }

    const notesValue = values[headers.indexOf('notes')];
    if (notesValue) {
      thought.notes = notesValue;
    }

    const isDeepThoughtValue = values[headers.indexOf('isDeepThought')];
    if (isDeepThoughtValue === 'true') {
      thought.isDeepThought = true;
    }

    const deepThoughtNotesValue = values[headers.indexOf('deepThoughtNotes')];
    if (deepThoughtNotesValue) {
      thought.deepThoughtNotes = deepThoughtNotesValue;
    }

    // Parse CBT analysis if present
    const cbtSituation = values[headers.indexOf('cbtSituation')];
    const cbtAutomaticThought = values[headers.indexOf('cbtAutomaticThought')];
    const cbtEmotion = values[headers.indexOf('cbtEmotion')];
    const cbtEvidence = values[headers.indexOf('cbtEvidence')];
    const cbtAlternativeThought = values[headers.indexOf('cbtAlternativeThought')];
    const cbtOutcome = values[headers.indexOf('cbtOutcome')];

    if (cbtSituation || cbtAutomaticThought || cbtEmotion) {
      thought.cbtAnalysis = {
        situation: cbtSituation || undefined,
        automaticThought: cbtAutomaticThought || undefined,
        emotion: cbtEmotion || undefined,
        evidence: cbtEvidence || undefined,
        alternativeThought: cbtAlternativeThought || undefined,
        outcome: cbtOutcome || undefined,
      };
    }

    if (thought.text) {
      thoughts.push(thought);
    }
  }

  return thoughts;
}

/**
 * Parse a CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);

  return result;
}
