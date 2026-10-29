import { fireEvent, screen } from '@testing-library/react-native';
import { Circle } from 'react-native-svg';
import { NowCard } from '../NowCard';
import { CITIES } from '@/data/cities';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { THEMES } from '@/theme/colors';

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

function progressStroke() {
  return screen.UNSAFE_getAllByType(Circle)[1].props.stroke;
}

describe('NowCard', () => {
  it('shows the start and end clocks and the minutes left in the ring', () => {
    setup();
    expect(screen.getByText('05:53 - התחלה')).toBeOnTheScreen();
    expect(screen.getByText('08:38 - סוף')).toBeOnTheScreen();
    expect(screen.getByText('23', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText("דק'", { includeHiddenElements: true })).toBeOnTheScreen();
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

  it('shows the stamp while stamping', () => {
    setup({ stamping: true });
    expect(screen.getByText('נעשה!')).toBeOnTheScreen();
  });

  it('prints hours and minutes from an hour left', () => {
    setup({ now: at(J, '2026-10-29T06:30') });
    expect(screen.getByText('2:08', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('שעות', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
