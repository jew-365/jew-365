#!/usr/bin/env node
// Store screenshots of the Jew 365 web build: a seeded, onboarded install with the clock pinned in Jerusalem,
// captured in headless Chrome or Edge over the DevTools protocol, in Hebrew and English, for App Store Connect
// and Google Play. Plain Node, no dependency.
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { spawn, spawnSync } from 'node:child_process';
import {
  cpSync,
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { delimiter, dirname, extname, join, resolve, sep } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const USAGE =
  'pnpm store:screenshots [--out <dir>] [--dist <web export dir>] [--sets appstore-he,appstore-en,play-he,play-en] [--screens 1-home,...]';

const TIME_ZONE = 'Asia/Jerusalem';
const JERUSALEM = { latitude: 31.7683, longitude: 35.2137 };
const NOW = { date: '2026-11-04', time: '15:40' };
const HISTORY_DAYS = 30;
const PORTS = [8091, 8092, 8093, 8094, 8095, 8096, 8097, 8098, 8099];
const SIZES = {
  appstore: { width: 402, height: 874, scale: 3 },
  play: { width: 400, height: 800, scale: 2.7 },
};
const LANGUAGES = ['he', 'en'];
const SCREENS = [
  { name: '1-home', path: '/home', centreNextZman: true },
  { name: '2-siddur', path: '/siddur' },
  { name: '3-reader', path: `/siddur/mincha?section=${encodeURIComponent('אשרי')}` },
  { name: '4-history', path: '/history' },
  { name: '5-settings', path: '/settings' },
  { name: '6-tzaddik', path: '/hilula/rashbi' },
  { name: '7-report', path: '/report?week=2026-10-31' },
];

const DAILY = ['tefillin', 'krias_shma_shacharit', 'shacharit', 'mincha', 'maariv', 'krias_shma_al_hamita'];
const MARK_AT = {
  tefillin: '07:05',
  krias_shma_shacharit: '07:08',
  shacharit: '07:35',
  mincha: '13:35',
  maariv: '18:45',
  krias_shma_al_hamita: '22:30',
};
const LATE_AT = { mincha: '17:25', krias_shma_shacharit: '10:20' };
const CHECK_IN_AT = '20:30';
const MOTZAEI_SHABBAT_MAARIV_AT = '19:40';
const MISSED = {
  '2026-10-05': ['krias_shma_al_hamita'],
  '2026-10-06': ['krias_shma_al_hamita'],
  '2026-10-07': ['mincha'],
  '2026-10-08': ['mincha', 'krias_shma_al_hamita'],
  '2026-10-09': ['maariv'],
  '2026-10-10': ['mincha'],
  '2026-10-18': ['krias_shma_al_hamita'],
  '2026-10-19': ['krias_shma_al_hamita'],
  '2026-10-20': DAILY,
  '2026-10-21': ['maariv'],
  '2026-10-22': ['krias_shma_al_hamita'],
  '2026-10-23': ['krias_shma_shacharit'],
  '2026-10-24': ['mincha'],
  '2026-10-25': ['tefillin', 'krias_shma_shacharit', 'shacharit'],
  '2026-10-26': ['krias_shma_al_hamita'],
  '2026-10-28': ['mincha'],
  '2026-10-30': ['krias_shma_al_hamita'],
  '2026-10-31': ['krias_shma_al_hamita'],
  '2026-11-01': ['krias_shma_al_hamita'],
};
const LATE = {
  '2026-10-27': ['mincha'],
  '2026-10-29': ['krias_shma_shacharit'],
  '2026-11-02': ['krias_shma_shacharit'],
};
const KIDDUSH_LEVANA = { key: '2026-10-18', date: '2026-10-19', time: '19:50' };
const DONE_TODAY = ['tefillin', 'krias_shma_shacharit', 'shacharit'];

function parseArgs(argv) {
  const args = { out: join(homedir(), 'Downloads', 'jew365-store-screenshots'), dist: null, sets: null, screens: null };
  const rest = argv.filter((arg) => arg !== '--');
  for (let i = 0; i < rest.length; i++) {
    const [flag, value] = [rest[i], rest[i + 1]];
    if (!['--out', '--dist', '--sets', '--screens'].includes(flag) || value === undefined) {
      throw new Error(`Unknown or incomplete argument ${flag}. Usage: ${USAGE}`);
    }
    i++;
    if (flag === '--out') args.out = resolve(value);
    else if (flag === '--dist') args.dist = resolve(value);
    else args[flag.slice(2)] = value.split(',').filter(Boolean);
  }
  return args;
}

function browserCandidates() {
  const env = process.env;
  const local = env.LOCALAPPDATA ?? '';
  const programFiles = ['PROGRAMFILES', 'PROGRAMFILES(X86)'].map((name) => env[name]).filter(Boolean);
  const chrome = programFiles.map((base) => join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'));
  if (local) chrome.push(join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'));
  const edge = programFiles.map((base) => join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
  const mac = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];
  const names = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'chrome'];
  const onPath = (env.PATH ?? '')
    .split(delimiter)
    .filter(Boolean)
    .flatMap((dir) => names.map((name) => join(dir, name)));
  return [env.CHROME_PATH, ...chrome, ...edge, ...mac, ...onPath].filter(Boolean);
}

function findBrowser() {
  const found = browserCandidates().find((path) => existsSync(path));
  if (!found) {
    throw new Error(
      'No Chromium-based browser found. Install Chrome or Edge, or set CHROME_PATH to the browser executable.',
    );
  }
  return found;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function readHeader(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('Not a PNG file');
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    depth: buf[24],
    colorType: buf[25],
    interlace: buf[28],
  };
}

function decodePng(buf) {
  const header = readHeader(buf);
  if (header.depth !== 8 || header.interlace)
    throw new Error('Only 8-bit, non-interlaced PNG screenshots are supported');
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[header.colorType];
  if (!channels) throw new Error(`Unsupported PNG colour type ${header.colorType}`);
  const idat = [];
  for (let pos = 8; pos < buf.length;) {
    const len = buf.readUInt32BE(pos);
    if (buf.toString('ascii', pos + 4, pos + 8) === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = header.width * channels;
  const out = Buffer.alloc(header.height * stride);
  for (let y = 0; y < header.height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x];
      const left = x >= channels ? out[y * stride + x - channels] : 0;
      const up = y > 0 ? out[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? out[(y - 1) * stride + x - channels] : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      out[y * stride + x] = (value + predicted) & 0xff;
    }
  }
  return { ...header, channels, pixels: out };
}

function toOpaqueRgbPng({ width, height, channels, colorType, pixels }) {
  const gray = colorType === 0 || colorType === 4;
  const rows = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) {
    const at = y * (width * 3 + 1);
    for (let x = 0; x < width; x++) {
      const px = (y * width + x) * channels;
      const alpha = channels === 4 ? pixels[px + 3] : channels === 2 ? pixels[px + 1] : 255;
      const rgb = gray ? [pixels[px], pixels[px], pixels[px]] : [pixels[px], pixels[px + 1], pixels[px + 2]];
      for (let c = 0; c < 3; c++) rows[at + 1 + x * 3 + c] = Math.round((rgb[c] * alpha + 255 * (255 - alpha)) / 255);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function zoneOffsetMs(utcMs) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
      .formatToParts(new Date(utcMs))
      .map(({ type, value }) => [type, Number(value)]),
  );
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - utcMs;
}

function inJerusalem(dateKey, time, extraMinutes = 0) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, h, min + extraMinutes);
  return wall - zoneOffsetMs(wall - zoneOffsetMs(wall));
}

const dayKey = (key, days) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
const weekday = (key) => new Date(`${key}T12:00:00Z`).getUTCDay();

function defaultOnMitzvot() {
  const source = readFileSync(join(ROOT, 'src', 'stores', 'useMitzvotStore.ts'), 'utf8');
  const list = source.match(/DEFAULT_ON_MITZVOT[^=]*=\s*\[([^\]]*)\]/)?.[1];
  const ids = [...(list ?? '').matchAll(/'([a-z_]+)'/g)].map((match) => match[1]);
  if (!DAILY.every((id) => ids.includes(id))) throw new Error('DEFAULT_ON_MITZVOT in useMitzvotStore.ts was not read');
  return ids;
}

