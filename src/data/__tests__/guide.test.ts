import * as fs from 'fs';
import * as path from 'path';
import { DateTime } from 'luxon';
import {
  GUIDE_TOPICS,
  WHATS_NEW,
  guideList,
  latestWhatsNew,
  visibleGuideTopics,
  whatsNewHeading,
  type GuideTopic,
  type WhatsNewEntry,
} from '../guide';
import { GUIDE_WEB_PAGES, escapeHtml, renderGuideHtml } from '../guideHtml';
import { MITZVOT } from '../mitzvot';
import { SIDDUR_GROUPS, STANDALONE_TEXTS } from '../siddur';
import enTable from '@/i18n/en.json';
import heTable from '@/i18n/he.json';
import { CONTACT_EMAIL } from '@/services/ContactService';
import { THEME_NAMES } from '@/theme/colors';
import type { Nusach } from '@/types/mitzvah';

const { whatsNewLabels } = require('../../../scripts/publish-update') as {
  whatsNewLabels: (source: string) => string[];
};

const ROOT = path.join(__dirname, '..', '..', '..');
const APP_DIR = path.join(ROOT, 'src', 'app');
const he = heTable as Record<string, string>;
const en = enTable as Record<string, string>;

const ROUTE_EXTENSION = /\.(tsx|ts|jsx|js)$/;

type ScreenFile = { file: string; source: string };

function screenFiles(dir = APP_DIR): ScreenFile[] {
  const out: ScreenFile[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...screenFiles(full));
    } else if (ROUTE_EXTENSION.test(entry.name)) {
      out.push({
        file: path.relative(APP_DIR, full).split(path.sep).join('/').replace(ROUTE_EXTENSION, ''),
        source: fs.readFileSync(full, 'utf8'),
      });
    }
  }
  return out;
}

const isRedirect = (source: string) =>
  source.includes('<Redirect') && new Set(source.match(/<[A-Z][\w.]*/g) ?? []).size === 1;

const routeOf = (file: string) => {
  const route = `/${file.replace(/(^|\/)index$/, '')}`;
  return route.length > 1 && route.endsWith('/') ? route.slice(0, -1) : route;
};

const screenRoutes = (files: ScreenFile[]) =>
  files
    .filter(
      ({ file, source }) => !/(^|\/)_layout$/.test(file) && !file.startsWith('onboarding/') && !isRedirect(source),
    )
    .map(({ file }) => routeOf(file));

const undocumented = (routes: string[], topics: readonly GuideTopic[]) => {
  const named = new Set(topics.flatMap((topic) => topic.routes));
  return routes.filter((route) => !named.has(route));
};

const TOPIC_IDS = [
  'start',
  'home',
  'reminders',
  'library',
  'shabbat',
  'siddur',
  'tehillim',
  'chok',
  'history',
  'schedule',
  'roshChodesh',
  'taharah',
  'settings',
  'updates',
  'about',
];

const joined = (topics: readonly GuideTopic[], language: 'he' | 'en') =>
  topics.flatMap((topic) => topic.body.map((paragraph) => paragraph[language])).join('\n');

