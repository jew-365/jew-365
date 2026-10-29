import { act, screen, userEvent } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { PermissionsList } from '../PermissionsList';
import { renderWithTheme } from '@/testing/render';
import { translate } from '@/i18n';
import { useUserStore } from '@/stores/useUserStore';
import * as deviceSettings from '@/services/deviceSettings';
import * as scheduler from '@/services/NotificationScheduler';
import { LocationService } from '@/services/LocationService';

jest.mock('@/services/deviceSettings', () => ({
  hasPowerSettingsModule: jest.fn(),
  openAppSettings: jest.fn(),
  supportsBatteryOptimizationSettings: jest.fn(),
  isIgnoringBatteryOptimizations: jest.fn(),
  requestIgnoreBatteryOptimizations: jest.fn(),
  isSamsungDevice: jest.fn(),
  openSamsungNeverSleeping: jest.fn(),
  supportsUnusedAppRestrictions: jest.fn(),
  unusedAppRestrictionsStatus: jest.fn(),
  openUnusedAppRestrictions: jest.fn(),
  supportsBackgroundRefreshStatus: jest.fn(),
  backgroundRefreshStatus: jest.fn(),
}));
jest.mock('@/services/NotificationScheduler', () => ({
  syncNotificationPermissionStatus: jest.fn(),
  notificationPermissionState: jest.fn(),
  requestNotificationPermissions: jest.fn(),
  NotificationScheduler: { rebuild: jest.fn() },
}));
jest.mock('@/services/LocationService', () => ({
  LocationService: { getPermissionStatus: jest.fn(), requestPermission: jest.fn() },
}));

const ds = deviceSettings as jest.Mocked<typeof deviceSettings>;
const sched = scheduler as jest.Mocked<typeof scheduler>;
const location = LocationService as jest.Mocked<typeof LocationService>;

const he = (key: string) => translate(key, undefined, 'he', null);
const label = (kind: string, key: string) => `${he(`permissions.${kind}.title`)}: ${he(key)}`;
const flush = () => act(async () => {});

