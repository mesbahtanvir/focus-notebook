# Relationship-Based Framework Migration Guide

## Overview

The thought processing system has been completely rewritten to use a **relationship-based approach** instead of tag-based processing. This creates structured connections between thoughts and entities (tasks, goals, projects, people, notes).

## What Changed

### ❌ OLD: Tag-Based Approach
```json
{
  "actions": [
    {
      "type": "addTag",
      "confidence": 95,
      "data": { "tag": "tool-tasks" },
      "reasoning": "Thought contains actionable items"
    }
  ]
}
```

**Problems:**
- Tags don't explain the connection
- No link to specific entities
- Can't reference existing data
- No context preservation

### ✅ NEW: Relationship-Based Approach
```json
{
  "actions": [
    {
      "type": "linkToGoal",
      "confidence": 92,
      "data": {
        "goalId": "goal-react-dev",
        "context": "This thought shows progress toward the goal"
      },
      "reasoning": "Thought mentions activities related to 'Master React Development' goal",
      "relationship": "Provides evidence of progress and renewed commitment to learning React"
    },
    {
      "type": "linkToProject",
      "confidence": 88,
      "data": {
        "projectId": "project-portfolio-v2",
        "context": "New requirement identified for the project"
      },
      "reasoning": "Thought identifies a new feature needed for 'Portfolio Website v2' project",
      "relationship": "Adds clarity on project scope and next steps"
    }
  ]
}
```

**Benefits:**
- Explicit connections to entities
- Context explains what information is added
- Relationship explains why it matters
- Links to existing data by ID
- Prevents duplicate creation

## Action Types

### Entity Creation
When no existing entity matches:

- `createTask` - Create a new task
- `createProject` - Create a new project
- `createGoal` - Create a new goal
- `createMood` - Create a mood entry
- `createNote` - Save as a reference note
- `createErrand` - Create a to-do errand
- `createRelationship` - Add a person relationship

### Entity Linking (Relationships)
When an entity already exists:

- `linkToTask` - Connect to existing task
- `linkToProject` - Connect to existing project
- `linkToGoal` - Connect to existing goal
- `linkToRelationship` - Connect to existing person
- `linkToNote` - Connect to existing note

### Entity Enhancement
When adding context to existing entities:

- `enhanceTask` - Add notes/context to a task
- `enhanceProject` - Add notes/context to a project
- `enhanceGoal` - Add notes/context to a goal
- `enhanceRelationship` - Update relationship details

## Required Action Fields

Every action must now include:

```typescript
{
  type: ActionType;         // Required: Action type (see above)
  confidence: number;       // Required: 0-100 confidence score
  data: object;             // Required: Action-specific data
  reasoning: string;        // Required: Why this action?
  relationship: string;     // Required: How does this thought relate to the entity?
}
```

### The `relationship` Field

This is **critical** - it explains the semantic connection:

**Good:**
```json
{
  "type": "linkToGoal",
  "data": { "goalId": "goal-123" },
  "relationship": "Demonstrates concrete progress toward learning React through hands-on practice"
}
```

**Bad:**
```json
{
  "type": "linkToGoal",
  "data": { "goalId": "goal-123" },
  "relationship": "Related to goal"  // Too vague!
}
```

## Code Migration

### Old Code (Deprecated - DO NOT USE)

```typescript
import { buildThoughtProcessingPrompt } from '@/lib/llm/promptBuilder';

const prompt = buildThoughtProcessingPrompt({
  thought: { text: '...', type: 'task', ... },
  context: { goals: [...], tasks: [...] },
  toolReference: '...',
});
```

### New Code (Use This)

