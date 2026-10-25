import * as fs from 'fs';
import * as path from 'path';
import { THEME_NAMES } from '@/theme/colors';
import he from '@/i18n/he.json';
import en from '@/i18n/en.json';

const SRC_DIR = path.join(__dirname, '..', '..');
const APP_DIR = path.join(SRC_DIR, 'app');
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');

type SourceFile = { rel: string; source: string };

function walk(dir: string, extension: RegExp = /\.tsx$/): SourceFile[] {
  const out: SourceFile[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...walk(full, extension));
    } else if (extension.test(entry.name)) {
      out.push({
        rel: path.relative(SRC_DIR, full).split(path.sep).join('/'),
        source: fs.readFileSync(full, 'utf8'),
      });
    }
  }
  return out;
}

const appFiles = walk(APP_DIR);
const allFiles = [...appFiles, ...walk(COMPONENTS_DIR)];
const sourceFiles = walk(SRC_DIR, /\.tsx?$/);

const TO_FORMAT_CALL = /\.toFormat\(([^)]*)\)/g;
const NAME_TOKEN = /c{3}|E{3}|L{3}|M{3}/;
const PLAIN_LITERAL = /^\s*(['"`])[^'"`$]*\1\s*$/;
const LUXON_NAME_GETTER =
  /\.(?:weekdayLong|weekdayShort|monthLong|monthShort)\b|\bInfo\.(?:weekdays|weekdaysFormat|months|monthsFormat)\(/;
const formatsNames = (source: string) =>
  [...source.matchAll(TO_FORMAT_CALL)].some(([, pattern]) => !PLAIN_LITERAL.test(pattern) || NAME_TOKEN.test(pattern));

function offenders(files: SourceFile[], offends: (file: SourceFile) => boolean): string[] {
  return files.filter(offends).map((file) => file.rel);
}

const isTabOrOnboarding = (rel: string) => rel.startsWith('app/(tabs)/') || rel.startsWith('app/onboarding/');
const isRedirectOnly = ({ source }: SourceFile) => /<Redirect\b/.test(source) && !source.includes('StyleSheet.create');

describe('design system tripwires', () => {
  it('walks the source tree', () => {
    expect(appFiles.length).toBeGreaterThan(15);
    expect(allFiles.length).toBeGreaterThan(appFiles.length);
  });

  it('no file draws the sparkle glyph; icon tiles are IconTile / MitzvahIcon', () => {
    expect(offenders(allFiles, ({ source }) => source.includes('✦'))).toEqual([]);
  });

  it('no file draws a chevron glyph; chevrons are the chevronLeft / chevronRight icons', () => {
    expect(offenders(allFiles, ({ source }) => /[‹›]/.test(source))).toEqual([]);
  });

  it('no file draws a check-mark glyph; ticks are the check icon of MitzvahIcon', () => {
    expect(offenders(allFiles, ({ source }) => source.includes('✓'))).toEqual([]);
  });

  it.each([
    ['✕', 'the close icon'],
    ['＋', 'the plus icon'],
    ['●', 'a filled circle View'],
    ['←', 'the chevronLeft / chevronRight icons'],
    ['→', 'the chevronLeft / chevronRight icons'],
    ['☀', 'the sun icon'],
    ['☾', 'the moon icon'],
    ['↺', 'the undo icon'],
    ['⚠', 'the warning icon'],
  ])('no file draws the %s glyph; use %s', (glyph) => {
    expect(offenders(allFiles, ({ source }) => source.includes(glyph))).toEqual([]);
  });

  it('no white literal outside AppLogo; use colors.onGold, colors.onUrgent or BRAND.white', () => {
    const white = /(['"])#(?:fff|FFFFFF)\1/;
    expect(offenders(allFiles, ({ rel, source }) => rel !== 'components/AppLogo.tsx' && white.test(source))).toEqual(
      [],
    );
  });

  it('no fontWeight; Heebo weights are font families from typography', () => {
    expect(offenders(allFiles, ({ source }) => source.includes('fontWeight:'))).toEqual([]);
  });

  it('no Heebo font-name literal outside the useFonts map in the root layout', () => {
    expect(offenders(allFiles, ({ rel, source }) => rel !== 'app/_layout.tsx' && source.includes('Heebo_'))).toEqual(
      [],
    );
  });

  it('stack screens use ScreenHeader and tabs use NavBar; no local back button', () => {
    const stackFiles = appFiles.filter(({ rel }) => !isTabOrOnboarding(rel));
    expect(offenders(stackFiles, ({ source }) => /\bbackBtn\s*:/.test(source) || /<NavBar\b/.test(source))).toEqual([]);
  });

  it('every stack screen renders a ScreenHeader', () => {
    const screens = appFiles.filter(
      (file) =>
        !isTabOrOnboarding(file.rel) &&
        !file.rel.endsWith('/_layout.tsx') &&
        !file.rel.endsWith('app/_layout.tsx') &&
        !isRedirectOnly(file),
    );
    expect(screens.length).toBeGreaterThanOrEqual(9);
    expect(
      offenders(
        screens,
        ({ source }) =>
          !/import\s*\{[^}]*\bScreenHeader\b[^}]*\}\s*from\s*'@\/components\/ScreenHeader'/.test(source) ||
          !/<ScreenHeader\b/.test(source),
      ),
    ).toEqual([]);
  });

  it('no translucent white; header controls draw on theme tokens', () => {
    expect(offenders(allFiles, ({ source }) => /rgba\(\s*255\s*,\s*255\s*,\s*255/.test(source))).toEqual([]);
  });

  it('no file reads a header colour; the header tokens no longer exist', () => {
    expect(offenders(allFiles, ({ source }) => /colors\.header/.test(source))).toEqual([]);
  });

  it('no screen keeps its own card or button style; cards are Card and actions Button', () => {
    expect(
      offenders(appFiles, ({ source }) => /\b(card|primaryBtn|dangerBtn|secondaryBtn|cta)\s*:\s*\{/.test(source)),
    ).toEqual([]);
  });

  it.each([
    ['he', he],
    ['en', en],
  ])('%s has a settings.theme.<name> key for exactly the palettes in THEME_NAMES', (_locale, dictionary) => {
    const themeKeys = Object.keys(dictionary)
      .filter((key) => key.startsWith('settings.theme.'))
      .sort();
    expect(themeKeys).toEqual(THEME_NAMES.map((name) => `settings.theme.${name}`).sort());
  });

  it('walks every source file under src, services included', () => {
    const rels = sourceFiles.map(({ rel }) => rel);
    expect(rels).toEqual(
      expect.arrayContaining([
        'i18n/index.ts',
        'services/BackupService.ts',
        'services/notifications/planners/roshChodesh.ts',
        'app/(tabs)/home.tsx',
      ]),
    );
    expect(rels.filter((rel) => rel.includes('__tests__'))).toEqual([]);
  });

  it('the name scan flags a name token, a pattern passed by variable and a ternary, and passes a numeric literal', () => {
    for (const flagged of [
      ".toFormat('cccc')",
      ".toFormat('d LLLL')",
      ".toFormat('EEE d')",
      ".toFormat('MMM d')",
      '.toFormat(pattern)',
      ".toFormat(language === 'he' ? 'd.M' : 'M/d')",
    ]) {
      expect(formatsNames(flagged)).toBe(true);
    }
    for (const allowed of [".toFormat('HH:mm')", ".toFormat('dd/MM HH:mm')"]) {
      expect(formatsNames(allowed)).toBe(false);
    }
  });

  it('no Luxon toFormat names a weekday or month; names come from formatDate() in src/i18n', () => {
    expect(offenders(sourceFiles, ({ source }) => formatsNames(source))).toEqual([]);
  });

  it('no Luxon weekday or month name getter; names come from formatDate() in src/i18n', () => {
    expect(offenders(sourceFiles, ({ source }) => LUXON_NAME_GETTER.test(source))).toEqual([]);
  });
});
