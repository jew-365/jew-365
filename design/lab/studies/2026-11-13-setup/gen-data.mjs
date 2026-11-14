// The setup study's copy of the hub study's data script (2026-11-13-hub), with the setup's strings added.
// Writes data.json from the app's own code and files, so every board shows the app's words, icons and rules:
// the six palettes (src/theme/colors.ts), the Hebrew strings (src/i18n/he.json), the capability list and each
// capability's state for a fresh install of nusach Ashkenaz (src/data/capabilities.ts with the default-on mitzvot of
// src/stores/useMitzvotStore.ts), the offers' words, the More tab's rows of today (src/app/(tabs)/more.tsx), and
// the icon drawings (src/components/jewishIcons.generated.ts and the UI drawings of MitzvahIcon.tsx).
// Run with the loader that lets Node read the app's TypeScript:
//   node --import ./ts-loader/register.mjs gen-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '../../../../');
const read = (p) => readFileSync(join(REPO, p), 'utf8');
const app = (p) => import(pathToFileURL(join(REPO, 'src', p)).href);

const { CAPABILITIES, CAPABILITY_GOALS, capabilityState } = await app('data/capabilities.ts');
const { MITZVOT } = await app('data/mitzvot.ts');
const { JEWISH_ICONS, JEWISH_TONES } = await app('components/jewishIcons.generated.ts');

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

const he = JSON.parse(read('src/i18n/he.json'));
const s = (key, params = {}) => {
  const v = he[key];
  if (v === undefined) throw new Error(`missing string ${key}`);
  return v.replace(/%\{(\w+)\}/g, (_, k) => String(params[k] ?? ''));
};

// A fresh install: the default-on mitzvot (the ids of DEFAULT_ON_MITZVOT the registry holds), every add-on missing,
// notices off, the weekly report on, quiet hours off, Android with the battery exemption missing.
const store = read('src/stores/useMitzvotStore.ts');
const DEFAULT_ON = store
  .slice(store.indexOf('export const DEFAULT_ON_MITZVOT'))
  .slice(store.indexOf('= [', store.indexOf('export const DEFAULT_ON_MITZVOT')) - store.indexOf('export const DEFAULT_ON_MITZVOT'))
  .match(/\[([^\]]*)\]/)[1]
  .match(/'([a-z_]+)'/g)
  .map((x) => x.slice(1, -1));
const registry = new Set(MITZVOT.map((m) => m.id));
const offered = (id) => registry.has(id) && id !== 'ushpizin_none';
const input = {
  enabled: (id) => DEFAULT_ON.includes(id),
  offered,
  installed: () => false,
  halachaTrack: 'kitzur',
  notices: { hilulot: false, roshChodesh: false },
  weeklyReport: true,
  quietHours: false,
  batteryExempt: false,
};
const CAPS = CAPABILITIES.map((c) => ({
  id: c.id,
  goal: c.goal,
  icon: c.icon,
  kind: c.action.kind,
  state: capabilityState(c, input),
  title: s(`capability.${c.id}.title`),
  benefit: s(`capability.${c.id}.benefit`),
}));
const GOALS = CAPABILITY_GOALS.map((g) => ({ id: g, title: s(`capability.goal.${g}`) }));

// The offers' words, for "worth trying".
const OFFERS = ['battery', 'candles', 'birchot', 'learning', 'hilulot', 'omer', 'tracking', 'tour'].map((id) => ({
  id,
  title: s(`offer.${id}.title`),
  body: s(`offer.${id}.body`),
  accept: s(`offer.${id}.accept`),
}));

// Today's More tab, in its order (src/app/(tabs)/more.tsx and the learning rows of LearningRows.tsx).
const MORE_TODAY = [
  { icon: 'calendar', title: s('schedule.title'), caption: s('more.scheduleCaption') },
  { icon: 'chok', title: s('chok.title'), caption: s('chok.addon.listCaption', { size: '5' }), muted: true },
  { icon: 'chok', title: s('shnayim.title'), caption: s('shnayim.addon.listCaption', { size: '1.2' }), muted: true },
  { icon: 'general', title: MITZVOT.find((m) => m.id === 'halacha_yomit').name.he, caption: s('halacha.addon.listCaption', { size: '0.6', book: s('halacha.book.kitzur') }), muted: true },
  { icon: 'general', title: MITZVOT.find((m) => m.id === 'hilchot_hachag').name.he, caption: s('halacha.addon.listCaption', { size: '0.6', book: s('halacha.book.kitzur') }), muted: true },
  { icon: 'general', title: MITZVOT.find((m) => m.id === 'lashon_hara').name.he, caption: s('halacha.addon.listCaption', { size: '0.3', book: s('halacha.book.chafetz_chaim') }), muted: true },
  { icon: 'general', title: MITZVOT.find((m) => m.id === 'shemirat_halashon').name.he, caption: s('halacha.addon.listCaption', { size: '0.3', book: s('halacha.book.shemirat_halashon') }), muted: true },
  { icon: 'shofar', title: 'סליחות', caption: s('selichot.addon.listCaption', { nusach: s('nusach.ashkenaz'), size: '1' }), muted: true },
  { icon: 'tehillim', title: 'תהילים', caption: s('more.tehillimCaption') },
  { icon: 'hilula', title: s('hilulot.title'), caption: s('hilulot.subtitle') },
  { icon: 'compass', title: s('compass.title'), caption: s('compass.caption') },
  { icon: 'phone', title: s('more.halacha.title'), caption: s('more.halacha.caption.ashkenazi') },
  { icon: 'guide', title: s('guide.title'), caption: s('more.guideCaption') },
];

