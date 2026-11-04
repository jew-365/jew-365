import { screen, within } from '@testing-library/react-native';
import { MitzvahIcon } from '../MitzvahIcon';
import { NagBell, nagBellLabel } from '../NagBell';
import { renderWithTheme } from '@/testing/render';
import { THEMES } from '@/theme/colors';
import { t } from '@/i18n';
import { useUserStore } from '@/stores/useUserStore';

describe('NagBell', () => {
  beforeEach(() => useUserStore.getState().reset());

  it('shows nothing at level 1 or without a level', () => {
    renderWithTheme(<NagBell level={1} />);
    expect(screen.queryByTestId('nag-bell')).toBeNull();
    screen.unmount();
    renderWithTheme(<NagBell level={undefined} />);
    expect(screen.queryByTestId('nag-bell')).toBeNull();
    expect(nagBellLabel(1, t)).toBeNull();
  });

  it.each([2, 3, 4] as const)('level %i: the number inside a bell, named by the level and the times sent', (level) => {
    renderWithTheme(<NagBell level={level} />);
    const bell = screen.getByTestId('nag-bell');
    expect(within(bell).UNSAFE_getByType(MitzvahIcon).props.name).toBe('bell');
    expect(within(bell).getByText(String(level))).toHaveStyle({ color: THEMES.gold.goldText });
    expect(bell.props.accessibilityLabel).toBe(
      `נודניק ${t(`nag.level.${level}.name`)}: כל תזכורת נשלחת ${level} פעמים`,
    );
  });
});
