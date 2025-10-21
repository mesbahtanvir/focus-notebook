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
        return `${t.name} (${t.id}):
   Description: ${t.description}
   Capabilities:
   - ${caps}`;
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
      active: true
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
      active: true
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
      active: true
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
        'Support emotional awareness'
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
        }
      ],
      priority: 4,
      active: true
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
      active: true
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
      active: true
    });
  }
}

// Singleton instance
export const ToolRegistry = new ToolRegistryClass();
