import type { PlanInput, ScheduleCandidate } from '@/services/notifications/types';
import { HORIZON_END_KIND } from '@/services/notifications/ids';
import { noticeTriggerAt } from '@/services/notifications/planners/horizon';
import { t } from '@/i18n';
import { dateKey } from '@/stores/useCompletionsStore';
import { locationNoon } from '@/utils/locationDay';
import { quietBlockAt } from '@/utils/skipRules';

const END_NOTICE_CLOCK_MIN = 20 * 60;
const FALLBACK_LEAD_MIN = 5;

// One notice on the last fully planned day, at 20:00 on the location's clock or at the exit of the
// block that covers that hour. When that time has passed but the cut still lands soon, it goes out at
// `fallbackAt` (the last kept trigger) or a few minutes from now, never inside a block. Every rebuild moves it, so it fires only if the app stays closed.
export function planHorizonEnd(input: PlanInput, lastFullDay: Date, fallbackAt?: Date): ScheduleCandidate[] {
  const { location, now } = input;
  const evening = noticeTriggerAt(
    locationNoon(lastFullDay, location),
    { anchor: 'clock', minutes: END_NOTICE_CLOCK_MIN },
    location,
  );
  if (!evening) return [];
  let trigger = quietBlockAt(evening, location)?.end ?? evening;
  if (trigger.getTime() <= now.getTime()) {
    if (!fallbackAt) return [];
    trigger = new Date(Math.max(fallbackAt.getTime(), now.getTime() + FALLBACK_LEAD_MIN * 60_000));
    trigger = quietBlockAt(trigger, location)?.end ?? trigger;
  }
  return [
    {
      id: `${HORIZON_END_KIND}:${dateKey(lastFullDay)}`,
      trigger,
      channel: 'system',
      title: t('notifications.horizonEnd.title'),
      body: t('notifications.horizonEnd.body'),
      data: { kind: HORIZON_END_KIND },
    },
  ];
}
