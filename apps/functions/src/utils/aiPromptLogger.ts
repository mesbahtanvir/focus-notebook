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

function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined) {
    return undefined as T;
  }

  if (value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    const sanitizedArray = value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
    return sanitizedArray as unknown as T;
  }

  if (typeof value === 'object') {
    const sanitizedObject: Record<string, any> = {};
    for (const [key, val] of Object.entries(value as Record<string, any>)) {
      const sanitizedValue = sanitizeForFirestore(val);
      if (sanitizedValue !== undefined) {
        sanitizedObject[key] = sanitizedValue;
      }
    }
    return sanitizedObject as T;
  }

  return value;
}

export async function logLLMInteraction(params: LogLLMInteractionParams): Promise<string> {
  const { userId, ...rest } = params;
  const logRef = admin.firestore().collection(`users/${userId}/llmLogs`).doc();
  const sanitizedPayload = sanitizeForFirestore(rest);

  await logRef.set({
    ...sanitizedPayload,
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
