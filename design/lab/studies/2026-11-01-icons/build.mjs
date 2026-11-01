// Writes the gallery page into out/site/index.html from icons.mjs (the new set), today.json (today's
// drawings, from gen-today.mjs) and site-template.html.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONS } from './icons.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const today = JSON.parse(readFileSync(join(here, 'today.json'), 'utf8'));
const FILL = '__FILL__';
const data = ICONS.map((i) => {
  if (!today[i.id]) throw new Error(`${i.id}: not an icon of MitzvahIcon.tsx`);
  for (const k of ['he', 'idea']) if (!i[k]) throw new Error(`${i.id}: missing ${k}`);
  return { id: i.id, he: i.he, idea: i.idea, now: today[i.id], next: i.draw(FILL).trim() };
});
const html = readFileSync(join(here, 'site-template.html'), 'utf8').replace('__ICONS__', JSON.stringify(data));
mkdirSync(join(here, 'out', 'site'), { recursive: true });
writeFileSync(join(here, 'out', 'site', 'index.html'), html);
console.log(`wrote out/site/index.html with ${data.length} icons`);
