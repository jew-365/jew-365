import { Completions, dateKey } from '@/stores/useCompletionsStore';
import { useMishnaStore } from '@/stores/useMishnaStore';
import { Location } from '@/types/zmanim';
import { appDayEnd } from '@/utils/locationDay';
import { MishnaReading, markedBefore, mishnaYomitOn, twoMishnayotAfter } from '@/utils/mishna';

// The two Mishnah habits read the Mishnah add-on (.claude/specs/habit-texts.md, section 4): Mishna Yomit by its
// cycle, and two mishnayot from the user's own place. Each is also the reader's text id.
export const MISHNA_YOMIT_ID = 'mishna_yomit';
export const TWO_MISHNAYOT_ID = 'two_mishnayot';
export const MISHNA_MITZVOT: readonly string[] = [MISHNA_YOMIT_ID, TWO_MISHNAYOT_ID];

// The days before today whose Mishna Yomit the reader folds in when unmarked, as the halacha reader does.
export const MISHNA_MAKE_UP_DAYS = 7;

export const isMishnaMitzvah = (id: string): boolean => MISHNA_MITZVOT.includes(id);

export function hasMishnaContent(): boolean {
  return useMishnaStore.getState().installed !== null;
}

// What a Mishnah mitzvah reads on a location day: the cycle's two for Mishna Yomit, else the two after every day
// marked before it (the archived count of the days retention pruned included).
export function mishnaReadingOn(
  id: string,
  day: Date,
  completions: Completions,
  archived: Readonly<Record<string, number>>,
): MishnaReading {
  return id === MISHNA_YOMIT_ID
    ? mishnaYomitOn(day)
    : twoMishnayotAfter(markedBefore(id, dateKey(day), completions, archived));
}

// The unmarked days of the last week whose Mishna Yomit the reader offers to make up, newest first. The cycle runs
// every day, so Shabbat and Yom Tov, on which the app is closed, are among them; days that ended before the mitzvah
// was switched on are not. Two mishnayot keep their own place, so they have none.
export function mishnaMakeUpDays(
  id: string,
  today: Date,
  completions: Completions,
  enabledAt: number | undefined,
  location: Location,
): { date: Date; reading: MishnaReading }[] {
  if (id !== MISHNA_YOMIT_ID) return [];
  const days: { date: Date; reading: MishnaReading }[] = [];
  for (let back = 1; back <= MISHNA_MAKE_UP_DAYS; back++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
    if (completions[dateKey(date)]?.[id]) continue;
    if (enabledAt !== undefined && enabledAt >= appDayEnd(date, location).getTime()) continue;
    days.push({ date, reading: mishnaYomitOn(date) });
  }
  return days;
}
