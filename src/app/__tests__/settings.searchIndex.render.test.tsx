const mockPush = jest.fn();
const mockSetParams = jest.fn((next: { focus?: string }) => {
  if (next.focus === undefined) delete mockParams.focus;
});
const mockParams: { focus?: string } = {};
const mockFocusEffects: (() => void)[] = [];
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn(), setParams: mockSetParams }),
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (effect: () => void) =>
      React.useEffect(() => {
        mockFocusEffects.push(effect);
        effect();
      }, [effect]),
  };
});
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: { rebuild: jest.fn(async () => {}), cancelAll: jest.fn(async () => {}) },
  requestNotificationPermissions: jest.fn(async () => true),
  syncNotificationPermissionStatus: jest.fn(async () => true),
}));

import { act, fireEvent, screen } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import SettingsScreen from '../(tabs)/settings';
import { translate } from '@/i18n';
import { CITIES } from '@/data/cities';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';
import { useUserStore } from '@/stores/useUserStore';
import * as searchModule from '@/utils/settingsSearch';

const ONLY_DATE = [
  'nextTick',
  'queueMicrotask',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
] as const;

const he = (key: string) => translate(key, undefined, 'he', null);

const search = async (text: string) => {
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText(he('settings.search')), text);
  });
};

const focusAgain = () => act(() => mockFocusEffects.forEach((effect) => effect()));

describe('Settings search index', () => {
  beforeEach(() => {
    mockFocusEffects.length = 0;
    delete mockParams.focus;
    mockSetParams.mockClear();
    jest.useFakeTimers({ now: at(CITIES[0], '2026-10-28T10:00'), doNotFake: [...ONLY_DATE] });
    useUserStore.getState().reset();
    useUserStore.setState({ isOnboarded: true, gender: 'male', maritalStatus: 'single' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('is not built until the first keystroke', async () => {
    const build = jest.spyOn(searchModule, 'buildSettingsSearchIndex');
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    expect(build).not.toHaveBeenCalled();
    await search('שפה');
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('is built once for a visit and again after the next focus', async () => {
    const build = jest.spyOn(searchModule, 'buildSettingsSearchIndex');
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    await search('שפה');
    await search('נוסח');
    await search('מיקום');
    expect(build).toHaveBeenCalledTimes(1);
    await focusAgain();
    expect(build).toHaveBeenCalledTimes(1);
    await search('שפה');
    await search('נוסח');
    expect(build).toHaveBeenCalledTimes(2);
  });

  it('is rebuilt when the Hebrew day turns at sunset inside the same app day', async () => {
    const build = jest.spyOn(searchModule, 'buildSettingsSearchIndex');
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    await search('שפה');
    jest.setSystemTime(at(CITIES[0], '2026-10-28T20:00'));
    await search('נוסח');
    expect(build).toHaveBeenCalledTimes(2);
  });

  it('is rebuilt when the app day turns', async () => {
    const build = jest.spyOn(searchModule, 'buildSettingsSearchIndex');
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    await search('שפה');
    jest.setSystemTime(at(CITIES[0], '2026-10-29T10:00'));
    await focusAgain();
    await search('נוסח');
    expect(build).toHaveBeenCalledTimes(2);
  });

  it('is rebuilt when an input changes', async () => {
    const build = jest.spyOn(searchModule, 'buildSettingsSearchIndex');
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    await search('שפה');
    act(() => useUserStore.setState({ nusach: 'sefard' }));
    await search('נוסח');
    expect(build).toHaveBeenCalledTimes(2);
  });

  it('scrolls back to the top on every visit, where the closed sections start', async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    scrollTo.mockClear();
    await focusAgain();
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
  });

  it('opens the section of a setting the More tab sends as focus, highlights it and clears the param', async () => {
    mockParams.focus = 'language';
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    expect(screen.getByTestId('settings-anchor-language')).toBeOnTheScreen();
    expect(mockSetParams).toHaveBeenCalledWith({ focus: undefined });
    expect(mockParams.focus).toBeUndefined();
    await act(async () => {});
    await focusAgain();
    expect(screen.queryByTestId('settings-anchor-language')).toBeNull();
  });
});
