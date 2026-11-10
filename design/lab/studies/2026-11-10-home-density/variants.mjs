// The size arrangements of home this study compares, each a set of numbers, and the text edits that put
// them into a copy of the app (build.mjs applies them to out/app, never to src/). Every edit names the exact
// text it replaces, so a change to the app that moves it fails the build instead of silently skipping it.
// Sizes are points at the default display size.

// Today's values, for the table and as each variant's base.
export const NOW = {
  topPad: 16, // the hero's top padding, above the greeting chip
  chipBg: true, // the greeting chip's glass
  greet: 'title', // the greeting's type (title 22, heading 17, bodyBold 15)
  date: 'caption', // the date line's type (caption 13, small 12)
  greetPad: 6, // the chip's vertical padding
  logo: 40, // the launcher icon, inside a halo of logo * 1.3
  gap: 17, // the gap from the chip to the scene
  scene: { min: 179, frac: 0.5, minus: 240 }, // the scene's height: clamp(h * frac - minus, min, 286)
  crop: 0, // scene units cut from the empty sky above the circle
  backInside: false, // "back to now" inside the circle, under the clock
  plate: null, // the clock inside the circle: null = today's glass plate, else { top, clock } in circle units
  card: null, // the period card: null = today's (tabs in a side column), else { tabsW }
  chips: { min: 52, padY: 7, top: 8, bottom: 12, oneLine: false },
  open: 16, // from the hero to "פתוח עכשיו"
  tabs: null, // the tab bar: null = today's, else { pillW, pillH, icon }
};

export const VARIANTS = [
  {
    id: 'now',
    name: 'היום',
    blurb: 'מסך הבית כמו בעדכון 1.0.21-70, להשוואה.',
    p: NOW,
  },
  {
    id: 'balanced',
    name: 'א · מאוזן',
    blurb:
      'כותרת נמוכה יותר, הקשת גדלה במעט, השעה בתוך הקשת בלי רקע ובגודל שלה, כרטיס התקופה בשתי שורות עם הלשוניות בשורת הכותרת, קרוסלה נמוכה, רווחים צפופים וסרגל תחתון רזה.',
    p: {
      ...NOW,
      topPad: 8,
      greet: 'heading',
      date: 'small',
      greetPad: 4,
      logo: 32,
      gap: 6,
      backInside: true,
      crop: 22,
      scene: { min: 200, frac: 0.5, minus: 190 },
      plate: { top: 62, clock: 0.34 },
      card: { tabsW: 176 },
      chips: { min: 44, padY: 3, top: 6, bottom: 8, oneLine: false, tight: true },
      open: 8,
      tabs: { pillW: 44, pillH: 28, icon: 20 },
    },
  },
  {
    id: 'bigArc',
    name: 'ב · קשת גדולה',
    blurb:
      'אותה צפיפות כמו א, ואת רוב המקום שהתפנה מקבלת הקשת: עיגול רחב וגבוה יותר שקל יותר לגרור בו את השמש.',
    p: {
      ...NOW,
      topPad: 8,
      greet: 'heading',
      date: 'small',
      greetPad: 4,
      logo: 32,
      gap: 6,
      backInside: true,
      crop: 26,
      scene: { min: 232, frac: 0.5, minus: 160 },
      plate: { top: 60, clock: 0.32 },
      card: { tabsW: 176 },
      chips: { min: 44, padY: 3, top: 6, bottom: 8, oneLine: false, tight: true },
      open: 8,
      tabs: { pillW: 44, pillH: 28, icon: 20 },
    },
  },
  {
    id: 'openSky',
    name: 'ג · כותרת בשמיים',
    blurb:
      'הברכה והתאריך בלי רקע, ישר על השמיים, והאייקון קטן. כך הכותרת נמוכה עוד יותר והקשת גדלה, בלי לגרוע ממקום הכרטיסים.',
    p: {
      ...NOW,
      topPad: 6,
      chipBg: false,
      greet: 'heading',
      date: 'small',
      greetPad: 0,
      logo: 30,
      gap: 6,
      backInside: true,
      crop: 30,
      scene: { min: 220, frac: 0.5, minus: 170 },
      plate: { top: 60, clock: 0.33 },
      card: { tabsW: 176 },
      chips: { min: 44, padY: 3, top: 6, bottom: 8, oneLine: false, tight: true },
      open: 8,
      tabs: { pillW: 44, pillH: 28, icon: 20 },
    },
  },
  {
    id: 'maxCards',
    name: 'ד · מקסימום מצוות',
    blurb:
      'הכי חסכוני: כותרת בשמיים, קשת בגודל של היום, קרוסלה בשורה אחת (שם הזמן והשעה זה לצד זה) וסרגל תחתון רזה. רוב המקום עובר לכרטיסי המצוות.',
    p: {
      ...NOW,
      topPad: 6,
      chipBg: false,
      greet: 'bodyBold',
      date: 'small',
      greetPad: 0,
      logo: 28,
      gap: 6,
      backInside: true,
      crop: 30,
      scene: { min: 190, frac: 0.5, minus: 210 },
      plate: { top: 62, clock: 0.34 },
      card: { tabsW: 176 },
      chips: { min: 40, padY: 4, top: 6, bottom: 8, oneLine: true, tight: true },
      open: 6,
      tabs: { pillW: 44, pillH: 26, icon: 20 },
    },
  },
];

