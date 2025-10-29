# Import/Export System - Usage Guide

## Quick Start

### Adding to Settings Page

To integrate the enhanced import/export system into your Settings page, simply add the component:

```tsx
import { EnhancedDataManagement } from '@/components/EnhancedDataManagement';

// In your Settings page component:
export default function SettingsPage() {
  return (
    <div>
      {/* Your existing settings... */}

      {/* Add this anywhere in your settings */}
      <EnhancedDataManagement />
    </div>
  );
}
```

### Testing with Sample Data

1. **Use the provided sample file**: [sample-import-data.json](./sample-import-data.json)
2. Click "Import Data" in Settings
3. Select the sample file
4. You'll see:
   - Preview of 15 items (6 tasks, 3 projects, 2 goals, etc.)
   - Ability to select/deselect specific items
   - Import options
   - Real-time progress during import

## Features Overview

### 📥 Import System

#### Step 1: File Upload & Validation
- Upload JSON file
- Automatic validation
- Error reporting for invalid files

#### Step 2: Preview & Selection
- View all items in tabbed interface
- Search and filter items
- Select/deselect individual items
- Select all / deselect all per entity type
- Visual indicators for conflicts

#### Step 3: Conflict Resolution
- **Duplicate ID Conflicts**: Item with same ID already exists
  - **Skip**: Don't import this item
  - **Replace**: Overwrite existing item
  - **Merge**: Combine with existing
  - **Create New**: Generate new ID

- **Broken Reference Conflicts**: References non-existent entity
  - **Skip**: Don't import this item
  - **Remove Reference**: Import but clear the broken link

#### Step 4: Import Options
- **Import Strategy**:
  - Skip existing items (default)
  - Replace existing items
  - Merge with existing items

- **ID Handling**:
  - ☑ Preserve original IDs (recommended)
  - ☐ Generate new IDs

- **References**:
  - ☑ Update references (maintains relationships)
  - ☐ Keep original references

- **Backup**:
  - ☐ Create backup before import (optional)

#### Step 5: Real-Time Progress

The progress modal shows:

```
Overall Progress: ████████████░░░░ 75%

Currently importing:
  "Fix authentication bug"
  Category: mastery
  Tags: #urgent, #backend

Statistics:
  Items: 45 / 120
  Elapsed: 2m 34s
  Speed: 15.3 items/sec
  ETA: Remaining 3m 12s

Entity Breakdown:
  ✓ Goals      [████████████] 10/10   (100%)
  ◐ Projects   [██████░░░░░░] 15/25   (60%)
  ○ Tasks      [███░░░░░░░░░] 20/85   (24%)
  ○ Thoughts   [░░░░░░░░░░░░] 0/5     (0%)

Activity Log (most recent):
  ✓ Imported Task: Fix login bug (#urgent, #backend)
  ✓ Imported Task: Add dark mode toggle
  ✓ Imported Project: Mobile App Redesign
  ⚠ Warning: Task references non-existent project
  ✓ Imported Task: Write documentation
```

### 📤 Export System

#### Quick Export All
- One-click export of all data
- Downloads as `focus-notebook-export-YYYY-MM-DD.json`

#### Export with Options
- **Select Entity Types**:
  - ☑ Tasks (100 items)
  - ☑ Projects (25 items)
  - ☑ Goals (10 items)
  - ☑ Thoughts (15 items)
  - ☑ Moods (5 items)
  - ☑ Focus Sessions (3 items)
  - ☑ People (2 items)

- **Date Range Filter**:
  - ☑ Filter by date range
  - Start: 2025-01-01
  - End: 2025-10-28

- **Additional Filters**:
  - ☑ Include completed items
  - Status filter (active, in-progress, completed)
  - Category filter (mastery, pleasure)
  - Tag filter

## Data Structure

### Export File Format

```json
{
  "metadata": {
    "version": "1.0.0",
    "exportedAt": "2025-10-28T12:00:00.000Z",
    "userId": "user-id",
    "totalItems": 150,
    "entityCounts": {
      "tasks": 100,
      "projects": 25,
      "goals": 10,
      "thoughts": 10,
      "moods": 3,
      "focusSessions": 2,
      "people": 0
    }
  },
  "data": {
    "tasks": [...],
    "projects": [...],
    "goals": [...],
    "thoughts": [...],
    "moods": [...],
    "focusSessions": [...],
    "people": [...]
  }
}
```

### Relationships

The system automatically handles these relationships:

1. **Goals → Projects**: Projects reference `goalId`
2. **Projects → Projects**: Sub-projects reference `parentProjectId`
3. **Projects → Tasks**: Tasks reference `projectId`
4. **Thoughts → Tasks**: Tasks reference `thoughtId`
5. **Thoughts ↔ Tasks**: Thoughts have `linkedTaskIds[]`
6. **Thoughts ↔ Projects**: Thoughts have `linkedProjectIds[]`
7. **Thoughts ↔ Moods**: Thoughts have `linkedMoodIds[]`
8. **People ↔ Thoughts**: People have `linkedThoughtIds[]`

### Import Order

