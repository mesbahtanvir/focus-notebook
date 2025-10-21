import { useProcessQueue } from '@/store/useProcessQueue';
import { useThoughts } from '@/store/useThoughts';
import { actionExecutor } from './actionExecutor';

export class ApprovalHandler {
  async approveAndExecute(
    queueItemId: string,
    approvedActionIds: string[]
  ): Promise<{ success: boolean; executed: number; failed: number; error?: string }> {
    const { getQueueItem, updateQueueItem, updateAction } = useProcessQueue.getState();
    const { updateThought } = useThoughts.getState();
    
    const queueItem = getQueueItem(queueItemId);
    if (!queueItem) {
      return { success: false, executed: 0, failed: 0, error: 'Queue item not found' };
    }

    const thought = useThoughts.getState().thoughts.find(t => t.id === queueItem.thoughtId);
    if (!thought) {
      return { success: false, executed: 0, failed: 0, error: 'Thought not found' };
    }

    // Update status to processing
    updateQueueItem(queueItemId, {
      status: 'processing',
      approvedActions: approvedActionIds
    });

    let executed = 0;
    let failed = 0;

    // Execute only approved actions
    for (const action of queueItem.actions) {
      if (!approvedActionIds.includes(action.id)) {
        // Mark as skipped
        updateAction(queueItemId, action.id, {
          status: 'failed',
          error: 'Not approved by user'
        });
        continue;
      }

      const executionResult = await actionExecutor.executeAction(action, queueItem);
      
      if (executionResult.success) {
        updateAction(queueItemId, action.id, {
          status: 'executed'
        });
        updateQueueItem(queueItemId, {
          executedActions: [...queueItem.executedActions, action.id]
        });
        executed++;
      } else {
        updateAction(queueItemId, action.id, {
          status: 'failed',
          error: executionResult.error
        });
        failed++;
      }
    }

    // Mark thought as processed
    const processingNote = `[Processed: ${new Date().toISOString()} - Approved ${executed} actions - Queue: ${queueItemId}]`;
    const existingNotes = thought.notes || '';
    
    updateThought(thought.id, {
      tags: [...(thought.tags || []), 'processed'],
      notes: existingNotes ? `${existingNotes}\n\n${processingNote}` : processingNote
    });

    // Mark queue item as completed
    updateQueueItem(queueItemId, {
      status: 'completed',
      completedAt: new Date().toISOString()
    });

    return { success: true, executed, failed };
  }

  async rejectProcessing(queueItemId: string): Promise<{ success: boolean; error?: string }> {
    const { getQueueItem, updateQueueItem } = useProcessQueue.getState();
    
    const queueItem = getQueueItem(queueItemId);
    if (!queueItem) {
      return { success: false, error: 'Queue item not found' };
    }

    // Mark as cancelled
    updateQueueItem(queueItemId, {
      status: 'cancelled'
    });

    return { success: true };
  }
}

export const approvalHandler = new ApprovalHandler();
