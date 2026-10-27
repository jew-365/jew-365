import { CITIES } from '@/data/cities';
import { iconFor, type IconName } from '@/components/MitzvahIcon';
import { CHOK_TEXT_ID } from '@/data/chok';
import { GUIDE_TOPICS } from '@/data/guide';
import { HALACHA_LINES, phoneLabel, type HalachaRuling } from '@/data/halachaLines';
import { hilulaPage } from '@/data/hilulaPages';
import { HILULOT, hilulaDateLabel, upcomingHilulot } from '@/data/hilulot';
import { LIBRARY_GROUPS } from '@/data/mitzvot';
import type { Achievements, BadgeId } from '@/stores/useCompletionsStore';
import { STREAK_BADGE_DAYS, type MarkTotals } from './badges';
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
import { HebcalService } from '@/services/HebcalService';
import type { MaritalStatus } from '@/stores/useUserStore';
import type { LibraryGroup, Mitzvah, Nusach } from '@/types/mitzvah';
import type { SiddurChapterTitle, SiddurText, SiddurTextId, SiddurVoice } from '@/types/siddur';
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
  // Long prose (a guide topic's paragraphs, a badge's description): matched by whole words and
  // their prefixes only, so a short query never finds every item through the middle of a word.
  body?: readonly string[];
  when?: SettingsSearchCondition;
};

export type SettingsSearchSettingItem = SearchItemBase & {
  kind?: undefined;
  titleKey: string;
  section?: SettingsSectionKey;
  route?: '/mitzvot' | '/custom-mitzvah' | '/hilulot' | '/rosh-chodesh' | '/guide';
};

export type SettingsSearchName = { he: string; en: string };

export type HistoryTab = 'summary' | 'trends' | 'achievements';

export type ScreenPath =
  | '/(tabs)/home'
  | '/(tabs)/history'
  | '/(tabs)/siddur'
  | '/(tabs)/more'
  | '/(tabs)/settings'
  | '/mitzvot'
  | '/schedule'
  | '/compass'
  | '/report'
  | '/checkin'
  | '/taharah'
  | '/taharah/log'
  | '/taharah/calendar'
  | '/taharah/settings';

export type SettingsSearchHref =
  | { pathname: '/mitzvah/[id]'; params: { id: string } }
  | { pathname: '/siddur/[id]'; params: { id: string; section?: string; segment?: string } }
  | { pathname: '/hilula/[id]'; params: { id: string } }
  | { pathname: '/(tabs)/history'; params: { tab: HistoryTab } }
  | { pathname: '/(tabs)/siddur'; params: { group: string } }
  | { pathname: '/(tabs)/more'; params: { open: 'halacha' } }
  | { pathname: '/guide'; params: { topic: string } }
  | ScreenPath;

export type SettingsSearchNotToday = { label: SettingsSearchName | null };

export type SettingsSearchContentItem = SearchItemBase & {
  title: SettingsSearchName;
  href: SettingsSearchHref;
  notToday?: SettingsSearchNotToday;
} & (
    | { kind: 'mitzvah' | 'siddur' }
    | { kind: 'chapter'; textName: SettingsSearchName }
    | { kind: 'hilula'; caption: SettingsSearchName }
    | { kind: AppSearchKind; caption: SettingsSearchName }
  );

export type AppSearchKind = 'screen' | 'category' | 'stat' | 'badge' | 'topic' | 'hotline' | 'section' | 'passage';

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
  bodyWords: readonly string[];
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
    const words = [...new Set([...titleWords, ...rest])];
    const bodyWords = [...new Set((item.body ?? []).flatMap(wordsOf))].filter((word) => !words.includes(word));
    return { item, titleWords, words, bodyWords };
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
  const days = new Map(
    upcomingHilulot(HebcalService.hebrewDayAt(now, location), inIsrael).map(({ hilula, day }) => [hilula.id, day]),
  );
  const hilulaItems = HILULOT.flatMap((hilula): SettingsSearchContentItem[] => {
    const day = days.get(hilula.id);
    if (!day) return [];
    return [
      {
        id: `hilula:${hilula.id}`,
        kind: 'hilula',
        icon: 'hilula',
        title: hilula.name,
        caption: { he: hilulaDateLabel(day, 'he'), en: hilulaDateLabel(day, 'en') },
        terms: [...(hilula.aliases?.he ?? []), ...(hilula.aliases?.en ?? []), ...hilulaPageTerms(hilula.id)],
        href: { pathname: '/hilula/[id]', params: { id: hilula.id } },
      },
    ];
  });
  return [...mitzvahItems, ...textItems, ...chapterItems, ...hilulaItems];
}

