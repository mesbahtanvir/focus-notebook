export interface ToolAction {
  type: string;
  description: string;
  params?: Record<string, any>;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  capabilities: string[];
  actions: ToolAction[];
  priority: number;
  active: boolean;
  examples: string[]; // Example thoughts that would trigger this tool
  keywords: string[]; // Keywords that indicate this tool should be used
}

class ToolRegistryClass {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    // Initialize with default tools
    this.registerDefaultTools();
  }

  register(tool: ToolDefinition) {
    this.tools.set(tool.id, tool);
  }

  unregister(toolId: string) {
    this.tools.delete(toolId);
  }

  get(toolId: string): ToolDefinition | undefined {
    return this.tools.get(toolId);
  }

  getActive(): ToolDefinition[] {
    return Array.from(this.tools.values())
      .filter(t => t.active)
      .sort((a, b) => a.priority - b.priority);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  setActive(toolId: string, active: boolean) {
    const tool = this.tools.get(toolId);
    if (tool) {
      tool.active = active;
    }
  }

  getToolDescriptions(): string {
    return this.getActive()
      .map(t => {
        const caps = t.capabilities.join('\n   - ');
        const examples = t.examples.slice(0, 3).join('\n   - '); // Show first 3 examples
        const keywords = t.keywords.slice(0, 10).join(', '); // Show first 10 keywords
        return `${t.name} (${t.id}):
   Description: ${t.description}
   Capabilities:
   - ${caps}
   Example thoughts that trigger this tool:
   - ${examples}
   Keywords: ${keywords}`;
      })
      .join('\n\n');
  }

  private registerDefaultTools() {
    // Tasks Tool
    this.register({
      id: 'tasks',
      name: 'Tasks',
      description: 'Create actionable tasks for goals, todos, research, and errands',
      icon: 'CheckSquare',
      capabilities: [
        'Create tasks from action items',
        'Break down complex goals into steps',
        'Organize errands and chores',
        'Track learning objectives',
        'Manage work items'
      ],
      actions: [
        {
          type: 'createTask',
          description: 'Creates a new task',
          params: {
            title: 'string',
            category: 'health | wealth | mastery | connection',
            estimatedTime: 'number (minutes)',
            priority: 'low | medium | high'
          }
        }
      ],
      priority: 1,
      active: true,
      examples: [
        'I need to buy groceries',
        'I want to learn Python',
        'I should call mom this week',
        'Need to finish the project report',
        'I need to exercise more',
        'Should organize my desk',
        'I want to read that book'
      ],
      keywords: [
        'need to', 'should', 'want to', 'have to', 'must',
        'todo', 'task', 'do', 'finish', 'complete', 'work on',
        'learn', 'study', 'practice', 'buy', 'call', 'email',
        'fix', 'organize', 'clean', 'prepare'
      ]
    });

    // Brainstorming Tool
    this.register({
      id: 'brainstorming',
      name: 'Brainstorming',
      description: 'Explore ideas, generate creative solutions, and expand on concepts',
      icon: 'Lightbulb',
      capabilities: [
        'Tag thoughts for creative exploration',
        'Facilitate idea generation',
        'Enable AI-powered brainstorming sessions',
        'Help explore multiple perspectives'
      ],
      actions: [
        {
          type: 'addTag',
          description: 'Adds brainstorm tag to thought',
          params: { tag: 'brainstorm' }
        }
      ],
      priority: 2,
      active: true,
      examples: [
        'Ideas for new app features',
        'What if we tried a different approach?',
        'Thinking about career options',
        'How can I improve my workflow?',
        'Exploring different solutions',
        'What are some creative ways to...?'
      ],
      keywords: [
        'idea', 'ideas', 'brainstorm', 'think', 'explore',
        'what if', 'how can', 'ways to', 'options', 'solutions',
        'creative', 'different approach', 'possibilities'
      ]
    });

    // CBT Tool
    this.register({
      id: 'cbt',
      name: 'CBT Analysis',
      description: 'Process negative thoughts using Cognitive Behavioral Therapy techniques',
      icon: 'Brain',
      capabilities: [
        'Analyze negative thought patterns',
        'Provide cognitive reframing',
        'Identify cognitive distortions',
        'Suggest healthier perspectives'
      ],
      actions: [
        {
          type: 'changeType',
          description: 'Changes thought type to feeling-bad',
          params: { type: 'feeling-bad' }
        },
        {
          type: 'addTag',
          description: 'Adds CBT tag',
          params: { tag: 'cbt' }
        }
      ],
      priority: 3,
      active: true,
      examples: [
        'I always mess things up',
        'Nobody likes me',
        'I\'m not good enough',
        'Everything is going wrong',
        'I can\'t do anything right',
        'This is hopeless'
      ],
      keywords: [
        'always', 'never', 'can\'t', 'impossible', 'hopeless',
        'nobody', 'everyone', 'worthless', 'failure', 'terrible',
        'anxious', 'worried', 'scared', 'overwhelmed'
      ]
    });

    // Mood Tracker Tool
    this.register({
      id: 'mood',
      name: 'Mood Tracker',
      description: 'Track emotional patterns and feelings',
      icon: 'Heart',
      capabilities: [
        'Categorize emotional states',
        'Track mood patterns over time',
        'Identify triggers and trends',
        'Support emotional awareness',
        'Create mood entries with intensity levels'
      ],
      actions: [
        {
          type: 'changeType',
          description: 'Changes thought type based on emotion',
          params: { type: 'feeling-good | feeling-bad | neutral' }
        },
        {
          type: 'setIntensity',
          description: 'Sets emotional intensity',
          params: { intensity: 'number (1-10)' }
        },
        {
          type: 'createMoodEntry',
          description: 'Creates a mood tracker entry',
          params: { mood: 'string', intensity: 'number (1-10)', notes: 'string' }
        }
      ],
      priority: 4,
      active: true,
      examples: [
        'I am sooo sad right now',
        'Feeling really happy today!',
        'I\'m so stressed out',
        'Feeling anxious about tomorrow',
        'I feel amazing!',
        'So frustrated right now',
        'Feeling down today',
        'I\'m really excited!'
      ],
      keywords: [
        'feeling', 'feel', 'emotion', 'mood', 'am', 'i\'m',
        'happy', 'sad', 'angry', 'anxious', 'excited', 'depressed',
        'stressed', 'frustrated', 'overwhelmed', 'joyful', 'content',
        'worried', 'nervous', 'calm', 'peaceful', 'energetic', 'tired',
        'so', 'really', 'very', 'extremely'
      ]
    });

    // Focus Tool
    this.register({
      id: 'focus',
      name: 'Focus Sessions',
      description: 'Suggest time-blocking and focused work sessions',
      icon: 'Timer',
      capabilities: [
        'Identify tasks needing focus time',
        'Suggest Pomodoro sessions',
        'Tag for deep work planning'
      ],
      actions: [
        {
          type: 'addTag',
          description: 'Adds focus tag',
          params: { tag: 'focus' }
        }
      ],
      priority: 5,
      active: true,
      examples: [
        'I need dedicated time to work on this',
        'This requires deep focus',
        'I should block out time for...',
        'Need to concentrate on this project'
      ],
      keywords: [
        'focus', 'concentrate', 'dedicated time', 'deep work',
        'block time', 'uninterrupted', 'pomodoro'
      ]
    });

    // Documents Tool
    this.register({
      id: 'documents',
      name: 'Documents',
      description: 'Create notes and documentation from thoughts',
      icon: 'FileText',
      capabilities: [
        'Convert thoughts into structured notes',
        'Create reference documents',
        'Organize information for later use'
      ],
      actions: [
        {
          type: 'addTag',
          description: 'Adds documentation tag',
          params: { tag: 'document' }
        }
      ],
      priority: 6,
      active: true,
      examples: [
        'Notes from the meeting',
        'Important information to remember',
        'Things I learned today',
        'Key points about...'
      ],
      keywords: [
        'notes', 'remember', 'document', 'write down',
        'important', 'key points', 'information', 'reference'
      ]
    });
  }
}

// Singleton instance
export const ToolRegistry = new ToolRegistryClass();
