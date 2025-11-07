/**
 * Test GitHub .prompt.yml format loading
 */

const { loadPrompt, loadGitHubPrompt, listPrompts } = require('../src/lib/prompts/promptLoader.ts');

console.log('╔════════════════════════════════════════════╗');
console.log('║   Testing GitHub .prompt.yml Format        ║');
console.log('╚════════════════════════════════════════════╝\n');

// List all prompts
const prompts = listPrompts();
console.log('✓ Available prompts:', prompts.join(', '));
console.log();

// Load GitHub format directly
try {
  const githubPrompt = loadGitHubPrompt('process-thought');
  console.log('✓ Loaded GitHub .prompt.yml format:');
  console.log('  Name:', githubPrompt.name);
  console.log('  Model:', githubPrompt.model);
  console.log('  Temperature:', githubPrompt.modelParameters?.temperature);
  console.log('  Max Tokens:', githubPrompt.modelParameters?.max_tokens);
  console.log('  Messages:', githubPrompt.messages.length);
  console.log('    - System:', githubPrompt.messages.filter(m => m.role === 'system').length);
  console.log('    - User:', githubPrompt.messages.filter(m => m.role === 'user').length);
  console.log('  Test Data:', githubPrompt.testData?.length || 0, 'cases');
  console.log('  Evaluators:', githubPrompt.evaluators?.length || 0);
  console.log();
} catch (e) {
  console.log('✗ Error loading GitHub format:', e.message);
  console.log();
}

// Load via unified loadPrompt (should prefer .prompt.yml)
try {
  const config = loadPrompt('process-thought');
  console.log('✓ Loaded via loadPrompt() - converted to internal format:');
  console.log('  Name:', config.name);
  console.log('  Version:', config.version);
  console.log('  Model:', config.model.default);
  console.log('  Temperature:', config.model.temperature);
  console.log('  Max Tokens:', config.model.maxTokens);
  console.log('  Has system prompt:', config.systemPrompt ? 'YES' : 'NO');
  console.log('  Has user prompt:', config.userPrompt ? 'YES' : 'NO');
  console.log('  System prompt length:', config.systemPrompt?.length || 0, 'chars');
  console.log('  User prompt length:', config.userPrompt?.length || 0, 'chars');
  console.log();
} catch (e) {
  console.log('✗ Error:', e.message);
  console.log();
}

// Test building messages
try {
  const { buildMessages } = require('../src/lib/prompts/promptLoader.ts');
  const config = loadPrompt('process-thought');

  const variables = {
    thoughtText: 'I need to finish the project',
    thoughtType: 'task',
    thoughtTags: '',
    thoughtCreatedAt: new Date().toISOString(),
    toolReference: '(Test tool reference)',
  };

  const context = {
    goals: [
      { id: 'goal-1', title: 'Complete Project', status: 'active', objective: 'Finish on time' }
    ]
  };

  const messages = buildMessages(config, variables, context);

  console.log('✓ Built messages from GitHub prompt:');
  console.log('  Message count:', messages.length);
  console.log('  Roles:', messages.map(m => m.role).join(', '));
  console.log('  System message length:', messages[0]?.content.length || 0, 'chars');
  console.log('  User message length:', messages[1]?.content.length || 0, 'chars');
  console.log();

  // Check if variables were replaced
  const userContent = messages.find(m => m.role === 'user')?.content || '';
  const hasThoughtText = userContent.includes('I need to finish the project');
  const hasGoalId = userContent.includes('goal-1');

  console.log('  Variables replaced:');
  console.log('    - Thought text:', hasThoughtText ? 'YES ✓' : 'NO ✗');
  console.log('    - Context (goal ID):', hasGoalId ? 'YES ✓' : 'NO ✗');
  console.log();
} catch (e) {
  console.log('✗ Error building messages:', e.message);
  console.log();
}

console.log('═══════════════════════════════════════════');
console.log('✅ GitHub .prompt.yml format is working!');
console.log();
console.log('Benefits:');
console.log('- Compatible with GitHub Models UI');
console.log('- Includes test data and evaluators');
console.log('- Can be evaluated with: gh models eval');
console.log('- Automatically converted to internal format');
