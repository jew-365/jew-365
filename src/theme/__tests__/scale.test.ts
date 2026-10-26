import {
  DEFAULT_UI_SCALE,
  UI_SCALE,
  UI_SCALES,
  isUiScale,
  readStoredUiScale,
  rescaled,
  scaled,
  scaledBy,
} from '../scale';
import { radius, spacing } from '../tokens';
import { typography } from '../typography';

type Scale = typeof import('../scale');
type Tokens = { typography: typeof typography; spacing: typeof spacing; radius: typeof radius; scale: Scale };

const loadAt = (uiScale: number): Tokens => {
  let loaded: Tokens | undefined;
  jest.isolateModules(() => {
    const scale: Scale = require('../scale');
    scale.__setUiScaleForTests(uiScale);
    loaded = {
      typography: require('../typography').typography,
      spacing: require('../tokens').spacing,
      radius: require('../tokens').radius,
      scale,
    };
  });
  return loaded!;
};

const saved = (state: unknown) => JSON.stringify({ state, version: 0 });

describe('UI scale steps', () => {
  it('lists the seven steps, with today as the default', () => {
    expect([...UI_SCALES]).toEqual([0.8, 0.85, 0.9, 0.95, 1, 1.1, 1.2]);
    expect(DEFAULT_UI_SCALE).toBe(1);
    expect(UI_SCALES).toContain(DEFAULT_UI_SCALE);
  });

  it('isUiScale accepts exactly the steps', () => {
    for (const step of UI_SCALES) expect(isUiScale(step)).toBe(true);
    for (const other of [0, 0.75, 1.05, 1.3, -1, NaN, Infinity, '1', '1.1', null, undefined, {}, []]) {
      expect(isUiScale(other)).toBe(false);
    }
  });

  it("runs at the default under Jest, so the whole suite sees today's numbers", () => {
    expect(UI_SCALE).toBe(DEFAULT_UI_SCALE);
  });
});

describe('readStoredUiScale', () => {
  it('reads the step from the persisted user store', () => {
    for (const step of UI_SCALES) expect(readStoredUiScale(() => saved({ uiScale: step }))).toBe(step);
  });

  it('falls back to the default for a missing store or a missing field', () => {
    expect(readStoredUiScale(() => undefined)).toBe(DEFAULT_UI_SCALE);
    expect(readStoredUiScale(() => null)).toBe(DEFAULT_UI_SCALE);
    expect(readStoredUiScale(() => '')).toBe(DEFAULT_UI_SCALE);
    expect(readStoredUiScale(() => saved({ theme: 'gold' }))).toBe(DEFAULT_UI_SCALE);
    expect(readStoredUiScale(() => JSON.stringify({ version: 0 }))).toBe(DEFAULT_UI_SCALE);
  });

  it('falls back to the default for malformed or foreign JSON', () => {
    for (const raw of ['{', 'not json', 'null', '5', '"1.2"', '[]', '{"state":null}', '{"state":"x"}']) {
      expect(readStoredUiScale(() => raw)).toBe(DEFAULT_UI_SCALE);
    }
  });

  it('falls back to the default for a value that is not a step', () => {
    for (const uiScale of [1.05, 0.5, 2, 0, -1, '1.1', null, true, [1.1]]) {
      expect(readStoredUiScale(() => saved({ uiScale }))).toBe(DEFAULT_UI_SCALE);
    }
  });

  it('never throws, even when the read itself does', () => {
    expect(
      readStoredUiScale(() => {
        throw new Error('storage unavailable');
      }),
    ).toBe(DEFAULT_UI_SCALE);
  });
});