describe('the user guide topics', () => {
  it('keeps the topics in the order of the task', () => {
    expect(GUIDE_TOPICS.map((topic) => topic.id)).toEqual(TOPIC_IDS);
    expect(new Set(GUIDE_TOPICS.map((topic) => topic.id)).size).toBe(GUIDE_TOPICS.length);
  });

  it('gives every topic Hebrew and English text', () => {
    for (const topic of GUIDE_TOPICS) {
      const texts = [topic.title, ...topic.body, ...(topic.action ? [topic.action.label] : [])];
      for (const text of texts) {
        expect(text.he.trim()).not.toBe('');
        expect(text.en.trim()).not.toBe('');
      }
      expect(topic.body.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('names every screen under src/app in some topic', () => {
    expect(undocumented(screenRoutes(screenFiles()), GUIDE_TOPICS)).toEqual([]);
  });

  it('fails for a screen file no topic names', () => {
    const files = [...screenFiles(), { file: 'dummy', source: 'export default function Dummy() { return <View />; }' }];
    expect(undocumented(screenRoutes(files), GUIDE_TOPICS)).toEqual(['/dummy']);
  });

  it('names only real screens, and exempts layouts, redirects and onboarding', () => {
    const files = screenFiles();
    const routes = screenRoutes(files);
    for (const topic of GUIDE_TOPICS) {
      for (const route of topic.routes) expect(routes).toContain(route);
    }
    for (const file of ['index', '(tabs)/index', 'siddur/index']) {
      expect(isRedirect(files.find((screen) => screen.file === file)!.source)).toBe(true);
    }
    expect(routes).toContain('/taharah');
    expect(routes).toContain('/siddur/[id]');
    expect(routes.filter((route) => route.startsWith('/onboarding'))).toEqual([]);
  });

  it('points every action at a screen', () => {
    const routes = screenRoutes(screenFiles());
    for (const { action } of GUIDE_TOPICS) {
      if (action) expect(routes).toContain(typeof action.href === 'string' ? action.href : action.href.pathname);
    }
  });

  it('shows family purity only when offered', () => {
    expect(visibleGuideTopics(false).map((topic) => topic.id)).toEqual(TOPIC_IDS.filter((id) => id !== 'taharah'));
    expect(visibleGuideTopics(true)).toHaveLength(15);
  });

  it('names the tabs and every Settings path by its label', () => {
    const start = GUIDE_TOPICS.find((topic) => topic.id === 'start')!;
    const startHe = joined([start], 'he');
    const startEn = joined([start], 'en');
    for (const key of ['nav.more', 'nav.siddur', 'nav.home', 'nav.history', 'nav.settings']) {
      expect(startHe).toContain(he[key]);
      expect(startEn).toContain(en[key]);
    }
    const allHe = joined(GUIDE_TOPICS, 'he');
    const allEn = joined(GUIDE_TOPICS, 'en');
    for (const key of [
      'settings.contact',
      'settings.mitzvot',
      'settings.backup',
      'settings.prayer',
      'settings.device',
      'settings.profile',
    ]) {
      expect(allHe).toContain(`הגדרות ← ${he[key]}`);
      expect(allEn).toContain(`Settings → ${en[key]}`);
    }
    const about = GUIDE_TOPICS.find((topic) => topic.id === 'about')!;
    expect(joined([about], 'he')).toContain(CONTACT_EMAIL);
    expect(joined([about], 'en')).toContain(CONTACT_EMAIL);
  });
});

describe('the lists read from their homes', () => {
  it('lists the mitzvot, texts and palettes from their homes', () => {
    const mitzvot = guideList('mitzvot', 'he', null);
    for (const group of mitzvot.groups) {
      expect(group.key).not.toBe('mine');
      expect(group.label).toBe(he[`library.group.${group.key}`]);
    }
    const names = mitzvot.groups.flatMap((group) => group.items);
    expect(names).toHaveLength(MITZVOT.length);
    expect(new Set(names)).toEqual(new Set(MITZVOT.map((mitzvah) => mitzvah.name.he)));

    const texts = guideList('texts', 'en', null);
    expect(texts.groups.map((group) => group.key)).toEqual([...SIDDUR_GROUPS]);
    const textNames = texts.groups.flatMap((group) => group.items);
    expect(textNames).toHaveLength(Object.keys(STANDALONE_TEXTS).length);
    expect(textNames).toContain(STANDALONE_TEXTS.tehillim.name.en);

    expect(guideList('palettes', 'he', null).groups).toEqual([
      { key: 'palettes', label: null, items: THEME_NAMES.map((name) => he[`settings.theme.${name}`]) },
    ]);
  });

  it("lists only the texts the user's nusach has, as the siddur tab does", () => {
    const textNames = (nusach: Nusach) => guideList('texts', 'he', nusach).groups.flatMap((group) => group.items);
    expect(textNames('ashkenaz')).toContain(STANDALONE_TEXTS.ushpizin.name.he);
    expect(textNames('chabad')).not.toContain(STANDALONE_TEXTS.ushpizin.name.he);
    expect(textNames('chabad')).toContain(STANDALONE_TEXTS.selichot.name.he);
  });
});

describe('the what is new entries', () => {
  it('keeps WHATS_NEW newest first with unique labels', () => {
    expect(WHATS_NEW.length).toBeGreaterThanOrEqual(1);
    const parsed = WHATS_NEW.map((entry) => {
      expect(entry.label).toMatch(/^\d+\.\d+\.\d+-\d+$/);
      expect(DateTime.fromISO(entry.date).toISODate()).toBe(entry.date);
      for (const item of entry.items) {
        expect(item.he.trim()).not.toBe('');
        expect(item.en.trim()).not.toBe('');
      }
      return entry.label.split(/[.-]/).map(Number);
    });
    expect(new Set(WHATS_NEW.map((entry) => entry.label)).size).toBe(WHATS_NEW.length);
    for (let index = 1; index < parsed.length; index += 1) {
      const [previous, next] = [parsed[index - 1], parsed[index]];
      const at = previous.findIndex((part, position) => part !== next[position]);
      expect(at).toBeGreaterThanOrEqual(0);
      expect(previous[at]).toBeGreaterThan(next[at]);
    }
  });

  it('shows the latest three', () => {
    const entries: WhatsNewEntry[] = (['5.0.0-1', '4.0.0-1', '3.0.0-1', '2.0.0-1', '1.0.0-1'] as const).map(
      (label) => ({
        label,
        date: '2026-10-25',
        items: [],
      }),
    );
    expect(latestWhatsNew(entries).map((entry) => entry.label)).toEqual(['5.0.0-1', '4.0.0-1', '3.0.0-1']);
    expect(latestWhatsNew()).toEqual(WHATS_NEW.slice(0, 3));
  });

  it('heads an entry by version and date', () => {
    const entry: WhatsNewEntry = { label: '1.0.21-2', date: '2026-10-25', items: [] };
    expect(whatsNewHeading(entry, 'he')).toBe('גרסה 1.0.21-2 · 25 אוקטובר 2026');
    expect(whatsNewHeading(entry, 'en')).toBe('Version 1.0.21-2 · Oct 25, 2026');
  });

  it('reads the labels publish-update checks', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'guide.ts'), 'utf8');
    expect(whatsNewLabels(source)).toEqual(WHATS_NEW.map((entry) => entry.label));
  });
});

describe('the guide web pages', () => {
  it('escapes HTML', () => {
    expect(escapeHtml('a < b & "c" >')).toBe('a &lt; b &amp; &quot;c&quot; &gt;');
  });

  it('renders every topic and list into the web pages', () => {
    const hebrew = renderGuideHtml('he');
    expect(hebrew).toContain('<html lang="he" dir="rtl">');
    expect(hebrew).toContain('href="../style.css"');
    for (const topic of GUIDE_TOPICS) {
      expect(hebrew).toContain(`<h2 id="${topic.id}">${escapeHtml(topic.title.he)}</h2>`);
    }
    for (const mitzvah of MITZVOT) expect(hebrew).toContain(escapeHtml(mitzvah.name.he));
    expect(hebrew).toContain(escapeHtml(whatsNewHeading(WHATS_NEW[0], 'he')));

    const english = renderGuideHtml('en');
    expect(english).toContain('<html lang="en" dir="ltr">');
    expect(english).toContain('href="../../style.css"');
    for (const topic of GUIDE_TOPICS) {
      expect(english).toContain(`<h2 id="${topic.id}">${escapeHtml(topic.title.en)}</h2>`);
    }
  });

  it('is linked from the support page', () => {
    const page = fs.readFileSync(path.join(ROOT, 'docs', 'index.html'), 'utf8');
    expect(page).toContain('<a href="guide/">מדריך למשתמש</a>');
    expect(page).toContain('<a href="guide/en/">User guide in English</a>');
  });
});

describe('guide web copy', () => {
  it.each(GUIDE_WEB_PAGES)('$file is what pnpm guide:build writes', ({ language, file }) => {
    const html = renderGuideHtml(language);
    const target = path.join(ROOT, file);
    if (process.env.GUIDE_WRITE === '1') {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, html);
    }
    expect(fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n')).toBe(html);
  });
});