// The persisted stores of an install opened every day for the month before NOW: a man in Jerusalem, nusach
// Sefard, the default mitzvot switched on at its first morning, Shabbat marks made in each check-in.
function seedStores(language) {
  const days = Array.from({ length: HISTORY_DAYS }, (_, i) => dayKey(NOW.date, i - HISTORY_DAYS));
  for (const key of [...Object.keys(MISSED), ...Object.keys(LATE), KIDDUSH_LEVANA.key]) {
    if (!days.includes(key)) throw new Error(`Seed day ${key} is outside the ${HISTORY_DAYS} days before ${NOW.date}`);
  }
  const completions = {};
  const late = {};
  const checkIns = {};
  const mark = (key, id, instant) => (completions[key] = { ...completions[key], [id]: instant });
  days.forEach((key, index) => {
    const jitter = (index * 7) % 25;
    const shabbat = weekday(key) === 6;
    const friday = weekday(key) === 5;
    for (const id of DAILY) {
      if (shabbat && id === 'tefillin') continue;
      if (MISSED[key]?.includes(id)) continue;
      if (LATE[key]?.includes(id)) {
        const instant = inJerusalem(key, LATE_AT[id], jitter);
        mark(key, id, instant);
        late[key] = { ...late[key], [id]: instant };
      } else if (
        (shabbat && id !== 'maariv' && id !== 'krias_shma_al_hamita') ||
        (friday && ['maariv', 'krias_shma_al_hamita'].includes(id))
      ) {
        mark(key, id, inJerusalem(shabbat ? key : dayKey(key, 1), CHECK_IN_AT, jitter));
      } else {
        mark(key, id, inJerusalem(key, shabbat && id === 'maariv' ? MOTZAEI_SHABBAT_MAARIV_AT : MARK_AT[id], jitter));
      }
    }
    if (shabbat) checkIns[key] = inJerusalem(key, CHECK_IN_AT, jitter + 3);
  });
  mark(KIDDUSH_LEVANA.key, 'kiddush_levana', inJerusalem(KIDDUSH_LEVANA.date, KIDDUSH_LEVANA.time));
  for (const id of DONE_TODAY) mark(NOW.date, id, inJerusalem(NOW.date, MARK_AT[id], 6));

  const enabledAt = inJerusalem(days[0], '06:00');
  const activeMitzvot = Object.fromEntries(defaultOnMitzvot().map((id) => [id, { enabled: true, enabledAt }]));
  const persisted = (state) => JSON.stringify({ state, version: 1 });
  return {
    'jew-365\\user-store': persisted({
      nusach: 'sefard',
      location: {
        cityId: 'jerusalem',
        name: 'ירושלים',
        nameEn: 'Jerusalem',
        ...JERUSALEM,
        tz: TIME_ZONE,
        inIsrael: true,
      },
      locationStatus: 'ready',
      locationSource: 'manual',
      theme: 'gold',
      uiScale: 1,
      language,
      notificationPermission: 'granted',
      notificationsEnabled: true,
      inIsrael: true,
      isOnboarded: true,
      siddurVoice: 'male',
      prayerMode: 'minyan',
      homeLook: 'rail',
      gender: 'male',
      maritalStatus: 'married',
      taharahEnabled: false,
    }),
    'jew-365\\mitzvot-store': persisted({ activeMitzvot }),
    'jew-365\\completions-store': persisted({
      completions,
      skipped: {},
      late,
      checkIns,
      archivedDays: [],
      achievements: null,
      archivedMarks: { lastKey: null, total: 0, byMitzvah: {} },
    }),
  };
}

