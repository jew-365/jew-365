const mockReplace = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
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
jest.mock('@/services/AppResetService', () => ({ AppResetService: { reset: jest.fn(async () => {}) } }));
jest.mock('@/services/BackupService', () => ({
  ...(jest.requireActual('@/services/BackupService') as object),
  exportBackup: jest.fn(async () => {}),
  pickBackup: jest.fn(),
  restoreBackup: jest.fn(),
}));

import * as fs from 'fs';
import * as path from 'path';
import { Linking, Platform } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import SettingsScreen from '../(tabs)/settings';
import { AppResetService } from '@/services/AppResetService';
import { appVersionLabel } from '@/services/appUpdates';
import { BackupError, exportBackup, pickBackup, restoreBackup, type Backup } from '@/services/BackupService';
import { Button } from '@/components/Button';
import { translate } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';

const he = (key: string, options?: Record<string, unknown>) => translate(key, options, 'he', null);
const en = (key: string) => translate(key, undefined, 'en', null);
const mockReset = jest.mocked(AppResetService.reset);
const mockExport = jest.mocked(exportBackup);
const mockPick = jest.mocked(pickBackup);
const mockRestore = jest.mocked(restoreBackup);

const BACKUP: Backup = {
  app: 'jew-365',
  format: 1,
  createdAt: new Date(2026, 9, 14, 12).toISOString(),
  stores: { 'user-store': '{"state":{},"version":1}' },
};

async function openBackupSection() {
  renderWithTheme(<SettingsScreen />);
  await act(async () => {});
  fireEvent.press(screen.getByText(he('settings.backup')));
}

const press = async (label: string) => {
  await act(async () => {
    fireEvent.press(screen.getByText(label));
  });
};

