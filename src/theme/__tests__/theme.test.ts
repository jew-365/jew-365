import fs from 'fs';
import path from 'path';
import {
  BRAND,
  T_LIGHT,
  T_PINK,
  T_PURPLE,
  T_BLUE,
  T_DARK,
  T_PLUM,
  THEMES,
  THEME_NAMES,
  DARK_THEMES,
  isDarkTheme,
  paletteForGender,
  ThemeColors,
} from '../colors';
import { durations, spacing, radius } from '../tokens';
import { APP_FONTS, fontFamilies, typography } from '../typography';
import he from '@/i18n/he.json';
import en from '@/i18n/en.json';

const COLOR = /^(#[0-9A-F]{6}(?:[0-9A-F]{2})?|rgba\(.*\))$/i;
const SHADOW = /^rgba\((\d+),(\d+),(\d+),(0\.\d+)\)$/;
const STEP_TOLERANCE = 0.003;
const HUE_TOLERANCE = 25;
const LIGHT_NAMES = THEME_NAMES.filter((name) => !isDarkTheme(name));

type ContrastPair = readonly [keyof ThemeColors, keyof ThemeColors, number];

const KEY_PAIRS: readonly ContrastPair[] = [
  ['text', 'surface', 4.5],
  ['textSub', 'surface', 4.5],
  ['goldText', 'surface', 4.5],
  ['onGold', 'gold', 4.5],
];

const READABLE_PAIRS: readonly ContrastPair[] = [
  ['text', 'bg', 4.5],
  ['text', 'surface2', 4.5],
  ['textMuted', 'surface', 4.5],
  ['goldText', 'bg', 4.5],
  ['goldText', 'goldLight', 4.5],
  ['onUrgent', 'urgent', 4.5],
  ['urgent', 'urgentBg', 4.5],
  ['urgent', 'surface', 4.5],
];

const linear = (channel: number) => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const channels = (hex: string) => {
  if (!/^#[0-9A-F]{6}$/i.test(hex)) throw new Error(`contrast needs a hex colour, got ${hex}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
};

const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

const over = (base: string, tint: string) => {
  const alpha = parseInt(tint.slice(7, 9), 16) / 255;
  const top = channels(tint.slice(0, 7));
  return `#${channels(base)
    .map((c, i) =>
      Math.round(c * (1 - alpha) + top[i] * alpha)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
};

const failingPairs = (palette: ThemeColors, pairs: readonly ContrastPair[]) =>
  pairs
    .map(([fg, bg, min]) => ({ pair: `${fg}/${bg}`, ratio: contrast(palette[fg], palette[bg]), min }))
    .filter(({ ratio, min }) => !(ratio >= min))
    .map(({ pair, ratio, min }) => `${pair} ${ratio.toFixed(2)} < ${min}`);

const oklab = (hex: string) => {
  const [r, g, b] = channels(hex).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const oklabLightness = (hex: string) => oklab(hex)[0];

const oklabHue = (hex: string) => {
  const [, a, b] = oklab(hex);
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
};

const hueDistance = (a: string, b: string) => {
  const gap = Math.abs(oklabHue(a) - oklabHue(b));
  return Math.min(gap, 360 - gap);
};

const stepBelowCard = (palette: ThemeColors, token: 'bg' | 'surface2' | 'border') =>
  oklabLightness(palette.surface) - oklabLightness(palette[token]);

const shadowParts = (value: string) => {
  const match = SHADOW.exec(value);
  if (!match) throw new Error(`expected rgba(r,g,b,a), got ${value}`);
  return { rgb: match.slice(1, 4), alpha: match[4] };
};

describe('Theme', () => {
  it('THEMES lists exactly the named palettes, in order', () => {
    expect(THEME_NAMES).toEqual(['gold', 'pink', 'purple', 'blue', 'dark', 'plum']);
    expect(Object.keys(THEMES)).toEqual([...THEME_NAMES]);
    expect(THEMES.gold).toBe(T_LIGHT);
    expect(THEMES.pink).toBe(T_PINK);
    expect(THEMES.purple).toBe(T_PURPLE);
    expect(THEMES.blue).toBe(T_BLUE);
    expect(THEMES.dark).toBe(T_DARK);
    expect(THEMES.plum).toBe(T_PLUM);
  });

  it('every palette has the same token set as gold', () => {
    const goldKeys = Object.keys(T_LIGHT).sort();
    for (const name of THEME_NAMES) {
      expect({ name, keys: Object.keys(THEMES[name]).sort() }).toEqual({ name, keys: goldKeys });
    }
  });

  it('every token is a colour string', () => {
    for (const name of THEME_NAMES) {
      const invalid = Object.entries(THEMES[name])
        .filter(([, value]) => typeof value !== 'string' || !COLOR.test(value))
        .map(([token]) => token);
      expect({ name, invalid }).toEqual({ name, invalid: [] });
    }
  });

  it.each(THEME_NAMES)('the %s gold washes are the accent with a 09 and an 18 alpha suffix', (name) => {
    const { gold, goldWash, goldWashStrong } = THEMES[name];
    expect({ goldWash, goldWashStrong }).toEqual({ goldWash: `${gold}09`, goldWashStrong: `${gold}18` });
  });

  it.each(THEME_NAMES)('text and textSub stay readable on the %s goldWashStrong tint over the card', (name) => {
    const { surface, goldWashStrong, text, textSub } = THEMES[name];
    const tinted = over(surface, goldWashStrong);
    const failing = (
      [
        ['text', text],
        ['textSub', textSub],
      ] as const
    )
      .map(([token, colour]) => ({ token, ratio: contrast(colour, tinted) }))
      .filter(({ ratio }) => !(ratio >= 4.5))
      .map(({ token, ratio }) => `${token} ${ratio.toFixed(2)}`);
    expect({ name, failing }).toEqual({ name, failing: [] });
  });

  it('dark and plum are the dark palettes', () => {
    expect(DARK_THEMES).toEqual(['dark', 'plum']);
    expect(THEME_NAMES.filter((name) => isDarkTheme(name))).toEqual([...DARK_THEMES]);
    for (const name of ['gold', 'pink', 'purple', 'blue'] as const) expect(isDarkTheme(name)).toBe(false);
  });

  it.each([
    ['gold', 'male', 'gold'],
    ['gold', 'female', 'pink'],
    ['pink', 'male', 'gold'],
    ['pink', 'female', 'pink'],
    ['purple', 'male', 'gold'],
    ['purple', 'female', 'pink'],
    ['blue', 'male', 'gold'],
    ['blue', 'female', 'pink'],
    ['dark', 'male', 'dark'],
    ['dark', 'female', 'plum'],
    ['plum', 'male', 'dark'],
    ['plum', 'female', 'plum'],
  ] as const)('paletteForGender: %s palette with a %s answer gives %s', (current, gender, expected) => {
    expect(paletteForGender(gender, current)).toBe(expected);
  });

  it('paletteForGender keeps the light or dark class of every palette', () => {
    for (const name of THEME_NAMES) {
      for (const gender of ['male', 'female'] as const) {
        expect(isDarkTheme(paletteForGender(gender, name))).toBe(isDarkTheme(name));
      }
    }
  });

  it.each(LIGHT_NAMES)('the %s card is a white tinted toward its hue, never a neutral white', (name) => {
    const { bg, surface } = THEMES[name];
    const [r, g, b] = channels(surface);
    expect({ name, neutral: r === g && g === b, withinHueOfPage: hueDistance(surface, bg) <= HUE_TOLERANCE }).toEqual({
      name,
      neutral: false,
      withinHueOfPage: true,
    });
  });

  it.each(LIGHT_NAMES.filter((name) => name !== 'gold'))(
    "the %s page, surface2 and border sit gold's lightness steps below the card",
    (name) => {
      const off = (['bg', 'surface2', 'border'] as const).filter(
        (token) => !(Math.abs(stepBelowCard(THEMES[name], token) - stepBelowCard(T_LIGHT, token)) <= STEP_TOLERANCE),
      );
      expect({ name, off }).toEqual({ name, off: [] });
    },
  );

  it('the dark palettes keep the page and card they had before the 2026-10-25 rework', () => {
    expect({
      dark: [T_DARK.bg, T_DARK.surface],
      plum: [T_PLUM.bg, T_PLUM.surface],
    }).toEqual({
      dark: ['#0E1626', '#172238'],
      plum: ['#1A1026', '#261735'],
    });
  });

  it.each(DARK_THEMES)("the %s surface2 and border sit gold's lightness steps above the card", (name) => {
    const off = (['surface2', 'border'] as const).filter(
      (token) => !(Math.abs(-stepBelowCard(THEMES[name], token) - stepBelowCard(T_LIGHT, token)) <= STEP_TOLERANCE),
    );
    expect({ name, off }).toEqual({ name, off: [] });
  });

  it.each(THEME_NAMES)('the %s tab bar is drawn on the card colour', (name) => {
    expect({ name, tabBg: THEMES[name].tabBg }).toEqual({ name, tabBg: THEMES[name].surface });
  });

  it.each(THEME_NAMES)(
    'the %s goldText is a tone of its own: darker than the accent on a light palette, lighter on a dark one',
    (name) => {
      const accent = luminance(THEMES[name].gold);
      const text = luminance(THEMES[name].goldText);
      const side = text < accent ? 'darker' : text > accent ? 'lighter' : 'same';
      expect({ name, side }).toEqual({ name, side: isDarkTheme(name) ? 'lighter' : 'darker' });
    },
  );

  it.each(THEME_NAMES)('the %s onGold is dark ink where the accent allows 4.5:1, else white', (name) => {
    const { gold, onGold } = THEMES[name];
    const kind = onGold === '#FFFFFF' ? 'white' : luminance(onGold) < luminance(gold) ? 'ink' : 'other';
    expect({ name, kind }).toEqual({ name, kind: contrast('#000000', gold) >= 4.5 ? 'ink' : 'white' });
  });

  it.each(THEME_NAMES)('the %s shadows are one hue-tinted colour at 0.08 and 0.18', (name) => {
    const soft = shadowParts(THEMES[name].shadow);
    const strong = shadowParts(THEMES[name].shadowStrong);
    expect({
      name,
      alphas: [soft.alpha, strong.alpha],
      sameColour: soft.rgb.join() === strong.rgb.join(),
      tinted: new Set(soft.rgb).size > 1,
    }).toEqual({ name, alphas: ['0.08', '0.18'], sameColour: true, tinted: true });
  });

  it('the light palettes share the status colours with gold', () => {
    for (const name of ['pink', 'purple', 'blue'] as const) {
      for (const token of ['urgent', 'onUrgent', 'urgentBg', 'urgentBorder', 'warning', 'safe'] as const) {
        expect({ name, token, value: THEMES[name][token] }).toEqual({ name, token, value: T_LIGHT[token] });
      }
    }
  });

  it('the default and the night palettes keep the identity the owner chose', () => {
    expect(T_LIGHT).toMatchObject({
      bg: '#F6F1E8',
      surface: '#FFFDF9',
      gold: '#F08A3C',
      goldLight: '#FDE9D5',
      goldText: '#A04A0C',
      text: '#1D2240',
    });
    expect(T_DARK).toMatchObject({ bg: '#0E1626', gold: '#F59A4A' });
  });

  it('the palettes differ in background, card and accent', () => {
    for (const token of ['bg', 'surface', 'gold'] as const) {
      const values = THEME_NAMES.map((name) => THEMES[name][token]);
      expect({ token, distinct: new Set(values).size }).toEqual({ token, distinct: values.length });
    }
  });

  it('BRAND is the gold palette identity, independent of the active theme', () => {
    expect(BRAND).toEqual({
      navy: T_LIGHT.text,
      gold: T_LIGHT.gold,
      onGold: T_LIGHT.onGold,
      parchment: T_LIGHT.bg,
      white: '#FFFFFF',
    });
  });

  it.each(THEME_NAMES)(
    'the %s palette reaches 4.5:1 for text, textSub and goldText on surface and onGold on gold',
    (name) => {
      expect(failingPairs(THEMES[name], KEY_PAIRS)).toEqual([]);
    },
  );

  it.each(THEME_NAMES)('text stays readable in the %s palette (WCAG contrast)', (name) => {
    expect(failingPairs(THEMES[name], READABLE_PAIRS)).toEqual([]);
  });

  it('every palette has a label in both dictionaries', () => {
    const tables: Record<string, Record<string, string>> = { he, en };
    for (const name of THEME_NAMES) {
      for (const [locale, table] of Object.entries(tables)) {
        const label = table[`settings.theme.${name}`];
        expect({ name, locale, label }).toEqual({ name, locale, label: expect.stringMatching(/\S/) });
      }
    }
  });

  it('animation durations defined + ordered', () => {
    expect(durations.fast).toBeLessThan(durations.base);
    expect(durations.base).toBeLessThan(durations.slow);
    expect(durations.slow).toBeLessThan(durations.stamp);
  });

  it('spacing scale is monotonic', () => {
    const order = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'] as const;
    for (let i = 1; i < order.length; i++) {
      expect(spacing[order[i]]).toBeGreaterThan(spacing[order[i - 1]]);
    }
  });

  it('radius scale is monotonic', () => {
    const order = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'full'] as const;
    for (let i = 1; i < order.length; i++) {
      expect(radius[order[i]]).toBeGreaterThan(radius[order[i - 1]]);
    }
  });
});

describe('Typography', () => {
  const sizes = (variant: keyof typeof typography) => typography[variant].fontSize!;
  const loaded: readonly string[] = APP_FONTS;

  it('font sizes rise from micro to display', () => {
    expect(sizes('micro')).toBeLessThan(sizes('small'));
    expect(sizes('small')).toBeLessThan(sizes('caption'));
    expect(sizes('caption')).toBeLessThan(sizes('body'));
    expect(sizes('body')).toBe(sizes('bodyBold'));
    expect(sizes('body')).toBe(sizes('subheading'));
    expect(sizes('subheading')).toBeLessThan(sizes('heading'));
    expect(sizes('heading')).toBeLessThan(sizes('title'));
    expect(sizes('title')).toBeLessThan(sizes('display'));
  });

  it('every line is taller than its font', () => {
    for (const [variant, style] of Object.entries(typography)) {
      expect({ variant, taller: style.lineHeight! > style.fontSize! }).toEqual({ variant, taller: true });
    }
  });

  it('every family the app styles with is a loaded font', () => {
    const families = [
      ...Object.values(typography).map((style) => style.fontFamily),
      ...Object.values(fontFamilies.heebo),
      ...Object.values(fontFamilies.siddur),
    ];
    expect(families.filter((family) => !loaded.includes(family as string))).toEqual([]);
  });

  it('the unused Heebo weights are not loaded', () => {
    expect(loaded).not.toContain('Heebo_300Light');
    expect(loaded).not.toContain('Heebo_500Medium');
  });

  it('the root layout loads exactly APP_FONTS', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', '_layout.tsx'), 'utf8');
    expect(APP_FONTS.filter((font) => !source.includes(font))).toEqual([]);
    expect(source).not.toContain('Heebo_300Light');
    expect(source).not.toContain('Heebo_500Medium');
  });
});
