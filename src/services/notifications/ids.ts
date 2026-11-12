import type { ContentBlock } from '@/types/mitzvah';
import type { OnahKind, TaharahTaskKind } from '@/types/taharah';
import { dateKey } from '@/stores/useCompletionsStore';

export const DAILY_REBUILD_TASK = 'jew-365-daily-rebuild';
export const NOTIFICATION_ACTION_TASK = 'jew-365-notification-actions';
export const MITZVAH_REMINDER_CATEGORY = 'mitzvah_reminder';
export const MITZVAH_TEXT_CATEGORY = 'mitzvah_reminder_text';
export const TAHARAH_BEDIKA_CATEGORY = 'taharah_bedika';
export const MARK_DONE_ACTION = 'MARK_DONE';
export const OPEN_TEXT_ACTION = 'OPEN_TEXT';
// The channel ids of a binary without the app's sounds (every build up to 1.0.21 on Android): the
// mitzvot channel keeps the id `default`, so those installs keep the sound the user chose for it.
export const ANDROID_CHANNELS = {
  mitzvot: 'default',
  hilulot: 'hilulot',
  roshChodesh: 'rosh-chodesh',
  taharah: 'taharah',
  system: 'system',
} as const;
// A binary that carries the app's sounds names each channel after its sound (`mitzvot-bells`), because
// Android fixes a channel's sound when the channel is created: a new sound needs a new channel.
export const ANDROID_SOUND_CHANNEL_BASES = {
  mitzvot: 'mitzvot',
  hilulot: 'hilulot',
  roshChodesh: 'rosh-chodesh',
  taharah: 'taharah',
  system: 'system',
} as const;
export function androidSoundChannelId(key: keyof typeof ANDROID_SOUND_CHANNEL_BASES, sound: string): string {
  return `${ANDROID_SOUND_CHANNEL_BASES[key]}-${sound}`;
}
export const PENDING_LIMIT = 400;
export const IOS_MAX = 64;
export const IOS_HEADROOM = 4;
export const HORIZON_MAX_DAYS = 30;
export const LAST_REBUILD_KEY = 'notifications:last-rebuild-date';
export const SCHEDULE_FORMAT_KEY = 'notifications:schedule-format';
export const SCHEDULE_FORMAT = 16;
export const BLOCK_NOTICE_KIND = 'blockNotice';
export const CHECK_IN_KIND = 'checkin';
export const UPDATE_KIND = 'update';
export const UPDATE_NOTIFIED_KEY = 'notifications:update-notified';
export const TAHARAH_KIND = 'taharah';
export const HILULA_KIND = 'hilula';
export const ROSH_CHODESH_KIND = 'roshChodesh';
export const REPORT_KIND = 'report';
export const HORIZON_END_KIND = 'horizonEnd';
export const SOUND_PREVIEW_KIND = 'soundPreview';

export function planCap(platform: string): number {
  return platform === 'ios' ? IOS_MAX - IOS_HEADROOM : PENDING_LIMIT;
}

export type HilulaWhen = 'before' | 'evening';
export type RoshChodeshWhen = 'before' | 'evening' | 'day';

export type PendingNotificationMeta = {
  kind?:
    | typeof BLOCK_NOTICE_KIND
    | typeof CHECK_IN_KIND
    | typeof TAHARAH_KIND
    | typeof UPDATE_KIND
    | typeof HILULA_KIND
    | typeof ROSH_CHODESH_KIND
    | typeof REPORT_KIND
    | typeof HORIZON_END_KIND
    | typeof SOUND_PREVIEW_KIND;
  taharah?: { task: TaharahTaskKind | 'tevilaPrep' | 'postBlock' | 'preBlock'; day: number; onah?: OnahKind };
  hilula?: { day: number; when: HilulaWhen; ids?: string[] };
  roshChodesh?: { day: number; when: RoshChodeshWhen };
  report?: { week: string };
  contentHash?: string;
  blockId?: string;
  updateId?: string;
  updateCreatedAt?: string;
  mitzvahId?: string;
  dateKey?: string;
  windowEnd?: string;
  reminderIndex?: number;
  // On a nag only (the smart nag): the k-th of the window's `of` nags, of a kind, a last-chance point naming which.
  nag?: {
    k: number;
    of: number;
    kind: 'open' | 'zone' | 'sparse' | 'lastChance';
    lastChance?: 'alone' | 'minyan' | 'soon' | 'chatzot' | 'chatzotMinyan';
  };
  customId?: string;
  skipIfDone?: boolean;
  hasText?: boolean;
  fullContent?: ContentBlock[] | null;
};

export type NotificationContentLike = {
  data?: unknown;
  dataString?: unknown;
};

// `${idx}.${occurrence}` for the n-th further trigger of a `blockExit` reminder; `parseId()` reads the index alone.
export function buildId(mitzvahId: string, date: Date, idx: number, occurrence = 0): string {
  return `${mitzvahId}__${dateKey(date)}__${idx}${occurrence ? `.${occurrence}` : ''}`;
}

// The k-th nag of a window (the smart nag): `n${k}` where a reminder's index stands, so a mark's cancel by mitzvah
// and date reaches it like any reminder.
export function buildNagId(mitzvahId: string, date: Date, k: number): string {
  return `${mitzvahId}__${dateKey(date)}__n${k}`;
}

export function parseId(id: string): { mitzvahId: string; date: string; idx: number } | null {
  const parts = id.split('__');
  if (parts.length !== 3) return null;
  return { mitzvahId: parts[0], date: parts[1], idx: Number.parseInt(parts[2], 10) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asPendingNotificationMeta(value: unknown): PendingNotificationMeta {
  return isRecord(value) ? (value as PendingNotificationMeta) : {};
}

export function pendingNotificationMetaFromContent(content?: NotificationContentLike | null): PendingNotificationMeta {
  if (!content) return {};
  if (isRecord(content.data)) return asPendingNotificationMeta(content.data);
  if (typeof content.dataString === 'string') {
    try {
      return asPendingNotificationMeta(JSON.parse(content.dataString));
    } catch {
      return {};
    }
  }
  return {};
}

export function parseDateKey(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function notificationTargetFromData(
  data: PendingNotificationMeta,
  notificationId?: string,
): { mitzvahId: string; date: Date; key: string } | null {
  const idTarget = notificationId ? parseId(notificationId) : null;
  const customTarget = typeof data.customId === 'string' ? parseId(data.customId) : null;
  const mitzvahId = data.mitzvahId ?? idTarget?.mitzvahId ?? customTarget?.mitzvahId;
  const key = data.dateKey ?? idTarget?.date ?? customTarget?.date;
  if (!mitzvahId || !key) return null;
  const date = parseDateKey(key);
  if (!date) return null;
  return { mitzvahId, date, key };
}

export function notificationMatchesTarget(
  notificationId: string,
  data: PendingNotificationMeta,
  mitzvahId: string,
  key: string,
): boolean {
  const target = notificationTargetFromData(data, notificationId);
  return Boolean(target && target.mitzvahId === mitzvahId && target.key === key);
}
