// The study's check, with Playwright's Chromium (NODE_PATH=$(npm root -g) for a global install): every board in
// out/project opens at 390 x 844 for each of its demo hashes in dirs.json, in both palettes, with no page error,
// and the notification boards show at least one notification at 08:10 on both platforms; then the gallery in
// out/site opens at 430 and 1100 points with no sideways scroll and every phone's iframe present.
// The home boards print five console errors before the runtime fills their SVG attributes ({{sw}}, {{gx1}} and
// the rest), inherited from the 2026-10-29-home-ellipse board; console messages are not counted, page errors are.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)('playwright');
const dirs = JSON.parse(readFileSync(join(here, 'dirs.json'), 'utf8'));
const server = createServer((req, res) => {
  let f = join(here, 'out', decodeURIComponent(req.url.split('?')[0].split('#')[0]));
  if (f.endsWith('/')) f += 'index.html';
  if (!existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8' });
  createReadStream(f).pipe(res);
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch();
let fails = 0;
const fail = (m) => { fails++; console.log('FAIL', m); };
for (const d of dirs) {
  for (const theme of ['gold', 'dark']) {
    for (const demo of d.demos) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const errs = [];
      page.on('pageerror', (e) => errs.push(String(e)));
      await page.goto(`http://localhost:${port}/project/${d.board}.dc.html#theme=${theme}&${demo.hash}`);
      await page.waitForTimeout(900);
      if (errs.length) fail(`${d.board} ${theme} ${demo.hash}: ${errs[0]}`);
      if (d.surface === 'notif' && demo.hash === 'at=08:10') {
        for (const platform of ['android', 'iphone']) {
          await page.evaluate((p) => (location.hash = location.hash + '&platform=' + p), platform);
          await page.waitForTimeout(400);
          const n = await page.locator(platform === 'android' ? 'article.ntf' : 'article.ios').count();
          if (!n) fail(`${d.board} ${platform}: no notification at 08:10`);
        }
      }
      if (d.surface === 'home' && demo.hash === 'startTime=07:42') {
        const n = await page.locator('.nagi').count();
        if (theme === 'gold' && !n && d.board !== 'HomeOwnOnly') fail(`${d.board}: no level shown at 07:42`);
      }
      await page.close();
    }
  }
  console.log('ok', d.board);
}
for (const width of [430, 1100]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://localhost:${port}/site/index.html`);
  await page.waitForTimeout(1500);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw > width) fail(`gallery at ${width}: scrolls sideways (${sw})`);
  const frames = await page.locator('iframe[data-src]').count();
  if (frames !== dirs.length) fail(`gallery at ${width}: ${frames} phones of ${dirs.length}`);
  if (errs.length) fail(`gallery at ${width}: ${errs[0]}`);
  await page.close();
  console.log('ok gallery', width);
}
await browser.close();
server.close();
if (fails) process.exit(1);
console.log('all checks passed');
