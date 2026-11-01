import { render } from '@testing-library/react-native';
import type { render as renderType } from '@testing-library/react-native';
type ReactTestInstance = ReturnType<typeof renderType>['UNSAFE_root'];
import { Circle, Ellipse, G, Line, LinearGradient, Path, Rect } from 'react-native-svg';
import { ICON_NAMES, MitzvahIcon, toneOf } from '../MitzvahIcon';
import { JEWISH_ICONS, JEWISH_TONES } from '../jewishIcons.generated';

const JEWISH = [
  'tefillin',
  'shacharit',
  'mincha',
  'maariv',
  'shema',
  'brachot',
  'night',
  'candles',
  'havdalah',
  'omer',
  'chanukiah',
  'sukkah',
  'shofar',
  'moon',
  'chok',
  'siddur',
  'tehillim',
  'meals',
  'general',
  'occasions',
  'hilula',
] as const;

// react-native-svg wraps its children in a group of its own, so the icon's group is the one carrying the stroke.
const strokeGroup = (root: ReactTestInstance) =>
  root.find((n: ReactTestInstance) => n.type === G && n.props.stroke === '#123456');
const shapes = (root: ReactTestInstance) =>
  root.findAll((n: ReactTestInstance) => [Path, Rect, Circle, Ellipse, Line].includes(n.type as never));

describe('MitzvahIcon', () => {
  it.each(ICON_NAMES)('%s draws something', (name) => {
    const { UNSAFE_root } = render(<MitzvahIcon name={name} color="#123456" />);
    expect(shapes(UNSAFE_root).length).toBeGreaterThan(0);
  });

  it('draws the 21 Jewish icons from the generated set, every one an icon name', () => {
    expect(Object.keys(JEWISH_ICONS).sort()).toEqual([...JEWISH].sort());
    for (const name of JEWISH) expect(ICON_NAMES).toContain(name);
  });

  it('mixes each role from the icon colour: a full share is the colour itself, a share of none the other colour', () => {
    expect(toneOf('#F08A3C', 'acc')).toBe('#f08a3c');
    expect(toneOf('#F08A3C', 'white')).toBe('#ffffff');
    // paper: 12% of the colour over white.
    expect(toneOf('#F08A3C', 'paper')).toBe('#fdf1e8');
    expect(toneOf('#F08A3C', 'unknown')).toBe('#F08A3C');
  });

  it.each(JEWISH)('%s: painted only in tones of the icon colour, so it follows every palette', (name) => {
    const tones = new Set(Object.keys(JEWISH_TONES).map((role) => toneOf('#123456', role)));
    const { UNSAFE_root } = render(<MitzvahIcon name={name} color="#123456" />);
    const painted = UNSAFE_root.findAll((n: ReactTestInstance) => typeof n.type !== 'string')
      .flatMap((n: ReactTestInstance) => [n.props.fill, n.props.stroke, n.props.stopColor])
      .filter((v: unknown): v is string => typeof v === 'string' && v !== 'none' && !v.startsWith('url('));
    expect(painted.length).toBeGreaterThan(0);
    for (const value of painted) expect(tones).toContain(value);
  });

  it('gives each drawn shofar its own gradient id', () => {
    const ids = [0, 1].map(
      () =>
        render(<MitzvahIcon name="shofar" color="#123456" />)
          .UNSAFE_root.findAll((n: ReactTestInstance) => n.type === LinearGradient)
          .map((n: ReactTestInstance) => n.props.id)[0],
    );
    expect(ids[0]).toMatch(/^jewish-/);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('keeps the UI icons on their own 24-unit drawings', () => {
    const { UNSAFE_root } = render(<MitzvahIcon name="check" color="#123456" />);
    expect(strokeGroup(UNSAFE_root).props.strokeWidth).toBe(1.8);
    expect(shapes(UNSAFE_root)).toHaveLength(1);
  });
});
