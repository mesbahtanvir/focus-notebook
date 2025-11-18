const mockFieldValue = {
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
};

const mockFirestore = {
  collection: jest.fn(),
  FieldValue: mockFieldValue,
};

const mockFirestoreConstructor: any = jest.fn(() => mockFirestore);
mockFirestoreConstructor.FieldValue = mockFieldValue;

jest.mock('firebase-admin', () => ({
  firestore: mockFirestoreConstructor,
}));

import {
  logLLMInteraction,
  formatPromptForLogging,
  LogLLMInteractionParams,
} from '../utils/aiPromptLogger';

describe('aiPromptLogger', () => {
  let mockDocRef: any;
  let mockCollectionRef: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDocRef = {
      id: 'mock-log-id-123',
      set: jest.fn().mockResolvedValue(undefined),
    };

    mockCollectionRef = {
      doc: jest.fn(() => mockDocRef),
    };

    mockFirestore.collection.mockReturnValue(mockCollectionRef);
  });

  describe('logLLMInteraction', () => {
    it('should log LLM interaction with all parameters', async () => {
      const params: LogLLMInteractionParams = {
        userId: 'user-123',
        trigger: 'auto',
        prompt: 'Test prompt',
        rawResponse: 'Test response',
        thoughtId: 'thought-456',
        actions: [{ type: 'addTag', data: { tag: 'test' } }],
        toolSpecIds: ['tool-1', 'tool-2'],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
        error: null,
        metadata: { key: 'value' },
        promptType: 'thought-processing',
        status: 'completed',
      };

      const logId = await logLLMInteraction(params);

      expect(logId).toBe('mock-log-id-123');
      expect(mockFirestore.collection).toHaveBeenCalledWith('users/user-123/llmLogs');
      expect(mockDocRef.set).toHaveBeenCalledWith({
        trigger: 'auto',
        prompt: 'Test prompt',
        rawResponse: 'Test response',
        thoughtId: 'thought-456',
        actions: [{ type: 'addTag', data: { tag: 'test' } }],
        toolSpecIds: ['tool-1', 'tool-2'],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
        error: null,
        metadata: { key: 'value' },
        promptType: 'thought-processing',
        status: 'completed',
        createdAt: 'mock-timestamp',
      });
    });

    it('should log minimal LLM interaction', async () => {
      const params: LogLLMInteractionParams = {
        userId: 'user-456',
        trigger: 'manual',
        prompt: 'Simple prompt',
        rawResponse: 'Simple response',
      };

      const logId = await logLLMInteraction(params);

      expect(logId).toBe('mock-log-id-123');
      expect(mockDocRef.set).toHaveBeenCalledWith({
        trigger: 'manual',
        prompt: 'Simple prompt',
        rawResponse: 'Simple response',
        createdAt: 'mock-timestamp',
      });
    });

    it('should sanitize undefined values from nested objects', async () => {
      const params: LogLLMInteractionParams = {
        userId: 'user-789',
        trigger: 'reprocess',
        prompt: 'Test',
        rawResponse: 'Response',
        metadata: {
          defined: 'value',
          undefined: undefined,
          nested: {
            a: 'b',
            c: undefined,
          },
        },
      };

      await logLLMInteraction(params);

      const callArgs = mockDocRef.set.mock.calls[0][0];
      expect(callArgs.metadata).toEqual({
        defined: 'value',
        nested: {
          a: 'b',
        },
      });
      expect(callArgs.metadata.undefined).toBeUndefined();
      expect(callArgs.metadata.nested.c).toBeUndefined();
    });

    it('should sanitize undefined values from arrays', async () => {
      const params: LogLLMInteractionParams = {
        userId: 'user-array',
        trigger: 'auto',
        prompt: 'Test',
        rawResponse: 'Response',
        actions: [
          { type: 'addTag', data: { tag: 'valid' } },
          undefined,
          { type: 'enhanceThought', data: undefined },
        ] as any,
      };

      await logLLMInteraction(params);

      const callArgs = mockDocRef.set.mock.calls[0][0];
      expect(callArgs.actions).toEqual([
        { type: 'addTag', data: { tag: 'valid' } },
        { type: 'enhanceThought' },
      ]);
    });

    it('should handle null values correctly', async () => {
      const params: LogLLMInteractionParams = {
        userId: 'user-null',
        trigger: 'csv-upload',
        prompt: 'Test',
        rawResponse: 'Response',
        error: null,
        metadata: { nullValue: null },
      };

      await logLLMInteraction(params);

      const callArgs = mockDocRef.set.mock.calls[0][0];
      expect(callArgs.error).toBeNull();
      expect(callArgs.metadata.nullValue).toBeNull();
    });

    it('should handle error during logging', async () => {
      const params: LogLLMInteractionParams = {
        userId: 'user-error',
        trigger: 'auto',
        prompt: 'Test',
        rawResponse: 'Response',
      };

      const error = new Error('Firestore error');
      mockDocRef.set.mockRejectedValue(error);

      await expect(logLLMInteraction(params)).rejects.toThrow('Firestore error');
    });

    it('should log with error message', async () => {
      const params: LogLLMInteractionParams = {
        userId: 'user-with-error',
        trigger: 'auto',
        prompt: 'Test',
        rawResponse: 'Response',
        error: 'OpenAI API error',
        status: 'failed',
      };

      await logLLMInteraction(params);

      const callArgs = mockDocRef.set.mock.calls[0][0];
      expect(callArgs.error).toBe('OpenAI API error');
      expect(callArgs.status).toBe('failed');
    });

    it('should handle custom triggers', async () => {
      const params: LogLLMInteractionParams = {
        userId: 'user-custom',
        trigger: 'custom-trigger-type',
        prompt: 'Test',
        rawResponse: 'Response',
      };

      await logLLMInteraction(params);

      const callArgs = mockDocRef.set.mock.calls[0][0];
      expect(callArgs.trigger).toBe('custom-trigger-type');
    });
  });

  describe('formatPromptForLogging', () => {
    it('should format both system and user messages', () => {
      const systemMessage = 'You are a helpful assistant.';
      const userMessage = 'What is the weather today?';

      const result = formatPromptForLogging(systemMessage, userMessage);

      expect(result).toBe(
        'System:\nYou are a helpful assistant.\n\nUser:\nWhat is the weather today?'
      );
    });

    it('should format only system message', () => {
      const systemMessage = 'You are a helpful assistant.';

      const result = formatPromptForLogging(systemMessage);

      expect(result).toBe('System:\nYou are a helpful assistant.');
    });

    it('should format only user message', () => {
      const userMessage = 'What is the weather today?';

      const result = formatPromptForLogging(undefined, userMessage);

      expect(result).toBe('User:\nWhat is the weather today?');
    });

    it('should return empty string when both are undefined', () => {
      const result = formatPromptForLogging();

      expect(result).toBe('');
    });

    it('should handle empty strings', () => {
      const result = formatPromptForLogging('', '');

      expect(result).toBe('');
    });

    it('should trim whitespace from section endings', () => {
      const systemMessage = '  System message with spaces  ';
      const userMessage = '  User message with spaces  ';

      const result = formatPromptForLogging(systemMessage, userMessage);

      // trim() is called on the whole section "System:\n  System message with spaces  "
      // which only removes trailing/leading whitespace from the section, not the message
      expect(result).toBe(
        'System:\n  System message with spaces\n\nUser:\n  User message with spaces'
      );
    });

    it('should handle multiline messages', () => {
      const systemMessage = 'Line 1\nLine 2\nLine 3';
      const userMessage = 'Question 1\nQuestion 2';

      const result = formatPromptForLogging(systemMessage, userMessage);

      expect(result).toBe(
        'System:\nLine 1\nLine 2\nLine 3\n\nUser:\nQuestion 1\nQuestion 2'
      );
    });
  });
});
