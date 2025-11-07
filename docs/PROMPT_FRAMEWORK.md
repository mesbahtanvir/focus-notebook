# Prompt Framework Documentation

## Overview

This project uses a unified YAML-based prompt framework for all LLM interactions. The framework provides:

- **Single Source of Truth**: YAML files define all prompts
- **GitHub Models Integration**: Export prompts for testing in GitHub Models
- **Type Safety**: TypeScript interfaces for variables and context
- **Template System**: Handlebars-like syntax for dynamic content
- **Test Data Generation**: Built-in test data for all prompts

## Architecture

```
prompts/                          # YAML prompt definitions
  ├── process-thought.yml         # Thought processing prompt
  ├── brainstorming.yml           # Brainstorming assistant
  └── spending-analysis.yml       # Spending analysis

src/lib/prompts/
  ├── promptLoader.ts             # Core prompt loading and rendering
  └── testDataGenerator.ts        # Test data for all prompts

src/lib/llm/
  └── promptBuilder.ts            # Backward compatibility layer
```

## Quick Start

### 1. Using a Prompt in Your Code

```typescript
import { loadPrompt, buildMessages } from '@/lib/prompts/promptLoader';

// Load the prompt configuration
const promptConfig = loadPrompt('process-thought');

// Prepare your variables and context
const variables = {
  thought: {
    text: 'I need to finish the project',
    type: 'task',
    tags: 'tool-tasks',
    createdAt: new Date().toISOString(),
  },
  toolReference: 'Task creation tool...',
};

const context = {
  goals: [{ title: 'Complete Project', status: 'active' }],
  tasks: [{ title: 'Review code', category: 'mastery' }],
};

// Build messages for the LLM API
const messages = buildMessages(promptConfig, variables, context);

// Use with OpenAI or similar
const response = await openai.chat.completions.create({
  model: promptConfig.model.default,
  messages,
  temperature: promptConfig.model.temperature,
  max_tokens: promptConfig.model.maxTokens,
});
```

### 2. Exporting for GitHub Models

```typescript
import { exportPromptForGitHubModels } from '@/lib/llm/promptBuilder';
import { generateTestDataForPrompt, formatThoughtForYAML } from '@/lib/prompts/testDataGenerator';

// Generate test data
const testData = generateTestDataForPrompt('process-thought');
const { variables, context } = formatThoughtForYAML(testData);

// Export for GitHub Models
const exportedPrompt = exportPromptForGitHubModels();

// Save to file or copy to clipboard
console.log(exportedPrompt);
```

### 3. Creating a New Prompt

Create `prompts/my-new-prompt.yml`:

```yaml
name: "My New Prompt"
description: "Description of what this prompt does"
version: "1.0"

model:
  default: "gpt-4o"
  alternatives: ["gpt-4o-mini"]
  temperature: 0.7
  maxTokens: 1000

systemPrompt: |
  You are a helpful assistant that...

userPrompt: |
  User input: {{userInput}}

  {{context}}

  Please analyze and respond.

contextTemplate: |
  {{#if goals}}
  Current Goals:
  {{#each goals}}
  - {{title}} ({{status}})
  {{/each}}
  {{/if}}

responseValidation:
  format: "json"
  schema:
    type: "object"
    required: ["result"]
    properties:
      result:
        type: "string"
```

## YAML Prompt Structure

### Required Fields

- `name`: Display name for the prompt
- `description`: What the prompt does
- `version`: Semantic version
- `model`: Model configuration
  - `default`: Default model to use
  - `temperature`: Sampling temperature (0-1)
  - `maxTokens`: Max response length
- `systemPrompt`: System message for the LLM

### Optional Fields

- `model.alternatives`: Array of alternative models
- `userPrompt`: User message template
- `contextTemplate`: Template for rendering context data
- `actionExtractionPrompt`: For extracting actions from responses
- `summaryPrompt`: For generating summaries
- `responseValidation`: Response format validation
  - `format`: Expected format (e.g., "json", "text")
  - `schema`: JSON schema for validation

