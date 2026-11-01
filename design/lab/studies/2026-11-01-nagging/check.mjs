// The study's check, after `node build.mjs` and `node assemble.mjs`: serves out/ on a free local port, opens every
// board in headless Chromium (Playwright), drives its controls and asserts what the spec says they do, then opens the
// gallery at 430 and 1100 points (no sideways page scroll, the controls bar sticky only at 1100, every phone
// rendered) and fails on any console error. It closes the browser and the server it started.
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

  let p = await open('LevelSegmented', 'level=1');
  await p.click('.seg button:nth-child(4)');
  await wait(p);
  expect('א: level 4 names it and counts 48 a day', /נודניק:.*כ-48/.test(await text(p, '.nagset')));
  await p.close();

  p = await open('LevelDots', 'level=1');
  await p.click('.meter .dot:nth-of-type(2)');
  await wait(p);
  expect('ב: the second dot is level 2, 24 a day', /עדין.*כ-24/.test(await text(p, '.nagset')));
  await p.close();

  p = await open('LevelExample', 'level=1');
  await p.fill('#nl-range', '4');
  await wait(p);
  expect('ג: at level 4 each example row holds the main and three repeats', (await p.$$eval('.ex-times', (r) => r.map((x) => x.children.length))).every((n) => n === 4));
  await p.close();

  p = await open('MitzvahLevel', 'm=shacharit');
  expect('ד: the level row reads the override and its estimate', (await text(p, '.lvrow')).includes('בינוני (3) · כ-6'));
  await p.click('.lvrow');
  await wait(p);
  expect('ד: the sheet has like-the-app and four levels', (await p.$$('.saction')).length === 5);
  await p.click('.saction:nth-child(5)');
  await wait(p);
  expect('ד: נודניק writes the override and the rows follow', (await text(p, '.lvrow')).includes('נודניק (4) · כ-8') && /עוד 3, כל 5 דק׳ אחרי.*עוד 3, כל 5 דק׳ לפני/.test(await text(p, '.rlist')));
  await p.close();

  p = await open('MitzvahLevel', 'm=shacharit&demo=mixed');
  expect('ד: a custom nag line and a "בלי נודניק" line', /נודניק: עוד 3.*בלי נודניק/.test(await text(p, '.rlist')));
  await p.close();

  p = await open('ReminderNag', 'demo=drop');
  expect('ה: two repeats after the end, in the urgent colour', (await p.$$('.nag .pv-drop')).length === 2);
  await p.click('.nag .stepper button:last-child');
  await p.click('.nag .stepper button:last-child');
  await p.click('.nag .stepper button:last-child', { force: true });
  await wait(p);
  expect('ה: the count stops at 5', (await text(p, '.nag .stepper .val')) === '5');
  await p.close();

  p = await open('ReminderNag', 'm=krias_shma_al_hamita');
  expect('ה: the bedtime Shema shows the before-only line', (await text(p, '.nag')).includes('החזרות באות רק לפני השעה הזו'));
  await p.close();

  p = await open('CustomForm', 'level=1');
  await p.click('.form > .select');
  await wait(p);
  await p.click('.saction:nth-child(4)');
  await wait(p);
  const cards = await p.$$('.rcard');
  expect('ו: level 3 gives the first card two repeats after 21:00', ((await cards[0].$eval('.preview', (e) => e.textContent).catch(() => '')) || '').includes('21:05 · 21:10'));
  expect('ו: the follow-up card drops the repeat at the end', ((await cards[1].$eval('.preview', (e) => e.textContent).catch(() => '')) || '').includes('22:00 עוד לפני סוף הזמן'));
  await p.close();

  p = await open('TrayChain', 'm=shacharit');
  expect('ז: the tray opens with the main and its first repeat', (await p.$$('.ntf')).length === 2 && (await text(p, '.shade-scroll')).includes('תזכורת 1 מתוך 2'));
  await p.click('.ntf .n-acts button:nth-child(2)');
  await p.waitForTimeout(700);
  expect('ז: one "עשיתי" clears the tray and cancels the waiting repeat', (await p.$$('.ntf')).length === 0 && (await text(p, '.pending')).includes('בוטלה'));
  await p.close();

  for (const width of [430, 1100]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', (e) => errors.push(`site@${width}: ${e}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`site@${width}: ${m.text()}`));
    await page.goto(`${base}site/index.html`);
    await page.waitForTimeout(3000);
    const m = await page.evaluate(() => ({
      wide: document.documentElement.scrollWidth,
      bar: getComputedStyle(document.querySelector('.bar')).position,
      phones: [...document.querySelectorAll('iframe')].every((f) => f.contentDocument && f.contentDocument.querySelector('.ph')),
      rows: [...document.querySelectorAll('.bar-row')].every((r) => r.getBoundingClientRect().height < 60),
    }));
    expect(`site@${width}: no sideways scroll`, m.wide <= width);
    expect(`site@${width}: controls bar ${width < 900 ? 'not sticky' : 'sticky'}`, (m.bar === 'sticky') === width >= 900);
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
