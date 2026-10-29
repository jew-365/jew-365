import fs from 'fs';
import path from 'path';
import { GUIDE_TOPICS } from '@/data/guide';
import { HALACHA_LINES } from '@/data/halachaLines';
import { HILULOT } from '@/data/hilulot';
import { LIBRARY_GROUPS, MITZVOT } from '@/data/mitzvot';
import { CITIES } from '@/data/cities';
import { translate } from '@/i18n';
import type { Achievements } from '@/stores/useCompletionsStore';
import type { SiddurText } from '@/types/siddur';
import { at } from '@/testing/zmanim';
import { STREAK_BADGE_DAYS } from '../badges';
import {
  SEARCH_SCREENS,
  SETTINGS_SEARCH_ITEMS,
  appContentItems,
  buildSettingsSearchIndex,
  deepTextOf,
  searchDeep,
  searchTiers,
  settingsContentItems,
  streakItem,
  type SearchNamer,
  type SearchStats,
  type SettingsSearchContentItem,
  type SettingsSearchContext,
  type SettingsSearchItem,
} from '../settingsSearch';

// The search finds everything in the app (the owner's rule, 2026-10-27). This suite fails when a
// screen, a setting, a mitzvah, a text, a tzaddik, a category, a guide topic, a halacha line or a
// badge is added without a way to find it.

const ROOT = path.resolve(__dirname, '../../..');
const APP_DIR = path.join(ROOT, 'src/app');
const JERUSALEM = CITIES[0];
const ALL: SettingsSearchContext = { taharah: true, backup: true };

const namer: SearchNamer = (key, params) => ({
  he: translate(key, params, 'he', null),
  en: translate(key, params, 'en', null),
});

const NO_STATS: SearchStats = {
  achievements: null,
  totals: { total: 0, byMitzvah: {} },
  mitzvot: MITZVOT,
};

const content = (taharah = true, stats = NO_STATS) => [
  ...settingsContentItems({
    mitzvot: MITZVOT,
    nusach: 'sefard',
    voice: null,
    maritalStatus: 'married',
    chokInstalled: false,
    now: at(JERUSALEM, '2026-10-28T12:00'),
    location: JERUSALEM,
    inIsrael: true,
  }),
  ...appContentItems({ name: namer, mitzvot: MITZVOT, nusach: 'sefard', ruling: 'ashkenazi', taharah, stats }),
];

const index = buildSettingsSearchIndex(
  (key) => [translate(key, undefined, 'he', null), translate(key, undefined, 'en', null)],
  [...SETTINGS_SEARCH_ITEMS, ...content()],
);
const close = (query: string) => searchTiers(query, index, ALL).close.map((item) => item.id);
const maybe = (query: string) => searchTiers(query, index, ALL).maybe.map((item) => item.id);

// Routes only another screen opens, with the reason they are not search results.
const NOT_SEARCHABLE: Record<string, string> = {
  '/day/[date]': 'a day of the schedule, opened from a schedule or history day',
};
const CONTENT_ROUTES = ['/mitzvah/[id]', '/siddur/[id]', '/hilula/[id]'];

function routeFiles(dir = APP_DIR): { file: string; source: string }[] {
  const out: { file: string; source: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...routeFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push({
        file: path
          .relative(APP_DIR, full)
          .split(path.sep)
          .join('/')
          .replace(/\.tsx?$/, ''),
        source: fs.readFileSync(full, 'utf8'),
      });
    }
  }
  return out;
}

const hrefPath = (item: SettingsSearchItem): string | undefined => {
  if (!item.kind) return item.route;
  return typeof item.href === 'string' ? item.href : item.href.pathname;
};

