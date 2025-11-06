# Migration Guide: Tag-based Links → Relationship System

This guide explains how to migrate existing thoughts from the old linking system to the new unified relationship system.

## What's Changing?

### OLD SYSTEM ❌
```typescript
interface Thought {
  tags: ['tool-cbt', 'tool-brainstorm', '#productivity']  // Mixed: tools + categories
  linkedTaskIds: ['task-1', 'task-2']                      // Array of IDs
  linkedProjectIds: ['proj-1']                             // Array of IDs
  linkedMoodIds: ['mood-1']                                // Array of IDs
}
```

### NEW SYSTEM ✅
```typescript
interface Thought {
  tags: ['#productivity', '#health']  // ONLY user-facing categories
}

// Separate relationships collection
interface Relationship {
  sourceType: 'thought'
  sourceId: 'thought-123'
  targetType: 'tool' | 'task' | 'project' | 'mood'
  targetId: 'cbt' | 'task-1' | 'proj-1' | 'mood-1'
  relationshipType: 'processed-by' | 'linked-to' | 'part-of'
  strength: 100
  createdBy: 'user' | 'ai'
  metadata: { migratedFrom: 'tags' }
}
```

## Why Migrate?

1. **Clear Separation**: Tags are for categories, relationships are for connections
2. **Rich Metadata**: Store why things are connected, confidence scores, reasoning
3. **Better Queries**: Find all tasks for a thought, or all thoughts processed by CBT
4. **AI-Friendly**: Clearer structure for AI to suggest connections
5. **Audit Trail**: Track who created each link (user vs AI) and when

## Migration Process

### Step 1: Dry Run (Safe Preview)

First, run a dry run to see what changes would be made WITHOUT modifying the database:

```bash
npm run migrate:relationships <userId> --dry-run --verbose
```

This will show you:
- How many thoughts will be processed
- What relationships will be created
- Any potential errors

Example output:
```
🔄 Migrating user: user123
Mode: DRY RUN (no changes)

Processing thought: thought-456
  Text: I need to work on the onboarding project and schedule...
  ✓ Tool relationship: thought → tasks
  ✓ Task relationship: thought → task-789
  ✓ Project relationship: thought → proj-101

═══════════════════════════════════════════
MIGRATION SUMMARY
═══════════════════════════════════════════
Thoughts processed:           150
Tool relationships created:   45
Task relationships created:   78
Project relationships created: 23
Mood relationships created:    12
Total relationships created:   158
Errors:                       0
═══════════════════════════════════════════
```

### Step 2: Run Live Migration

Once you're satisfied with the dry run results, run the actual migration:

```bash
npm run migrate:relationships <userId>
```

**IMPORTANT**: This will write to your database. Make sure you have a backup!

### Step 3: Verify Results

After migration, verify in your app:

1. Check that thoughts still show connected tasks/projects
2. Verify tool processing history is preserved
3. Look for any missing connections

### Step 4: Clean Up (Optional)

After verifying the migration succeeded, you can clean up the old fields:

```bash
npm run migrate:cleanup <userId>  # Removes old linkedTaskIds, linkedProjectIds, etc.
```

**WARNING**: Only run cleanup after thoroughly verifying the migration!

## Migration Script Options

```bash
ts-node scripts/migrateToRelationships.ts <userId> [options]
```

### Options

| Option | Description | Example |
|--------|-------------|---------|
| `--dry-run` | Preview changes without writing | `--dry-run` |
| `--batch-size=N` | Process N documents at once (default: 100) | `--batch-size=50` |
| `--verbose` | Show detailed progress for each thought | `--verbose` |
| `--help` | Show help message | `--help` |

### Examples

```bash
# Preview changes for a user
npm run migrate:relationships user123 --dry-run

# Run migration with detailed output
npm run migrate:relationships user123 --verbose

# Process in smaller batches (slower, but safer)
npm run migrate:relationships user123 --batch-size=50

# Combine options
npm run migrate:relationships user123 --dry-run --verbose --batch-size=25
```

## What Gets Migrated?

### 1. Tool Tags → Tool Relationships

