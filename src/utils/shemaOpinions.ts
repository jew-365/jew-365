import { ZmanimService } from '@/services/ZmanimService';
import type { HalachicOpinion } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { clockOf } from '@/utils/clock';
import { locationNoon } from '@/utils/locationDay';

export const SHEMA_OPINIONS_MITZVAH = 'krias_shma_shacharit';

// Both latest times of the morning Shema on a window's day, for display only (the user's call, 2026-11-05):
// the window, the reminders and the history keep following the user's own opinion (`ksSofZman`).
export type ShemaOpinions = { ma: Date; gra: Date; chosen: HalachicOpinion };

export function shemaOpinionsFor(
  mitzvahId: string,
  day: Date,
  location: Location,
  chosen: HalachicOpinion,
): ShemaOpinions | null {
  if (mitzvahId !== SHEMA_OPINIONS_MITZVAH) return null;
  const zmanim = ZmanimService.getZmanim(locationNoon(day, location), location);
  if (!zmanim) return null;
  return { ma: zmanim.sofZmanShmaMA, gra: zmanim.sofZmanShmaGra, chosen };
}

type Translate = (key: string, params?: Record<string, unknown>) => string;

// "מג״א 08:41 · גר״א 09:17", each on the location's clock, the chosen opinion marked.
export function shemaOpinionsLine(opinions: ShemaOpinions, tz: string, t: Translate): string {
  const part = (opinion: HalachicOpinion, at: Date) =>
    t(opinion === opinions.chosen ? 'shema.opinion.chosen' : 'shema.opinion.other', {
      name: t(`shema.opinion.${opinion}`),
      time: clockOf(at, tz),
    });
  return `${part('MA', opinions.ma)} · ${part('GRA', opinions.gra)}`;
}
