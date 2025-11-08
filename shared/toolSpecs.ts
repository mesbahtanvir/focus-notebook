export type ToolActionCapability =
  | 'createsEntries'
  | 'addsTags'
  | 'linksItems'
  | 'collectsMetrics'
  | 'enhancesContent';

export interface ToolActionSummary {
  type: string;
  confidence?: number;
  dataSummary?: string;
}

export interface ToolExample {
  thought: string;
  rationale: string;
  recommendedActions: ToolActionSummary[];
}

export interface ToolSpec {
  id: string;
  title: string;
  tagline?: string;
  description: string;
  category?: string;
  benefits?: string[];
  primaryTags: string[];
  expectedCapabilities: ToolActionCapability[];
  guidance: string[];
  positiveExamples: ToolExample[];
  negativeExamples: ToolExample[];
}

export interface ToolGroup {
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: string;
  toolIds: string[];
  primaryToolId: string; // The main tool that shows in the UI
  hubPath: string; // The path to the group's hub/dashboard page
  benefits?: string[];
}

const baseGuidance = [
  'Only act when the thought clearly warrants the tool.',
  'Avoid inventing details that are not present in the thought.',
];

export const toolSpecs: Record<string, ToolSpec> = {
  thoughts: {
    id: 'thoughts',
    title: 'Thought Processing',
    tagline: 'Enhance and organize everyday thoughts with AI support.',
    category: 'Productivity',
    benefits: [
      'Improve clarity and tone without losing your voice',
      'Capture actionable next steps and link to tasks or projects',
      'Keep thought history organized with smart tagging',
    ],
    description:
      'General purpose processing for everyday thoughts. Enhance clarity, add helpful tags, and surface actionable follow-ups.',
    primaryTags: ['processed'],
    expectedCapabilities: ['enhancesContent', 'addsTags', 'createsEntries', 'linksItems'],
    guidance: [
      ...baseGuidance,
      'Favor suggestions (confidence 70-94) over auto actions unless the need is explicit.',
      'Only create tasks when the user asks to do something or there is a concrete next step.',
      'Add relationship tags only when a specific person is named.',
    ],
    positiveExamples: [
      {
        thought: 'Need to follow up with Priya about the onboarding project and schedule design review.',
        rationale:
          'Clear next steps and named collaborator. Beneficial to create a follow-up task and tag the project/person.',
        recommendedActions: [
          {
            type: 'addTag',
            dataSummary: 'tool-tasks',
          },
          {
            type: 'addTag',
            dataSummary: 'person-priya',
          },
          {
            type: 'createTask',
            confidence: 85,
            dataSummary: 'Follow up with Priya about onboarding project; category mastery',
          },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'Priya was on my mind today.',
        rationale:
          'Too vague to create tasks or tags; avoid guessing intent when no action is implied.',
        recommendedActions: [],
      },
      {
        thought: 'Feeling kind of off today, not sure why.',
        rationale:
          'Mood is present but no actionable content; log as mood suggestion instead of project/task.',
        recommendedActions: [
          {
            type: 'createMood',
            dataSummary: 'Offer medium-confidence suggestion at most; never auto-apply.',
          },
        ],
      },
    ],
  },
  tasks: {
    id: 'tasks',
    title: 'Tasks',
    tagline: 'Turn ideas into actionable checklists.',
    category: 'Execution',
    benefits: [
      'Auto-create todos from qualifying thoughts',
      'Link tasks back to the motivating thought',
      'Track mastery vs. pleasure balance',
    ],
    description:
      'Manage todos, priorities, and progress in one place. Ideal for capturing next steps generated from thought processing.',
    primaryTags: ['tool-tasks'],
    expectedCapabilities: ['createsEntries', 'linksItems', 'collectsMetrics'],
    guidance: [
      ...baseGuidance,
      'Only create a task when timing, ownership, or a clear next step is present in the thought.',
      'Use mastery vs. pleasure categories to differentiate work from restorative activities.',
    ],
    positiveExamples: [
      {
        thought: 'Email Alex the revised onboarding checklist before Friday and schedule a 30-minute sync.',
        rationale: 'Specific deliverable with a deadline and recipient; perfect for a task.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-tasks', confidence: 96 },
          {
            type: 'createTask',
            confidence: 88,
            dataSummary: 'Email Alex onboarding checklist (due Friday); mastery',
          },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'Alex appreciates thoughtful onboarding docs.',
        rationale: 'Sentiment without an actionable next step.',
        recommendedActions: [],
      },
    ],
  },
  projects: {
    id: 'projects',
    title: 'Projects',
    tagline: 'Organize multi-step work into clear roadmaps.',
    category: 'Execution',
    benefits: [
      'Capture project objectives and milestones',
      'Link related thoughts, tasks, and goals',
      'Surface project health on the dashboard',
    ],
    description:
      'Plan, group, and track related tasks or milestones. Ideal when a thought references a broader initiative.',
    primaryTags: ['tool-projects'],
    expectedCapabilities: ['createsEntries', 'linksItems', 'addsTags'],
    guidance: [
      ...baseGuidance,
      'Use projects when the thought references a multi-step effort rather than a single task.',
      'Prefer linking to existing projects before creating a new one.',
    ],
    positiveExamples: [
      {
        thought: 'The website relaunch needs a revised timeline, copy refresh, and QA checklist before end of month.',
        rationale: 'Multiple coordinated deliverables under one initiative.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-projects' },
          {
            type: 'createProject',
            confidence: 82,
            dataSummary: 'Website relaunch with timeline, copy refresh, QA milestones',
          },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'Need to change the hero image on the website.',
        rationale: 'Single step-should be a task.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-tasks' },
        ],
      },
    ],
  },
  goals: {
    id: 'goals',
    title: 'Goals',
    tagline: 'Set direction and track long-term outcomes.',
    category: 'Planning',
    benefits: [
      'Clarify why initiatives matter',
      'Bundle related projects and milestones',
      'Review progress during weekly planning',
    ],
    description:
      'Define personal or professional goals, align projects, and measure progress over time.',
    primaryTags: ['tool-goals'],
    expectedCapabilities: ['createsEntries', 'linksItems'],
    guidance: [
      ...baseGuidance,
      'Only create a goal when the thought references an outcome over weeks or months.',
      'Link tasks and projects back to goals to keep execution aligned.',
    ],
    positiveExamples: [
      {
        thought: 'I want to launch the new coaching program by Q3 with three pilot clients onboarded.',
        rationale: 'Clear desired outcome with timeframe.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-goals' },
          {
            type: 'createGoal',
            confidence: 80,
            dataSummary: 'Launch coaching program with three pilot clients by Q3',
          },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'Meeting with a potential coaching client tomorrow.',
        rationale: 'One-off event-better as a task.',
        recommendedActions: [],
      },
    ],
  },
  focus: {
    id: 'focus',
    title: 'Focus Sessions',
    tagline: 'Plan deep work sprints with timers and rituals.',
    category: 'Execution',
    benefits: [
      'Timebox deep work with preset modes',
      'Link focus blocks back to thoughts and tasks',
      'Track energy patterns over time',
    ],
    description:
      'Run structured focus blocks, track streaks, and log outcomes for high-leverage work.',
    primaryTags: ['tool-focus'],
    expectedCapabilities: ['collectsMetrics', 'linksItems'],
    guidance: [
      ...baseGuidance,
      'Use focus actions when the thought mentions carving out uninterrupted work time.',
      'Log focus reason or linked tasks for better reflection.',
    ],
    positiveExamples: [
      {
        thought: 'Block 90 minutes tomorrow morning for the quarterly planning deck with no Slack.',
        rationale: 'Explicit request for uninterrupted work session.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-focus' },
          { type: 'addTag', dataSummary: 'tool-tasks', confidence: 72 },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'I should remember to work on the deck soon.',
        rationale: 'Vague intent without structure.',
        recommendedActions: [
          { type: 'createTask', dataSummary: 'Draft quarterly planning deck' },
        ],
      },
    ],
  },
  brainstorming: {
    id: 'brainstorming',
    title: 'Brainstorming',
    tagline: 'Explore ideas with conversational AI prompts.',
    category: 'Ideation',
    benefits: [
      'Unlock new solution angles quickly',
      'Capture inspiration alongside context',
      'Spin off tasks or projects from refined ideas',
    ],
    description:
      'Generate ideas, prompts, and new angles by chatting with an AI collaborator.',
    primaryTags: ['tool-brainstorming', 'tool-brainstorm'],
    expectedCapabilities: ['enhancesContent', 'addsTags'],
    guidance: [
      ...baseGuidance,
      'Use brainstorming when the thought explicitly asks for ideas or creative directions.',
      'Avoid turning emotional processing or action items into brainstorming prompts.',
    ],
    positiveExamples: [
      {
        thought: 'Looking for creative angles to announce our beta launch-maybe community stories or behind-the-scenes content?',
        rationale: 'Asking for idea generation and variations.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-brainstorming' },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'I feel nervous about the beta launch.',
        rationale: 'Emotional processing-consider CBT or mood tracking.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-cbt', confidence: 70 },
        ],
      },
    ],
  },
  notes: {
    id: 'notes',
    title: 'Notes',
    tagline: 'Capture references and research for later.',
    category: 'Knowledge',
    benefits: [
      'Keep learnings searchable by topic',
      'Link notes to projects and goals',
      'Surface contextual info during planning',
    ],
    description:
      'Store evergreen knowledge, meeting notes, and references separated from action-oriented tools.',
    primaryTags: ['tool-notes'],
    expectedCapabilities: ['enhancesContent', 'addsTags', 'linksItems'],
    guidance: [
      ...baseGuidance,
      'Use notes when the thought references information worth revisiting (books, learnings, resources).',
      'Avoid converting urgent todos into notes-keep them in tasks.',
    ],
    positiveExamples: [
      {
        thought: 'Summarize takeaways from the Marty Cagan product webinar-especially discovery rituals and product trio cadence.',
        rationale: 'Capturing knowledge for future reference.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-notes' },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'Need to schedule a sync with the product trio.',
        rationale: 'Actionable step, not reference material.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-tasks' },
        ],
      },
    ],
  },
  relationships: {
    id: 'relationships',
    title: 'Relationships',
    tagline: 'Track connection health and follow-ups with people.',
    category: 'Wellbeing',
    benefits: [
      'Log recent interactions and energy levels',
      'Surface overdue check-ins automatically',
      'Link people to thoughts, tasks, and goals',
    ],
    description:
      'Maintain relationship histories, energy levels, and follow-up reminders for people that matter.',
    primaryTags: ['tool-relationships'],
    expectedCapabilities: ['addsTags', 'linksItems'],
    guidance: [
      ...baseGuidance,
      'Tag person references only when the name or clear identifier appears.',
      'Suggest follow-ups or tasks when the user expresses intent to reconnect.',
    ],
    positiveExamples: [
      {
        thought: 'It has been three months since I checked in with Priya-send her a note about the new role.',
        rationale: 'Explicit relationship follow-up with named person.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'person-priya' },
          { type: 'addTag', dataSummary: 'tool-relationships' },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'I value my friends.',
        rationale: 'General sentiment without an actionable follow-up.',
        recommendedActions: [],
      },
    ],
  },
  moodtracker: {
    id: 'moodtracker',
    title: 'Mood Tracker',
    tagline: 'Log emotions to spot patterns over time.',
    category: 'Wellbeing',
    benefits: [
      'Plot mood trends alongside events',
      'Capture triggers and coping strategies',
      'Share insights with therapists or coaches',
    ],
    description:
      'Record daily mood, triggers, and notes to understand emotional trends.',
    primaryTags: ['tool-mood'],
    expectedCapabilities: ['collectsMetrics', 'addsTags'],
    guidance: [
      ...baseGuidance,
      'Prefer mood entries when the thought focuses on feelings or affect without immediate action.',
      'Suggest CBT only when distortions or negative loops emerge.',
    ],
    positiveExamples: [
      {
        thought: "Feeling anxious (7/10) before tomorrow's demo - heart racing, hard to focus.",
        rationale: 'Clear emotional state with intensity; good for mood log.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-mood' },
          {
            type: 'createMood',
            confidence: 85,
            dataSummary: 'Log anxiety 7/10 with note about upcoming demo',
          },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'Need to finish the demo deck tonight.',
        rationale: 'Task-oriented; not a mood entry.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-tasks' },
        ],
      },
    ],
  },
  cbt: {
    id: 'cbt',
    title: 'CBT Processing',
    tagline: 'Guide negative thoughts through a structured CBT framework.',
    category: 'Wellness',
    benefits: [
      'Spot cognitive distortions quickly',
      'Capture emotions and triggers with guided prompts',
      'Track reframing progress and supportive evidence',
    ],
    description:
      'Identify cognitive distortions, capture emotions, and guide the user through reframing negative thinking patterns.',
    primaryTags: ['cbt', 'cbt-processed'],
    expectedCapabilities: ['addsTags', 'collectsMetrics', 'enhancesContent'],
    guidance: [
      ...baseGuidance,
      'Only add the cbt tag when the thought contains negative emotion or unhelpful thinking.',
      'Suggestions should focus on reflection prompts, not productivity tasks.',
      'Do not create tasks unless the user explicitly requests an actionable follow-up.',
    ],
    positiveExamples: [
      {
        thought: "I'm terrible at presentations. The team will think I'm incompetent.",
        rationale:
          'Strong negative self-talk and distortion language; prime candidate for CBT analysis.',
        recommendedActions: [
          {
            type: 'addTag',
            dataSummary: 'tool-cbt',
          },
          {
            type: 'addTag',
            dataSummary: 'cbt',
          },
          {
            type: 'enhanceThought',
            dataSummary: 'Clarify language while preserving emotional tone.',
          },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'Need to outline slides for Friday meeting.',
        rationale:
          'Task-oriented with no emotional distress; CBT tagging would be inappropriate.',
        recommendedActions: [
          {
            type: 'addTag',
            dataSummary: 'Consider tool-tasks instead if needed.',
          },
        ],
      },
    ],
  },
  deepreflect: {
    id: 'deepreflect',
    title: 'Deep Reflect',
    tagline: 'Explore philosophical questions and personal meaning.',
    category: 'Wellbeing',
    benefits: [
      'Hold big questions separate from daily noise',
      'Recognize recurring themes in identity work',
      'Capture insights for therapy or coaching',
    ],
    description:
      'A space for long-form reflection, identity work, and existential exploration.',
    primaryTags: ['tool-deepreflect'],
    expectedCapabilities: ['enhancesContent', 'addsTags'],
    guidance: [
      ...baseGuidance,
      'Encourage reflection when the thought probes values, meaning, or identity.',
      'Avoid turning practical planning into deep reflection prompts.',
    ],
    positiveExamples: [
      {
        thought: 'Why do I keep chasing promotions when they never feel fulfilling afterwards?',
        rationale: 'Explores personal meaning and motivations.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-deepreflect' },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'Need to update my resume for the promotion.',
        rationale: 'Actionable step, not reflective inquiry.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-tasks' },
        ],
      },
    ],
  },
  errands: {
    id: 'errands',
    title: 'Errands',
    tagline: 'Stay on top of quick life logistics.',
    category: 'Execution',
    benefits: [
      'Keep life admin distinct from focused work',
      'Batch errands by location or time window',
      'Sync errands with packing lists or trips',
    ],
    description:
      'Manage short, location-based, or recurring errands separate from deep work tasks.',
    primaryTags: ['tool-errands'],
    expectedCapabilities: ['createsEntries', 'linksItems'],
    guidance: [
      ...baseGuidance,
      'Errands are short, often physical-world tasks. Default new errands to the Errands tool when appropriate.',
      'Group similar errands to batch effort.',
    ],
    positiveExamples: [
      {
        thought: 'Pick up dry cleaning, buy new running shoes, and drop the package at UPS this Saturday.',
        rationale: 'Multiple quick errands ideal for batching.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-errands' },
          {
            type: 'createTask',
            confidence: 78,
            dataSummary: 'Saturday errand block: dry cleaning, shoes, UPS drop-off',
          },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'Finish the quarterly analytics dashboard.',
        rationale: 'Deep work task; belongs in Tasks or Focus.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-tasks' },
        ],
      },
    ],
  },
  'packing-list': {
    id: 'packing-list',
    title: 'Packing Planner',
    tagline: 'Never forget essentials for your next trip.',
    category: 'Logistics',
    benefits: [
      'Auto-suggest packing templates',
      'Link packing tasks to trips and errands',
      'Track packed vs. to-pack status',
    ],
    description:
      'Create smart packing lists tailored to trip type, destination, and length.',
    primaryTags: ['tool-packing'],
    expectedCapabilities: ['createsEntries', 'collectsMetrics'],
    guidance: [
      ...baseGuidance,
      'Trigger packing assistance when the thought references upcoming travel or items to bring.',
      'Avoid suggesting packing lists when the user is brainstorming ideas unrelated to travel.',
    ],
    positiveExamples: [
      {
        thought: 'Flying to Denver for a 3-day ski trip-need goggles, layers, and charge the GoPro.',
        rationale: 'Clear travel context with gear requirements.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-packing' },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'Should brainstorm ideas for the GoPro montage.',
        rationale: 'Creative work rather than packing logistics.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-brainstorming' },
        ],
      },
    ],
  },
  trips: {
    id: 'trips',
    title: 'Trips',
    tagline: 'Plan itineraries, budgets, and travel logistics.',
    category: 'Logistics',
    benefits: [
      'Track travel budgets and spending',
      'Manage itineraries and reservations',
      'Link travel tasks, packing lists, and errands',
    ],
    description:
      'Manage trip budgets, itineraries, and shared tasks across your travel plans.',
    primaryTags: ['tool-trips'],
    expectedCapabilities: ['createsEntries', 'linksItems', 'collectsMetrics'],
    guidance: [
      ...baseGuidance,
      'Use trips when the thought references upcoming travel, budgeting, or itinerary planning.',
      'Connect trips to packing lists and errands when relevant.',
    ],
    positiveExamples: [
      {
        thought: 'Budget $1,200 for Paris in May-book flight, reserve museum passes, and research cafés.',
        rationale: 'Travel planning with budget and itinerary tasks.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-trips' },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'Need to buy croissants for the team tomorrow.',
        rationale: 'Local errand, not a trip.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-errands' },
        ],
      },
    ],
  },
  investments: {
    id: 'investments',
    title: 'Investments',
    tagline: 'Track portfolios and long-term wealth strategies.',
    category: 'Finance',
    benefits: [
      'Monitor asset allocation and performance',
      'Link investment ideas to follow-up tasks',
      'Coordinate horizons with financial planning',
    ],
    description:
      'Stay on top of portfolio performance, allocation, and investment ideas.',
    primaryTags: ['tool-investments'],
    expectedCapabilities: ['collectsMetrics', 'linksItems'],
    guidance: [
      ...baseGuidance,
      'Create investment actions when the thought references portfolio changes, research, or allocation decisions.',
      'Avoid treating general financial stress as an investment task-consider CBT or mood tools instead.',
    ],
    positiveExamples: [
      {
        thought: 'Rebalance retirement account back to 70/20/10 stocks-bonds-cash mix this quarter.',
        rationale: 'Portfolio adjustment with ratio targets.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-investments' },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'Money feels stressful lately.',
        rationale: 'Emotional statement-better suited for CBT or mood tracking.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-mood' },
        ],
      },
    ],
  },
  spending: {
    id: 'spending',
    title: 'Spending Tracker',
    tagline: 'Track expenses and analyze spending patterns with AI.',
    category: 'Finance',
    benefits: [
      'Import bank and credit card statements via CSV',
      'Get AI-powered spending insights and recommendations',
      'Track monthly spending by category and merchant',
    ],
    description:
      'Upload credit card and bank statements, analyze spending patterns, and get personalized financial insights.',
    primaryTags: ['tool-spending'],
    expectedCapabilities: ['collectsMetrics', 'linksItems'],
    guidance: [
      ...baseGuidance,
      'Use spending tracking when the thought references expenses, transactions, or financial analysis.',
      'Link spending insights to budget planning or financial goals.',
    ],
    positiveExamples: [
      {
        thought: 'Need to review last month\'s credit card bill and see where all the money went.',
        rationale: 'Direct request for expense analysis.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-spending' },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'I should save more money.',
        rationale: 'General sentiment without actionable analysis.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-goals' },
        ],
      },
    ],
  },
  subscriptions: {
    id: 'subscriptions',
    title: 'Subscriptions',
    tagline: 'Review recurring expenses and renewals.',
    category: 'Finance',
    benefits: [
      'See all subscriptions in one dashboard',
      'Receive reminders before renewals',
      'Link subscriptions to budgets or projects',
    ],
    description:
      'Track trials, renewals, and recurring expenses to avoid surprises.',
    primaryTags: ['tool-subscriptions'],
    expectedCapabilities: ['createsEntries', 'collectsMetrics'],
    guidance: [
      ...baseGuidance,
      'Log subscriptions when the thought references renewals, cancellations, or recurring costs.',
      'Encourage actionable follow-ups such as canceling or renegotiating.',
    ],
    positiveExamples: [
      {
        thought: 'Spotify family plan renews on the 28th-decide whether to keep it after the trial.',
        rationale: 'Recurring expense with upcoming decision point.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-subscriptions' },
          {
            type: 'createTask',
            confidence: 72,
            dataSummary: 'Review Spotify family plan before renewal',
          },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'I enjoy listening to jazz playlists.',
        rationale: 'Preference without an actionable subscription change.',
        recommendedActions: [],
      },
    ],
  },
  'asset-horizon': {
    id: 'asset-horizon',
    title: 'Asset Horizon',
    tagline: 'Visualize portfolio glide paths and financial horizons.',
    category: 'Finance',
    benefits: [
      'Compare best, base, and worst-case scenarios',
      'Link investment accounts to horizon projections',
      'Track progress toward long-term financial goals',
    ],
    description:
      'Model investment growth scenarios, retirement horizons, and savings milestones.',
    primaryTags: ['tool-asset-horizon'],
    expectedCapabilities: ['collectsMetrics', 'linksItems'],
    guidance: [
      ...baseGuidance,
      'Recommend Asset Horizon when the thought references long-term financial planning or projection questions.',
      'Pair with Investments tool for concrete allocation tasks.',
    ],
    positiveExamples: [
      {
        thought: 'Model how selling RSUs next year impacts the five-year home purchase plan.',
        rationale: 'Forward-looking scenario analysis.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-asset-horizon' },
        ],
      },
    ],
    negativeExamples: [
      {
        thought: 'Cancel the unused software subscription.',
        rationale: 'Subscription management rather than horizon planning.',
        recommendedActions: [
          { type: 'addTag', dataSummary: 'tool-subscriptions' },
        ],
      },
    ],
  },
};