// A tzaddik is found by his works and by the place of his grave too (the owner's call, 2026-10-27).
function hilulaPageTerms(id: string): string[] {
  const page = hilulaPage(id);
  if (!page) return [];
  return [...page.works.flatMap((work) => [work.title.he, work.title.en]), page.grave.place.he, page.grave.place.en];
}

export type SearchNamer = (key: string, params?: Record<string, string | number>) => SettingsSearchName;

export type SearchStats = {
  achievements: Achievements | null;
  totals: MarkTotals;
  mitzvot: readonly Mitzvah[];
};

export type AppContentInput = {
  name: SearchNamer;
  mitzvot: readonly Mitzvah[];
  nusach: Nusach;
  ruling: HalachaRuling;
  taharah: boolean;
  stats: SearchStats;
};

type ScreenEntry = {
  id: string;
  icon: IconName;
  titleKey: string;
  captionKey: string;
  href: SettingsSearchHref;
  terms: readonly string[];
  when?: SettingsSearchCondition;
};

const HISTORY_TABS: readonly HistoryTab[] = ['summary', 'trends', 'achievements'];

// Every screen a user can reach, by the words people use for it. The coverage suite fails on a
// route under src/app that neither this list, a setting's `route` nor a content kind opens.
export const SEARCH_SCREENS: readonly ScreenEntry[] = [
  {
    id: 'home',
    icon: 'sun',
    titleKey: 'nav.home',
    captionKey: 'home.title',
    href: '/(tabs)/home',
    terms: ['בית', 'היום', 'מסך הבית', 'מצוות היום', 'home', 'today'],
  },
  {
    id: 'history',
    icon: 'check',
    titleKey: 'nav.history',
    captionKey: 'history.streakExplain',
    href: '/(tabs)/history',
    terms: ['מעקב', 'היסטוריה', 'סטטיסטיקה', 'נתונים', 'התקדמות', 'history', 'tracking', 'statistics', 'progress'],
  },
  {
    id: 'siddur',
    icon: 'siddur',
    titleKey: 'nav.siddur',
    captionKey: 'settings.search.screen.siddur',
    href: '/(tabs)/siddur',
    terms: ['סידור', 'תפילות', 'נוסח', 'siddur', 'prayers', 'prayer book'],
  },
  {
    id: 'more',
    icon: 'general',
    titleKey: 'nav.more',
    captionKey: 'settings.search.screen.more',
    href: '/(tabs)/more',
    terms: ['עוד', 'more'],
  },
  {
    id: 'settingsTab',
    icon: 'sliders',
    titleKey: 'nav.settings',
    captionKey: 'settings.search.screen.settings',
    href: '/(tabs)/settings',
    terms: ['הגדרות', 'settings', 'preferences'],
  },
  {
    id: 'schedule',
    icon: 'calendar',
    titleKey: 'schedule.title',
    captionKey: 'more.scheduleCaption',
    href: '/schedule',
    terms: ['לוח', 'לוח זמנים', 'יומן', 'שבוע', 'חודש', 'זמני היום', 'schedule', 'calendar', 'week', 'month', 'zmanim'],
  },
  {
    id: 'compass',
    icon: 'compass',
    titleKey: 'compass.title',
    captionKey: 'compass.caption',
    href: '/compass',
    terms: ['מצפן', 'כותל', 'כיוון', 'מזרח', 'ירושלים', 'רדאר', 'compass', 'kotel', 'direction', 'east', 'mizrach'],
  },
  {
    id: 'report',
    icon: 'check',
    titleKey: 'report.title',
    captionKey: 'history.reports.title',
    href: '/report',
    terms: ['דוח', 'דוחות', 'סיכום', 'שבועי', 'report', 'weekly', 'summary'],
  },
  {
    id: 'checkin',
    icon: 'check',
    titleKey: 'settings.search.screen.checkin',
    captionKey: 'settings.search.screen.checkinCaption',
    href: '/checkin',
    terms: ['צק אין', 'צ׳ק־אין', 'מוצאי שבת', 'אחרי שבת', 'אחרי חג', 'סימון', 'check in', 'checkin', 'after shabbat'],
  },
  {
    id: 'halacha',
    icon: 'phone',
    titleKey: 'more.halacha.title',
    captionKey: 'settings.search.screen.halacha',
    href: { pathname: '/(tabs)/more', params: { open: 'halacha' } },
    terms: ['קו ההלכה', 'הלכה', 'שאלה', 'רב', 'רבנים', 'בית הוראה', 'פסק', 'halacha', 'rabbi', 'question', 'hotline'],
  },
  {
    id: 'taharah',
    icon: 'user',
    titleKey: 'taharah.home.title',
    captionKey: 'settings.search.screen.taharah',
    href: '/taharah',
    terms: ['טהרה', 'טהרת המשפחה', 'נידה', 'מקווה', 'וסת', 'taharah', 'niddah', 'mikveh', 'family purity'],
    when: 'taharah',
  },
  {
    id: 'taharahLog',
    icon: 'user',
    titleKey: 'taharah.log.title',
    captionKey: 'taharah.home.title',
    href: '/taharah/log',
    terms: ['רישום', 'הפסק טהרה', 'בדיקה', 'טבילה', 'ראייה', 'log', 'hefsek', 'bedika', 'tevila'],
    when: 'taharah',
  },
  {
    id: 'taharahCalendar',
    icon: 'calendar',
    titleKey: 'taharah.calendar.title',
    captionKey: 'taharah.home.title',
    href: '/taharah/calendar',
    terms: ['לוח טהרה', 'עונות', 'פרישה', 'calendar', 'onot', 'perisha'],
    when: 'taharah',
  },
  {
    id: 'taharahSettings',
    icon: 'sliders',
    titleKey: 'taharah.settings.title',
    captionKey: 'taharah.home.title',
    href: '/taharah/settings',
    terms: ['מנהג', 'פוסק', 'הגדרות טהרה', 'minhag', 'preset', 'taharah settings'],
    when: 'taharah',
  },
];

