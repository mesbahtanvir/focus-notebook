import { useThoughts, Thought } from '@/store/useThoughts';
import { useProcessQueue } from '@/store/useProcessQueue';
import { useSettings } from '@/store/useSettings';
import { useRequestLog } from '@/store/useRequestLog';
import { useFriends } from '@/store/useFriends';
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
            projectIds: [],
            moodIds: []
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

      // Get friends list for person name detection
      const friends = useFriends.getState().friends;
      const personNames = friends.map(f => f.name);

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
          model: settings.aiModel || 'gpt-3.5-turbo',
          toolDescriptions,
          personNames
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
      const actionIds: string[] = [];
      for (const actionData of actions) {
        const actionId = addAction(queueId, {
          type: actionData.type,
          thoughtId: thought.id,
          data: actionData.data,
          status: 'pending',
          aiReasoning: actionData.reasoning
        });
        actionIds.push(actionId);
      }

      // Check confidence level for auto-approval
      const confidence = result.confidence || 0;
      const HIGH_CONFIDENCE_THRESHOLD = 0.98; // 98% or higher

      if (confidence >= HIGH_CONFIDENCE_THRESHOLD && actions.length > 0) {
        // High confidence: auto-approve and execute
        console.log(`✨ High confidence (${(confidence * 100).toFixed(1)}%) - Auto-approving actions`);

        // Import approval handler dynamically to avoid circular dependencies
        const { approvalHandler } = await import('./approvalHandler');

        // Execute all actions automatically
        const executionResult = await approvalHandler.approveAndExecute(queueId, actionIds);

        if (executionResult.success) {
          console.log(`✅ Auto-executed ${executionResult.executed} actions`);
        } else {
          console.error(`❌ Auto-execution failed:`, executionResult.error);
        }
      } else {
        // Lower confidence: request user approval
        console.log(`⚠️  Lower confidence (${(confidence * 100).toFixed(1)}%) - Awaiting user approval`);
        updateQueueItem(queueId, {
          status: 'awaiting-approval'
        });
      }

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
