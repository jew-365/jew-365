import type { Completions } from '@/stores/useCompletionsStore';
import type { Location } from '@/types/zmanim';
import { appDayKey } from '@/utils/locationDay';
import { quietBlockAt } from '@/utils/skipRules';

export const RATING_MARKED_DAYS = 7;

type RatingInput = {
  completions: Completions;
  askedAt: number | null;
  firstOpenedAt: number | null;
  now: Date;
  location: Location;
  appActive: boolean;
};

export function shouldAskForRating({
  completions,
  askedAt,
  firstOpenedAt,
  now,
  location,
  appActive,
}: RatingInput): boolean {
  if (typeof askedAt === 'number' || !appActive || typeof firstOpenedAt !== 'number') return false;
  if (quietBlockAt(now, location)) return false;
  if (appDayKey(new Date(firstOpenedAt), location) === appDayKey(now, location)) return false;
  const markedDays = Object.values(completions).filter((marks) => Object.keys(marks).length > 0).length;
  return markedDays >= RATING_MARKED_DAYS;
}
