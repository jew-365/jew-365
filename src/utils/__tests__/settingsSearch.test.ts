import { HILULOT } from '@/data/hilulot';
import { translate } from '@/i18n';
import heTable from '@/i18n/he.json';
import enTable from '@/i18n/en.json';
import { ICON_NAMES } from '@/components/MitzvahIcon';
import { CITIES } from '@/data/cities';
import { customToMitzvah, getAllMitzvot } from '@/data/customMitzvotAdapter';
import { MITZVOT } from '@/data/mitzvot';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { installSelichotFixture } from '@/testing/selichot';
import { at } from '@/testing/zmanim';
import type { CustomMitzvah, Nusach } from '@/types/mitzvah';
import {
  SETTINGS_SEARCH_ITEMS,
  SETTINGS_SEARCH_LIMIT,
  buildSettingsSearchIndex,
  normalizeSearchText,
  searchSettings,
  settingsContentItems,
  typedInOtherLayout,
  type SettingsContentInput,
  type SettingsSearchContext,
  type SettingsSearchItem,
} from '../settingsSearch';

const index = buildSettingsSearchIndex((key) => [
  translate(key, undefined, 'he', null),
  translate(key, undefined, 'en', null),
]);
const JERUSALEM = CITIES[0];
const ALL: SettingsSearchContext = { taharah: true, backup: true };
const ids = (query: string, context = ALL) => searchSettings(query, index, context).map((item) => item.id);
const top = (query: string, context = ALL) => ids(query, context)[0];

afterEach(() => {
  useSelichotStore.getState().reset();
});

describe('settings search index', () => {
  it('gives every item a unique id, a real icon and keys both dictionaries hold', () => {
    expect(new Set(SETTINGS_SEARCH_ITEMS.map((item) => item.id)).size).toBe(SETTINGS_SEARCH_ITEMS.length);
    for (const item of SETTINGS_SEARCH_ITEMS) {
      expect(ICON_NAMES).toContain(item.icon);
      for (const key of [item.titleKey, ...(item.labelKeys ?? [])]) {
        expect(heTable).toHaveProperty([key]);
        expect(enTable).toHaveProperty([key]);
      }
      expect(Boolean(item.section) !== Boolean(item.route)).toBe(true);
    }
  });
});

describe('normalizeSearchText', () => {
  it('drops nikud, quotes and final letters, and lower-cases Latin', () => {
    expect(normalizeSearchText('הִתְרָאוֹת')).toBe('התראות');
    expect(normalizeSearchText('ק"ש')).toBe('קש');
    expect(normalizeSearchText('שלום')).toBe('שלומ');
    expect(normalizeSearchText('  Dark-Mode  ')).toBe('dark mode');
  });
});

describe('typedInOtherLayout', () => {
  it('reads Latin keys typed on a Hebrew keyboard and the reverse', () => {
    expect(typedInOtherLayout('v,rtu,')).toBe('התראות');
    expect(typedInOtherLayout('נשגל')).toBe('badk');
    expect(typedInOtherLayout('שפה 1')).toBe('apv 1');
    expect(typedInOtherLayout('123')).toBeNull();
  });
});