Items are imported in dependency order:

1. Goals (no dependencies)
2. Thoughts (no dependencies)
3. Moods (may be linked by thoughts)
4. People (may link to thoughts)
5. Projects (depend on goals)
6. Tasks (depend on projects & thoughts)
7. Focus Sessions (depend on tasks)

## Advanced Usage

### Programmatic Import/Export

```typescript
import { useImportExport } from '@/hooks/useImportExport';

function MyComponent() {
  const {
    parseFile,
    executeImport,
    exportData,
    importProgress,
  } = useImportExport();

  // Parse a file
  const handleParse = async (file: File) => {
    const parsed = await parseFile(file);
    console.log('Parsed data:', parsed);
  };

  // Execute import with progress tracking
  const handleImport = async (parsed, selection, options) => {
    const result = await executeImport(
      parsed,
      selection,
      options
    );
    console.log('Import result:', result);
  };

  // Export with filters
  const handleExport = async () => {
    await exportData({
      entities: ['tasks', 'projects'],
      dateRange: {
        start: new Date('2025-01-01'),
        end: new Date('2025-12-31'),
      },
      includeCompleted: false,
    });
  };

  // Monitor progress
  useEffect(() => {
    if (importProgress) {
      console.log('Progress:', importProgress.overallProgress);
      console.log('Current:', importProgress.currentEntityName);
      console.log('Speed:', importProgress.speed);
    }
  }, [importProgress]);
}
```

### Custom Progress Callback

```typescript
const result = await executeImport(
  parsedData,
  selection,
  options,
  (progress) => {
    // Custom progress handling
    console.log(`${progress.overallProgress}% complete`);
    console.log(`Importing: ${progress.currentEntityName}`);
    console.log(`Speed: ${progress.speed} items/sec`);
    console.log(`ETA: ${progress.estimatedTimeRemaining}ms`);

    // Update custom UI
    updateProgressBar(progress.overallProgress);
    showCurrentItem(progress.currentEntityName);
  }
);
```

## Troubleshooting

### Import Issues

**Problem**: "Validation failed"
- **Solution**: Check that the JSON file has the correct structure
- Ensure all required fields are present (id, title/text, etc.)
- Verify the version is "1.0.0"

**Problem**: "Broken reference conflicts"
- **Solution**: Import the referenced entities first, or
- Use "Remove Reference" resolution to import without the link

**Problem**: "Import is slow"
- **Reason**: Large files (1000+ items) take time
- The system processes ~100 items/second
- Progress is shown in real-time

### Export Issues

**Problem**: "No data to export"
- **Solution**: Ensure you have data in your account
- Check that you're logged in
- Try refreshing the page

**Problem**: "Export takes long time"
- **Reason**: Large datasets need processing
- Progress is shown during export
- File download starts automatically when ready

## Best Practices

### Before Importing

1. **Always review the preview** before importing
2. **Resolve all conflicts** to ensure data integrity
3. **Use "Skip existing"** strategy to avoid duplicates
4. **Enable "Update references"** to maintain relationships
5. **Consider creating a backup** before large imports

### Before Exporting

1. **Review entity counts** to ensure all data is included
2. **Use date filters** for targeted exports
3. **Export regularly** for backup purposes
4. **Name files descriptively** (e.g., `backup-2025-10-28.json`)

### Data Migration

When moving between accounts:

1. **Export from source account** with all entities
2. **Review the export file** to ensure completeness
3. **Import to target account** with preview
4. **Verify relationships** are maintained
5. **Check entity counts** match expectations

## Performance

### Import Performance

- **Small files** (<100 items): ~1 second
- **Medium files** (100-500 items): ~5 seconds
- **Large files** (500-1000 items): ~10 seconds
- **Very large files** (1000+ items): ~20+ seconds

Progress updates every 50 items to avoid UI lag.

### Export Performance

- **All entity types**: ~2-5 seconds for typical datasets
- **Filtered exports**: ~1-3 seconds
- Download starts immediately after export

## Security & Privacy

- **Local processing**: All validation happens in your browser
- **No server upload**: Import files are processed locally
- **Secure storage**: Data is stored in Firebase with authentication
- **No data sharing**: Your data never leaves your account
- **Backup recommended**: Regular exports protect against data loss

## Future Enhancements

Planned features:

- [ ] Scheduled automatic backups
- [ ] Cloud backup integration (Google Drive, Dropbox)
- [ ] Import from other formats (CSV, Excel)
- [ ] Duplicate detection before import
- [ ] Advanced merge strategies
- [ ] Import history and rollback
- [ ] Batch import from multiple files
- [ ] Custom field mapping

## Support

For issues or questions:

1. Check this guide first
2. Review the [implementation documentation](./IMPORT_EXPORT_IMPLEMENTATION.md)
3. Test with the [sample data file](./sample-import-data.json)
4. Check browser console for detailed error messages

## Version History

- **v1.0.0** (2025-10-28): Initial release
  - Full preview system
  - Conflict detection & resolution
  - Real-time progress tracking
  - Advanced export filters
  - Relationship mapping
