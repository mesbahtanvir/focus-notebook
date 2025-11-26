const fs = require('fs');
const path = require('path');

const libDir = path.join(__dirname, '..', 'lib');
const entryPath = path.join(libDir, 'index.js');
const compiledEntry = './functions/src/index.js';

fs.mkdirSync(libDir, { recursive: true });

const fileContents = `module.exports = require('${compiledEntry}');\n`;

fs.writeFileSync(entryPath, fileContents, 'utf8');
