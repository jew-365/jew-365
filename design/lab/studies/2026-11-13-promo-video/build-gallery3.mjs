// Writes the round 3 page to out/site: gallery3.html with the characters, the variants and the cuts inlined,
// each cut at 720 px (video/<variant>.mp4), and each voice's "day" narration over its music (audio/<voice>.mp3),
// laid out on the same timeline rule as render-variant.mjs.
// Run after tts_vox.py and render-variant.mjs. Publish with root out/site and file_path out/site/index.html.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const SITE = join(OUT, 'site');
const CUT_VOICE = process.argv[2] ?? 'warm';
rmSync(SITE, { recursive: true, force: true });
mkdirSync(join(SITE, 'audio'), { recursive: true });
mkdirSync(join(SITE, 'video'), { recursive: true });
const variants = JSON.parse(readFileSync(join(HERE, 'variants.json'), 'utf8'));
const ff = (args) => {
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed: ' + args.join(' '));
};
const seconds = (file) =>
  Number(
    spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).stdout.toString(),
  );

const cuts = [];
for (const id of Object.keys(variants)) {
  const src = join(OUT, `promo-${id}-${CUT_VOICE}.mp4`);
  if (!existsSync(src)) continue;
  ff([
    '-i',
    src,
    '-vf',
    'scale=720:-2',
    '-c:v',
    'libx264',
    '-crf',
    '25',
    '-preset',
    'slow',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    join(SITE, 'video', `${id}.mp4`),
  ]);
  cuts.push({ id, seconds: seconds(src) });
}

for (const voice of ['warm', 'deep', 'lively', 'woman']) {
  const index = join(OUT, 'vo', voice, 'day.json');
  if (!existsSync(index)) continue;
  const lines = JSON.parse(readFileSync(index, 'utf8'));
  let t = 0;
  const starts = variants.day.beats.map((b, i) => {
    const s = t + 0.3;
    t += Math.max(b.min, lines[i].seconds + 0.75);
    return s;
  });
  const music = join(OUT, `music-sample.wav`);
  spawnSync('python3', [
    join(HERE, 'music.py'),
    music,
    String(t + 0.6),
    `arp=${starts[1]}`,
    `kick=${starts[1] + 3}`,
    `full=${starts[4]}`,
    `calmA=${starts[7] + 3}`,
    `calmB=${starts[8]}`,
    `outro=${starts[8]}`,
  ]);
  const inputs = lines.flatMap((_, i) => ['-i', join(OUT, 'vo', voice, `day-${i}.wav`)]);
  const delays = lines
    .map(
      (_, i) =>
        `[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(starts[i] * 1000)}|${Math.round(starts[i] * 1000)}[v${i}]`,
    )
    .join(';');
  ff([
    '-i',
    music,
    ...inputs,
    '-filter_complex',
    `${delays};${lines.map((_, i) => `[v${i}]`).join('')}amix=inputs=${lines.length}:normalize=0,asplit=2[n1][n2];[0:a]volume=0.8[mm];[mm][n1]sidechaincompress=threshold=0.03:ratio=8:attack=15:release=350[m];[m][n2]amix=inputs=2:normalize=0,loudnorm=I=-15:TP=-1.5[a]`,
    '-map',
    '[a]',
    '-c:a',
    'libmp3lame',
    '-b:a',
    '128k',
    join(SITE, 'audio', `${voice}.mp3`),
  ]);
}

const page = readFileSync(join(HERE, 'gallery3.html'), 'utf8')
  .replace('/*CHARACTERS*/', () => readFileSync(join(HERE, 'characters.js'), 'utf8'))
  .replace('/*VARIANTS*/{}', () => JSON.stringify(variants))
  .replace('/*CUTS*/[]', () => JSON.stringify(cuts));
writeFileSync(join(SITE, 'index.html'), page);
console.log('wrote', SITE, cuts);
