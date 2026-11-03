jest.mock('react-native-reanimated', () => {
  // Reanimated reads the system's reduced-motion flag once, as it loads; a device with the setting on sets it so.
  Object.assign(globalThis, { _REANIMATED_IS_REDUCED_MOTION: true });
  return jest.requireActual('react-native-reanimated');
});

import { act, fireEvent, screen } from '@testing-library/react-native';
import { NowCard } from '../NowCard';
import { CITIES } from '@/data/cities';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';

const J = CITIES[0];

const cardStyle = () => screen.getByTestId('now-card').props.jestAnimatedStyle.value;
const opacity = () => Number(cardStyle().opacity);
const card = (stamping: boolean) => (
  <NowCard
    testID="now-card"
    name="קריאת שמע של שחרית"
    icon="shacharit"
    start={at(J, '2026-10-29T05:53')}
    end={at(J, '2026-10-29T08:38')}
    now={at(J, '2026-10-29T08:15')}
    tz={J.tz}
    pct={0.14}
    urgent={false}
    stamping={stamping}
    onComplete={jest.fn()}
    onPress={jest.fn()}
    onLongPress={jest.fn()}
  />
);
function advance(ms: number) {
  for (let step = 0; step < ms; step += 10) act(() => jest.advanceTimersByTime(10));
}

describe('NowCard under the system reduced-motion setting', () => {
  beforeEach(() => jest.useFakeTimers({ now: at(J, '2026-10-29T08:15') }));
  afterEach(() => jest.useRealTimers());

  it('shows the done state for a second, then fades the card out without closing its height', () => {
    const view = renderWithTheme(card(false));
    fireEvent(screen.getByTestId('now-card'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 220 } },
    });
    view.rerender(card(true));
    fireEvent(screen.getByTestId('now-card-actions'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 120, width: 320, height: 48 } },
    });
    advance(100);
    expect(screen.queryAllByTestId('now-card-spark')).toHaveLength(0);
    expect(screen.getByText(/^בוצע ב-\d{2}:\d{2}$/)).toBeOnTheScreen();
    expect(opacity()).toBe(1);
    advance(850);
    expect(opacity()).toBe(1);
    advance(200);
    expect(opacity()).toBeGreaterThan(0);
    expect(opacity()).toBeLessThan(1);
    expect(cardStyle().height).toBeUndefined();
    advance(300);
    expect(opacity()).toBe(0);
  });
});
