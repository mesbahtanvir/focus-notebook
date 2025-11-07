/**
 * Test script for the unified prompt framework
 * Run with: npx tsx scripts/test-prompt-framework.ts
 */

import { loadPrompt, buildMessages, exportPromptForGitHubModels, listPrompts } from '../src/lib/prompts/promptLoader';
import {
  generateTestDataForPrompt,
  formatThoughtForYAML,
} from '../src/lib/prompts/testDataGenerator';
import { exportPromptForGitHubModels as exportFromBuilder } from '../src/lib/llm/promptBuilder';

function testPromptLoader() {
  console.log('=== Testing Prompt Loader ===\n');

  // List all prompts
  const prompts = listPrompts();
  console.log('✓ Available prompts:', prompts.join(', '));
  console.log();

  // Load a prompt
  const promptConfig = loadPrompt('process-thought');
  console.log('✓ Loaded prompt:', promptConfig.name);
  console.log('  Version:', promptConfig.version);
  console.log('  Default model:', promptConfig.model.default);
  console.log();

  // Generate test data
  const testData = generateTestDataForPrompt('process-thought');
  console.log('✓ Generated test data');
  console.log('  Thought:', testData.thought.text.substring(0, 50) + '...');
  console.log('  Goals:', testData.context.goals?.length || 0);
  console.log('  Tasks:', testData.context.tasks?.length || 0);
  console.log();

  // Format for YAML system
  const { variables, context } = formatThoughtForYAML(testData);
  console.log('✓ Formatted for YAML system');
  console.log('  Variables:', Object.keys(variables).join(', '));
  console.log('  Context keys:', Object.keys(context).join(', '));
  console.log();

  // Build messages
  const messages = buildMessages(promptConfig, variables, context);
  console.log('✓ Built messages array');
  console.log('  Message count:', messages.length);
  console.log('  Roles:', messages.map(m => m.role).join(', '));
  console.log('  System message length:', messages[0].content.length, 'chars');
  console.log('  User message length:', messages[1]?.content.length || 0, 'chars');
  console.log();

  return { promptConfig, messages, testData, variables, context };
}

function testGitHubModelsExport() {
  console.log('=== Testing GitHub Models Export ===\n');

  // Test data
  const testData = generateTestDataForPrompt('process-thought');
  const { variables, context } = formatThoughtForYAML(testData);

  // Export using promptLoader
  const exported1 = exportPromptForGitHubModels('process-thought', variables, context);
  console.log('✓ Exported using promptLoader');
  console.log('  Length:', exported1.length, 'chars');
  console.log('  Contains system message:', exported1.includes('## System Message:'));
  console.log('  Contains user prompt:', exported1.includes('## User Prompt:'));
  console.log('  Contains model config:', exported1.includes('## Model Configuration:'));
  console.log();

  // Export using promptBuilder (backward compatibility)
  const exported2 = exportFromBuilder();
  console.log('✓ Exported using promptBuilder (backward compat)');
  console.log('  Length:', exported2.length, 'chars');
  console.log();

  return { exported1, exported2 };
}

function testAllPrompts() {
  console.log('=== Testing All Available Prompts ===\n');

  const prompts = listPrompts();
  const results: Array<{ name: string; success: boolean; error?: string }> = [];

  for (const promptName of prompts) {
    try {
      const config = loadPrompt(promptName);

      // Try to generate test data if available
      let testData;
      let variables = {};
      let context = {};

      try {
        testData = generateTestDataForPrompt(promptName);
        if (promptName === 'process-thought') {
          const formatted = formatThoughtForYAML(testData);
          variables = formatted.variables;
          context = formatted.context;
        } else {
          // For other prompts, use the test data directly
          variables = testData;
        }
      } catch (e) {
        // No test data generator for this prompt yet
      }

      // Build messages
      const messages = buildMessages(config, variables, context);

      console.log(`✓ ${promptName}`);
      console.log(`  Model: ${config.model.default}`);
      console.log(`  Messages: ${messages.length}`);

      results.push({ name: promptName, success: true });
    } catch (error) {
      console.log(`✗ ${promptName}`);
      console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
      results.push({
        name: promptName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    console.log();
  }

  return results;
}

function testTemplateRendering() {
  console.log('=== Testing Template Rendering ===\n');

  const { renderTemplate, renderContext } = require('../src/lib/prompts/promptLoader');

  // Test simple variable replacement
  const template1 = 'Hello {{name}}, you have {{count}} messages';
  const result1 = renderTemplate(template1, { name: 'Alice', count: 5 });
  console.log('✓ Simple variables');
  console.log('  Template:', template1);
  console.log('  Result:', result1);
  console.log();

  // Test nested object access
  const template2 = 'User: {{user.name}} ({{user.email}})';
  const result2 = renderTemplate(template2, {
    user: { name: 'Bob', email: 'bob@example.com' },
  });
  console.log('✓ Nested objects');
  console.log('  Template:', template2);
  console.log('  Result:', result2);
  console.log();

  // Test conditional rendering
  const template3 = `{{#if hasGoals}}You have goals{{/if}}`;
  const result3a = renderContext(template3, { hasGoals: true });
  const result3b = renderContext(template3, { hasGoals: false });
  console.log('✓ Conditionals');
  console.log('  Template:', template3);
  console.log('  With true:', result3a);
  console.log('  With false:', result3b);
  console.log();

  // Test array iteration
  const template4 = `{{#each items}}
- {{name}}
{{/each}}`;
  const result4 = renderContext(template4, {
    items: [{ name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }],
  });
  console.log('✓ Array iteration');
  console.log('  Template:', template4.replace(/\n/g, '\\n'));
  console.log('  Result:', result4.replace(/\n/g, '\\n'));
  console.log();
}

// Run all tests
async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Prompt Framework Integration Tests      ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log();

  try {
    // Test 1: Prompt Loader
    const loaderTest = testPromptLoader();

    // Test 2: GitHub Models Export
    const exportTest = testGitHubModelsExport();

    // Test 3: Template Rendering
    testTemplateRendering();

    // Test 4: All Prompts
    const allResults = testAllPrompts();

    // Summary
    console.log('=== Test Summary ===\n');
    const successful = allResults.filter(r => r.success).length;
    const failed = allResults.filter(r => !r.success).length;

    console.log(`Total prompts: ${allResults.length}`);
    console.log(`Successful: ${successful} ✓`);
    console.log(`Failed: ${failed} ${failed > 0 ? '✗' : ''}`);
    console.log();

    if (failed > 0) {
      console.log('Failed prompts:');
      allResults
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
      console.log();
    }

    console.log('✅ All tests completed!');
    console.log();
    console.log('Next steps:');
    console.log('1. Review the documentation: docs/PROMPT_FRAMEWORK.md');
    console.log('2. Export a prompt for GitHub Models testing');
    console.log('3. Try creating a new YAML prompt');
    console.log();
  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

main();
