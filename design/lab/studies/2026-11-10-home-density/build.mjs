// Builds each size arrangement of variants.mjs as the real app: a copy of the repository beside it, in
// ../jew-365-density-app (outside the repository, so its tests, docs and sources stay out of Jest, Metro and the
// DOX check; its
// node_modules hard-linked, src a real copy), the variant's edits applied to that copy's src, a web export, and
// home captured by the store screenshot script (its seeded install and pinned clock) at 400x800 and 402x874.
// The repository's own src is never written. Usage: node build.mjs [--only id,id] [--at HH:MM]; --at captures at
// another hour of the same day (into shots/<id>@HHMM), through a copy of the screenshot script in the app copy.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VARIANTS, editsFor } from './variants.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..', '..', '..', '..');
const OUT = join(here, 'out');
const APP = resolve(ROOT, '..', 'jew-365-density-app');
const SKIP = new Set(['node_modules', '.git', 'dist', 'design', 'docs', '.claude', 'release', '.expo', '.agents', '.github', '.husky']);
const SETS = 'appstore-he,play-he';

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed`);
}

function prepare() {
  if (!existsSync(join(APP, 'node_modules'))) {
    mkdirSync(APP, { recursive: true });
    for (const name of readdirSync(ROOT)) {
      if (!SKIP.has(name)) cpSync(join(ROOT, name), join(APP, name), { recursive: true });
    }
    // Hard links: no second copy of the packages on disk; nothing in the build writes into them.
    run('cp', ['-al', join(ROOT, 'node_modules'), join(APP, 'node_modules')], ROOT);
  }
  rmSync(join(APP, 'src'), { recursive: true, force: true });
  cpSync(join(ROOT, 'src'), join(APP, 'src'), { recursive: true });
}

function apply(edits) {
  for (const { file, from, to } of edits) {
    const path = join(APP, file);
    const text = readFileSync(path, 'utf8');
    if (text.split(from).length !== 2) throw new Error(`${file} does not hold exactly one: ${from.slice(0, 80)}`);
    writeFileSync(path, text.replace(from, () => to));
  }
}

const arg = (flag) => (process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : null);
const only = arg('--only')?.split(',') ?? null;
const at = arg('--at');
if (at && !/^\d\d:\d\d$/.test(at)) throw new Error('--at takes HH:MM');
for (const v of VARIANTS.filter((x) => !only || only.includes(x.id))) {
  console.log(`\n=== ${v.id}: ${v.name}`);
  prepare();
  apply(editsFor(v.p));
  const dist = join(APP, 'dist-density', v.id);
  rmSync(dist, { recursive: true, force: true });
  run(process.execPath, [join(APP, 'node_modules', 'expo', 'bin', 'cli'), 'export', '-p', 'web', '--output-dir', dist], APP);
  const shots = join(OUT, 'shots', at ? `${v.id}@${at.replace(':', '')}` : v.id);
  rmSync(shots, { recursive: true, force: true });
  let script = join(ROOT, 'scripts', 'store', 'screenshots.mjs');
  if (at) {
    const from = "const NOW = { date: '2026-11-04', time: '15:40' };";
    const text = readFileSync(script, 'utf8');
    if (!text.includes(from)) throw new Error('the screenshot script lost its NOW');
    script = join(APP, 'scripts', 'store', 'screenshots-at.mjs');
    writeFileSync(script, text.replace(from, `const NOW = { date: '2026-11-04', time: '${at}' };`));
  }
  run(process.execPath, [script, '--dist', dist, '--out', shots, '--sets', SETS, '--screens', '1-home'], ROOT);
}
