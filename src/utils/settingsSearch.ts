import { CITIES } from '@/data/cities';
import { iconFor, type IconName } from '@/components/MitzvahIcon';
import { CHOK_TEXT_ID } from '@/data/chok';
import {
  SIDDUR_GROUPS,
  STANDALONE_TEXTS,
  hasStandaloneText,
  mitzvahTextId,
  siddurAsset,
  siddurPlace,
  siddurTextPresent,
  standaloneAvailability,
  standalonePeriodEnded,
  standaloneTextDay,
  standaloneTextsIn,
} from '@/data/siddur';
import { SIDDUR_CHAPTERS } from '@/data/siddurChapters.generated';
import type { MaritalStatus } from '@/stores/useUserStore';
import type { Mitzvah, Nusach } from '@/types/mitzvah';
import type { SiddurChapterTitle, SiddurTextId, SiddurVoice } from '@/types/siddur';
import type { Location } from '@/types/zmanim';
import { mitzvahName } from './mitzvahName';
import { catalogListsText, chapterVisible, dayFeatures } from './siddur';

export type SettingsSectionKey = 'profile' | 'prayer' | 'device' | 'backup' | 'contact';

export type SettingsSearchCondition = 'taharah' | 'backup' | 'battery';

type SearchItemBase = {
  id: string;
  icon: IconName;
  labelKeys?: readonly string[];
  terms: readonly string[];
  when?: SettingsSearchCondition;
};

export type SettingsSearchSettingItem = SearchItemBase & {
  kind?: undefined;
  titleKey: string;
  section?: SettingsSectionKey;
  route?: '/mitzvot' | '/custom-mitzvah' | '/hilulot' | '/rosh-chodesh' | '/guide';
};

export type SettingsSearchName = { he: string; en: string };

export type SettingsSearchHref =
  | { pathname: '/mitzvah/[id]'; params: { id: string } }
  | { pathname: '/siddur/[id]'; params: { id: string; section?: string } };

export type SettingsSearchNotToday = { label: SettingsSearchName | null };

export type SettingsSearchContentItem = SearchItemBase & {
  title: SettingsSearchName;
  href: SettingsSearchHref;
  notToday?: SettingsSearchNotToday;
} & ({ kind: 'mitzvah' | 'siddur' } | { kind: 'chapter'; textName: SettingsSearchName });

export type SettingsSearchItem = SettingsSearchSettingItem | SettingsSearchContentItem;
export type SettingsSearchKind = SettingsSearchContentItem['kind'];

