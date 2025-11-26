import * as functions from 'firebase-functions/v1';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const PROMPT_FILE_NAME = 'places-insights.prompt.yml';

type DestinationData = {
  destinationName: string;
  country?: string;
};

type PromptConfig = {
  name: string;
  model: string;
  modelParameters: {
    temperature: number;
    max_tokens: number;
  };
  messages: Array<{
    role: 'system' | 'user';
    content: string;
  }>;
};

export const resolvePromptPath = (): string => {
  const candidatePaths = [
    path.join(__dirname, '../../prompts', PROMPT_FILE_NAME),
    path.join(__dirname, '../../../prompts', PROMPT_FILE_NAME),
    path.join(__dirname, '../../../../functions/prompts', PROMPT_FILE_NAME),
    path.join(process.cwd(), 'functions', 'prompts', PROMPT_FILE_NAME),
    path.join(process.cwd(), 'prompts', PROMPT_FILE_NAME),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Prompt file "${PROMPT_FILE_NAME}" not found. Checked: ${candidatePaths.join(', ')}`
  );
};

export const loadPromptConfig = (): PromptConfig => {
  const promptPath = resolvePromptPath();
  const fileContents = fs.readFileSync(promptPath, 'utf8');
  return yaml.parse(fileContents);
};

export const renderTemplate = (template: string, data: DestinationData): string => {
  let rendered = template.replace(/{{destinationName}}/g, data.destinationName);

  if (data.country) {
    rendered = rendered
      .replace(/{{#country}}/g, '')
      .replace(/{{\/country}}/g, '')
      .replace(/{{country}}/g, data.country);
  } else {
    rendered = rendered
      .replace(/{{#country}}[^]*{{\/country}}/g, '')
      .replace(/{{country}}/g, '');
  }

  return rendered;
};

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
};

export const buildMessages = (
  promptConfig: PromptConfig,
  data: DestinationData
): Array<{ role: 'system' | 'user'; content: string }> => {
  return promptConfig.messages.map((msg) => ({
    role: msg.role,
    content: renderTemplate(msg.content, data),
  }));
};

type ChatClient = {
  chat: {
    completions: {
      create: (args: {
        model: string;
        messages: Array<{ role: 'system' | 'user'; content: string }>;
        response_format: { type: 'json_object' };
        temperature?: number;
        max_tokens?: number;
      }) => Promise<{ choices: Array<{ message?: { content?: string | null } }> }>;
    };
  };
};

export const executePlaceInsights = async (
  destination: DestinationData,
  client: ChatClient,
  promptConfig: PromptConfig
): Promise<any> => {
  const messages = buildMessages(promptConfig, destination);

  const response = await client.chat.completions.create({
    model: promptConfig.model?.includes('/')
      ? promptConfig.model.split('/')[1]
      : promptConfig.model || 'gpt-4o-mini',
    messages,
    response_format: { type: 'json_object' },
    temperature: promptConfig.modelParameters?.temperature ?? 0.35,
    max_tokens: promptConfig.modelParameters?.max_tokens ?? 12000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from OpenAI');
  }

  return JSON.parse(content);
};

export const runPlaceInsights = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const destinationName = (data?.destinationName as string | undefined)?.trim();
  const country = (data?.country as string | undefined)?.trim();

  if (!destinationName) {
    throw new functions.https.HttpsError('invalid-argument', 'destinationName is required');
  }

  try {
    const promptConfig = loadPromptConfig();
    const openai = getOpenAIClient();

    const parsed = await executePlaceInsights(
      { destinationName, country },
      openai,
      promptConfig
    );

    return {
      result: parsed,
    };
  } catch (error) {
    console.error('Failed to run place insights:', error);
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Unknown error while running place insights'
    );
  }
});