// Runs before any app script: Date starts at NOW in Jerusalem and keeps ticking, and the app's
// storage holds exactly the seed on every load.
function pageSetup(origin, seed) {
  const now = inJerusalem(NOW.date, NOW.time);
  return `(() => {
  const RealDate = Date;
  const shift = ${now} - RealDate.now();
  function PinnedDate(...args) {
    if (!new.target) return new RealDate(RealDate.now() + shift).toString();
    return args.length ? new RealDate(...args) : new RealDate(RealDate.now() + shift);
  }
  PinnedDate.prototype = RealDate.prototype;
  PinnedDate.now = () => RealDate.now() + shift;
  PinnedDate.parse = RealDate.parse;
  PinnedDate.UTC = RealDate.UTC;
  globalThis.Date = PinnedDate;
  if (location.origin === ${JSON.stringify(origin)}) {
    localStorage.clear();
    for (const [key, value] of Object.entries(${JSON.stringify(seed)})) localStorage.setItem(key, value);
  }
})();`;
}

function exportWeb(dist) {
  const cli = createRequire(import.meta.url).resolve('expo/bin/cli');
  console.log(`Exporting the web build to ${dist}`);
  const result = spawnSync(process.execPath, [cli, 'export', '-p', 'web', '--output-dir', dist], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error('expo export -p web failed');
}

// The web notification shim reports permission 'unknown' whatever the browser allows, so every page
// would carry the "notifications are off" banner. The capture copy reports 'granted', as a phone that
// allowed notifications does.
function grantNotificationsInBundle(dist) {
  const dir = join(dist, '_expo', 'static', 'js', 'web');
  const pattern = /\.setNotificationPermission\((['"])unknown\1\)/g;
  const hits = readdirSync(dir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => ({ file: join(dir, name), source: readFileSync(join(dir, name), 'utf8') }))
    .filter(({ source }) => source.match(pattern));
  const count = hits.reduce((sum, { source }) => sum + source.match(pattern).length, 0);
  if (count !== 1)
    throw new Error(`Expected one setNotificationPermission('unknown') in the web bundle, found ${count}`);
  for (const { file, source } of hits)
    writeFileSync(file, source.replace(pattern, ".setNotificationPermission('granted')"));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const isFile = (path) => existsSync(path) && statSync(path).isFile();

// A static export names each route's page by its file: home.html, siddur/[id].html. A path with no
// page of its own is served the dynamic page of its folder, else the root index.html.
function resolvePage(dist, pathname) {
  const parts = decodeURIComponent(pathname).split('/').filter(Boolean);
  if (parts.some((part) => part === '..' || part.includes(sep))) return null;
  const direct = join(dist, ...parts);
  if (isFile(direct)) return direct;
  for (const candidate of [`${direct}.html`, join(direct, 'index.html')]) if (isFile(candidate)) return candidate;
  const folder = join(dist, ...parts.slice(0, -1));
  const dynamic = existsSync(folder) && readdirSync(folder).find((name) => /^\[[^\]]+\]\.html$/.test(name));
  return dynamic ? join(folder, dynamic) : join(dist, 'index.html');
}

async function serve(dist) {
  const server = createServer((req, res) => {
    const file = resolvePage(dist, new URL(req.url, 'http://localhost').pathname);
    if (!file) {
      res.writeHead(400).end();
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  for (const port of PORTS) {
    const listening = await new Promise((done) => {
      server.once('error', () => done(false));
      server.listen(port, '127.0.0.1', () => done(true));
    });
    if (listening) return { server, origin: `http://127.0.0.1:${port}` };
  }
  throw new Error(`No free port in ${PORTS[0]}-${PORTS[PORTS.length - 1]}`);
}

async function launchBrowser(executable, profile) {
  const child = spawn(
    executable,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-sync',
      '--disable-extensions',
      '--hide-scrollbars',
      '--mute-audio',
      ...(typeof process.getuid === 'function' && process.getuid() === 0 ? ['--no-sandbox'] : []),
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  const portFile = join(profile, 'DevToolsActivePort');
  for (const until = Date.now() + 30000; Date.now() < until; await delay(100)) {
    if (!isFile(portFile)) continue;
    const [port, path] = readFileSync(portFile, 'utf8').split('\n');
    if (port && path) return { child, endpoint: `ws://127.0.0.1:${port.trim()}${path.trim()}` };
  }
  child.kill();
  throw new Error('The browser did not open its DevTools port');
}

async function connect(endpoint) {
  const socket = new WebSocket(endpoint);
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', () => fail(new Error('Could not reach the browser over DevTools')), {
      once: true,
    });
  });
  let nextId = 1;
  const pending = new Map();
  const listeners = new Set();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { done, fail, method } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) fail(new Error(`${method}: ${message.error.message}`));
      else done(message.result);
    } else if (message.method) {
      for (const listener of listeners) listener(message);
    }
  });
  return {
    send: (method, params = {}, sessionId) =>
      new Promise((done, fail) => {
        const id = nextId++;
        pending.set(id, { done, fail, method });
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      }),
    once: (method, sessionId, timeout = 60000) =>
      new Promise((done, fail) => {
        const timer = setTimeout(() => {
          listeners.delete(listener);
          fail(new Error(`Timed out waiting for ${method}`));
        }, timeout);
        const listener = (message) => {
          if (message.method !== method || message.sessionId !== sessionId) return;
          clearTimeout(timer);
          listeners.delete(listener);
          done(message.params);
        };
        listeners.add(listener);
      }),
    on: (listener) => listeners.add(listener),
    off: (listener) => listeners.delete(listener),
    close: () => socket.close(),
  };
}