export const SETTINGS_SEARCH_ITEMS: readonly SettingsSearchSettingItem[] = [
  {
    id: 'mitzvot',
    icon: 'custom',
    titleKey: 'settings.mitzvot',
    route: '/mitzvot',
    terms: [
      'מצוות',
      'מצווה',
      'הפעלה',
      'כיבוי',
      'תזכורת',
      'תזכורות',
      'מותאמת',
      'ספריה',
      'ספרייה',
      'mitzvot',
      'mitzvah',
      'custom',
      'library',
      'reminders',
    ],
  },
  {
    id: 'addMitzvah',
    icon: 'plus',
    titleKey: 'settings.searchAddMitzvah',
    labelKeys: ['custom.title'],
    route: '/custom-mitzvah',
    terms: [
      'הוספה',
      'הוסף',
      'להוסיף',
      'הוספת מצווה',
      'מצווה חדשה',
      'חדשה',
      'יצירה',
      'ליצור',
      'מצווה משלי',
      'אישית',
      'מותאמת',
      'add',
      'new',
      'create',
      'custom mitzvah',
    ],
  },
  {
    id: 'hilulot',
    icon: 'hilula',
    titleKey: 'hilulot.title',
    labelKeys: ['hilulot.kind.before', 'hilulot.kind.evening'],
    route: '/hilulot',
    terms: ['הילולה', 'הילולות', 'צדיקים', 'צדיק', 'יארצייט', 'יום פטירה', 'hilula', 'yahrzeit', 'tzaddik'],
  },
  {
    id: 'roshChodesh',
    icon: 'moon',
    titleKey: 'roshChodesh.title',
    labelKeys: ['roshChodesh.kind.before', 'roshChodesh.kind.evening', 'roshChodesh.kind.day'],
    route: '/rosh-chodesh',
    terms: ['ראש חודש', 'חודש', 'מולד', 'rosh chodesh', 'new month'],
  },
  {
    id: 'guide',
    icon: 'guide',
    titleKey: 'guide.title',
    route: '/guide',
    terms: [
      'מדריך',
      'מדריך למשתמש',
      'הדרכה',
      'עזרה',
      'הסבר',
      'הסברים',
      'איך',
      'מה חדש',
      'שאלות',
      'guide',
      'user guide',
      'how to',
      'manual',
      'tutorial',
    ],
  },
  {
    id: 'profileName',
    icon: 'user',
    titleKey: 'settings.profileName',
    section: 'profile',
    terms: ['שם', 'שם מלא', 'name', 'full name'],
  },
  {
    id: 'profilePhone',
    icon: 'user',
    titleKey: 'settings.profilePhone',
    section: 'profile',
    terms: ['טלפון', 'נייד', 'פלאפון', 'מספר', 'phone', 'mobile', 'number'],
  },
  {
    id: 'gender',
    icon: 'user',
    titleKey: 'profile.gender',
    labelKeys: ['profile.gender.male', 'profile.gender.female'],
    terms: ['גבר', 'אשה', 'אישה', 'זכר', 'נקבה', 'מין', 'gender', 'man', 'woman'],
    section: 'profile',
  },
  {
    id: 'maritalStatus',
    icon: 'user',
    titleKey: 'profile.maritalStatus',
    section: 'profile',
    terms: ['נשוי', 'נשואה', 'רווק', 'רווקה', 'מצב משפחתי', 'married', 'single', 'marital'],
  },
  {
    id: 'taharah',
    icon: 'user',
    titleKey: 'settings.taharah',
    labelKeys: ['settings.taharahEnabled', 'settings.taharahOpen'],
    section: 'profile',
    when: 'taharah',
    terms: [
      'טהרה',
      'טהרת המשפחה',
      'נדה',
      'נידה',
      'וסת',
      'מקווה',
      'טבילה',
      'הפסק טהרה',
      'בדיקה',
      'שבעה נקיים',
      'niddah',
      'mikvah',
      'family purity',
      'taharah',
    ],
  },
  {
    id: 'nusach',
    icon: 'siddur',
    titleKey: 'settings.nusach',
    labelKeys: ['nusach.ashkenaz', 'nusach.sefard', 'nusach.edot_hamizrach', 'nusach.chabad'],
    section: 'prayer',
    terms: [
      'נוסח',
      'ספרדי',
      'ספרדים',
      'אשכנזי',
      'מזרחי',
      'עדות',
      'חבד',
      'חסידי',
      'nusach',
      'sephardi',
      'ashkenazi',
      'chabad',
      'rite',
    ],
  },
  {
    id: 'opinion',
    icon: 'shema',
    titleKey: 'settings.opinion',
    labelKeys: ['settings.opinion.GRA', 'settings.opinion.MA'],
    section: 'prayer',
    terms: [
      'קריאת שמע',
      'קריאת שמע של שחרית',
      'זמן קריאת שמע',
      'סוף זמן',
      'גרא',
      'מגן אברהם',
      'מג"א',
      'שיטה',
      'דעה',
      'shema',
      'gra',
      'magen avraham',
      'opinion',
      'zman',
    ],
  },
  {
    id: 'prayerMode',
    icon: 'siddur',
    titleKey: 'settings.prayerMode',
    labelKeys: ['prayerMode.minyan', 'prayerMode.alone'],
    section: 'prayer',
    terms: ['מניין', 'מנין', 'יחיד', 'קדיש', 'ברכו', 'קדושה', 'קריאת התורה', 'minyan', 'alone', 'kaddish'],
  },
  {
    id: 'siddurVoice',
    icon: 'siddur',
    titleKey: 'settings.siddurVoice',
    labelKeys: ['settings.siddurVoice.male', 'settings.siddurVoice.female'],
    section: 'prayer',
    terms: ['לשון', 'לשון נקבה', 'לשון זכר', 'נשים', 'voice', 'feminine', 'masculine', 'women'],
  },
  {
    id: 'reading',
    icon: 'siddur',
    titleKey: 'settings.reading',
    labelKeys: ['settings.autoScroll', 'settings.autoScrollSpeed'],
    section: 'prayer',
    terms: ['גלילה', 'גלילה אוטומטית', 'מהירות', 'קריאה', 'סידור', 'scroll', 'speed', 'reading', 'siddur'],
  },
  {
    id: 'chokCommentary',
    icon: 'chok',
    titleKey: 'settings.chokCommentaryOpen',
    labelKeys: ['chok.commentary', 'chok.commentary.folded', 'chok.commentary.open'],
    section: 'prayer',
    terms: [
      'רש״י',
      'רשי',
      'ברטנורה',
      'פירוש',
      'פירושים',
      'מפרשים',
      'חק לישראל',
      'חוק לישראל',
      'מקופל',
      'קיפול',
      'rashi',
      'bartenura',
      'commentary',
      'commentaries',
      'chok',
    ],
  },
  {
    id: 'chokThuNightDay',
    icon: 'chok',
    titleKey: 'settings.chokThuNightDay',
    labelKeys: ['chok.thuNight.thu', 'chok.thuNight.fri'],
    section: 'prayer',
    terms: [
      'ליל שישי',
      'חמישי בלילה',
      'יום חמישי',
      'יום שישי',
      'חק לישראל',
      'חוק לישראל',
      'thursday night',
      'thursday',
      'friday',
      'chok',
    ],
  },
  {
    id: 'location',
    icon: 'sun',
    titleKey: 'settings.zmanim',
    labelKeys: ['settings.useCurrentLocation', 'settings.pickCity', 'settings.location'],
    section: 'device',
    terms: [
      'מיקום',
      'עיר',
      'זמנים',
      'זמני היום',
      'GPS',
      'ג׳י פי אס',
      'location',
      'city',
      'zmanim',
      ...CITIES.flatMap((city) => [city.name, city.nameEn ?? '']).filter(Boolean),
    ],
  },
  {
    id: 'notifications',
    icon: 'bell',
    titleKey: 'settings.notifications',
    labelKeys: ['settings.notificationsToggle'],
    section: 'device',
    terms: ['התראה', 'התראות', 'תזכורת', 'תזכורות', 'הודעות', 'צלצול', 'notifications', 'alerts', 'reminders'],
  },
  {
    id: 'weeklyReport',
    icon: 'bell',
    titleKey: 'settings.weeklyReport',
    section: 'device',
    terms: ['דוח', 'דו"ח', 'סיכום', 'שבועי', 'מוצאי שבת', 'report', 'weekly', 'summary'],
  },
  {
    id: 'permission',
    icon: 'bell',
    titleKey: 'settings.notificationsOsStatus',
    labelKeys: ['settings.openOsSettings'],
    section: 'device',
    terms: ['הרשאה', 'הרשאות', 'חסום', 'חסומות', 'מערכת', 'permission', 'blocked', 'system'],
  },
  {
    id: 'battery',
    icon: 'bell',
    titleKey: 'settings.batteryAction',
    section: 'device',
    when: 'battery',
    terms: ['סוללה', 'חיסכון', 'אופטימיזציה', 'איחור', 'battery', 'optimization', 'late'],
  },
  {
    id: 'taharahDevice',
    icon: 'bell',
    titleKey: 'settings.taharah',
    section: 'device',
    when: 'taharah',
    terms: ['התראות טהרה', 'תזכורות טהרה', 'בדיקה', 'טבילה', 'niddah reminders', 'taharah reminders'],
  },
  {
    id: 'theme',
    icon: 'sliders',
    titleKey: 'settings.theme',
    labelKeys: [
      'settings.display',
      'settings.theme.gold',
      'settings.theme.pink',
      'settings.theme.purple',
      'settings.theme.blue',
      'settings.theme.dark',
      'settings.theme.plum',
    ],
    section: 'device',
    terms: [
      'צבע',
      'צבעים',
      'ערכת נושא',
      'עיצוב',
      'מצב לילה',
      'מצב כהה',
      'תצוגה',
      'theme',
      'color',
      'colour',
      'dark mode',
      'display',
    ],
  },
  {
    id: 'uiScale',
    icon: 'sliders',
    titleKey: 'settings.uiScale',
    labelKeys: ['settings.display', 'settings.uiScaleHint'],
    section: 'device',
    terms: [
      'גודל',
      'גודל תצוגה',
      'גודל הטקסט',
      'גודל טקסט',
      'גופן',
      'הגדלה',
      'הקטנה',
      'זום',
      'כפתורים',
      'מרווחים',
      'display size',
      'size',
      'text size',
      'font size',
      'zoom',
      'larger',
      'smaller',
      'scale',
    ],
  },
  {
    id: 'language',
    icon: 'sliders',
    titleKey: 'settings.language',
    labelKeys: ['settings.language.he', 'settings.language.en'],
    section: 'device',
    terms: ['שפה', 'עברית', 'אנגלית', 'language', 'hebrew', 'english'],
  },
  {
    id: 'reset',
    icon: 'sliders',
    titleKey: 'settings.logout',
    labelKeys: ['settings.deleteData', 'settings.backup'],
    section: 'backup',
    terms: [
      'איפוס',
      'אפס',
      'מחיקה',
      'מחק',
      'התחלה מחדש',
      'reset',
      'delete',
      'erase',
      'start over',
      'גיבוי',
      'שחזור',
      'מחיקת נתונים',
      'נתונים',
      'backup',
      'restore',
      'delete data',
      'data',
    ],
  },
  {
    id: 'version',
    icon: 'sliders',
    titleKey: 'settings.searchVersion',
    section: 'contact',
    terms: ['גרסה', 'גירסה', 'גרסא', 'עדכון', 'version', 'update', 'build'],
  },
  {
    id: 'backupExport',
    icon: 'undo',
    titleKey: 'settings.backupExport',
    labelKeys: ['settings.backup'],
    section: 'backup',
    when: 'backup',
    terms: ['גיבוי', 'ייצוא', 'יצוא', 'קובץ', 'טלפון חדש', 'מעבר', 'אייפון', 'backup', 'export', 'file', 'new phone'],
  },
  {
    id: 'backupImport',
    icon: 'undo',
    titleKey: 'settings.backupImport',
    labelKeys: ['settings.backup'],
    section: 'backup',
    when: 'backup',
    terms: ['שחזור', 'ייבוא', 'יבוא', 'קובץ', 'טלפון חדש', 'restore', 'import', 'file'],
  },
  {
    id: 'contact',
    icon: 'phone',
    titleKey: 'settings.contact',
    labelKeys: ['settings.contactSend'],
    section: 'contact',
    terms: [
      'פנייה',
      'פניה',
      'תמיכה',
      'באג',
      'תקלה',
      'בעיה',
      'הצעה',
      'משוב',
      'מייל',
      'אימייל',
      'מפתחים',
      'אודות',
      'גרסה',
      'support',
      'bug',
      'feedback',
      'email',
      'help',
      'about',
    ],
  },
  {
    id: 'links',
    icon: 'chat',
    titleKey: 'settings.links',
    section: 'contact',
    terms: ['קישורים', 'links', 'אתר', 'site', 'מדיניות פרטיות', 'privacy', 'רישיון', 'license', 'חנות', 'store'],
  },
];

