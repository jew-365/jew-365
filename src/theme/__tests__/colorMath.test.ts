import { CALENDAR_PARTIAL_SHARES, THEMES, THEME_NAMES, blendHex, contrastRatio, readableOn } from '../colors';

describe('color math', () => {
  it('blends two hex colours channel by channel', () => {
    expect(blendHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('accepts short hex and clamps the share', () => {
    expect(blendHex('#000', '#fff', 0.5)).toBe('#808080');
    expect(blendHex('#000000', '#ffffff', 2)).toBe('#000000');
    expect(blendHex('#000000', '#ffffff', -1)).toBe('#ffffff');
  });

  it('refuses an empty candidate list', () => {
    expect(() => readableOn('#000000', [])).toThrow('readableOn needs at least one candidate');
  });

  it('measures WCAG contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
  });

  it('picks the most readable ink', () => {
    expect(readableOn('#000000', ['#111111', '#ffffff'])).toBe('#ffffff');
  });

  it.each(THEME_NAMES)('%s: every calendar fill keeps its ink readable', (name) => {
    const { gold, bg, text, onGold } = THEMES[name];
    Object.entries(CALENDAR_PARTIAL_SHARES).forEach(([, share]) => {
      const fill = blendHex(gold, bg, share);
      const ink = readableOn(fill, [text, onGold]);
      expect(contrastRatio(fill, ink)).toBeGreaterThanOrEqual(4.5);
    });
    expect(contrastRatio(gold, readableOn(gold, [text, onGold]))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the three partial steps apart', () => {
    const [p1, p2, p3] = [CALENDAR_PARTIAL_SHARES.p1, CALENDAR_PARTIAL_SHARES.p2, CALENDAR_PARTIAL_SHARES.p3];
    expect(p2 - p1).toBeGreaterThanOrEqual(0.15);
    expect(p3 - p2).toBeGreaterThanOrEqual(0.15);
  });
});
