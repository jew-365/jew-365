const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: { rebuild: jest.fn(async () => {}) },
  requestNotificationPermissions: jest.fn(async () => true),
}));
jest.mock('@/services/BackupService', () => ({
  ...(jest.requireActual('@/services/BackupService') as object),
  pickBackup: jest.fn(),
  restoreBackup: jest.fn(async () => {}),
}));
jest.mock('@/services/appReload', () => ({ reloadApp: jest.fn() }));

import { fireEvent, screen } from '@testing-library/react-native';
import WelcomeScreen from '../onboarding/index';
import { translate, type AppLanguage } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';

const text = (key: string, language: AppLanguage) => translate(key, undefined, language, null);

describe('Onboarding welcome step: language switch and optional fields', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he' });
    mockPush.mockClear();
  });

  it('draws a language radiogroup with both native names and the stored language selected', () => {
    renderWithTheme(<WelcomeScreen />);
    const group = screen.getByTestId('welcome-language');
    expect(group.props.accessibilityRole).toBe('radiogroup');
    expect(group.props.accessibilityLabel).toBe(text('settings.language', 'he'));
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'עברית' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'English' })).not.toBeSelected();
  });

  it('selects English when the store holds English, and names the group in English', () => {
    useUserStore.setState({ language: 'en' });
    renderWithTheme(<WelcomeScreen />);
    expect(screen.getByRole('radio', { name: 'English' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'עברית' })).not.toBeSelected();
    expect(screen.getByTestId('welcome-language').props.accessibilityLabel).toBe(text('settings.language', 'en'));
  });

  it('stores the typed name and phone, then sets the language, when English is pressed', () => {
    const seenAtChange: { name: string; phone: string }[] = [];
    const unsubscribe = useUserStore.subscribe((state, previous) => {
      if (state.language !== previous.language)
        seenAtChange.push({ name: state.profileName, phone: state.profilePhone });
    });
    renderWithTheme(<WelcomeScreen />);
    fireEvent.changeText(screen.getByPlaceholderText(text('settings.profileNamePlaceholder', 'he')), '  Dana  ');
    fireEvent.changeText(screen.getByPlaceholderText(text('settings.profilePhonePlaceholder', 'he')), ' 0501234567 ');

    fireEvent.press(screen.getByRole('radio', { name: 'English' }));
    unsubscribe();

    expect(useUserStore.getState().language).toBe('en');
    expect(useUserStore.getState().profileName).toBe('Dana');
    expect(useUserStore.getState().profilePhone).toBe('0501234567');
    expect(seenAtChange).toEqual([{ name: 'Dana', phone: '0501234567' }]);
    expect(screen.getByRole('radio', { name: 'English' })).toBeSelected();
  });

  it('sets Hebrew when Hebrew is pressed from English', () => {
    useUserStore.setState({ language: 'en' });
    renderWithTheme(<WelcomeScreen />);
    fireEvent.press(screen.getByRole('radio', { name: 'עברית' }));
    expect(useUserStore.getState().language).toBe('he');
  });

  it('changes nothing when the selected language is pressed', () => {
    const listener = jest.fn();
    renderWithTheme(<WelcomeScreen />);
    fireEvent.changeText(screen.getByPlaceholderText(text('settings.profileNamePlaceholder', 'he')), 'Dana');
    const unsubscribe = useUserStore.subscribe(listener);

    fireEvent.press(screen.getByRole('radio', { name: 'עברית' }));
    unsubscribe();

    expect(listener).not.toHaveBeenCalled();
    expect(useUserStore.getState().language).toBe('he');
    expect(useUserStore.getState().profileName).toBe('');
  });

  it('labels the fields as optional in Hebrew', () => {
    renderWithTheme(<WelcomeScreen />);
    expect(screen.getByText('שם (לא חובה)')).toBeOnTheScreen();
    expect(screen.getByText('טלפון (לא חובה)')).toBeOnTheScreen();
  });

  it('labels the fields as optional in English and says both are optional', () => {
    useUserStore.setState({ language: 'en' });
    renderWithTheme(<WelcomeScreen />);
    expect(screen.getByText('Name (optional)')).toBeOnTheScreen();
    expect(screen.getByText('Phone (optional)')).toBeOnTheScreen();
    expect(screen.getByText('Both are optional. You can fill them in now or later in Settings.')).toBeOnTheScreen();
  });

  it('continues to the profile step with both fields empty', () => {
    renderWithTheme(<WelcomeScreen />);
    fireEvent.press(screen.getByRole('button', { name: text('common.continue', 'he') }));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/onboarding/profile');
    expect(useUserStore.getState().profileName).toBe('');
    expect(useUserStore.getState().profilePhone).toBe('');
  });
});
