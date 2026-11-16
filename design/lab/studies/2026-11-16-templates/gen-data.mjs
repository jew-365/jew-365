// The templates study's copy of the setup study's data script (2026-11-13-setup), changed for D2.
// Writes data.json from the app's own code and files, so every phone shows the app's words, icons and rules:
// the six palettes (src/theme/colors.ts), the Hebrew and English strings (src/i18n), the mitzvot library of a fresh
// install of nusach Ashkenaz (src/data/mitzvot.ts with DEFAULT_ON_MITZVOT), the personal goal of the capabilities
// screen (src/data/capabilities.ts), the icons a custom mitzvah may take (CUSTOM_ICON_CHOICES of
// src/data/customIcons.ts, drawn from jewishIcons.generated.ts and MitzvahIcon.tsx), a sample day's zmanim in
// Jerusalem (ZmanimService), and, for each proposed template, its window on that day and the notifications the smart
// nag would send at the app's default level (customNagZone() and smartNagTimes() of src/utils/nagging.ts).
// The templates themselves (names, benefits, hours, days, icons) are proposed copy, written here in TEMPLATES.
// Run with the loader that lets Node read the app's TypeScript:
//   TZ=Asia/Jerusalem node --import ./ts-loader/register.mjs gen-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (process.env.TZ !== 'Asia/Jerusalem') throw new Error('run with TZ=Asia/Jerusalem, so the device day is the location day');
const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '../../../../');
const read = (p) => readFileSync(join(REPO, p), 'utf8');
const app = (p) => import(pathToFileURL(join(REPO, 'src', p)).href);

const { CAPABILITIES } = await app('data/capabilities.ts');
const { MITZVOT, LIBRARY_GROUPS } = await app('data/mitzvot.ts');
const { CUSTOM_ICON_CHOICES } = await app('data/customIcons.ts');
const { JEWISH_ICONS, JEWISH_TONES } = await app('components/jewishIcons.generated.ts');
const { CITIES } = await app('data/cities.ts');
const { ZmanimService } = await app('services/ZmanimService.ts');
const { customNagZone, smartNagTimes, CUSTOM_PERFORM_MIN_DEFAULT, ORANGE_LEAD_MIN, DEFAULT_NAG_LEVEL } = await app('utils/nagging.ts');
const { categoryForWindow } = await app('utils/customMitzvah.ts');

// The palettes, as the compass study reads them.
const colors = read('src/theme/colors.ts');
const CONSTANTS = { gold: 'T_LIGHT', pink: 'T_PINK', purple: 'T_PURPLE', blue: 'T_BLUE', dark: 'T_DARK', plum: 'T_PLUM' };
const KEYS = ['bg', 'surface', 'surface2', 'text', 'textSub', 'textMuted', 'border', 'gold', 'onGold', 'goldLight', 'goldText', 'safe', 'tabBg', 'urgent'];
const PALETTES = Object.fromEntries(
  Object.entries(CONSTANTS).map(([name, constant]) => {
    const block = colors.slice(colors.indexOf(`export const ${constant}:`));
    return [name, Object.fromEntries(KEYS.map((k) => [k, block.match(new RegExp(`\\n  ${k}: '([^']+)'`))?.[1]]))];
  }),
);
for (const [name, p] of Object.entries(PALETTES))
  for (const [k, v] of Object.entries(p)) if (!v) throw new Error(`palette ${name} lacks ${k}`);

const dict = { he: JSON.parse(read('src/i18n/he.json')), en: JSON.parse(read('src/i18n/en.json')) };
const KEYS_USED = [
  'library.title', 'library.subtitle', 'library.addCustom', 'custom.title', 'custom.editTitle', 'custom.name', 'custom.icon',
  'custom.startTime', 'custom.endTime', 'custom.schedule', 'custom.schedule.weekdays', 'custom.skipShabbat',
  'custom.skipYomtov', 'custom.save', 'custom.performMin', 'detail.timeWindow', 'detail.editCustom', 'detail.activeTitle',
  'detail.activeOn', 'detail.timeRange', 'detail.timeline.listTitle', 'detail.timeline.legend.reminder',
  'detail.timeline.legend.warning', 'detail.timeline.legend.lastChance', 'detail.timeline.legend.zone',
  'detail.timeline.kind.open', 'detail.timeline.kind.soon', 'detail.nagLevel', 'capabilities.title', 'capabilities.subtitle',
  'capabilities.goalCount', 'capabilities.on', 'capabilities.turnOn', 'capability.goal.personal', 'common.back',
  'nav.home', 'nav.siddur', 'nav.history', 'nav.settings', 'nav.more', 'library.group.mine',
  ...LIBRARY_GROUPS.map((g) => `library.group.${g}`),
  ...[0, 1, 2, 3, 4, 5, 6].map((d) => `weekday.short.${d}`),
  ...Object.keys(PALETTES).map((p) => `settings.theme.${p}`),
];
const STRINGS = Object.fromEntries(
  ['he', 'en'].map((lang) => [
    lang,
    Object.fromEntries(
      KEYS_USED.map((k) => {
        if (dict[lang][k] === undefined) throw new Error(`missing ${lang} string ${k}`);
        return [k, dict[lang][k]];
      }),
    ),
  ]),
);

