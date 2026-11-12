// The app's own notification sounds (the owner's calls of 2026-11-12): twelve original sounds, and one
// chosen for each stage of a reminder, the plain one, the orange ⚠️ before the last and the red ❗ last.
// Each file lives in assets/sounds and is copied into the native build by the expo-notifications plugin
// in app.json, so a new sound reaches users only with a build.
export const NOTIFICATION_SOUNDS = [
  'bells',
  'call',
  'harp',
  'drop',
  'chime',
  'glass',
  'kalimba',
  'dew',
  'music_box',
  'flute',
  'bowl',
  'piano',
] as const;
export type NotificationSound = (typeof NOTIFICATION_SOUNDS)[number];

// A notification's sound role: every notice and plain reminder is `regular`; a mitzvah reminder's orange
// point (TimeStage `orange`) is `soon` and its red point (`red`) is `last`.
export const SOUND_ROLES = ['regular', 'soon', 'last'] as const;
export type SoundRole = (typeof SOUND_ROLES)[number];
export type NotificationSoundChoice = Record<SoundRole, NotificationSound>;
export const DEFAULT_NOTIFICATION_SOUNDS: NotificationSoundChoice = {
  regular: 'bells',
  soon: 'kalimba',
  last: 'music_box',
};

// The sounds by the build that first carried them, each group checked on the device through its marker
// (its last file): a binary has a whole group or none of it.
export const SOUND_GROUPS: readonly { marker: NotificationSound; sounds: readonly NotificationSound[] }[] = [
  { marker: 'drop', sounds: ['bells', 'call', 'harp', 'drop'] },
  { marker: 'piano', sounds: ['chime', 'glass', 'kalimba', 'dew', 'music_box', 'flute', 'bowl', 'piano'] },
];

// The sound a role plays on a binary that holds `available`: its choice, else the role's default, else the
// first sound the binary holds; `null` when it holds none (the phone's sound).
export function effectiveSound(
  choice: NotificationSoundChoice,
  role: SoundRole,
  available: ReadonlySet<NotificationSound>,
): NotificationSound | null {
  for (const sound of [choice[role], DEFAULT_NOTIFICATION_SOUNDS[role], ...NOTIFICATION_SOUNDS]) {
    if (available.has(sound)) return sound;
  }
  return null;
}

export function isNotificationSound(value: unknown): value is NotificationSound {
  return NOTIFICATION_SOUNDS.includes(value as NotificationSound);
}

// A saved choice with every role filled: an unknown or missing role takes its default.
export function notificationSoundsOf(saved: unknown): NotificationSoundChoice {
  const value = (saved && typeof saved === 'object' ? saved : {}) as Partial<Record<SoundRole, unknown>>;
  const out = { ...DEFAULT_NOTIFICATION_SOUNDS };
  for (const role of SOUND_ROLES) {
    const sound = value[role];
    if (isNotificationSound(sound)) out[role] = sound;
  }
  return out;
}

// The file name the OS plays: the iOS bundle file and, without its extension, the Android raw resource.
export function notificationSoundFile(sound: NotificationSound): string {
  return `jew365_${sound}.wav`;
}
