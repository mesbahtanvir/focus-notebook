import { useThoughts, Thought } from '@/store/useThoughts';
import { useProcessQueue } from '@/store/useProcessQueue';
import { useSettings } from '@/store/useSettings';
import { useRequestLog } from '@/store/useRequestLog';
import { ToolRegistry } from './toolRegistry';
import { actionExecutor } from './actionExecutor';

export class ManualProcessor {
  async processThought(thoughtId: string): Promise<{ success: boolean; error?: string }> {
    const thoughts = useThoughts.getState().thoughts;
    const thought = thoughts.find(t => t.id === thoughtId);
    
    if (!thought) {
      return { success: false, error: 'Thought not found' };
    }

    const hasApiKey = useSettings.getState().hasApiKey();
    if (!hasApiKey) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    const settings = useSettings.getState().settings;
    const addToQueue = useProcessQueue.getState().addToQueue;
    const updateQueueItem = useProcessQueue.getState().updateQueueItem;
    const addAction = useProcessQueue.getState().addAction;
    const updateAction = useProcessQueue.getState().updateAction;
    const getQueueItem = useProcessQueue.getState().getQueueItem;
    const updateThought = useThoughts.getState().updateThought;
    const addToLog = useRequestLog.getState().addToQueue;

    // Add to request log
    const requestId = addToLog({
      type: 'api',
      method: 'POST /api/process-thought',
      url: 'Manual Thought Processing',
      request: {
        thoughtId: thought.id,
        thoughtText: thought.text
      }
    });

    try {
      // Create queue item
      const queueId = addToQueue({
        thoughtId: thought.id,
        mode: 'manual',
        status: 'pending',
        actions: [],
        approvedActions: [],
        executedActions: [],
        revertible: true,
        revertData: {
          originalThought: {
            text: thought.text,
            tags: thought.tags || []
          },
          createdItems: {
            taskIds: [],
            noteIds: [],
            projectIds: []
          },
          thoughtChanges: {
            textChanged: false,
            typeChanged: false
          },
          addedTags: [],
          canRevert: true
        }
      });

      // Update status to processing
      updateQueueItem(queueId, { status: 'processing' });

      // Get tool descriptions
      const toolDescriptions = ToolRegistry.getToolDescriptions();

      // Call API to analyze thought
      const response = await fetch('/api/process-thought', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thought: {
            id: thought.id,
            text: thought.text,
            tags: thought.tags,
            createdAt: thought.createdAt
          },
          apiKey: settings.openaiApiKey,
          toolDescriptions
        })
      });

      const data = await response.json();

      if (data.error) {
        console.error('❌ Processing error:', data.error);
        updateQueueItem(queueId, {
          status: 'failed',
          error: data.error
        });
        const updateRequestStatus = useRequestLog.getState().updateRequestStatus;
        updateRequestStatus(requestId, 'failed', {
          error: data.error,
          status: 0
        });
        return { success: false, error: data.error };
      }

      const result = data.result;

      // Store AI response
      updateQueueItem(queueId, { aiResponse: result });

      // Process actions
      const actions = result.actions || [];
      
      // Add thought enhancement if suggested
      if (result.thoughtEnhancement?.shouldApply) {
        actions.unshift({
          type: 'enhanceThought',
          tool: 'system',
          data: {
            improvedText: result.thoughtEnhancement.improvedText,
            changes: result.thoughtEnhancement.changes
          },
          reasoning: result.thoughtEnhancement.changes
        });
      }

      // Create action objects
      for (const actionData of actions) {
        addAction(queueId, {
          type: actionData.type,
          thoughtId: thought.id,
          data: actionData.data,
          status: 'pending',
          aiReasoning: actionData.reasoning
        });
      }

      // Set status to awaiting approval (Safe Mode)
      updateQueueItem(queueId, {
        status: 'awaiting-approval'
      });

      // Update request log
      const updateRequestStatus = useRequestLog.getState().updateRequestStatus;
      updateRequestStatus(requestId, 'completed', {
        response: {
          actions: actions.length,
          tools: result.suggestedTools
        },
        status: 200
      });

      return { success: true };

    } catch (error) {
      console.error('💥 Processing error:', error);
      const updateRequestStatus = useRequestLog.getState().updateRequestStatus;
      updateRequestStatus(requestId, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 0
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async processMultiple(thoughtIds: string[]): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ thoughtId: string; error: string }>;
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ thoughtId: string; error: string }>
    };

    for (const thoughtId of thoughtIds) {
      const result = await this.processThought(thoughtId);
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push({ thoughtId, error: result.error || 'Unknown error' });
      }
      
      // Small delay between processing to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }
}

export const manualProcessor = new ManualProcessor();