**Before:**
```typescript
thought.tags = ['tool-cbt', 'tool-brainstorm', '#health']
```

**After:**
```typescript
// Relationships created:
{
  sourceType: 'thought',
  targetType: 'tool',
  targetId: 'cbt',
  relationshipType: 'analyzed-with',
  strength: 100,
  metadata: { migratedFrom: 'tags' }
}
{
  sourceType: 'thought',
  targetType: 'tool',
  targetId: 'brainstorm',
  relationshipType: 'analyzed-with',
  strength: 100,
  metadata: { migratedFrom: 'tags' }
}

// Thought updated:
thought.tags = ['#health']  // Tool tags removed, only categories remain
```

### 2. Linked Tasks → Task Relationships

**Before:**
```typescript
thought.linkedTaskIds = ['task-1', 'task-2']
```

**After:**
```typescript
// Relationships created:
{
  sourceType: 'thought',
  targetType: 'task',
  targetId: 'task-1',
  relationshipType: 'linked-to',
  metadata: { migratedFrom: 'linkedTaskIds' }
}
{
  sourceType: 'thought',
  targetType: 'task',
  targetId: 'task-2',
  relationshipType: 'linked-to',
  metadata: { migratedFrom: 'linkedTaskIds' }
}
```

### 3. Linked Projects → Project Relationships

**Before:**
```typescript
thought.linkedProjectIds = ['proj-abc']
```

**After:**
```typescript
{
  sourceType: 'thought',
  targetType: 'project',
  targetId: 'proj-abc',
  relationshipType: 'part-of',
  metadata: { migratedFrom: 'linkedProjectIds' }
}
```

### 4. Linked Moods → Mood Relationships

**Before:**
```typescript
thought.linkedMoodIds = ['mood-xyz']
```

**After:**
```typescript
{
  sourceType: 'thought',
  targetType: 'mood',
  targetId: 'mood-xyz',
  relationshipType: 'triggered-by',
  metadata: { migratedFrom: 'linkedMoodIds' }
}
```

## Troubleshooting

### Error: "Service account key not found"

Set the path to your Firebase service account key:

```bash
export FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
npm run migrate:relationships user123
```

### Error: "Permission denied"

Make sure your Firebase service account has read/write permissions to:
- `users/{userId}/thoughts`
- `users/{userId}/relationships`

### Migration creates duplicate relationships

If you run the migration multiple times, it will create duplicate relationships. To avoid this:

1. Always run `--dry-run` first to check
2. Only run live migration once per user
3. If duplicates exist, use the cleanup script to remove them

### Some relationships are missing

Check the migration summary for errors. Common causes:
- Firestore permissions
- Invalid entity IDs (referenced tasks/projects don't exist)
- Network timeouts (reduce `--batch-size`)

## Rollback (Emergency)

If something goes wrong, you can rollback by deleting the relationships collection:

```bash
# WARNING: This deletes ALL relationships for the user
firebase firestore:delete users/user123/relationships --recursive
```

The old fields (`linkedTaskIds`, etc.) remain untouched until you run cleanup.

## FAQ

**Q: Will this affect my existing thoughts?**
A: No. The migration only reads from thoughts and writes to a NEW `relationships` collection. Your thought data remains unchanged (except tool tags are removed from the tags array).

**Q: Can I undo the migration?**
A: Yes, as long as you haven't run the cleanup script. Simply delete the relationships collection and the old fields will still be intact.

**Q: How long does migration take?**
A: Depends on the number of thoughts. Typical rate: ~100-200 thoughts per minute.

**Q: Do I need to migrate all users at once?**
A: No. You can migrate one user at a time. The app will work with both old and new systems during the transition.

**Q: What about new thoughts created during migration?**
A: New thoughts created after deploying the new code will automatically use the relationship system. Old thoughts need to be migrated with this script.

## Support

If you encounter issues:

1. Run with `--dry-run --verbose` to see detailed logs
2. Check the error messages in the migration summary
3. Verify Firebase permissions
4. Check Firestore quotas (might hit rate limits with large datasets)

---

**Ready to migrate?** Start with a dry run:

```bash
npm run migrate:relationships <userId> --dry-run --verbose
```
