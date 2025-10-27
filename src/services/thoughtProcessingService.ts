import { useThoughts, AISuggestion } from '@/store/useThoughts';
import { useTasks } from '@/store/useTasks';
import { useProjects } from '@/store/useProjects';
import { useGoals } from '@/store/useGoals';
import { useMoods } from '@/store/useMoods';
import { useRelationships } from '@/store/useRelationships';
import { useLLMQueue } from '@/store/useLLMQueue';
import { useSettings } from '@/store/useSettings';

export interface ThoughtProcessingResult {
  success: boolean;
  error?: string;
  actions?: Array<{
    type: string;
    data: any;
    reasoning: string;
  }>;
}

export class ThoughtProcessingService {
  static async processThought(thoughtId: string): Promise<ThoughtProcessingResult> {
    const thought = useThoughts.getState().thoughts.find(t => t.id === thoughtId);
    if (!thought) {
      return { success: false, error: 'Thought not found' };
    }

    const hasApiKey = useSettings.getState().hasApiKey();
    if (!hasApiKey) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    // Check if already processed
    if (thought.tags?.includes('processed')) {
      return { success: false, error: 'Thought already processed' };
    }

    try {
      // Get comprehensive context (excluding thoughts as per requirements)
      const context = {
        goals: useGoals.getState().goals,
        projects: useProjects.getState().projects,
        tasks: useTasks.getState().tasks.filter(t => !t.done), // Active tasks only
        moods: useMoods.getState().moods.slice(0, 10),
        relationships: useRelationships.getState().people,
        // Notes and errands would be added here if stores exist
      };

      // Add to LLM queue
      const requestId = useLLMQueue.getState().addRequest({
        type: 'thought-processing',
        input: {
          thoughtId: thought.id,
          text: thought.text,
          context,
        },
      });

      // Wait for processing to complete
      return new Promise((resolve) => {
        const checkStatus = () => {
          const request = useLLMQueue.getState().getRequest(requestId);
          if (!request) {
            resolve({ success: false, error: 'Request not found' });
            return;
          }

          if (request.status === 'completed') {
            // Execute actions with confidence-based filtering
            const actions = request.output?.result?.actions || [];
            ThoughtProcessingService.executeActions(thoughtId, actions);
            resolve({ success: true, actions });
          } else if (request.status === 'failed') {
            resolve({ success: false, error: request.error });
          } else {
            // Still processing, check again in 1 second
            setTimeout(checkStatus, 1000);
          }
        };
        checkStatus();
      });

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async executeActions(thoughtId: string, actions: Array<{ type: string; data: any; reasoning: string; confidence: number }>) {
    const updateThought = useThoughts.getState().updateThought;
    const addTask = useTasks.getState().add;
    const addProject = useProjects.getState().add;
    const addGoal = useGoals.getState().add;
    const addMood = useMoods.getState().add;

    // Filter actions by confidence
    const autoApplyActions = actions.filter(a => a.confidence >= 99);
    const suggestionActions = actions.filter(a => a.confidence >= 70 && a.confidence < 99);
    const ignoredActions = actions.filter(a => a.confidence < 70);

    console.log(`Processing ${actions.length} actions: ${autoApplyActions.length} auto-apply, ${suggestionActions.length} suggestions, ${ignoredActions.length} ignored`);

    // Execute high-confidence actions immediately
    for (const action of autoApplyActions) {
      try {
        switch (action.type) {
          case 'createTask':
            await addTask({
              title: action.data.title,
              category: action.data.category,
              priority: action.data.priority,
              status: 'active',
              focusEligible: true,
            });
            break;

          case 'createProject':
            await addProject({
              title: action.data.title,
              description: action.data.description,
              objective: action.data.objective || action.data.description || 'Generated from thought',
              actionPlan: action.data.actionPlan || ['Review and plan next steps'],
              timeframe: action.data.timeframe,
              category: action.data.category,
              status: 'active',
              priority: 'medium',
              targetDate: action.data.targetDate,
            });
            break;

          case 'createGoal':
            await addGoal({
              title: action.data.title,
              objective: action.data.objective || action.data.description || 'Generated from thought',
              timeframe: action.data.timeframe || 'short-term',
              status: 'active',
              priority: 'medium',
              targetDate: action.data.targetDate,
            });
            break;

          case 'createMoodEntry':
          case 'createMood':
            await addMood({
              value: action.data.value || action.data.intensity || 5,
              note: action.data.note || action.data.notes || action.data.mood,
            });
            break;

          case 'addTag':
            // Add tag to thought
            const currentThought = useThoughts.getState().thoughts.find(t => t.id === thoughtId);
            if (currentThought) {
              const currentTags = currentThought.tags || [];
              if (!currentTags.includes(action.data.tag)) {
                await updateThought(thoughtId, {
                  tags: [...currentTags, action.data.tag],
                });
              }
            }
            break;

          case 'enhanceThought':
            // Update thought text
            await updateThought(thoughtId, {
              text: action.data.improvedText,
            });
            break;

          case 'enhanceTask':
            // Enhance existing task with new information
            const { updateTask } = useTasks.getState();
            if (action.data.taskId && action.data.updates) {
              await updateTask(action.data.taskId, action.data.updates);
            }
            break;

          case 'linkToProject':
            // Add project link to thought
            const thought = useThoughts.getState().thoughts.find(t => t.id === thoughtId);
            if (thought) {
              const currentTags = thought.tags || [];
              const projectTag = `project:${action.data.projectId}`;
              if (!currentTags.includes(projectTag)) {
                await updateThought(thoughtId, {
                  tags: [...currentTags, projectTag],
                });
              }
            }
            break;

          default:
            console.warn(`Unknown action type: ${action.type}`);
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }

    // Save medium-confidence actions as suggestions
    if (suggestionActions.length > 0) {
      const suggestions: AISuggestion[] = suggestionActions.map(action => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: action.type as any,
        confidence: action.confidence,
        data: action.data,
        reasoning: action.reasoning,
        createdAt: new Date().toISOString(),
        status: 'pending',
      }));

      await updateThought(thoughtId, { aiSuggestions: suggestions });
    }

    // Mark thought as processed
    const thought = useThoughts.getState().thoughts.find(t => t.id === thoughtId);
    if (thought) {
      const currentTags = thought.tags || [];
      if (!currentTags.includes('processed')) {
        await updateThought(thoughtId, {
          tags: [...currentTags, 'processed'],
        });
      }
    }

    // Log ignored actions for debugging
    console.log(`Ignored ${ignoredActions.length} low-confidence actions`);
  }

  static async applySuggestion(thoughtId: string, suggestionId: string) {
    const thought = useThoughts.getState().thoughts.find(t => t.id === thoughtId);
    if (!thought || !thought.aiSuggestions) return;

    const suggestion = thought.aiSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    // Execute the suggestion as a high-confidence action (99) to ensure it's auto-applied
    await this.executeActions(thoughtId, [
      {
        type: suggestion.type,
        data: suggestion.data,
        reasoning: suggestion.reasoning,
        confidence: 99, // Force high confidence to ensure auto-apply
      },
    ]);

    // Update suggestion status
    const updatedSuggestions = thought.aiSuggestions.map(s =>
      s.id === suggestionId ? { ...s, status: 'accepted' as const } : s
    );

    await useThoughts.getState().updateThought(thoughtId, { aiSuggestions: updatedSuggestions });
  }

  static async rejectSuggestion(thoughtId: string, suggestionId: string) {
    const thought = useThoughts.getState().thoughts.find(t => t.id === thoughtId);
    if (!thought || !thought.aiSuggestions) return;

    // Update suggestion status to rejected
    const updatedSuggestions = thought.aiSuggestions.map(s =>
      s.id === suggestionId ? { ...s, status: 'rejected' as const } : s
    );

    await useThoughts.getState().updateThought(thoughtId, { aiSuggestions: updatedSuggestions });
  }

  static async processMultipleThoughts(thoughtIds: string[]): Promise<ThoughtProcessingResult[]> {
    const results: ThoughtProcessingResult[] = [];
    
    for (const thoughtId of thoughtIds) {
      const result = await ThoughtProcessingService.processThought(thoughtId);
      results.push(result);
      
      // Small delay between requests to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }
}