const HERO = 'src/components/DayArcHero.tsx';
const SCENE = 'src/components/DaySkyScene.tsx';
const TIMES = 'src/components/HomeTimes.tsx';
const HOME = 'src/app/(tabs)/home.tsx';
const TABS = 'src/components/BottomTabs.tsx';

// The edits that turn today's home into p. Today's own values produce no edit.
export function editsFor(p) {
  const e = [];
  const rep = (file, from, to) => e.push({ file, from, to });
  rep(
    HERO,
    '  return Math.min(SCENE_MAX, Math.max(SCENE_MIN, windowHeight / 2 - HERO_CHROME - extra)) / ARC.height;',
    `  return Math.min(SCENE_MAX, Math.max(${p.scene.min}, windowHeight * ${p.scene.frac} - ${p.scene.minus} + extra * 0)) / ARC.height;`,
  );
  if (p.topPad !== NOW.topPad)
    rep(HERO, "root: { width: '100%', paddingTop: spacing.lg },", `root: { width: '100%', paddingTop: ${p.topPad} },`);
  if (p.greetPad !== NOW.greetPad) rep(HERO, 'const GREETING_PAD = scaled(6);', `const GREETING_PAD = ${p.greetPad};`);
  if (p.logo !== NOW.logo) {
    rep(HERO, 'const LOGO = scaled(40);', `const LOGO = ${p.logo};`);
    rep(HERO, 'const HALO = scaled(52);', `const HALO = ${Math.round(p.logo * 1.3)};`);
  }
  if (p.gap !== NOW.gap) rep(HERO, 'export const BLOCK_GAP = scaled(17);', `export const BLOCK_GAP = ${p.gap};`);
  if (p.greet !== NOW.greet)
    rep(
      HERO,
      '<Text accessibilityRole="header" style={[typography.title, { color: ink.ink }]}>',
      `<Text accessibilityRole="header" style={[typography.${p.greet}, { color: ink.ink }]}>`,
    );
  if (p.date !== NOW.date)
    rep(
      HERO,
      '<Text style={[typography.caption, { color: ink.ink }]}>{dateLine}</Text>',
      `<Text style={[typography.${p.date}, { color: ink.ink }]}>{dateLine}</Text>`,
    );
  if (!p.chipBg)
    rep(
      HERO,
      "style={[styles.topRow, { backgroundColor: ink.chip, flexDirection: rtl ? 'row' : 'row-reverse' }]}",
      "style={[styles.topRow, { backgroundColor: 'transparent', flexDirection: rtl ? 'row' : 'row-reverse' }]}",
    );

  if (p.crop)
    // The empty sky above the circle's top is cut by this many scene units.
    rep(HERO, '<View testID="home-arc-block" style={styles.block}>', `<View testID="home-arc-block" style={[styles.block, { marginTop: -${p.crop} * k }]}>`);
  if (p.backInside) {
    // While previewing, "back to now" takes the clock's caption line inside the circle, so the gap above the
    // circle no longer has to hold it.
    rep(
      HERO,
      '<View testID="home-arc-back" pointerEvents="box-none" style={styles.back}>',
      `<View testID="home-arc-back" pointerEvents="box-none" style={[styles.back, { top: BLOCK_GAP + (${p.plate.top} + 112 * ${p.plate.clock} * 1.1) * k - 6 }]}>`,
    );
    rep(HERO, "caption={preview ? t('home.arc.preview') : caption}", "caption={preview ? ' ' : caption}");
  }
  if (p.plate) {
    // No glass: the clock and its line sit on the sky inside the circle, sized by the circle's radius.
    rep(
      SCENE,
      '<View style={[styles.plateInner, { backgroundColor: ink.chip }]}>',
      '<View style={[styles.plateInner, { backgroundColor: \'transparent\', paddingVertical: 0, paddingHorizontal: 0 }]}>',
    );
    rep(SCENE, '<View pointerEvents="none" style={[styles.plate, { top: 66 * k }]}>', `<View pointerEvents="none" style={[styles.plate, { top: ${p.plate.top} * k }]}>`);
    rep(SCENE, '                fontSize: CLOCK_SIZE,\n                lineHeight: CLOCK_LINE,', `                fontSize: Math.round(112 * k * ${p.plate.clock}),\n                lineHeight: Math.round(112 * k * ${p.plate.clock} * 1.1),`);
    rep(
      SCENE,
      '<Text style={[typography.captionBold, styles.caption, { color: ink.ink }]}>{caption}</Text>',
      '<Text numberOfLines={2} style={[typography.captionBold, styles.caption, { color: ink.ink, maxWidth: Math.round(112 * k * 1.45) }]}>{caption}</Text>',
    );
  }

  if (p.card) {
    // Two rows: the title with the tabs at its end, then the facts across the whole card.
    rep(TIMES, '    gap: spacing.sm,\n    paddingVertical: spacing.md,\n    paddingStart: spacing.lg,\n    paddingEnd: spacing.sm,', '    gap: spacing.xs,\n    paddingVertical: spacing.sm,\n    paddingStart: spacing.lg,\n    paddingEnd: spacing.lg,');
    rep(TIMES, "titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },", `titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingEnd: ${p.card.tabsW}, minHeight: 28 },`);
    rep(TIMES, '<Text style={[typography.heading, styles.white, styles.shrink]} numberOfLines={1}>', '<Text style={[typography.bodyBold, styles.white, styles.shrink]} numberOfLines={1}>');
    rep(TIMES, 'const TITLE_ICON = scaled(20);', 'const TITLE_ICON = 16;');
    rep(
      TIMES,
      "  side: {\n    justifyContent: 'space-between',\n    alignItems: 'center',\n    paddingVertical: spacing.sm,\n    paddingHorizontal: spacing.xs,\n    borderStartWidth: StyleSheet.hairlineWidth,\n    borderStartColor: alphaHex(BRAND.white, 0.25),\n  },\n  tabs: { gap: 1 },",
      "  side: {\n    position: 'absolute',\n    top: spacing.sm,\n    end: spacing.sm,\n    flexDirection: 'row',\n    alignItems: 'center',\n  },\n  tabs: { flexDirection: 'row', gap: 1 },",
    );
    rep(TIMES, 'const TAB_HEIGHT = scaled(24);', 'const TAB_HEIGHT = 28;');
  }
  const c = p.chips;
  if (c.min !== NOW.chips.min) rep(TIMES, 'const CHIP_MIN = scaled(52);', `const CHIP_MIN = ${c.min};`);
  if (c.padY !== NOW.chips.padY) rep(TIMES, 'const CHIP_PAD_Y = scaled(7);', `const CHIP_PAD_Y = ${c.padY};`);
  if (c.top !== NOW.chips.top || c.bottom !== NOW.chips.bottom)
    rep(
      TIMES,
      "    paddingTop: spacing.sm,\n    paddingBottom: spacing.md,\n    gap: spacing.sm,\n    alignItems: 'stretch',",
      `    paddingTop: ${c.top},\n    paddingBottom: ${c.bottom},\n    gap: spacing.sm,\n    alignItems: 'stretch',`,
    );
  if (c.tight) {
    rep(
      TIMES,
      "<Text style={[live ? typography.captionBold : typography.small, { color: ink }]} numberOfLines={1}>",
      "<Text style={[live ? typography.captionBold : typography.small, { color: ink, lineHeight: 14 }]} numberOfLines={1}>",
    );
    rep(
      TIMES,
      "<Text style={[c.kind === 'past' ? typography.body : typography.bodyBold, { color: ink }]}>{time}</Text>",
      "<Text style={[c.kind === 'past' ? typography.body : typography.bodyBold, { color: ink, lineHeight: 18 }]}>{time}</Text>",
    );
  }
  if (c.oneLine)
    rep(
      TIMES,
      "    borderWidth: BORDER,\n    justifyContent: 'center',\n    overflow: 'hidden',",
      "    borderWidth: BORDER,\n    justifyContent: 'center',\n    overflow: 'hidden',\n    flexDirection: 'row',\n    alignItems: 'center',\n    gap: 6,",
    );
  if (p.open !== NOW.open) rep(HOME, '  openNowLabel: {\n    marginTop: spacing.lg,\n  },', `  openNowLabel: {\n    marginTop: ${p.open},\n  },`);

  if (p.tabs) {
    rep(TABS, 'const TAB_ICON_SIZE = scaled(22);', `const TAB_ICON_SIZE = ${p.tabs.icon};`);
    rep(TABS, 'const PILL_WIDTH = scaled(48);', `const PILL_WIDTH = ${p.tabs.pillW};`);
    rep(TABS, 'const PILL_HEIGHT = scaled(32);', `const PILL_HEIGHT = ${p.tabs.pillH};`);
    rep(TABS, '    : bottomInset + spacing.sm;', '    : bottomInset + spacing.xs;');
    rep(TABS, "  strip: {\n    paddingHorizontal: spacing.md,\n    paddingTop: spacing.sm,", "  strip: {\n    paddingHorizontal: spacing.md,\n    paddingTop: spacing.xs,");
    rep(TABS, "    borderRadius: radius.xxl,\n    paddingVertical: spacing.sm,", "    borderRadius: radius.xxl,\n    paddingVertical: spacing.xs,");
    rep(TABS, "    justifyContent: 'center',\n    gap: scaled(2),", "    justifyContent: 'center',\n    gap: 1,");
    rep(TABS, '  underline: {\n    width: scaled(16),\n    height: scaled(3),', '  underline: {\n    width: scaled(16),\n    height: 0,');
  }
  return e;
}
