import { Platform } from 'react-native';
import { holdScreenOnReturn } from '../externalFlow';
import * as Notifications from 'expo-notifications';
import { File, Paths } from 'expo-file-system';
import { t } from '@/i18n';
import { useUserStore } from '@/stores/useUserStore';
import {
  NOTIFICATION_SOUNDS,
  SOUND_GROUPS,
  SOUND_ROLES,
  effectiveSound,
  notificationSoundFile,
  type NotificationSound,
  type SoundRole,
} from '@/data/notificationSounds';
import type { TimeStage } from '@/utils/timeLeft';
import {
  ANDROID_CHANNELS,
  androidSoundChannelId,
  SOUND_PREVIEW_KIND,
  MARK_DONE_ACTION,
  MITZVAH_REMINDER_CATEGORY,
  MITZVAH_TEXT_CATEGORY,
  OPEN_TEXT_ACTION,
  TAHARAH_BEDIKA_CATEGORY,
  pendingNotificationMetaFromContent,
  type NotificationContentLike,
  type PendingNotificationMeta,
} from '@/services/notifications/ids';
import type { ScheduleCandidate } from '@/services/notifications/types';

export type NotificationTaskPayload = Notifications.NotificationTaskPayload;
export type NotificationResponse = Notifications.NotificationResponse;

// A notification as the scheduler reasons about it, scheduled or in the tray.
export type TrayNotification = { identifier: string; data: PendingNotificationMeta; presentedAt?: Date };

type ChannelKey = keyof typeof ANDROID_CHANNELS;
type ChannelSettings = Omit<Notifications.NotificationChannelInput, 'sound'>;

function channelSettings(): Record<ChannelKey, ChannelSettings> {
  return {
    mitzvot: {
      name: t('notifications.channelName'),
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9922A',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    },
    hilulot: {
      name: t('hilulot.title'),
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    },
    roshChodesh: {
      name: t('roshChodesh.title'),
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    },
    taharah: {
      name: t('taharah.home.title'),
      importance: Notifications.AndroidImportance.HIGH,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    },
    system: {
      name: t('notifications.channelSystem'),
      importance: Notifications.AndroidImportance.DEFAULT,
    },
  };
}

const CHANNEL_KEYS = Object.keys(ANDROID_CHANNELS) as ChannelKey[];
// The sounds this binary is known to hold, filled by availableSounds(); null until it has asked.
let soundsInBinary: Set<NotificationSound> | null = null;

async function groupInBinary(marker: NotificationSound): Promise<boolean> {
  if (Platform.OS === 'android') {
    const probeId = `sound-probe-${marker}-${Date.now()}`;
    const probe = await Notifications.setNotificationChannelAsync(probeId, {
      name: 'sound probe',
      importance: Notifications.AndroidImportance.MIN,
      sound: notificationSoundFile(marker),
    });
    await Notifications.deleteNotificationChannelAsync(probeId);
    // Before Android 8 there are no channels and a missing sound falls back to the default per notification.
    return probe == null || probe.sound === 'custom';
  }
  return new File(Paths.bundle, notificationSoundFile(marker)).exists;
}

// The app's sounds this binary carries. They are native resources, so a bundle that reached an older
// build over the air must not use one it lacks: an Android channel created with a missing sound plays
// the phone's default forever, since its sound never changes. Each group of SOUND_GROUPS is asked by its
// marker: Android through a probe channel created with it and read back (`custom` only when the resource
// resolved), its id new each time because a re-created channel id comes back with its old sound; iOS
// looks for the file in the app bundle. A complete answer is kept for the process; a group missing or a
// failed probe is asked again next process.
export async function availableSounds(): Promise<ReadonlySet<NotificationSound>> {
  if (soundsInBinary) return soundsInBinary;
  const found = new Set<NotificationSound>();
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return found;
  let complete = true;
  for (const group of SOUND_GROUPS) {
    try {
      if (await groupInBinary(group.marker)) group.sounds.forEach((sound) => found.add(sound));
      else complete = false;
    } catch {
      complete = false;
    }
  }
  if (complete) soundsInBinary = found;
  return found;
}

export async function customSoundsAvailable(): Promise<boolean> {
  return (await availableSounds()).size > 0;
}

// The sound of each role on this binary, read after ensureChannels() settled what it holds; null roles
// play the phone's sound on the original channels.
let resolved: Record<SoundRole, NotificationSound | null> = { regular: null, soon: null, last: null };

function resolveSounds(available: ReadonlySet<NotificationSound>): void {
  const choice = useUserStore.getState().notificationSounds;
  resolved = {
    regular: effectiveSound(choice, 'regular', available),
    soon: effectiveSound(choice, 'soon', available),
    last: effectiveSound(choice, 'last', available),
  };
}

function roleOf(stage: TimeStage | undefined): SoundRole {
  return stage === 'orange' ? 'soon' : stage === 'red' ? 'last' : 'regular';
}

// A notice and a plain reminder take the regular sound; only a mitzvah reminder's stage picks another.
function soundOf(key: ChannelKey, stage?: TimeStage): NotificationSound | null {
  return resolved[key === 'mitzvot' ? roleOf(stage) : 'regular'];
}

function channelIdOf(key: ChannelKey, stage?: TimeStage): string {
  const sound = soundOf(key, stage);
  return sound ? androidSoundChannelId(key, sound) : ANDROID_CHANNELS[key];
}

function soundOfContent(key: ChannelKey, stage?: TimeStage): string {
  const sound = soundOf(key, stage);
  return sound ? notificationSoundFile(sound) : 'default';
}

// Every channel the current choice needs: each kind on the regular sound, and the mitzvot also on the soon
// and last sounds, named by its sound so the phone's settings tell them apart.
function wantedChannels(): Map<string, { key: ChannelKey; sound: NotificationSound }> {
  const wanted = new Map<string, { key: ChannelKey; sound: NotificationSound }>();
  for (const key of CHANNEL_KEYS) {
    const roles: SoundRole[] = key === 'mitzvot' ? [...SOUND_ROLES] : ['regular'];
    for (const role of roles) {
      const sound = resolved[role];
      if (sound) wanted.set(androidSoundChannelId(key, sound), { key, sound });
    }
  }
  return wanted;
}

export async function ensureChannels(): Promise<void> {
  const available = await availableSounds();
  resolveSounds(available);
  if (Platform.OS !== 'android') return;
  const settings = channelSettings();
  if (!resolved.regular) {
    for (const key of CHANNEL_KEYS) {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS[key], { ...settings[key], sound: 'default' });
    }
    return;
  }
  const wanted = wantedChannels();
  for (const [id, { key, sound }] of wanted) {
    const name = `${settings[key].name} · ${t(`settings.notificationSound.${sound}`)}`;
    await Notifications.setNotificationChannelAsync(id, {
      ...settings[key],
      name,
      sound: notificationSoundFile(sound),
    });
  }
  // The channels of the other sounds and of the binaries before them leave the phone's settings.
  const stale = new Set<string>(Object.values(ANDROID_CHANNELS));
  for (const sound of NOTIFICATION_SOUNDS) {
    for (const key of CHANNEL_KEYS) {
      const id = androidSoundChannelId(key, sound);
      if (!wanted.has(id)) stale.add(id);
    }
  }
  try {
    for (const channel of await Notifications.getNotificationChannelsAsync()) {
      if (stale.has(channel.id)) await Notifications.deleteNotificationChannelAsync(channel.id);
    }
  } catch {
    // A channel left behind only lingers in the phone's settings; nothing is sent to it.
  }
}