```typescript
import { buildThoughtProcessingMessages } from '@/lib/llm/promptBuilder';
import type { ThoughtContext, UserContext } from '@/lib/llm/promptBuilder';

// Prepare thought
const thought: ThoughtContext = {
  id: 'thought-123',
  text: 'I need to finish the React project',
  type: 'task',
  tags: [],
  createdAt: new Date().toISOString(),
};

// Prepare context with entity IDs
const context: UserContext = {
  goals: [
    {
      id: 'goal-react-dev',  // ID is required!
      title: 'Master React Development',
      status: 'active',
      objective: 'Become proficient in React'
    }
  ],
  projects: [
    {
      id: 'project-portfolio-v2',  // ID is required!
      title: 'Portfolio Website v2',
      status: 'active',
      description: 'Redesign with React'
    }
  ],
  tasks: [
    {
      id: 'task-react-hooks',  // ID is required!
      title: 'Complete React hooks tutorial',
      category: 'mastery',
      priority: 'high'
    }
  ],
  // ... other entities
};

// Build messages
const messages = buildThoughtProcessingMessages(
  thought,
  context,
  '(Tool reference guidance)'
);

// Use with OpenAI or similar
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages,
  temperature: 0.8,
});
```

## API Route Update

### Example: `/api/process-thought`

```typescript
import { buildThoughtProcessingMessages } from '@/lib/llm/promptBuilder';
import type { ProcessedThought } from '@/lib/llm/promptBuilder';

export async function POST(request: Request) {
  const { thought, userId } = await request.json();

  // Fetch user's current context with IDs
  const context = await fetchUserContext(userId);

  // Build messages using relationship framework
  const messages = buildThoughtProcessingMessages(
    thought,
    context,
    await loadToolReference(userId)
  );

  // Call LLM
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0.8,
    max_tokens: 1500,
  });

  // Parse response
  const result: ProcessedThought = JSON.parse(
    response.choices[0].message.content
  );

  // Process each action with relationships
  for (const action of result.actions) {
    console.log(`Action: ${action.type}`);
    console.log(`Relationship: ${action.relationship}`);

    switch (action.type) {
      case 'linkToGoal':
        await createThoughtGoalLink(
          thought.id,
          action.data.goalId,
          action.relationship,  // Store relationship explanation
          action.data.context
        );
        break;

      case 'linkToProject':
        await createThoughtProjectLink(
          thought.id,
          action.data.projectId,
          action.relationship,
          action.data.context
        );
        break;

      case 'createTask':
        await createTask({
          ...action.data,
          linkedThought: {
            id: thought.id,
            relationship: action.relationship
          }
        });
        break;

      case 'enhanceTask':
        await updateTask(action.data.taskId, {
          ...action.data.updates,
          thoughtLinks: [{
            thoughtId: thought.id,
            relationship: action.relationship,
            addedContext: action.data.context
          }]
        });
        break;

      // ... handle other action types
    }
  }

  return Response.json({ success: true, actions: result.actions });
}
```

## Database Schema Considerations

To support the relationship framework, consider these schema updates:

### Thought-Entity Links Table
```sql
CREATE TABLE thought_entity_links (
  id UUID PRIMARY KEY,
  thought_id UUID REFERENCES thoughts(id),
  entity_type VARCHAR(50),  -- 'goal', 'project', 'task', 'relationship', etc.
  entity_id UUID,
  relationship TEXT,  -- Explanation of the relationship
  context TEXT,       -- Additional context provided
  confidence INTEGER, -- Confidence score when created
  created_at TIMESTAMP,

  INDEX idx_thought_links (thought_id),
  INDEX idx_entity_links (entity_type, entity_id)
);
```

### Enhanced Entities
Add fields to existing entities to track relationships:

```sql
ALTER TABLE tasks ADD COLUMN thought_links JSONB;
ALTER TABLE goals ADD COLUMN thought_links JSONB;
ALTER TABLE projects ADD COLUMN thought_links JSONB;
```

Example data:
```json
{
  "thought_links": [
    {
      "thoughtId": "thought-123",
      "relationship": "Provides progress evidence",
      "context": "User completed first React hooks tutorial",
      "linkedAt": "2025-11-07T05:00:00Z"
    }
  ]
}
```

