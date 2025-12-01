import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD format
  time?: string; // HH:MM format (24-hour)
  endTime?: string; // HH:MM format (24-hour) - for .ics DTEND
  location?: string;
  description?: string;
  category: string;
  color: string;
  thoughtId?: string;
  // ICS-specific fields
  allDay?: boolean; // For all-day events
  recurrence?: string; // RRULE format (e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR")
  alarm?: number; // Minutes before event to show reminder
  url?: string; // Associated URL
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED'; // Event status
  createdAt: string;
  updatedAt: string;
}

interface CalendarState {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;

  // Actions
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  getEventsForDate: (date: string) => CalendarEvent[];
  getEventsForMonth: (year: number, month: number) => CalendarEvent[];
  getEventsForThought: (thoughtId: string) => CalendarEvent[];
  clearEvents: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  // ICS Export/Import
  exportToICS: (eventIds?: string[]) => string;
  importFromICS: (icsContent: string) => Promise<number>;
}

export const useCalendar = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: [],
      loading: false,
      error: null,

      addEvent: (eventData) => {
        const newEvent: CalendarEvent = {
          ...eventData,
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          events: [...state.events, newEvent],
        }));
      },

      updateEvent: (id, updates) => {
        set((state) => ({
          events: state.events.map((event) =>
            event.id === id
              ? { ...event, ...updates, updatedAt: new Date().toISOString() }
              : event
          ),
        }));
      },

      deleteEvent: (id) => {
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        }));
      },

      getEventsForDate: (date) => {
        const { events } = get();
        return events.filter((event) => event.date === date);
      },

      getEventsForMonth: (year, month) => {
        const { events } = get();
        return events.filter((event) => {
          const eventDate = new Date(event.date);
          return eventDate.getFullYear() === year && eventDate.getMonth() === month;
        });
      },

      getEventsForThought: (thoughtId) => {
        const { events } = get();
        return events.filter((event) => event.thoughtId === thoughtId);
      },

      clearEvents: () => {
        set({ events: [] });
      },

      setLoading: (loading) => {
        set({ loading });
      },

      setError: (error) => {
        set({ error });
      },

      exportToICS: (eventIds) => {
        const { events } = get();
        const eventsToExport = eventIds
          ? events.filter((e) => eventIds.includes(e.id))
          : events;

        const icsEvents = eventsToExport.map((event) => {
          const dtstart = formatICSDateTime(event.date, event.time, event.allDay);
          const dtend = formatICSDateTime(
            event.date,
            event.endTime || event.time,
            event.allDay
          );
          const dtstamp = formatICSDateTime(event.createdAt);
          const lastModified = formatICSDateTime(event.updatedAt);

          let icsEvent = [
            'BEGIN:VEVENT',
            `UID:${event.id}@focus-notebook.app`,
            `DTSTAMP:${dtstamp}`,
            `DTSTART${event.allDay ? ';VALUE=DATE' : ''}:${dtstart}`,
            `DTEND${event.allDay ? ';VALUE=DATE' : ''}:${dtend}`,
            `SUMMARY:${escapeICSText(event.title)}`,
            `STATUS:${event.status || 'CONFIRMED'}`,
            `CREATED:${dtstamp}`,
            `LAST-MODIFIED:${lastModified}`,
          ];

          if (event.description) {
            icsEvent.push(`DESCRIPTION:${escapeICSText(event.description)}`);
          }
          if (event.location) {
            icsEvent.push(`LOCATION:${escapeICSText(event.location)}`);
          }
          if (event.url) {
            icsEvent.push(`URL:${event.url}`);
          }
          if (event.category) {
            icsEvent.push(`CATEGORIES:${event.category}`);
          }
          if (event.recurrence) {
            icsEvent.push(`RRULE:${event.recurrence}`);
          }
          if (event.alarm) {
            icsEvent.push(
              'BEGIN:VALARM',
              'ACTION:DISPLAY',
              `DESCRIPTION:${escapeICSText(event.title)}`,
              `TRIGGER:-PT${event.alarm}M`,
              'END:VALARM'
            );
          }

          icsEvent.push('END:VEVENT');
          return icsEvent.join('\r\n');
        });

        const icsContent = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Focus Notebook//Calendar//EN',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          ...icsEvents,
          'END:VCALENDAR',
        ].join('\r\n');

        return icsContent;
      },

      importFromICS: async (icsContent) => {
        const events = parseICS(icsContent);
        let imported = 0;

        events.forEach((eventData) => {
          const { addEvent } = get();
          addEvent(eventData);
          imported++;
        });

        return imported;
      },
    }),
    {
      name: 'calendar-storage',
      partialize: (state) => ({
        events: state.events,
      }),
    }
  )
);

