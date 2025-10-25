import { useProcessQueue } from '@/store/useProcessQueue';
import { useThoughts } from '@/store/useThoughts';
import { actionExecutor } from './actionExecutor';

export class ApprovalHandler {
  // Track in-progress queue items to prevent duplicate execution
  private static executingQueueItems = new Set<string>();

  async approveAndExecute(
    queueItemId: string,
    approvedActionIds: string[]
  ): Promise<{ success: boolean; executed: number; failed: number; error?: string }> {
    const { getQueueItem, updateQueueItem, updateAction } = useProcessQueue.getState();
    const { updateThought } = useThoughts.getState();

    // IDEMPOTENCY CHECK 1: Prevent concurrent execution of same queue item
    if (ApprovalHandler.executingQueueItems.has(queueItemId)) {
      console.warn(`[ApprovalHandler] Queue item ${queueItemId} is already being executed. Skipping.`);
      return { success: false, executed: 0, failed: 0, error: 'Already executing' };
    }

    const queueItem = getQueueItem(queueItemId);
    if (!queueItem) {
      return { success: false, executed: 0, failed: 0, error: 'Queue item not found' };
    }

    // IDEMPOTENCY CHECK 2: Don't re-execute completed or processing items
    if (queueItem.status === 'completed') {
      console.warn(`[ApprovalHandler] Queue item ${queueItemId} already completed. Skipping.`);
      return { success: false, executed: 0, failed: 0, error: 'Already completed' };
    }

    if (queueItem.status === 'processing') {
      console.warn(`[ApprovalHandler] Queue item ${queueItemId} already processing. Skipping.`);
      return { success: false, executed: 0, failed: 0, error: 'Already processing' };
    }

    const thought = useThoughts.getState().thoughts.find(t => t.id === queueItem.thoughtId);
    if (!thought) {
      return { success: false, executed: 0, failed: 0, error: 'Thought not found' };
    }

    // IDEMPOTENCY CHECK 3: Don't re-process thoughts with 'processed' tag
    if (thought.tags?.includes('processed')) {
      console.warn(`[ApprovalHandler] Thought ${queueItem.thoughtId} already processed. Skipping.`);
      return { success: false, executed: 0, failed: 0, error: 'Thought already processed' };
    }

    // Mark as executing
    ApprovalHandler.executingQueueItems.add(queueItemId);

    try {
      // Update status to processing
      updateQueueItem(queueItemId, {
        status: 'processing',
        approvedActions: approvedActionIds
      });

      let executed = 0;
      let failed = 0;

      // Execute only approved actions
      for (const action of queueItem.actions) {
        // Get fresh queue item state to check executedActions
        const freshQueueItem = getQueueItem(queueItemId);
        if (!freshQueueItem) break;

        // IDEMPOTENCY CHECK 4: Skip already-executed actions
        if (freshQueueItem.executedActions.includes(action.id)) {
          console.log(`[ApprovalHandler] Action ${action.id} already executed. Skipping.`);
          continue;
        }

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

          // Get fresh state again before updating executedActions
          const currentQueueItem = getQueueItem(queueItemId);
          if (currentQueueItem) {
            updateQueueItem(queueItemId, {
              executedActions: [...currentQueueItem.executedActions, action.id]
            });
          }
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
    } finally {
      // Always remove from executing set
      ApprovalHandler.executingQueueItems.delete(queueItemId);
    }
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
