const mockParams: Record<string, string> = {};
let mockLoadedText: unknown = null;

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    Stack: { Screen: () => null },
    useRouter: () => ({
      push: jest.fn(),
      back: jest.fn(),
      replace: jest.fn(),
      navigate: jest.fn(),
      dismissAll: jest.fn(),
      canDismiss: () => false,
      canGoBack: () => true,
    }),
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
  };
});
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: () => Promise.resolve(),
  deactivateKeepAwake: () => Promise.resolve(),
}));
jest.mock('@/services/SiddurService', () => ({
  loadSiddurText: () => ({
    then: (resolve: (text: unknown) => void) => {
      resolve(mockLoadedText);
      return { catch: () => {} };
    },
  }),
  loadChokParasha: () => Promise.reject(new Error('no chok text in a scale render')),
}));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getPresentedNotificationsAsync: jest.fn(async () => []),
  dismissNotificationAsync: jest.fn(async () => {}),
  dismissAllNotificationsAsync: jest.fn(async () => {}),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => ({})),
  setNotificationCategoryAsync: jest.fn(async () => ({})),
  registerTaskAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  AndroidImportance: { HIGH: 'high', DEFAULT: 'default', LOW: 'low' },
  AndroidNotificationVisibility: { PUBLIC: 'public', PRIVATE: 'private' },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(async () => false),
  unregisterTaskAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-background-task', () => ({
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
  getStatusAsync: jest.fn(),
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
}));

import { StyleSheet } from 'react-native';
import type { ComponentType, ReactElement } from 'react';
import { CITIES } from '@/data/cities';
import { at } from '@/testing/zmanim';
import { scaledBy } from '@/theme/scale';
import type { SiddurText } from '@/types/siddur';
import { siddurLineHeight } from '@/utils/siddur';

jest.setTimeout(30000);

type Rntl = typeof import('@testing-library/react-native');
type IconProps = { name: string; size?: number };
type Harness = {
  rntl: Rntl;
  renderWithTheme: (ui: ReactElement) => unknown;
  Reader: ComponentType;
  MitzvahScreen: ComponentType;
  MitzvahIcon: ComponentType<IconProps>;
  IconTile: ComponentType<IconProps>;
  useUserStore: typeof import('@/stores/useUserStore').useUserStore;
  useMitzvotStore: typeof import('@/stores/useMitzvotStore').useMitzvotStore;
};

const JERUSALEM = CITIES[0];
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
const LINE = 'אֶחָד שְׁנַיִם שְׁלֹשָׁה אַרְבַּע';
const TEXT: SiddurText = {
  nusach: 'ashkenaz',
  id: 'shacharit',
  credits: [],
  sections: [{ title: { he: 'פתיחה', en: 'Opening' }, segments: [{ key: 'k-1', he: [[{ t: LINE }]] }] }],
};
const BASE_SIZE = 22;
const NEXT_SIZE = 25;

// React Native hands out its components through getters that require them on every read, so a
// screen has to render inside the isolated registry, or its Pressable would come from the other one.
function atScale(uiScale: number, run: (harness: Harness) => void) {
  const skipCleanup = process.env.RNTL_SKIP_AUTO_CLEANUP;
  process.env.RNTL_SKIP_AUTO_CLEANUP = 'true';
  try {
    jest.isolateModules(() => {
      require('@/theme/scale').__setUiScaleForTests(uiScale);
      const harness: Harness = {
        rntl: require('@testing-library/react-native'),
        renderWithTheme: require('@/testing/render').renderWithTheme,
        Reader: require('../siddur/[id]').default,
        MitzvahScreen: require('../mitzvah/[id]').default,
        MitzvahIcon: require('@/components/MitzvahIcon').MitzvahIcon,
        IconTile: require('@/components/IconTile').IconTile,
        useUserStore: require('@/stores/useUserStore').useUserStore,
        useMitzvotStore: require('@/stores/useMitzvotStore').useMitzvotStore,
      };
      jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-28T07:00'), doNotFake: [...ONLY_DATE] });
      harness.useUserStore.getState().reset();
      harness.useUserStore.setState({
        language: 'he',
        location: JERUSALEM,
        inIsrael: true,
        nusach: 'ashkenaz',
        isOnboarded: true,
      });
      harness.useMitzvotStore.getState().reset();
      for (const key of Object.keys(mockParams)) delete mockParams[key];
      try {
        run(harness);
      } finally {
        harness.rntl.cleanup();
        jest.useRealTimers();
      }
    });
  } finally {
    if (skipCleanup === undefined) delete process.env.RNTL_SKIP_AUTO_CLEANUP;
    else process.env.RNTL_SKIP_AUTO_CLEANUP = skipCleanup;
  }
}

function drawnLine(h: Harness) {
  let node: { props: { style?: unknown }; parent: unknown } | null = h.rntl.screen.getByText(LINE);
  while (node) {
    const style = StyleSheet.flatten(node.props.style as never) as
      { fontSize?: number; lineHeight?: number } | undefined;
    if (style?.fontSize !== undefined) return { fontSize: style.fontSize, lineHeight: style.lineHeight };
    node = node.parent as typeof node;
  }
  throw new Error('no sized text around the line');
}

describe.each([0.8, 1.2])('the screens at display size %s', (uiScale) => {
  beforeEach(() => {
    mockLoadedText = TEXT;
  });

  it("draws the reader's text at the scaled size, with its line height derived from it", () => {
    atScale(uiScale, (h) => {
      Object.assign(mockParams, { id: 'shacharit', date: '2026-10-28' });
      h.renderWithTheme(<h.Reader />);

      const size = scaledBy(BASE_SIZE, uiScale);
      expect(size).not.toBe(BASE_SIZE);
      expect(drawnLine(h)).toEqual({ fontSize: size, lineHeight: siddurLineHeight(size) });
      expect(h.useUserStore.getState().siddurFontSize).toBe(BASE_SIZE);
    });
  });

  it('keeps the stored size on its own steps: A+ moves to the next step and the text draws it scaled', () => {
    atScale(uiScale, (h) => {
      Object.assign(mockParams, { id: 'shacharit', date: '2026-10-28' });
      h.renderWithTheme(<h.Reader />);

      h.rntl.fireEvent.press(h.rntl.screen.getByRole('button', { name: 'הגדל טקסט' }));

      const size = scaledBy(NEXT_SIZE, uiScale);
      expect(h.useUserStore.getState().siddurFontSize).toBe(NEXT_SIZE);
      expect(drawnLine(h)).toEqual({ fontSize: size, lineHeight: siddurLineHeight(size) });
    });
  });

  it("draws a mitzvah screen's reminder icons and header tile at the scaled size", () => {
    atScale(uiScale, (h) => {
      Object.assign(mockParams, { id: 'shacharit' });
      h.renderWithTheme(<h.MitzvahScreen />);

      const icons = h.rntl.screen.UNSAFE_getAllByType(h.MitzvahIcon);
      const close = icons.filter((icon) => icon.props.name === 'close');
      expect(close.length).toBeGreaterThan(0);
      for (const icon of close) expect(icon.props.size).toBe(scaledBy(16, uiScale));
      expect(icons.filter((icon) => icon.props.name === 'plus').map((icon) => icon.props.size)).toContain(
        scaledBy(18, uiScale),
      );
      expect(h.rntl.screen.UNSAFE_getAllByType(h.IconTile).map((tile) => tile.props.size)).toContain(
        scaledBy(46, uiScale),
      );
    });
  });
});
