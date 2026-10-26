jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
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

import { act, fireEvent, screen } from '@testing-library/react-native';
import WelcomeScreen from '../onboarding/index';
import { BackupError, pickBackup, restoreBackup, type Backup } from '@/services/BackupService';
import { NotificationScheduler, requestNotificationPermissions } from '@/services/NotificationScheduler';
import { reloadApp } from '@/services/appReload';
import { translate } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';

const he = (key: string) => translate(key, undefined, 'he', null);
const mockPick = jest.mocked(pickBackup);
const mockRestore = jest.mocked(restoreBackup);
const mockRequest = jest.mocked(requestNotificationPermissions);
const mockRebuild = jest.mocked(NotificationScheduler.rebuild);
const mockReload = jest.mocked(reloadApp);

const BACKUP: Backup = {
  app: 'jew-365',
  format: 1,
  createdAt: '2026-10-14T09:30:00.000Z',
  stores: { 'user-store': '{"state":{},"version":1}' },
};

async function pressRestore() {
  renderWithTheme(<WelcomeScreen />);
  await act(async () => {
    fireEvent.press(screen.getByText(he('onboarding.restore')));
  });
}

describe('Onboarding restore from a backup file', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    jest.clearAllMocks();
  });

  it('restores the chosen file, asks for notifications and schedules', async () => {
    mockPick.mockResolvedValue(BACKUP);
    await pressRestore();

    expect(mockRestore).toHaveBeenCalledWith(BACKUP, { reload: false });
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(NotificationScheduler.rebuild).toHaveBeenCalledTimes(1);
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('schedules nothing more when notifications are refused', async () => {
    mockPick.mockResolvedValue(BACKUP);
    mockRequest.mockResolvedValueOnce(false);
    await pressRestore();

    expect(mockRestore).toHaveBeenCalledTimes(1);
    expect(NotificationScheduler.rebuild).not.toHaveBeenCalled();
  });

  it('asks for notifications and schedules before reloading into a restored display size', async () => {
    const order: string[] = [];
    mockPick.mockResolvedValue(BACKUP);
    mockRestore.mockImplementationOnce(async () => {
      order.push('restore');
      useUserStore.getState().setUiScale(1.2);
    });
    mockRequest.mockImplementationOnce(async () => {
      order.push('permission');
      return true;
    });
    mockRebuild.mockImplementationOnce(async () => {
      order.push('rebuild');
    });
    mockReload.mockImplementationOnce(async () => {
      order.push('reload');
    });
    await pressRestore();

    expect(mockRestore).toHaveBeenCalledWith(BACKUP, { reload: false });
    expect(order).toEqual(['restore', 'permission', 'rebuild', 'reload']);
  });

  it('still reloads into a restored display size when notifications are refused', async () => {
    const order: string[] = [];
    mockPick.mockResolvedValue(BACKUP);
    mockRestore.mockImplementationOnce(async () => {
      useUserStore.getState().setUiScale(1.2);
    });
    mockRequest.mockImplementationOnce(async () => {
      order.push('permission');
      return false;
    });
    mockReload.mockImplementationOnce(async () => {
      order.push('reload');
    });
    await pressRestore();

    expect(order).toEqual(['permission', 'reload']);
    expect(mockRebuild).not.toHaveBeenCalled();
  });

  it('stays on the welcome step when the picker is closed', async () => {
    mockPick.mockResolvedValue(null);
    await pressRestore();

    expect(mockRestore).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('explains a file that is not a backup', async () => {
    mockPick.mockRejectedValue(new BackupError('invalid'));
    await pressRestore();

    expect(screen.getByText(he('settings.backupInvalid'))).toBeOnTheScreen();
    expect(mockRestore).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });
});
