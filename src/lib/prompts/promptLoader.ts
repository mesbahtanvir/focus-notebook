import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

export interface ModelConfig {
  default: string;
  alternatives?: string[];
  temperature: number;
  maxTokens: number;
}

export interface PromptConfig {
  name: string;
  description: string;
  version: string;
  model: ModelConfig;
  systemPrompt: string;
  userPrompt?: string;
  contextTemplate?: string;
  actionExtractionPrompt?: string;
  summaryPrompt?: string;
  responseValidation?: {
    format: string;
    schema?: Record<string, any>;
  };
}

/**
 * Load a prompt configuration from a .yml file
 * @param promptName - Name of the prompt file (without .yml extension)
 * @returns Parsed prompt configuration
 */
export function loadPrompt(promptName: string): PromptConfig {
  const promptsDir = path.join(process.cwd(), 'prompts');
  const promptPath = path.join(promptsDir, `${promptName}.yml`);

  if (!fs.existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptName}.yml`);
  }

  const fileContents = fs.readFileSync(promptPath, 'utf8');
  const config = yaml.parse(fileContents) as PromptConfig;

  // Validate required fields
  if (!config.name || !config.systemPrompt) {
    throw new Error(`Invalid prompt configuration in ${promptName}.yml`);
  }

  return config;
}

/**
 * Replace template variables in a string
 * Simple implementation - supports {{variable}} syntax
 * @param template - Template string with variables
 * @param variables - Object with variable values
 * @returns Rendered string
 */
export function renderTemplate(template: string, variables: Record<string, any>): string {
  let result = template;

  // Replace simple variables: {{variable}}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  });

  // Handle nested object access: {{object.property}}
  Object.entries(variables).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([subKey, subValue]) => {
        const regex = new RegExp(`{{${key}\\.${subKey}}}`, 'g');
        result = result.replace(regex, String(subValue ?? ''));
      });
    }
  });

  return result;
}

/**
 * Render context from template with user data
 * Supports basic Handlebars-like syntax
 * @param template - Context template string
 * @param context - User context data
 * @returns Rendered context string
 */
export function renderContext(template: string, context: Record<string, any>): string {
  if (!template) return '';

  let result = template;

  // Simple if/each implementation
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
 * @param promptConfig - Prompt configuration
 * @param variables - Variables for user prompt
 * @param context - User context data
 * @returns Messages array for API call
 */
export function buildMessages(
  promptConfig: PromptConfig,
  variables: Record<string, any> = {},
  context: Record<string, any> = {}
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    {
      role: 'system',
      content: promptConfig.systemPrompt,
    },
  ];

  if (promptConfig.userPrompt) {
    // Render context if template exists
    const renderedContext = promptConfig.contextTemplate
      ? renderContext(promptConfig.contextTemplate, context)
      : '';

    // Add context to variables
    const allVariables = {
      ...variables,
      context: renderedContext,
    };

    const userContent = renderTemplate(promptConfig.userPrompt, allVariables);
    messages.push({
      role: 'user',
      content: userContent,
    });
  }

  return messages;
}

/**
 * Get all available prompts
 * @returns Array of prompt names
 */
export function listPrompts(): string[] {
  const promptsDir = path.join(process.cwd(), 'prompts');

  if (!fs.existsSync(promptsDir)) {
    return [];
  }

  return fs
    .readdirSync(promptsDir)
    .filter(file => file.endsWith('.yml'))
    .map(file => file.replace('.yml', ''));
}
