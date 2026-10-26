import { DateTime } from 'luxon';

type Translate = (scope: string, options?: Record<string, unknown>) => string;

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function formatRemaining(ms: number, t: Translate): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  if (totalMin >= 2 * 24 * 60) return `${Math.floor(totalMin / (24 * 60))} ${t('time.unit.days')}`;
  if (totalMin >= 60) {
    const hours = Math.floor(totalMin / 60);
    const minutes = String(totalMin % 60).padStart(2, '0');
    return `${hours}:${minutes} ${t('time.unit.hours')}`;
  }
  return `${totalMin} ${t('time.unit.minutes')}`;
}

export function clockOf(date: Date, zone?: string): string {
  return DateTime.fromJSDate(date, { zone }).toFormat('HH:mm');
}

export function fireTimeText(date: Date, zone: string): string {
  return DateTime.fromJSDate(date, { zone }).toFormat('dd/MM HH:mm');
}

export function clockRange(start: Date, end: Date, t: Translate, zone?: string, day?: Date): string {
  const endDay = DateTime.fromJSDate(end, { zone }).startOf('day');
  const startDay = DateTime.fromJSDate(start, { zone }).startOf('day');
  const dayStart = day
    ? DateTime.fromObject({ year: day.getFullYear(), month: day.getMonth() + 1, day: day.getDate() }, { zone })
    : startDay;
  if (endDay.diff(startDay, 'days').days >= 2) {
    return t('detail.timeRangeDays', {
      startDate: DateTime.fromJSDate(start, { zone }).toFormat('dd/MM'),
      start: clockOf(start, zone),
      endDate: DateTime.fromJSDate(end, { zone }).toFormat('dd/MM'),
      end: clockOf(end, zone),
    });
  }
  const nextDay = endDay > startDay || endDay > dayStart;
  return t(nextDay ? 'detail.timeRangeNextDay' : 'detail.timeRange', {
    start: clockOf(start, zone),
    end: clockOf(end, zone),
  });
}
