import fs from 'fs';

const indexContent = fs.readFileSync('api/index.ts', 'utf8');
const lines = indexContent.split('\n');

const imports = [];
const rest = [];

for (const line of lines) {
  if (line.startsWith('import ')) {
    imports.push(line);
  } else {
    rest.push(line);
  }
}

const newContent = imports.join('\n') + '\n\n' + rest.join('\n');
fs.writeFileSync('api/index.ts', newContent);
console.log('Imports moved to top');
