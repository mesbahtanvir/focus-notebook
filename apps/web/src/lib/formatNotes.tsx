/**
 * Utility functions for formatting and displaying task notes
 * Handles JSON detection, parsing, and clean display formatting
 */

import React from 'react';

/**
 * Checks if a string is valid JSON
 */
export function isJSON(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}

/**
 * Formats JSON object into a clean, readable display
 */
export function formatJSONForDisplay(obj: any): React.ReactNode {
  if (Array.isArray(obj)) {
    return (
      <ul className="list-disc list-inside space-y-1">
        {obj.map((item, index) => (
          <li key={index} className="text-sm">
            {typeof item === 'object' ? formatJSONForDisplay(item) : String(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    return (
      <div className="space-y-2">
        {Object.entries(obj).map(([key, value]) => (
          <div key={key} className="border-l-2 border-indigo-200 dark:border-indigo-800 pl-3">
            <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">
              {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {typeof value === 'object' ? formatJSONForDisplay(value) : String(value)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-sm">{String(obj)}</span>;
}

/**
 * Component to display notes in a clean, formatted way
 */
export function FormattedNotes({ notes, className = '' }: { notes: string; className?: string }) {
  // Check if notes is JSON
  if (isJSON(notes)) {
    try {
      const parsed = JSON.parse(notes);
      return (
        <div className={`rounded-lg bg-indigo-50 dark:bg-indigo-950/20 p-4 ${className}`}>
          {formatJSONForDisplay(parsed)}
        </div>
      );
    } catch {
      // Fall through to plain text display
    }
  }

  // Check if notes contains bullet points or numbered lists
  const lines = notes.split('\n');
  const hasBullets = lines.some(line => /^[-*•]\s/.test(line.trim()));
  const hasNumbers = lines.some(line => /^\d+\.\s/.test(line.trim()));

  if (hasBullets || hasNumbers) {
    return (
      <div className={`space-y-2 ${className}`}>
        {lines.map((line, index) => {
          const trimmed = line.trim();
          
          // Bullet point
          if (/^[-*•]\s/.test(trimmed)) {
            return (
              <div key={index} className="flex gap-2">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span className="flex-1 text-sm">{trimmed.replace(/^[-*•]\s/, '')}</span>
              </div>
            );
          }
          
          // Numbered list
          if (/^\d+\.\s/.test(trimmed)) {
            const match = trimmed.match(/^(\d+)\.\s(.*)$/);
            if (match) {
              return (
                <div key={index} className="flex gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold min-w-[1.5rem]">
                    {match[1]}.
                  </span>
                  <span className="flex-1 text-sm">{match[2]}</span>
                </div>
              );
            }
          }
          
          // Regular line
          if (trimmed) {
            return (
              <p key={index} className="text-sm">
                {trimmed}
              </p>
            );
          }
          
          // Empty line (spacing)
          return <div key={index} className="h-2" />;
        })}
      </div>
    );
  }

  // Plain text with preserved line breaks
  return (
    <div className={`text-sm whitespace-pre-wrap leading-relaxed ${className}`}>
      {notes}
    </div>
  );
}

/**
 * Get a plain text preview of notes (for list views)
 */
export function getNotesPreview(notes: string, maxLength: number = 100): string {
  if (!notes) return '';

  // If JSON, convert to readable summary
  if (isJSON(notes)) {
    try {
      const parsed = JSON.parse(notes);
      if (typeof parsed === 'object') {
        const keys = Object.keys(parsed);
        return `${keys.join(', ')}...`;
      }
    } catch {
      // Fall through
    }
  }

  // Clean up markdown-style formatting for preview
  let preview = notes
    .replace(/^[-*•]\s/gm, '') // Remove bullet points
    .replace(/^\d+\.\s/gm, '') // Remove numbers
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();

  // Truncate if too long
  if (preview.length > maxLength) {
    preview = preview.substring(0, maxLength).trim() + '...';
  }

  return preview;
}
