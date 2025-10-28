/**
 * Frontend tests for manual edit tracking
 */

import { renderHook, act } from '@testing-library/react';
import { useThoughts } from '@/store/useThoughts';
import type { Thought, AIAppliedChanges } from '@/store/useThoughts';

// Mock Firebase
jest.mock('@/lib/firebaseClient', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user' } }
}));

jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn(),
  updateAt: jest.fn(),
  deleteAt: jest.fn()
}));

jest.mock('@/lib/data/subscribe', () => ({
  subscribeCol: jest.fn((_, callback) => {
    callback([], { fromCache: false, hasPendingWrites: false });
    return jest.fn();
  })
}));

describe('Manual Edit Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track text edits after AI processing', async () => {
    const { result } = renderHook(() => useThoughts());

    // Create AI-processed thought
    const aiAppliedChanges: AIAppliedChanges = {
      textEnhanced: true,
      textChanges: [],
      tagsAdded: ['tool-cbt'],
      appliedAt: new Date().toISOString(),
      appliedBy: 'auto'
    };

    // Mock thought with AI processing
    act(() => {
      result.current.thoughts = [{
        id: 'thought1',
        text: 'Enhanced text by AI',
        tags: ['tool-cbt', 'processed'],
        createdAt: new Date().toISOString(),
        aiAppliedChanges
      } as Thought];
    });

    // User manually edits the text
    await act(async () => {
      await result.current.updateThought('thought1', {
        text: 'Manually edited text'
      });
    });

    // Check that updateAt was called with manual edit tracking
    const { updateAt } = require('@/lib/data/gateway');
    expect(updateAt).toHaveBeenCalledWith(
      expect.stringContaining('thought1'),
      expect.objectContaining({
        text: 'Manually edited text',
        manualEdits: expect.objectContaining({
          textEditedAfterAI: true,
          lastManualEditAt: expect.any(String)
        })
      })
    );
  });

  it('should track tag additions after AI processing', async () => {
    const { result } = renderHook(() => useThoughts());

    const aiAppliedChanges: AIAppliedChanges = {
      textEnhanced: false,
      textChanges: [],
      tagsAdded: ['tool-cbt'],
      appliedAt: new Date().toISOString(),
      appliedBy: 'auto'
    };

    act(() => {
      result.current.thoughts = [{
        id: 'thought1',
        text: 'Test',
        tags: ['tool-cbt', 'processed'],
        createdAt: new Date().toISOString(),
        aiAppliedChanges
      } as Thought];
    });

    // User manually adds new tags
    await act(async () => {
      await result.current.updateThought('thought1', {
        tags: ['tool-cbt', 'processed', 'manual-tag', 'another-tag']
      });
    });

    const { updateAt } = require('@/lib/data/gateway');
    expect(updateAt).toHaveBeenCalledWith(
      expect.stringContaining('thought1'),
      expect.objectContaining({
        manualEdits: expect.objectContaining({
          textEditedAfterAI: false,
          tagsAddedManually: ['manual-tag', 'another-tag'],
          tagsRemovedManually: []
        })
      })
    );
  });

  it('should track tag removals after AI processing', async () => {
    const { result } = renderHook(() => useThoughts());

    const aiAppliedChanges: AIAppliedChanges = {
      textEnhanced: false,
      textChanges: [],
      tagsAdded: ['tool-cbt', 'tool-brainstorm'],
      appliedAt: new Date().toISOString(),
      appliedBy: 'auto'
    };

    act(() => {
      result.current.thoughts = [{
        id: 'thought1',
        text: 'Test',
        tags: ['tool-cbt', 'tool-brainstorm', 'processed'],
        createdAt: new Date().toISOString(),
        aiAppliedChanges
      } as Thought];
    });

    // User removes a tag
    await act(async () => {
      await result.current.updateThought('thought1', {
        tags: ['tool-cbt', 'processed'] // Removed tool-brainstorm
      });
    });

    const { updateAt } = require('@/lib/data/gateway');
    expect(updateAt).toHaveBeenCalledWith(
      expect.stringContaining('thought1'),
      expect.objectContaining({
        manualEdits: expect.objectContaining({
          tagsAddedManually: [],
          tagsRemovedManually: ['tool-brainstorm']
        })
      })
    );
  });

  it('should NOT track edits for thoughts without AI processing', async () => {
    const { result } = renderHook(() => useThoughts());

    // Regular thought without AI processing
    act(() => {
      result.current.thoughts = [{
        id: 'thought1',
        text: 'Regular thought',
        tags: [],
        createdAt: new Date().toISOString()
      } as Thought];
    });

    await act(async () => {
      await result.current.updateThought('thought1', {
        text: 'Edited text'
      });
    });

    const { updateAt } = require('@/lib/data/gateway');
    expect(updateAt).toHaveBeenCalledWith(
      expect.stringContaining('thought1'),
      expect.not.objectContaining({
        manualEdits: expect.anything()
      })
    );
  });

  it('should track both text and tag edits together', async () => {
    const { result } = renderHook(() => useThoughts());

    const aiAppliedChanges: AIAppliedChanges = {
      textEnhanced: true,
      textChanges: [],
      tagsAdded: ['tool-cbt'],
      appliedAt: new Date().toISOString(),
      appliedBy: 'auto'
    };

    act(() => {
      result.current.thoughts = [{
        id: 'thought1',
        text: 'AI enhanced',
        tags: ['tool-cbt', 'processed'],
        createdAt: new Date().toISOString(),
        aiAppliedChanges
      } as Thought];
    });

    await act(async () => {
      await result.current.updateThought('thought1', {
        text: 'User edited',
        tags: ['tool-cbt', 'processed', 'new-tag']
      });
    });

    const { updateAt } = require('@/lib/data/gateway');
    expect(updateAt).toHaveBeenCalledWith(
      expect.stringContaining('thought1'),
      expect.objectContaining({
        text: 'User edited',
        tags: ['tool-cbt', 'processed', 'new-tag'],
        manualEdits: expect.objectContaining({
          textEditedAfterAI: true,
          tagsAddedManually: ['new-tag'],
          tagsRemovedManually: [],
          lastManualEditAt: expect.any(String)
        })
      })
    );
  });
});