describe('search coverage', () => {
  it('reaches every screen under src/app', () => {
    const reachable = new Set([...CONTENT_ROUTES, ...[...SETTINGS_SEARCH_ITEMS, ...content()].map(hrefPath)]);
    const missing = routeFiles()
      .filter(({ file, source }) => !/(^|\/)_layout$/.test(file) && !file.startsWith('onboarding/'))
      .filter(({ source }) => !(source.includes('<Redirect') && !source.includes('<ScrollView')))
      .map(({ file }) => {
        const route = `/${file.replace(/(^|\/)index$/, '')}`;
        return route.length > 1 && route.endsWith('/') ? route.slice(0, -1) : route;
      })
      .filter((route) => !reachable.has(route) && !NOT_SEARCHABLE[route]);
    expect(missing).toEqual([]);
  });

  it('finds every setting row that Settings anchors', () => {
    const source = fs.readFileSync(path.join(APP_DIR, '(tabs)/settings.tsx'), 'utf8');
    const anchors = [...source.matchAll(/anchor\('([A-Za-z]+)'\)/g)].map((match) => match[1]);
    const ids = new Set(SETTINGS_SEARCH_ITEMS.map((item) => item.id));
    expect(anchors.length).toBeGreaterThan(20);
    expect(anchors.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('holds every mitzvah, tzaddik, guide topic, halacha line, category, tab and badge', () => {
    const ids = new Set(content().map((item) => item.id));
    const expected = [
      ...MITZVOT.map((mitzvah) => `mitzvah:${mitzvah.id}`),
      ...HILULOT.map((hilula) => `hilula:${hilula.id}`),
      ...GUIDE_TOPICS.map((topic) => `topic:${topic.id}`),
      ...HALACHA_LINES.ashkenazi.map((line) => `hotline:${line.id}`),
      ...LIBRARY_GROUPS.map((group) => `category:library:${group}`),
      ...['summary', 'trends', 'achievements'].map((tab) => `screen:history:${tab}`),
      ...STREAK_BADGE_DAYS.map((days) => `badge:streak${days}`),
      'badge:fullWeek',
      'badge:fullMonth',
      'badge:thousandMarks',
      ...MITZVOT.map((mitzvah) => `badge:hundred:${mitzvah.id}`),
      ...SEARCH_SCREENS.map((screen) => `screen:${screen.id}`),
    ];
    expect(expected.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('hides the family purity screens and topic unless the topic is offered', () => {
    const ids = content(false).map((item) => item.id);
    expect(ids.some((id) => id.startsWith('screen:taharah'))).toBe(false);
    expect(ids).not.toContain('topic:taharah');
  });
});

describe('search results', () => {
  it('finds a rav of the halacha hotline by his name', () => {
    expect(close('קרליץ')[0]).toBe('hotline:karelitz');
  });

  it('finds a tzaddik by one of his works', () => {
    expect(close('נועם אלימלך')).toContain('hilula:elimelech_of_lizhensk');
  });

  it('finds the tracking cards, the records and the badges', () => {
    expect(close('שיאים')).toContain('stat:card:records');
    expect(close('הרצף הארוך')).toContain('stat:bestStreak');
    expect(close('חודש מלא')).toContain('badge:fullMonth');
    expect(close('הישגים')).toContain('screen:history:achievements');
  });

  it('shows a badge as earned with its date, or what is left', () => {
    const achievements: Achievements = {
      badges: { streak7: '2026-10-01' },
      bestStreak: { days: 12, from: '2026-09-20', to: '2026-10-01' },
      bestWeek: null,
      mitzvahBest: {},
      fold: null,
    };
    const items = content(true, {
      achievements,
      totals: { total: 940, byMitzvah: { tefillin: 97 } },
      mitzvot: MITZVOT,
    });
    const byId = (id: string) =>
      items.find((item) => item.id === id) as SettingsSearchItem & { caption: { he: string } };
    expect(byId('badge:streak7').caption.he).toBe('הישג · הושג ב־1.10.2026');
    expect(byId('badge:thousandMarks').caption.he).toContain('60');
    expect(byId('badge:hundred:tefillin').caption.he).toContain('3');
    expect(byId('stat:bestStreak').caption.he).toContain('12');
  });

  it('finds the screens by the words people use for them', () => {
    expect(close('מצפן')).toContain('screen:compass');
    expect(close('לוח זמנים')).toContain('screen:schedule');
    expect(close('מוצאי שבת')).toContain('screen:checkin');
  });

  it('finds a category of the library and of the siddur tab', () => {
    expect(close('מצוות יומיות')).toContain('category:library:daily');
    expect(close('סעודה')).toContain('category:siddur:meals');
  });

  it('opens a guide topic from a word of its text', () => {
    expect(close('כיול')).toContain('topic:start');
  });

  it('puts a near miss only among the maybe results, never among the close ones', () => {
    expect(close('תפלין')).not.toContain('mitzvah:tefillin');
    expect(maybe('תפלין')).toContain('mitzvah:tefillin');
    expect(close('תפילין')[0]).toBe('mitzvah:tefillin');
    expect(maybe('תפילין')).not.toContain('mitzvah:tefillin');
  });

  it('reads the current streak into its own item', () => {
    const item = streakItem(namer, 5);
    expect((item as { caption: { he: string } }).caption.he).toBe('5 ימים ברצף');
    expect(item.href).toEqual({ pathname: '/(tabs)/history', params: { tab: 'summary' } });
  });
});

describe('deep search', () => {
  const shacharit = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'assets/siddur/sefard/shacharit.siddur'), 'utf8'),
  ) as SiddurText;
  const deep = [deepTextOf(shacharit, 'shacharit', { he: 'שחרית', en: 'Shacharit' }, 'shacharit', namer)];

  it('finds a section by its title and opens the reader on it', () => {
    const { close: found } = searchDeep('פסוקי דזמרה', deep, namer);
    expect(found[0]).toMatchObject({
      kind: 'section',
      href: { pathname: '/siddur/[id]', params: { id: 'shacharit', section: 'פסוקי דזמרה' } },
    });
  });

  it('finds a passage by a phrase of its words and lands on its segment', () => {
    const { close: found } = searchDeep('אשרי יושבי ביתך', deep, namer);
    const passage = found.find((item) => item.kind === 'passage') as SettingsSearchContentItem | undefined;
    expect(passage).toBeDefined();
    expect(passage!.title.he.startsWith('אשרי יושבי ביתך')).toBe(true);
    expect(passage!.href).toMatchObject({ pathname: '/siddur/[id]', params: { id: 'shacharit' } });
    const key = (passage!.href as { params: { segment: string } }).params.segment;
    expect(shacharit.sections.some((section) => section.segments.some((segment) => segment.key === key))).toBe(true);
  });

  it('keeps a misspelled phrase for the maybe results', () => {
    const tiers = searchDeep('יושבי ביתכה', deep, namer);
    expect(tiers.close.some((item) => item.kind === 'passage')).toBe(false);
    expect(tiers.maybe.some((item) => item.kind === 'passage')).toBe(true);
  });
});
