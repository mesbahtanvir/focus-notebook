/**
 * OpenAI Client for AI Thought Processing
 *
 * Handles communication with OpenAI API using .prompt.yml configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { CONFIG } from '../config';
import { ProcessingContext } from './contextGatherer';
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
  model?: string; // Model used for the request
}

/**
 * Prompt configuration format
 */
interface PromptConfig {
  name: string;
  model: string; // e.g., "openai/gpt-4o"
  modelParameters: {
    temperature: number;
    max_tokens: number;
  };
  messages: Array<{
    role: string;
    content: string;
  }>;
}

const PROMPT_FILE_NAME = 'process-thought.prompt.yml';

function resolvePromptPath(): string {
  const overriddenPath = process.env.PROCESS_THOUGHT_PROMPT_PATH;
  const candidatePaths = [
    overriddenPath,
    path.join(__dirname, '../../prompts', PROMPT_FILE_NAME),
    path.join(__dirname, '../../../../functions/prompts', PROMPT_FILE_NAME),
    path.join(__dirname, '../../../../prompts', PROMPT_FILE_NAME),
    path.join(process.cwd(), 'functions', 'prompts', PROMPT_FILE_NAME),
    path.join(process.cwd(), 'prompts', PROMPT_FILE_NAME),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Prompt file "${PROMPT_FILE_NAME}" not found. Checked: ${candidatePaths.join(', ')}`
  );
}

/**
 * Load prompt configuration from YAML file
 */
function loadPromptConfig(): PromptConfig {
  const promptPath = resolvePromptPath();
  const fileContents = fs.readFileSync(promptPath, 'utf8');
  return yaml.parse(fileContents);
}

/**
 * Build context string from user data
 */
function buildContextString(context: ProcessingContext): string {
  const sections: string[] = [];

  if (context.goals.length > 0) {
    sections.push(`Goals (${context.goals.length}) - Use goalId to create relationships:`);
    context.goals.forEach(g => {
      sections.push(`- [ID: ${g.id}] ${g.title} (active) - ${g.objective}`);
    });
    sections.push('');
  }

  if (context.projects.length > 0) {
    sections.push(`Projects (${context.projects.length}) - Use projectId to create relationships:`);
    context.projects.forEach(p => {
      sections.push(`- [ID: ${p.id}] ${p.title} (active) - ${p.description || ''}`);
    });
    sections.push('');
  }

  if (context.tasks.length > 0) {
    sections.push(`Active Tasks (${context.tasks.length}) - Use taskId to create relationships:`);
    context.tasks.forEach(t => {
      sections.push(`- [ID: ${t.id}] ${t.title} (${t.category || 'mastery'}) - medium`);
    });
    sections.push('');
  }

  if (context.moods.length > 0) {
    sections.push(`Recent Moods (${context.moods.length}):`);
    context.moods.forEach(m => {
      sections.push(`- ${m.value}/10 - ${m.note || ''}`);
    });
    sections.push('');
  }

  if (context.people.length > 0) {
    sections.push(`Relationships (${context.people.length}) - Use relationshipId to create relationships:`);
    context.people.forEach(p => {
      sections.push(`- [ID: ${p.id}] ${p.name} (${p.relationshipType || 'friend'}) - Strength: 5/10`);
    });
    sections.push('');
  }

  return sections.length > 0 ? `User's Current Data Context:\n\n${sections.join('\n')}` : '';
}

/**
 * Render template with variable substitution
 */
function renderTemplate(template: string, variables: Record<string, any>): string {
  let result = template;

  // Replace all variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  });

  return result;
}

/**
 * Extract JSON from response (handles markdown code blocks)
 */
function extractJsonBlock(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Handle code fences
  const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeFenceMatch && codeFenceMatch[1]) {
    return codeFenceMatch[1].trim();
  }

  // Already JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  // Extract JSON object
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  // Extract JSON array
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1).trim();
  }

  return null;
}

/**
 * Call OpenAI API to process a thought
 */
export async function callOpenAI(
  thoughtText: string,
  context: ProcessingContext,
  toolSpecs: ToolSpec[]
): Promise<OpenAIResponse> {
  // Load prompt configuration
  const promptConfig = loadPromptConfig();

  // Build context string
  const contextString = buildContextString(context);

  // Build variables for template
  const variables = {
    thoughtText,
    thoughtType: 'mixed',
    thoughtTags: '',
    thoughtCreatedAt: new Date().toISOString(),
    toolReference: toolSpecs.length > 0
      ? renderToolSpecsForPrompt(toolSpecs)
      : '(No additional tool guidance provided)',
    context: contextString,
  };

  // Render messages with variables
  const messages = promptConfig.messages.map(msg => ({
    role: msg.role,
    content: renderTemplate(msg.content, variables),
  }));

  // Extract model name (remove provider prefix if present)
  const modelName = promptConfig.model.includes('/')
    ? promptConfig.model.split('/')[1]
    : promptConfig.model;

  // Call OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      temperature: promptConfig.modelParameters.temperature,
      max_tokens: promptConfig.modelParameters.max_tokens,
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

  // Parse JSON response
  const jsonCandidate = extractJsonBlock(aiResponse);

  let parsed;
  try {
    if (!jsonCandidate) {
      throw new Error('No JSON block detected');
    }
    parsed = JSON.parse(jsonCandidate);
  } catch (error) {
    console.error('Failed to parse OpenAI response:', aiResponse);
    throw new Error('Invalid JSON response from OpenAI');
  }

  // Store full prompt for logging
  const fullPrompt = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n');

  return {
    actions: parsed.actions || [],
    usage: data.usage,
    prompt: fullPrompt,
    rawResponse: aiResponse,
    model: data.model || modelName, // Include model from response or fallback to requested model
  };
}