export type SettingsSearchEntry = {
  item: SettingsSearchItem;
  titleWords: readonly string[];
  words: readonly string[];
};

export type SettingsSearchContext = Record<SettingsSearchCondition, boolean>;

const FINAL_LETTERS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

const HEBREW_PREFIXES = 'הובלמשכ';

const EN_TO_HE: Record<string, string> = {
  q: '/',
  w: "'",
  e: 'ק',
  r: 'ר',
  t: 'א',
  y: 'ט',
  u: 'ו',
  i: 'ן',
  o: 'ם',
  p: 'פ',
  a: 'ש',
  s: 'ד',
  d: 'ג',
  f: 'כ',
  g: 'ע',
  h: 'י',
  j: 'ח',
  k: 'ל',
  l: 'ך',
  ';': 'ף',
  z: 'ז',
  x: 'ס',
  c: 'ב',
  v: 'ה',
  b: 'נ',
  n: 'מ',
  m: 'צ',
  ',': 'ת',
  '.': 'ץ',
};
const HE_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(EN_TO_HE)
    .filter(([, he]) => /[א-ת]/.test(he))
    .map(([en, he]) => [he, en]),
);

export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-֑ͯ-ׇ]/g, '')
    .toLowerCase()
    .replace(/[ךםןףץ]/g, (letter) => FINAL_LETTERS[letter])
    .replace(/["'`׳״]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const wordsOf = (text: string): string[] => normalizeSearchText(text).split(' ').filter(Boolean);

export function buildSettingsSearchIndex(
  lookup: (key: string) => readonly string[],
  items: readonly SettingsSearchItem[] = SETTINGS_SEARCH_ITEMS,
): SettingsSearchEntry[] {
  return items.map((item) => {
    const titles = item.kind ? [item.title.he, item.title.en] : lookup(item.titleKey);
    const titleWords = [...new Set(titles.flatMap(wordsOf))];
    const rest = [...(item.labelKeys ?? []).flatMap(lookup), ...item.terms].flatMap(wordsOf);
    return { item, titleWords, words: [...new Set([...titleWords, ...rest])] };
  });
}

export type SettingsContentInput = {
  mitzvot: readonly Mitzvah[];
  nusach: Nusach;
  voice: SiddurVoice | null;
  maritalStatus: MaritalStatus | null;
  chokInstalled: boolean;
  now: Date;
  location: Location;
  inIsrael: boolean;
};

type ContentText = {
  id: SiddurTextId | typeof CHOK_TEXT_ID;
  title: SettingsSearchName;
  icon: IconName;
  chapters: readonly SiddurChapterTitle[];
  notToday?: SettingsSearchNotToday;
};

const nameOf = (mitzvah: Mitzvah): SettingsSearchName => ({ he: mitzvah.name.he, en: mitzvahName(mitzvah, 'en') });

export function settingsContentItems({
  mitzvot,
  nusach,
  voice,
  maritalStatus,
  chokInstalled,
  now,
  location,
  inIsrael,
}: SettingsContentInput): SettingsSearchContentItem[] {
  const mitzvahItems = mitzvot.map((mitzvah): SettingsSearchContentItem => ({
    id: `mitzvah:${mitzvah.id}`,
    kind: 'mitzvah',
    icon: iconFor(mitzvah.icon),
    title: nameOf(mitzvah),
    terms: [],
    href: { pathname: '/mitzvah/[id]', params: { id: mitzvah.id } },
  }));
  const texts: ContentText[] = [];
  for (const mitzvah of mitzvot) {
    if (mitzvah.isCustom) continue;
    if (mitzvah.id === CHOK_TEXT_ID) {
      if (chokInstalled)
        texts.push({ id: CHOK_TEXT_ID, title: nameOf(mitzvah), icon: iconFor(mitzvah.icon), chapters: [] });
      continue;
    }
    const id = mitzvahTextId(mitzvah.id);
    if (!id || !catalogListsText(id, voice) || siddurAsset(nusach, id) === undefined) continue;
    texts.push({
      id,
      title: nameOf(mitzvah),
      icon: iconFor(mitzvah.icon),
      chapters: SIDDUR_CHAPTERS[id]?.[nusach] ?? [],
    });
  }
  const place = siddurPlace(location, inIsrael);
  for (const id of SIDDUR_GROUPS.flatMap((group) => standaloneTextsIn(group, nusach))) {
    if (!catalogListsText(id, voice) || !siddurTextPresent(nusach, id)) continue;
    const { name, group } = STANDALONE_TEXTS[id];
    const open =
      hasStandaloneText(id, nusach, dayFeatures(standaloneTextDay(id, now, location), place)) &&
      !standalonePeriodEnded(id, nusach, now, location);
    texts.push({
      id,
      title: name,
      icon: group,
      chapters: SIDDUR_CHAPTERS[id]?.[nusach] ?? [],
      notToday: open ? undefined : { label: standaloneAvailability(id, nusach).availableLabel ?? null },
    });
  }
  const textItems = texts.map((text): SettingsSearchContentItem => ({
    id: `siddur:${text.id}`,
    kind: 'siddur',
    icon: text.icon,
    title: text.title,
    terms: [],
    href: { pathname: '/siddur/[id]', params: { id: text.id } },
    notToday: text.notToday,
  }));
  const chapterItems = texts.flatMap((text) => {
    const shown = text.chapters.filter((chapter) => chapterVisible(chapter, voice, maritalStatus));
    if (shown.length < 2) return [];
    return shown.map((chapter): SettingsSearchContentItem => ({
      id: `chapter:${text.id}:${chapter.he}`,
      kind: 'chapter',
      icon: text.icon,
      title: { he: chapter.he, en: chapter.en },
      textName: text.title,
      terms: [text.title.he, text.title.en],
      href: { pathname: '/siddur/[id]', params: { id: text.id, section: chapter.he } },
      notToday: text.notToday,
    }));
  });
  return [...mitzvahItems, ...textItems, ...chapterItems];
}

export function typedInOtherLayout(query: string): string | null {
  const lower = query.toLowerCase();
  if (/[a-z]/.test(lower) && !/[א-ת]/.test(lower)) {
    return [...lower].map((char) => EN_TO_HE[char] ?? char).join('');
  }
  if (/[א-ת]/.test(lower) && !/[a-z]/.test(lower)) {
    return [...lower].map((char) => HE_TO_EN[char] ?? char).join('');
  }
  return null;
}

function editDistanceWithin(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let previous2: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, previous2[j - 2] + 1);
      }
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return false;
    previous2 = previous;
    previous = current;
  }
  return previous[b.length] <= max;
}