const SETTLE = `(async () => {
  await document.fonts.ready;
  const deadline = performance.now() + 30000;
  let last = null;
  let stableSince = performance.now();
  while (performance.now() < deadline) {
    await new Promise((done) => setTimeout(done, 200));
    const text = document.body.innerText;
    const fonts = document.fonts.status === 'loaded' && document.fonts.check('16px Heebo_400Regular');
    if (text !== last || !fonts) {
      last = text;
      stableSince = performance.now();
    } else if (performance.now() - stableSince >= 2000) {
      return { text, path: location.pathname };
    }
  }
  throw new Error('The page never settled');
})()`;

// A phone centres home's next-zman chip in its row; React Native Web's scrollTo does nothing in a
// right-to-left row, so the capture scrolls the row the same way.
const centreNextZman = (prefix) => `(() => {
  const chip = [...document.querySelectorAll('[data-testid^="home-zman-"]')].find((node) =>
    node.innerText.trim().startsWith(${JSON.stringify(prefix)}),
  );
  let row = chip?.parentElement;
  while (row && row.scrollWidth <= row.clientWidth) row = row.parentElement;
  if (!row) return false;
  const chipBox = chip.getBoundingClientRect();
  const rowBox = row.getBoundingClientRect();
  row.scrollBy({ left: chipBox.left + chipBox.width / 2 - (rowBox.left + rowBox.width / 2), behavior: 'instant' });
  return true;
})()`;