## Frontend Display

Show relationship explanations to users:

```tsx
function ThoughtEntityLink({ link }) {
  return (
    <div className="thought-link">
      <div className="entity-name">
        {link.entityType}: {link.entityName}
      </div>
      <div className="relationship-explanation">
        💡 {link.relationship}
      </div>
      {link.context && (
        <div className="added-context">
          📝 {link.context}
        </div>
      )}
      <div className="confidence">
        Confidence: {link.confidence}%
      </div>
    </div>
  );
}
```

## Testing

### Test Export for GitHub Models

```bash
# Export the updated prompt
node scripts/export-for-github-models.js process-thought

# Review the exported file
cat exports/process-thought-github-models.md
```

### Test with Real Data

```typescript
import { buildThoughtProcessingMessages } from '@/lib/llm/promptBuilder';

const testThought = {
  id: 'test-001',
  text: 'Had a great discussion with Sarah about React hooks. She suggested I focus on useEffect for my portfolio project.',
  type: 'note',
  tags: [],
  createdAt: new Date().toISOString(),
};

const testContext = {
  goals: [
    { id: 'goal-1', title: 'Master React', status: 'active', objective: 'Learn React' }
  ],
  projects: [
    { id: 'project-1', title: 'Portfolio Website', status: 'active', description: 'Build portfolio' }
  ],
  relationships: [
    { id: 'rel-1', name: 'Sarah', relationshipType: 'mentor', connectionStrength: 8 }
  ],
};

const messages = buildThoughtProcessingMessages(testThought, testContext);

// Expected actions:
// - linkToRelationship (Sarah)
// - linkToProject (Portfolio Website)
// - linkToGoal (Master React)
// - createNote (Technical learning note)
```

## Key Principles

1. **Prioritize Linking Over Creation**: Always check if an entity exists before creating a new one
2. **Meaningful Relationships**: Every relationship must explain WHY the connection matters
3. **Context is King**: Include context that explains what new information is added
4. **Use Entity IDs**: Always reference entities by their IDs, not just names
5. **High Confidence for Links**: Use 90+ confidence when linking to obvious matches
6. **Be Conservative**: Don't create relationships just because you can

## Benefits

- **Better Data Quality**: Structured relationships instead of loose tags
- **Context Preservation**: Each link preserves why it was created
- **Duplicate Prevention**: Links to existing entities instead of creating duplicates
- **Graph Capabilities**: Enables graph-based queries and visualizations
- **User Understanding**: Users see why thoughts connect to their goals/projects
- **Analytics**: Track which thoughts contribute to which goals over time

## Troubleshooting

**Problem**: LLM still suggests `addTag` actions
**Solution**: Ensure you're using the latest prompt (v2.0). Check: `loadPrompt('process-thought').version`

**Problem**: Missing `relationship` field in responses
**Solution**: The schema validation will catch this. Ensure your LLM is following the JSON schema.

**Problem**: No entity IDs in context
**Solution**: Update your data fetching to include IDs. All entities must have an `id` field.

**Problem**: Getting low confidence scores
**Solution**: This is expected. The framework is conservative. Only obvious relationships get high confidence (90+).

## Further Reading

- [PROMPT_FRAMEWORK.md](./PROMPT_FRAMEWORK.md) - Full framework documentation
- [process-thought.yml](../prompts/process-thought.yml) - Prompt source of truth
- [promptBuilder.ts](../src/lib/llm/promptBuilder.ts) - TypeScript interfaces

## Summary

The relationship-based framework transforms thought processing from simple tagging to **meaningful entity relationship creation**. Every connection is:

- ✅ Explicitly defined by entity ID
- ✅ Explained through the relationship field
- ✅ Contextualized with additional information
- ✅ Validated with confidence scores
- ✅ Prioritized (link before create)

This creates a rich, queryable knowledge graph of how thoughts connect to your life's goals, projects, tasks, and relationships.
