/**
 * OpenAI Client for AI Thought Processing
 *
 * Handles communication with OpenAI API using relationship-based prompts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { CONFIG } from '../config';
import { ProcessingContext, formatContextForPrompt } from './contextGatherer';
import { renderToolSpecsForPrompt, type ToolSpec } from '../../../shared/toolSpecs';

export interface AIAction {
  type: string;
  confidence: number;
  data: any;
  reasoning: string;
  relationship?: string; // Required for relationship-based actions
}

export interface OpenAIResponse {
  actions: AIAction[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  prompt: string;
  rawResponse: string;
}

/**
 * Minimal prompt configuration interface
 */
interface PromptConfig {
  name: string;
  model: {
    default: string;
    temperature: number;
    maxTokens: number;
  };
  systemPrompt: string;
  userPrompt?: string;
  contextTemplate?: string;
}

/**
 * Load and parse YAML prompt file
 */
function loadPromptConfig(): PromptConfig {
  const promptPath = path.join(__dirname, '../../prompts/process-thought.yml');
  const fileContents = fs.readFileSync(promptPath, 'utf8');
  const config = yaml.parse(fileContents);

  return {
    name: config.name,
    model: {
      default: config.model.default,
      temperature: config.model.temperature,
      maxTokens: config.model.maxTokens,
    },
    systemPrompt: config.systemPrompt,
    userPrompt: config.userPrompt,
    contextTemplate: config.contextTemplate,
  };
}

/**
 * Simple template variable replacement
 */
function renderTemplate(template: string, variables: Record<string, any>): string {
  let result = template;

  // Replace simple variables: {{variable}}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  });

  // Handle nested object/array access
  Object.entries(variables).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      // Handle array.length
      if (Array.isArray(value)) {
        const lengthRegex = new RegExp(`{{${key}\\.length}}`, 'g');
        result = result.replace(lengthRegex, String(value.length));
      }

      // Handle object properties
      Object.entries(value).forEach(([subKey, subValue]) => {
        const regex = new RegExp(`{{${key}\\.${subKey}}}`, 'g');
        result = result.replace(regex, String(subValue ?? ''));
      });
    }
  });

  return result;
}

/**
 * Render context template with conditionals and loops
 */
function renderContext(template: string, context: Record<string, any>): string {
  if (!template) return '';

  let result = template;

  // Handle {{#if variable}}...{{/if}}
  const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
  result = result.replace(ifRegex, (match, variable, content) => {
    const value = context[variable];
    if (value && (!Array.isArray(value) || value.length > 0)) {
      return renderTemplate(content, context);
    }
    return '';
  });

  // Handle {{#each array}}...{{/each}}
  const eachRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
  result = result.replace(eachRegex, (match, variable, content) => {
    const array = context[variable];
    if (Array.isArray(array)) {
      return array.map(item => renderTemplate(content, item)).join('\n');
    }
    return '';
  });

  // Replace remaining variables
  result = renderTemplate(result, context);

  // Clean up extra whitespace
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

  return result;
}

/**
 * Build messages array for OpenAI API
 */
function buildMessages(
  config: PromptConfig,
  variables: Record<string, any>,
  context: Record<string, any>
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    {
      role: 'system',
      content: config.systemPrompt,
    },
  ];

  if (config.userPrompt) {
    // Render context if template exists
    const renderedContext = config.contextTemplate
      ? renderContext(config.contextTemplate, context)
      : '';

    // Add context to variables
    const allVariables = {
      ...variables,
      context: renderedContext,
    };

    const userContent = renderTemplate(config.userPrompt, allVariables);
    messages.push({
      role: 'user',
      content: userContent,
    });
  }

  return messages;
}

/**
 * Call OpenAI API to process a thought
 */
function extractJsonBlock(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  // Explicit code fence capture (handles trailing commentary outside fences)
  const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeFenceMatch && codeFenceMatch[1]) {
    return codeFenceMatch[1].trim();
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1).trim();
  }

  return null;
}

export async function callOpenAI(
  thoughtText: string,
  context: ProcessingContext,
  toolSpecs: ToolSpec[]
): Promise<OpenAIResponse> {
  // Load prompt configuration from YAML
  const promptConfig = loadPromptConfig();

  // Transform ProcessingContext to prompt context format
  const promptContext = transformContextForPrompt(context);

  // Build variables for template
  const variables = {
    thoughtText,
    thoughtType: 'mixed', // Could be determined from thought properties
    thoughtTags: '', // Could include existing tags
    thoughtCreatedAt: new Date().toISOString(),
    toolReference: toolSpecs.length > 0
      ? renderToolSpecsForPrompt(toolSpecs)
      : '(No additional tool guidance provided)',
  };

  // Build messages using prompt loader
  const messages = buildMessages(promptConfig, variables, promptContext);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: promptConfig.model.default,
      messages,
      temperature: promptConfig.model.temperature,
      max_tokens: promptConfig.model.maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0]?.message?.content;

  if (!aiResponse) {
    throw new Error('No response from OpenAI');
  }

  // Parse JSON response (handle potential markdown code blocks)
  const cleanedResponse = aiResponse
    .trim()
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '');

  let parsed;
  let jsonCandidate = extractJsonBlock(cleanedResponse);

  try {
    if (!jsonCandidate) {
      throw new Error('No JSON block detected');
    }
    parsed = JSON.parse(jsonCandidate);
  } catch (error) {
    console.error('Failed to parse OpenAI response:', aiResponse);
    throw new Error('Invalid JSON response from OpenAI');
  }

  // Store full prompt for logging (combine system + user)
  const fullPrompt = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n');

  return {
    actions: parsed.actions || [],
    usage: data.usage,
    prompt: fullPrompt,
    rawResponse: aiResponse,
  };
}