// The library of a fresh install (nusach Ashkenaz), by group, with each mitzvah's name, icon and whether it is on.
const store = read('src/stores/useMitzvotStore.ts');
const at = store.indexOf('export const DEFAULT_ON_MITZVOT');
const DEFAULT_ON = store.slice(store.indexOf('= [', at), store.indexOf(']', store.indexOf('= [', at))).match(/'([a-z_]+)'/g).map((x) => x.slice(1, -1));
const LIBRARY = LIBRARY_GROUPS.filter((g) => g !== 'mine')
  .map((g) => ({
    group: g,
    rows: MITZVOT.filter((m) => m.group === g && m.nuschaotSupported.includes('ashkenaz')).map((m) => ({
      id: m.id,
      icon: m.icon,
      he: m.name.he,
      en: m.name.en ?? m.name.he,
      on: DEFAULT_ON.includes(m.id),
    })),
  }))
  .filter((g) => g.rows.length);

// The capabilities screen's personal goal (direction ב of the hub study, built as capabilities.tsx).
const PERSONAL = CAPABILITIES.filter((c) => c.goal === 'personal').map((c) => ({
  id: c.id,
  icon: c.icon,
  he: { title: dict.he[`capability.${c.id}.title`], benefit: dict.he[`capability.${c.id}.benefit`] },
  en: { title: dict.en[`capability.${c.id}.title`], benefit: dict.en[`capability.${c.id}.benefit`] },
}));

// One sample day, Wednesday 2026-11-18 (8 Kislev 5787) in Jerusalem, the day the setup and hub studies show.
const jerusalem = CITIES.find((c) => c.cityId === 'jerusalem');
const z = ZmanimService.getZmanim(new Date(2026, 10, 18, 12), jerusalem);
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const ZMANIM = { netz: hhmm(z.netzHaChama), sofTfila: hhmm(z.sofZmanTfilaGra), shkia: hhmm(z.shkia), tzeit: hhmm(z.tzeitHakochavim) };
const ZMAN_NAMES = {
  netz: { he: 'הנץ החמה', en: 'sunrise' },
  sofTfila: { he: 'סוף זמן תפילה', en: 'the latest Shacharit' },
  shkia: { he: 'השקיעה', en: 'sunset' },
  tzeit: { he: 'צאת הכוכבים', en: 'nightfall' },
};