function textProblems(text, path, expectedPath, dictionaryKeys, errorTitles) {
  const problems = [];
  if (path !== expectedPath) problems.push(`opened ${path} instead of ${expectedPath}`);
  const word = text.match(/\b(undefined|null|NaN|Invalid Date)\b/);
  if (word) problems.push(`shows "${word[0]}"`);
  const key = dictionaryKeys.find((name) => text.includes(name));
  if (key) problems.push(`shows the raw i18n key ${key}`);
  if (errorTitles.some((title) => text.includes(title)) || /Unmatched Route/i.test(text))
    problems.push('shows an error screen');
  if (text.trim().length < 40) problems.push('is nearly empty');
  return problems;
}

async function captureSet(cdp, origin, set, screens, outDir, checks) {
  const [store, language] = set.split('-');
  const size = SIZES[store];
  const { browserContextId } = await cdp.send('Target.createBrowserContext', { disposeOnDetach: true });
  await cdp.send('Browser.grantPermissions', {
    origin,
    browserContextId,
    permissions: ['geolocation', 'notifications'],
  });
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => cdp.send(method, params, sessionId);
  const exceptions = [];
  const onException = (message) => {
    if (message.sessionId === sessionId && message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails;
      exceptions.push(details.exception?.description?.split('\n')[0] ?? details.text);
    }
  };
  cdp.on(onException);
  try {
    await page('Page.enable');
    await page('Runtime.enable');
    await page('Emulation.setDeviceMetricsOverride', {
      width: size.width,
      height: size.height,
      deviceScaleFactor: size.scale,
      mobile: true,
    });
    await page('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await page('Emulation.setTimezoneOverride', { timezoneId: TIME_ZONE });
    await page('Emulation.setLocaleOverride', { locale: language === 'he' ? 'he-IL' : 'en-US' });
    await page('Emulation.setGeolocationOverride', { ...JERUSALEM, accuracy: 20 });
    await page('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-color-scheme', value: 'light' },
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ],
    });
    await page('Page.addScriptToEvaluateOnNewDocument', { source: pageSetup(origin, seedStores(language)) });
    mkdirSync(join(outDir, set), { recursive: true });
    const written = [];
    for (const screen of screens) {
      exceptions.length = 0;
      const loaded = cdp.once('Page.loadEventFired', sessionId);
      await page('Page.navigate', { url: `${origin}${screen.path}` });
      await loaded;
      let settled = await page('Runtime.evaluate', { expression: SETTLE, awaitPromise: true, returnByValue: true });
      if (screen.centreNextZman && !settled.exceptionDetails) {
        const centred = await page('Runtime.evaluate', {
          expression: centreNextZman(checks.nextChipPrefix[language]),
          returnByValue: true,
        });
        if (!centred.result.value) throw new Error(`${set}/${screen.name} has no next-zman chip in a scrolling row`);
        settled = await page('Runtime.evaluate', { expression: SETTLE, awaitPromise: true, returnByValue: true });
      }
      if (settled.exceptionDetails)
        throw new Error(`${set}/${screen.name}: ${settled.exceptionDetails.exception?.description}`);
      const { text, path } = settled.result.value;
      const problems = textProblems(text, path, screen.path.split('?')[0], checks.dictionaryKeys, checks.errorTitles);
      if (exceptions.length) problems.push(`threw ${exceptions.join('; ')}`);
      if (problems.length) throw new Error(`${set}/${screen.name} ${problems.join(', ')}`);
      const { data } = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const image = decodePng(Buffer.from(data, 'base64'));
      if (
        image.width !== Math.round(size.width * size.scale) ||
        image.height !== Math.round(size.height * size.scale)
      ) {
        throw new Error(`${set}/${screen.name} came out ${image.width}x${image.height}`);
      }
      const file = join(outDir, set, `${screen.name}.png`);
      writeFileSync(file, toOpaqueRgbPng(image));
      const header = readHeader(readFileSync(file));
      written.push(`${set}/${screen.name}.png ${header.width}x${header.height} colour type ${header.colorType}`);
    }
    return written;
  } finally {
    cdp.off(onException);
    await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
    await cdp.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  }
}