export type ToolSpecId = keyof typeof toolSpecs;

export const CORE_TOOL_IDS: ToolSpecId[] = [
  'thoughts',
];

export const ALL_TOOL_IDS = Object.keys(toolSpecs) as ToolSpecId[];

export const toolGroups: Record<string, ToolGroup> = {
  'work-goals': {
    id: 'work-goals',
    title: 'Work & Goals',
    tagline: 'Manage tasks, projects, and goals with focused execution.',
    description: 'A comprehensive productivity suite for managing your daily tasks, multi-step projects, long-term goals, and focused work sessions. Includes brainstorming for ideation, notes for knowledge capture, and errands for life admin.',
    category: 'Productivity',
    toolIds: ['tasks', 'projects', 'goals', 'focus', 'brainstorming', 'notes', 'errands'],
    primaryToolId: 'tasks',
    hubPath: '/tools/work-goals',
    benefits: [
      'Organize tasks, projects, and goals in one place',
      'Run focused work sessions with timers',
      'Capture ideas and knowledge for later',
      'Manage both work and life errands',
    ],
  },
  'inner-life': {
    id: 'inner-life',
    title: 'Soulful',
    tagline: 'Process thoughts, track emotions, and nurture connections.',
    description: 'A complete wellbeing suite for processing everyday thoughts, tracking mood patterns, managing relationships, working through negative thinking with CBT, and exploring deeper philosophical questions.',
    category: 'Wellbeing',
    toolIds: ['thoughts', 'moodtracker', 'relationships', 'cbt', 'deepreflect'],
    primaryToolId: 'thoughts',
    hubPath: '/tools/inner-life',
    benefits: [
      'Process and enhance daily thoughts',
      'Track mood patterns over time',
      'Nurture important relationships',
      'Work through negative thinking patterns',
      'Explore deeper philosophical questions',
    ],
  },
  trips: {
    id: 'trips',
    title: 'Trips',
    tagline: 'Plan itineraries, budgets, and travel logistics with smart packing lists.',
    description: 'Manage trip budgets, itineraries, packing lists, and shared tasks across your travel plans. Packing lists are automatically generated based on your destination, duration, and activities.',
    category: 'Logistics',
    toolIds: ['trips', 'packing-list'],
    primaryToolId: 'trips',
    hubPath: '/tools/trips',
    benefits: [
      'Track travel budgets and spending',
      'Manage itineraries and reservations',
      'Auto-generate smart packing lists based on trip details',
      'Link travel tasks and errands',
    ],
  },
  finances: {
    id: 'finances',
    title: 'Finances',
    tagline: 'Comprehensive financial planning and tracking.',
    description: 'Track investments, analyze spending patterns, manage subscriptions, and model long-term financial scenarios all in one integrated suite.',
    category: 'Finance',
    toolIds: ['investments', 'spending', 'subscriptions', 'asset-horizon'],
    primaryToolId: 'spending',
    hubPath: '/tools/finances',
    benefits: [
      'Monitor investment portfolios and performance',
      'Analyze spending with AI-powered insights',
      'Track and manage recurring subscriptions',
      'Model long-term financial horizons and scenarios',
    ],
  },
};