export async function ensureCategories(): Promise<void> {
  if (typeof Notifications.setNotificationCategoryAsync !== 'function') return;
  try {
    await ensureChannels();
    const markDone = {
      identifier: MARK_DONE_ACTION,
      buttonTitle: t('notifications.markDone'),
      options: { opensAppToForeground: false },
    };
    await Notifications.setNotificationCategoryAsync(MITZVAH_REMINDER_CATEGORY, [markDone]);
    await Notifications.setNotificationCategoryAsync(MITZVAH_TEXT_CATEGORY, [
      {
        identifier: OPEN_TEXT_ACTION,
        buttonTitle: t('siddur.open'),
        options: { opensAppToForeground: true },
      },
      markDone,
    ]);
    await Notifications.setNotificationCategoryAsync(TAHARAH_BEDIKA_CATEGORY, [
      { ...markDone, buttonTitle: t('taharah.notify.markDone') },
    ]);
  } catch (err) {
    if (__DEV__) {
      console.warn('[notifications] category registration failed', err);
    }
  }
}

// FNV-1a over everything a user can see or a tap reads, so a changed reminder is told from an
// unchanged one without comparing the OS's copy field by field.
export function contentHash(candidate: ScheduleCandidate): string {
  const text = JSON.stringify([
    candidate.title,
    candidate.subtitle ?? null,
    candidate.color ?? null,
    candidate.body,
    candidate.trigger.getTime(),
    candidate.categoryIdentifier ?? null,
    channelIdOf(candidate.channel, candidate.stage),
    soundOfContent(candidate.channel, candidate.stage),
    candidate.data,
  ]);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0;
  }
  return hash.toString(16);
}

function requestFor(candidate: ScheduleCandidate): Notifications.NotificationRequestInput {
  return {
    identifier: candidate.id,
    content: {
      title: candidate.title,
      ...(candidate.subtitle && { subtitle: candidate.subtitle }),
      ...(candidate.color && { color: candidate.color }),
      body: candidate.body,
      data: { ...candidate.data, contentHash: contentHash(candidate) },
      ...(candidate.categoryIdentifier && { categoryIdentifier: candidate.categoryIdentifier }),
      autoDismiss: true,
      sticky: false,
      sound: soundOfContent(candidate.channel, candidate.stage),
    },
    // Android resolves the channel from the trigger. Without it every notification lands on
    // expo's "Miscellaneous" fallback channel and the configured one is dead.
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: candidate.trigger,
      channelId: channelIdOf(candidate.channel, candidate.stage),
    },
  };
}