describe('scaled', () => {
  it('is the identity on integers at scale 1', () => {
    for (let value = 0; value <= 60; value++) expect(scaled(value)).toBe(value);
  });

  it('rounds to half points', () => {
    expect(scaledBy(15, 1.1)).toBe(16.5);
    expect(scaledBy(13, 0.85)).toBe(11);
    expect(scaledBy(22, 0.95)).toBe(21);
    expect(scaledBy(11, 0.8)).toBe(9);
  });

  it('scales by the launch scale at 0.8 and at 1.2', () => {
    const small = loadAt(0.8).scale;
    const large = loadAt(1.2).scale;
    expect([small.scaled(10), small.scaled(15), small.scaled(17)]).toEqual([8, 12, 13.5]);
    expect([large.scaled(10), large.scaled(15), large.scaled(17)]).toEqual([12, 18, 20.5]);
    expect(small.UI_SCALE).toBe(0.8);
    expect(large.UI_SCALE).toBe(1.2);
  });

  it('keeps one launch scale per module registry', () => {
    loadAt(1.2);
    expect(UI_SCALE).toBe(DEFAULT_UI_SCALE);
    expect(scaled(15)).toBe(15);
  });
});

describe('rescaled', () => {
  it('turns a size built at the launch scale into the size at another step', () => {
    for (const launch of UI_SCALES) {
      const at = loadAt(launch).scale;
      for (const base of [11, 12, 13, 14, 15, 17, 22, 28]) {
        for (const target of UI_SCALES) {
          expect({ launch, base, target, size: at.rescaled(at.scaled(base), target) }).toEqual({
            launch,
            base,
            target,
            size: scaledBy(base, target),
          });
        }
      }
    }
  });

  it('is scaledBy at scale 1', () => {
    expect(rescaled(15, 1.2)).toBe(18);
    expect(rescaled(22, 0.8)).toBe(17.5);
  });
});

describe('tokens', () => {
  it("keep today's numbers at scale 1", () => {
    expect(
      Object.fromEntries(Object.entries(typography).map(([name, style]) => [name, [style.fontSize, style.lineHeight]])),
    ).toEqual({
      display: [28, 34],
      title: [22, 28],
      heading: [17, 24],
      subheading: [15, 22],
      body: [15, 22],
      bodyBold: [15, 22],
      caption: [13, 18],
      captionBold: [13, 18],
      small: [12, 16],
      micro: [11, 14],
    });
    expect(spacing).toEqual({ xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 });
    expect(radius).toEqual({ xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 999 });
  });

  it('shrink at 0.8', () => {
    const small = loadAt(0.8);
    expect(small.typography.body.fontSize).toBe(12);
    expect(small.typography.body.lineHeight).toBe(17.5);
    expect(small.typography.display.fontSize).toBe(22.5);
    expect(small.spacing.lg).toBe(13);
    expect(small.spacing.xxxl).toBe(32);
    expect(small.radius.xl).toBe(16);
    expect(small.radius.full).toBe(999);
  });

  it('grow at 1.2', () => {
    const large = loadAt(1.2);
    expect(large.typography.body.fontSize).toBe(18);
    expect(large.typography.body.lineHeight).toBe(26.5);
    expect(large.typography.display.fontSize).toBe(33.5);
    expect(large.spacing.lg).toBe(19);
    expect(large.spacing.xxxl).toBe(48);
    expect(large.radius.xl).toBe(24);
    expect(large.radius.full).toBe(999);
  });

  it("keep the font families and every variant's line taller than its font at every step", () => {
    for (const step of UI_SCALES) {
      const tokens = loadAt(step);
      for (const [name, style] of Object.entries(tokens.typography)) {
        expect({ step, name, family: style.fontFamily }).toEqual({
          step,
          name,
          family: typography[name as keyof typeof typography].fontFamily,
        });
        expect({ step, name, taller: style.lineHeight! > style.fontSize! }).toEqual({ step, name, taller: true });
      }
    }
  });

  it('keep the spacing and radius scales monotonic at every step', () => {
    for (const step of UI_SCALES) {
      const tokens = loadAt(step);
      const spaces = Object.values(tokens.spacing);
      expect({ step, sorted: [...spaces].sort((a, b) => a - b) }).toEqual({ step, sorted: spaces });
      const radii = Object.values(tokens.radius);
      expect({ step, sorted: [...radii].sort((a, b) => a - b) }).toEqual({ step, sorted: radii });
    }
  });
});