describe('PermissionsList', () => {
  let listeners: ((state: string) => void)[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    useUserStore.getState().reset();
    listeners = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener as (state: string) => void);
      return { remove: jest.fn() } as never;
    });
    ds.openAppSettings.mockResolvedValue(undefined);
    ds.supportsBatteryOptimizationSettings.mockReturnValue(false);
    ds.isIgnoringBatteryOptimizations.mockResolvedValue(true);
    ds.requestIgnoreBatteryOptimizations.mockResolvedValue(true);
    ds.isSamsungDevice.mockReturnValue(false);
    ds.openSamsungNeverSleeping.mockResolvedValue(true);
    ds.hasPowerSettingsModule.mockReturnValue(true);
    ds.supportsUnusedAppRestrictions.mockReturnValue(false);
    ds.unusedAppRestrictionsStatus.mockResolvedValue('disabled');
    ds.openUnusedAppRestrictions.mockResolvedValue(true);
    ds.supportsBackgroundRefreshStatus.mockReturnValue(false);
    ds.backgroundRefreshStatus.mockResolvedValue('available');
    sched.syncNotificationPermissionStatus.mockResolvedValue(true);
    sched.requestNotificationPermissions.mockResolvedValue(true);
    sched.notificationPermissionState.mockResolvedValue('missing');
    sched.NotificationScheduler.rebuild = jest.fn().mockResolvedValue(undefined);
    location.getPermissionStatus.mockResolvedValue('ready');
    location.requestPermission.mockResolvedValue('ready');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function renderList() {
    const view = renderWithTheme(<PermissionsList />);
    await flush();
    return view;
  }

  it('shows only notifications and location by default, both active', async () => {
    await renderList();
    expect(screen.getByLabelText(label('notifications', 'permissions.active'))).toBeTruthy();
    expect(screen.getByLabelText(label('location', 'permissions.active'))).toBeTruthy();
    for (const kind of ['battery', 'samsungSleep', 'unusedApp', 'backgroundRefresh']) {
      expect(screen.queryByText(he(`permissions.${kind}.title`))).toBeNull();
    }
  });

  it('shows the iOS background refresh row and opens settings when restricted', async () => {
    ds.supportsBackgroundRefreshStatus.mockReturnValue(true);
    ds.backgroundRefreshStatus.mockResolvedValue('restricted');
    await renderList();
    const button = screen.getByLabelText(label('backgroundRefresh', 'permissions.openSettings'));
    await userEvent.setup().press(button);
    expect(ds.openAppSettings).toHaveBeenCalledTimes(1);
  });

  it('shows the background refresh pill when available', async () => {
    ds.supportsBackgroundRefreshStatus.mockReturnValue(true);
    await renderList();
    expect(screen.getByLabelText(label('backgroundRefresh', 'permissions.active'))).toBeTruthy();
  });

  it('turns a refused notification request into a blocked row that opens settings', async () => {
    sched.syncNotificationPermissionStatus.mockResolvedValue(false);
    sched.requestNotificationPermissions.mockResolvedValue(false);
    await renderList();
    expect(screen.getByText(he('permissions.notifications.why'))).toBeTruthy();
    const user = userEvent.setup();
    await user.press(screen.getByLabelText(label('notifications', 'permissions.allow')));
    expect(sched.requestNotificationPermissions).toHaveBeenCalledTimes(1);
    expect(screen.getByText(he('permissions.notifications.blocked'))).toBeTruthy();
    await user.press(screen.getByLabelText(label('notifications', 'permissions.openSettings')));
    expect(ds.openAppSettings).toHaveBeenCalledTimes(1);
    expect(sched.requestNotificationPermissions).toHaveBeenCalledTimes(1);
  });

  it('rebuilds the schedule after a granted request only once onboarded', async () => {
    sched.syncNotificationPermissionStatus.mockResolvedValue(false);
    useUserStore.setState({ isOnboarded: true });
    await renderList();
    await userEvent.setup().press(screen.getByLabelText(label('notifications', 'permissions.allow')));
    expect(sched.NotificationScheduler.rebuild).toHaveBeenCalledTimes(1);
  });

  it('does not rebuild before onboarding is done', async () => {
    sched.syncNotificationPermissionStatus.mockResolvedValue(false);
    useUserStore.setState({ isOnboarded: false });
    await renderList();
    await userEvent.setup().press(screen.getByLabelText(label('notifications', 'permissions.allow')));
    expect(sched.NotificationScheduler.rebuild).not.toHaveBeenCalled();
  });

  it('requests location when missing and shows the pill after the re-read', async () => {
    location.getPermissionStatus.mockResolvedValueOnce('missing');
    await renderList();
    await userEvent.setup().press(screen.getByLabelText(label('location', 'permissions.allow')));
    expect(location.requestPermission).toHaveBeenCalled();
    expect(screen.getByLabelText(label('location', 'permissions.active'))).toBeTruthy();
  });

  it('opens settings for a blocked location', async () => {
    location.getPermissionStatus.mockResolvedValue('denied');
    await renderList();
    expect(screen.getByText(he('permissions.location.blocked'))).toBeTruthy();
    await userEvent.setup().press(screen.getByLabelText(label('location', 'permissions.openSettings')));
    expect(ds.openAppSettings).toHaveBeenCalledTimes(1);
  });

  it('survives a rejected location read', async () => {
    location.getPermissionStatus.mockRejectedValue(new Error('boom'));
    await renderList();
    expect(screen.getByLabelText(label('location', 'permissions.allow'))).toBeTruthy();
    expect(screen.queryByLabelText(label('location', 'permissions.active'))).toBeNull();
  });

  it('asks for the battery exemption', async () => {
    ds.supportsBatteryOptimizationSettings.mockReturnValue(true);
    ds.isIgnoringBatteryOptimizations.mockResolvedValue(false);
    await renderList();
    await userEvent.setup().press(screen.getByLabelText(label('battery', 'permissions.allow')));
    expect(ds.requestIgnoreBatteryOptimizations).toHaveBeenCalledTimes(1);
  });

  it('keeps the battery button when the answer is unknown', async () => {
    ds.supportsBatteryOptimizationSettings.mockReturnValue(true);
    ds.isIgnoringBatteryOptimizations.mockResolvedValue(null);
    await renderList();
    expect(screen.getByLabelText(label('battery', 'permissions.allow'))).toBeTruthy();
    expect(screen.queryByLabelText(label('battery', 'permissions.active'))).toBeNull();
  });

  it('opens the Samsung list from its row', async () => {
    ds.isSamsungDevice.mockReturnValue(true);
    await renderList();
    expect(screen.queryByLabelText(label('samsungSleep', 'permissions.active'))).toBeNull();
    await userEvent.setup().press(screen.getByLabelText(label('samsungSleep', 'permissions.open')));
    expect(ds.openSamsungNeverSleeping).toHaveBeenCalledTimes(1);
  });

  it('hides the Samsung row when the native module is missing', async () => {
    ds.isSamsungDevice.mockReturnValue(true);
    ds.hasPowerSettingsModule.mockReturnValue(false);
    await renderList();
    expect(screen.queryByText(he('permissions.samsungSleep.title'))).toBeNull();
  });

  it('handles the unused-app pause by its status', async () => {
    ds.supportsUnusedAppRestrictions.mockReturnValue(true);
    ds.unusedAppRestrictionsStatus.mockResolvedValue('enabled');
    const view = await renderList();
    await userEvent.setup().press(screen.getByLabelText(label('unusedApp', 'permissions.open')));
    expect(ds.openUnusedAppRestrictions).toHaveBeenCalledTimes(1);
    view.unmount();

    ds.unusedAppRestrictionsStatus.mockResolvedValue('disabled');
    const second = await renderList();
    expect(screen.getByLabelText(label('unusedApp', 'permissions.active'))).toBeTruthy();
    second.unmount();

    ds.unusedAppRestrictionsStatus.mockResolvedValue('unavailable');
    await renderList();
    expect(screen.queryByText(he('permissions.unusedApp.title'))).toBeNull();
  });

  it('hides the unused-app row when the native module is missing', async () => {
    ds.supportsUnusedAppRestrictions.mockReturnValue(true);
    ds.hasPowerSettingsModule.mockReturnValue(false);
    ds.unusedAppRestrictionsStatus.mockResolvedValue(null);
    await renderList();
    expect(screen.queryByText(he('permissions.unusedApp.title'))).toBeNull();
  });

  it('opens settings at once for a notification refusal from an earlier session', async () => {
    sched.syncNotificationPermissionStatus.mockResolvedValue(false);
    sched.notificationPermissionState.mockResolvedValue('blocked');
    await renderList();
    expect(screen.getByText(he('permissions.notifications.blocked'))).toBeTruthy();
    await userEvent.setup().press(screen.getByLabelText(label('notifications', 'permissions.openSettings')));
    expect(ds.openAppSettings).toHaveBeenCalledTimes(1);
    expect(sched.requestNotificationPermissions).not.toHaveBeenCalled();
  });

  it('keeps Allow when the permission can still be asked', async () => {
    sched.syncNotificationPermissionStatus.mockResolvedValue(false);
    sched.notificationPermissionState.mockResolvedValue('missing');
    await renderList();
    expect(screen.getByLabelText(label('notifications', 'permissions.allow'))).toBeTruthy();
  });

  it('re-reads when the app returns to the foreground', async () => {
    ds.supportsBatteryOptimizationSettings.mockReturnValue(true);
    ds.isIgnoringBatteryOptimizations.mockResolvedValue(false);
    await renderList();
    expect(screen.getByLabelText(label('battery', 'permissions.allow'))).toBeTruthy();
    ds.isIgnoringBatteryOptimizations.mockResolvedValue(true);
    await act(async () => {
      listeners.forEach((listener) => listener('active'));
    });
    expect(screen.getByLabelText(label('battery', 'permissions.active'))).toBeTruthy();
  });

  it('does not update state after unmount', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const view = renderWithTheme(<PermissionsList />);
    view.unmount();
    await flush();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
