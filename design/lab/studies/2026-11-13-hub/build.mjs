// Writes the build output's site/index.html from site-template.html and data.json (written by gen-data.mjs from the
// app's own code: palettes, strings, the capability list with a fresh install's states, the offers, today's More tab,
// a sample day's windows and the icon drawings).
//   TZ=Asia/Jerusalem node --import ./ts-loader/register.mjs gen-data.mjs && node build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const data = readFileSync(join(here, 'data.json'), 'utf8');
const html = readFileSync(join(here, 'site-template.html'), 'utf8').replace('__DATA__', () => JSON.stringify(JSON.parse(data)));
mkdirSync(join(here, 'out', 'site'), { recursive: true });
writeFileSync(join(here, 'out', 'site', 'index.html'), html);
console.log(`wrote out/site/index.html (${Math.round(html.length / 1024)} KB)`);