// One sample day, Wednesday 2026-11-18 in Jerusalem (nusach Ashkenaz), with every window computed by the app's own
// dayWindow(): home's My day and the setup's ready screen show these times and no others. The next Friday's candle
// lighting is for the Shabbat bundle's caption.
if (process.env.TZ !== 'Asia/Jerusalem') throw new Error('run with TZ=Asia/Jerusalem, so the device day is the location day');
const { CITIES } = await app('data/cities.ts');
const { dayWindow } = await app('utils/buildDayTimeline.ts');
const { ZmanimService } = await app('services/ZmanimService.ts');
const jerusalem = CITIES.find((c) => c.cityId === 'jerusalem');
const settings = { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'gra' }, inIsrael: true };
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const DAY_DATE = new Date(2026, 10, 18);
const windowOf = (id, date) => {
  const w = dayWindow(MITZVOT.find((m) => m.id === id), date, jerusalem, settings);
  return w && { start: hhmm(w.start), end: hhmm(w.end), startMin: w.start.getHours() * 60 + w.start.getMinutes() };
};
const DAY = {
  label: 'יום רביעי, 18 בנובמבר',
  hebrew: 'ח׳ בכסלו',
  city: jerusalem.name?.he ?? jerusalem.nameHe ?? 'ירושלים',
  windows: Object.fromEntries(
    DEFAULT_ON.filter((id) => registry.has(id))
      .map((id) => [id, windowOf(id, DAY_DATE), MITZVOT.find((m) => m.id === id).name.he])
      .filter(([, w]) => w)
      .map(([id, w, name]) => [id, { ...w, name }]),
  ),
  candles: windowOf('candle_lighting', new Date(2026, 10, 20)),
  havdalah: windowOf('havdalah', new Date(2026, 10, 21)),
  zmanim: (() => {
    const z = ZmanimService.getZmanim(new Date(2026, 10, 18, 12), jerusalem);
    return { sunrise: hhmm(z.netzHaChama), shema: hhmm(z.sofZmanShmaGra), shkia: hhmm(z.shkia) };
  })(),
};

const STRINGS = Object.fromEntries(
  [
    'nusach.ashkenaz', 'nusach.sefard', 'nusach.edot_hamizrach', 'nusach.chabad', 'nusach.teiman',
    'profile.gender.male', 'profile.gender.female', 'onboarding.welcomeTitle', 'onboarding.welcomeBody',
    'onboarding.nusachTitle', 'onboarding.nusachBody', 'onboarding.locationBody', 'onboarding.locationAllow',
    'onboarding.locationOr', 'onboarding.restore', 'onboarding.nameLabel', 'onboarding.notNow', 'common.continue',
    'notifications.timeLeft.line', 'notifications.timeFor', 'settings.quietBefore', 'settings.quietAfter',
    'onboarding.readyTitle', 'onboarding.finish', 'library.addCustom', 'accuracy.title', 'accuracy.effort',
    'accuracy.responsibility', 'notifications.markDone', 'time.unit.hours', 'time.unit.minutes', 'permissions.battery.title',
    'permissions.battery.why', 'permissions.notifications.why', 'settings.quietHoursNote', 'onboarding.locationTitle',
    'onboarding.registerTitle', 'onboarding.registerBody', 'onboarding.genderLabel', 'siddur.open', 'home.openNow', 'common.back',
    'more.title', 'more.search', 'more.searchPlaceholder', 'nav.home', 'nav.siddur', 'nav.history', 'nav.settings', 'nav.more',
    'home.messages', 'home.myDay', 'library.title', 'library.subtitle', 'offer.dismiss', 'home.greeting.afternoonNeutral',
    ...Object.keys(PALETTES).map((p) => `settings.theme.${p}`),
  ].map((k) => [k, s(k) === undefined ? '' : he[k]]), // s() checks the key; the page fills each %{…} itself
);

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
for (const name of ['calendar', 'chevronLeft', 'chevronRight', 'chevronDown', 'sparkle', 'check', 'close', 'plus', 'sun', 'bell', 'search', 'sliders', 'phone', 'guide', 'compass', 'user', 'chat', 'cloud']) {
  const at = iconSrc.indexOf(`\n  ${name}: (`);
  if (at < 0) throw new Error(`no drawing ${name}`);
  const end = at + 1 + iconSrc.slice(at + 1).search(/\n  [a-zA-Z]+: \(|\n\};/);
  const chunk = iconSrc.slice(iconSrc.indexOf('=>', at) + 2, end).trim().replace(/,$/, '').replace(/^\(|\)$/g, '');
  UI[name] = jsxToSvg(chunk);
}

const USED = [...new Set([...CAPS.map((c) => c.icon), ...MORE_TODAY.map((r) => r.icon), 'shacharit', 'candles', 'brachot', 'chok', 'omer', 'hilula', 'night', 'moon', 'siddur', 'tefillin', 'shema', 'general'])];
const JEWISH = Object.fromEntries(USED.filter((n) => JEWISH_ICONS[n]).map((n) => [n, JEWISH_ICONS[n]]));
for (const n of USED) if (!JEWISH[n] && !UI[n]) throw new Error(`no drawing for icon ${n}`);

writeFileSync(
  join(here, 'data.json'),
  JSON.stringify({ PALETTES, STRINGS, CAPS, GOALS, OFFERS, MORE_TODAY, DEFAULT_ON, DAY, ICONS: { UI, JEWISH, TONES: JEWISH_TONES } }, null, 1),
);
console.log(`data.json: ${CAPS.length} capabilities, ${Object.keys(JEWISH).length} drawn icons, ${Object.keys(UI).length} UI icons`);
