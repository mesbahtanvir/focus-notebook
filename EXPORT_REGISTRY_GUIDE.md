# Export/Import Registry System Guide

## Overview

The Export/Import Registry System allows tools to automatically register themselves for inclusion in data export/import operations. This eliminates the need to manually update export/import code every time a new tool is added.

## How It Works

1. **Registry Pattern**: Tools register themselves with a global registry
2. **Automatic Inclusion**: Registered tools are automatically included in export/import
3. **Standardized Interface**: All tools implement the same export/import interface
4. **Priority System**: Tools can specify their import order (e.g., goals before projects before tasks)

## Creating an Export Source

### Step 1: Create an Export Source File

Create a file in `src/lib/exportSources/` for your tool:

```typescript
// src/lib/exportSources/myToolExportSource.ts
import { registerExportSource } from '../exportRegistry';
import { useMyTool } from '@/store/useMyTool';
import type { MyToolData } from '@/types/myTool';

registerExportSource<MyToolData>({
  id: 'myTool',
  name: 'My Tool',
  description: 'Description of what data this exports',
  priority: 50, // Optional: higher = earlier in import order (default: 0)

  // Export function: return all data for a user
  export: async (userId: string) => {
    const data = useMyTool.getState().items;
    return data;
  },

  // Import function: import data for a user
  import: async (userId: string, data: MyToolData[]) => {
    const { add } = useMyTool.getState();
    const imported: string[] = [];

    for (const item of data) {
      try {
        const newItem = await add(item);
        if (newItem?.id) {
          imported.push(newItem.id);
        }
      } catch (error) {
        console.error('Failed to import item:', error);
      }
    }

    return imported; // Return array of IDs or count
  },

  // Optional: Validate data before import
  validate: (data: MyToolData[]) => {
    const errors: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!item.requiredField) {
        errors.push(`Item at index ${i} missing required field`);
      }
    }

    return errors;
  },

  // Optional: Transform data during export (e.g., remove sensitive fields)
  transformExport: (data: MyToolData[]) => {
    return data.map(item => ({
      ...item,
      sensitiveField: undefined, // Remove sensitive data
    }));
  },

  // Optional: Transform data during import (e.g., add defaults)
  transformImport: (data: MyToolData[]) => {
    return data.map(item => ({
      ...item,
      newField: item.newField || 'default value',
    }));
  },
});

export const myToolExportSourceRegistered = true;
```

### Step 2: Register Your Export Source

Add your export source to `src/lib/exportSources/index.ts`:

```typescript
import './tasksExportSource';
import './myToolExportSource'; // Add this line
```

### Step 3: Use in Your Application

Import the export sources registry where you need to export/import data:

```typescript
import { exportRegistry } from '@/lib/exportSources';

// Export all data
const data = await exportRegistry.exportAll(userId);

// Export specific sources
const data = await exportRegistry.exportSelected(userId, ['tasks', 'myTool']);

// Import all data
const result = await exportRegistry.importAll(userId, data);

// Get list of registered sources
const sources = exportRegistry.getAllSources();
```

## Example: Tasks Export Source

```typescript
// src/lib/exportSources/tasksExportSource.ts
import { registerExportSource } from '../exportRegistry';
import { useTasks } from '@/store/useTasks';
import type { Task } from '@/store/useTasks';

registerExportSource<Task>({
  id: 'tasks',
  name: 'Tasks',
  description: 'All your tasks including recurring tasks',
  priority: 100, // Tasks depend on projects/goals

  export: async (userId: string) => {
    return useTasks.getState().tasks;
  },

  import: async (userId: string, data: Task[]) => {
    const { add } = useTasks.getState();
    const imported: string[] = [];

    for (const task of data) {
      try {
        const { id, createdAt, updatedAt, ...taskData } = task;
        const newTask = await add(taskData);
        if (newTask?.id) imported.push(newTask.id);
      } catch (error) {
        console.error('Failed to import task:', error);
      }
    }

    return imported;
  },

  validate: (data: Task[]) => {
    const errors: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const task = data[i];
      if (!task.title) {
        errors.push(`Task at index ${i} missing title`);
      }
      if (!['active', 'completed', 'backlog'].includes(task.status)) {
        errors.push(`Task at index ${i} has invalid status`);
      }
    }

    return errors;
  },
});
```

## Priority System

The priority system controls the order of imports. Use these guidelines:

- **1000+**: Fundamental data (user settings, preferences)
- **500-999**: Top-level entities (goals, values)
- **100-499**: Mid-level entities (projects, relationships)
- **50-99**: Low-level entities (tasks, notes, thoughts)
- **0-49**: Derived/computed data (analytics, focus sessions)

## API Reference

### ExportableDataSource Interface

```typescript
interface ExportableDataSource<T = any> {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  description?: string;          // Description
  priority?: number;             // Import priority (default: 0)

  export: (userId: string) => Promise<T[]>;
  import: (userId: string, data: T[]) => Promise<string[] | number>;

  validate?: (data: T[]) => string[];
  transformExport?: (data: T[]) => T[];
  transformImport?: (data: T[]) => T[];
}
```

### ExportRegistry Methods

- `register<T>(source: ExportableDataSource<T>)` - Register a source
- `unregister(sourceId: string)` - Unregister a source
- `getSource(sourceId: string)` - Get a specific source
- `getAllSources()` - Get all sources (sorted by priority)
- `getSourceIds()` - Get all source IDs
- `exportAll(userId: string)` - Export from all sources
- `exportSelected(userId: string, sourceIds: string[])` - Export from specific sources
- `importAll(userId: string, data: Record<string, any[]>)` - Import to all sources
- `hasSource(sourceId: string)` - Check if source exists
- `getSourceCount()` - Get count of registered sources

## Benefits

1. **Automatic Registration**: New tools are automatically included
2. **No Manual Updates**: No need to modify export/import code
3. **Decoupled**: Each tool manages its own export/import logic
4. **Type-Safe**: Full TypeScript support
5. **Flexible**: Supports validation, transformation, and prioritization
6. **Testable**: Easy to test individual export sources

## Migration Guide

To migrate existing export/import code:

1. Create an export source file for each tool
2. Move export logic to the `export` function
3. Move import logic to the `import` function
4. Add validation if needed
5. Register the source in `index.ts`
6. Update UI to use `exportRegistry` instead of manual exports

## Best Practices

1. **Always validate data** before import to catch corrupted data
2. **Use transformExport** to remove sensitive data
3. **Use transformImport** to add default values for new fields
4. **Set appropriate priorities** to ensure correct import order
5. **Handle errors gracefully** and log them for debugging
6. **Return meaningful results** from import (IDs or counts)
7. **Test with sample data** before deploying

## Future Enhancements

- Conflict resolution strategies
- Incremental/differential exports
- Data versioning and migrations
- Export filters (date range, categories, etc.)
- Progress callbacks for large exports
- Parallel import/export for performance
