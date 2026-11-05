import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import Svg, { Circle } from 'react-native-svg';
import { NowCard } from '../NowCard';
import { CITIES } from '@/data/cities';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { THEMES } from '@/theme/colors';
import { shadowPresets } from '@/theme/shadowStyle';
import { typography } from '@/theme/typography';

const J = CITIES[0];
const NAME = 'קריאת שמע של שחרית';
const START = at(J, '2026-10-29T05:53');
const END = at(J, '2026-10-29T08:38');
const NOW = at(J, '2026-10-29T08:15');

function setup(overrides: Partial<React.ComponentProps<typeof NowCard>> = {}) {
  const props = {
    name: NAME,
    icon: 'shacharit' as const,
    start: START,
    end: END,
    now: NOW,
    tz: J.tz,
    pct: 0.14,
    urgent: true,
    stamping: false,
    onComplete: jest.fn(),
    onPress: jest.fn(),
    onLongPress: jest.fn(),
    ...overrides,
  };
  renderWithTheme(<NowCard {...props} />);
  return props;
}

// The ring by its own geometry: the icon tile beside it may draw circles too (a sun over the open siddur).
function progressStroke() {
  return screen.UNSAFE_getAllByType(Circle).find((circle) => circle.props.r === 25 && circle.props.strokeDasharray)
    ?.props.stroke;
}

describe('NowCard', () => {
  it('shows the start and end clocks and the minutes left in the ring', () => {
    setup();
    expect(screen.getByText('05:53 - התחלה')).toBeOnTheScreen();
    expect(screen.getByText('08:38 - סוף')).toBeOnTheScreen();
    expect(screen.getByText('23', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText("דק'", { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('draws a note line under the end time when given, and none without one', () => {
    setup({ note: 'מג״א 08:01 · גר״א 08:34 (בחירתך)' });
    expect(screen.getByTestId('now-card-note')).toHaveTextContent('מג״א 08:01 · גר״א 08:34 (בחירתך)');
    screen.unmount();
    setup();
    expect(screen.queryByTestId('now-card-note')).toBeNull();
  });

  it('keeps the time left clear of the ring: a 68-point ring, 13-point figures, a capped font scale', () => {
    setup({ now: at(J, '2026-10-29T06:00') });
    const ring = screen.UNSAFE_getAllByType(Svg).find((svg) => svg.props.viewBox === '0 0 60 60');
    expect(ring?.props.width).toBe(68);
    const value = screen.getByText('2:38', { includeHiddenElements: true });
    expect(StyleSheet.flatten(value.props.style).fontSize).toBe(typography.captionBold.fontSize);
    for (const text of [value, screen.getByText('שעות', { includeHiddenElements: true })]) {
      expect(text.props.maxFontSizeMultiplier).toBe(1.1);
    }
  });

  it('draws the progress ring in urgent', () => {
    setup();
    expect(progressStroke()).toBe(THEMES.gold.urgent);
  });

  it('draws the progress ring in gold when not urgent', () => {
    setup({ urgent: false });
    expect(progressStroke()).toBe(THEMES.gold.gold);
  });

  it('marks done from the labelled button', () => {
    const props = setup();
    expect(screen.getByText('עשיתי')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: `סמן ${NAME} כהושלם` }));
    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });

  it('offers the text button only with onOpenText', () => {
    setup();
    expect(screen.queryByText('נוסח')).toBeNull();
  });

  it('calls onOpenText from the text button', () => {
    const onOpenText = jest.fn();
    setup({ onOpenText });
    fireEvent.press(screen.getByRole('button', { name: `נוסח - ${NAME}` }));
    expect(onOpenText).toHaveBeenCalledTimes(1);
    expect(screen.getByText('נוסח')).toBeOnTheScreen();
  });

  it('opens on a press of the body and answers a long press', () => {
    const props = setup();
    const body = screen.getByRole('button', { name: new RegExp(`^${NAME}, `) });
    fireEvent.press(body);
    fireEvent(body, 'longPress');
    expect(props.onPress).toHaveBeenCalledTimes(1);
    expect(props.onLongPress).toHaveBeenCalledTimes(1);
  });

  it('answers a mark with the done button, the sparks, the green arc, the ring check and the done line, not the old stamp', () => {
    setup({ stamping: true });
    expect(screen.getByTestId('now-card-done-button')).toBeOnTheScreen();
    // The sparks wait for the actions row's box, which they copy over the card.
    expect(screen.queryAllByTestId('now-card-spark')).toHaveLength(0);
    fireEvent(screen.getByTestId('now-card-actions'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 120, width: 320, height: 48 } },
    });
    expect(screen.getAllByTestId('now-card-spark')).toHaveLength(16);
    // The green arc fades in over the ring with the same dash, so the ring turns green on every platform.
    const [rest, doneArc] = screen
      .UNSAFE_getAllByType(Circle)
      .filter((c) => c.props.r === 25 && c.props.strokeDasharray);
    expect(doneArc.props.testID).toBe('now-card-done-arc');
    expect(doneArc.props.stroke).toBe(THEMES.gold.safe);
    expect([doneArc.props.strokeDasharray, doneArc.props.strokeDashoffset]).toEqual([
      rest.props.strokeDasharray,
      rest.props.strokeDashoffset,
    ]);
    expect(screen.getByTestId('now-card-ring-check', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText(/^בוצע ב-\d{2}:\d{2}$/)).toBeOnTheScreen();
    expect(screen.queryByText('נעשה!')).toBeNull();
  });

  it('draws none of it while not stamping', () => {
    setup();
    expect(screen.queryByTestId('now-card-done-button')).toBeNull();
    expect(screen.queryByTestId('now-card-ring-check', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByText(/^בוצע ב-/)).toBeNull();
    expect(screen.queryAllByTestId('now-card-spark')).toHaveLength(0);
    expect(screen.UNSAFE_getAllByType(Circle).some((circle) => circle.props.testID === 'now-card-done-arc')).toBe(
      false,
    );
  });

  it('ignores the mark button while the card is stamping', () => {
    const props = setup({ stamping: true });
    fireEvent.press(screen.getByRole('button', { name: `סמן ${NAME} כהושלם` }));
    expect(props.onComplete).not.toHaveBeenCalled();
  });

  it('lays the sparks over the actions row at its own offset, above the card', () => {
    setup({ stamping: true });
    fireEvent(screen.getByTestId('now-card-actions'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 120, width: 320, height: 48 } },
    });
    const row = StyleSheet.flatten(screen.getByTestId('now-card-spark-row').props.style);
    expect([row.top, row.height]).toEqual([120, 48]);
    expect(row.elevation).toBe(shadowPresets.cardSoft.elevation + 1);
    expect(row.zIndex).toBe(1);
  });

  it('prints hours and minutes from an hour left', () => {
    setup({ now: at(J, '2026-10-29T06:30') });
    expect(screen.getByText('2:08', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('שעות', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