export type ToolGroupId = keyof typeof toolGroups;

export function getToolSpecById(id: ToolSpecId): ToolSpec {
  const spec = toolSpecs[id];
  if (!spec) {
    throw new Error(`Tool spec "${id}" is not defined`);
  }
  return spec;
}

export function getToolGroupById(id: ToolGroupId): ToolGroup {
  const group = toolGroups[id];
  if (!group) {
    throw new Error(`Tool group "${id}" is not defined`);
  }
  return group;
}

export function getToolGroupForTool(toolId: string): ToolGroup | null {
  for (const group of Object.values(toolGroups)) {
    if (group.toolIds.includes(toolId)) {
      return group;
    }
  }
  return null;
}

export function isToolInGroup(toolId: string): boolean {
  return getToolGroupForTool(toolId) !== null;
}

export function renderToolSpecForPrompt(spec: ToolSpec): string {
  const expected = spec.expectedCapabilities.join(', ');
  const guidance = spec.guidance.map((item, index) => `${index + 1}. ${item}`).join('\n');
  const formatExamples = (examples: ToolExample[], label: string) =>
    examples
      .map(
        (ex, index) =>
          `${label} ${index + 1}\nThought: "${ex.thought}"\nRationale: ${ex.rationale}${
            ex.recommendedActions.length
              ? `\nSuggested actions: ${ex.recommendedActions
                  .map(
                    (action) =>
                      `${action.type}${action.dataSummary ? ` - ${action.dataSummary}` : ''}${
                        action.confidence ? ` (confidence ${action.confidence})` : ''
                      }`
                  )
                  .join('; ')}`
              : ''
          }`
      )
      .join('\n\n');

  return [
    `Tool: ${spec.title} (${spec.id})`,
    `Description: ${spec.description}`,
    `Primary tags: ${spec.primaryTags.join(', ')}`,
    `Capabilities: ${expected}`,
    'Guidance:',
    guidance,
    formatExamples(spec.positiveExamples, 'Positive example'),
    formatExamples(spec.negativeExamples, 'Negative example'),
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function renderToolSpecsForPrompt(specs: ToolSpec[]): string {
  return specs.map(renderToolSpecForPrompt).join('\n\n---\n\n');
}