type HistoryCard = { id: string; titleKey: string; tab: HistoryTab; terms: readonly string[] };

// The cards of the tracking tab, each opening the tab it sits on.
const HISTORY_CARDS: readonly HistoryCard[] = [
  {
    id: 'period',
    titleKey: 'settings.search.stat.period',
    tab: 'summary',
    terms: ['יומי', 'שבועי', 'חודשי', 'אחוז', 'טבעות', 'daily', 'weekly', 'monthly', 'percent', 'rings'],
  },
  {
    id: 'calendar',
    titleKey: 'settings.search.stat.calendar',
    tab: 'summary',
    terms: ['לוח', 'חודש עברי', 'ימים', 'calendar', 'hebrew month', 'days'],
  },
  {
    id: 'perMitzvah',
    titleKey: 'history.perMitzvah',
    tab: 'summary',
    terms: ['עקביות', 'לפי מצווה', 'consistency', 'per mitzvah'],
  },
  { id: 'weeks', titleKey: 'history.weeks.title', tab: 'trends', terms: ['שבועות', 'גרף', 'weeks', 'chart'] },
  {
    id: 'weekday',
    titleKey: 'history.weekday.title',
    tab: 'trends',
    terms: ['יום בשבוע', 'יום חזק', 'weekday', 'strongest day'],
  },
  {
    id: 'trend',
    titleKey: 'history.trend.title',
    tab: 'trends',
    terms: ['מגמה', 'שיפור', 'ירידה', 'trend', 'improve'],
  },
  {
    id: 'reports',
    titleKey: 'history.reports.title',
    tab: 'trends',
    terms: ['דוח', 'דוחות', 'שבועי', 'reports', 'weekly'],
  },
  {
    id: 'records',
    titleKey: 'history.records.title',
    tab: 'achievements',
    terms: ['שיא', 'שיאים', 'רצף ארוך', 'records', 'best', 'longest'],
  },
  {
    id: 'badges',
    titleKey: 'settings.search.stat.badges',
    tab: 'achievements',
    terms: ['הישג', 'הישגים', 'תג', 'תגים', 'פרס', 'badges', 'achievements', 'awards'],
  },
];

