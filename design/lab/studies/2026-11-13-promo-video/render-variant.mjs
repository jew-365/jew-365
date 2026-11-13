// Renders one round 3 variant of engine.html: the timeline is laid out from the real length of each narration line
// (out/vo/<voice>/<variant>.json, written by tts_vox.py), then frames are captured in headless Chromium, encoded,
// and mixed with the narration and music shaped to the same timeline.
//   node render-variant.mjs <variant> <voice> [--stills 1,5,9 | --mix-only]
// Writes out/promo-<variant>-<voice>.mp4 (or PNG stills to out/stills-<variant>/).
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const OUT = join(HERE, 'out');
const STAGE = join(OUT, 'stage3');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const FPS = 30;
const LEAD = 0.3; // narration starts this long into its beat
const TAIL = 0.45; // and the beat lasts this long after it

const [variant, voice] = process.argv.slice(2);
const stillsArg = process.argv.indexOf('--stills');
const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(',').map(Number) : null;
const data = JSON.parse(readFileSync(join(HERE, 'variants.json'), 'utf8'))[variant];
const voDir = join(OUT, 'vo', voice);
const lengths = existsSync(join(voDir, `${variant}.json`))
  ? JSON.parse(readFileSync(join(voDir, `${variant}.json`), 'utf8')).map((l) => l.seconds)
  : data.beats.map((b) => b.vo.split(/\s+/).length / 2.6);

let t = 0;
const beats = data.beats.map((b, i) => {
  const dur = Math.max(b.min, lengths[i] + LEAD + TAIL);
  const beat = { ...b, start: +t.toFixed(3), dur: +dur.toFixed(3), voStart: +(t + LEAD).toFixed(3), voLen: lengths[i] };
  t += dur;
  return beat;
});
const plan = { variant, voice, duration: +(t + 0.6).toFixed(3), beats };

mkdirSync(join(STAGE, 'fonts'), { recursive: true });
const fontDir = dirname(require.resolve('@expo-google-fonts/rubik/package.json', { paths: [ROOT] }));
for (const weight of ['400Regular', '500Medium', '600SemiBold', '700Bold', '800ExtraBold'])
  copyFileSync(join(fontDir, weight, `Rubik_${weight}.ttf`), join(STAGE, 'fonts', `Rubik_${weight}.ttf`));
copyFileSync(join(ROOT, 'design', 'jew365-concepts', 'vector', 'mark-o.svg'), join(STAGE, 'logo.svg'));
copyFileSync(join(HERE, 'engine.html'), join(STAGE, 'index.html'));
copyFileSync(join(HERE, 'characters.js'), join(STAGE, 'characters.js'));
writeFileSync(join(STAGE, 'plan.js'), `window.PLAN = ${JSON.stringify(plan)};`);
spawnSync('cp', ['-r', join(OUT, 'screens'), STAGE]);

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
  const dir = join(OUT, `stills-${variant}`);
  mkdirSync(dir, { recursive: true });
  for (const s of stills) {
    await page.evaluate((s) => window.render(s), s);
    await stage.screenshot({ path: join(dir, `t${String(s.toFixed(1)).padStart(5, '0')}.png`) });
  }
  await browser.close();
  console.log(JSON.stringify(beats.map((b) => [b.scene, b.start, b.dur])));
  process.exit(0);
}

const silent = join(OUT, `silent-${variant}.mp4`);
if (!process.argv.includes('--mix-only')) {
  const ff = spawn(
    'ffmpeg',
    [
      '-loglevel',
      'error',
      '-y',
      '-f',
      'image2pipe',
      '-framerate',
      String(FPS),
      '-c:v',
      'mjpeg',
      '-i',
      '-',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '19',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      silent,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const frames = Math.round(plan.duration * FPS);
  for (let f = 0; f < frames; f++) {
    await page.evaluate((s) => window.render(s), f / FPS);
    const jpg = await stage.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 300 === 0) console.log(`${variant}: frame ${f}/${frames}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
}
await browser.close();

// Music shaped to this timeline: the build starts on the second beat, the full beat on the middle one, the calm
// on Shabbat (or on the "before" beat), the outro on the end card; a bell on each beat's first notification.
const at = (scene) => beats.find((b) => b.scene === scene);
const end = at('end');
const calm = at('friday') ? at('friday').start + at('friday').dur * 0.5 : at('beforeMiss') ? 0 : end.start - 0.01;
const calmEnd = at('beforeMiss') ? at('beforeMiss').start + at('beforeMiss').dur : end.start;
const second = beats[1].start;
const music = join(OUT, `music-${variant}.wav`);
const opts = at('beforeMiss')
  ? [
      `arp=${calmEnd}`,
      `kick=${calmEnd + 2}`,
      `bass=${calmEnd + 3}`,
      `full=${calmEnd + 6}`,
      'calmA=0',
      `calmB=${calmEnd}`,
      `outro=${end.start}`,
    ]
  : [
      `arp=${second}`,
      `kick=${second + 3}`,
      `bass=${second + 6}`,
      `full=${beats[Math.floor(beats.length / 2)].start}`,
      `calmA=${calm}`,
      `calmB=${end.start}`,
      `outro=${end.start}`,
    ];
const bells = beats
  .filter((b) => b.notif || b.notifs)
  .map((b) => (b.start + (b.notifs ? b.notifs[0].at : 0.7)).toFixed(2));
bells.push(end.start.toFixed(2));
spawnSync('python3', [join(HERE, 'music.py'), music, String(plan.duration), ...opts, `bells=${bells.join(',')}`], {
  stdio: 'inherit',
});

// The narration track: each line at its start.
const vo = join(OUT, `vo-${variant}-${voice}.wav`);
const inputs = beats.flatMap((b, i) => ['-i', join(voDir, `${variant}-${i}.wav`)]);
const delays = beats
  .map(
    (b, i) =>
      `[${i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(b.voStart * 1000)}|${Math.round(b.voStart * 1000)}[v${i}]`,
  )
  .join(';');
spawnSync(
  'ffmpeg',
  [
    '-loglevel',
    'error',
    '-y',
    ...inputs,
    '-filter_complex',
    `${delays};${beats.map((_, i) => `[v${i}]`).join('')}amix=inputs=${beats.length}:normalize=0[a]`,
    '-map',
    '[a]',
    vo,
  ],
  { stdio: 'inherit' },
);

const final = join(OUT, `promo-${variant}-${voice}.mp4`);
const r = spawnSync(
  'ffmpeg',
  [
    '-loglevel',
    'error',
    '-y',
    '-i',
    silent,
    '-i',
    music,
    '-i',
    vo,
    '-filter_complex',
    '[2:a]aformat=channel_layouts=stereo,volume=1.15,apad,asplit=2[v1][v2];[1:a]volume=0.8[mm];[mm][v1]sidechaincompress=threshold=0.03:ratio=8:attack=15:release=350[m];[m][v2]amix=inputs=2:normalize=0,loudnorm=I=-15:TP=-1.5[a]',
    '-map',
    '0:v',
    '-map',
    '[a]',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-shortest',
    final,
  ],
  { stdio: 'inherit' },
);
console.log(r.status === 0 ? `wrote ${final} (${plan.duration}s)` : 'mix failed');
