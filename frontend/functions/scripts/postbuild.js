const fs = require('fs');
const path = require('path');

const libDir = path.join(__dirname, '..', 'lib');
const entryPath = path.join(libDir, 'index.js');
const compiledEntry = './functions/src/index.js';

// Create lib directory
fs.mkdirSync(libDir, { recursive: true });

// Create entry point that re-exports compiled index
const fileContents = `module.exports = require('${compiledEntry}');\n`;
fs.writeFileSync(entryPath, fileContents, 'utf8');

// Copy prompts from root /prompts/ to lib/prompts/
const rootPromptsDir = path.join(__dirname, '..', '..', '..', 'prompts');
const libPromptsDir = path.join(libDir, 'prompts');

if (fs.existsSync(rootPromptsDir)) {
  fs.mkdirSync(libPromptsDir, { recursive: true });

  const promptFiles = fs.readdirSync(rootPromptsDir);
  for (const file of promptFiles) {
    if (file.endsWith('.yml') || file.endsWith('.yaml')) {
      const src = path.join(rootPromptsDir, file);
      const dest = path.join(libPromptsDir, file);
      fs.copyFileSync(src, dest);
      console.log(`Copied prompt: ${file}`);
    }
  }
  console.log(`Copied ${promptFiles.filter(f => f.endsWith('.yml') || f.endsWith('.yaml')).length} prompt files to lib/prompts/`);
} else {
  console.warn('Warning: prompts directory not found at', rootPromptsDir);
}