// Helper functions for ICS format
function formatICSDateTime(dateOrISO: string, time?: string, allDay?: boolean): string {
  // Parse date string directly to avoid timezone issues
  let year: string, month: string, day: string;

  if (dateOrISO.includes('-')) {
    // Date is in YYYY-MM-DD format
    const parts = dateOrISO.split('T')[0].split('-');
    year = parts[0];
    month = parts[1];
    day = parts[2];
  } else {
    // ISO string or other format - use Date object
    const date = new Date(dateOrISO);
    year = String(date.getUTCFullYear());
    month = String(date.getUTCMonth() + 1).padStart(2, '0');
    day = String(date.getUTCDate()).padStart(2, '0');
  }

  if (allDay) {
    // For all-day events, return YYYYMMDD
    return `${year}${month}${day}`;
  }

  if (time) {
    // For events with time, return YYYYMMDDTHHmmss
    const [hours, minutes] = time.split(':');
    return `${year}${month}${day}T${hours.padStart(2, '0')}${minutes.padStart(2, '0')}00`;
  }

  // Default to midnight UTC for timestamps
  const date = new Date(dateOrISO);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const mins = String(date.getUTCMinutes()).padStart(2, '0');
  const secs = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${mins}${secs}Z`;
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function parseICS(icsContent: string): Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>[] {
  const events: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const lines = icsContent.split(/\r?\n/);
  let currentEvent: Partial<CalendarEvent> | null = null;
  let insideAlarm = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'BEGIN:VEVENT') {
      currentEvent = {
        title: '',
        date: '',
        category: 'Personal',
        color: 'from-blue-500 to-cyan-500',
        status: 'CONFIRMED',
      };
      insideAlarm = false;
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.title && currentEvent.date) {
        events.push(currentEvent as Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>);
      }
      currentEvent = null;
      insideAlarm = false;
    } else if (line === 'BEGIN:VALARM') {
      insideAlarm = true;
    } else if (line === 'END:VALARM') {
      insideAlarm = false;
    } else if (currentEvent) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':');

      if (insideAlarm) {
        // Handle alarm-specific fields
        if (key === 'TRIGGER') {
          const match = value.match(/-PT(\d+)M/);
          if (match) {
            currentEvent.alarm = parseInt(match[1], 10);
          }
        }
      } else {
        // Handle event fields
        if (key.startsWith('DTSTART')) {
          const { date, time, allDay } = parseICSDateTime(value, key);
          currentEvent.date = date;
          currentEvent.time = time;
          currentEvent.allDay = allDay;
        } else if (key.startsWith('DTEND')) {
          const { time } = parseICSDateTime(value, key);
          currentEvent.endTime = time;
        } else if (key === 'SUMMARY') {
          currentEvent.title = unescapeICSText(value);
        } else if (key === 'DESCRIPTION') {
          currentEvent.description = unescapeICSText(value);
        } else if (key === 'LOCATION') {
          currentEvent.location = unescapeICSText(value);
        } else if (key === 'URL') {
          currentEvent.url = value;
        } else if (key === 'CATEGORIES') {
          currentEvent.category = value;
        } else if (key === 'STATUS') {
          currentEvent.status = value as CalendarEvent['status'];
        } else if (key === 'RRULE') {
          currentEvent.recurrence = value;
        }
      }
    }
  }

  return events;
}

function parseICSDateTime(value: string, key: string): { date: string; time?: string; allDay: boolean } {
  const isAllDay = key.includes('VALUE=DATE');

  if (isAllDay) {
    // Format: YYYYMMDD
    const year = value.substring(0, 4);
    const month = value.substring(4, 6);
    const day = value.substring(6, 8);
    return { date: `${year}-${month}-${day}`, allDay: true };
  }

  // Format: YYYYMMDDTHHmmss or YYYYMMDDTHHmmssZ
  const dateStr = value.replace(/[TZ]/g, '');
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  const hours = dateStr.substring(8, 10);
  const minutes = dateStr.substring(10, 12);

  return {
    date: `${year}-${month}-${day}`,
    time: hours && minutes ? `${hours}:${minutes}` : undefined,
    allDay: false,
  };
}

function unescapeICSText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}
