import { HDate } from '@hebcal/core';
import { effectiveHalachaTrack } from '@/data/halacha';
import { readHalachaScheduleSync } from '@/services/halachaFiles';
import { HALACHA_STORES } from '@/stores/useHalachaStore';
import { useUserStore } from '@/stores/useUserStore';
import { FestivalPeriod, HalachaLabel, HalachaPortion, HalachaScheduleFile, HalachaTrack } from '@/types/halacha';
import { Nusach } from '@/types/mitzvah';
import { festivalPortion, halachaPortion } from '@/utils/halacha';

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