const sorted = (text: string) => [...text].sort().join('');

const isTransposition = (a: string, b: string): boolean =>
  a.length === b.length && sorted(a) === sorted(b) && editDistanceWithin(a, b, 1);

function wordScore(token: string, word: string, fuzzy: boolean): number {
  if (word === token) return 4;
  if (word.startsWith(token)) return 3;
  if (token.length >= 2 && word.includes(token)) return 2;
  if (!fuzzy || token.length < 4) return 0;
  const head = word.slice(0, token.length);
  if (token.length < 5) return isTransposition(token, head) ? (head === word ? 1.5 : 1) : 0;
  const max = token.length >= 8 ? 2 : 1;
  if (editDistanceWithin(token, word, max)) return 1.5;
  if (word.length > token.length && editDistanceWithin(token, head, max)) return 1;
  return 0;
}

function tokenVariants(token: string): { token: string; penalty: number }[] {
  const variants = [{ token, penalty: 0 }];
  let rest = token;
  while (rest.length >= 4 && variants.length < 3 && HEBREW_PREFIXES.includes(rest[0])) {
    rest = rest.slice(1);
    variants.push({ token: rest, penalty: 0.5 * variants.length });
  }
  return variants;
}

function tokenScore(token: string, entry: SettingsSearchEntry, fuzzy: boolean): number {
  let best = 0;
  for (const variant of tokenVariants(token)) {
    for (const word of entry.words) {
      const score = wordScore(variant.token, word, fuzzy);
      if (score === 0) continue;
      const bonus = entry.titleWords.includes(word) ? 1 : 0;
      best = Math.max(best, score + bonus - variant.penalty);
    }
  }
  return best;
}

