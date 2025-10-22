import { useTasks } from '@/store/useTasks';
import { useThoughts } from '@/store/useThoughts';
import { useProcessQueue, ProcessAction, ProcessQueueItem } from '@/store/useProcessQueue';
import { useRequestLog } from '@/store/useRequestLog';

export class ActionExecutor {
  private addToLog: (log: any) => void;

  constructor() {
    // We'll initialize this in the component that uses it
    this.addToLog = () => {};
  }

  setLogger(logFn: (log: any) => void) {
    this.addToLog = logFn;
  }

  async executeAction(
    action: ProcessAction,
    queueItem: ProcessQueueItem
  ): Promise<{ success: boolean; error?: string }> {
    this.log('Executing action', { action: action.type, thoughtId: action.thoughtId });

    try {
      const { useTasks } = await import('@/store/useTasks');
      const { useThoughts } = await import('@/store/useThoughts');

      switch (action.type) {
        case 'createTask':
          await this.createTask(action, queueItem);
          break;

        case 'addTag':
          await this.addTag(action, queueItem);
          break;

        case 'enhanceThought':
          await this.enhanceThought(action, queueItem);
          break;

        case 'changeType':
          await this.changeType(action, queueItem);
          break;

        case 'setIntensity':
          await this.setIntensity(action, queueItem);
          break;

        case 'createMoodEntry':
          await this.createMoodEntry(action, queueItem);
          break;

        case 'createProject':
          await this.createProject(action, queueItem);
          break;

        case 'linkToProject':
          await this.linkToProject(action, queueItem);
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      this.log('Action executed successfully', { action: action.type });
      return { success: true };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.log('Action execution failed', { action: action.type, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  private async createTask(action: ProcessAction, queueItem: ProcessQueueItem) {
    const { useTasks } = await import('@/store/useTasks');
    const addTask = useTasks.getState().add;

    const metadata = {
      sourceThoughtId: action.thoughtId,
      createdBy: 'thought-processor',
      processQueueId: queueItem.id,
      aiReasoning: action.aiReasoning,
      processedAt: new Date().toISOString(),
    };

    // Build recurrence config if provided
    let recurrence = undefined;
    if (action.data.recurrence && action.data.recurrence.type !== 'none') {
      recurrence = {
        type: action.data.recurrence.type,
        frequency: action.data.recurrence.frequency || 1
      };
      
      // Add recurrence reasoning to metadata
      if (action.data.recurrence.reasoning) {
        metadata.aiReasoning = `${metadata.aiReasoning}\nRecurrence: ${action.data.recurrence.reasoning}`;
      }
    }

    const taskId = await addTask({
      title: action.data.title,
      category: action.data.category || 'mastery',
      estimatedMinutes: action.data.estimatedTime || 30,
      priority: action.data.priority || 'medium',
      status: 'active',
      recurrence,
      notes: JSON.stringify(metadata), // Store metadata in notes field
    });

    // Track for revert
    if (!action.createdItems) {
      action.createdItems = { taskIds: [], noteIds: [] };
    }
    action.createdItems.taskIds = [taskId];
    queueItem.revertData.createdItems.taskIds.push(taskId);

    this.log('Task created', { 
      taskId, 
      title: action.data.title, 
      recurrence: recurrence ? recurrence.type : 'none' 
    });
  }

  private async addTag(action: ProcessAction, queueItem: ProcessQueueItem) {
    const { useThoughts } = await import('@/store/useThoughts');
    const thoughts = useThoughts.getState().thoughts;
    const updateThought = useThoughts.getState().updateThought;

    const thought = thoughts.find(t => t.id === action.thoughtId);
    if (!thought) {
      throw new Error('Thought not found');
    }

    const currentTags = thought.tags || [];
    const newTag = action.data.tag;

    if (!currentTags.includes(newTag)) {
      updateThought(action.thoughtId, {
        tags: [...currentTags, newTag]
      });

      // Track for revert
      queueItem.revertData.addedTags.push(newTag);
      this.log('Tag added', { tag: newTag });
    }
  }

  private async enhanceThought(action: ProcessAction, queueItem: ProcessQueueItem) {
    const { useThoughts } = await import('@/store/useThoughts');
    const thoughts = useThoughts.getState().thoughts;
    const updateThought = useThoughts.getState().updateThought;

    const thought = thoughts.find(t => t.id === action.thoughtId);
    if (!thought) {
      throw new Error('Thought not found');
    }

    // Save original for revert
    if (!queueItem.revertData.thoughtChanges.textChanged) {
      queueItem.revertData.thoughtChanges.textChanged = true;
      queueItem.revertData.thoughtChanges.originalText = thought.text;
    }

    // Store enhancement metadata in notes
    const enhancementMeta = {
      enhanced: true,
      originalText: thought.text,
      enhancedAt: new Date().toISOString(),
      enhancementReason: action.data.changes
    };

    const existingNotes = thought.notes ? `${thought.notes}\n\n[Enhancement: ${action.data.changes}]` : `[Enhancement: ${action.data.changes}]`;

    updateThought(action.thoughtId, {
      text: action.data.improvedText,
      notes: existingNotes
    });

    this.log('Thought enhanced', { changes: action.data.changes });
  }

  private async changeType(action: ProcessAction, queueItem: ProcessQueueItem) {
    const { useThoughts } = await import('@/store/useThoughts');
    const thoughts = useThoughts.getState().thoughts;
    const updateThought = useThoughts.getState().updateThought;

    const thought = thoughts.find(t => t.id === action.thoughtId);
    if (!thought) {
      throw new Error('Thought not found');
    }

    // Save original for revert
    if (!queueItem.revertData.thoughtChanges.typeChanged) {
      queueItem.revertData.thoughtChanges.typeChanged = true;
      queueItem.revertData.thoughtChanges.originalType = thought.type;
    }

    updateThought(action.thoughtId, {
      type: action.data.type
    });

    this.log('Thought type changed', { from: thought.type, to: action.data.type });
  }

  private async setIntensity(action: ProcessAction, queueItem: ProcessQueueItem) {
    const { useThoughts } = await import('@/store/useThoughts');
    const thoughts = useThoughts.getState().thoughts;
    const updateThought = useThoughts.getState().updateThought;

    const thought = thoughts.find(t => t.id === action.thoughtId);
    if (!thought) {
      throw new Error('Thought not found');
    }

    // Save original for revert
    if (!queueItem.revertData.thoughtChanges.intensityChanged) {
      queueItem.revertData.thoughtChanges.intensityChanged = true;
      queueItem.revertData.thoughtChanges.originalIntensity = thought.intensity;
    }

    updateThought(action.thoughtId, {
      intensity: action.data.intensity
    });

    this.log('Intensity set', { intensity: action.data.intensity });
  }

  private async createMoodEntry(action: ProcessAction, queueItem: ProcessQueueItem) {
    const { useThoughts } = await import('@/store/useThoughts');
    const { useMoods } = await import('@/store/useMoods');
    const updateThought = useThoughts.getState().updateThought;
    const addMood = useMoods.getState().add;
    const thought = useThoughts.getState().thoughts.find(t => t.id === action.thoughtId);
    
    if (!thought) {
      throw new Error('Thought not found');
    }

    // Determine feeling type based on mood data
    const moodText = action.data.mood.toLowerCase();
    let feelingType: 'feeling-good' | 'feeling-bad' | 'neutral' = 'neutral';
    
    // Positive moods
    if (moodText.match(/(happy|joy|excited|amazing|great|wonderful|love|content)/i)) {
      feelingType = 'feeling-good';
    }
    // Negative moods
    else if (moodText.match(/(sad|depressed|anxious|stressed|frustrated|angry|worried|down|terrible|awful)/i)) {
      feelingType = 'feeling-bad';
    }

    // Save original for revert
    if (!queueItem.revertData.thoughtChanges.typeChanged) {
      queueItem.revertData.thoughtChanges.typeChanged = true;
      queueItem.revertData.thoughtChanges.originalType = thought.type;
    }
    if (!queueItem.revertData.thoughtChanges.intensityChanged) {
      queueItem.revertData.thoughtChanges.intensityChanged = true;
      queueItem.revertData.thoughtChanges.originalIntensity = thought.intensity;
    }

    // Update thought to be a mood entry
    updateThought(action.thoughtId, {
      type: feelingType,
      intensity: action.data.intensity,
      tags: [...(thought.tags || []), 'mood']
    });

    // Track tag for revert
    queueItem.revertData.addedTags.push('mood');

    // Create mood tracker entry
    await addMood({
      value: Math.round(action.data.intensity / 10), // Convert 0-100 to 1-10
      note: action.data.notes || `${action.data.mood} (from thought)`,
      metadata: {
        sourceThoughtId: action.thoughtId,
        createdBy: 'thought-processor',
      }
    });

    this.log('Mood entry created', { 
      mood: action.data.mood, 
      intensity: action.data.intensity,
      type: feelingType
    });
  }

  private async createProject(action: ProcessAction, queueItem: ProcessQueueItem) {
    const { useProjects } = await import('@/store/useProjects');
    const { useThoughts } = await import('@/store/useThoughts');
    const addProject = useProjects.getState().add;
    const linkThought = useProjects.getState().linkThought;

    const metadata = {
      sourceThoughtId: action.thoughtId,
      createdBy: 'thought-processor',
      processQueueId: queueItem.id,
      aiReasoning: action.aiReasoning,
      processedAt: new Date().toISOString(),
    };

    // Create the project
    const projectId = await addProject({
      title: action.data.title,
      objective: action.data.objective || action.data.description || 'AI-suggested project',
      actionPlan: action.data.actionPlan || [],
      description: action.data.description || undefined,
      timeframe: action.data.timeframe || 'long-term',
      category: action.data.category || 'mastery',
      priority: action.data.priority || 'medium',
      status: 'active',
      targetDate: action.data.targetDate || undefined,
      progress: 0,
      notes: JSON.stringify(metadata),
      source: 'ai',
    });

    // Link the originating thought to the project
    linkThought(projectId, action.thoughtId);

    // Track for revert
    if (!action.createdItems) {
      action.createdItems = { taskIds: [], noteIds: [], projectIds: [] };
    }
    action.createdItems.projectIds = [projectId];
    queueItem.revertData.createdItems.projectIds.push(projectId);

    this.log('Project created', { 
      projectId, 
      title: action.data.title,
      timeframe: action.data.timeframe
    });
  }

  private async linkToProject(action: ProcessAction, queueItem: ProcessQueueItem) {
    const { useProjects } = await import('@/store/useProjects');
    const projects = useProjects.getState().projects;
    const linkThought = useProjects.getState().linkThought;

    // Find project by title (case-insensitive)
    const project = projects.find(p => 
      p.title.toLowerCase() === action.data.projectTitle.toLowerCase() ||
      p.title.toLowerCase().includes(action.data.projectTitle.toLowerCase())
    );

    if (!project) {
      throw new Error(`Project "${action.data.projectTitle}" not found`);
    }

    // Link thought to project
    linkThought(project.id, action.thoughtId);

    this.log('Thought linked to project', { 
      projectId: project.id,
      projectTitle: project.title,
      thoughtId: action.thoughtId
    });
  }

  async revertProcessing(queueItemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { useProcessQueue } = await import('@/store/useProcessQueue');
      const { useTasks } = await import('@/store/useTasks');
      const { useThoughts } = await import('@/store/useThoughts');

      const queueItem = useProcessQueue.getState().getQueueItem(queueItemId);
      if (!queueItem) {
        throw new Error('Queue item not found');
      }

      if (!queueItem.revertible) {
        throw new Error('Processing cannot be reverted');
      }

      this.log('Starting revert', { queueItemId });

      // 1. Delete created tasks
      const deleteTask = useTasks.getState().deleteTask;
      for (const taskId of queueItem.revertData.createdItems.taskIds) {
        await deleteTask(taskId);
        this.log('Deleted task', { taskId });
      }

      // 2. Delete created projects
      const { useProjects } = await import('@/store/useProjects');
      const deleteProject = useProjects.getState().delete;
      for (const projectId of queueItem.revertData.createdItems.projectIds) {
        await deleteProject(projectId);
        this.log('Deleted project', { projectId });
      }

      // 2. Restore thought
      const thoughts = useThoughts.getState().thoughts;
      const updateThought = useThoughts.getState().updateThought;
      const thought = thoughts.find(t => t.id === queueItem.thoughtId);

      if (thought) {
        const updates: any = {};

        // Remove added tags (including 'processed')
        const updatedTags = (thought.tags || []).filter(
          tag => !queueItem.revertData.addedTags.includes(tag) && tag !== 'processed'
        );
        updates.tags = updatedTags;

        // Restore original text if changed
        if (queueItem.revertData.thoughtChanges.textChanged) {
          updates.text = queueItem.revertData.thoughtChanges.originalText;
        }

        // Restore original type if changed
        if (queueItem.revertData.thoughtChanges.typeChanged) {
          updates.type = queueItem.revertData.thoughtChanges.originalType;
        }

        // Restore original intensity if changed
        if (queueItem.revertData.thoughtChanges.intensityChanged) {
          updates.intensity = queueItem.revertData.thoughtChanges.originalIntensity;
        }

        // Add revert note
        const revertNote = `[Reverted: ${new Date().toISOString()}]`;
        updates.notes = thought.notes ? `${thought.notes}\n\n${revertNote}` : revertNote;

        await updateThought(queueItem.thoughtId, updates);
        this.log('Thought restored', { thoughtId: queueItem.thoughtId });
      }

      // 3. Update queue item status
      useProcessQueue.getState().updateQueueItem(queueItemId, {
        status: 'reverted',
        revertedAt: new Date().toISOString()
      });

      this.log('Revert completed', { queueItemId });
      return { success: true };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.log('Revert failed', { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  private log(message: string, data?: any) {
    console.log(`[ActionExecutor] ${message}`, data || '');
    this.addToLog({
      type: 'api',
      method: 'ThoughtProcessor',
      url: message,
      request: data,
      timestamp: new Date().toISOString()
    });
  }
}

// Singleton instance
export const actionExecutor = new ActionExecutor();
