import { HDate } from '@hebcal/core';
import { HALACHA_YOMIT_ID, effectiveHalachaTrack } from '@/data/halacha';
import { readHalachaScheduleSync } from '@/services/halachaFiles';
import { HALACHA_STORES } from '@/stores/useHalachaStore';
import { Completions, dateKey } from '@/stores/useCompletionsStore';
import { useUserStore } from '@/stores/useUserStore';
import { FestivalPeriod, HalachaLabel, HalachaPortion, HalachaScheduleFile, HalachaTrack } from '@/types/halacha';
import { Nusach } from '@/types/mitzvah';
import { Location } from '@/types/zmanim';
import { festivalPortion, halachaPortion } from '@/utils/halacha';
import { appDayEnd } from '@/utils/locationDay';

// The installed track's schedule, read once per installed version: what a window and the reader ask of a day. Kept
// apart from ./halacha.ts, which the user store imports, so that store imports no other store.
const read = new Map<string, HalachaScheduleFile | null>();

export function halachaScheduleOf(track: HalachaTrack): HalachaScheduleFile | null {
  const install = HALACHA_STORES[track].getState().installed;
  if (!install) return null;
  const key = `${track}/${install.version}/${install.installedAt}`;
  if (!read.has(key)) read.set(key, readHalachaScheduleSync(track, install));
  return read.get(key) ?? null;
}

export function hasHalachaContent(track: HalachaTrack): boolean {
  return halachaScheduleOf(track) !== null;
}

// The track a user learns: the one chosen in Settings, else the nusach's.
export function halachaTrackFor(nusach: Nusach): HalachaTrack {
  return effectiveHalachaTrack(useUserStore.getState().halachaTrack, nusach);
}

export type HalachaDay = { track: HalachaTrack; book: HalachaLabel; portion: HalachaPortion };

// The daily portion of a civil day (its device-local midnight, the day a window is keyed on), or `null` while the track
// is not installed or the schedule gives the day nothing.
export function halachaYomitOn(day: Date, nusach: Nusach, inIsrael: boolean): HalachaDay | null {
  const track = halachaTrackFor(nusach);
  const schedule = halachaScheduleOf(track);
  if (!schedule) return null;
  const portion = halachaPortion(new HDate(day), schedule, inIsrael, useUserStore.getState().benIshChaiYearSwapped);
  return portion ? { track, book: schedule.book, portion } : null;
}

export type HachagDay = HalachaDay & { period: FestivalPeriod };

// The festival portions of a civil day, nearest festival first: one for each period the track covers.
export function hilchotHachagOn(day: Date, nusach: Nusach): HachagDay[] {
  const track = halachaTrackFor(nusach);
  const schedule = halachaScheduleOf(track);
  if (!schedule) return [];
  return festivalPortion(new HDate(day), schedule).map(({ period, portion }) => ({
    track,
    book: schedule.book,
    portion,
    period,
  }));
}

// What one of the two halacha mitzvot reads on a civil day: the daily portion, or the festival portions of the day.
export function halachaReadingsOn(
  id: string,
  day: Date,
  nusach: Nusach,
  inIsrael: boolean,
): (HalachaDay | HachagDay)[] {
  if (id !== HALACHA_YOMIT_ID) return hilchotHachagOn(day, nusach);
  const portion = halachaYomitOn(day, nusach, inIsrael);
  return portion ? [portion] : [];
}

export type HalachaMakeUpDay = { date: Date; readings: (HalachaDay | HachagDay)[] };

export const HALACHA_MAKE_UP_DAYS = 7;

// The reader's make-up folds (spec 9, D2): each of the seven days before `today` that has a portion, no mark and ended
// after the mitzvah was switched on, newest first; the festival halachot only of the periods `today` is in.
export function halachaMakeUpDays(
  id: string,
  today: Date,
  nusach: Nusach,
  inIsrael: boolean,
  completions: Completions,
  enabledAt: number | undefined,
  location: Location,
): HalachaMakeUpDay[] {
  const current = new Set(hilchotHachagOn(today, nusach).map((reading) => reading.period.festival));
  const days: HalachaMakeUpDay[] = [];
  for (let back = 1; back <= HALACHA_MAKE_UP_DAYS; back++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
    if (completions[dateKey(date)]?.[id]) continue;
    if (enabledAt !== undefined && enabledAt >= appDayEnd(date, location).getTime()) continue;
    const readings = halachaReadingsOn(id, date, nusach, inIsrael).filter(
      (reading) => !('period' in reading) || current.has(reading.period.festival),
    );
    if (readings.length) days.push({ date, readings });
  }
  return days;
}
