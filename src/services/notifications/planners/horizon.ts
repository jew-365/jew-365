import { DateTime } from 'luxon';
import type { HolyBlock, Location } from '@/types/zmanim';
import { HebcalService } from '@/services/HebcalService';
import { ZmanimService } from '@/services/ZmanimService';
import { formatDate, type AppLanguage } from '@/i18n';
import type { NoticeTiming } from '@/stores/useUserStore';
import { locationNoon } from '@/utils/locationDay';

export type Horizon = { days: Date[]; recentDays: Date[] };

export type NoticePhase = 'ahead' | 'opening' | 'open';

// The location's calendar days from the one `fromDate` falls on: today and tomorrow, then on through
// any Shabbat / Yom Tov block that is reached or starts the next day, up to the first weekday after
// it. Nothing reopens the app inside a block — the user does not touch the phone — so a schedule
// that stopped at the block left Sunday morning with no reminders whenever background fetch did not
// run. Stepping by the location's dates, never by 24-hour device steps, keeps a DST change in
// either zone from skipping or repeating a day, and keys every reminder by the date its window
// belongs to — the same day the reader's liturgical flags and the history read.
export function horizonDays(fromDate: Date, location: Location): Date[] {
  const first = DateTime.fromJSDate(fromDate).setZone(location.tz).startOf('day');
  const dayAt = (offset: number) => {
    const day = first.plus({ days: offset });
    return new Date(day.year, day.month - 1, day.day);
  };
  const isHoly = (day: Date) => HebcalService.isHolyDay(locationNoon(day, location), location);
  const days = [dayAt(0), dayAt(1)];
  while (isHoly(days[days.length - 1]) || isHoly(dayAt(days.length))) days.push(dayAt(days.length));
  return days;
}

export function holyBlocksWithin(days: Date[], location: Location): HolyBlock[] {
  const blocks = new Map<string, HolyBlock>();
  for (const day of days) {
    const block = HebcalService.holyBlockOn(locationNoon(day, location), location);
    if (block) blocks.set(block.days[0], block);
  }
  return [...blocks.values()];
}

// A block that ended a day or two ago may still owe its last check-in nudge.
export function recentDaysBefore(days: Date[]): Date[] {
  return [3, 2, 1].map((back) => new Date(days[0].getFullYear(), days[0].getMonth(), days[0].getDate() - back));
}

export function horizonFor(fromDate: Date, location: Location): Horizon {
  const days = horizonDays(fromDate, location);
  return { days, recentDays: recentDaysBefore(days) };
}

export function noticeTriggerAt(noon: Date, timing: NoticeTiming, location: Location): Date | null {
  if (timing.anchor === 'clock') {
    return DateTime.fromJSDate(noon)
      .setZone(location.tz)
      .set({ hour: Math.floor(timing.minutes / 60), minute: timing.minutes % 60, second: 0, millisecond: 0 })
      .toJSDate();
  }
  const shkia = ZmanimService.getZmanim(noon, location)?.shkia;
  return shkia ? new Date(shkia.getTime() + timing.offsetMin * 60_000) : null;
}

export function noticePhase(trigger: Date, opens: DateTime, location: Location): NoticePhase {
  const noon = locationNoon(new Date(opens.year, opens.month - 1, opens.day), location);
  const shkia = noticeTriggerAt(noon, { anchor: 'shkia', offsetMin: 0 }, location);
  if (!shkia || trigger.getTime() < shkia.getTime()) return 'ahead';
  return trigger.getTime() === shkia.getTime() ? 'opening' : 'open';
}

const NOTICE_WEEKDAY_RANGE_DAYS = 7;

const civilDay = (day: DateTime) => DateTime.utc(day.year, day.month, day.day);

export function noticeDayLabel(opens: DateTime, from: DateTime, language: AppLanguage): string {
  const far = civilDay(opens).diff(civilDay(from), 'days').days >= NOTICE_WEEKDAY_RANGE_DAYS;
  return formatDate(opens, far ? (language === 'he' ? 'cccc d LLLL' : 'cccc, LLL d') : 'cccc', language);
}

export function formatClock(instant: Date): string {
  return DateTime.fromJSDate(instant).toFormat('HH:mm');
}
