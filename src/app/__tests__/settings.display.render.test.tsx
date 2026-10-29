jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
    useLocalSearchParams: () => ({}),
    useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
  };
});
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: { rebuild: jest.fn(async () => {}), cancelAll: jest.fn(async () => {}) },
  requestNotificationPermissions: jest.fn(async () => true),
  syncNotificationPermissionStatus: jest.fn(async () => true),
  notificationPermissionState: jest.fn(async () => 'granted'),
}));
jest.mock('@/services/appReload', () => ({ reloadApp: jest.fn(async () => {}) }));

import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { MitzvahIcon } from '@/components/MitzvahIcon';
import SettingsScreen from '../(tabs)/settings';
import { reloadApp } from '@/services/appReload';
import { translate } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';
import { typography } from '@/theme/typography';
import { rescaled } from '@/theme/scale';

const he = (key: string) => translate(key, undefined, 'he', null);
const mockReload = jest.mocked(reloadApp);

const smaller = () => screen.getByRole('button', { name: he('settings.uiScaleSmaller') });
const larger = () => screen.getByRole('button', { name: he('settings.uiScaleLarger') });
const applyButton = () => screen.queryByRole('button', { name: he('settings.uiScaleApply') });
const sample = () => screen.getByText(he('settings.uiScaleSample'));

async function renderDisplay() {
  renderWithTheme(<SettingsScreen />);
  await act(async () => {});
  fireEvent.press(screen.getByText(he('settings.device')));
}

const press = async (node: ReturnType<typeof screen.getByRole>) => {
  await act(async () => {
    fireEvent.press(node);
  });
};

