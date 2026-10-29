import { DateTime } from 'luxon';
import type { Location } from '@/types/zmanim';
import type { PlanInput, ScheduleCandidate } from '@/services/notifications/types';
import { HORIZON_END_KIND } from '@/services/notifications/ids';
import { noticeTriggerAt } from '@/services/notifications/planners/horizon';
import { t } from '@/i18n';
import { dateKey } from '@/stores/useCompletionsStore';
import { locationNoon } from '@/utils/locationDay';
import { NO_QUIET_HOURS, inQuietHours, quietHoursEdge, quietHoursValid, type QuietHours } from '@/utils/quietHours';
import { quietBlockAt } from '@/utils/skipRules';

const END_NOTICE_CLOCK_MIN = 20 * 60;
const LAST_MINUTE = 1439;
const FALLBACK_LEAD_MIN = 5;

function outOfQuietHours(trigger: Date, hours: QuietHours, minutes: number, location: Location): Date | null {
  if (!inQuietHours(trigger, hours, location.tz)) return trigger;
  const target =
    quietHoursEdge(trigger, hours, location.tz) ??
    DateTime.fromJSDate(trigger, { zone: location.tz })
      .plus({ days: 1 })
      .set({ hour: Math.floor(minutes / 60), minute: minutes % 60, second: 0, millisecond: 0 })
      .toJSDate();
  return quietBlockAt(target, location) ? null : target;
}

// One notice on the last fully planned day, at 20:00 on the location's clock (clamped into the open
// hours) or at the exit of the block that covers that hour. When that time has passed but the cut
// still lands soon, it goes out at `fallbackAt` (the last kept trigger) or a few minutes from now,
// never inside a block. An instant in quiet hours moves to the first open hour. Every rebuild moves
// it, so it fires only if the app stays closed.
export function planHorizonEnd(input: PlanInput, lastFullDay: Date, fallbackAt?: Date): ScheduleCandidate[] {
  const { location, now } = input;
  const hours = input.quietHours && quietHoursValid(input.quietHours) ? input.quietHours : NO_QUIET_HOURS;
  const minutes = Math.min(Math.max(END_NOTICE_CLOCK_MIN, hours.before ?? 0), hours.after ?? LAST_MINUTE);
  const evening = noticeTriggerAt(locationNoon(lastFullDay, location), { anchor: 'clock', minutes }, location);
  if (!evening) return [];
  let trigger = quietBlockAt(evening, location)?.end ?? evening;
  if (trigger.getTime() <= now.getTime()) {
    if (!fallbackAt) return [];
    trigger = new Date(Math.max(fallbackAt.getTime(), now.getTime() + FALLBACK_LEAD_MIN * 60_000));
    trigger = quietBlockAt(trigger, location)?.end ?? trigger;
  }
  const allowed = outOfQuietHours(trigger, hours, minutes, location);
  if (!allowed) return [];
  return [
    {
      id: `${HORIZON_END_KIND}:${dateKey(lastFullDay)}`,
      trigger: allowed,
      channel: 'system',
      title: t('notifications.horizonEnd.title'),
      body: t('notifications.horizonEnd.body'),
      data: { kind: HORIZON_END_KIND },
    },
  ];
}
