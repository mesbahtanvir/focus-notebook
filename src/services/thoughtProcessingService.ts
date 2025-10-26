import { useThoughts } from '@/store/useThoughts';
import { useTasks } from '@/store/useTasks';
import { useProjects } from '@/store/useProjects';
import { useGoals } from '@/store/useGoals';
import { useMoods } from '@/store/useMoods';
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
      // Add to LLM queue
      const requestId = useLLMQueue.getState().addRequest({
        type: 'thought-processing',
        input: {
          thoughtId: thought.id,
          text: thought.text,
          context: {
            goals: useGoals.getState().goals.slice(0, 20),
            projects: useProjects.getState().projects.slice(0, 20),
            tasks: useTasks.getState().tasks.slice(0, 50),
            moods: useMoods.getState().moods.slice(0, 10),
          },
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
            // Execute actions immediately
            ThoughtProcessingService.executeActions(thoughtId, request.output?.result?.actions || []);
            resolve({ success: true, actions: request.output?.result?.actions });
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

  static async executeActions(thoughtId: string, actions: Array<{ type: string; data: any; reasoning: string }>) {
    const updateThought = useThoughts.getState().updateThought;
    const addTask = useTasks.getState().add;
    const addProject = useProjects.getState().add;
    const addGoal = useGoals.getState().add;
    const addMood = useMoods.getState().add;

    for (const action of actions) {
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
            await addMood({
              value: action.data.intensity || 5,
              note: action.data.notes || action.data.mood,
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
