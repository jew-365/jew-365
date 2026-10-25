const mockPush = jest.fn();
const mockListeners: { event: string; listener: () => void }[] = [];
const mockNavigation = {
  isFocused: () => true,
  addListener: (event: string, listener: () => void) => {
    const entry = { event, listener };
    mockListeners.push(entry);
    return () => {
      const index = mockListeners.indexOf(entry);
      if (index >= 0) mockListeners.splice(index, 1);
    };
  },
};

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), useNavigation: () => mockNavigation }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));
jest.mock('@/services/NotificationScheduler', () => ({
  NotificationScheduler: {
    cancelForMitzvah: async () => {},
    settleCheckIn: async () => {},
    rebuild: async () => {},
  },
  syncNotificationPermissionStatus: async () => {},
  dismissCompletedPresentedNotifications: async () => {},
  refreshSchedulingOnForeground: async () => {},
}));
jest.mock('@/services/SelichotContentService', () => ({
  ...jest.requireActual('@/services/SelichotContentService'),
  prepareSelichotDownload: jest.fn(),
  installSelichot: jest.fn(async () => true),
}));

import { Platform } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import HomeScreen from '../(tabs)/home';
import { CITIES } from '@/data/cities';
import { installSelichot, prepareSelichotDownload } from '@/services/SelichotContentService';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { IDLE_DOWNLOAD } from '@/stores/addonState';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { installSelichotFixture } from '@/testing/selichot';
import { at } from '@/testing/zmanim';
import type { AddonManifest } from '@/types/addon';

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

const UPCOMING = 'הסליחות מתחילות ב־25 ספטמבר · להוריד את הנוסח?';
const BEGUN = 'ימי הסליחות כבר התחילו · להוריד את הנוסח?';
const DIALOG_TITLE = 'הורדת הסליחות בנוסח אשכנז';

const MANIFEST: AddonManifest = {
  format: 1,
  version: 1,
  gzipBytes: 3,
  gz: {
    ashkenaz: { path: 'ashkenaz.0a0b0c0d.siddur.gz', sha256: '0'.repeat(64), bytes: 1 },
    sefard: { path: 'sefard.0a0b0c0d.siddur.gz', sha256: '0'.repeat(64), bytes: 1 },
    edot_hamizrach: { path: 'edot_hamizrach.0a0b0c0d.siddur.gz', sha256: '0'.repeat(64), bytes: 1 },
    chabad: { path: 'chabad.0a0b0c0d.siddur.gz', sha256: '0'.repeat(64), bytes: 1 },
  },
};

const prepare = jest.mocked(prepareSelichotDownload);
const install = jest.mocked(installSelichot);

function enableOnly(...ids: string[]) {
  useMitzvotStore.setState({ activeMitzvot: Object.fromEntries(ids.map((id) => [id, { enabled: true }])) });
}

function renderAt(wallClock: string) {
  jest.useFakeTimers({ now: at(JERUSALEM, wallClock), doNotFake: [...ONLY_DATE] });
  return renderWithTheme(<HomeScreen />);
}

