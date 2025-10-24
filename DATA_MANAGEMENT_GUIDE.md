# Data Management Guide

## Overview

Focus Notebook now includes comprehensive data management capabilities that allow you to export and delete all your data directly from the settings page.

## Features

### 📊 Data Statistics
View real-time statistics of your data:
- **Tasks**: Total number of tasks
- **Goals**: Total number of goals
- **Projects**: Total number of projects
- **Thoughts**: Total number of thoughts
- **Moods**: Total number of mood entries
- **Total Items**: Sum of all data

### 📥 Export All Data

**Purpose**: Create a backup of all your data in JSON format

**How to use**:
1. Go to **Settings** (`/settings`)
2. Scroll to the **Data Management** section
3. Click the **Export** button
4. Your data will be downloaded as `focus-notebook-export-YYYY-MM-DD.json`

### 📤 Import Data

**Purpose**: Restore data from a previously exported JSON file

**How to use**:
1. Go to **Settings** (`/settings`)
2. Scroll to the **Data Management** section
3. Click **Choose JSON file...** to select your export file
4. Click the **Import** button
5. Wait for the import to complete
6. The page will automatically refresh to show your restored data

**What happens during import**:
- All data from the JSON file is added to your current data
- Existing data is preserved (data is merged, not replaced)
- Each imported item gets a unique ID
- The page refreshes automatically after successful import

**What's included**:
- All tasks (including recurring tasks, steps, notes)
- All goals (with progress, timeframes, status)
- All projects (with linked tasks and thoughts)
- All thoughts (with CBT analysis if available)
- All mood entries (with metadata)
- Export metadata (version, timestamp, user ID)

**File format**:
```json
{
  "version": "1.0.0",
  "exportedAt": "2025-10-24T20:00:00.000Z",
  "userId": "your-user-id",
  "data": {
    "tasks": [...],
    "goals": [...],
    "projects": [...],
    "thoughts": [...],
    "moods": [...]
  }
}
```

### 🗑️ Delete All Data

**Purpose**: Permanently remove all your data from the app

**How to use**:
1. Go to **Settings** (`/settings`)
2. Scroll to the **Data Management** section
3. Click the **Delete All** button
4. Review the confirmation dialog showing exactly what will be deleted
5. Click **Yes, Delete Everything** to confirm
6. The page will refresh automatically after deletion

**What's deleted**:
- All Firestore data:
  - Tasks collection
  - Goals collection
  - Projects collection
  - Thoughts collection
  - Moods collection
- Local storage settings:
  - App settings
  - Process queue
  - Last thought process time

**⚠️ Warning**: This action is **irreversible**. Always export your data before deleting!

## Security

- All data operations require authentication
- Export files are generated client-side (no server processing)
- Delete operations use Firestore security rules
- Local storage is also cleared during deletion

## Technical Details

### Implementation Files

1. **`src/lib/utils/data-management.ts`**
   - `exportAllData()`: Collects data from all Zustand stores
   - `downloadDataAsFile()`: Creates and downloads JSON file
   - `importDataFromFile()`: Reads and imports JSON file
   - `validateImportData()`: Validates file structure
   - `importAllData()`: Writes data to Firestore
   - `deleteAllUserData()`: Deletes all Firestore collections
   - `getDataStats()`: Returns current data statistics

2. **`src/app/settings/page.tsx`**
   - Added Data Management section
   - Export button with loading states
   - Import file picker with validation
   - Import button with progress indication
   - Delete button with two-step confirmation
   - Real-time data statistics display

### State Management

The data management functions integrate with existing Zustand stores:
- `useTasks` - Task management
- `useGoals` - Goal management
- `useProjects` - Project management
- `useThoughts` - Thought management
- `useMoods` - Mood tracking

### Error Handling

All operations include:
- Try-catch error handling
- User-friendly error messages via toast notifications
- Loading states during operations
- Automatic page refresh after successful deletion

## Best Practices

1. **Regular Backups**: Export your data regularly, especially before major changes
2. **Safe Deletion**: Always export before deleting
3. **Verify Export**: Open the exported JSON file to verify it contains your data
4. **Keep Exports Safe**: Store exported files in a secure location (cloud storage, external drive)

## Use Cases

### Migrating Data
1. Export data from current device
2. Login on new device
3. Import data to restore everything

### Data Backup & Recovery
1. Export data regularly for backup
2. If data is lost, import from backup
3. All data restored instantly

### Data Audit
1. Export data
2. Review JSON file for data quality
3. Analyze patterns or issues

### Fresh Start
1. Export data for backup
2. Delete all data
3. Start with clean slate
4. Import selected data later if needed

### Compliance
1. Export data for records
2. Delete data per privacy requirements (GDPR, etc.)
3. Import archived data when needed

### Device Sync
1. Export from Device A
2. Import to Device B
3. Keep multiple devices in sync

## Import Validation & Safety

### File Validation
The import process validates:
- ✅ File is valid JSON format
- ✅ Contains required structure (version, exportedAt, userId, data)
- ✅ All collections are present (tasks, goals, projects, thoughts, moods)
- ✅ Each collection is an array

### Data Integrity
During import:
- Each item gets a unique ID (preserves or generates new)
- Existing data is not overwritten
- Import is additive (merges with existing data)
- Failed imports show clear error messages

### Error Handling
If import fails:
- Detailed error message displayed
- Some items may have been imported before failure
- Safe to try again with valid file
- No data loss on failure

## Future Enhancements

Potential future additions:
- ✅ **Import Data**: ~~Restore from exported JSON files~~ **COMPLETED**
- **Selective Export**: Export specific collections only
- **Selective Import**: Choose which collections to import
- **Scheduled Backups**: Automatic periodic exports
- **Cloud Backup**: Sync exports to cloud storage
- **Data Filtering**: Export date ranges or specific items
- **Duplicate Detection**: Prevent importing same data twice
- **Import Preview**: Review data before importing

## Troubleshooting

### Export not downloading
- Check browser's download settings
- Ensure popup blockers are disabled
- Try a different browser

### Import not working
- Verify file is valid JSON (exported from Focus Notebook)
- Check file is not corrupted
- Ensure you're authenticated
- Try with a smaller file first
- Check browser console for detailed errors

### Delete operation fails
- Verify you're authenticated
- Check internet connection
- Try refreshing and attempting again

### Stats not updating
- Refresh the settings page
- Wait for Firestore sync to complete
- After import, stats update after page refresh

### Duplicate data after import
- Import is additive, not replacement
- Delete all data first if you want clean import
- Or manually remove duplicates from collections

## Support

For issues or questions:
1. Check console for error messages
2. Verify authentication status
3. Ensure stable internet connection
4. Review Firestore security rules

---

**Version**: 1.0.0  
**Last Updated**: October 24, 2025  
**Status**: Production Ready ✅
