import { screen, within } from '@testing-library/react-native';
import { MitzvahIcon } from '../MitzvahIcon';
import { NagBell, nagBellLabel } from '../NagBell';
import { renderWithTheme } from '@/testing/render';
import { THEMES } from '@/theme/colors';
import { t } from '@/i18n';
import { useUserStore } from '@/stores/useUserStore';

describe('NagBell', () => {
  beforeEach(() => useUserStore.getState().reset());

  it('shows nothing without a count', () => {
    renderWithTheme(<NagBell count={null} />);
    expect(screen.queryByTestId('nag-bell')).toBeNull();
    screen.unmount();
    renderWithTheme(<NagBell count={undefined} />);
    expect(screen.queryByTestId('nag-bell')).toBeNull();
    expect(nagBellLabel(null, t)).toBeNull();
  });

  it.each([4, 6, 12])('%i: the total inside a bell, named by the total', (count) => {
    renderWithTheme(<NagBell count={count} />);
    const bell = screen.getByTestId('nag-bell');
    const icon = within(bell).UNSAFE_getByType(MitzvahIcon);
    expect(icon.props).toMatchObject({
      name: 'bell',
      color: THEMES.gold.goldText,
      tint: THEMES.gold.goldLight,
      variant: 'duotone',
    });
    expect(within(bell).getByText(String(count))).toHaveStyle({ color: THEMES.gold.goldText });
    expect(bell.props.accessibilityLabel).toBe(`נודניק: ${count} התראות בסך הכול`);
  });

  it('sets two digits smaller, so they stay inside the bell', () => {
    renderWithTheme(<NagBell count={12} />);
    expect(screen.getByText('12')).toHaveStyle({ fontSize: 10 });
    screen.unmount();
    renderWithTheme(<NagBell count={8} />);
    expect(screen.getByText('8')).toHaveStyle({ fontSize: 12 });
  });
});
