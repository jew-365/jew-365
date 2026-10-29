import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleProp, ViewStyle } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import type { IconName } from '@/components/MitzvahIcon';
import { CounterPill } from '@/components/ScreenHeader';
import {
  backgroundRefreshStatus,
  hasPowerSettingsModule,
  isIgnoringBatteryOptimizations,
  isSamsungDevice,
  openAppSettings,
  openSamsungNeverSleeping,
  openUnusedAppRestrictions,
  requestIgnoreBatteryOptimizations,
  supportsBackgroundRefreshStatus,
  supportsBatteryOptimizationSettings,
  supportsUnusedAppRestrictions,
  unusedAppRestrictionsStatus,
} from '@/services/deviceSettings';
import { reportError } from '@/services/errors';
import { LocationService } from '@/services/LocationService';
import {
  NotificationScheduler,
  notificationPermissionState,
  requestNotificationPermissions,
  syncNotificationPermissionStatus,
} from '@/services/NotificationScheduler';
import { useUserStore } from '@/stores/useUserStore';
import { useI18n } from '@/i18n';

export type PermissionKind =
  'notifications' | 'location' | 'battery' | 'samsungSleep' | 'unusedApp' | 'backgroundRefresh';
export type PermissionStatus = 'granted' | 'missing' | 'blocked' | 'unknown' | 'absent';

type Statuses = Record<PermissionKind, PermissionStatus>;

const ROWS: { kind: PermissionKind; icon: IconName }[] = [
  { kind: 'notifications', icon: 'bell' },
  { kind: 'location', icon: 'compass' },
  { kind: 'battery', icon: 'sliders' },
  { kind: 'samsungSleep', icon: 'night' },
  { kind: 'unusedApp', icon: 'calendar' },
  { kind: 'backgroundRefresh', icon: 'undo' },
];

function initialStatuses(): Statuses {
  return {
    notifications: 'unknown',
    location: 'unknown',
    battery: supportsBatteryOptimizationSettings() ? 'unknown' : 'absent',
    samsungSleep: isSamsungDevice() && hasPowerSettingsModule() ? 'unknown' : 'absent',
    unusedApp: supportsUnusedAppRestrictions() && hasPowerSettingsModule() ? 'unknown' : 'absent',
    backgroundRefresh: supportsBackgroundRefreshStatus() ? 'unknown' : 'absent',
  };
}

function settle<T>(read: () => Promise<T>): Promise<T | null> {
  return read().catch(() => null);
}

async function readStatuses(notificationsRefused: boolean): Promise<Statuses> {
  const [notifications, notificationState, location, battery, unusedApp, refresh] = await Promise.all([
    settle(syncNotificationPermissionStatus),
    settle(notificationPermissionState),
    settle(() => LocationService.getPermissionStatus()),
    supportsBatteryOptimizationSettings() ? settle(isIgnoringBatteryOptimizations) : Promise.resolve(null),
    supportsUnusedAppRestrictions() ? settle(unusedAppRestrictionsStatus) : Promise.resolve(null),
    supportsBackgroundRefreshStatus() ? settle(backgroundRefreshStatus) : Promise.resolve(null),
  ]);

  const notificationsStatus: PermissionStatus =
    notifications === true
      ? 'granted'
      : notifications === false
        ? notificationsRefused || notificationState === 'blocked'
          ? 'blocked'
          : 'missing'
        : 'unknown';
  const locationStatus: PermissionStatus =
    location === 'ready'
      ? 'granted'
      : location === 'denied'
        ? 'blocked'
        : location === 'missing' || location === 'timeout'
          ? 'missing'
          : 'unknown';
  const batteryStatus: PermissionStatus = !supportsBatteryOptimizationSettings()
    ? 'absent'
    : battery === true
      ? 'granted'
      : battery === false
        ? 'missing'
        : 'unknown';
  const unusedAppStatus: PermissionStatus = !(supportsUnusedAppRestrictions() && hasPowerSettingsModule())
    ? 'absent'
    : unusedApp === 'disabled'
      ? 'granted'
      : unusedApp === 'enabled'
        ? 'missing'
        : unusedApp === 'unavailable'
          ? 'absent'
          : 'unknown';
  const refreshStatus: PermissionStatus = !supportsBackgroundRefreshStatus()
    ? 'absent'
    : refresh === 'available'
      ? 'granted'
      : refresh === 'restricted'
        ? 'blocked'
        : 'unknown';

  return {
    notifications: notificationsStatus,
    location: locationStatus,
    battery: batteryStatus,
    samsungSleep: isSamsungDevice() && hasPowerSettingsModule() ? 'unknown' : 'absent',
    unusedApp: unusedAppStatus,
    backgroundRefresh: refreshStatus,
  };
}

export function PermissionsList({ style }: { style?: StyleProp<ViewStyle> }) {
  const { t } = useI18n();
  const [statuses, setStatuses] = useState<Statuses>(initialStatuses);
  const [busy, setBusy] = useState<PermissionKind | null>(null);
  const refused = useRef(false);
  const readSeq = useRef(0);
  const mounted = useRef(false);

  const refresh = useCallback(async () => {
    const seq = ++readSeq.current;
    const next = await readStatuses(refused.current);
    if (mounted.current && readSeq.current === seq) setStatuses(next);
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      mounted.current = false;
      sub.remove();
    };
  }, [refresh]);

  const run = async (kind: PermissionKind) => {
    if (busy) return;
    setBusy(kind);
    try {
      const status = statuses[kind];
      if (kind === 'notifications') {
        if (status === 'blocked') {
          await openAppSettings();
        } else {
          const granted = await requestNotificationPermissions().catch(() => false);
          if (!granted) {
            refused.current = true;
          } else if (useUserStore.getState().isOnboarded) {
            NotificationScheduler.rebuild().catch((error) => reportError('schedule', error));
          }
        }
      } else if (kind === 'location') {
        if (status === 'blocked') await openAppSettings();
        else await LocationService.requestPermission().catch(() => null);
      } else if (kind === 'battery') {
        await requestIgnoreBatteryOptimizations();
      } else if (kind === 'samsungSleep') {
        await openSamsungNeverSleeping();
      } else if (kind === 'unusedApp') {
        await openUnusedAppRestrictions();
      } else {
        await openAppSettings();
      }
    } finally {
      if (mounted.current) setBusy(null);
    }
    await refresh();
  };

  return (
    <Card divided style={style}>
      {ROWS.filter(({ kind }) => statuses[kind] !== 'absent').map(({ kind, icon }) => {
        const status = statuses[kind];
        const title = t(`permissions.${kind}.title`);
        const caption =
          status === 'blocked' && (kind === 'notifications' || kind === 'location')
            ? t(`permissions.${kind}.blocked`)
            : t(`permissions.${kind}.why`);
        const action =
          status === 'blocked' || kind === 'backgroundRefresh'
            ? t('permissions.openSettings')
            : kind === 'samsungSleep' || kind === 'unusedApp'
              ? t('permissions.open')
              : t('permissions.allow');
        return (
          <ListRow
            key={kind}
            icon={icon}
            title={title}
            caption={caption}
            trailing={
              status === 'granted' ? (
                <CounterPill
                  label={t('permissions.active')}
                  accessibilityLabel={`${title}: ${t('permissions.active')}`}
                />
              ) : (
                <Button
                  size="compact"
                  label={action}
                  accessibilityLabel={`${title}: ${action}`}
                  busy={busy === kind}
                  onPress={() => run(kind)}
                />
              )
            }
          />
        );
      })}
    </Card>
  );
}