function queryScore(query: string, entry: SettingsSearchEntry, fuzzy: boolean): number {
  const tokens = wordsOf(query);
  if (tokens.length === 0) return 0;
  let total = 0;
  for (const token of tokens) {
    const score = tokenScore(token, entry, fuzzy);
    if (score <= 0) return 0;
    total += score;
  }
  const whole = normalizeSearchText(query);
  if (tokens.length > 1 && entry.words.join(' ').includes(whole)) total += 2;
  return total / tokens.length;
}

export const SETTINGS_SEARCH_LIMIT = 12;

const KIND_RANK: Record<SettingsSearchKind, number> = { mitzvah: 1, siddur: 2, chapter: 3 };
const kindRank = (item: SettingsSearchItem): number => (item.kind ? KIND_RANK[item.kind] : 0);

// Exact, prefix and substring matches first; typo tolerance only when they find nothing,
// so a near-miss of another word (גיבוי / כיבוי) never crowds out what the user typed.
export function searchSettings(
  query: string,
  index: readonly SettingsSearchEntry[],
  context: SettingsSearchContext,
  limit = SETTINGS_SEARCH_LIMIT,
): SettingsSearchItem[] {
  if (!normalizeSearchText(query)) return [];
  const swapped = typedInOtherLayout(query);
  const visible = index.filter((entry) => !entry.item.when || context[entry.item.when]);
  const rank = (fuzzy: boolean) =>
    visible
      .map((entry, order) => {
        const direct = queryScore(query, entry, fuzzy);
        const viaLayout = swapped ? queryScore(swapped, entry, fuzzy) * 0.9 : 0;
        return { entry, order, score: Math.max(direct, viaLayout) };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || kindRank(a.entry.item) - kindRank(b.entry.item) || a.order - b.order);
  const strict = rank(false);
  return (strict.length > 0 ? strict : rank(true)).slice(0, limit).map((result) => result.entry.item);
}
