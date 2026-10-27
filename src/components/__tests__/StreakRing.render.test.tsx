import { useReducedMotion } from 'react-native-reanimated';
import { screen } from '@testing-library/react-native';
import { Circle } from 'react-native-svg';
import { StreakRing } from '../StreakRing';
import { renderWithTheme } from '@/testing/render';
import { THEMES, THEME_NAMES } from '@/theme/colors';
import { useUserStore } from '@/stores/useUserStore';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  __esModule: true,
  useReducedMotion: jest.fn(() => true),
}));

const circles = () => screen.UNSAFE_getAllByType(Circle);

describe('StreakRing', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he' });
  });

  it('draws the streak, its label and an arc toward the next goal', () => {
    renderWithTheme(<StreakRing streak={15} />);
    expect(screen.getByText('15')).toBeOnTheScreen();
    expect(screen.getByText('ימים ברצף')).toBeOnTheScreen();
    expect(screen.getByLabelText('15 ימים ברצף')).toBeOnTheScreen();
    expect(circles()).toHaveLength(3);
    const arc = circles()[2].props;
    expect(arc.r).toBe(104);
    expect(arc.strokeWidth).toBe(12);
    expect(arc.strokeDashoffset).toBeCloseTo(2 * Math.PI * 104 * (1 - 15 / 30));
    expect(arc.transform).toBe('rotate(-90 110 110)');
  });

  it('draws no arc at zero days', () => {
    const { unmount } = renderWithTheme(<StreakRing streak={0} />);
    expect(circles()).toHaveLength(2);
    unmount();
    renderWithTheme(<StreakRing streak={7} />);
    expect(circles()).toHaveLength(3);
    expect(circles()[2].props.strokeDashoffset).toBeCloseTo(2 * Math.PI * 104 * (1 - 7 / 30));
  });

  it('says one day in the singular', () => {
    renderWithTheme(<StreakRing streak={1} />);
    expect(screen.getByText('יום ברצף')).toBeOnTheScreen();
    expect(screen.getByLabelText('יום אחד ברצף')).toBeOnTheScreen();
  });

  it.each(THEME_NAMES)('%s: takes every colour from the palette', (name) => {
    useUserStore.setState({ theme: name });
    renderWithTheme(<StreakRing streak={15} />);
    const [disc, track, arc] = circles();
    expect(disc.props.fill).toBe(THEMES[name].surface);
    expect(track.props.stroke).toBe(THEMES[name].surface2);
    expect(arc.props.stroke).toBe(THEMES[name].gold);
    expect(screen.getByText('15')).toHaveStyle({ color: THEMES[name].text, fontSize: 64 });
  });

  it('scales with size', () => {
    renderWithTheme(<StreakRing streak={15} size={110} />);
    expect(screen.getByText('15')).toHaveStyle({ fontSize: 32 });
    expect(circles()[1].props.strokeWidth).toBe(6);
  });

  it('percent mode shows the percent, the count and a label with the final value', () => {
    renderWithTheme(<StreakRing percent={{ done: 4, total: 6 }} size={100} />);
    expect(screen.getByText('67%')).toBeOnTheScreen();
    expect(screen.getByText('4/6')).toBeOnTheScreen();
    expect(screen.getByLabelText('67%, 4 מתוך 6')).toBeOnTheScreen();
    expect(circles()[1].props.strokeWidth).toBe(8);
  });

  it('percent mode with nothing due draws an empty arc and a dash', () => {
    renderWithTheme(<StreakRing percent={{ done: 0, total: 0 }} />);
    expect(screen.getByText('—')).toBeOnTheScreen();
    expect(screen.getByLabelText('עוד אין מצוות שזמנן הגיע')).toBeOnTheScreen();
    expect(circles()).toHaveLength(2);
  });

  it('animate with reduced motion shows the final number at once', () => {
    renderWithTheme(<StreakRing streak={12} animate />);
    expect(screen.getByText('12')).toBeOnTheScreen();
  });

  it('animate without reduced motion keeps the final value in the label', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    renderWithTheme(<StreakRing streak={12} animate />);
    expect(screen.getByLabelText('12 ימים ברצף')).toBeOnTheScreen();
    (useReducedMotion as jest.Mock).mockReturnValue(true);
  });

  it('never reads 100% while something is still undone', () => {
    renderWithTheme(<StreakRing percent={{ done: 199, total: 200 }} />);
    expect(screen.getByText('99%')).toBeOnTheScreen();
    expect(screen.getByLabelText('99%, 199 מתוך 200')).toBeOnTheScreen();
  });

  it('reads 100% when everything is done', () => {
    renderWithTheme(<StreakRing percent={{ done: 6, total: 6 }} />);
    expect(screen.getByText('100%')).toBeOnTheScreen();
  });

  it('reads no shared value during an animated render', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderWithTheme(<StreakRing streak={12} animate />);
    renderWithTheme(<StreakRing percent={{ done: 4, total: 6 }} animate />);
    const messages = [...warn.mock.calls, ...error.mock.calls].map((call) => String(call[0]));
    expect(messages.filter((message) => message.includes('Reading from'))).toEqual([]);
    warn.mockRestore();
    error.mockRestore();
    (useReducedMotion as jest.Mock).mockReturnValue(true);
  });
});