## Template Syntax

The framework supports Handlebars-like syntax:

### Simple Variables

```yaml
userPrompt: |
  User said: {{userInput}}
  Created at: {{timestamp}}
```

### Nested Objects

```yaml
userPrompt: |
  Thought: {{thought.text}}
  Type: {{thought.type}}
```

### Conditional Blocks

```yaml
contextTemplate: |
  {{#if goals}}
  You have {{goals.length}} active goals.
  {{/if}}
```

### Iteration

```yaml
contextTemplate: |
  {{#each tasks}}
  - {{title}} ({{category}})
  {{/each}}
```

## Test Data Generation

### Built-in Test Data

```typescript
import { generateTestDataForPrompt } from '@/lib/prompts/testDataGenerator';

// Get test data for a specific prompt
const testData = generateTestDataForPrompt('process-thought');
// Returns: { thought, context, toolReference }

const brainstormData = generateTestDataForPrompt('brainstorming');
// Returns: { topic, conversationHistory, context }
```

### Custom Test Data

```typescript
import { formatThoughtForYAML } from '@/lib/prompts/testDataGenerator';

const customData = {
  thought: {
    id: 'custom-001',
    text: 'My custom thought',
    type: 'note',
    tags: [],
    createdAt: new Date().toISOString(),
  },
  context: {
    goals: [{ title: 'Custom Goal', status: 'active' }],
  },
};

const { variables, context } = formatThoughtForYAML(customData);
```

## GitHub Models Integration

### Exporting a Prompt

```typescript
import { exportPromptByName } from '@/lib/llm/promptBuilder';
import { generateTestDataForPrompt } from '@/lib/prompts/testDataGenerator';

// Export any prompt
const testData = generateTestDataForPrompt('brainstorming');
const exported = exportPromptByName('brainstorming', testData);

// The exported string includes:
// - System message
// - User prompt with test data
// - Model configuration
// - Test instructions
// - Expected response format
```

### Using in GitHub Models

1. Run the export function to generate the prompt
2. Copy the System Message section
3. Copy the User Prompt section
4. Paste into GitHub Models interface
5. Configure the model settings as specified
6. Test and iterate

## API Examples

### Process Thought Endpoint

```typescript
// src/app/api/process-thought/route.ts
import { loadPrompt, buildMessages } from '@/lib/prompts/promptLoader';

export async function POST(request: Request) {
  const { thought, context } = await request.json();

  const promptConfig = loadPrompt('process-thought');

  const variables = {
    thought: {
      text: thought.text,
      type: thought.type || 'neutral',
      tags: thought.tags?.join(', ') || 'none',
      createdAt: thought.createdAt,
    },
    toolReference: await loadToolReference(),
  };

  const messages = buildMessages(promptConfig, variables, context);

  const response = await openai.chat.completions.create({
    model: promptConfig.model.default,
    messages,
    temperature: promptConfig.model.temperature,
    max_tokens: promptConfig.model.maxTokens,
  });

  return Response.json(response);
}
```

### Brainstorming Endpoint

```typescript
// src/app/api/brainstorm/route.ts
import { loadPrompt, buildMessages } from '@/lib/prompts/promptLoader';

export async function POST(request: Request) {
  const { conversationHistory } = await request.json();

  const promptConfig = loadPrompt('brainstorming');

  // Build messages from config system prompt + conversation history
  const messages = [
    { role: 'system', content: promptConfig.systemPrompt },
    ...conversationHistory,
  ];

  const response = await openai.chat.completions.create({
    model: promptConfig.model.default,
    messages,
    temperature: promptConfig.model.temperature,
  });

  return Response.json(response);
}
```

## Utility Functions

### promptLoader.ts

