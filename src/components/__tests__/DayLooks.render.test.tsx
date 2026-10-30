import { StyleSheet } from 'react-native';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { DayLooks, type DayLookEntry } from '../DayLooks';
import { Reveal } from '../Reveal';
import { CITIES } from '@/data/cities';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { LATE_BADGE, THEMES, doneTone, lateTone, missedTone } from '@/theme/colors';
import { dayEntryStatusText, type DayEntry } from '@/utils/homeDay';
import { t } from '@/i18n';

type Node = ReturnType<typeof screen.getByTestId>;

const J = CITIES[0];
const NOW = at(J, '2026-10-29T12:30');
const day = (time: string) => at(J, `2026-10-29T${time}`);
const date = day('12:00');

function entry(id: string, status: DayEntry['status'], start: string, end: string, markedAt?: string): DayLookEntry {
  const base: DayEntry = {
    id,
    status,
    start: day(start),
    end: end === '04:40' ? at(J, '2026-10-30T04:40') : day(end),
    markedAt: markedAt ? day(markedAt).getTime() : null,
    date,
  };
  return {
    ...base,
    name: id,
    icon: 'shacharit',
    statusText: dayEntryStatusText(base, NOW, J.tz, t),
    range: `${start} - ${end}`,
    startLabel: start,
    endLabel: end,
  };
}

const A = entry('A', 'active', '05:53', '08:38');
const B = entry('B', 'active', '11:50', '16:52');
const U = entry('U', 'upcoming', '17:23', '04:40');
const D1 = entry('D1', 'done', '05:00', '06:00', '07:00');
const S = entry('S', 'skipped', '05:00', '06:00', '08:00');
const D2 = entry('D2', 'done', '05:00', '06:00', '09:00');
const M = entry('M', 'missed', '05:53', '09:33');
const L = entry('L', 'late', '05:00', '06:00', '10:00');
const ORDERED = [A, B, U, D1, S, D2, M];

function setup(look: 'rings' | 'cards' | 'rail', entries = ORDERED) {
  const handlers = { onPress: jest.fn(), onLongPress: jest.fn(), onMark: jest.fn(), onUndo: jest.fn() };
  renderWithTheme(<DayLooks look={look} entries={entries} now={NOW} nowLabel="12:30" playKey={0} {...handlers} />);
  return handlers;
}

function dayIds() {
  return screen.getAllByTestId(/^home-day-/).map((node: Node) => String(node.props.testID).replace('home-day-', ''));
}

function coloursOnScreen(): unknown[] {
  return screen.UNSAFE_root.findAll(() => true).flatMap((node: Node) => {
    const style = StyleSheet.flatten(node.props.style) ?? {};
    return [style.color, style.backgroundColor, style.borderColor, node.props.color, node.props.stroke];
  });
}

function fillsIn(id: string): unknown[] {
  const root = screen.getByTestId(`home-day-${id}`);
  return root
    .findAll(
      (node: Node) => typeof node.type === 'string' && Boolean(StyleSheet.flatten(node.props.style)?.backgroundColor),
    )
    .map((node: Node) => StyleSheet.flatten(node.props.style).backgroundColor);
}

