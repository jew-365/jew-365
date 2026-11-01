// Writes the gallery page out/site/index.html from fonts.json and site-template.html.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fonts = JSON.parse(readFileSync(join(here, 'fonts.json'), 'utf8'));
for (const f of fonts) for (const k of ['id', 'letter', 'badge', 'he', 'en', 'pkg', 'gf', 'mood', 'roles', 'pros', 'cons']) if (!f[k]) throw new Error(`${f.id}: missing ${k}`);
const families = ['Heebo:wght@400;600;700;800;900', ...fonts.map((f) => f.gf)];
const html = readFileSync(join(here, 'site-template.html'), 'utf8')
  .replace('__FAMILIES__', [...new Set(families)].map((g) => `family=${g}`).join('&'))
  .replace('__FONTS__', JSON.stringify(fonts));
mkdirSync(join(here, 'out', 'site'), { recursive: true });
writeFileSync(join(here, 'out', 'site', 'index.html'), html);
console.log(`wrote out/site/index.html with ${fonts.length} fonts`);