const SETTING_QUERIES: [string, string][] = [
  ['הצעת מצפן', 'compassPrompt'],
  ['compass prompt', 'compassPrompt'],
  ['התראות', 'notifications'],
  ['נוסח', 'nusach'],
  ['ספרדי', 'nusach'],
  ['חבד', 'nusach'],
  ['גרא', 'opinion'],
  ['דעת זמן ק"ש', 'opinion'],
  ['קריאת שמע', 'opinion'],
  ['מגן אברהם', 'opinion'],
  ['מניין', 'prayerMode'],
  ['נוסח הסידור', 'siddurVoice'],
  ['לשון נקבה', 'siddurVoice'],
  ['feminine', 'siddurVoice'],
  ['גלילה', 'reading'],
  ['ירושלים', 'location'],
  ['London', 'location'],
  ['עיר', 'location'],
  ['צבע', 'theme'],
  ['מצב כהה', 'theme'],
  ['גודל', 'uiScale'],
  ['אנגלית', 'language'],
  ['איפוס', 'reset'],
  ['reset', 'reset'],
  ['מחיקת נתונים', 'reset'],
  ['מחיקת הנתונים שלך', 'reset'],
  ['Delete your data', 'reset'],
  ['גרסה', 'version'],
  ['סוללה', 'permissions'],
  ['הרשאות', 'permissions'],
  ['battery', 'permissions'],
  ['דוח שבועי', 'weeklyReport'],
  ['שעות שקטות', 'quietBefore'],
  ['quiet hours', 'quietBefore'],
  ['לא להפריע', 'quietBefore'],
  ['מוקדם בבוקר', 'quietBefore'],
  ['מאוחר בלילה', 'quietAfter'],
  ['late night', 'quietAfter'],
  ['שחזור', 'backupImport'],
  ['ייצוא', 'backupExport'],
  ['באג', 'contact'],
  ['אודות', 'contact'],
  ['קישורים', 'links'],
  ['about', 'contact'],
  ['links', 'links'],
  ['טלפון', 'profilePhone'],
  ['נשוי', 'maritalStatus'],
  ['מקווה', 'taharah'],
  ['הוספת מצווה', 'addMitzvah'],
  ['מצווה חדשה', 'addMitzvah'],
  ['להוסיף', 'addMitzvah'],
  ['add mitzvah', 'addMitzvah'],
  ['הילולות', 'hilulot'],
  ['ראש חודש', 'roshChodesh'],
  ['ביום עצמו', 'roshChodesh'],
  ['בערב שלפני', 'roshChodesh'],
  ['בכניסת ההילולה', 'hilulot'],
  ['ברטנורה', 'chokCommentary'],
  ['רש"י', 'chokCommentary'],
  ['פירושים', 'chokCommentary'],
  ['ליל שישי', 'chokThuNightDay'],
  ['Thursday night', 'chokThuNightDay'],
  ['notifications', 'notifications'],
  ['backup', 'backupExport'],
  ['מדריך', 'guide'],
  ['user guide', 'guide'],
];

describe('searchSettings', () => {
  it('finds nothing for an empty or blank query', () => {
    expect(ids('')).toEqual([]);
    expect(ids('   ')).toEqual([]);
  });

  it.each(SETTING_QUERIES)('%s leads to %s', (query, id) => {
    expect(top(query)).toBe(id);
  });

  it('forgives a typo, a missing letter and swapped letters', () => {
    expect(top('התרעות')).toBe('notifications');
    expect(top('התראת')).toBe('notifications');
    expect(top('נסוח')).toBe('nusach');
    expect(top('notifcations')).toBe('notifications');
  });

  it('matches a word with a Hebrew prefix letter', () => {
    expect(top('בהתראות')).toBe('notifications');
    expect(top('והשפה')).toBe('language');
  });

  it('matches a prefix while the user is still typing', () => {
    expect(top('התר')).toBe('notifications');
    expect(top('גיב')).toBe('backupExport');
  });

  it('understands a word typed with the wrong keyboard layout', () => {
    expect(top('v,rtu,')).toBe('notifications');
    expect(top('נשבלופ')).toBe('backupExport');
  });

  it('keeps typo matches out while an exact match exists', () => {
    expect(ids('גיבוי')).not.toContain('mitzvot');
  });

  it('requires every word of the query', () => {
    expect(ids('התראות ירושלים')).toEqual([]);
  });

  it('hides what this user or device does not have', () => {
    const plain: SettingsSearchContext = { taharah: false, backup: false };
    expect(ids('טהרה', plain)).not.toEqual(expect.arrayContaining(['taharah']));
    expect(ids('טהרה', plain)).not.toEqual(expect.arrayContaining(['taharahDevice']));
    expect(ids('גיבוי', plain)).not.toEqual(expect.arrayContaining(['backupExport']));
    expect(ids('טהרה')).toEqual(expect.arrayContaining(['taharah', 'taharahDevice']));
  });

  it('files the reset under backup, and the version and the links under contact', () => {
    const section = (id: string) => SETTINGS_SEARCH_ITEMS.find((item) => item.id === id)?.section;
    expect(section('reset')).toBe('backup');
    expect(section('version')).toBe('contact');
    expect(section('links')).toBe('contact');
  });

  it('ranks the links item first for קישורים and links, and leaves them off the contact item', () => {
    expect(ids('קישורים')[0]).toBe('links');
    expect(ids('links')[0]).toBe('links');
    expect(ids('privacy')[0]).toBe('links');
    expect(ids('קישורים')).not.toContain('contact');
    expect(ids('links')).not.toContain('contact');
  });

  it('finds the version and the section that holds it for גרסה', () => {
    expect(ids('גרסה').slice(0, 2)).toEqual(['version', 'contact']);
  });

  it('finds about and contact by its title in both languages', () => {
    expect(top(translate('settings.contact', undefined, 'he', null))).toBe('contact');
    expect(top(translate('settings.contact', undefined, 'en', null))).toBe('contact');
  });

  it('finds the reset on web, where the backup file items are hidden', () => {
    const web: SettingsSearchContext = { taharah: false, backup: false };
    expect(top('גיבוי', web)).toBe('reset');
    expect(top('איפוס', web)).toBe('reset');
    expect(top('backup', web)).toBe('reset');
  });

  it('finds the reset by the section title in both languages on web', () => {
    const web: SettingsSearchContext = { taharah: false, backup: false };
    expect(top(translate('settings.backup', undefined, 'he', null), web)).toBe('reset');
    expect(top(translate('settings.backup', undefined, 'en', null), web)).toBe('reset');
  });

  it('finds a notice kind on both screens that offer it', () => {
    expect(ids('התראה מוקדמת')).toEqual(expect.arrayContaining(['hilulot', 'roshChodesh']));
  });

  it('caps the list', () => {
    expect(ids('ה').length).toBeLessThanOrEqual(SETTINGS_SEARCH_LIMIT);
  });
});