describe('DayLooks', () => {
  it('rings: lists the entries in order with the summary and the actions', () => {
    const handlers = setup('rings');
    expect(dayIds()).toEqual(['A', 'B', 'U', 'D1', 'S', 'D2', 'M']);
    const summary = screen.getByTestId('home-rings-summary');
    expect(within(summary).getAllByText('2').length).toBeGreaterThan(0);
    expect(within(summary).getByText('מתוך 6')).toBeOnTheScreen();
    expect(within(summary).getByRole('image', { name: 'בוצעו 2, פתוחות 3, פוספסו 1, מתוך 6' })).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'סמן M כהושלם' }));
    expect(handlers.onMark).toHaveBeenCalledWith(M);
    expect(screen.queryByRole('button', { name: 'סמן A כהושלם' })).toBeNull();

    const undo = screen.getAllByRole('button', { name: /^ביטול סימון - / });
    expect(undo).toHaveLength(3);
    expect(undo.map((node: Node) => node.props.accessibilityLabel)).toEqual([
      'ביטול סימון - D1',
      'ביטול סימון - S',
      'ביטול סימון - D2',
    ]);
    expect(screen.getAllByText('בטל')).toHaveLength(3);
    fireEvent.press(undo[0]);
    expect(handlers.onUndo).toHaveBeenCalledWith(D1);

    const body = screen.getByRole('button', { name: /^U, / });
    fireEvent.press(body);
    fireEvent(body, 'longPress');
    expect(handlers.onPress).toHaveBeenCalledWith(U);
    expect(handlers.onLongPress).toHaveBeenCalledWith(U);
  });

  it('tints missed and done cards', () => {
    setup('rings');
    expect(fillsIn('M')).toContain(missedTone(THEMES.gold).fill);
    expect(fillsIn('D1')).toContain(doneTone(THEMES.gold).fill);
  });

  it.each(['rings', 'cards', 'rail'] as const)('%s: a late mark looks done, with an orange late label', (look) => {
    const gold = THEMES.gold;
    setup(look, [{ ...L, status: 'done' }]);
    const asDone = new Set(coloursOnScreen());
    screen.unmount();

    const handlers = setup(look, [L]);
    expect(fillsIn('L')).toContain(doneTone(gold).fill);
    expect(StyleSheet.flatten(screen.getByText('בוצע ב-10:00').props.style).color).toBe(doneTone(gold).ink);
    const colours = coloursOnScreen();
    expect(new Set(colours)).toEqual(new Set([...asDone, LATE_BADGE.fill, LATE_BADGE.ink]));
    for (const yellow of [...Object.values(lateTone(gold)), gold.warning]) expect(colours).not.toContain(yellow);

    const badge = screen.getByTestId('home-day-late-L');
    expect(StyleSheet.flatten(badge.props.style).backgroundColor).toBe(LATE_BADGE.fill);
    expect(StyleSheet.flatten(within(badge).getByText('בוצע באיחור').props.style).color).toBe(LATE_BADGE.ink);
    expect(screen.getByRole('button', { name: 'L, בוצע ב-10:00, בוצע באיחור' })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'ביטול סימון - L' }));
    expect(handlers.onUndo).toHaveBeenCalledWith(L);
  });

  it('no late label on a mark made in time', () => {
    setup('rings');
    expect(screen.queryByTestId(/^home-day-late-/)).toBeNull();
    expect(screen.queryByText('בוצע באיחור')).toBeNull();
  });

  it('cards: no summary, same order', () => {
    setup('cards');
    expect(screen.queryByTestId('home-rings-summary')).toBeNull();
    expect(dayIds()).toEqual(['A', 'B', 'U', 'D1', 'S', 'D2', 'M']);
  });

  it('rail: time order whatever the status, the now row between B and U', () => {
    setup('rail');
    const order = screen.UNSAFE_root.findAll(
      (node: Node) => typeof node.type === 'string' && /^home-(day|rail-now)/.test(String(node.props.testID)),
    ).map((node: Node) => String(node.props.testID));
    expect(order).toEqual([
      'home-day-D1',
      'home-day-D2',
      'home-day-S',
      'home-day-A',
      'home-day-M',
      'home-day-B',
      'home-rail-now',
      'home-day-U',
    ]);
    expect(screen.getByText('עכשיו 12:30')).toBeOnTheScreen();
  });

  it('wraps each entry in a Reveal with the stagger', () => {
    setup('rings');
    const reveals = screen.UNSAFE_getAllByType(Reveal);
    expect(reveals).toHaveLength(ORDERED.length);
    reveals.forEach((reveal, index) => {
      expect(reveal.props).toMatchObject({ duration: 260, shift: 25, delay: index * 30 });
    });
  });
});
