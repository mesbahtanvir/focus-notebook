import { renderHook, act } from '@testing-library/react';
import { useRequestLog } from '@/store/useRequestLog';
import { useThoughts } from '@/store/useThoughts';
import { useTasks } from '@/store/useTasks';

describe('Integration Tests', () => {
  describe('Thought to Task Workflow', () => {
    it('can create a thought and track it through CBT processing', async () => {
      const { result: thoughtsResult } = renderHook(() => useThoughts());
      
      // Add a thought with CBT tag
      await act(async () => {
        await thoughtsResult.current.add({
          text: 'I feel overwhelmed with work',
          type: 'feeling-bad',
          createdAt: new Date().toISOString(),
          tags: ['cbt'],
          intensity: 7,
        });
      });

      const thought = thoughtsResult.current.thoughts[0];
      expect(thought.tags).toContain('cbt');
      expect(thought.tags).not.toContain('cbt-processed');

      // Process through CBT
      const cbtData = {
        situation: 'Looking at my task list',
        automaticThought: 'I cannot handle all this work',
        emotions: 'Anxiety (70%), Overwhelmed (80%)',
        alternativeThought: 'I can prioritize and tackle one task at a time',
      };

      await act(async () => {
        await thoughtsResult.current.updateThought(thought.id, {
          cbtAnalysis: cbtData,
          tags: ['cbt', 'cbt-processed'],
        });
      });

      const processed = thoughtsResult.current.thoughts[0];
      expect(processed.cbtAnalysis).toEqual(cbtData);
      expect(processed.tags).toContain('cbt-processed');
    });
  });

  describe('Request Logging Workflow', () => {
    it('tracks a complete request lifecycle', () => {
      const { result } = renderHook(() => useRequestLog());
      
      // Start request
      let requestId: string;
      act(() => {
        requestId = result.current.addToQueue({
          type: 'sync',
          method: 'syncToCloud',
          url: 'Firebase Firestore',
        });
      });

      expect(result.current.queue.length).toBe(1);
      expect(result.current.logs[0].requestStatus).toBe('pending');

      // Progress
      act(() => {
        result.current.updateRequestStatus(requestId, 'in-progress');
      });

      expect(result.current.queue.length).toBe(1);
      expect(result.current.logs[0].requestStatus).toBe('in-progress');

      // Complete
      act(() => {
        result.current.updateRequestStatus(requestId, 'completed', {
          response: { success: true },
          status: 200,
        });
      });

      expect(result.current.queue.length).toBe(0); // Removed from queue
      expect(result.current.logs[0].requestStatus).toBe('completed');
      expect(result.current.logs[0].status).toBe(200);
      expect(result.current.logs[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('handles multiple concurrent requests', () => {
      const { result } = renderHook(() => useRequestLog());
      
      const ids: string[] = [];
      act(() => {
        ids.push(result.current.addToQueue({
          type: 'sync',
          method: 'syncTasks',
          url: 'Firebase/tasks',
        }));
        ids.push(result.current.addToQueue({
          type: 'sync',
          method: 'syncThoughts',
          url: 'Firebase/thoughts',
        }));
        ids.push(result.current.addToQueue({
          type: 'api',
          method: 'fetchData',
          url: 'API/data',
        }));
      });

      expect(result.current.queue.length).toBe(3);
      expect(result.current.getPendingRequests().length).toBe(3);

      // Mark one as in-progress
      act(() => {
        result.current.updateRequestStatus(ids[0], 'in-progress');
      });

      expect(result.current.getPendingRequests().length).toBe(2);
      expect(result.current.getInProgressRequests().length).toBe(1);

      // Complete one
      act(() => {
        result.current.updateRequestStatus(ids[1], 'completed', { status: 200 });
      });

      expect(result.current.queue.length).toBe(2); // One completed and removed

      // Fail one
      act(() => {
        result.current.updateRequestStatus(ids[2], 'failed', { 
          error: 'Network error',
          status: 500 
        });
      });

      expect(result.current.queue.length).toBe(1); // Only in-progress remains
    });
  });

  describe('Task Management Workflow', () => {
    it('has task management functions available', () => {
      const { result } = renderHook(() => useTasks());
      
      // Verify the store has the expected API
      expect(typeof result.current.add).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
      expect(typeof result.current.deleteTask).toBe('function');
      expect(typeof result.current.updateTask).toBe('function');
      expect(Array.isArray(result.current.tasks)).toBe(true);
    });
  });

  describe('Store Interactions', () => {
    it('maintains separate state between stores', () => {
      const { result: thoughts } = renderHook(() => useThoughts());
      const { result: tasks } = renderHook(() => useTasks());
      const { result: logs } = renderHook(() => useRequestLog());

      // Get initial counts
      const initialLogCount = logs.current.logs.length;
      
      // Add item to logs
      act(() => {
        logs.current.addLog({
          type: 'sync',
          method: 'test',
          url: 'test',
        });
      });

      expect(logs.current.logs.length).toBe(initialLogCount + 1);

      // Clearing logs shouldn't affect other stores
      const thoughtCount = thoughts.current.thoughts.length;
      const taskCount = tasks.current.tasks.length;
      
      act(() => {
        logs.current.clearLogs();
      });

      // Other stores unchanged
      expect(thoughts.current.thoughts.length).toBe(thoughtCount);
      expect(tasks.current.tasks.length).toBe(taskCount);
      expect(logs.current.logs.length).toBe(0);
      
      // Each store has its own independent API
      expect(typeof thoughts.current.add).toBe('function');
      expect(typeof tasks.current.add).toBe('function');
      expect(typeof logs.current.addLog).toBe('function');
    });
  });
});
