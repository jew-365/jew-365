import { render } from '@testing-library/react-native';
import type { render as renderType } from '@testing-library/react-native';
type ReactTestInstance = ReturnType<typeof renderType>['UNSAFE_root'];
import { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { ICON_NAMES, MitzvahIcon } from '../MitzvahIcon';
import { JEWISH_ICONS } from '../jewishIcons.generated';

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

  it('draws the 21 Jewish icons from the generated line set, every one an icon name', () => {
    expect(Object.keys(JEWISH_ICONS).sort()).toEqual([...JEWISH].sort());
    for (const name of JEWISH) expect(ICON_NAMES).toContain(name);
  });

  it.each(JEWISH)('%s: thin rounded lines with a soft fill in the icon colour', (name) => {
    const { UNSAFE_root } = render(<MitzvahIcon name={name} color="#123456" />);
    expect(strokeGroup(UNSAFE_root).props).toMatchObject({
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    });
    const soft = shapes(UNSAFE_root).filter((n: ReactTestInstance) => n.props.fillOpacity === 0.26);
    expect(soft.length).toBeGreaterThan(0);
    for (const n of soft) expect(n.props.fill).toBe('#123456');
  });

  it('keeps the UI icons on their own 24-unit drawings', () => {
    const { UNSAFE_root } = render(<MitzvahIcon name="check" color="#123456" />);
    expect(strokeGroup(UNSAFE_root).props.strokeWidth).toBe(1.8);
    expect(shapes(UNSAFE_root)).toHaveLength(1);
  });
});
