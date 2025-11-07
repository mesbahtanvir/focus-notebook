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

  // Handle nested object/array access: {{object.property}} and {{array.length}}
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

/**
 * Export a prompt for GitHub Models interface
 * @param promptName - Name of the prompt file
 * @param variables - Test variables for the prompt
 * @param context - Test context data
 * @returns Formatted string for GitHub Models
 */
export function exportPromptForGitHubModels(
  promptName: string,
  variables: Record<string, any> = {},
  context: Record<string, any> = {}
): string {
  const config = loadPrompt(promptName);
  const messages = buildMessages(config, variables, context);

  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const userMessage = messages.find(m => m.role === 'user')?.content || '';

  return `# ${config.name} - GitHub Models Export

**Description:** ${config.description}
**Version:** ${config.version}

---

## System Message:
${systemMessage}

---

## User Prompt:
${userMessage}

---

## Model Configuration:
- **Default Model:** ${config.model.default}
- **Alternative Models:** ${config.model.alternatives?.join(', ') || 'None'}
- **Temperature:** ${config.model.temperature}
- **Max Tokens:** ${config.model.maxTokens}

## Test Instructions:
1. Copy the System Message and User Prompt above
2. Paste into GitHub Models interface or API
3. Use the recommended model settings above
4. Expected response format: ${config.responseValidation?.format || 'text'}

${config.responseValidation?.format === 'json' ? `
## Expected JSON Response Structure:
The model should respond with JSON matching this schema:
\`\`\`json
${JSON.stringify(config.responseValidation.schema, null, 2)}
\`\`\`
` : ''}

## Customization:
To test with your own data, modify the variables passed to this export function.
Current test data includes:
${Object.keys(variables).map(key => `- ${key}: ${typeof variables[key]}`).join('\n')}
${Object.keys(context).map(key => `- ${key}: ${Array.isArray(context[key]) ? `${context[key].length} items` : typeof context[key]}`).join('\n')}
`;
}

/**
 * Build a complete prompt string (system + user) for direct use
 * Useful for quick testing or non-API scenarios
 * @param promptName - Name of the prompt file
 * @param variables - Variables for the prompt
 * @param context - Context data
 * @returns Complete prompt string
 */
export function buildCompletePrompt(
  promptName: string,
  variables: Record<string, any> = {},
  context: Record<string, any> = {}
): string {
  const config = loadPrompt(promptName);
  const messages = buildMessages(config, variables, context);

  return messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n');
}

/**
 * Get prompt metadata without loading the full prompt
 * @param promptName - Name of the prompt file
 * @returns Prompt metadata
 */
export function getPromptMetadata(promptName: string): {
  name: string;
  description: string;
  version: string;
  model: ModelConfig;
} {
  const config = loadPrompt(promptName);
  return {
    name: config.name,
    description: config.description,
    version: config.version,
    model: config.model,
  };
}
