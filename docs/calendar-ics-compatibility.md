# Calendar .ics Compatibility

The Focus Notebook calendar tool is now fully compatible with the iCalendar (.ics) format, allowing seamless import/export with other calendar applications like Google Calendar, Apple Calendar, Outlook, and more.

## Features

### Supported .ics Fields

The calendar supports the following standard iCalendar fields:

#### Core Fields (Always Included)
- **SUMMARY** - Event title
- **DTSTART** - Start date/time
- **DTEND** - End date/time
- **UID** - Unique identifier (format: `{event-id}@focus-notebook.app`)
- **DTSTAMP** - Creation timestamp
- **CREATED** - Creation date
- **LAST-MODIFIED** - Last modification date
- **STATUS** - Event status (CONFIRMED, TENTATIVE, CANCELLED)

#### Optional Fields
- **DESCRIPTION** - Event notes/description
- **LOCATION** - Event location
- **CATEGORIES** - Event category (Work, Personal, Health, Social, Learning)
- **URL** - Associated URL
- **RRULE** - Recurrence rule (e.g., `FREQ=WEEKLY;BYDAY=MO,WE,FR`)
- **VALARM** - Reminder/alarm (specified in minutes before event)

### All-Day Events

All-day events are properly supported using the `VALUE=DATE` parameter:
```
DTSTART;VALUE=DATE:20251201
DTEND;VALUE=DATE:20251201
```

### Recurring Events

Recurring events use standard RRULE format:
```
RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR
```

Supported frequencies:
- DAILY
- WEEKLY (with BYDAY for specific weekdays)
- MONTHLY
- YEARLY

### Reminders/Alarms

Reminders are set in minutes before the event:
```
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Event Title
TRIGGER:-PT15M
END:VALARM
```

## Usage

### Exporting Calendar Events

**From UI:**
1. Open the Calendar tool
2. Click the **Export** button in the header
3. A `.ics` file will be downloaded with all your events

**Programmatically:**
```typescript
import { useCalendar } from '@/store/useCalendar';

const exportToICS = useCalendar((state) => state.exportToICS);

// Export all events
const icsContent = exportToICS();

// Export specific events
const icsContent = exportToICS(['event-id-1', 'event-id-2']);
```

### Importing Calendar Events

**From UI:**
1. Open the Calendar tool
2. Click the **Import** button in the header
3. Select a `.ics` or `.ical` file from your computer
4. Events will be imported and added to your calendar

**Programmatically:**
```typescript
import { useCalendar } from '@/store/useCalendar';

const importFromICS = useCalendar((state) => state.importFromICS);

const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
...
END:VCALENDAR`;

const importedCount = await importFromICS(icsContent);
console.log(`Imported ${importedCount} events`);
```

## Compatibility

### Tested With
- ✅ Google Calendar
- ✅ Apple Calendar (macOS/iOS)
- ✅ Microsoft Outlook
- ✅ Mozilla Thunderbird
- ✅ CalDAV servers

### Special Character Handling

The following special characters are properly escaped/unescaped:
- Backslashes (`\`)
- Semicolons (`;`)
- Commas (`,`)
- Newlines (`\n`)

### Example

**Exported .ics File:**
```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Focus Notebook//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:event-123@focus-notebook.app
DTSTAMP:20251119T120000Z
DTSTART:20251201T143000
DTEND:20251201T153000
SUMMARY:Team Meeting
DESCRIPTION:Discuss Q4 goals and planning
LOCATION:Conference Room A
CATEGORIES:Work
STATUS:CONFIRMED
CREATED:20251119T120000Z
LAST-MODIFIED:20251119T120000Z
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Team Meeting
TRIGGER:-PT15M
END:VALARM
END:VEVENT
END:VCALENDAR
```

## Data Model

The calendar event data structure includes .ics-specific fields:

```typescript
interface CalendarEvent {
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
  recurrence?: string; // RRULE format
  alarm?: number; // Minutes before event to show reminder
  url?: string; // Associated URL
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';

  createdAt: string;
  updatedAt: string;
}
```

## Implementation Details

### Export Process
1. Events are converted to ICS format using standard RFC 5545 specification
2. Special characters are escaped according to iCalendar standards
3. Dates and times are formatted correctly (all-day vs. timed events)
4. File is generated with proper MIME type (`text/calendar`)
5. Downloaded with timestamp in filename

### Import Process
1. .ics file is parsed line by line
2. VEVENT blocks are extracted and converted to CalendarEvent objects
3. Special characters are unescaped
4. Events are added to the calendar store
5. User is notified of successful import with event count

### Timezone Handling
- All-day events use `VALUE=DATE` format without time
- Timed events use local time format (`YYYYMMDDTHHmmss`)
- UTC timestamps are properly handled for created/modified dates

## Testing

Comprehensive test suite covering:
- ✅ Export to valid ICS format
- ✅ Import from valid ICS content
- ✅ All-day event handling
- ✅ Special character escaping/unescaping
- ✅ Recurring events (RRULE)
- ✅ Alarms/reminders
- ✅ Multiple events import/export
- ✅ Round-trip data preservation

Run tests:
```bash
npm test -- useCalendar-ics.test.ts
```

## Standards Compliance

This implementation follows the iCalendar (RFC 5545) specification:
- [RFC 5545 - Internet Calendaring and Scheduling Core Object Specification](https://datatracker.ietf.org/doc/html/rfc5545)

## Limitations

1. **Timezone Support**: Currently uses local time. Full timezone support (VTIMEZONE) is planned for future releases.
2. **Attendees**: ATTENDEE and ORGANIZER fields are not yet supported.
3. **Attachments**: ATTACH field is not yet supported.
4. **Complex Recurrence**: Some advanced recurrence patterns may not be fully supported.

## Future Enhancements

- [ ] Full timezone support (VTIMEZONE)
- [ ] Meeting attendees (ATTENDEE, ORGANIZER)
- [ ] Attachments (ATTACH)
- [ ] Advanced recurrence patterns
- [ ] iCloud/CalDAV sync
- [ ] Conflict detection on import

---

*Last updated: 2025-11-19*
