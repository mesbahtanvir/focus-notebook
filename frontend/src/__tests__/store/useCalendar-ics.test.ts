import { useCalendar, CalendarEvent } from '@/store/useCalendar';

describe('useCalendar ICS functionality', () => {
  beforeEach(() => {
    // Clear any existing events
    useCalendar.getState().clearEvents();
  });

  afterEach(() => {
    // Clean up after each test
    useCalendar.getState().clearEvents();
  });

  describe('exportToICS', () => {
    it('should export events to valid ICS format', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      // Add a test event
      addEvent({
        title: 'Test Event',
        date: '2025-12-01',
        time: '14:30',
        location: 'Conference Room',
        description: 'Team meeting',
        category: 'Work',
        color: 'from-blue-500 to-cyan-500',
      });

      const icsContent = exportToICS();

      // Verify ICS structure
      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(icsContent).toContain('VERSION:2.0');
      expect(icsContent).toContain('PRODID:-//Focus Notebook//Calendar//EN');
      expect(icsContent).toContain('BEGIN:VEVENT');
      expect(icsContent).toContain('SUMMARY:Test Event');
      expect(icsContent).toContain('LOCATION:Conference Room');
      expect(icsContent).toContain('DESCRIPTION:Team meeting');
      expect(icsContent).toContain('CATEGORIES:Work');
      expect(icsContent).toContain('END:VEVENT');
      expect(icsContent).toContain('END:VCALENDAR');
    });

    it('should handle all-day events correctly', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      addEvent({
        title: 'All Day Event',
        date: '2025-12-01',
        category: 'Personal',
        color: 'from-emerald-500 to-lime-500',
        allDay: true,
      });

      const icsContent = exportToICS();

      expect(icsContent).toContain('DTSTART;VALUE=DATE:20251201');
      expect(icsContent).toContain('DTEND;VALUE=DATE:20251201');
    });

    it('should escape special characters in ICS text', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      addEvent({
        title: 'Event with; special, characters\\n',
        date: '2025-12-01',
        description: 'Description with\nnewlines and; semicolons, commas',
        category: 'Work',
        color: 'from-blue-500 to-cyan-500',
      });

      const icsContent = exportToICS();

      expect(icsContent).toContain('SUMMARY:Event with\\; special\\, characters\\\\n');
      expect(icsContent).toContain('DESCRIPTION:Description with\\nnewlines and\\; semicolons\\, commas');
    });

    it('should include alarm if specified', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      addEvent({
        title: 'Event with Reminder',
        date: '2025-12-01',
        time: '14:00',
        category: 'Work',
        color: 'from-blue-500 to-cyan-500',
        alarm: 15, // 15 minutes before
      });

      const icsContent = exportToICS();

      expect(icsContent).toContain('BEGIN:VALARM');
      expect(icsContent).toContain('TRIGGER:-PT15M');
      expect(icsContent).toContain('END:VALARM');
    });
  });

  describe('importFromICS', () => {
    it('should import events from valid ICS content', async () => {
      const { importFromICS, events } = useCalendar.getState();

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-1@example.com
DTSTART:20251201T143000
DTEND:20251201T153000
SUMMARY:Imported Event
LOCATION:Office
DESCRIPTION:Test description
CATEGORIES:Work
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

      const imported = await importFromICS(icsContent);

      expect(imported).toBe(1);
      expect(useCalendar.getState().events).toHaveLength(1);

      const event = useCalendar.getState().events[0];
      expect(event.title).toBe('Imported Event');
      expect(event.date).toBe('2025-12-01');
      expect(event.time).toBe('14:30');
      expect(event.endTime).toBe('15:30');
      expect(event.location).toBe('Office');
      expect(event.description).toBe('Test description');
      expect(event.category).toBe('Work');
      expect(event.status).toBe('CONFIRMED');
    });

    it('should handle all-day events from ICS', async () => {
      const { importFromICS } = useCalendar.getState();

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-event-2@example.com
DTSTART;VALUE=DATE:20251201
DTEND;VALUE=DATE:20251201
SUMMARY:All Day Event
END:VEVENT
END:VCALENDAR`;

      await importFromICS(icsContent);

      const event = useCalendar.getState().events[0];
      expect(event.title).toBe('All Day Event');
      expect(event.date).toBe('2025-12-01');
      expect(event.allDay).toBe(true);
    });

    it('should unescape special characters from ICS', async () => {
      const { importFromICS } = useCalendar.getState();

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-event-3@example.com
DTSTART:20251201T143000
SUMMARY:Event with\\; special\\, characters
DESCRIPTION:Description with\\nnewlines
END:VEVENT
END:VCALENDAR`;

      await importFromICS(icsContent);

      const event = useCalendar.getState().events[0];
      expect(event.title).toBe('Event with; special, characters');
      expect(event.description).toBe('Description with\nnewlines');
    });

    it('should handle recurrence rules', async () => {
      const { importFromICS } = useCalendar.getState();

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-event-4@example.com
DTSTART:20251201T143000
SUMMARY:Recurring Event
RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR
END:VEVENT
END:VCALENDAR`;

      await importFromICS(icsContent);

      const event = useCalendar.getState().events[0];
      expect(event.recurrence).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR');
    });

    it('should import multiple events', async () => {
      const { importFromICS } = useCalendar.getState();

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-1@example.com
DTSTART:20251201T143000
SUMMARY:Event 1
END:VEVENT
BEGIN:VEVENT
UID:event-2@example.com
DTSTART:20251202T100000
SUMMARY:Event 2
END:VEVENT
BEGIN:VEVENT
UID:event-3@example.com
DTSTART:20251203T150000
SUMMARY:Event 3
END:VEVENT
END:VCALENDAR`;

      const imported = await importFromICS(icsContent);

      expect(imported).toBe(3);
      expect(useCalendar.getState().events).toHaveLength(3);
    });
  });

  describe('round-trip export and import', () => {
    it('should preserve event data through export and import', async () => {
      const { addEvent, exportToICS, clearEvents, importFromICS } = useCalendar.getState();

      // Create test events
      addEvent({
        title: 'Meeting',
        date: '2025-12-01',
        time: '14:30',
        endTime: '15:30',
        location: 'Conference Room',
        description: 'Team sync',
        category: 'Work',
        color: 'from-blue-500 to-cyan-500',
        status: 'CONFIRMED',
      });

      addEvent({
        title: 'Birthday Party',
        date: '2025-12-15',
        category: 'Personal',
        color: 'from-emerald-500 to-lime-500',
        allDay: true,
      });

      // Export to ICS
      const icsContent = exportToICS();

      // Clear events and re-import
      clearEvents();
      expect(useCalendar.getState().events).toHaveLength(0);

      await importFromICS(icsContent);

      // Verify events were restored
      const events = useCalendar.getState().events;
      expect(events).toHaveLength(2);

      const meeting = events.find((e) => e.title === 'Meeting');
      expect(meeting).toBeDefined();
      expect(meeting?.date).toBe('2025-12-01');
      expect(meeting?.time).toBe('14:30');
      expect(meeting?.location).toBe('Conference Room');

      const party = events.find((e) => e.title === 'Birthday Party');
      expect(party).toBeDefined();
      expect(party?.date).toBe('2025-12-15');
      expect(party?.allDay).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty calendar export', () => {
      const { exportToICS } = useCalendar.getState();
      const icsContent = exportToICS();

      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(icsContent).toContain('END:VCALENDAR');
      expect(icsContent).not.toContain('BEGIN:VEVENT');
    });

    it('should handle empty ICS import gracefully', async () => {
      const { importFromICS } = useCalendar.getState();

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
END:VCALENDAR`;

      const imported = await importFromICS(icsContent);
      expect(imported).toBe(0);
      expect(useCalendar.getState().events).toHaveLength(0);
    });

    it('should skip events without required fields on import', async () => {
      const { importFromICS } = useCalendar.getState();

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:incomplete-event@example.com
DTSTART:20251201T143000
END:VEVENT
BEGIN:VEVENT
UID:valid-event@example.com
DTSTART:20251201T143000
SUMMARY:Valid Event
END:VEVENT
END:VCALENDAR`;

      const imported = await importFromICS(icsContent);
      expect(imported).toBe(1);
      expect(useCalendar.getState().events).toHaveLength(1);
      expect(useCalendar.getState().events[0].title).toBe('Valid Event');
    });

    it('should handle malformed ICS content gracefully', async () => {
      const { importFromICS } = useCalendar.getState();

      const icsContent = `This is not valid ICS content`;

      const imported = await importFromICS(icsContent);
      expect(imported).toBe(0);
    });

    it('should handle very long event descriptions', () => {
      const { addEvent, exportToICS } = useCalendar.getState();
      const longDescription = 'A'.repeat(5000);

      addEvent({
        title: 'Event with Long Description',
        date: '2025-12-01',
        description: longDescription,
        category: 'Work',
        color: 'from-blue-500 to-cyan-500',
      });

      const icsContent = exportToICS();
      expect(icsContent).toContain(longDescription.replace(/\n/g, '\\n'));
    });

    it('should handle special characters in all fields', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      addEvent({
        title: 'Title;with,special\\chars',
        date: '2025-12-01',
        location: 'Location;with,special\\chars',
        description: 'Description;with,special\\chars\nand newlines',
        category: 'Work',
        color: 'from-blue-500 to-cyan-500',
      });

      const icsContent = exportToICS();
      expect(icsContent).toContain('SUMMARY:Title\\;with\\,special\\\\chars');
      expect(icsContent).toContain('LOCATION:Location\\;with\\,special\\\\chars');
      expect(icsContent).toContain('DESCRIPTION:Description\\;with\\,special\\\\chars\\nand newlines');
    });

    it('should handle events on leap year dates', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      addEvent({
        title: 'Leap Day Event',
        date: '2024-02-29',
        category: 'Personal',
        color: 'from-emerald-500 to-lime-500',
        allDay: true,
      });

      const icsContent = exportToICS();
      expect(icsContent).toContain('DTSTART;VALUE=DATE:20240229');
    });

    it('should handle midnight events correctly', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      addEvent({
        title: 'Midnight Event',
        date: '2025-12-01',
        time: '00:00',
        category: 'Work',
        color: 'from-blue-500 to-cyan-500',
      });

      const icsContent = exportToICS();
      expect(icsContent).toContain('DTSTART:20251201T000000');
    });

    it('should handle events with only DTSTART (no DTEND)', async () => {
      const { importFromICS } = useCalendar.getState();

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:no-end-time@example.com
DTSTART:20251201T143000
SUMMARY:Event Without End Time
END:VEVENT
END:VCALENDAR`;

      await importFromICS(icsContent);
      const event = useCalendar.getState().events[0];
      expect(event.title).toBe('Event Without End Time');
      expect(event.time).toBe('14:30');
      expect(event.endTime).toBeUndefined();
    });

    it('should preserve event order on export', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      addEvent({ title: 'Event 1', date: '2025-12-01', category: 'Work', color: 'from-blue-500 to-cyan-500' });
      addEvent({ title: 'Event 2', date: '2025-12-02', category: 'Work', color: 'from-blue-500 to-cyan-500' });
      addEvent({ title: 'Event 3', date: '2025-12-03', category: 'Work', color: 'from-blue-500 to-cyan-500' });

      const icsContent = exportToICS();
      const event1Index = icsContent.indexOf('SUMMARY:Event 1');
      const event2Index = icsContent.indexOf('SUMMARY:Event 2');
      const event3Index = icsContent.indexOf('SUMMARY:Event 3');

      expect(event1Index).toBeGreaterThan(-1);
      expect(event2Index).toBeGreaterThan(event1Index);
      expect(event3Index).toBeGreaterThan(event2Index);
    });
  });

  describe('advanced ICS features', () => {
    it('should handle multiple alarms', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      addEvent({
        title: 'Event with Alarm',
        date: '2025-12-01',
        time: '14:00',
        category: 'Work',
        color: 'from-blue-500 to-cyan-500',
        alarm: 30,
      });

      const icsContent = exportToICS();
      expect(icsContent).toContain('BEGIN:VALARM');
      expect(icsContent).toContain('TRIGGER:-PT30M');
      expect(icsContent).toContain('END:VALARM');
    });

    it('should handle different event statuses', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      addEvent({
        title: 'Confirmed Event',
        date: '2025-12-01',
        category: 'Work',
        color: 'from-blue-500 to-cyan-500',
        status: 'CONFIRMED',
      });

      addEvent({
        title: 'Tentative Event',
        date: '2025-12-02',
        category: 'Work',
        color: 'from-blue-500 to-cyan-500',
        status: 'TENTATIVE',
      });

      addEvent({
        title: 'Cancelled Event',
        date: '2025-12-03',
        category: 'Work',
        color: 'from-blue-500 to-cyan-500',
        status: 'CANCELLED',
      });

      const icsContent = exportToICS();
      expect(icsContent).toContain('STATUS:CONFIRMED');
      expect(icsContent).toContain('STATUS:TENTATIVE');
      expect(icsContent).toContain('STATUS:CANCELLED');
    });

    it('should handle events with URLs', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      addEvent({
        title: 'Event with URL',
        date: '2025-12-01',
        category: 'Work',
        color: 'from-blue-500 to-cyan-500',
        url: 'https://example.com/meeting',
      });

      const icsContent = exportToICS();
      expect(icsContent).toContain('URL:https://example.com/meeting');
    });

    it('should handle complex recurrence patterns', async () => {
      const { importFromICS } = useCalendar.getState();

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:recurring-complex@example.com
DTSTART:20251201T143000
SUMMARY:Complex Recurring Event
RRULE:FREQ=MONTHLY;BYDAY=2MO;COUNT=12
END:VEVENT
END:VCALENDAR`;

      await importFromICS(icsContent);
      const event = useCalendar.getState().events[0];
      expect(event.recurrence).toBe('FREQ=MONTHLY;BYDAY=2MO;COUNT=12');
    });

    it('should handle events with end times that span multiple days', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      addEvent({
        title: 'Multi-day Event',
        date: '2025-12-01',
        time: '23:00',
        endTime: '01:00', // Next day
        category: 'Work',
        color: 'from-blue-500 to-cyan-500',
      });

      const icsContent = exportToICS();
      expect(icsContent).toContain('DTSTART:20251201T230000');
      expect(icsContent).toContain('DTEND:20251201T010000');
    });
  });

  describe('export with selective events', () => {
    it('should export only specified event IDs', () => {
      const { addEvent, exportToICS, events } = useCalendar.getState();

      addEvent({ title: 'Event 1', date: '2025-12-01', category: 'Work', color: 'from-blue-500 to-cyan-500' });
      addEvent({ title: 'Event 2', date: '2025-12-02', category: 'Work', color: 'from-blue-500 to-cyan-500' });
      addEvent({ title: 'Event 3', date: '2025-12-03', category: 'Work', color: 'from-blue-500 to-cyan-500' });

      const allEvents = useCalendar.getState().events;
      const selectedIds = [allEvents[0].id, allEvents[2].id];

      const icsContent = exportToICS(selectedIds);

      expect(icsContent).toContain('Event 1');
      expect(icsContent).not.toContain('Event 2');
      expect(icsContent).toContain('Event 3');
    });

    it('should handle empty event ID array', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      addEvent({ title: 'Event 1', date: '2025-12-01', category: 'Work', color: 'from-blue-500 to-cyan-500' });

      const icsContent = exportToICS([]);

      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(icsContent).not.toContain('BEGIN:VEVENT');
    });

    it('should handle non-existent event IDs gracefully', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      addEvent({ title: 'Event 1', date: '2025-12-01', category: 'Work', color: 'from-blue-500 to-cyan-500' });

      const icsContent = exportToICS(['non-existent-id']);

      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(icsContent).not.toContain('Event 1');
    });
  });

  describe('date and time formats', () => {
    it('should handle different time zones in imported events', async () => {
      const { importFromICS } = useCalendar.getState();

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:timezone-event@example.com
DTSTART:20251201T143000Z
SUMMARY:UTC Event
END:VEVENT
END:VCALENDAR`;

      await importFromICS(icsContent);
      const event = useCalendar.getState().events[0];
      expect(event.date).toBe('2025-12-01');
      expect(event.time).toBe('14:30');
    });

    it('should handle events at year boundaries', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      addEvent({
        title: 'New Year Event',
        date: '2025-12-31',
        time: '23:59',
        category: 'Personal',
        color: 'from-emerald-500 to-lime-500',
      });

      const icsContent = exportToICS();
      expect(icsContent).toContain('DTSTART:20251231T235900');
    });

    it('should handle events in different months correctly', async () => {
      const { importFromICS } = useCalendar.getState();

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:jan-event@example.com
DTSTART:20250115T100000
SUMMARY:January Event
END:VEVENT
BEGIN:VEVENT
UID:dec-event@example.com
DTSTART:20251215T100000
SUMMARY:December Event
END:VEVENT
END:VCALENDAR`;

      await importFromICS(icsContent);
      const events = useCalendar.getState().events;
      expect(events).toHaveLength(2);
      expect(events[0].date).toBe('2025-01-15');
      expect(events[1].date).toBe('2025-12-15');
    });
  });

  describe('data integrity', () => {
    it('should maintain unique event IDs on import', async () => {
      const { importFromICS } = useCalendar.getState();

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-1@example.com
DTSTART:20251201T143000
SUMMARY:Event 1
END:VEVENT
BEGIN:VEVENT
UID:event-2@example.com
DTSTART:20251202T143000
SUMMARY:Event 2
END:VEVENT
END:VCALENDAR`;

      await importFromICS(icsContent);
      const events = useCalendar.getState().events;
      const ids = events.map((e) => e.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(events.length);
    });

    it('should preserve category mapping on round-trip', async () => {
      const { addEvent, exportToICS, clearEvents, importFromICS } = useCalendar.getState();

      const categories = ['Work', 'Personal', 'Health', 'Social', 'Learning'];
      categories.forEach((category, i) => {
        addEvent({
          title: `${category} Event`,
          date: `2025-12-0${i + 1}`,
          category: category as any,
          color: 'from-blue-500 to-cyan-500',
        });
      });

      const icsContent = exportToICS();
      clearEvents();
      await importFromICS(icsContent);

      const events = useCalendar.getState().events;
      categories.forEach((category) => {
        const event = events.find((e) => e.title === `${category} Event`);
        expect(event?.category).toBe(category);
      });
    });

    it('should not lose data on multiple round-trips', async () => {
      const { addEvent, exportToICS, clearEvents, importFromICS } = useCalendar.getState();

      const originalEvent = {
        title: 'Round Trip Test',
        date: '2025-12-01',
        time: '14:30',
        endTime: '15:30',
        location: 'Test Location',
        description: 'Test Description\nWith newlines',
        category: 'Work' as const,
        color: 'from-blue-500 to-cyan-500',
        allDay: false,
        recurrence: 'FREQ=WEEKLY;BYDAY=MO',
        alarm: 15,
        url: 'https://example.com',
        status: 'CONFIRMED' as const,
      };

      addEvent(originalEvent);

      // Round trip 1
      let icsContent = exportToICS();
      clearEvents();
      await importFromICS(icsContent);

      // Round trip 2
      icsContent = exportToICS();
      clearEvents();
      await importFromICS(icsContent);

      // Round trip 3
      icsContent = exportToICS();
      clearEvents();
      await importFromICS(icsContent);

      const finalEvent = useCalendar.getState().events[0];
      expect(finalEvent.title).toBe(originalEvent.title);
      expect(finalEvent.date).toBe(originalEvent.date);
      expect(finalEvent.time).toBe(originalEvent.time);
      expect(finalEvent.endTime).toBe(originalEvent.endTime);
      expect(finalEvent.location).toBe(originalEvent.location);
      expect(finalEvent.description).toBe(originalEvent.description);
      expect(finalEvent.category).toBe(originalEvent.category);
      expect(finalEvent.recurrence).toBe(originalEvent.recurrence);
      expect(finalEvent.url).toBe(originalEvent.url);
      expect(finalEvent.status).toBe(originalEvent.status);
    });
  });

  describe('performance and stress tests', () => {
    it('should handle large number of events', () => {
      const { addEvent, exportToICS } = useCalendar.getState();

      // Add 100 events
      for (let i = 0; i < 100; i++) {
        addEvent({
          title: `Event ${i}`,
          date: '2025-12-01',
          time: '14:00',
          category: 'Work',
          color: 'from-blue-500 to-cyan-500',
        });
      }

      const startTime = Date.now();
      const icsContent = exportToICS();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
      expect(icsContent.split('BEGIN:VEVENT').length - 1).toBe(100);
    });

    it('should handle importing large ICS files', async () => {
      const { importFromICS } = useCalendar.getState();

      // Generate a large ICS file with 100 events
      const events = Array.from({ length: 100 }, (_, i) => `BEGIN:VEVENT
UID:event-${i}@example.com
DTSTART:20251201T${String(i % 24).padStart(2, '0')}0000
SUMMARY:Event ${i}
END:VEVENT`).join('\n');

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
${events}
END:VCALENDAR`;

      const startTime = Date.now();
      const imported = await importFromICS(icsContent);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete in less than 2 seconds
      expect(imported).toBe(100);
    });
  });
});