describe('content search', () => {
  const CUSTOM: CustomMitzvah = {
    id: 'custom_1792000000000_abc123',
    name: 'לימוד משנה',
    startHHMM: '06:00',
    endHHMM: '22:00',
    reminders: [{ anchor: 'start', offsetMin: 0, label: 'לימוד' }],
    skipOn: [],
    createdAt: 1792000000000,
  };
  const content = (overrides: Partial<SettingsContentInput> = {}) =>
    settingsContentItems({
      mitzvot: [...MITZVOT, customToMitzvah(CUSTOM)],
      nusach: 'ashkenaz',
      voice: null,
      maritalStatus: null,
      chokInstalled: false,
      now: at(JERUSALEM, '2026-10-28T07:00'),
      location: JERUSALEM,
      inIsrael: true,
      ...overrides,
    });
  const find = (query: string, overrides: Partial<SettingsContentInput> = {}) =>
    searchSettings(
      query,
      buildSettingsSearchIndex(
        (key) => [translate(key, undefined, 'he', null), translate(key, undefined, 'en', null)],
        [...SETTINGS_SEARCH_ITEMS, ...content(overrides)],
      ),
      ALL,
    ).map((item) => item.id);
  const itemOf = (id: string, overrides: Partial<SettingsContentInput> = {}) =>
    content(overrides).find((item) => item.id === id);

  it('gives every item a unique id, a real icon and a href that names its target', () => {
    const items = content({ chokInstalled: true });
    const all: SettingsSearchItem[] = [...SETTINGS_SEARCH_ITEMS, ...items];
    expect(new Set(all.map((item) => item.id)).size).toBe(all.length);
    for (const item of items) {
      expect(ICON_NAMES).toContain(item.icon);
      if (item.kind === 'mitzvah') {
        expect(item.href).toEqual({ pathname: '/mitzvah/[id]', params: { id: item.id.slice('mitzvah:'.length) } });
      } else if (item.kind === 'siddur') {
        expect(item.href).toEqual({ pathname: '/siddur/[id]', params: { id: item.id.slice('siddur:'.length) } });
      } else if (item.kind === 'hilula') {
        expect(item.href).toEqual({ pathname: '/hilula/[id]', params: { id: item.id.slice('hilula:'.length) } });
      } else {
        expect(item.href).toEqual({
          pathname: '/siddur/[id]',
          params: { id: expect.any(String), section: item.title.he },
        });
      }
    }
    expect(items.filter((item) => item.kind === 'chapter').length).toBeGreaterThan(0);
  });

  it('names mitzvot, texts and chapters with their icon, both languages and the section they open', () => {
    expect(itemOf('mitzvah:maariv')).toMatchObject({
      kind: 'mitzvah',
      title: { he: 'תפילת ערבית', en: 'Maariv' },
      icon: 'maariv',
    });
    expect(itemOf('chapter:mincha:אשרי')).toMatchObject({
      kind: 'chapter',
      icon: 'mincha',
      textName: { he: 'תפילת מנחה', en: 'Mincha' },
      href: { pathname: '/siddur/[id]', params: { id: 'mincha', section: 'אשרי' } },
    });
    expect(itemOf('siddur:birkat_hamazon')?.icon).toBe('meals');
    expect(itemOf('chapter:tehillim:ליום ראשון')?.icon).toBe('general');
    expect(content().some((item) => item.id.startsWith('chapter:asher_yatzar:'))).toBe(false);
  });

  it('lists every tzaddik of the hilulot list with both names, his icon and his next date, notices on or off', () => {
    const items = content().filter((item) => item.kind === 'hilula');
    expect(items).toHaveLength(HILULOT.length);
    expect(itemOf('hilula:baba_sali')).toMatchObject({
      kind: 'hilula',
      icon: 'hilula',
      title: { he: 'הבבא סאלי', en: 'Baba Sali' },
      caption: { he: 'ד׳ שבט', en: '4th of Sh’vat' },
      href: { pathname: '/hilula/[id]', params: { id: 'baba_sali' } },
    });
    expect(itemOf('hilula:rashbi')).toMatchObject({ caption: { he: 'י״ח אייר', en: '18th of Iyyar' } });
  });

  it.each([
    ['בבא סאלי', 'hilula:baba_sali'],
    ['הבבא סאלי', 'hilula:baba_sali'],
    ['רשבי', 'hilula:rashbi'],
    ['רשב"י', 'hilula:rashbi'],
    ['baal shem tov', 'hilula:baal_shem_tov'],
    ['בעש"ט', 'hilula:baal_shem_tov'],
    ['חפץ חיים', 'hilula:chafetz_chaim'],
    ['רבי נחמן', 'hilula:nachman_of_breslov'],
    ['Ari', 'hilula:arizal'],
    ['Maimonides', 'hilula:rambam'],
    ['Rambam', 'hilula:rambam'],
  ])('finds the tzaddik for "%s"', (query, id) => {
    expect(find(query)[0]).toBe(id);
  });

  it('forgives a typo in a tzaddik name', () => {
    expect(find('Vilna Gaonn')).toContain('hilula:vilna_gaon');
    expect(find('בבא סלאי')).toContain('hilula:baba_sali');
  });

  it('keeps the hilulot setting first for הילולות', () => {
    expect(find('הילולות')[0]).toBe('hilulot');
  });

  it('ranks a mitzvah before its text for the name of a prayer', () => {
    expect(find('ערבית').slice(0, 2)).toEqual(['mitzvah:maariv', 'siddur:maariv']);
  });

  it('finds a chapter by its title and ranks the better match first', () => {
    const found = find('אשרי');
    expect(found).toContain('chapter:shacharit:אשרי ובא לציון');
    expect(found).toContain('chapter:mincha:אשרי');
    expect(found.indexOf('chapter:shacharit:אשרי ובא לציון')).toBeLessThan(found.indexOf('chapter:mincha:אשרי'));
    expect(find('אשרי מנחה')[0]).toBe('chapter:mincha:אשרי');
  });

  it('lists a custom mitzvah as a mitzvah only', () => {
    expect(find('לימוד משנה')[0]).toBe(`mitzvah:${CUSTOM.id}`);
    expect(itemOf(`mitzvah:${CUSTOM.id}`)?.icon).toBe('custom');
    expect(content().map((item) => item.id)).not.toContain(`siddur:${CUSTOM.id}`);
  });

  it('reads a word typed with the other keyboard layout', () => {
    expect(find('grch,').slice(0, 2)).toEqual(['mitzvah:maariv', 'siddur:maariv']);
    expect(find('tarh')).toContain('chapter:mincha:אשרי');
  });

  it('forgives a typo in a title', () => {
    expect(find('ערביט')).toContain('mitzvah:maariv');
    expect(find('פסוקי דזמרא')).toContain('chapter:shacharit:פסוקי דזמרה');
  });

  it('lists Chok LeYisrael as a text only once it is installed, and never by chapter', () => {
    const before = find('חק לישראל');
    expect(before).toContain('mitzvah:chok_leyisrael');
    expect(before).not.toContain('siddur:chok_leyisrael');
    expect(find('חק לישראל', { chokInstalled: true })).toContain('siddur:chok_leyisrael');
    for (const chokInstalled of [false, true]) {
      expect(content({ chokInstalled }).some((item) => item.id.startsWith('chapter:chok_leyisrael'))).toBe(false);
    }
  });

  it('hides tefillin and the tallit chapter from a woman and shows them to a man', () => {
    const tefillin = ['siddur:tefillin', 'chapter:tefillin:הנחת תפילין', 'chapter:shacharit:עטיפת טלית והנחת תפילין'];
    const woman = find('תפילין', { voice: 'female' });
    expect(woman).toContain('mitzvah:tefillin');
    for (const id of tefillin) expect(woman).not.toContain(id);
    expect(find('תפילין', { voice: 'male' })).toEqual(expect.arrayContaining(['mitzvah:tefillin', ...tefillin]));
  });

  it('hides the Chabad passage before marital relations from a single reader only', () => {
    const id = 'chapter:kriat_shema_al_hamita:לפני תשמיש המטה';
    const ids = (maritalStatus: SettingsContentInput['maritalStatus']) =>
      content({ nusach: 'chabad', maritalStatus }).map((item) => item.id);
    expect(ids('single')).not.toContain(id);
    expect(ids('married')).toContain(id);
    expect(ids(null)).toContain(id);
  });

  const OUTRANKED_BY_CONTENT = ['קריאת שמע', 'ירושלים', 'רש"י'];

  it.each<Nusach>(['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'])(
    'keeps every setting query on its setting, bar the ones a content title matches better, with mitzvot, texts and chapters indexed for %s',
    (nusach) => {
      const combined = buildSettingsSearchIndex(
        (key) => [translate(key, undefined, 'he', null), translate(key, undefined, 'en', null)],
        [...SETTINGS_SEARCH_ITEMS, ...content({ nusach, now: at(JERUSALEM, '2026-09-08T12:00') })],
      );
      for (const [query, id] of SETTING_QUERIES) {
        const found = searchSettings(query, combined, ALL).map((item) => item.id);
        if (OUTRANKED_BY_CONTENT.includes(query)) {
          expect([query, found]).toEqual([query, expect.arrayContaining([id])]);
        } else {
          expect([query, found[0]]).toEqual([query, id]);
        }
      }
    },
  );

  it('ranks the Shema mitzvah before the opinion setting for "קריאת שמע", as its title matches better', () => {
    const found = find('קריאת שמע');
    expect(found[0]).toBe('mitzvah:krias_shma_shacharit');
    expect(found).toContain('opinion');
  });

  it('ranks content that matches by title before a setting that matches only through its terms', () => {
    const name = { he: 'בדיקה', en: 'Probe' };
    const items: SettingsSearchItem[] = [
      {
        id: 'probe-chapter',
        icon: 'bell',
        terms: [],
        title: name,
        kind: 'chapter',
        textName: name,
        href: { pathname: '/siddur/[id]', params: { id: 'maariv', section: 'בדיקה' } },
      },
      { id: 'probe-setting', icon: 'bell', titleKey: 'other', terms: ['בדיקה'], section: 'device' },
    ];
    const probe = buildSettingsSearchIndex((key) => (key === 'other' ? ['אחר', 'Other'] : []), items);
    expect(searchSettings('בדיקה', probe, ALL).map((item) => item.id)).toEqual(['probe-chapter', 'probe-setting']);
  });

  it('ranks a setting that matches by title before content that matches only through its text name', () => {
    const name = { he: 'בדיקה', en: 'Probe' };
    const items: SettingsSearchItem[] = [
      {
        id: 'probe-chapter',
        icon: 'bell',
        terms: [name.he],
        title: { he: 'פרק', en: 'Part' },
        kind: 'chapter',
        textName: name,
        href: { pathname: '/siddur/[id]', params: { id: 'maariv', section: 'פרק' } },
      },
      { id: 'probe-setting', icon: 'bell', titleKey: 'probe', terms: [], section: 'device' },
    ];
    const probe = buildSettingsSearchIndex((key) => (key === 'probe' ? ['בדיקה', 'Probe'] : []), items);
    expect(searchSettings('בדיקה', probe, ALL).map((item) => item.id)).toEqual(['probe-setting', 'probe-chapter']);
  });

  it('lists a seasonal text and its chapters every day, marked not today outside the days it is said', () => {
    installSelichotFixture();
    const states = (id: string, overrides: Partial<SettingsContentInput> = {}) => {
      const items = content(overrides).filter(
        (item) => item.id === `siddur:${id}` || item.id.startsWith(`chapter:${id}:`),
      );
      expect(items.some((item) => item.kind === 'siddur')).toBe(true);
      expect(items.some((item) => item.kind === 'chapter')).toBe(true);
      return [...new Set(items.map((item) => (item.notToday ? 'notToday' : 'today')))];
    };
    const seasonal = (overrides: Partial<SettingsContentInput>) =>
      ['selichot', 'chanukah_candles', 'kiddush_levana'].map((id) => states(id, overrides));
    expect(seasonal({})).toEqual([['notToday'], ['notToday'], ['notToday']]);
    expect(seasonal({ now: at(JERUSALEM, '2026-09-08T12:00') })).toEqual([['today'], ['notToday'], ['notToday']]);
    expect(seasonal({ now: at(JERUSALEM, '2026-12-07T12:00') })).toEqual([['notToday'], ['today'], ['notToday']]);
    expect(seasonal({ now: at(JERUSALEM, '2026-10-20T12:00') })).toEqual([['notToday'], ['notToday'], ['today']]);
    const early = at(JERUSALEM, '2026-08-31T12:00');
    expect(seasonal({ now: early })).toEqual([['notToday'], ['notToday'], ['notToday']]);
    expect(seasonal({ now: early, nusach: 'edot_hamizrach' })).toEqual([['today'], ['notToday'], ['notToday']]);
  });

  it("gives a text not said today the siddur tab's availability caption in both languages, and one said today none", () => {
    installSelichotFixture();
    expect(itemOf('siddur:selichot')).toMatchObject({
      notToday: {
        label: { he: 'ממוצאי שבת הסליחות עד ערב יום הכיפורים', en: 'From Leil Selichot to Erev Yom Kippur' },
      },
    });
    expect(itemOf('siddur:selichot', { nusach: 'edot_hamizrach' })?.notToday?.label?.en).toBe(
      'From 2 Elul to Erev Yom Kippur',
    );
    expect(itemOf('siddur:chanukah_candles')?.notToday).toEqual({ label: { he: 'בחנוכה', en: 'On Chanukah' } });
    expect(itemOf('siddur:kiddush_levana')?.notToday?.label?.en).toBe('From three days after the molad to mid-month');
    expect(itemOf('chapter:chanukah_candles:מעוז צור')?.notToday).toEqual({
      label: { he: 'בחנוכה', en: 'On Chanukah' },
    });
    const season = { now: at(JERUSALEM, '2026-12-07T12:00') };
    expect(itemOf('siddur:chanukah_candles', season)?.notToday).toBeUndefined();
    expect(itemOf('chapter:chanukah_candles:מעוז צור', season)?.notToday).toBeUndefined();
    expect(itemOf('siddur:birkat_hamazon')?.notToday).toBeUndefined();
    expect(itemOf('siddur:maariv')?.notToday).toBeUndefined();
  });

  it("marks Kiddush Levana and its chapters not today from its period's end to alot, as the siddur tab and the reader do", () => {
    const kiddushLevana = (clock: string, nusach: Nusach = 'ashkenaz') =>
      content({ now: at(JERUSALEM, `2026-10-26T${clock}`), nusach }).filter(
        (item) => item.id === 'siddur:kiddush_levana' || item.id.startsWith('chapter:kiddush_levana:'),
      );
    const beforeEnd = kiddushLevana('03:00');
    expect(beforeEnd.map((item) => item.id)).toEqual(
      expect.arrayContaining(['siddur:kiddush_levana', 'chapter:kiddush_levana:ברכת הלבנה']),
    );
    for (const item of beforeEnd) expect(item.notToday).toBeUndefined();
    const afterEnd = kiddushLevana('04:00');
    expect(afterEnd.map((item) => item.id)).toEqual(beforeEnd.map((item) => item.id));
    for (const item of afterEnd) {
      expect(item.notToday).toEqual({
        label: { he: 'משלושה ימים אחרי המולד עד חצי החודש', en: 'From three days after the molad to mid-month' },
      });
    }
    const edotHamizrach = kiddushLevana('04:00', 'edot_hamizrach');
    expect(edotHamizrach.map((item) => item.id)).toContain('siddur:kiddush_levana');
    for (const item of edotHamizrach) expect(item.notToday).toBeUndefined();
  });

  it('lists Selichot as a text and by chapter only while the nusach of the user is installed', () => {
    const selichotItems = (overrides: Partial<SettingsContentInput> = {}) =>
      content({ now: at(JERUSALEM, '2026-09-08T12:00'), ...overrides })
        .map((item) => item.id)
        .filter((id) => id === 'siddur:selichot' || id.startsWith('chapter:selichot:'));
    expect(selichotItems()).toEqual([]);
    expect(find('סליחות')).toContain('mitzvah:selichot');
    expect(find('סליחות')).not.toContain('siddur:selichot');
    installSelichotFixture(['sefard']);
    expect(selichotItems()).toEqual([]);
    expect(selichotItems({ nusach: 'sefard' })).toContain('siddur:selichot');
    installSelichotFixture(['ashkenaz']);
    const installed = selichotItems();
    expect(installed).toContain('siddur:selichot');
    expect(installed.some((id) => id.startsWith('chapter:selichot:'))).toBe(true);
  });

  it('finds Selichot and Kiddush Levana off season, by their names and by a chapter', () => {
    installSelichotFixture();
    expect(find('סליחות')).toContain('siddur:selichot');
    expect(find('קידוש לבנה')).toContain('siddur:kiddush_levana');
    expect(find('הדלקת נרות חנוכה')).toContain('siddur:chanukah_candles');
    expect(find('מעוז צור')).toContain('chapter:chanukah_candles:מעוז צור');
  });

  it('finds Ushpizin, its mitzvah and its text, not today off season and today on a night of Sukkot, and nothing in Chabad', () => {
    expect(find('אושפיזין')).toEqual(expect.arrayContaining(['mitzvah:ushpizin', 'siddur:ushpizin']));
    expect(itemOf('siddur:ushpizin')?.notToday).toEqual({
      label: { he: 'בלילות סוכות', en: 'On the nights of Sukkot' },
    });
    expect(itemOf('siddur:ushpizin', { now: at(JERUSALEM, '2026-09-28T21:00') })?.notToday).toBeUndefined();
    const chabad = { nusach: 'chabad' as const, mitzvot: getAllMitzvot('chabad') };
    expect(content(chabad).filter((item) => item.id.includes('ushpizin'))).toEqual([]);
    expect(find('אושפיזין', chabad).filter((id) => id.includes('ushpizin'))).toEqual([]);
  });

  it('orders ties as a setting, a mitzvah, a text and then a chapter', () => {
    const name = { he: 'בדיקה', en: 'Probe' };
    const base = { icon: 'bell', terms: [], title: name } as const;
    const items: SettingsSearchItem[] = [
      {
        ...base,
        id: 'probe-chapter',
        kind: 'chapter',
        textName: name,
        href: { pathname: '/siddur/[id]', params: { id: 'maariv', section: 'בדיקה' } },
      },
      { ...base, id: 'probe-siddur', kind: 'siddur', href: { pathname: '/siddur/[id]', params: { id: 'maariv' } } },
      { ...base, id: 'probe-mitzvah', kind: 'mitzvah', href: { pathname: '/mitzvah/[id]', params: { id: 'maariv' } } },
      { id: 'probe-setting', icon: 'bell', titleKey: 'probe', terms: [], section: 'device' },
    ];
    const probe = buildSettingsSearchIndex((key) => (key === 'probe' ? ['בדיקה', 'Probe'] : []), items);
    expect(searchSettings('בדיקה', probe, ALL).map((item) => item.id)).toEqual([
      'probe-setting',
      'probe-mitzvah',
      'probe-siddur',
      'probe-chapter',
    ]);
  });

  it('shows twelve results at most', () => {
    expect(SETTINGS_SEARCH_LIMIT).toBe(12);
    expect(find('ה')).toHaveLength(12);
  });
});
