// Captures the real app screens the promo video shows: the web export served with the store screenshots'
// seed (a married man in Jerusalem, nusach Sefard, 30 days of marks), each screen at its own Jerusalem time.
// Usage: node capture.mjs <web export dir> [set] [name,name]   (set: round1 or round3, default round1; writes out/screens/*.png
// and out/screens/text-<set>.json)
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
const FRIDAY = '2026-11-06';
const MOTZASH = '2026-11-07';
// marks made on the shot's own date, as id -> HH:MM
const MORNING = { tefillin: '08:18', krias_shma_shacharit: '08:20', shacharit: '08:22' };
const DAYTIME = { ...MORNING, mincha: '13:24' };
const EVENING = { ...DAYTIME, maariv: '18:40' };
const SETS = {
  // round 1: the first two drafts
  round1: [
    { name: 'home-morning', path: '/home', date: DAY, time: '08:17' },
    { name: 'home-done', path: '/home', date: DAY, time: '08:24', marks: MORNING },
    { name: 'reader', path: '/siddur/shacharit', date: DAY, time: '08:18', tall: true },
    { name: 'siddur-tab', path: '/siddur', date: DAY, time: '07:22' },
    { name: 'history', path: '/history', date: DAY, time: '21:10', marks: MORNING },
    { name: 'schedule', path: '/schedule', date: DAY, time: '12:00', marks: MORNING },
    { name: 'compass', path: '/compass', date: DAY, time: '12:00', marks: MORNING },
    { name: 'hilula', path: '/hilula/rashbi', date: DAY, time: '12:00', marks: MORNING },
    { name: 'shabbat', path: '/home', date: FRIDAY, time: '17:40', marks: MORNING },
  ],
  // round 3: a whole day and more of the app
  round3: [
    { name: 'home-dawn', path: '/home', date: DAY, time: '05:53' },
    { name: 'home-noon', path: '/home', date: DAY, time: '11:54', marks: MORNING },
    { name: 'home-sunset', path: '/home', date: DAY, time: '16:31', marks: MORNING },
    { name: 'home-night', path: '/home', date: DAY, time: '21:05', marks: EVENING },
    { name: 'home-friday', path: '/home', date: FRIDAY, time: '15:30', marks: MORNING },
    { name: 'reader-tefillin', path: '/siddur/tefillin', date: DAY, time: '06:12', tall: true },
    { name: 'reader-mincha', path: '/siddur/mincha', date: DAY, time: '13:21', tall: true },
    {
      name: 'reader-night',
      path: '/siddur/krias_shma_al_hamita',
      date: DAY,
      time: '21:06',
      marks: EVENING,
      tall: true,
    },
    { name: 'tehillim', path: '/siddur/tehillim', date: DAY, time: '12:00', marks: MORNING, tall: true },
    { name: 'settings-nag', path: '/settings?focus=nagLevel', date: DAY, time: '12:00', marks: MORNING },
    { name: 'settings-quiet', path: '/settings?focus=quietBefore', date: DAY, time: '12:00', marks: MORNING },
    {
      name: 'settings-search',
      path: '/settings',
      date: DAY,
      time: '12:00',
      marks: MORNING,
      type: 'תהלים',
      field: 'חיפוש: התראות',
    },
    { name: 'more', path: '/more', date: DAY, time: '12:00', marks: MORNING },
    { name: 'hilulot', path: '/hilulot', date: DAY, time: '12:00', marks: MORNING },
    { name: 'report', path: '/report?week=2026-10-31', date: DAY, time: '12:00', marks: MORNING },
    { name: 'achievements', path: '/history', date: DAY, time: '21:10', marks: EVENING, click: 'הישגים' },
    { name: 'trends', path: '/history?tab=trends', date: DAY, time: '21:10', marks: EVENING },
    { name: 'checkin', path: '/checkin', date: MOTZASH, time: '17:45' },
    { name: 'custom', path: '/custom-mitzvah', date: DAY, time: '12:00', marks: MORNING },
    { name: 'siddur-tab-noon', path: '/siddur', date: DAY, time: '13:20', marks: MORNING },
    { name: 'mitzvot', path: '/mitzvot', date: DAY, time: '12:00', marks: MORNING },
  ],
};

// The store seed with the shot day's marks replaced by the shot's own.
function seedFor(shot) {
  const seed = seedStores('he');
  const key = 'jew-365\\completions-store';
  const stored = JSON.parse(seed[key]);
  stored.state.completions[shot.date] = Object.fromEntries(
    Object.entries(shot.marks ?? {}).map(([id, time]) => [id, inJerusalem(shot.date, time)]),
  );
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
  const set = process.argv[3] ?? 'round1';
  const only = process.argv[4]?.split(',');
  for (const shot of SETS[set].filter((x) => !only || only.includes(x.name))) {
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
    if (shot.type) {
      await page
        .getByPlaceholder(shot.field ?? 'חיפוש')
        .locator('visible=true')
        .first()
        .click({ force: true });
      await page.keyboard.type(shot.type, { delay: 120 });
      await page.waitForTimeout(4000);
    }
    if (shot.click) {
      await page.getByText(shot.click, { exact: true }).locator('visible=true').first().click({ force: true });
      await page.waitForTimeout(2500);
    }
    if (shot.scrollTo) {
      await page.getByText(shot.scrollTo).first().scrollIntoViewIfNeeded();
      await page.evaluate((label) => {
        const el = [...document.querySelectorAll('div,span')].find((n) => n.textContent.trim() === label);
        el?.scrollIntoView({ block: 'center' });
      }, shot.scrollTo);
      await page.waitForTimeout(1500);
    }
    text[shot.name] = await page.evaluate(() => document.body.innerText);
    await page.screenshot({ path: join(OUT, `${shot.name}.png`) });
    if (shot.tall) {
      // The reader scrolls inside its own ScrollView, so a page screenshot holds one screen: a tall viewport
      // lays out three screens of text at once, for the video to pan over.
      await page.setViewportSize({ width: 400, height: 2600 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: join(OUT, `${shot.name}-tall.png`) });
    }
    console.log(`captured ${shot.name}`);
    await context.close();
  }
  if (!only) writeFileSync(join(OUT, `text-${set}.json`), JSON.stringify(text, null, 1));
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
}