// The proposed templates (proposed copy): each an hours pair on the clock, as the custom form saves today, or a
// pair anchored to a zman (`from` / `to` naming a zman), which the form cannot save yet (a decision for the owner).
// Days are weekdays, 0 Sunday; every template skips Yom Tov and none falls on Shabbat.
const ALL_WEEK = [0, 1, 2, 3, 4, 5];
const EVENINGS = [0, 1, 2, 3, 4];
const TEMPLATES = [
  { id: 'tzedakah', group: 'daily', icon: 'sparkle', start: '08:00', end: '14:00', days: ALL_WEEK,
    he: { name: 'צדקה יומית', benefit: 'נתינה קטנה בכל יום, עוד לפני הצהריים' },
    en: { name: 'Daily tzedakah', benefit: 'A small gift every day, before noon' } },
  { id: 'tehillim', group: 'learning', icon: 'tehillim', from: 'sofTfila', to: 'shkia', days: ALL_WEEK,
    he: { name: 'פרק תהילים', benefit: 'פרק אחד ביום, אחרי התפילה של הבוקר' },
    en: { name: 'A chapter of Tehillim', benefit: 'One chapter a day, after the morning prayer' } },
  { id: 'shiur', group: 'learning', icon: 'chok', start: '20:00', end: '22:30', days: EVENINGS,
    he: { name: 'שיעור תורה', benefit: 'שיעור קבוע בערב, אחרי היום' },
    en: { name: 'A Torah class', benefit: 'A set class in the evening, after the day' } },
  { id: 'parents', group: 'family', icon: 'phone', start: '18:00', end: '21:00', days: EVENINGS,
    he: { name: 'שיחה עם ההורים', benefit: 'כמה דקות של קשר, בכל ערב' },
    en: { name: 'Call my parents', benefit: 'A few minutes together, every evening' } },
  { id: 'thanks', group: 'daily', icon: 'sun', start: '21:00', end: '23:30', days: EVENINGS,
    he: { name: 'רגע של תודה', benefit: 'שלושה דברים טובים מהיום, לפני השינה' },
    en: { name: 'A moment of thanks', benefit: 'Three good things from today, before bed' } },
  { id: 'commute', group: 'daily', icon: 'suitcase', start: '07:00', end: '09:30', days: EVENINGS,
    he: { name: 'לימוד בדרך', benefit: 'עשר דקות של לימוד בדרך לעבודה או ללימודים' },
    en: { name: 'Learning on the way', benefit: 'Ten minutes of learning on the way to work or class' } },
  { id: 'mishnayot', group: 'learning', icon: 'siddur', start: '06:30', end: '08:30', days: ALL_WEEK,
    he: { name: 'שתי משניות', benefit: 'שתי משניות בבוקר, לפני שהיום מתחיל' },
    en: { name: 'Two mishnayot', benefit: 'Two mishnayot in the morning, before the day begins' } },
  { id: 'story', group: 'family', icon: 'night', start: '19:00', end: '20:30', days: EVENINGS,
    he: { name: 'סיפור לילדים', benefit: 'סיפור לפני השינה, מספר שתבחרו' },
    en: { name: 'A story for the kids', benefit: 'A bedtime story from a book you choose' } },
  { id: 'kidsLearning', group: 'family', icon: 'user', start: '17:00', end: '19:00', days: EVENINGS,
    he: { name: 'לימוד עם הילדים', benefit: 'חצי שעה ביחד אחרי הצהריים' },
    en: { name: 'Learning with the kids', benefit: 'Half an hour together in the afternoon' } },
  { id: 'shabbatPrep', group: 'weekly', icon: 'challah', start: '08:00', end: '12:00', days: [5],
    he: { name: 'הכנות לשבת', benefit: 'רשימה אחת ביום שישי בבוקר, בלי לחץ של הרגע האחרון' },
    en: { name: 'Getting ready for Shabbat', benefit: 'One Friday-morning list, without the last-minute rush' } },
  { id: 'grandparents', group: 'weekly', icon: 'chat', start: '09:00', end: '13:00', days: [5],
    he: { name: 'שבת שלום לסבא וסבתא', benefit: 'שיחה קצרה לפני שבת' },
    en: { name: 'Shabbat shalom to grandparents', benefit: 'A short call before Shabbat' } },
];
const GROUPS = [
  { id: 'daily', he: 'יומי', en: 'Daily' },
  { id: 'weekly', he: 'שבועי', en: 'Weekly' },
  { id: 'family', he: 'משפחה', en: 'Family' },
  { id: 'learning', he: 'לימוד', en: 'Learning' },
];

