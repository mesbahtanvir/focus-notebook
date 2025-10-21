import { useProcessQueue } from '@/store/useProcessQueue';
import { useTasks } from '@/store/useTasks';
import { useThoughts } from '@/store/useThoughts';

export class CascadingDelete {
  async deleteThoughtWithRelated(thoughtId: string): Promise<{
    success: boolean;
    deleted: {
      tasks: number;
      notes: number;
      thoughts: number;
    };
    error?: string;
  }> {
    try {
      const queue = useProcessQueue.getState().queue;
      const deleteTask = useTasks.getState().deleteTask;
      const deleteThought = useThoughts.getState().deleteThought;
      
      const results = {
        tasks: 0,
        notes: 0,
        thoughts: 0
      };

      // Find all queue items for this thought
      const relatedQueueItems = queue.filter(q => 
        q.thoughtId === thoughtId && 
        (q.status === 'completed' || q.status === 'processing')
      );

      // Delete all related tasks
      const allTaskIds = new Set<string>();
      for (const queueItem of relatedQueueItems) {
        // Tasks from revert data
        if (queueItem.revertData?.createdItems?.taskIds) {
          queueItem.revertData.createdItems.taskIds.forEach(id => allTaskIds.add(id));
        }
        
        // Tasks from executed actions
        for (const action of queueItem.actions) {
          if (action.status === 'executed' && action.createdItems?.taskIds) {
            action.createdItems.taskIds.forEach(id => allTaskIds.add(id));
          }
        }
      }

      // Delete each task
      for (const taskId of allTaskIds) {
        try {
          await deleteTask(taskId);
          results.tasks++;
        } catch (error) {
          console.error(`Failed to delete task ${taskId}:`, error);
        }
      }

      // TODO: Delete related notes/documents when those features are added
      // For now, we only track tasks

      // Finally, delete the thought itself
      await deleteThought(thoughtId);
      results.thoughts = 1;

      console.log(`🗑️ Cascading delete completed:`, results);

      return {
        success: true,
        deleted: results
      };

    } catch (error) {
      console.error('💥 Cascading delete failed:', error);
      return {
        success: false,
        deleted: { tasks: 0, notes: 0, thoughts: 0 },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const cascadingDelete = new CascadingDelete();
