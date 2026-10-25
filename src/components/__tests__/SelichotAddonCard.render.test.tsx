jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});
jest.mock('@/services/SelichotContentService', () => ({
  ...jest.requireActual('@/services/SelichotContentService'),
  prepareSelichotDownload: jest.fn(),
  installSelichot: jest.fn(async () => true),
  cancelSelichotDownload: jest.fn(),
  deleteSelichot: jest.fn(),
  checkSelichotUpdate: jest.fn(async () => {}),
  selichotDownloadSupported: jest.fn(() => true),
}));

import { act, cleanup, fireEvent, screen } from '@testing-library/react-native';
import { SelichotAddonCard, selichotAddonCaption } from '../SelichotAddonCard';
import { t } from '@/i18n';
import {
  cancelSelichotDownload,
  checkSelichotUpdate,
  deleteSelichot,
  installSelichot,
  prepareSelichotDownload,
  selichotDownloadSupported,
} from '@/services/SelichotContentService';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { installSelichotFixture } from '@/testing/selichot';
import type { AddonManifest } from '@/types/addon';

const prepare = jest.mocked(prepareSelichotDownload);
const install = jest.mocked(installSelichot);
const supported = jest.mocked(selichotDownloadSupported);

const entry = (nusach: string, bytes: number) => ({
  path: `${nusach}.0a0b0c0d.siddur.gz`,
  sha256: '0'.repeat(64),
  bytes,
});

const MANIFEST: AddonManifest = {
  format: 1,
  version: 1,
  gzipBytes: 1_426_413,
  gz: {
    ashkenaz: entry('ashkenaz', 631_793),
    sefard: entry('sefard', 334_985),
    edot_hamizrach: entry('edot_hamizrach', 45_343),
    chabad: entry('chabad', 414_292),
  },
};

async function press(label: string) {
  await act(async () => {
    fireEvent.press(screen.getByText(label));
  });
}

