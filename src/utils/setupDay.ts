// The ready step's "rest of your day" (spec .claude/specs/discoverability.md, A5): the windows of the enabled
// mitzvot that are open now or still to come in this app day, soonest first. Pure over the clock it is given.

import type { Mitzvah, UserSettings } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { appDayWindow, type DayWindow } from './buildDayTimeline';
import { quietBlockAt } from './skipRules';

export const SETUP_DAY_MAX_ROWS = 6;

export type SetupDayRow = { mitzvah: Mitzvah; window: DayWindow; open: boolean };

// Empty inside a holy block (the app is at rest and nothing of the day is shown) and where the day has no
// window left; the caller then falls back to the list of names.
export function restOfDay(
  mitzvot: readonly Mitzvah[],
  location: Location,
  settings: UserSettings,
  now: Date,
  max = SETUP_DAY_MAX_ROWS,
): SetupDayRow[] {
  if (quietBlockAt(now, location)) return [];
  const at = now.getTime();
  return mitzvot
    .flatMap((mitzvah) => {
      const window = appDayWindow(mitzvah, location, settings, now);
      return window && window.end.getTime() > at ? [{ mitzvah, window, open: window.start.getTime() <= at }] : [];
    })
    .sort((a, b) => a.window.start.getTime() - b.window.start.getTime())
    .slice(0, max);
}
