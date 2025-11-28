/**
 * Transaction Categorization Service
 * Premium taxonomy with merchant-based categorization
 */

import { Anthropic } from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PROMPT_FILE_NAME = 'categorize-transaction.prompt.yml';

interface PromptConfig {
  name: string;
  model: string;
  modelParameters: {
    temperature: number;
    max_tokens: number;
  };
  messages: Array<{
    role: string;
    content: string;
  }>;
}

function resolvePromptPath(): string {
  const candidatePaths = [
    path.join(__dirname, '../../../prompts', PROMPT_FILE_NAME),
    path.join(__dirname, '../../prompts', PROMPT_FILE_NAME),
    path.join(__dirname, '../../../../functions/prompts', PROMPT_FILE_NAME),
    path.join(process.cwd(), 'functions', 'prompts', PROMPT_FILE_NAME),
    path.join(process.cwd(), 'prompts', PROMPT_FILE_NAME),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Prompt file "${PROMPT_FILE_NAME}" not found. Checked: ${candidatePaths.join(', ')}`
  );
}

function loadPromptConfig(): PromptConfig {
  const promptPath = resolvePromptPath();
  const fileContents = fs.readFileSync(promptPath, 'utf8');
  return yaml.parse(fileContents);
}

// ============================================================================
// Premium Taxonomy
// ============================================================================

export interface CategoryMapping {
  level1: string;
  level2?: string;
  confidence: number;
}

const PREMIUM_CATEGORY_MAP: Record<string, CategoryMapping> = {
  // Food & Drink
  'starbucks': { level1: 'Food & Drink', level2: 'Cafe', confidence: 0.95 },
  'dunkin': { level1: 'Food & Drink', level2: 'Cafe', confidence: 0.95 },
  'peet': { level1: 'Food & Drink', level2: 'Cafe', confidence: 0.95 },
  'coffee': { level1: 'Food & Drink', level2: 'Cafe', confidence: 0.85 },
  'chipotle': { level1: 'Food & Drink', level2: 'Casual Dining', confidence: 0.95 },
  'panera': { level1: 'Food & Drink', level2: 'Casual Dining', confidence: 0.95 },
  'olive garden': { level1: 'Food & Drink', level2: 'Casual Dining', confidence: 0.95 },
  'mcdonald': { level1: 'Food & Drink', level2: 'Fast Food', confidence: 0.95 },
  'burger king': { level1: 'Food & Drink', level2: 'Fast Food', confidence: 0.95 },
  'taco bell': { level1: 'Food & Drink', level2: 'Fast Food', confidence: 0.95 },
  'wendy': { level1: 'Food & Drink', level2: 'Fast Food', confidence: 0.95 },
  'subway': { level1: 'Food & Drink', level2: 'Fast Food', confidence: 0.95 },
  'whole foods': { level1: 'Food & Drink', level2: 'Groceries', confidence: 0.95 },
  'trader joe': { level1: 'Food & Drink', level2: 'Groceries', confidence: 0.95 },
  'kroger': { level1: 'Food & Drink', level2: 'Groceries', confidence: 0.95 },
  'safeway': { level1: 'Food & Drink', level2: 'Groceries', confidence: 0.95 },
  'albertsons': { level1: 'Food & Drink', level2: 'Groceries', confidence: 0.95 },
  'publix': { level1: 'Food & Drink', level2: 'Groceries', confidence: 0.95 },
  'walmart': { level1: 'Food & Drink', level2: 'Groceries', confidence: 0.85 },
  'target': { level1: 'Shopping', level2: 'General', confidence: 0.80 },

  // Transport
  'uber': { level1: 'Transport', level2: 'Ridehail', confidence: 0.95 },
  'lyft': { level1: 'Transport', level2: 'Ridehail', confidence: 0.95 },
  'via': { level1: 'Transport', level2: 'Ridehail', confidence: 0.90 },
  'mta': { level1: 'Transport', level2: 'Public Transit', confidence: 0.95 },
  'bart': { level1: 'Transport', level2: 'Public Transit', confidence: 0.95 },
  'metro': { level1: 'Transport', level2: 'Public Transit', confidence: 0.85 },
  'shell': { level1: 'Transport', level2: 'Fuel', confidence: 0.95 },
  'chevron': { level1: 'Transport', level2: 'Fuel', confidence: 0.95 },
  'exxon': { level1: 'Transport', level2: 'Fuel', confidence: 0.95 },
  'mobil': { level1: 'Transport', level2: 'Fuel', confidence: 0.95 },
  'bp': { level1: 'Transport', level2: 'Fuel', confidence: 0.95 },
  'parking': { level1: 'Transport', level2: 'Parking', confidence: 0.90 },
  'spplus': { level1: 'Transport', level2: 'Parking', confidence: 0.90 },
  'parkwhiz': { level1: 'Transport', level2: 'Parking', confidence: 0.95 },

  // Shopping
  'amazon': { level1: 'Shopping', level2: 'Online Shopping', confidence: 0.95 },
  'ebay': { level1: 'Shopping', level2: 'Online Shopping', confidence: 0.95 },
  'etsy': { level1: 'Shopping', level2: 'Online Shopping', confidence: 0.95 },
  // target and walmart already defined above in Food & Drink / Shopping sections
  'costco': { level1: 'Shopping', level2: 'General', confidence: 0.90 },
  'best buy': { level1: 'Shopping', level2: 'Electronics', confidence: 0.95 },
  'apple': { level1: 'Shopping', level2: 'Electronics', confidence: 0.90 },
  'zara': { level1: 'Shopping', level2: 'Clothes', confidence: 0.95 },
  'h&m': { level1: 'Shopping', level2: 'Clothes', confidence: 0.95 },
  'gap': { level1: 'Shopping', level2: 'Clothes', confidence: 0.95 },
  'old navy': { level1: 'Shopping', level2: 'Clothes', confidence: 0.95 },
  'nordstrom': { level1: 'Shopping', level2: 'Clothes', confidence: 0.95 },
  'macy': { level1: 'Shopping', level2: 'Clothes', confidence: 0.85 },

  // Travel
  'delta': { level1: 'Travel', level2: 'Flights', confidence: 0.95 },
  'united': { level1: 'Travel', level2: 'Flights', confidence: 0.95 },
  'american airlines': { level1: 'Travel', level2: 'Flights', confidence: 0.95 },
  'southwest': { level1: 'Travel', level2: 'Flights', confidence: 0.95 },
  'jetblue': { level1: 'Travel', level2: 'Flights', confidence: 0.95 },
  'marriott': { level1: 'Travel', level2: 'Hotels', confidence: 0.95 },
  'hilton': { level1: 'Travel', level2: 'Hotels', confidence: 0.95 },
  'hyatt': { level1: 'Travel', level2: 'Hotels', confidence: 0.95 },
  'ihg': { level1: 'Travel', level2: 'Hotels', confidence: 0.95 },
  'airbnb': { level1: 'Travel', level2: 'Airbnb', confidence: 0.95 },
  'vrbo': { level1: 'Travel', level2: 'Airbnb', confidence: 0.95 },
  'hertz': { level1: 'Travel', level2: 'Car Rental', confidence: 0.95 },
  'enterprise': { level1: 'Travel', level2: 'Car Rental', confidence: 0.95 },
  'avis': { level1: 'Travel', level2: 'Car Rental', confidence: 0.95 },

  // Entertainment & Subscriptions
  'netflix': { level1: 'Entertainment', level2: 'Streaming', confidence: 0.95 },
  'spotify': { level1: 'Entertainment', level2: 'Music', confidence: 0.95 },
  'apple music': { level1: 'Entertainment', level2: 'Music', confidence: 0.95 },
  'hulu': { level1: 'Entertainment', level2: 'Streaming', confidence: 0.95 },
  'disney': { level1: 'Entertainment', level2: 'Streaming', confidence: 0.90 },
  'hbo': { level1: 'Entertainment', level2: 'Streaming', confidence: 0.95 },
  'youtube premium': { level1: 'Entertainment', level2: 'Streaming', confidence: 0.95 },
  'amazon prime': { level1: 'Entertainment', level2: 'Streaming', confidence: 0.90 },

  // Fitness & Wellness
  'equinox': { level1: 'Fitness', level2: 'Gym', confidence: 0.95 },
  '24 hour fitness': { level1: 'Fitness', level2: 'Gym', confidence: 0.95 },
  'planet fitness': { level1: 'Fitness', level2: 'Gym', confidence: 0.95 },
  'la fitness': { level1: 'Fitness', level2: 'Gym', confidence: 0.95 },
  'orangetheory': { level1: 'Fitness', level2: 'Studio', confidence: 0.95 },
  'soulcycle': { level1: 'Fitness', level2: 'Studio', confidence: 0.95 },
  'peloton': { level1: 'Fitness', level2: 'Studio', confidence: 0.95 },
  'cvs': { level1: 'Wellness', level2: 'Pharmacy', confidence: 0.95 },
  'walgreens': { level1: 'Wellness', level2: 'Pharmacy', confidence: 0.95 },
  'rite aid': { level1: 'Wellness', level2: 'Pharmacy', confidence: 0.95 },

  // Utilities
  'verizon': { level1: 'Utilities', level2: 'Phone', confidence: 0.95 },
  'at&t': { level1: 'Utilities', level2: 'Phone', confidence: 0.95 },
  't-mobile': { level1: 'Utilities', level2: 'Phone', confidence: 0.95 },
  'sprint': { level1: 'Utilities', level2: 'Phone', confidence: 0.95 },
  'comcast': { level1: 'Utilities', level2: 'Internet', confidence: 0.95 },
  'spectrum': { level1: 'Utilities', level2: 'Internet', confidence: 0.95 },
  'xfinity': { level1: 'Utilities', level2: 'Internet', confidence: 0.95 },
  'pg&e': { level1: 'Utilities', level2: 'Electric', confidence: 0.95 },
  'pge': { level1: 'Utilities', level2: 'Electric', confidence: 0.95 },
  'edison': { level1: 'Utilities', level2: 'Electric', confidence: 0.90 },
};

// ============================================================================
// Categorize Transaction
// ============================================================================

export function categorizeTransaction(
  merchant: string,
  description: string,
  plaidCategories: string[],
  isPremium: boolean
): CategoryMapping {
  // Try merchant-based categorization first
  const merchantLower = merchant.toLowerCase();

  for (const [key, mapping] of Object.entries(PREMIUM_CATEGORY_MAP)) {
    if (merchantLower.includes(key)) {
      if (isPremium) {
        return mapping;
      } else {
        // Convert to base category for free users
        return {
          level1: mapToBaseCategory(mapping.level1),
          confidence: mapping.confidence,
        };
      }
    }
  }

  // Fall back to Plaid categories
  if (plaidCategories && plaidCategories.length > 0) {
    const baseCategory = plaidCategories[0];
    return {
      level1: isPremium ? mapToBaseCategory(baseCategory) : baseCategory,
      confidence: 0.7,
    };
  }

  // Default to Other
  return {
    level1: 'Other',
    confidence: 0.5,
  };
}

// ============================================================================
// Use LLM for Low-Confidence Categorization
// ============================================================================

export async function categorizeLowConfidenceTransaction(
  merchant: string,
  description: string,
  amount: number
): Promise<CategoryMapping> {
  try {
    const promptConfig = loadPromptConfig();

    // Get the user message template
    const userMessage = promptConfig.messages.find(msg => msg.role === 'user');
    if (!userMessage) {
      throw new Error('User message not found in prompt config');
    }

    // Replace template variables
    const prompt = userMessage.content
      .replace(/\{\{merchant\}\}/g, merchant)
      .replace(/\{\{description\}\}/g, description)
      .replace(/\{\{amount\}\}/g, amount.toString());

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: promptConfig.modelParameters.max_tokens,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      const result = JSON.parse(content.text);
      return {
        level1: result.level1,
        level2: result.level2 || undefined,
        confidence: result.confidence || 0.8,
      };
    }

    return { level1: 'Other', confidence: 0.5 };
  } catch (error) {
    console.error('LLM categorization error:', error);
    return { level1: 'Other', confidence: 0.5 };
  }
}

// ============================================================================
// Map Premium to Base Categories
// ============================================================================

function mapToBaseCategory(premiumCategory: string): string {
  const mapping: Record<string, string> = {
    'Food & Drink': 'Food and Drink',
    'Transport': 'Transportation',
    'Shopping': 'Shopping',
    'Travel': 'Travel',
    'Entertainment': 'Entertainment',
    'Fitness': 'Personal Care',
    'Wellness': 'Healthcare',
    'Utilities': 'Utilities',
    'Rent/Mortgage': 'Home',
    'Fees/Interest': 'General Services',
    'Income': 'Income',
    'Education': 'Education',
    'Other': 'Other',
  };

  return mapping[premiumCategory] || 'Other';
}
