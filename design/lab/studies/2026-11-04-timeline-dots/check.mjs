// The study's check, after `node build.mjs` and `node assemble.mjs`: serves out/ on a free local port, opens every
// board in headless Chromium (Playwright), holds its smart nag port to the app's own output in data.json for every
// mitzvah and level, drags a reminder and a nag, resets to the smart nag, adds a reminder, opens a notification's
// values and zooms in both palettes, then opens the gallery at 430 and 1100 points (no sideways page scroll, every
// phone rendered) and fails on any console error. It closes the browser and the server it started.
// Needs Playwright with Chromium: `require('playwright')` must resolve (NODE_PATH=$(npm root -g) for a global one).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'out');
const { chromium } = createRequire(import.meta.url)('playwright');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };

const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const file = join(out, path);
  if (!file.startsWith(out) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}/`;

const errors = [];
const failures = [];
const expect = (what, ok) => (ok ? console.log('ok  ', what) : (failures.push(what), console.log('FAIL', what)));
const browser = await chromium.launch();
try {
  const open = async (board, hash, width = 390) => {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    page.on('pageerror', (e) => errors.push(`${board}: ${e}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`${board}: ${m.text()}`));
    await page.goto(`${base}project/${board}.dc.html#${hash}`);
    await page.waitForTimeout(1000);
    return page;
  };
  const text = (page, sel) => page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
  const wait = (page) => page.waitForTimeout(350);

  const DATA = JSON.parse(readFileSync(join(here, 'data.json'), 'utf8'));
  const hm = (ms) => {
    const min = Math.round((((ms % 86400000) + 86400000) % 86400000) / 60000);
    return String(Math.floor(min / 60) % 24).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
  };
  const rowTimes = (page) => page.$$eval('.srow .s-time', (r) => r.map((x) => x.textContent.trim()));
  const BOARDS = ['Dots', 'Equalizer', 'Lanes'];

  // The boards' port of the smart nag against the app's own smartNagTimes(), for every mitzvah and level.
  for (const board of BOARDS) {
    let all = true;
    const p = await open(board, 'm=maariv&level=3');
    for (const m of Object.values(DATA.mitzvot)) {
      for (const level of [1, 2, 3, 4]) {
        await p.evaluate((h) => (location.hash = h), `m=${m.id}&level=${level}`);
        await p.waitForTimeout(150);
        const want = m.reminders
          .map((r) => r.at)
          .concat(m.expect[level].map((n) => n.at))
          .sort((a, b) => a - b)
          .map(hm);
        const got = await rowTimes(p);
        if (JSON.stringify(got) !== JSON.stringify(want)) {
          all = false;
          console.log('   ', board, m.id, level, 'got', got.join(' '), 'want', want.join(' '));
        }
      }
    }
    await p.close();
    expect(`${board}: every mitzvah at every level sends what the app's smartNagTimes() sends`, all);
  }

  // Dragging, the reset to the smart nag and adding a reminder, on each board.
  const dragBy = async (page, locator, dx) => {
    const b = await locator.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2, { steps: 6 });
    await page.mouse.up();
    await wait(page);
  };
  for (const board of BOARDS) {
    const p = await open(board, 'm=maariv&level=3');
    const before = await rowTimes(p);
    await dragBy(p, p.locator('[aria-label^="תזכורת 19:05"]'), -40);
    const after = await rowTimes(p);
    expect(`${board}: dragging a reminder moves it later and keeps the smart nag`, !after.includes('19:05') && (await p.$$('.manual')).length === 0);
    expect(`${board}: the nags follow the moved reminder`, JSON.stringify(before) !== JSON.stringify(after));
    await dragBy(p, p.locator('[aria-label^="נודניק"]').first(), 20);
    expect(`${board}: dragging a nag turns the smart nag off and offers the way back`, (await p.$$('.manual')).length === 1);
    await p.click('.manual .btn');
    await wait(p);
    expect(`${board}: "back to the smart nag" restores it`, (await p.$$('.manual')).length === 0);
    const count = (await rowTimes(p)).length;
    const axis = await p.locator('[data-axis]').boundingBox();
    await p.mouse.click(axis.x + axis.width * 0.5, axis.y + 6);
    await wait(p);
    expect(`${board}: a tap on an empty stretch adds a reminder`, (await rowTimes(p)).length === count + 1);
    await p.click('.srow >> nth=0');
    await wait(p);
    expect(`${board}: a tap on a notification opens its values`, (await text(p, '.detail')).includes('נשארו'));
    await p.close();
    for (const theme of ['gold', 'dark']) {
      const q = await open(board, `theme=${theme}&m=custom_study&level=4`);
      await q.click('.zoomchip');
      await wait(q);
      expect(`${board} ${theme}: zoomed on the custom mitzvah's critical time`, (await text(q, '.ends')).startsWith('17:'));
      await q.close();
    }
  }

  for (const width of [430, 1100]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', (e) => errors.push(`site@${width}: ${e}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`site@${width}: ${m.text()}`));
    await page.goto(`${base}site/index.html`);
    await page.waitForTimeout(3000);
    const m = await page.evaluate(() => ({
      wide: document.documentElement.scrollWidth,
      phones: [...document.querySelectorAll('iframe')].every((f) => f.contentDocument && f.contentDocument.querySelector('.ph')),
      rows: [...document.querySelectorAll('.bar-row')].every((r) => r.getBoundingClientRect().height < 60),
    }));
    expect(`site@${width}: no sideways scroll`, m.wide <= width);
    expect(`site@${width}: each control row is one line`, m.rows);
    expect(`site@${width}: every phone rendered`, m.phones);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (errors.length) console.log('console errors:\n' + errors.join('\n'));
if (failures.length || errors.length) process.exit(1);
console.log('all checks passed');
