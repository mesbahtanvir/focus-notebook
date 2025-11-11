import * as admin from 'firebase-admin';

export type LlmLogTrigger = 'auto' | 'manual' | 'reprocess' | 'csv-upload' | 'csv-api' | string;

export interface LogLLMInteractionParams {
  userId: string;
  trigger: LlmLogTrigger;
  prompt: string;
  rawResponse: string;
  thoughtId?: string;
  actions?: any[];
  toolSpecIds?: string[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: string | null;
  metadata?: Record<string, any>;
  promptType?: string;
  status?: 'completed' | 'failed';
}

export async function logLLMInteraction(params: LogLLMInteractionParams): Promise<string> {
  const { userId, ...rest } = params;
  const logRef = admin.firestore().collection(`users/${userId}/llmLogs`).doc();

  await logRef.set({
    ...rest,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return logRef.id;
}

export function formatPromptForLogging(systemMessage?: string, userMessage?: string): string {
  const sections: string[] = [];

  if (systemMessage) {
    sections.push(`System:\n${systemMessage}`.trim());
  }

  if (userMessage) {
    sections.push(`User:\n${userMessage}`.trim());
  }

  return sections.join('\n\n');
}