describe('Settings backup', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ isOnboarded: true, profileName: 'old name' });
    jest.clearAllMocks();
  });

  it('explains where the backup lives and offers both actions', async () => {
    await openBackupSection();

    expect(screen.getByText(he('settings.backup'))).toBeOnTheScreen();
    expect(screen.getByText(he('settings.backupHint.ios'))).toBeOnTheScreen();
    expect(screen.getByText(he('settings.backupExport'))).toBeOnTheScreen();
    expect(screen.getByText(he('settings.backupImport'))).toBeOnTheScreen();
    expect(screen.queryByText(he('settings.backupTaharah'))).toBeNull();
  });

  it('is a section of its own, closed until opened and apart from the device section', async () => {
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    expect(screen.queryByText(he('settings.backupExport'))).toBeNull();

    fireEvent.press(screen.getByText(he('settings.device')));
    expect(screen.queryByText(he('settings.backupExport'))).toBeNull();

    fireEvent.press(screen.getByText(he('settings.backup')));
    expect(screen.getByText(he('settings.backupExport'))).toBeOnTheScreen();
  });

  it('says that taharah data stays on the phone while tracking is on', async () => {
    useUserStore.setState({ gender: 'female', maritalStatus: 'married', taharahEnabled: true });
    await openBackupSection();

    expect(screen.getByText(he('settings.backupTaharah'))).toBeOnTheScreen();
  });

  it('exports through the share sheet', async () => {
    await openBackupSection();
    await press(he('settings.backupExport'));

    expect(mockExport).toHaveBeenCalledTimes(1);
  });

  it('asks before restoring, names the backup date, and restores on confirm', async () => {
    mockPick.mockResolvedValue(BACKUP);
    mockRestore.mockImplementation(async () => {
      useUserStore.setState({ profileName: 'restored name' });
    });
    await openBackupSection();
    await press(he('settings.backupImport'));

    expect(screen.getByText(he('settings.backupConfirmTitle'))).toBeOnTheScreen();
    expect(screen.getByText(he('settings.backupConfirmBody', { date: '14 אוקטובר 2026' }))).toBeOnTheScreen();
    expect(mockRestore).not.toHaveBeenCalled();

    await press(he('settings.backupConfirmAction'));

    expect(mockRestore).toHaveBeenCalledWith(BACKUP);
    expect(screen.getByText(he('settings.backupRestored'))).toBeOnTheScreen();
    expect(screen.queryByText(he('settings.backupConfirmTitle'))).toBeNull();
  });

  it('never writes the stale name draft over the restored profile', async () => {
    mockPick.mockResolvedValue(BACKUP);
    mockRestore.mockImplementation(async () => {
      useUserStore.setState({ profileName: 'restored name' });
    });
    await openBackupSection();
    await press(he('settings.backupImport'));
    await press(he('settings.backupConfirmAction'));

    fireEvent.press(screen.getByText(he('settings.profile')));
    fireEvent.press(screen.getByText(he('settings.profile')));

    expect(useUserStore.getState().profileName).toBe('restored name');
  });

  it('restores nothing when the dialog is cancelled or the picker closed', async () => {
    mockPick.mockResolvedValueOnce(BACKUP).mockResolvedValueOnce(null);
    await openBackupSection();
    await press(he('settings.backupImport'));
    await press(he('common.cancel'));
    await press(he('settings.backupImport'));

    expect(screen.queryByText(he('settings.backupConfirmTitle'))).toBeNull();
    expect(mockRestore).not.toHaveBeenCalled();
  });

  it('explains a file that is not a backup', async () => {
    mockPick.mockRejectedValue(new BackupError('invalid'));
    await openBackupSection();
    await press(he('settings.backupImport'));

    expect(screen.getByText(he('settings.backupInvalid'))).toBeOnTheScreen();
  });

  it('explains a backup from a newer version', async () => {
    mockPick.mockRejectedValue(new BackupError('newer'));
    await openBackupSection();
    await press(he('settings.backupImport'));

    expect(screen.getByText(he('settings.backupNewer'))).toBeOnTheScreen();
  });

  it('reports a failed restore and closes the dialog', async () => {
    mockPick.mockResolvedValue(BACKUP);
    mockRestore.mockRejectedValue(new Error('disk full'));
    await openBackupSection();
    await press(he('settings.backupImport'));
    await press(he('settings.backupConfirmAction'));

    expect(screen.getByText(he('settings.backupFailed'))).toBeOnTheScreen();
    expect(screen.queryByText(he('settings.backupConfirmTitle'))).toBeNull();
  });

  it('is titled backup, restore and reset', async () => {
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});

    expect(screen.getByText('גיבוי, שחזור ואיפוס')).toBeOnTheScreen();
    expect(screen.getByText(he('settings.backupSummary'))).toBeOnTheScreen();
    expect(en('settings.backup')).toBe('Backup, restore and reset');
  });

  it('puts the reset below the restore', async () => {
    await openBackupSection();

    expect(screen.UNSAFE_getAllByType(Button).map((button) => button.props.label)).toEqual([
      he('settings.backupExport'),
      he('settings.backupImport'),
      he('settings.logout'),
    ]);
  });

  it('resets the app from this section after confirming', async () => {
    await openBackupSection();
    await press(he('settings.logout'));

    expect(screen.getByText(he('settings.logoutConfirmTitle'))).toBeOnTheScreen();
    expect(mockReset).not.toHaveBeenCalled();

    await press(he('settings.logoutConfirmAction'));

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    expect(screen.queryByText(he('settings.logoutConfirmTitle'))).toBeNull();
  });

  it('keeps everything when the reset is cancelled', async () => {
    await openBackupSection();
    await press(he('settings.logout'));
    await press(he('common.cancel'));

    expect(mockReset).not.toHaveBeenCalled();
    expect(screen.queryByText(he('settings.logoutConfirmTitle'))).toBeNull();
  });

  it.each([
    ['he', 'https://jew-365.github.io/jew-365/privacy/#delete'],
    ['en', 'https://jew-365.github.io/jew-365/privacy/en/#delete'],
  ] as const)('opens the %s privacy policy at its data deletion section', async (language, url) => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    useUserStore.setState({ language });
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    fireEvent.press(screen.getByText(translate('settings.backup', undefined, language, null)));
    fireEvent.press(screen.getByRole('link', { name: translate('settings.deleteData', undefined, language, null) }));

    expect(openURL).toHaveBeenCalledWith(url);
    openURL.mockRestore();
  });

  it('leaves the device section without the reset, its App heading and the version', async () => {
    renderWithTheme(<SettingsScreen />);
    await act(async () => {});
    fireEvent.press(screen.getByText(he('settings.device')));

    const headings = screen
      .getAllByRole('header')
      .map((heading) => heading.props.children)
      .filter((text) => text !== he('settings.title'));
    expect(headings).toEqual([he('settings.zmanim'), he('settings.notifications'), he('settings.display')]);
    expect(screen.queryByRole('button', { name: he('settings.logout') })).toBeNull();
    expect(screen.queryByText(he('settings.version', { version: appVersionLabel() }))).toBeNull();
  });

  it('on web holds only the reset and the delete link', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'web');
    try {
      renderWithTheme(<SettingsScreen />);
      await act(async () => {});

      expect(screen.getByText(he('settings.backupSummaryWeb'))).toBeOnTheScreen();
      expect(screen.queryByText(he('settings.backupSummary'))).toBeNull();

      fireEvent.press(screen.getByText(he('settings.backup')));

      expect(screen.getByRole('button', { name: he('settings.logout') })).toBeOnTheScreen();
      expect(screen.getByRole('link', { name: he('settings.deleteData') })).toBeOnTheScreen();
      for (const key of [
        'settings.backupHint.ios',
        'settings.backupHint.android',
        'settings.backupExport',
        'settings.backupImport',
      ]) {
        expect(screen.queryByText(he(key))).toBeNull();
      }
    } finally {
      restore.restore();
    }
  });
});

describe('Settings paths in the public pages', () => {
  const page = (file: string) => fs.readFileSync(path.join(__dirname, '..', '..', '..', 'docs', file), 'utf8');

  it('names the reset and the export by their Settings labels', () => {
    const resetPath = `הגדרות ← ${he('settings.backup')} ← ${he('settings.logout')}`;
    const faq = page('index.html');
    const policy = page('privacy/index.html');
    const policyEn = page('privacy/en/index.html');

    expect(faq).toContain(resetPath);
    expect(faq).toContain(`הגדרות ← ${he('settings.backup')} ← ${he('settings.backupExport')}`);
    expect(policy).toContain(resetPath);
    expect(policy).toContain(`בהגדרות ← ${he('settings.backup')} `);
    expect(policyEn).toContain(`Settings → ${en('settings.backup')} → ${en('settings.logout')}`);
    expect(policyEn).toContain(`under Settings → ${en('settings.backup')} `);

    for (const hebrew of [faq, policy]) {
      expect(hebrew).not.toContain('מכשיר והתראות ← אפליקציה');
      expect(hebrew).not.toContain('← גיבוי ושחזור');
    }
    expect(policyEn).not.toContain('Device and notifications → App');
    expect(policyEn).not.toContain('→ Backup and restore');
  });

  it('keeps the #delete heading the app opens', () => {
    expect(page('privacy/index.html')).toContain('<h2 id="delete">');
    expect(page('privacy/en/index.html')).toContain('<h2 id="delete">');
  });
});