const LIBRARY_ICONS: Record<LibraryGroup, IconName> = {
  prayers: 'shacharit',
  daily: 'sun',
  weekly: 'calendar',
  seasonal: 'moon',
  other: 'star',
  mine: 'custom',
};

const SIDDUR_TAB_GROUPS = ['now', 'meals', 'prayers', 'mitzvot', 'general', 'occasions'] as const;

const dayLabelOf = (key: string): string => {
  const [year, month, day] = key.split('-').map(Number);
  return `${day}.${month}.${year}`;
};

const joinNames = (names: readonly SettingsSearchName[]): SettingsSearchName => ({
  he: names.map((n) => n.he).join(', '),
  en: names.map((n) => n.en).join(', '),
});

const withPrefix = (name: SearchNamer, kindKey: string, rest: SettingsSearchName): SettingsSearchName => {
  const kind = name(kindKey);
  return { he: `${kind.he} · ${rest.he}`, en: `${kind.en} · ${rest.en}` };
};

const textsOfName = (name: SettingsSearchName): string[] => [name.he, name.en];

// Everything beyond settings, mitzvot, texts and tzaddikim: screens, the library and siddur
// categories, the tracking tab's cards, figures and badges, the guide's topics and the halacha lines.
export function appContentItems({
  name,
  mitzvot,
  nusach,
  ruling,
  taharah,
  stats,
}: AppContentInput): SettingsSearchContentItem[] {
  const items: SettingsSearchContentItem[] = [];
  for (const screen of SEARCH_SCREENS) {
    if (screen.when === 'taharah' && !taharah) continue;
    items.push({
      id: `screen:${screen.id}`,
      kind: 'screen',
      icon: screen.icon,
      title: name(screen.titleKey),
      caption: name(screen.captionKey),
      terms: screen.terms,
      href: screen.href,
    });
  }
  for (const tab of HISTORY_TABS) {
    const title = name(`history.tab.${tab}`);
    items.push({
      id: `screen:history:${tab}`,
      kind: 'screen',
      icon: 'check',
      title: { he: `${name('nav.history').he} · ${title.he}`, en: `${name('nav.history').en} · ${title.en}` },
      caption: name('settings.search.kind.screen'),
      terms: textsOfName(title),
      href: { pathname: '/(tabs)/history', params: { tab } },
    });
  }
  for (const group of LIBRARY_GROUPS) {
    const inGroup = mitzvot.filter((mitzvah) => mitzvah.group === group).map(nameOf);
    if (group !== 'mine' && inGroup.length === 0) continue;
    items.push({
      id: `category:library:${group}`,
      kind: 'category',
      icon: LIBRARY_ICONS[group],
      title: name(`library.group.${group}`),
      caption: withPrefix(
        name,
        'settings.search.kind.category',
        inGroup.length ? joinNames(inGroup) : name('library.title'),
      ),
      terms: [...inGroup.flatMap(textsOfName), ...textsOfName(name('library.title'))],
      href: '/mitzvot',
    });
  }
  for (const group of SIDDUR_TAB_GROUPS) {
    const texts =
      group === 'meals' || group === 'general' || group === 'occasions'
        ? standaloneTextsIn(group, nusach).map((id) => STANDALONE_TEXTS[id].name)
        : [];
    items.push({
      id: `category:siddur:${group}`,
      kind: 'category',
      icon: 'siddur',
      title: withPrefix(name, 'nav.siddur', name(`siddur.group.${group}`)),
      caption: texts.length ? joinNames(texts) : name('settings.search.screen.siddur'),
      terms: [...textsOfName(name(`siddur.group.${group}`)), ...texts.flatMap(textsOfName)],
      href: { pathname: '/(tabs)/siddur', params: { group } },
    });
  }
  for (const card of HISTORY_CARDS) {
    items.push({
      id: `stat:card:${card.id}`,
      kind: 'stat',
      icon: 'check',
      title: name(card.titleKey),
      caption: withPrefix(name, 'nav.history', name(`history.tab.${card.tab}`)),
      terms: card.terms,
      href: { pathname: '/(tabs)/history', params: { tab: card.tab } },
    });
  }
  items.push(...statItems(name, stats), ...badgeItems(name, stats));
  for (const topic of GUIDE_TOPICS) {
    if (topic.taharahOnly && !taharah) continue;
    items.push({
      id: `topic:${topic.id}`,
      kind: 'topic',
      icon: topic.icon,
      title: topic.title,
      caption: name('settings.search.kind.topic'),
      terms: [],
      body: topic.body.flatMap(textsOfName),
      href: { pathname: '/guide', params: { topic: topic.id } },
    });
  }
  for (const line of HALACHA_LINES[ruling]) {
    items.push({
      id: `hotline:${line.id}`,
      kind: 'hotline',
      icon: 'phone',
      title: line.name,
      caption: withPrefix(name, 'more.halacha.title', { he: phoneLabel(line.phone), en: phoneLabel(line.phone) }),
      terms: [line.phone, ...(line.hours ? textsOfName(line.hours) : [])],
      href: { pathname: '/(tabs)/more', params: { open: 'halacha' } },
    });
  }
  return items;
}

