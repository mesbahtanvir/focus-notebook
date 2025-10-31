// Format date like "10th Oct 2025"
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  
  // Get ordinal suffix
  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  
  return `${ordinal(day)} ${month} ${year}`;
}

// Format time like "Morning", "Afternoon", "Evening", "Night"
export function formatTimeOfDay(dateString: string): string {
  const date = new Date(dateString);
  const hour = date.getHours();
  
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
}

// Get full formatted datetime
export function formatDateTime(dateString: string): string {
  return `${formatDate(dateString)}, ${formatTimeOfDay(dateString)}`;
}

// Get time of day as number (for analytics)
export function getTimeOfDayCategory(dateString: string): 'morning' | 'afternoon' | 'evening' | 'night' {
  const date = new Date(dateString);
  const hour = date.getUTCHours();

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}