// One at a time and in the given order; a candidate the OS refuses is skipped, not fatal.
export async function schedule(candidates: ScheduleCandidate[]): Promise<void> {
  for (const candidate of candidates) {
    try {
      await Notifications.scheduleNotificationAsync(requestFor(candidate));
    } catch (err) {
      if (__DEV__) console.warn('[notifications] schedule failed', candidate.id, err);
    }
  }
}

// Makes the pending set equal `candidates` touching only the difference: ids the plan lacks and
// reminders whose content changed are cancelled, and only the new and the changed are scheduled.
// If the pending set cannot be read, everything is replaced.
export async function sync(candidates: ScheduleCandidate[]): Promise<void> {
  let pending: TrayNotification[];
  try {
    pending = await getScheduled();
  } catch {
    await cancelAll();
    await schedule(candidates);
    return;
  }
  const hashes = new Map(pending.map(({ identifier, data }) => [identifier, data.contentHash]));
  const wanted = new Set(candidates.map(({ id }) => id));
  const changed = candidates.filter((candidate) => hashes.get(candidate.id) !== contentHash(candidate));
  const stale = [...hashes.keys()].filter((id) => !wanted.has(id));
  await cancelScheduled([...stale, ...changed.filter(({ id }) => hashes.has(id)).map(({ id }) => id)]);
  await schedule(changed);
}

// Shown at once, on the system channel on Android.
export async function presentNow(notice: {
  identifier: string;
  title: string;
  body: string;
  data: PendingNotificationMeta;
}): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: notice.identifier,
    content: {
      title: notice.title,
      body: notice.body,
      data: notice.data,
      autoDismiss: true,
      sticky: false,
      sound: soundOfContent('system'),
    },
    trigger: Platform.OS === 'android' ? { channelId: channelIdOf('system') } : null,
  });
}

// Plays one role's sound once, as a notification on the mitzvot channel of that sound.
export async function presentSoundPreview(role: SoundRole): Promise<void> {
  await ensureChannels();
  const stage: TimeStage | undefined = role === 'soon' ? 'orange' : role === 'last' ? 'red' : undefined;
  const sound = soundOf('mitzvot', stage);
  await Notifications.scheduleNotificationAsync({
    identifier: SOUND_PREVIEW_KIND,
    content: {
      title: t('settings.notificationSound.previewTitle'),
      body: `${t(`settings.notificationSound.role.${role}`)}: ${sound ? t(`settings.notificationSound.${sound}`) : ''}`,
      data: { kind: SOUND_PREVIEW_KIND },
      autoDismiss: true,
      sticky: false,
      sound: soundOfContent('mitzvot', stage),
    },
    trigger: Platform.OS === 'android' ? { channelId: channelIdOf('mitzvot', stage) } : null,
  });
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

function trayNotification(request: { identifier: string; content: unknown }): TrayNotification {
  return {
    identifier: request.identifier,
    data: pendingNotificationMetaFromContent(request.content as NotificationContentLike),
  };
}

export async function getScheduled(): Promise<TrayNotification[]> {
  return (await Notifications.getAllScheduledNotificationsAsync()).map(trayNotification);
}

export async function cancelScheduled(ids: string[]): Promise<void> {
  for (const id of ids) await Notifications.cancelScheduledNotificationAsync(id);
}

const EPOCH_SECONDS_MAX = 1e11;

function deliveryDate(value: unknown): Date | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  return new Date(value < EPOCH_SECONDS_MAX ? value * 1000 : value);
}

export async function getPresented(): Promise<TrayNotification[]> {
  if (typeof Notifications.getPresentedNotificationsAsync !== 'function') return [];
  try {
    return (await Notifications.getPresentedNotificationsAsync()).map(({ request, date }) => ({
      ...trayNotification(request),
      presentedAt: deliveryDate(date),
    }));
  } catch {
    return [];
  }
}

export async function dismiss(ids: Iterable<string>): Promise<void> {
  if (typeof Notifications.dismissNotificationAsync !== 'function') return;
  await Promise.all([...new Set(ids)].map((id) => Notifications.dismissNotificationAsync(id).catch(() => {})));
}

export async function getPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function getPermissionState(): Promise<'granted' | 'missing' | 'blocked'> {
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  return canAskAgain === false ? 'blocked' : 'missing';
}

export async function requestPermissions(): Promise<boolean> {
  holdScreenOnReturn();
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return status === 'granted';
}

export function setForegroundHandler(
  shouldSuppress: (data: PendingNotificationMeta, identifier: string) => boolean,
): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = pendingNotificationMetaFromContent(notification.request.content as NotificationContentLike);
      const show = !shouldSuppress(data, notification.request.identifier);
      return {
        shouldShowAlert: show,
        shouldShowBanner: show,
        shouldShowList: show,
        shouldPlaySound: show,
        shouldSetBadge: false,
      };
    },
  });
}

export async function registerActionTask(name: string): Promise<void> {
  await Notifications.registerTaskAsync(name);
}

export function isNotificationResponse(data: NotificationTaskPayload): data is NotificationResponse {
  return Boolean(data && typeof data === 'object' && 'actionIdentifier' in data && 'notification' in data);
}
