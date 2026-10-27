import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [study, board, hash = '', out, port = '8096', height = '3200'] = process.argv.slice(2);
if (!study || !board || !out) {
  console.error('usage: node design/lab/tools/shot.mjs <study folder> <Board> "<hash without #>" <out.png> [port of the design-site server] [height]');
  process.exit(2);
}
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const h = ['tall=1', hash].filter(Boolean).join('&');
const url = `http://127.0.0.1:${port}/lab/studies/${study}/out/project/${board}.dc.html#${h}`;
const target = resolve(out);
if (existsSync(target)) rmSync(target);
mkdirSync(join(target, '..'), { recursive: true });
for (let i = 1; i <= 4; i++) {
  const prof = mkdtempSync(join(tmpdir(), 'edge-shot-'));
  spawnSync(edge, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-device-scale-factor=1', `--window-size=420,${height}`, '--virtual-time-budget=7000', `--user-data-dir=${prof}`, `--screenshot=${target}`, url], { stdio: 'ignore', timeout: 60000 });
  const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  for (let w = 0; w < 40 && !(existsSync(target) && statSync(target).size > 20000); w++) sleep(500);
  sleep(600);
  try { rmSync(prof, { recursive: true, force: true }); } catch {}
  if (existsSync(target) && statSync(target).size > 20000) {
    console.log('ok', target, statSync(target).size);
    process.exit(0);
  }
  console.log('retry', i);
}
console.error('failed to capture', url);
process.exit(1);