describe('Settings display size', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ isOnboarded: true, gender: 'male', maritalStatus: 'single' });
    jest.clearAllMocks();
  });

  it('sits in the Display block between the palettes and the language, under its label and hint', async () => {
    await renderDisplay();
    const labels = screen.getAllByText(/./).map((node) => node.props.children);
    const at = (text: string) => labels.indexOf(text);
    expect(at(he('settings.theme'))).toBeGreaterThan(-1);
    expect(at(he('settings.uiScale'))).toBeGreaterThan(at(he('settings.theme')));
    expect(at(he('settings.uiScaleHint'))).toBeGreaterThan(at(he('settings.uiScale')));
    expect(at(he('settings.language'))).toBeGreaterThan(at(he('settings.uiScaleHint')));
  });

  it('shows the stored step as a percentage between the two step buttons', async () => {
    await renderDisplay();
    expect(screen.getByText('100%')).toBeOnTheScreen();
    expect(smaller()).toBeOnTheScreen();
    expect(larger()).toBeOnTheScreen();
  });

  it('draws the steps as the minus and plus icons', async () => {
    await renderDisplay();
    expect(within(smaller()).UNSAFE_getByType(MitzvahIcon).props.name).toBe('minus');
    expect(within(larger()).UNSAFE_getByType(MitzvahIcon).props.name).toBe('plus');
    expect(screen.queryByText('−')).toBeNull();
    expect(screen.queryByText('+')).toBeNull();
  });

  it('steps through the seven steps and stops at both ends', async () => {
    await renderDisplay();
    const seen = ['100%'];
    for (let i = 0; i < 3; i++) {
      await press(larger());
      seen.push(screen.getByText(/%$/).props.children);
    }
    expect(seen).toEqual(['100%', '110%', '120%', '120%']);
    expect(larger()).toBeDisabled();
    for (let i = 0; i < 8; i++) await press(smaller());
    expect(screen.getByText('80%')).toBeOnTheScreen();
    expect(smaller()).toBeDisabled();
    await press(larger());
    expect(screen.getByText('85%')).toBeOnTheScreen();
  });

  it('disables the larger button at 120% and the smaller button at 80%, from the stored step', async () => {
    useUserStore.setState({ uiScale: 1.2 });
    await renderDisplay();
    expect(screen.getByText('120%')).toBeOnTheScreen();
    expect(larger()).toBeDisabled();
    expect(smaller()).toBeEnabled();
    screen.unmount();

    useUserStore.setState({ uiScale: 0.8 });
    await renderDisplay();
    expect(screen.getByText('80%')).toBeOnTheScreen();
    expect(smaller()).toBeDisabled();
    expect(larger()).toBeEnabled();
  });

  it('shows the Apply button only while the pending step differs from the stored one', async () => {
    await renderDisplay();
    expect(applyButton()).toBeNull();
    await press(larger());
    expect(applyButton()).toBeOnTheScreen();
    await press(smaller());
    expect(applyButton()).toBeNull();
    await press(smaller());
    expect(applyButton()).toBeOnTheScreen();
    expect(useUserStore.getState().uiScale).toBe(1);
  });

  it('previews the body text at the pending step', async () => {
    await renderDisplay();
    expect(sample()).toHaveStyle({ fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight });
    await press(larger());
    expect(sample()).toHaveStyle({ fontSize: rescaled(typography.body.fontSize!, 1.1), lineHeight: 24 });
    await press(larger());
    expect(sample()).toHaveStyle({ fontSize: 18, lineHeight: 26.5 });
    for (let i = 0; i < 6; i++) await press(smaller());
    expect(sample()).toHaveStyle({ fontSize: 12, lineHeight: 17.5 });
  });

  it('asks before applying and does nothing when the question is cancelled', async () => {
    await renderDisplay();
    await press(larger());
    expect(screen.queryByText(he('settings.uiScaleConfirmTitle'))).toBeNull();
    await press(applyButton()!);
    expect(screen.getByText(he('settings.uiScaleConfirmTitle'))).toBeOnTheScreen();
    expect(screen.getByText(he('settings.uiScaleConfirmBody'))).toBeOnTheScreen();
    expect(screen.getByText(he('settings.uiScaleConfirmAction'))).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByText(he('common.cancel')));
    });
    expect(screen.queryByText(he('settings.uiScaleConfirmTitle'))).toBeNull();
    expect(useUserStore.getState().uiScale).toBe(1);
    expect(mockReload).not.toHaveBeenCalled();
    expect(screen.getByText('110%')).toBeOnTheScreen();
  });

  it('saves the pending step and reloads the app on confirm', async () => {
    await renderDisplay();
    await press(smaller());
    await press(smaller());
    await press(applyButton()!);
    await act(async () => {
      fireEvent.press(screen.getByText(he('settings.uiScaleConfirmAction')));
    });
    expect(useUserStore.getState().uiScale).toBe(0.9);
    expect(mockReload).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(he('settings.uiScaleConfirmTitle'))).toBeNull();
    expect(applyButton()).toBeNull();
    expect(screen.getByText('90%')).toBeOnTheScreen();
  });

  it('saves before it reloads', async () => {
    let savedAtReload: number | null = null;
    mockReload.mockImplementationOnce(async () => {
      savedAtReload = useUserStore.getState().uiScale;
    });
    await renderDisplay();
    await press(larger());
    await press(applyButton()!);
    await act(async () => {
      fireEvent.press(screen.getByText(he('settings.uiScaleConfirmAction')));
    });
    expect(savedAtReload).toBe(1.1);
  });

  it('shows the stored step as pending again when the section is opened anew', async () => {
    await renderDisplay();
    await press(larger());
    expect(screen.getByText('110%')).toBeOnTheScreen();
    fireEvent.press(screen.getByText(he('settings.device')));
    expect(screen.queryByText(he('settings.uiScale'))).toBeNull();
    fireEvent.press(screen.getByText(he('settings.device')));
    expect(screen.getByText('100%')).toBeOnTheScreen();
    expect(applyButton()).toBeNull();
  });

  it('is found by the settings search and opens the device section on its row', async () => {
    await renderDisplay();
    fireEvent.press(screen.getByText(he('settings.device')));
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText(he('settings.search')), 'גודל');
    });
    await act(async () => {
      fireEvent.press(screen.getByText(he('settings.uiScale')));
    });
    expect(screen.getByTestId('settings-anchor-uiScale')).toBeOnTheScreen();
    expect(screen.getByText('100%')).toBeOnTheScreen();
  });
});
