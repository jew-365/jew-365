// Captures the real app screens the promo video shows: the web export served with the store screenshots'
// seed (a married man in Jerusalem, nusach Sefard, 30 days of marks), each screen at its own Jerusalem time.
// Usage: node capture.mjs <web export dir>   (writes out/screens/*.png and out/screens/text.json)
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  grantNotificationsInBundle,
  inJerusalem,
  NOW,
  pageSetup,
  seedStores,
  serve,
} from '../../../../scripts/store/screenshots.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out', 'screens');
const { chromium } = createRequire(import.meta.url)('playwright');

const DAY = NOW.date; // Wednesday 2026-11-04
const MORNING_DONE = ['tefillin', 'krias_shma_shacharit', 'shacharit'];
const SHOTS = [
  { name: 'home-morning', path: '/home', date: DAY, time: '08:17', done: [] },
  { name: 'home-done', path: '/home', date: DAY, time: '08:24', done: MORNING_DONE },
  { name: 'reader', path: '/siddur/shacharit', date: DAY, time: '08:18', done: [], full: true },
  { name: 'siddur-tab', path: '/siddur', date: DAY, time: '07:22', done: [] },
  { name: 'history', path: '/history', date: DAY, time: '21:10', done: MORNING_DONE },
  { name: 'schedule', path: '/schedule', date: DAY, time: '12:00', done: MORNING_DONE },
  { name: 'compass', path: '/compass', date: DAY, time: '12:00', done: MORNING_DONE },
  { name: 'hilula', path: '/hilula/rashbi', date: DAY, time: '12:00', done: MORNING_DONE },
  { name: 'shabbat', path: '/home', date: '2026-11-06', time: '17:40', done: MORNING_DONE },
];

// The store seed with today's marks replaced by the shot's own.
function seedFor(shot) {
  const seed = seedStores('he');
  const key = 'jew-365\\completions-store';
  const stored = JSON.parse(seed[key]);
  const marks = {};
  MORNING_DONE.filter((id) => shot.done.includes(id)).forEach((id, i) => (marks[id] = inJerusalem(DAY, '08:18', i * 2)));
  stored.state.completions[DAY] = marks;
  seed[key] = JSON.stringify(stored);
  return seed;
}

const dist = resolve(process.argv[2] ?? '');
const work = mkdtempSync(join(tmpdir(), 'promo-'));
cpSync(dist, join(work, 'served'), { recursive: true });
grantNotificationsInBundle(join(work, 'served'));
const { server, origin } = await serve(join(work, 'served'));
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const text = {};
try {
  for (const shot of SHOTS) {
    const context = await browser.newContext({
      viewport: { width: 400, height: 866 },
      deviceScaleFactor: 2.7,
      isMobile: true,
      hasTouch: true,
      locale: 'he-IL',
      timezoneId: 'Asia/Jerusalem',
      reducedMotion: 'reduce',
      colorScheme: 'light',
      geolocation: { latitude: 31.7683, longitude: 35.2137 },
      permissions: ['geolocation'],
    });
    await context.addInitScript(pageSetup(origin, seedFor(shot), inJerusalem(shot.date, shot.time)));
    const page = await context.newPage();
    page.on('pageerror', (error) => console.error(`${shot.name}: ${error.message}`));
    await page.goto(origin + shot.path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(3500);
    text[shot.name] = await page.evaluate(() => document.body.innerText);
    await page.screenshot({ path: join(OUT, `${shot.name}.png`) });
    if (shot.full) {
      // The reader scrolls inside its own ScrollView, so a page screenshot holds one screen: a tall viewport
      // lays out three screens of text at once, for the video to pan over.
      await page.setViewportSize({ width: 400, height: 2600 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: join(OUT, `${shot.name}-tall.png`) });
    }
    console.log(`captured ${shot.name}`);
    await context.close();
  }
  writeFileSync(join(OUT, 'text.json'), JSON.stringify(text, null, 1));
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
}