// Each template's window on a sample day it applies on (Wednesday 18 November, or Friday 20 November for the Friday
// ones), and the notifications of that window at the default level: the one reminder at its start (firstReminder()
// of custom-mitzvah.tsx), then the smart nag's red (the end less the default 10 minutes it takes), its orange
// (ORANGE_LEAD_MIN before the red) and the critical zone's opener (customNagZone()).
const clockOn = (date, t) => { const [h, m] = t.split(':').map(Number); return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m); };
const zmanOn = (date, id) => {
  const zz = ZmanimService.getZmanim(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12), jerusalem);
  return { netz: zz.netzHaChama, sofTfila: zz.sofZmanTfilaGra, shkia: zz.shkia, tzeit: zz.tzeitHakochavim }[id];
};
const MIN = 60_000;
for (const tp of TEMPLATES) {
  const date = tp.days.includes(3) ? new Date(2026, 10, 18) : new Date(2026, 10, 20);
  const start = tp.from ? zmanOn(date, tp.from) : clockOn(date, tp.start);
  const end = tp.to ? zmanOn(date, tp.to) : clockOn(date, tp.end);
  const window = { start, end };
  const red = new Date(end.getTime() - CUSTOM_PERFORM_MIN_DEFAULT * MIN);
  const orange = new Date(red.getTime() - ORANGE_LEAD_MIN * MIN);
  const { zone } = customNagZone(window, red, { crossesMidnight: false, chatzotLayla: end });
  const nags = smartNagTimes({ level: DEFAULT_NAG_LEVEL, window, zone, sparseUntil: null, lastChance: { alone: red, minyan: null, soon: orange }, taken: [start], accept: (d) => d });
  const share = (d) => +((d - start) / (end - start)).toFixed(4);
  tp.sample = {
    day: date.getDay(),
    start: hhmm(start),
    end: hhmm(end),
    category: categoryForWindow(hhmm(start), hhmm(end)),
    sends: [{ kind: 'reminder', at: hhmm(start), share: 0 }, ...nags.map((n) => ({ kind: n.lastChance === 'alone' ? 'red' : n.lastChance === 'soon' ? 'orange' : n.kind, at: hhmm(n.at), share: share(n.at) }))],
    zone: zone.length ? { from: share(zone[0].start), to: share(zone[0].end) } : null,
  };
  if (!CUSTOM_ICON_CHOICES.includes(tp.icon)) throw new Error(`${tp.id}: ${tp.icon} is not a custom icon choice`);
}

// The UI drawings of MitzvahIcon.tsx as SVG markup in a 24-unit box, stroked in currentColor.
const iconSrc = read('src/components/MitzvahIcon.tsx');
const STAR = iconSrc.match(/const star = [\s\S]*?d="([^"]+)"/)[1];
const jsxToSvg = (jsx) =>
  jsx
    .replace(/<>|<\/>/g, '')
    .replace(/<(Path|Circle|Rect|Line)\b/g, (_, t) => `<${t.toLowerCase()}`)
    .replace(/(\w+)=\{fill\}/g, '$1="var(--tint,none)"')
    .replace(/(\w+)=\{([\d.]+)\}/g, '$1="$2"')
    .replace(/\s*\/>/g, '/>')
    .replace(/\s+/g, ' ')
    .trim();
const UI = { star: `<path d="${STAR}" fill="var(--tint,none)"/>`, custom: `<path d="${STAR}" fill="var(--tint,none)"/>` };
for (const name of ['calendar', 'chevronLeft', 'chevronRight', 'chevronDown', 'sparkle', 'check', 'close', 'plus', 'sun', 'bell', 'search', 'sliders', 'phone', 'guide', 'compass', 'user', 'chat', 'cloud', 'repeat', 'undo']) {
  const a = iconSrc.indexOf(`\n  ${name}: (`);
  if (a < 0) throw new Error(`no drawing ${name}`);
  const end = a + 1 + iconSrc.slice(a + 1).search(/\n  [a-zA-Z]+: \(|\n\};/);
  const chunk = iconSrc.slice(iconSrc.indexOf('=>', a) + 2, end).trim().replace(/,$/, '').replace(/^\(|\)$/g, '');
  UI[name] = jsxToSvg(chunk);
}
const USED = [...new Set([...TEMPLATES.map((t) => t.icon), ...LIBRARY.flatMap((g) => g.rows.map((r) => r.icon)), ...PERSONAL.map((p) => p.icon), 'custom'])];
const JEWISH = Object.fromEntries(USED.filter((n) => JEWISH_ICONS[n]).map((n) => [n, JEWISH_ICONS[n]]));
for (const n of USED) if (!JEWISH[n] && !UI[n]) throw new Error(`no drawing for icon ${n}`);

writeFileSync(
  join(here, 'data.json'),
  JSON.stringify({ PALETTES, STRINGS, LIBRARY, PERSONAL, ZMANIM, ZMAN_NAMES, TEMPLATES, GROUPS, ICONS: { UI, JEWISH, TONES: JEWISH_TONES } }, null, 1),
);
console.log(`data.json: ${TEMPLATES.length} templates, ${LIBRARY.length} library groups, zmanim ${JSON.stringify(ZMANIM)}`);
for (const t of TEMPLATES) console.log(t.id, t.sample.start, t.sample.end, t.sample.sends.map((s) => `${s.kind}@${s.at}`).join(' '));