describe('SelichotAddonCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supported.mockReturnValue(true);
    useSelichotStore.getState().reset();
    useUserStore.getState().reset();
    useUserStore.setState({ nusach: 'ashkenaz' });
  });

  afterEach(() => {
    cleanup();
    useSelichotStore.getState().reset();
  });

  describe('before the download', () => {
    it('describes the add-on for the nusach and its size, with no license notice', () => {
      renderWithTheme(<SelichotAddonCard />);
      expect(screen.getByText('תוסף הסליחות')).toBeOnTheScreen();
      expect(screen.getByText(t('selichot.addon.about', { nusach: 'אשכנז' }))).toBeOnTheScreen();
      expect(screen.getByText('גודל: כ־1 MB')).toBeOnTheScreen();
      expect(screen.getByText('הורדה')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'זכויות יוצרים ורישיון, פתיחה' })).toBeNull();
    });

    it('asks to confirm the size of the nusach alone, and installs that nusach on confirm', async () => {
      prepare.mockResolvedValue(MANIFEST);
      renderWithTheme(<SelichotAddonCard />);
      await press('הורדה');
      expect(prepare).toHaveBeenCalledTimes(1);
      expect(screen.getByText('הורדת הסליחות בנוסח אשכנז')).toBeOnTheScreen();
      expect(screen.getByText('יורדים כ־0.6 MB מאתר יהודי 365 ב־GitHub Pages.')).toBeOnTheScreen();
      expect(screen.queryByText(/1\.4/)).toBeNull();
      await act(async () => {
        fireEvent.press(screen.getAllByText('הורדה').at(-1)!);
      });
      expect(install).toHaveBeenCalledWith(MANIFEST, 'ashkenaz');
    });

    it('shows no dialog when the manifest could not be fetched', async () => {
      prepare.mockResolvedValue(null);
      renderWithTheme(<SelichotAddonCard />);
      await press('הורדה');
      expect(screen.queryByText('הורדת הסליחות בנוסח אשכנז')).toBeNull();
      expect(install).not.toHaveBeenCalled();
    });

    it('offers the user nusach when another nusach is the one installed, with no delete button', () => {
      installSelichotFixture(['ashkenaz']);
      useUserStore.setState({ nusach: 'sefard' });
      renderWithTheme(<SelichotAddonCard />);
      expect(screen.getByText(t('selichot.addon.about', { nusach: 'ספרד' }))).toBeOnTheScreen();
      expect(screen.queryByText('מחיקת הסליחות מהמכשיר')).toBeNull();
      expect(screen.getByText('הורדה')).toBeOnTheScreen();
    });

    it('checks for a newer version once, when it mounts', () => {
      renderWithTheme(<SelichotAddonCard />);
      expect(checkSelichotUpdate).toHaveBeenCalledTimes(1);
    });

    it('says the download is a phone feature on the web, with no button at all', () => {
      supported.mockReturnValue(false);
      renderWithTheme(<SelichotAddonCard />);
      expect(screen.getByText('ההורדה זמינה באפליקציה בטלפון.')).toBeOnTheScreen();
      expect(screen.queryByText('הורדה')).toBeNull();
      expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    it('shows the card in English', () => {
      useUserStore.setState({ language: 'en' });
      renderWithTheme(<SelichotAddonCard />);
      expect(screen.getByText('Selichot add-on')).toBeOnTheScreen();
      expect(screen.getByText('Size: about 1 MB')).toBeOnTheScreen();
    });
  });

  describe('while downloading', () => {
    it('shows the progress and cancels', () => {
      useSelichotStore.setState({
        download: { status: 'downloading', done: 0, total: 1, bytes: 300_000, totalBytes: 631_793 },
      });
      renderWithTheme(<SelichotAddonCard />);
      expect(screen.getByText('בהורדה: 0.3 מתוך 0.6 MB')).toBeOnTheScreen();
      fireEvent.press(screen.getByText('ביטול ההורדה'));
      expect(cancelSelichotDownload).toHaveBeenCalledTimes(1);
    });
  });

  describe('after a failure', () => {
    it('names the space needed, the download and the safety margin together', () => {
      useSelichotStore.setState({ download: { status: 'failed', reason: 'space' } });
      renderWithTheme(<SelichotAddonCard />);
      expect(screen.getByText('אין מספיק מקום פנוי במכשיר. צריך כ־51 MB.')).toBeOnTheScreen();
    });

    it('names the offline failure and tries again', async () => {
      useSelichotStore.setState({ download: { status: 'failed', reason: 'offline' } });
      prepare.mockResolvedValue(null);
      renderWithTheme(<SelichotAddonCard />);
      expect(screen.getByText(t('selichot.addon.error.offline'))).toBeOnTheScreen();
      await press('ניסיון נוסף');
      expect(prepare).toHaveBeenCalledTimes(1);
    });
  });

  describe('once installed', () => {
    it('shows the nusach and the size on the device and deletes after a confirmation', async () => {
      installSelichotFixture(['ashkenaz']);
      renderWithTheme(<SelichotAddonCard />);
      expect(screen.getByText('מותקן בנוסח אשכנז · 0.6 MB במכשיר')).toBeOnTheScreen();
      expect(screen.queryByText('יש גרסה חדשה של הסליחות.')).toBeNull();
      await press('מחיקת הסליחות מהמכשיר');
      expect(deleteSelichot).not.toHaveBeenCalled();
      expect(screen.getByText('למחוק את הסליחות?')).toBeOnTheScreen();
      await press('מחיקה');
      expect(deleteSelichot).toHaveBeenCalledTimes(1);
    });

    it('offers the update when the hosted version is newer, and confirms it first', async () => {
      installSelichotFixture(['ashkenaz']);
      useSelichotStore.setState({ latestVersion: 2 });
      prepare.mockResolvedValue({ ...MANIFEST, version: 2 });
      renderWithTheme(<SelichotAddonCard />);
      expect(screen.getByText('יש גרסה חדשה של הסליחות.')).toBeOnTheScreen();
      await press('עדכון');
      expect(prepare).toHaveBeenCalledTimes(1);
      expect(screen.getByText('עדכון הסליחות בנוסח אשכנז')).toBeOnTheScreen();
      expect(screen.getByText('יורדים כ־0.6 MB מאתר יהודי 365 ב־GitHub Pages.')).toBeOnTheScreen();
    });
  });
});

describe('selichotAddonCaption', () => {
  it('names the progress while downloading and the nusach and size otherwise', () => {
    const download = { status: 'downloading', done: 0, total: 1, bytes: 1, totalBytes: 2 } as const;
    expect(selichotAddonCaption(download, 'אשכנז', t)).toBe('בהורדה…');
    expect(selichotAddonCaption({ status: 'idle' }, 'אשכנז', t)).toBe('להורדה בנוסח אשכנז · כ־1 MB');
    expect(selichotAddonCaption({ status: 'failed', reason: 'offline' }, 'אשכנז', t)).toBe(
      'ההורדה נכשלה · הקישו לניסיון נוסף',
    );
  });
});
