import { readHalachaScheduleSync } from '@/services/halachaFiles';
import { HALACHA_STORES } from '@/stores/useHalachaStore';
import { HalachaScheduleFile, HalachaTrack } from '@/types/halacha';

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