- `loadPrompt(name)` - Load a YAML prompt configuration
- `buildMessages(config, variables, context)` - Build messages array for API
- `renderTemplate(template, variables)` - Render a template string
- `renderContext(template, context)` - Render context with conditionals
- `listPrompts()` - Get all available prompt names
- `exportPromptForGitHubModels(name, vars, ctx)` - Export for GitHub Models
- `buildCompletePrompt(name, vars, ctx)` - Build complete prompt string
- `getPromptMetadata(name)` - Get prompt metadata only

### testDataGenerator.ts

- `generateProcessThoughtTestData()` - Test data for thought processing
- `generateMinimalThoughtTestData()` - Minimal test data
- `generateBrainstormingTestData()` - Test data for brainstorming
- `generateSpendingAnalysisTestData()` - Test data for spending analysis
- `generateTestDataForPrompt(name)` - Get test data by prompt name
- `formatThoughtForYAML(testData)` - Format data for YAML system

### promptBuilder.ts (Legacy)

- `buildThoughtProcessingPrompt(params)` - **Deprecated**, use loadPrompt instead
- `buildUserContextSection(context)` - **Deprecated**, use contextTemplate
- `exportPromptForGitHubModels()` - Export process-thought prompt
- `exportPromptByName(name, vars, ctx)` - Export any prompt
- `getTestPromptValues()` - Get test values for process-thought

## Migration Guide

### From Old System to New System

**Before (using promptBuilder.ts):**
```typescript
import { buildThoughtProcessingPrompt } from '@/lib/llm/promptBuilder';

const prompt = buildThoughtProcessingPrompt({
  thought: { text: '...', type: 'task', ... },
  context: { goals: [...], tasks: [...] },
  toolReference: '...',
});
```

**After (using YAML prompts):**
```typescript
import { loadPrompt, buildMessages } from '@/lib/prompts/promptLoader';

const config = loadPrompt('process-thought');
const messages = buildMessages(config, variables, context);
```

### Benefits of Migration

1. **Single Source of Truth**: Prompts defined once in YAML
2. **Easier Iteration**: Edit prompts without changing code
3. **Version Control**: Track prompt changes separately
4. **GitHub Models**: Easy export for testing
5. **Consistency**: All prompts follow same structure

## Best Practices

### 1. Use Appropriate Temperature

- **0.0-0.3**: Deterministic tasks (classification, extraction)
- **0.4-0.7**: Balanced creativity (analysis, suggestions)
- **0.8-1.0**: High creativity (brainstorming, content generation)

### 2. Provide Clear Instructions

```yaml
systemPrompt: |
  You are an expert at X.

  Guidelines:
  - Always do Y
  - Never do Z
  - Format responses as JSON
```

### 3. Use Schema Validation

```yaml
responseValidation:
  format: "json"
  schema:
    type: "object"
    required: ["field1", "field2"]
    properties:
      field1: { type: "string" }
      field2: { type: "number" }
```

### 4. Test with Realistic Data

Always use the test data generators to ensure your prompts work with realistic data.

### 5. Version Your Prompts

Increment the `version` field when making significant changes.

## Troubleshooting

### Prompt Not Found

```
Error: Prompt file not found: my-prompt.yml
```

**Solution**: Ensure the file exists in the `prompts/` directory.

### Template Variables Not Rendering

```yaml
# Wrong
userPrompt: |
  User: {user.name}  # Wrong syntax

# Correct
userPrompt: |
  User: {{user.name}}  # Correct syntax
```

### Context Not Showing

Ensure you're passing context data and using the contextTemplate:

```typescript
const messages = buildMessages(
  config,
  variables,
  { goals: [...], tasks: [...] }  // Must pass context
);
```

## Contributing

When adding new prompts:

1. Create YAML file in `prompts/`
2. Add test data generator in `testDataGenerator.ts`
3. Test export for GitHub Models
4. Document any special variables or context requirements
5. Add examples to this documentation

## Resources

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [GitHub Models](https://github.com/marketplace/models)
- [YAML Specification](https://yaml.org/spec/)
- [Handlebars Template Syntax](https://handlebarsjs.com/guide/)
