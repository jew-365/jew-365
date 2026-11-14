import { Text } from 'react-native';
import { screen } from '@testing-library/react-native';
import { ShabbatScreen } from '../ShabbatScreen';
import { IconTile } from '../IconTile';
import { CITIES } from '@/data/cities';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { THEMES } from '@/theme/colors';
import { useUserStore } from '@/stores/useUserStore';
import { clockOf } from '@/utils/clock';
import type { HolyBlock } from '@/types/zmanim';

const JERUSALEM = CITIES[0];
const NEW_YORK = CITIES.find((city) => city.cityId === 'new-york')!;

const BLOCK: HolyBlock = {
  start: new Date(2026, 10, 13, 16),
  end: new Date(2026, 10, 14, 18),
  days: ['2026-11-14'],
  kind: 'shabbat',
};

describe('ShabbatScreen', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he' });
  });

  it('renders nothing outside a block', () => {
    const { toJSON } = renderWithTheme(<ShabbatScreen block={null} tz={JERUSALEM.tz} />);
    expect(toJSON()).toBeNull();
  });

  it('puts the exit time in a goldLight pill', () => {
    renderWithTheme(<ShabbatScreen block={BLOCK} tz={JERUSALEM.tz} />);
    expect(screen.getByText('שבת שלום')).toBeOnTheScreen();
    expect(screen.getByTestId('shabbat-until')).toHaveStyle({
      backgroundColor: THEMES.gold.goldLight,
      borderRadius: 999,
    });
    expect(screen.getByText(`צאת השבת ${clockOf(BLOCK.end, JERUSALEM.tz)}`)).toHaveStyle({
      color: THEMES.gold.goldText,
    });
  });

  it("prints the exit on the location's clock, not the device's", () => {
    renderWithTheme(<ShabbatScreen block={{ ...BLOCK, end: at(NEW_YORK, '2026-11-14T17:10') }} tz={NEW_YORK.tz} />);
    expect(screen.getByText('צאת השבת 17:10')).toBeOnTheScreen();
  });

  it('names the place the times follow, so a reviewer sees the rest is tied to a place', () => {
    renderWithTheme(<ShabbatScreen block={BLOCK} tz={JERUSALEM.tz} place="ירושלים" />);
    expect(screen.getByTestId('shabbat-place')).toHaveTextContent('הזמנים לפי ירושלים');
  });

  it('offers its children under the change-place line, and nothing without them', () => {
    const { unmount } = renderWithTheme(
      <ShabbatScreen block={BLOCK} tz={JERUSALEM.tz} place="ירושלים">
        <Text>picker</Text>
      </ShabbatScreen>,
    );
    expect(screen.getByTestId('shabbat-change-place')).toHaveTextContent('במקום אחר? אפשר לבחור את המקום שלכם', {
      exact: false,
    });
    expect(screen.getByText('picker')).toBeOnTheScreen();
    unmount();
    renderWithTheme(<ShabbatScreen block={BLOCK} tz={JERUSALEM.tz} place="ירושלים" />);
    expect(screen.queryByTestId('shabbat-change-place')).toBeNull();
  });

  it('draws no place line without a place', () => {
    renderWithTheme(<ShabbatScreen block={BLOCK} tz={JERUSALEM.tz} />);
    expect(screen.queryByTestId('shabbat-place')).toBeNull();
  });

  it('draws the candles emblem at 72 points', () => {
    renderWithTheme(<ShabbatScreen block={BLOCK} tz={JERUSALEM.tz} />);
    expect(screen.UNSAFE_getByType(IconTile).props).toMatchObject({ name: 'candles', size: 72 });
  });
});
