/**
 * Migration Script: Convert Tag-based and Array-based Links to Relationships
 *
 * This script migrates existing thoughts from the old linking system to the new
 * relationship system:
 *
 * OLD SYSTEM:
 * - thought.tags containing 'tool-cbt', 'tool-brainstorm', etc.
 * - thought.linkedTaskIds: string[]
 * - thought.linkedProjectIds: string[]
 * - thought.linkedMoodIds: string[]
 *
 * NEW SYSTEM:
 * - relationships collection with explicit connections
 * - Tool relationships with processing metadata
 * - Entity relationships with clear semantics
 *
 * USAGE:
 *   ts-node scripts/migrateToRelationships.ts <userId> [--dry-run] [--batch-size=100]
 *
 * OPTIONS:
 *   --dry-run: Preview changes without writing to database
 *   --batch-size: Number of documents to process at once (default: 100)
 *   --verbose: Show detailed progress
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌ Service account key not found at: ${serviceAccountPath}`);
  console.error('Set FIREBASE_SERVICE_ACCOUNT_PATH environment variable or place serviceAccountKey.json in project root');
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ============================================================================
// Types
// ============================================================================

interface Thought {
  id: string;
  text: string;
  tags?: string[];
  linkedTaskIds?: string[];
  linkedProjectIds?: string[];
  linkedMoodIds?: string[];
  [key: string]: any;
}

interface Relationship {
  id: string;
  sourceType: 'thought' | 'task' | 'project' | 'goal' | 'mood' | 'tool' | 'person';
  sourceId: string;
  targetType: 'thought' | 'task' | 'project' | 'goal' | 'mood' | 'tool' | 'person';
  targetId: string;
  relationshipType: string;
  strength: number;
  createdBy: 'ai' | 'user';
  createdAt: string;
  status: 'active' | 'archived' | 'rejected';
  reasoning?: string;
  metadata?: {
    migratedFrom?: 'tags' | 'linkedTaskIds' | 'linkedProjectIds' | 'linkedMoodIds';
    migrationDate?: string;
    [key: string]: any;
  };
}

interface MigrationStats {
  thoughtsProcessed: number;
  toolRelationshipsCreated: number;
  taskRelationshipsCreated: number;
  projectRelationshipsCreated: number;
  moodRelationshipsCreated: number;
  errors: string[];
}

// ============================================================================
// Tool Tag Detection
// ============================================================================

const TOOL_TAG_PREFIX = 'tool-';

function extractToolTags(tags: string[]): string[] {
  return tags.filter((tag) => tag.startsWith(TOOL_TAG_PREFIX));
}

function getToolIdFromTag(tag: string): string {
  return tag.replace(TOOL_TAG_PREFIX, '');
}

// ============================================================================
// Relationship Generators
// ============================================================================

function generateRelationshipId(): string {
  return `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createToolRelationship(
  thoughtId: string,
  toolId: string,
  reasoning: string
): Relationship {
  return {
    id: generateRelationshipId(),
    sourceType: 'thought',
    sourceId: thoughtId,
    targetType: 'tool',
    targetId: toolId,
    relationshipType: 'analyzed-with', // User had this tool tag, so it was "analyzed with"
    strength: 100, // User-created, so full strength
    createdBy: 'user',
    createdAt: new Date().toISOString(),
    status: 'active',
    reasoning,
    metadata: {
      migratedFrom: 'tags',
      migrationDate: new Date().toISOString(),
    },
  };
}

function createEntityRelationship(
  thoughtId: string,
  targetType: 'task' | 'project' | 'mood',
  targetId: string,
  migratedFrom: 'linkedTaskIds' | 'linkedProjectIds' | 'linkedMoodIds'
): Relationship {
  const relationshipTypeMap = {
    task: 'linked-to',
    project: 'part-of',
    mood: 'triggered-by',
  };

  return {
    id: generateRelationshipId(),
    sourceType: 'thought',
    sourceId: thoughtId,
    targetType,
    targetId,
    relationshipType: relationshipTypeMap[targetType],
    strength: 100, // User-created
    createdBy: 'user',
    createdAt: new Date().toISOString(),
    status: 'active',
    reasoning: `Migrated from ${migratedFrom}`,
    metadata: {
      migratedFrom,
      migrationDate: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Migration Logic
// ============================================================================

async function migrateThought(
  userId: string,
  thought: Thought,
  dryRun: boolean,
  verbose: boolean
): Promise<{
  relationships: Relationship[];
  errors: string[];
}> {
  const relationships: Relationship[] = [];
  const errors: string[] = [];

  try {
    // 1. Migrate tool tags
    if (thought.tags && thought.tags.length > 0) {
      const toolTags = extractToolTags(thought.tags);

      for (const toolTag of toolTags) {
        const toolId = getToolIdFromTag(toolTag);
        const rel = createToolRelationship(
          thought.id,
          toolId,
          `Thought was tagged with ${toolTag}`
        );
        relationships.push(rel);

        if (verbose) {
          console.log(`  ✓ Tool relationship: thought → ${toolId}`);
        }
      }
    }

    // 2. Migrate linkedTaskIds
    if (thought.linkedTaskIds && thought.linkedTaskIds.length > 0) {
      for (const taskId of thought.linkedTaskIds) {
        const rel = createEntityRelationship(thought.id, 'task', taskId, 'linkedTaskIds');
        relationships.push(rel);

        if (verbose) {
          console.log(`  ✓ Task relationship: thought → task ${taskId}`);
        }
      }
    }

    // 3. Migrate linkedProjectIds
    if (thought.linkedProjectIds && thought.linkedProjectIds.length > 0) {
      for (const projectId of thought.linkedProjectIds) {
        const rel = createEntityRelationship(
          thought.id,
          'project',
          projectId,
          'linkedProjectIds'
        );
        relationships.push(rel);

        if (verbose) {
          console.log(`  ✓ Project relationship: thought → project ${projectId}`);
        }
      }
    }

    // 4. Migrate linkedMoodIds
    if (thought.linkedMoodIds && thought.linkedMoodIds.length > 0) {
      for (const moodId of thought.linkedMoodIds) {
        const rel = createEntityRelationship(thought.id, 'mood', moodId, 'linkedMoodIds');
        relationships.push(rel);

        if (verbose) {
          console.log(`  ✓ Mood relationship: thought → mood ${moodId}`);
        }
      }
    }

    // Write relationships to Firestore
    if (!dryRun && relationships.length > 0) {
      const batch = db.batch();

      for (const rel of relationships) {
        const relRef = db.collection(`users/${userId}/relationships`).doc(rel.id);
        batch.set(relRef, rel);
      }

      await batch.commit();

      if (verbose) {
        console.log(`  💾 Wrote ${relationships.length} relationships to Firestore`);
      }
    }
  } catch (error: any) {
    errors.push(`Error migrating thought ${thought.id}: ${error.message}`);
  }

  return { relationships, errors };
}

async function migrateUser(
  userId: string,
  options: {
    dryRun: boolean;
    batchSize: number;
    verbose: boolean;
  }
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    thoughtsProcessed: 0,
    toolRelationshipsCreated: 0,
    taskRelationshipsCreated: 0,
    projectRelationshipsCreated: 0,
    moodRelationshipsCreated: 0,
    errors: [],
  };

  console.log(`\n🔄 Migrating user: ${userId}`);
  console.log(`Mode: ${options.dryRun ? 'DRY RUN (no changes)' : 'LIVE (writing to database)'}`);
  console.log(`Batch size: ${options.batchSize}\n`);

  try {
    // Get all thoughts for user
    const thoughtsSnapshot = await db.collection(`users/${userId}/thoughts`).get();

    if (thoughtsSnapshot.empty) {
      console.log('No thoughts found for this user.');
      return stats;
    }

    console.log(`Found ${thoughtsSnapshot.size} thoughts to process\n`);

    // Process thoughts in batches
    const thoughts: Thought[] = thoughtsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Thought[];

    for (let i = 0; i < thoughts.length; i += options.batchSize) {
      const batch = thoughts.slice(i, i + options.batchSize);

      console.log(
        `Processing batch ${Math.floor(i / options.batchSize) + 1}/${Math.ceil(thoughts.length / options.batchSize)}...`
      );

      for (const thought of batch) {
        if (options.verbose) {
          console.log(`\nProcessing thought: ${thought.id}`);
          console.log(`  Text: ${thought.text?.substring(0, 60)}...`);
        }

        const { relationships, errors } = await migrateThought(
          userId,
          thought,
          options.dryRun,
          options.verbose
        );

        stats.thoughtsProcessed++;
        stats.errors.push(...errors);

        // Count by type
        for (const rel of relationships) {
          if (rel.targetType === 'tool') {
            stats.toolRelationshipsCreated++;
          } else if (rel.targetType === 'task') {
            stats.taskRelationshipsCreated++;
          } else if (rel.targetType === 'project') {
            stats.projectRelationshipsCreated++;
          } else if (rel.targetType === 'mood') {
            stats.moodRelationshipsCreated++;
          }
        }
      }

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('\n✅ Migration complete!\n');
  } catch (error: any) {
    console.error(`❌ Fatal error during migration: ${error.message}`);
    stats.errors.push(`Fatal error: ${error.message}`);
  }

  return stats;
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Migration Script: Convert Tag-based Links to Relationships

USAGE:
  ts-node scripts/migrateToRelationships.ts <userId> [options]

OPTIONS:
  --dry-run        Preview changes without writing to database
  --batch-size=N   Process N documents at once (default: 100)
  --verbose        Show detailed progress
  --help           Show this help message

EXAMPLES:
  # Dry run to preview changes
  ts-node scripts/migrateToRelationships.ts user123 --dry-run

  # Run migration with verbose output
  ts-node scripts/migrateToRelationships.ts user123 --verbose

  # Process in smaller batches
  ts-node scripts/migrateToRelationships.ts user123 --batch-size=50
`);
    process.exit(0);
  }

  const userId = args[0];
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  const batchSizeArg = args.find((arg) => arg.startsWith('--batch-size='));
  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 100;

  if (!userId) {
    console.error('❌ Error: userId is required');
    process.exit(1);
  }

  console.log('🚀 Starting migration...\n');

  const stats = await migrateUser(userId, { dryRun, batchSize, verbose });

  // Print summary
  console.log('═══════════════════════════════════════════');
  console.log('MIGRATION SUMMARY');
  console.log('═══════════════════════════════════════════');
  console.log(`Thoughts processed:           ${stats.thoughtsProcessed}`);
  console.log(`Tool relationships created:   ${stats.toolRelationshipsCreated}`);
  console.log(`Task relationships created:   ${stats.taskRelationshipsCreated}`);
  console.log(`Project relationships created: ${stats.projectRelationshipsCreated}`);
  console.log(`Mood relationships created:    ${stats.moodRelationshipsCreated}`);
  console.log(`Total relationships created:   ${stats.toolRelationshipsCreated + stats.taskRelationshipsCreated + stats.projectRelationshipsCreated + stats.moodRelationshipsCreated}`);
  console.log(`Errors:                       ${stats.errors.length}`);
  console.log('═══════════════════════════════════════════\n');

  if (stats.errors.length > 0) {
    console.log('⚠️  ERRORS:\n');
    stats.errors.forEach((error) => console.log(`  - ${error}`));
    console.log('');
  }

  if (dryRun) {
    console.log('ℹ️  This was a DRY RUN. No changes were written to the database.');
    console.log('   Run without --dry-run to apply changes.');
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
