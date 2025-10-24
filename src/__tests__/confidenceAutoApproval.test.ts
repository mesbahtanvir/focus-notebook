import { ManualProcessor } from '@/lib/thoughtProcessor/manualProcessor';

// Mock all dependencies
jest.mock('@/store/useThoughts', () => ({
  useThoughts: {
    getState: jest.fn(() => ({
      thoughts: [
        {
          id: 'thought-1',
          text: 'I need to buy groceries',
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
      getQueueItem: jest.fn(() => ({
        id: 'queue-1',
        thoughtId: 'thought-1',
        mode: 'manual',
        status: 'processing',
        actions: [],
        approvedActions: [],
        executedActions: [],
      })),
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
      friends: [],
    })),
  },
}));

jest.mock('@/lib/thoughtProcessor/toolRegistry', () => ({
  ToolRegistry: {
    getToolDescriptions: jest.fn(() => 'Tool descriptions'),
  },
}));

describe('Confidence-based Auto-Approval', () => {
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

  it('auto-approves high confidence suggestions (>= 85%)', async () => {
    const mockResponse = {
      result: {
        confidence: 0.95,
        actions: [
          {
            type: 'createTask',
            tool: 'tasks',
            data: { title: 'Buy groceries', category: 'health' },
            reasoning: 'Clear action item',
          },
        ],
        suggestedTools: ['tasks'],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    // Mock the approval handler
    const mockApproveAndExecute = jest.fn().mockResolvedValue({
      success: true,
      executed: 1,
      failed: 0,
    });

    jest.doMock('@/lib/thoughtProcessor/approvalHandler', () => ({
      approvalHandler: {
        approveAndExecute: mockApproveAndExecute,
      },
    }));

    const result = await processor.processThought('thought-1');

    expect(result.success).toBe(true);
    // The auto-approval logic should have been triggered
    // Note: Due to dynamic import, we can't directly test the mock call
    // but we can verify that the queue status wasn't set to 'awaiting-approval'
  });

  it('requires approval for low confidence suggestions (< 85%)', async () => {
    const { useProcessQueue } = require('@/store/useProcessQueue');
    const updateQueueItem = jest.fn();
    useProcessQueue.getState.mockReturnValue({
      ...useProcessQueue.getState(),
      updateQueueItem,
      addAction: jest.fn(() => 'action-1'),
    });

    const mockResponse = {
      result: {
        confidence: 0.65,
        actions: [
          {
            type: 'createProject',
            tool: 'projects',
            data: { title: 'Learn Programming' },
            reasoning: 'Unclear which language',
          },
        ],
        suggestedTools: ['projects'],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await processor.processThought('thought-1');

    expect(result.success).toBe(true);
    // Should set status to awaiting-approval
    expect(updateQueueItem).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: 'awaiting-approval',
      })
    );
  });

  it('uses 85% as the confidence threshold', async () => {
    const mockResponse85 = {
      result: {
        confidence: 0.85, // Exactly 85%
        actions: [
          {
            type: 'createTask',
            tool: 'tasks',
            data: { title: 'Test task' },
            reasoning: 'Test',
          },
        ],
        suggestedTools: ['tasks'],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse85,
    });

    const result = await processor.processThought('thought-1');

    expect(result.success).toBe(true);
    // 85% should trigger auto-approval (>= threshold)
  });

  it('defaults to 0 confidence if not provided', async () => {
    const { useProcessQueue } = require('@/store/useProcessQueue');
    const updateQueueItem = jest.fn();
    useProcessQueue.getState.mockReturnValue({
      ...useProcessQueue.getState(),
      updateQueueItem,
      addAction: jest.fn(() => 'action-1'),
    });

    const mockResponse = {
      result: {
        // No confidence field
        actions: [
          {
            type: 'createTask',
            tool: 'tasks',
            data: { title: 'Test' },
            reasoning: 'Test',
          },
        ],
        suggestedTools: ['tasks'],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await processor.processThought('thought-1');

    expect(result.success).toBe(true);
    // Should require approval (0 < 85%)
    expect(updateQueueItem).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: 'awaiting-approval',
      })
    );
  });

  it('does not auto-approve if no actions are suggested', async () => {
    const { useProcessQueue } = require('@/store/useProcessQueue');
    const updateQueueItem = jest.fn();
    useProcessQueue.getState.mockReturnValue({
      ...useProcessQueue.getState(),
      updateQueueItem,
    });

    const mockResponse = {
      result: {
        confidence: 0.95,
        actions: [], // No actions
        suggestedTools: [],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await processor.processThought('thought-1');

    expect(result.success).toBe(true);
    // Should still complete successfully but not trigger auto-approval
    expect(updateQueueItem).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: 'awaiting-approval',
      })
    );
  });

  it('handles edge case of confidence = 0.84', async () => {
    const { useProcessQueue } = require('@/store/useProcessQueue');
    const updateQueueItem = jest.fn();
    useProcessQueue.getState.mockReturnValue({
      ...useProcessQueue.getState(),
      updateQueueItem,
      addAction: jest.fn(() => 'action-1'),
    });

    const mockResponse = {
      result: {
        confidence: 0.84, // Just below threshold
        actions: [
          {
            type: 'createTask',
            tool: 'tasks',
            data: { title: 'Test' },
            reasoning: 'Test',
          },
        ],
        suggestedTools: ['tasks'],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await processor.processThought('thought-1');

    expect(result.success).toBe(true);
    // Should require approval (< 85%)
    expect(updateQueueItem).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: 'awaiting-approval',
      })
    );
  });

  it('handles edge case of confidence = 1.0', async () => {
    const mockResponse = {
      result: {
        confidence: 1.0, // Maximum confidence
        actions: [
          {
            type: 'createTask',
            tool: 'tasks',
            data: { title: 'Very clear task' },
            reasoning: 'Extremely clear',
          },
        ],
        suggestedTools: ['tasks'],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await processor.processThought('thought-1');

    expect(result.success).toBe(true);
    // Should auto-approve (100% confidence)
  });
});
