/**
 * Unit tests for OpenAI Client
 */

// Set environment variable BEFORE importing (CONFIG is evaluated at import time)
process.env.OPENAI_API_KEY = 'sk-test-key';

// Mock the config module to ensure API key is set
jest.mock('../../config', () => ({
  CONFIG: {
    OPENAI_API_KEY: 'sk-test-key',
    MODELS: {
      DEFAULT: 'gpt-3.5-turbo',
      FALLBACK: 'gpt-3.5-turbo',
    },
  },
}));

import { callOpenAI } from '../../utils/openaiClient';
import type { ProcessingContext } from '../../utils/contextGatherer';

// Mock fetch
global.fetch = jest.fn();

describe('OpenAI Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockContext: ProcessingContext = {
    goals: [{ id: 'g1', title: 'Test Goal', objective: 'Test' }],
    projects: [{ id: 'p1', title: 'Test Project' }],
    people: [{ id: 'per1', name: 'Sarah', shortName: 'sarah' }],
    tasks: [{ id: 't1', title: 'Test Task' }],
    moods: [{ value: 7, note: 'Good' }]
  };

  it('should call OpenAI API with correct parameters', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            actions: [
              {
                type: 'enhanceThought',
                confidence: 99,
                data: { improvedText: 'Enhanced text' },
                reasoning: 'Fixed grammar'
              }
            ]
          })
        }
      }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const result = await callOpenAI('test thought', mockContext);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-test-key'
        })
      })
    );

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].type).toBe('enhanceThought');
    expect(result.usage?.total_tokens).toBe(150);
  });

  it('should handle markdown-wrapped JSON responses', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: '```json\n{"actions": []}\n```'
        }
      }],
      usage: { total_tokens: 100 }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const result = await callOpenAI('test', mockContext);

    expect(result.actions).toEqual([]);
  });

  it('should handle non-markdown JSON responses', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: '{"actions": [{"type": "addTag", "confidence": 95, "data": {"tag": "test"}, "reasoning": "test"}]}'
        }
      }],
      usage: { total_tokens: 100 }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const result = await callOpenAI('test', mockContext);

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].type).toBe('addTag');
  });

  it('should throw error on API failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: { message: 'API rate limit exceeded' }
      })
    });

    await expect(callOpenAI('test', mockContext)).rejects.toThrow('API rate limit exceeded');
  });

  it('should throw error on invalid JSON response', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'This is not JSON'
        }
      }],
      usage: { total_tokens: 100 }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    await expect(callOpenAI('test', mockContext)).rejects.toThrow('Invalid JSON response');
  });

  it('should throw error when no response content', async () => {
    const mockResponse = {
      choices: [{ message: {} }],
      usage: { total_tokens: 100 }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    await expect(callOpenAI('test', mockContext)).rejects.toThrow('No response from OpenAI');
  });

  it('should include context in prompt', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({ actions: [] })
        }
      }],
      usage: { total_tokens: 100 }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    await callOpenAI('meeting with sarah', mockContext);

    const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
    const requestBody = JSON.parse(callArgs.body);
    const prompt = requestBody.messages[1].content;

    // Check that context is included in the prompt
    expect(prompt).toContain('Sarah');
    expect(prompt).toContain('Test Goal');
    expect(prompt).toContain('Test Project');
    expect(prompt).toContain('meeting with sarah');
  });
});
