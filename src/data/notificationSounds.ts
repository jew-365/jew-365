// The app's own notification sounds (the owner's call, 2026-11-12): four original sounds, the bells
// by default. Each file lives in assets/sounds and is copied into the native build by the
// expo-notifications plugin in app.json, so a new sound reaches users only with a build.
export const NOTIFICATION_SOUNDS = ['bells', 'call', 'harp', 'drop'] as const;
export type NotificationSound = (typeof NOTIFICATION_SOUNDS)[number];
export const DEFAULT_NOTIFICATION_SOUND: NotificationSound = 'bells';

export function isNotificationSound(value: unknown): value is NotificationSound {
  return NOTIFICATION_SOUNDS.includes(value as NotificationSound);
}

// The file name the OS plays: the iOS bundle file and, without its extension, the Android raw resource.
export function notificationSoundFile(sound: NotificationSound): string {
  return `jew365_${sound}.wav`;
}
