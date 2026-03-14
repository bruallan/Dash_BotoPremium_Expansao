import fs from 'fs';

const rd = fs.readFileSync('api/services/rdStation.ts', 'utf8');
const ca = fs.readFileSync('api/services/contaAzul.ts', 'utf8');
let index = fs.readFileSync('api/index.ts', 'utf8');

// Remove imports
index = index.replace(/import \{ getDashboardData, getDealHistory \} from "\.\/services\/rdStation\.js";\n/, '');
index = index.replace(/import \{ getContasReceber, getContasPagar, getContasReceberPage, getContasPagarPage, getStoredTokens \} from "\.\/services\/contaAzul\.js";\n/, '');

// Remove axios imports from services
const rdClean = rd.replace(/import axios from "axios";\n/, '');
const caClean = ca.replace(/import axios from "axios";\nimport \{ createClient \} from "redis";\nimport nodemailer from "nodemailer";\n/, '');

const newImports = `import axios from "axios";\nimport { createClient } from "redis";\nimport nodemailer from "nodemailer";\n`;

const newIndex = newImports + rdClean + '\n' + caClean + '\n' + index;

fs.writeFileSync('api/index.ts', newIndex);
console.log('Merged successfully');
