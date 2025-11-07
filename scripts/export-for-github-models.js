/**
 * Export prompts for GitHub Models testing
 * Run with: node scripts/export-for-github-models.js [prompt-name]
 *
 * Examples:
 *   node scripts/export-for-github-models.js process-thought
 *   node scripts/export-for-github-models.js brainstorming
 *   node scripts/export-for-github-models.js spending-analysis
 */

const fs = require('fs');
const path = require('path');
const { exportPromptForGitHubModels, listPrompts } = require('../src/lib/prompts/promptLoader.ts');
const { generateTestDataForPrompt, formatThoughtForYAML } = require('../src/lib/prompts/testDataGenerator.ts');

const promptName = process.argv[2];

if (!promptName) {
  console.log('Usage: node scripts/export-for-github-models.js [prompt-name]\n');
  console.log('Available prompts:');
  listPrompts().forEach(p => console.log('  -', p));
  console.log('\nExample:');
  console.log('  node scripts/export-for-github-models.js process-thought');
  process.exit(1);
}

try {
  // Generate test data
  let variables = {};
  let context = {};

  try {
    const testData = generateTestDataForPrompt(promptName);
    if (promptName === 'process-thought') {
      const formatted = formatThoughtForYAML(testData);
      variables = formatted.variables;
      context = formatted.context;
    } else {
      variables = testData;
    }
  } catch (e) {
    console.warn('⚠ No test data generator for this prompt, using empty data');
  }

  // Export the prompt
  const exported = exportPromptForGitHubModels(promptName, variables, context);

  // Save to file
  const outputDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const outputFile = path.join(outputDir, `${promptName}-github-models.md`);
  fs.writeFileSync(outputFile, exported);

  console.log('✅ Prompt exported successfully!\n');
  console.log('File:', outputFile);
  console.log('Size:', exported.length, 'characters\n');
  console.log('Next steps:');
  console.log('1. Open the file above');
  console.log('2. Copy the System Message');
  console.log('3. Copy the User Prompt');
  console.log('4. Paste into GitHub Models interface');
  console.log('5. Configure model settings as specified');
  console.log('\nOr view in terminal:');
  console.log(`  cat ${outputFile}`);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
