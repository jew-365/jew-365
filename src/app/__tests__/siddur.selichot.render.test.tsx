const mockPush = jest.fn();
const mockNavigation = {
  isFocused: () => true,
  getState: () => ({ index: 0, routes: [{ key: 'siddur' }] }),
  addListener: () => () => {},
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => mockNavigation,
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('@/services/SelichotContentService', () => ({
  ...jest.requireActual('@/services/SelichotContentService'),
  prepareSelichotDownload: jest.fn(),
  installSelichot: jest.fn(async () => true),
}));

import { act, cleanup, fireEvent, screen, within } from '@testing-library/react-native';
import SiddurScreen from '../(tabs)/siddur';
import { CITIES } from '@/data/cities';
import { installSelichot, prepareSelichotDownload } from '@/services/SelichotContentService';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
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

const SELICHOT = 'סליחות';
const CAPTION = 'להורדה בנוסח אשכנז · כ־1 MB';
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

const nowCardHasSelichot = () => within(screen.getByTestId('siddur-now')).queryByText(SELICHOT) !== null;

function open() {
  jest.useFakeTimers({ now: at(JERUSALEM, '2027-09-27T01:30'), doNotFake: [...ONLY_DATE] });
  const view = renderWithTheme(<SiddurScreen />);
  fireEvent.press(screen.getByText('מועדים ושמחות'));
  return view;
}

describe('the siddur tab’s Selichot row', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUserStore.getState().reset();
    useUserStore.setState({
      language: 'he',
      location: JERUSALEM,
      inIsrael: true,
      isOnboarded: true,
      locationStatus: 'ready',
      locationSource: 'manual',
      nusach: 'ashkenaz',
    });
    useCompletionsStore.setState({ completions: {}, skipped: {} });
    useSelichotStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    useSelichotStore.getState().reset();
  });

  it('offers the download of the nusach while it is missing, keeps the text out of the now card, and installs on confirm', async () => {
    prepare.mockResolvedValue(MANIFEST);
    open();
    expect(screen.getByText(CAPTION)).toBeOnTheScreen();
    expect(nowCardHasSelichot()).toBe(false);
    await act(async () => {
      fireEvent.press(screen.getByText(CAPTION));
    });
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(screen.getByText(DIALOG_TITLE)).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getAllByText('הורדה').at(-1)!);
    });
    expect(install).toHaveBeenCalledWith(MANIFEST, 'ashkenaz');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows the text itself, with no download caption, once the nusach is installed', () => {
    installSelichotFixture(['ashkenaz']);
    open();
    expect(screen.queryByText(CAPTION)).toBeNull();
    expect(nowCardHasSelichot()).toBe(true);
  });

  it('offers the download again when only another nusach is installed', () => {
    installSelichotFixture(['sefard']);
    open();
    expect(screen.getByText(CAPTION)).toBeOnTheScreen();
    expect(nowCardHasSelichot()).toBe(false);
  });

  it('shows the progress, and opens the mitzvah screen instead of starting a second download', () => {
    useSelichotStore.setState({ download: { status: 'downloading', done: 0, total: 1, bytes: 1, totalBytes: 2 } });
    open();
    expect(screen.queryByText(CAPTION)).toBeNull();
    fireEvent.press(screen.getByText('בהורדה…'));
    expect(mockPush).toHaveBeenCalledWith('/mitzvah/selichot');
    expect(prepare).not.toHaveBeenCalled();
  });

  it('drops the download caption the moment the install lands', () => {
    open();
    expect(screen.getByText(CAPTION)).toBeOnTheScreen();
    act(() => {
      installSelichotFixture(['ashkenaz']);
    });
    expect(screen.queryByText(CAPTION)).toBeNull();
  });
});
