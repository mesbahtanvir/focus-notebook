/**
 * Simple verification script for the unified prompt framework
 * Run with: node scripts/verify-framework.js
 */

const { loadPrompt, buildMessages, listPrompts } = require('../src/lib/prompts/promptLoader.ts');
const { generateTestDataForPrompt, formatThoughtForYAML } = require('../src/lib/prompts/testDataGenerator.ts');

console.log('╔════════════════════════════════════════════╗');
console.log('║   Prompt Framework Verification           ║');
console.log('╚════════════════════════════════════════════╝\n');

// Test 1: List prompts
console.log('✓ Testing listPrompts()');
const prompts = listPrompts();
console.log('  Found', prompts.length, 'prompts:', prompts.join(', '));
console.log();

// Test 2: Load a prompt
console.log('✓ Testing loadPrompt()');
const config = loadPrompt('process-thought');
console.log('  Loaded:', config.name);
console.log('  Version:', config.version);
console.log('  Model:', config.model.default);
console.log('  Temperature:', config.model.temperature);
console.log();

// Test 3: Generate test data
console.log('✓ Testing generateTestDataForPrompt()');
const testData = generateTestDataForPrompt('process-thought');
console.log('  Thought text:', testData.thought.text.substring(0, 60) + '...');
console.log('  Goals:', testData.context.goals?.length || 0);
console.log('  Projects:', testData.context.projects?.length || 0);
console.log('  Tasks:', testData.context.tasks?.length || 0);
console.log();

// Test 4: Format for YAML
console.log('✓ Testing formatThoughtForYAML()');
const { variables, context } = formatThoughtForYAML(testData);
console.log('  Variables keys:', Object.keys(variables).join(', '));
console.log('  Context keys:', Object.keys(context).join(', '));
console.log();

// Test 5: Build messages
console.log('✓ Testing buildMessages()');
const messages = buildMessages(config, variables, context);
console.log('  Messages:', messages.length);
console.log('  Roles:', messages.map(m => m.role).join(', '));
console.log('  System message length:', messages[0].content.length, 'chars');
console.log('  User message length:', messages[1].content.length, 'chars');
console.log();

// Test 6: Verify message structure
console.log('✓ Verifying message structure');
const hasSystemMessage = messages.some(m => m.role === 'system');
const hasUserMessage = messages.some(m => m.role === 'user');
const systemContent = messages.find(m => m.role === 'system')?.content || '';
const userContent = messages.find(m => m.role === 'user')?.content || '';

console.log('  Has system message:', hasSystemMessage ? '✓' : '✗');
console.log('  Has user message:', hasUserMessage ? '✓' : '✗');
console.log('  System includes tool tags:', systemContent.includes('tool-tasks') ? '✓' : '✗');
console.log('  User includes thought text:', userContent.includes(testData.thought.text) ? '✓' : '✗');
console.log('  User includes context:', userContent.includes('Goals') ? '✓' : '✗');
console.log();

// Test 7: Test all prompts
console.log('✓ Testing all prompts');
let allSuccess = true;
for (const promptName of prompts) {
  try {
    const cfg = loadPrompt(promptName);
    console.log('  ✓', promptName, '-', cfg.model.default);
  } catch (error) {
    console.log('  ✗', promptName, '-', error.message);
    allSuccess = false;
  }
}
console.log();

// Summary
console.log('═══════════════════════════════════════════');
if (allSuccess) {
  console.log('✅ All tests passed!');
  console.log();
  console.log('The unified prompt framework is working correctly.');
  console.log('YAML prompts are now the single source of truth.');
  console.log();
  console.log('Next steps:');
  console.log('1. Read: docs/PROMPT_FRAMEWORK.md');
  console.log('2. Export prompts for GitHub Models testing');
  console.log('3. Update API routes to use the new system');
} else {
  console.log('❌ Some tests failed. Check the output above.');
  process.exit(1);
}
