/**
 * OpenAI Client for AI Thought Processing
 *
 * Handles communication with OpenAI API and prompt engineering
 */

import { CONFIG } from '../config';
import { ProcessingContext, formatContextForPrompt } from './contextGatherer';

export interface AIAction {
  type: string;
  confidence: number;
  data: any;
  reasoning: string;
}

export interface OpenAIResponse {
  actions: AIAction[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call OpenAI API to process a thought
 */
export async function callOpenAI(
  thoughtText: string,
  context: ProcessingContext
): Promise<OpenAIResponse> {
  const prompt = buildPrompt(thoughtText, context);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: CONFIG.MODELS.DEFAULT,
      messages: [
        {
          role: 'system',
          content: 'You are a thought processing assistant. Respond only with valid JSON, no markdown formatting.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0]?.message?.content;

  if (!aiResponse) {
    throw new Error('No response from OpenAI');
  }

  // Parse JSON response (handle potential markdown code blocks)
  const cleanedResponse = aiResponse
    .trim()
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '');

  let parsed;
  try {
    parsed = JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Failed to parse OpenAI response:', aiResponse);
    throw new Error('Invalid JSON response from OpenAI');
  }

  return {
    actions: parsed.actions || [],
    usage: data.usage,
  };
}

/**
 * Build the AI prompt with context
 */
function buildPrompt(thoughtText: string, context: ProcessingContext): string {
  const contextFormatted = formatContextForPrompt(context);

  return `You are processing a user's thought in a productivity app.

**STEP 1: ENHANCE THE TEXT**
- Fix grammar, spelling, capitalization
- Complete partial references using the context below
- Preserve the user's original voice and intent
- Don't add new information, only clean up what's there

Examples of text enhancement:
- "had coffee w/ sar" → "Had coffee with Sarah"
- "working on websi proj" → "Working on Website Redesign Project"
- "need to finish q3 goals" → "Need to finish Q3 Revenue Goals"

**STEP 2: ADD TAGS**

Tool Tags (add when applicable, confidence must be 95%+):
- tool-cbt: Thought contains negative thoughts, anxiety, worry, cognitive distortions, or emotional distress
- tool-brainstorm: Thought is about ideas, creative exploration, planning, or needs discussion
- tool-deepreflect: Thought requires deep philosophical reflection, introspection, or self-examination

Entity Tags (only if specifically mentioned, confidence must be 95%+):
- person-{shortname}: When a specific person is mentioned by name in the thought
- project-{id}: When a specific project is directly referenced
- goal-{id}: When a specific goal is explicitly discussed

IMPORTANT for entity tags:
- Only add if the person/project/goal is actually mentioned in the thought text
- Must have high confidence (95%+) that the match is correct
- Use exact IDs from the context provided

**STEP 3: SUGGEST ACTIONS** (confidence 70-94%, requires user approval)

Only suggest task creation if the thought EXPLICITLY requests it with phrases like:
- "create a task"
- "need to do"
- "add task"
- "should create"
- "remind me to"

For task creation:
- focusEligible: true = Desk work (email, coding, writing, calls, online work)
- focusEligible: false = Errands (shopping, appointments, travel, physical location changes)
- category: MUST be either "mastery" or "pleasure" ONLY
  - "mastery" = Tasks related to skill development, work, learning, personal growth
  - "pleasure" = Tasks related to enjoyment, leisure, relaxation, fun activities

Confidence Requirements:
- 95-100%: Auto-apply (text enhancement, tool tags, entity tags)
- 70-94%: Show as suggestion for user approval (task creation, other actions)
- Below 70%: Do not include in response

**CONTEXT:**

${contextFormatted}

**THOUGHT TO PROCESS:**
"${thoughtText}"

**RESPOND WITH JSON ONLY:**
{
  "actions": [
    {
      "type": "enhanceThought",
      "confidence": 99,
      "data": {
        "improvedText": "Enhanced version of the thought",
        "changes": [
          {"type": "grammar", "from": "had", "to": "Had"},
          {"type": "completion", "from": "sar", "to": "Sarah"},
          {"type": "completion", "from": "websi proj", "to": "Website Redesign Project"}
        ]
      },
      "reasoning": "Fixed grammar and completed name/project references from context"
    },
    {
      "type": "addTag",
      "confidence": 98,
      "data": { "tag": "person-sarah" },
      "reasoning": "Thought mentions Sarah from relationships list"
    },
    {
      "type": "addTag",
      "confidence": 96,
      "data": { "tag": "project-abc123" },
      "reasoning": "References Website Redesign Project (ID: abc123)"
    },
    {
      "type": "createTask",
      "confidence": 85,
      "data": {
        "title": "Follow up with Sarah about project",
        "focusEligible": true,
        "priority": "medium",
        "category": "mastery"
      },
      "reasoning": "Thought explicitly requests creating a work-related task (use 'mastery' for work/growth, 'pleasure' for leisure/fun)"
    }
  ]
}

Rules:
- Only suggest actions that are truly helpful and accurate
- Be conservative with confidence scores - don't inflate them
- Don't create tasks unless explicitly requested in the thought
- Use context to complete references, not to invent new information
- Preserve the user's voice and meaning in text enhancements`;
}
