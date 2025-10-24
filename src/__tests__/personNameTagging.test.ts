import { ManualProcessor } from '@/lib/thoughtProcessor/manualProcessor';

// Mock dependencies
jest.mock('@/store/useThoughts', () => ({
  useThoughts: {
    getState: jest.fn(() => ({
      thoughts: [
        {
          id: 'thought-1',
          text: 'Had a great conversation with John today',
          createdAt: '2025-01-01T00:00:00.000Z',
          tags: [],
        },
      ],
      updateThought: jest.fn(),
    })),
  },
}));

jest.mock('@/store/useProcessQueue', () => ({
  useProcessQueue: {
    getState: jest.fn(() => ({
      addToQueue: jest.fn(() => 'queue-1'),
      updateQueueItem: jest.fn(),
      addAction: jest.fn((queueId, action) => `action-${Math.random()}`),
      getQueueItem: jest.fn(),
      updateAction: jest.fn(),
    })),
  },
}));

jest.mock('@/store/useSettings', () => ({
  useSettings: {
    getState: jest.fn(() => ({
      settings: {
        openaiApiKey: 'sk-test-key',
        aiModel: 'gpt-4',
      },
      hasApiKey: jest.fn(() => true),
    })),
  },
}));

jest.mock('@/store/useRequestLog', () => ({
  useRequestLog: {
    getState: jest.fn(() => ({
      addToQueue: jest.fn(() => 'request-1'),
      updateRequestStatus: jest.fn(),
    })),
  },
}));

jest.mock('@/store/useFriends', () => ({
  useFriends: {
    getState: jest.fn(() => ({
      friends: [
        { id: '1', name: 'John', relationshipType: 'friend' },
        { id: '2', name: 'Sarah', relationshipType: 'colleague' },
        { id: '3', name: 'Mike', relationshipType: 'family' },
      ],
    })),
  },
}));

jest.mock('@/lib/thoughtProcessor/toolRegistry', () => ({
  ToolRegistry: {
    getToolDescriptions: jest.fn(() => 'Tool descriptions'),
  },
}));

describe('Person Name Auto-Tagging', () => {
  let processor: ManualProcessor;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    processor = new ManualProcessor();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    jest.clearAllMocks();

    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore console methods
    jest.restoreAllMocks();
  });

  it('includes person names in API request', async () => {
    const mockResponse = {
      result: {
        confidence: 0.9,
        actions: [],
        suggestedTools: [],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await processor.processThought('thought-1');

    expect(mockFetch).toHaveBeenCalled();
    const fetchCall = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.personNames).toEqual(['John', 'Sarah', 'Mike']);
  });

  it('handles empty friends list', async () => {
    const { useFriends } = require('@/store/useFriends');
    useFriends.getState.mockReturnValue({
      friends: [],
    });

    const mockResponse = {
      result: {
        confidence: 0.9,
        actions: [],
        suggestedTools: [],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await processor.processThought('thought-1');

    const fetchCall = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.personNames).toEqual([]);
  });

  it('sends person names to correct API endpoint', async () => {
    const mockResponse = {
      result: {
        confidence: 0.9,
        actions: [],
        suggestedTools: [],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await processor.processThought('thought-1');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/process-thought',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('includes person names along with thought data', async () => {
    const mockResponse = {
      result: {
        confidence: 0.9,
        actions: [],
        suggestedTools: [],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await processor.processThought('thought-1');

    const fetchCall = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody).toHaveProperty('thought');
    expect(requestBody).toHaveProperty('apiKey');
    expect(requestBody).toHaveProperty('toolDescriptions');
    expect(requestBody).toHaveProperty('personNames');
    expect(requestBody.thought.text).toBe('Had a great conversation with John today');
  });

  it('extracts unique person names from friends list', async () => {
    const { useFriends } = require('@/store/useFriends');
    useFriends.getState.mockReturnValue({
      friends: [
        { id: '1', name: 'John', relationshipType: 'friend' },
        { id: '2', name: 'John', relationshipType: 'colleague' }, // Duplicate
        { id: '3', name: 'Sarah', relationshipType: 'family' },
      ],
    });

    const mockResponse = {
      result: {
        confidence: 0.9,
        actions: [],
        suggestedTools: [],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await processor.processThought('thought-1');

    const fetchCall = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    // Should include duplicates as friends store doesn't deduplicate
    expect(requestBody.personNames).toEqual(['John', 'John', 'Sarah']);
  });

  it('handles large friends list', async () => {
    const { useFriends } = require('@/store/useFriends');
    const manyFriends = Array.from({ length: 100 }, (_, i) => ({
      id: `${i}`,
      name: `Person${i}`,
      relationshipType: 'friend',
    }));

    useFriends.getState.mockReturnValue({
      friends: manyFriends,
    });

    const mockResponse = {
      result: {
        confidence: 0.9,
        actions: [],
        suggestedTools: [],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await processor.processThought('thought-1');

    const fetchCall = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.personNames).toHaveLength(100);
  });

  it('preserves person names order from friends list', async () => {
    const { useFriends } = require('@/store/useFriends');
    useFriends.getState.mockReturnValue({
      friends: [
        { id: '1', name: 'Zoe', relationshipType: 'friend' },
        { id: '2', name: 'Alice', relationshipType: 'colleague' },
        { id: '3', name: 'Mike', relationshipType: 'family' },
      ],
    });

    const mockResponse = {
      result: {
        confidence: 0.9,
        actions: [],
        suggestedTools: [],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await processor.processThought('thought-1');

    const fetchCall = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.personNames).toEqual(['Zoe', 'Alice', 'Mike']);
  });

  it('returns error when friends store fails', async () => {
    const { useFriends } = require('@/store/useFriends');
    useFriends.getState.mockImplementation(() => {
      throw new Error('Friends store error');
    });

    const mockResponse = {
      result: {
        confidence: 0.9,
        actions: [],
        suggestedTools: [],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    // Should return error object instead of throwing
    const result = await processor.processThought('thought-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Friends store error');
  });
});