/**
 * Transform ProcessingContext to prompt context format
 */
function transformContextForPrompt(context: ProcessingContext) {
  return {
    goals: context.goals.map(g => ({
      id: g.id,
      title: g.title,
      status: 'active', // Assume active since we only fetch active ones
      objective: g.objective,
    })),
    projects: context.projects.map(p => ({
      id: p.id,
      title: p.title,
      status: 'active', // Assume active
      description: p.description || '',
    })),
    tasks: context.tasks.map(t => ({
      id: t.id,
      title: t.title,
      category: t.category || 'mastery',
      priority: 'medium', // Default priority
    })),
    moods: context.moods.map(m => ({
      value: m.value,
      note: m.note || '',
    })),
    relationships: context.people.map(p => ({
      id: p.id,
      name: p.name,
      relationshipType: p.relationshipType || 'friend',
      connectionStrength: 5, // Default strength
    })),
    notes: [], // Not currently collected in context
    errands: [], // Not currently collected in context
  };
}

/**
 * @deprecated Legacy function - use loadPrompt and buildMessages instead
 * Build the AI prompt with context
 */
function buildPrompt(thoughtText: string, context: ProcessingContext, toolSpecs: ToolSpec[]): string {
  const contextFormatted = formatContextForPrompt(context);
  const toolReference = toolSpecs.length > 0 ? renderToolSpecsForPrompt(toolSpecs) : 'No additional tool guidance provided.';

  return `You are processing a user's thought in a productivity app.

Use the tool reference below to understand how each tool should behave. Follow the guidance carefully and avoid inventing new details.

${toolReference}

**STEP 1: ENHANCE THE TEXT**
- Fix grammar, spelling, capitalization
- Complete partial references using the context below
- Preserve the user's original voice and intent
- Don't add new information, only clean up what's there

Examples of text enhancement:
- "had coffee w/ sar" → "Had coffee with Sarah"
- "working on websi proj" → "Working on Website Redesign Project"
- "need to finish q3 goals" → "Need to finish Q3 Revenue Goals"

**STEP 2: ADD TAGS**

Tool Tags (add when applicable, confidence must be 95%+):
- tool-cbt: Thought contains negative thoughts, anxiety, worry, cognitive distortions, or emotional distress
- tool-brainstorm: Thought is about ideas, creative exploration, planning, or needs discussion
- tool-deepreflect: Thought requires deep philosophical reflection, introspection, or self-examination

Entity Tags (only if specifically mentioned, confidence must be 95%+):
- person-{shortname}: When a specific person is mentioned by name in the thought
- project-{id}: When a specific project is directly referenced
- goal-{id}: When a specific goal is explicitly discussed

IMPORTANT for entity tags:
- Only add if the person/project/goal is actually mentioned in the thought text
- Must have high confidence (95%+) that the match is correct
- Use exact IDs from the context provided

**STEP 3: SUGGEST ACTIONS** (confidence 70-94%, requires user approval)

Only suggest task creation if the thought EXPLICITLY requests it with phrases like:
- "create a task"
- "need to do"
- "add task"
- "should create"
- "remind me to"

For task creation:
- focusEligible: true = Desk work (email, coding, writing, calls, online work)
- focusEligible: false = Errands (shopping, appointments, travel, physical location changes)
- category: MUST be either "mastery" or "pleasure" ONLY
  - "mastery" = Tasks related to skill development, work, learning, personal growth
  - "pleasure" = Tasks related to enjoyment, leisure, relaxation, fun activities

Confidence Requirements:
- 95-100%: Auto-apply (text enhancement, tool tags, entity tags)
- 70-94%: Show as suggestion for user approval (task creation, other actions)
- Below 70%: Do not include in response

**CONTEXT:**

${contextFormatted}

**THOUGHT TO PROCESS:**
"${thoughtText}"

**RESPOND WITH JSON ONLY:**
{
  "actions": [
    {
      "type": "enhanceThought",
      "confidence": 99,
      "data": {
        "improvedText": "Enhanced version of the thought",
        "changes": [
          {"type": "grammar", "from": "had", "to": "Had"},
          {"type": "completion", "from": "sar", "to": "Sarah"},
          {"type": "completion", "from": "websi proj", "to": "Website Redesign Project"}
        ]
      },
      "reasoning": "Fixed grammar and completed name/project references from context"
    },
    {
      "type": "addTag",
      "confidence": 98,
      "data": { "tag": "person-sarah" },
      "reasoning": "Thought mentions Sarah from relationships list"
    },
    {
      "type": "addTag",
      "confidence": 96,
      "data": { "tag": "project-abc123" },
      "reasoning": "References Website Redesign Project (ID: abc123)"
    },
    {
      "type": "createTask",
      "confidence": 85,
      "data": {
        "title": "Follow up with Sarah about project",
        "focusEligible": true,
        "priority": "medium",
        "category": "mastery"
      },
      "reasoning": "Thought explicitly requests creating a work-related task (use 'mastery' for work/growth, 'pleasure' for leisure/fun)"
    }
  ]
}

Rules:
- Only suggest actions that are truly helpful and accurate
- Be conservative with confidence scores - don't inflate them
- Don't create tasks unless explicitly requested in the thought
- Use context to complete references, not to invent new information
- Preserve the user's voice and meaning in text enhancements`;
}