describe('home’s Selichot offer', () => {
  beforeEach(() => {
    mockPush.mockClear();
    prepare.mockReset();
    install.mockClear();
    prepare.mockResolvedValue(MANIFEST);
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      nusach: 'ashkenaz',
      isOnboarded: true,
      locationStatus: 'ready',
      locationSource: 'manual',
      notificationsEnabled: true,
      notificationPermission: 'granted',
      gender: 'male',
      maritalStatus: 'single',
    });
    useCompletionsStore.getState().reset();
    useCompletionsStore.setState({ checkIns: { '2027-08-28': 1, '2027-09-18': 1 } });
    useCustomMitzvotStore.getState().reset();
    useSelichotStore.getState().reset();
    enableOnly('maariv');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows nothing before the week that precedes the season', () => {
    renderAt('2027-09-17T12:00');
    expect(screen.queryByText(/הסליחות מתחילות/)).toBeNull();
  });

  it('names the first night from a week before the season', () => {
    renderAt('2027-09-18T21:00');
    expect(screen.getByText(UPCOMING)).toBeOnTheScreen();
  });

  it('names the date in English', () => {
    useUserStore.setState({ language: 'en' });
    renderAt('2027-09-19T12:00');
    expect(screen.getByText('Selichot begin on September 25 · Download your nusach?')).toBeOnTheScreen();
  });

  it('asks to confirm the download from the banner, and installs the nusach on confirm', async () => {
    renderAt('2027-09-18T21:00');
    await act(async () => {
      fireEvent.press(screen.getByText(UPCOMING));
    });
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(screen.getByText(DIALOG_TITLE)).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getAllByText('הורדה').at(-1)!);
    });
    expect(install).toHaveBeenCalledWith(MANIFEST, 'ashkenaz');
  });

  it('says the download failed when the manifest could not be fetched, and tries again on a tap', async () => {
    prepare.mockImplementationOnce(async () => {
      useSelichotStore.getState().setDownload({ status: 'failed', reason: 'offline' });
      return null;
    });
    renderAt('2027-09-18T21:00');
    await act(async () => {
      fireEvent.press(screen.getByText(UPCOMING));
    });
    expect(screen.queryByText(DIALOG_TITLE)).toBeNull();
    expect(screen.queryByText(UPCOMING)).toBeNull();
    prepare.mockImplementationOnce(async () => {
      useSelichotStore.getState().setDownload(IDLE_DOWNLOAD);
      return MANIFEST;
    });
    await act(async () => {
      fireEvent.press(screen.getByText('הורדת הסליחות נכשלה · הקישו לניסיון נוסף'));
    });
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(screen.getByText(DIALOG_TITLE)).toBeOnTheScreen();
    expect(screen.getByText(UPCOMING)).toBeOnTheScreen();
  });

  it('shows a running download and opens the mitzvah screen on a tap instead of starting another', () => {
    useSelichotStore.setState({
      download: { status: 'downloading', done: 0, total: 1, bytes: 0, totalBytes: 631_793 },
    });
    renderAt('2027-09-18T21:00');
    fireEvent.press(screen.getByText('הסליחות בנוסח אשכנז בהורדה…'));
    expect(mockPush).toHaveBeenCalledWith('/mitzvah/selichot');
    expect(prepare).not.toHaveBeenCalled();
  });

  it('names the failure and the download in English', () => {
    useUserStore.setState({ language: 'en' });
    useSelichotStore.setState({ download: { status: 'failed', reason: 'unavailable' } });
    const view = renderAt('2027-09-19T12:00');
    expect(screen.getByText('The Selichot download failed · tap to try again')).toBeOnTheScreen();
    view.unmount();
    jest.useRealTimers();
    useSelichotStore.setState({
      download: { status: 'downloading', done: 0, total: 1, bytes: 0, totalBytes: 631_793 },
    });
    renderAt('2027-09-19T12:00');
    expect(screen.getByText('Downloading the Ashkenaz Selichot…')).toBeOnTheScreen();
  });

  it('dismisses the offer for the season on "not now", and keeps it away on a later render that day', async () => {
    const view = renderAt('2027-09-18T21:00');
    await act(async () => {
      fireEvent.press(screen.getByText(UPCOMING));
    });
    expect(screen.getByText(DIALOG_TITLE)).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByText('לא עכשיו'));
    });
    expect(useSelichotStore.getState().dismissedSeason).toBe(5788);
    expect(screen.queryByText(UPCOMING)).toBeNull();
    expect(install).not.toHaveBeenCalled();
    view.unmount();
    jest.useRealTimers();
    renderAt('2027-09-18T21:00');
    expect(screen.queryByText(UPCOMING)).toBeNull();
  });

  it('shows nothing once the nusach is installed, and again when only another nusach is', () => {
    installSelichotFixture(['ashkenaz']);
    const view = renderAt('2027-09-18T21:00');
    expect(screen.queryByText(UPCOMING)).toBeNull();
    view.unmount();
    jest.useRealTimers();
    installSelichotFixture(['sefard']);
    renderAt('2027-09-18T21:00');
    expect(screen.getByText(UPCOMING)).toBeOnTheScreen();
  });

  it('keeps asking through the season, with its own wording once it has begun', () => {
    renderAt('2027-09-28T12:00');
    expect(screen.getByText(BEGUN)).toBeOnTheScreen();
  });

  it('still asks in the last days of the season', () => {
    renderAt('2027-10-07T12:00');
    expect(screen.getByText(BEGUN)).toBeOnTheScreen();
  });

  it('stops asking once the season is over', () => {
    renderAt('2027-10-10T12:00');
    expect(screen.queryByText(BEGUN)).toBeNull();
    expect(screen.queryByText(/הסליחות מתחילות/)).toBeNull();
  });

  it('follows each nusach’s own first day', () => {
    useUserStore.setState({ nusach: 'edot_hamizrach' });
    const view = renderAt('2027-08-27T12:00');
    expect(screen.queryByText(/הסליחות מתחילות/)).toBeNull();
    view.unmount();
    jest.useRealTimers();
    renderAt('2027-08-28T21:00');
    expect(screen.getByText('הסליחות מתחילות ב־4 ספטמבר · להוריד את הנוסח?')).toBeOnTheScreen();
  });

  it('leaves the notifications banner in front of it', () => {
    useUserStore.setState({ notificationPermission: 'denied' });
    renderAt('2027-09-18T21:00');
    expect(screen.getByText(/התראות/)).toBeOnTheScreen();
    expect(screen.queryByText(UPCOMING)).toBeNull();
  });

  it('shows nothing on the web, where nothing can be downloaded', () => {
    const replaced = jest.replaceProperty(Platform, 'OS', 'web');
    renderAt('2027-09-18T21:00');
    expect(screen.queryByText(UPCOMING)).toBeNull();
    replaced.restore();
  });
});