const toAchievements = (tab: HistoryTab = 'achievements'): SettingsSearchHref => ({
  pathname: '/(tabs)/history',
  params: { tab },
});

function statItems(name: SearchNamer, { achievements, totals, mitzvot }: SearchStats): SettingsSearchContentItem[] {
  const best = achievements?.bestStreak?.days ?? 0;
  const week = achievements?.bestWeek;
  const items: SettingsSearchContentItem[] = [
    {
      id: 'stat:bestStreak',
      kind: 'stat',
      icon: 'sparkle',
      title: name('settings.search.stat.bestStreak'),
      caption: name(best === 1 ? 'history.records.days.once' : 'history.records.days', { count: best }),
      terms: ['שיא', 'רצף', 'הכי ארוך', 'record', 'streak', 'longest'],
      href: toAchievements(),
    },
    {
      id: 'stat:bestWeek',
      kind: 'stat',
      icon: 'calendar',
      title: name('settings.search.stat.bestWeek'),
      caption: week ? name('history.records.weekTitle', { percent: week.percent }) : name('history.records.none'),
      terms: ['שבוע', 'שיא', 'הטוב ביותר', 'week', 'best', 'record'],
      href: toAchievements(),
    },
    {
      id: 'stat:marks',
      kind: 'stat',
      icon: 'check',
      title: name('settings.search.stat.marks'),
      caption: name('settings.search.stat.marksCaption', { count: totals.total }),
      terms: ['סימונים', 'כמה', 'סך הכל', 'בוצע', 'marks', 'total', 'done', 'count'],
      href: toAchievements(),
    },
  ];
  for (const mitzvah of mitzvot) {
    const runBest = achievements?.mitzvahBest[mitzvah.id]?.days ?? 0;
    items.push({
      id: `stat:mitzvah:${mitzvah.id}`,
      kind: 'stat',
      icon: iconFor(mitzvah.icon),
      title: withPrefix(name, 'nav.history', nameOf(mitzvah)),
      caption: name('settings.search.stat.mitzvahCaption', {
        count: totals.byMitzvah[mitzvah.id] ?? 0,
        best: runBest,
      }),
      terms: ['עקביות', 'סימונים', 'consistency', 'marks'],
      href: toAchievements('summary'),
    });
  }
  return items;
}