function dictionaryChecks() {
  const dictionaries = ['he', 'en'].map((lang) =>
    JSON.parse(readFileSync(join(ROOT, 'src', 'i18n', `${lang}.json`), 'utf8')),
  );
  return {
    dictionaryKeys: Object.keys(dictionaries[1]).filter((key) => key.includes('.')),
    errorTitles: dictionaries.map((dictionary) => dictionary['errors.boundaryTitle']),
    nextChipPrefix: Object.fromEntries(
      ['he', 'en'].map((lang, i) => [lang, dictionaries[i]['home.arc.chipNext'].split('%{name}')[0]]),
    ),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const allSets = Object.keys(SIZES).flatMap((store) => LANGUAGES.map((language) => `${store}-${language}`));
  const sets = args.sets ?? allSets;
  const screens = args.screens ? SCREENS.filter((screen) => args.screens.includes(screen.name)) : SCREENS;
  const unknown = [
    ...sets.filter((set) => !allSets.includes(set)),
    ...(args.screens ?? []).filter((name) => !SCREENS.some((screen) => screen.name === name)),
  ];
  if (unknown.length) throw new Error(`Unknown set or screen: ${unknown.join(', ')}. Usage: ${USAGE}`);
  const checks = dictionaryChecks();
  const work = mkdtempSync(join(tmpdir(), 'jew365-screenshots-'));
  let server;
  let browser;
  let cdp;
  try {
    const dist = args.dist ?? join(work, 'dist');
    if (!args.dist) exportWeb(dist);
    else if (!isFile(join(dist, 'index.html'))) throw new Error(`${dist} holds no web export`);
    const served = join(work, 'served');
    cpSync(dist, served, { recursive: true });
    grantNotificationsInBundle(served);
    const hosted = await serve(served);
    server = hosted.server;
    const executable = findBrowser();
    console.log(`Serving ${hosted.origin}, capturing with ${executable}`);
    browser = await launchBrowser(executable, join(work, 'profile'));
    cdp = await connect(browser.endpoint);
    const report = [];
    for (const set of sets) report.push(...(await captureSet(cdp, hosted.origin, set, screens, args.out, checks)));
    console.log([`Wrote to ${args.out}:`, ...report.map((line) => `  ${line}`)].join('\n'));
  } finally {
    if (cdp) {
      await Promise.race([cdp.send('Browser.close').catch(() => {}), delay(3000)]);
      cdp.close();
    }
    if (browser) {
      await Promise.race([new Promise((done) => browser.child.once('exit', done)), delay(5000)]);
      browser.child.kill();
    }
    server?.closeAllConnections();
    server?.close();
    rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
}

main().catch((error) => {
  console.error(`store screenshots failed: ${error.message}`);
  process.exit(1);
});
