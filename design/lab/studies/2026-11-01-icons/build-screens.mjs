// Writes out/screens/index.html: the app's screens shot by shoot-app.cjs, embedded as images, for the owner.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = [
  ['_home', 'בית'], ['_siddur', 'סידור'], ['_more', 'עוד'], ['_mitzvot', 'המצוות שלי'],
  ['_mitzvah_tefillin', 'מסך מצווה: הנחת תפילין'], ['_settings', 'הגדרות'], ['_history', 'מעקב'],
  ['_home-dark', 'בית, ערכה כהה'], ['_siddur-dark', 'סידור, ערכה כהה'], ['_mitzvot-dark', 'המצוות שלי, ערכה כהה'], ['_more-dark', 'עוד, ערכה כהה'],
];
mkdirSync(join(here, 'out', 'screens'), { recursive: true });
const cards = SHOTS.map(([file, title]) => {
  const src = `/tmp/shots/${file}.png`;
  if (!existsSync(src)) throw new Error(`missing ${src}: run shoot-app.cjs first`);
  const small = `/tmp/shots/${file}.1x.png`;
  execFileSync('python3', ['-c', `from PIL import Image; im=Image.open('${src}'); im.resize((im.width//2, im.height//2)).save('${small}', optimize=True)`]);
  return `<figure><img src="data:image/png;base64,${readFileSync(small).toString('base64')}" alt="${title}" width="390" height="844"><figcaption>${title}</figcaption></figure>`;
}).join('\n');
writeFileSync(join(here, 'out', 'screens', 'index.html'), `<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>יהודי 365 עם האייקונים החדשים</title>
<style>
:root { --bg: #F6F1E8; --surface: #FFFDF9; --text: #1D2240; --sub: #69645D; --border: #EBE3D6; color-scheme: light; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: "Rubik", system-ui, sans-serif; }
.wrap { max-width: 1320px; margin: 0 auto; padding: 28px 20px 60px; display: grid; gap: 22px; }
h1 { margin: 0; font-size: 28px; text-wrap: balance; } p { margin: 0; color: var(--sub); line-height: 1.6; max-width: 72ch; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 22px; }
figure { margin: 0; display: grid; gap: 8px; justify-items: center; }
img { width: 100%; max-width: 390px; height: auto; border-radius: 28px; border: 6px solid var(--text); background: var(--surface); }
figcaption { font-weight: 600; font-size: 15px; }
</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700&display=swap">
</head><body><div class="wrap">
<h1>יהודי 365 עם האייקונים החדשים</h1>
<p>צילומי מסך של האפליקציה עצמה (גרסת הדפדפן, 390 על 844), עם סגנון ד׳ שבחרת: קווים דקים ומעוגלים עם מילוי עדין, והגופן רוביק. ירושלים, יום ראשון, כ״א חשוון תשפ״ז.</p>
<div class="grid">
${cards}
</div></div></body></html>
`);
console.log('wrote out/screens/index.html');
