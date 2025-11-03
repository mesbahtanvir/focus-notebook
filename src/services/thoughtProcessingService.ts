import { useThoughts, AISuggestion } from '@/store/useThoughts';
import { useTasks } from '@/store/useTasks';
import { useProjects } from '@/store/useProjects';
import { useGoals } from '@/store/useGoals';
import { useMoods } from '@/store/useMoods';
import { auth } from '@/lib/firebaseClient';
import { useAnonymousSession } from '@/store/useAnonymousSession';
import { httpsCallable } from 'firebase/functions';
import { functionsClient } from '@/lib/firebaseClient';
import { resolveToolSpecIds } from '../../shared/toolSpecUtils';
import { useToolEnrollment } from '@/store/useToolEnrollment';
import { useSubscriptionStatus } from '@/store/useSubscriptionStatus';
import { type AiEntitlementCode } from '../../shared/subscription';

export interface ThoughtProcessingResult {
  success: boolean;
  error?: string;
  queued?: boolean;
  jobId?: string;
  actions?: Array<{
    type: string;
    data: any;
    reasoning: string;
  }>;
}

function getEntitlementBlockMessage(code: AiEntitlementCode): string {
  switch (code) {
    case 'inactive':
      return 'Your Focus Notebook Pro subscription is inactive. Update billing to resume AI processing.';
    case 'disabled':
      return 'AI processing is disabled for your account. Contact support if this is unexpected.';
    case 'exhausted':
      return 'You have used all available AI processing credits. Add more credits or wait for the next cycle.';
    case 'tier-mismatch':
    case 'no-record':
    default:
      return 'Focus Notebook Pro is required to process thoughts with AI.';
  }
}

export class ThoughtProcessingService {
  static async processThought(thoughtId: string): Promise<ThoughtProcessingResult> {
    const thought = useThoughts.getState().thoughts.find(t => t.id === thoughtId);
    if (!thought) {
      return { success: false, error: 'Thought not found' };
    }

    const currentUser = auth.currentUser;
    if (currentUser?.isAnonymous) {
      const { allowAi } = useAnonymousSession.getState();
      if (!allowAi) {
        return { success: false, error: 'Anonymous sessions cannot run AI processing' };
      }
    }

    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    const subscriptionState = useSubscriptionStatus.getState();
    if (!subscriptionState.isLoading && !subscriptionState.hasProAccess) {
      const message = getEntitlementBlockMessage(subscriptionState.entitlement.code);
      try {
        await useThoughts
          .getState()
          .updateThought(thoughtId, { aiProcessingStatus: 'blocked', aiError: message });
      } catch (error) {
        console.warn('Failed to mark thought as blocked locally:', error);
      }
      return {
        success: false,
        error: message,
      };
    }

    if (thought.tags?.includes('processed')) {
      return { success: false, error: 'Thought already processed' };
    }

    if (thought.aiProcessingStatus === 'pending' || thought.aiProcessingStatus === 'processing') {
      return { success: false, error: 'Thought already queued for processing' };
    }

    const { enrolledToolIds } = useToolEnrollment.getState();

    if (!enrolledToolIds || enrolledToolIds.length === 0) {
      return { success: false, error: 'Enroll in a tool from the marketplace before processing thoughts.' };
    }

    const toolSpecIds = resolveToolSpecIds(thought, { enrolledToolIds });

    if (toolSpecIds.length === 0) {
      return { success: false, error: 'No enrolled tools are applicable to this thought yet.' };
    }
    const manualProcess = httpsCallable(functionsClient, 'manualProcessThought');

    try {
      const response = await manualProcess({
        thoughtId,
        toolSpecIds,
      });

      const data = response.data as {
        success: boolean;
        jobId?: string;
        message?: string;
        error?: string;
        queued?: boolean;
      };

      if (data?.success) {
        await useThoughts
          .getState()
          .updateThought(thoughtId, { aiProcessingStatus: 'pending', aiError: undefined });

        return {
          success: true,
          queued: data.queued !== false,
          jobId: data.jobId,
        };
      }

      return {
        success: false,
        error: data?.error || data?.message || 'Failed to schedule processing job',
      };
    } catch (error) {
      console.error('Failed to call manualProcessThought function:', error);
      const message = error instanceof Error ? error.message : 'Failed to schedule processing job';
      const errorCode = (error as { code?: string })?.code;

      if (errorCode === 'functions/permission-denied' || errorCode === 'permission-denied') {
        try {
          await useThoughts
            .getState()
            .updateThought(thoughtId, { aiProcessingStatus: 'blocked', aiError: message });
        } catch (updateError) {
          console.warn('Failed to mark thought as blocked after callable error:', updateError);
        }
      }

      return {
        success: false,
        error: message,
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
            // Validate category - must be 'mastery' or 'pleasure' only
            const validCategory = action.data.category === 'mastery' || action.data.category === 'pleasure'
              ? action.data.category
              : 'mastery'; // Default to mastery if invalid
            await addTask({
              title: action.data.title,
              category: validCategory,
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
