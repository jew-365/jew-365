// Writes the gallery site to out/site: gallery.html with characters.js and the narration lines inlined,
// each voice mixed over the music as an MP3, and the latest cut at 720 px as video/draft2.mp4.
// Run after tts.py, music.py and render.mjs. Publish with root out/site and file_path out/site/index.html.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const SITE = join(OUT, 'site');
mkdirSync(join(SITE, 'audio'), { recursive: true });
mkdirSync(join(SITE, 'video'), { recursive: true });

const lines = readFileSync(join(HERE, 'vo.md'), 'utf8')
  .split('\n')
  .map((l) => l.match(/^\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/))
  .filter(Boolean)
  .map((m) => [Number(m[1]), Number(m[2]), m[4]]);
const page = readFileSync(join(HERE, 'gallery.html'), 'utf8')
  .replace('/*CHARACTERS*/', () => readFileSync(join(HERE, 'characters.js'), 'utf8'))
  .replace('/*LINES*/[]', () => JSON.stringify(lines));
writeFileSync(join(SITE, 'index.html'), page);

const ff = (args) => {
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed: ' + args.join(' '));
};
for (const voice of ['shaul', 'model']) {
  const vo = join(OUT, `vo-${voice}.wav`);
  if (!existsSync(vo)) continue;
  ff(['-i', join(OUT, 'music.wav'), '-i', vo, '-filter_complex',
    '[1:a]aformat=channel_layouts=stereo,asplit=2[v1][v2];[0:a][v1]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[m];[m][v2]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5[a]',
    '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', '128k', join(SITE, 'audio', `${voice}.mp3`)]);
}
const cut = join(OUT, 'jew365-promo-draft2-voice.mp4');
if (existsSync(cut))
  ff(['-i', cut, '-vf', 'scale=720:-2', '-c:v', 'libx264', '-crf', '24', '-preset', 'slow', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', join(SITE, 'video', 'draft2.mp4')]);
console.log('wrote', SITE);
