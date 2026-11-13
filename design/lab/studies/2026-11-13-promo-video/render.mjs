// Renders stage.html frame by frame (window.render(t)) in headless Chromium and encodes the video with ffmpeg.
//   node render.mjs --stills 1,5,9          PNG stills to out/stills/
//   node render.mjs                         out/promo-silent.mp4 (1080x1920, 30 fps), then the mix:
//                                           out/promo.mp4 with out/music.wav and, when present, out/vo.wav
// Run capture.mjs and `python3 music.py out/music.wav 42` first.
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const OUT = join(HERE, 'out');
const STAGE = join(OUT, 'stage');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const FPS = 30;
const DURATION = 42;

const fontDir = dirname(require.resolve('@expo-google-fonts/rubik/package.json', { paths: [ROOT] }));
mkdirSync(join(STAGE, 'fonts'), { recursive: true });
for (const weight of ['400Regular', '500Medium', '600SemiBold', '700Bold', '800ExtraBold'])
  copyFileSync(join(fontDir, weight, `Rubik_${weight}.ttf`), join(STAGE, 'fonts', `Rubik_${weight}.ttf`));
copyFileSync(join(ROOT, 'design', 'jew365-concepts', 'vector', 'mark-o.svg'), join(STAGE, 'logo.svg'));
copyFileSync(join(HERE, 'stage.html'), join(STAGE, 'index.html'));
spawnSync('cp', ['-r', join(OUT, 'screens'), STAGE]);

const args = process.argv.slice(2);
const stills = args[0] === '--stills' ? args[1].split(',').map(Number) : null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto('file://' + join(STAGE, 'index.html'));
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
});
const stage = page.locator('#stage');

if (stills) {
  mkdirSync(join(OUT, 'stills'), { recursive: true });
  for (const t of stills) {
    await page.evaluate((t) => window.render(t), t);
    await stage.screenshot({ path: join(OUT, 'stills', `t${String(t).padStart(5, '0')}.png`) });
  }
  await browser.close();
  console.log('stills written');
  process.exit(0);
}

const silent = join(OUT, 'promo-silent.mp4');
const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
const frames = FPS * DURATION;
for (let f = 0; f < frames; f++) {
  await page.evaluate((t) => window.render(t), f / FPS);
  const jpg = await stage.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 150 === 0) console.log(`frame ${f}/${frames}`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();

// The mix: the music under the voice, ducked while it speaks (sidechain), or alone at full level.
const vo = join(OUT, 'vo.wav');
const music = join(OUT, 'music.wav');
const final = join(OUT, 'promo.mp4');
const mix = existsSync(vo)
  ? ['-i', silent, '-i', music, '-i', vo, '-filter_complex',
     '[2:a]aformat=channel_layouts=stereo,volume=1.0,asplit=2[v1][v2];[1:a][v1]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[m];[m][v2]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5[a]',
     '-map', '0:v', '-map', '[a]']
  : ['-i', silent, '-i', music, '-filter_complex', '[1:a]loudnorm=I=-16:TP=-1.5[a]', '-map', '0:v', '-map', '[a]'];
const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...mix, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', final], { stdio: 'inherit' });
console.log(r.status === 0 ? `wrote ${final}${existsSync(vo) ? ' (with voice)' : ' (music only)'}` : 'mix failed');