const BADGE_TERMS = ['הישג', 'הישגים', 'תג', 'badge', 'achievement'];

function badgeItems(name: SearchNamer, { achievements, totals, mitzvot }: SearchStats): SettingsSearchContentItem[] {
  const earned = achievements?.badges ?? {};
  const caption = (id: BadgeId, left: SettingsSearchName | null): SettingsSearchName => {
    const on = earned[id];
    if (on) return name('settings.search.badge.earned', { date: dayLabelOf(on) });
    return left ? withPrefix(name, 'settings.search.badge.notYet', left) : name('settings.search.badge.notYet');
  };
  const leftOf = (key: string, count: number) =>
    count > 0 ? name(count === 1 ? `history.badge.left.${key}.once` : `history.badge.left.${key}`, { count }) : null;
  const badge = (
    id: BadgeId,
    titleKey: string,
    descriptionKey: string,
    params: Record<string, string | number>,
    left: SettingsSearchName | null,
  ): SettingsSearchContentItem => ({
    id: `badge:${id}`,
    kind: 'badge',
    icon: earned[id] ? 'star' : 'sparkle',
    title: name(titleKey, params),
    caption: caption(id, left),
    terms: BADGE_TERMS,
    body: textsOfName(name(descriptionKey, params)),
    href: toAchievements(),
  });
  return [
    ...STREAK_BADGE_DAYS.map((days) =>
      badge(`streak${days}`, 'history.badge.streak.title', 'history.badge.streak.description', { count: days }, null),
    ),
    badge('fullWeek', 'history.badge.fullWeek.title', 'history.badge.fullWeek.description', {}, null),
    badge('fullMonth', 'history.badge.fullMonth.title', 'history.badge.fullMonth.description', {}, null),
    badge(
      'thousandMarks',
      'history.badge.thousand.title',
      'history.badge.thousand.description',
      {},
      leftOf('marks', 1000 - totals.total),
    ),
    ...mitzvot.map((mitzvah) => {
      const display = nameOf(mitzvah);
      return {
        ...badge(
          `hundred:${mitzvah.id}`,
          'history.badge.hundred.title',
          'history.badge.hundred.description',
          { name: display.he },
          leftOf('times', 100 - (totals.byMitzvah[mitzvah.id] ?? 0)),
        ),
        title: {
          he: name('history.badge.hundred.title', { name: display.he }).he,
          en: name('history.badge.hundred.title', { name: display.en }).en,
        },
      };
    }),
  ];
}

