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

    // Filter actions by confidence
    const autoApplyActions = actions.filter(a => a.confidence >= 99);
    const suggestionActions = actions.filter(a => a.confidence >= 70 && a.confidence < 99);
    const ignoredActions = actions.filter(a => a.confidence < 70);

    console.log(`Processing ${actions.length} actions: ${autoApplyActions.length} auto-apply, ${suggestionActions.length} suggestions, ${ignoredActions.length} ignored`);

    // Execute high-confidence actions immediately
    for (const action of autoApplyActions) {
      try {
        switch (action.type) {
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

          case 'createTask':
            // Create new task
            const addTask = useTasks.getState().add;
            await addTask({
              title: action.data.title,
              category: action.data.category,
              priority: action.data.priority || 'medium',
              status: 'active',
              focusEligible: true,
              thoughtId,
              createdBy: 'ai',
            });
            break;

          case 'enhanceTask':
            // Update existing task
            const updateTask = useTasks.getState().updateTask;
            await updateTask(action.data.taskId, action.data.updates);
            break;

          case 'createMood':
          case 'createMoodEntry':
            // Create mood entry
            const addMood = useMoods.getState().add;
            await addMood({
              value: action.data.value,
              note: action.data.note,
              metadata: { sourceThoughtId: thoughtId },
            });
            break;

          case 'createProject':
            // Create new project
            const addProject = useProjects.getState().add;
            await addProject({
              title: action.data.title,
              description: action.data.description,
              source: 'ai',
              objective: action.data.objective || '',
              actionPlan: action.data.actionPlan || [],
              timeframe: action.data.timeframe || 'short-term',
              status: 'active',
              priority: action.data.priority || 'medium',
              category: action.data.category || 'mastery',
            });
            break;

          case 'createGoal':
            // Create new goal
            const addGoal = useGoals.getState().add;
            await addGoal({
              title: action.data.title,
              objective: action.data.objective,
              source: 'ai',
              timeframe: action.data.timeframe || 'short-term',
              status: 'active',
              priority: action.data.priority || 'medium',
            });
            break;

          case 'linkToProject':
            // Link thought to project
            const currentThoughtForLink = useThoughts.getState().thoughts.find(t => t.id === thoughtId);
            if (currentThoughtForLink) {
              const currentLinkedProjects = currentThoughtForLink.linkedProjectIds || [];
              if (!currentLinkedProjects.includes(action.data.projectId)) {
                await updateThought(thoughtId, {
                  linkedProjectIds: [...currentLinkedProjects, action.data.projectId],
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
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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