// The current streak walks the days back, so it is read in the deep pass, never on a keystroke.
export function streakItem(name: SearchNamer, streak: number): SettingsSearchContentItem {
  return {
    id: 'stat:streak',
    kind: 'stat',
    icon: 'sparkle',
    title: name('settings.search.stat.streak'),
    caption: name(streak === 1 ? 'history.streakDays.once' : 'settings.search.stat.streakCaption', { count: streak }),
    terms: ['רצף', 'ימים ברצף', 'כמה ימים', 'streak', 'days in a row'],
    href: toAchievements('summary'),
  };
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
    if (best > 0 || variant.token.length < 3) continue;
    for (const word of entry.bodyWords) {
      const score = word === variant.token ? 2 : word.startsWith(variant.token) ? 1.5 : 0;
      best = Math.max(best, score - variant.penalty);
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

export const SEARCH_CLOSE_LIMIT = 20;
export const SEARCH_MAYBE_LIMIT = 8;

const KIND_RANK: Record<SettingsSearchKind, number> = {
  mitzvah: 1,
  siddur: 2,
  chapter: 3,
  section: 4,
  screen: 5,
  category: 6,
  hilula: 7,
  stat: 8,
  badge: 9,
  hotline: 10,
  topic: 11,
  passage: 12,
};
const kindRank = (item: SettingsSearchItem): number => (item.kind ? KIND_RANK[item.kind] : 0);

export type SearchTiers = { close: SettingsSearchItem[]; maybe: SettingsSearchItem[] };

function rankEntries(query: string, entries: readonly SettingsSearchEntry[], fuzzy: boolean): SettingsSearchItem[] {
  const swapped = typedInOtherLayout(query);
  return entries
    .map((entry, order) => {
      const direct = queryScore(query, entry, fuzzy);
      const viaLayout = swapped ? queryScore(swapped, entry, fuzzy) * 0.9 : 0;
      return { entry, order, score: Math.max(direct, viaLayout) };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || kindRank(a.entry.item) - kindRank(b.entry.item) || a.order - b.order)
    .map((result) => result.entry.item);
}

// Two tiers (the owner's call, 2026-10-27): `close` holds exact, prefix and substring matches in
// score order; `maybe` holds what only typo tolerance finds, shown after them and apart, so a
// near-miss of another word (גיבוי / כיבוי) never crowds out what the user typed.
export function searchTiers(
  query: string,
  index: readonly SettingsSearchEntry[],
  context: SettingsSearchContext,
  limits = { close: SEARCH_CLOSE_LIMIT, maybe: SEARCH_MAYBE_LIMIT },
): SearchTiers {
  if (!normalizeSearchText(query)) return { close: [], maybe: [] };
  const visible = index.filter((entry) => !entry.item.when || context[entry.item.when]);
  const close = rankEntries(query, visible, false);
  const found = new Set(close.map((item) => item.id));
  const maybe = rankEntries(query, visible, true).filter((item) => !found.has(item.id));
  return { close: close.slice(0, limits.close), maybe: maybe.slice(0, limits.maybe) };
}

// The close tier, or the near misses when nothing is close.
export function searchSettings(
  query: string,
  index: readonly SettingsSearchEntry[],
  context: SettingsSearchContext,
  limit = SETTINGS_SEARCH_LIMIT,
): SettingsSearchItem[] {
  const { close, maybe } = searchTiers(query, index, context, { close: limit, maybe: limit });
  return close.length > 0 ? close : maybe;
}

export type DeepSegment = { key: string; words: readonly string[]; shown: readonly string[] };
export type DeepSection = { title: SettingsSearchName; segments: readonly DeepSegment[] };
export type DeepText = {
  id: string;
  name: SettingsSearchName;
  icon: IconName;
  sections: readonly DeepSection[];
  entries: readonly SettingsSearchEntry[];
};

const plainHebrew = (text: string): string => text.replace(/[־-]/g, ' ').normalize('NFKD').replace(/[֑-ׇ]/g, '');

// A loaded siddur text as the deep pass searches it: each section by its title and headings, and
// each keyed segment word by word, the shown words kept beside the normalized ones for a snippet.
export function deepTextOf(
  text: SiddurText,
  id: string,
  name: SettingsSearchName,
  icon: IconName,
  namer: SearchNamer,
): DeepText {
  const caption = {
    he: namer('settings.search.kind.chapter', { text: name.he }).he,
    en: namer('settings.search.kind.chapter', { text: name.en }).en,
  };
  const items: SettingsSearchContentItem[] = text.sections.map((section) => ({
    id: `section:${id}:${section.title.he}`,
    kind: 'section',
    icon,
    title: section.title,
    caption,
    terms: [...(section.headings ?? []).flatMap((heading) => [heading.he, heading.en]), name.he, name.en],
    href: { pathname: '/siddur/[id]', params: { id, section: section.title.he } },
  }));
  const sections = text.sections.map((section) => ({
    title: section.title,
    segments: section.segments.flatMap((segment) => {
      if (!segment.key) return [];
      const shown = plainHebrew(segment.he.map((runs) => runs.map((run) => run.t).join('')).join(' '))
        .split(/\s+/)
        .filter(Boolean);
      return [{ key: segment.key, shown, words: shown.map((word) => normalizeSearchText(word).replace(/ /g, '')) }];
    }),
  }));
  return { id, name, icon, sections, entries: buildSettingsSearchIndex(() => [], items) };
}

const SNIPPET_BEFORE = 3;
const SNIPPET_WORDS = 9;
const PASSAGES_PER_TEXT = 3;

function phraseAt(words: readonly string[], at: number, tokens: readonly string[], fuzzy: boolean): boolean {
  return tokens.every((token, index) => {
    const word = words[at + index];
    if (word === undefined) return false;
    if (word === token || (index === tokens.length - 1 && word.startsWith(token))) return true;
    return fuzzy && token.length >= 4 && wordScore(token, word, true) > 0;
  });
}

function passageHits(
  query: string,
  texts: readonly DeepText[],
  namer: SearchNamer,
  fuzzy: boolean,
): SettingsSearchContentItem[] {
  const tokens = wordsOf(query);
  if (tokens.length === 0 || (tokens.length === 1 && tokens[0].length < 3)) return [];
  // Per section the segment where the phrase sits earliest, so a passage that opens with it
  // (אשרי in Ashrei) beats a note that only quotes it; across texts the same order, then text order.
  const hits: { at: number; order: number; item: SettingsSearchContentItem }[] = [];
  for (const text of texts) {
    const inText: typeof hits = [];
    for (const section of text.sections) {
      let best: { at: number; segment: DeepSegment } | null = null;
      for (const segment of section.segments) {
        const at = segment.words.findIndex((_, index) => phraseAt(segment.words, index, tokens, fuzzy));
        if (at >= 0 && (!best || at < best.at)) best = { at, segment };
        if (best?.at === 0) break;
      }
      if (!best) continue;
      const { at, segment } = best;
      const from = Math.max(0, at - SNIPPET_BEFORE);
      const shown = segment.shown.slice(from, from + SNIPPET_WORDS).join(' ');
      const snippet = `${from > 0 ? '… ' : ''}${shown}${from + SNIPPET_WORDS < segment.shown.length ? ' …' : ''}`;
      inText.push({
        at,
        order: hits.length + inText.length,
        item: {
          id: `passage:${text.id}:${segment.key}`,
          kind: 'passage',
          icon: text.icon,
          title: { he: snippet, en: snippet },
          caption: {
            he: namer('settings.search.kind.passage', { text: text.name.he, section: section.title.he }).he,
            en: namer('settings.search.kind.passage', { text: text.name.en, section: section.title.en }).en,
          },
          terms: [],
          href: { pathname: '/siddur/[id]', params: { id: text.id, segment: segment.key } },
        },
      });
    }
    hits.push(...inText.sort((x, y) => x.at - y.at || x.order - y.order).slice(0, PASSAGES_PER_TEXT));
  }
  return hits.sort((x, y) => Number(x.at > 0) - Number(y.at > 0) || x.order - y.order).map((hit) => hit.item);
}

// The deep pass over loaded siddur texts: section titles first, then the passages that hold the
// query as a phrase; what only typo tolerance finds goes to `maybe`.
export function searchDeep(
  query: string,
  texts: readonly DeepText[],
  namer: SearchNamer,
  limits = { close: SEARCH_CLOSE_LIMIT, maybe: SEARCH_MAYBE_LIMIT },
): SearchTiers {
  if (!normalizeSearchText(query)) return { close: [], maybe: [] };
  const entries = texts.flatMap((text) => text.entries);
  const sections = rankEntries(query, entries, false);
  const passages = passageHits(query, texts, namer, false);
  const close = [...sections, ...passages];
  const found = new Set(close.map((item) => item.id));
  const maybe = [...rankEntries(query, entries, true), ...passageHits(query, texts, namer, true)].filter(
    (item) => !found.has(item.id),
  );
  return { close: close.slice(0, limits.close), maybe: maybe.slice(0, limits.maybe) };
}
