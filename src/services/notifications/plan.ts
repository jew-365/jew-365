import { DateTime } from 'luxon';
import { planCap } from '@/services/notifications/ids';
import type { PlanInput, ScheduleCandidate } from '@/services/notifications/types';
import { horizonFor } from '@/services/notifications/planners/horizon';
import { planBlockNotices } from '@/services/notifications/planners/holyBlock';
import { planCheckIns } from '@/services/notifications/planners/checkIn';
import { planReport } from '@/services/notifications/planners/report';
import { planTaharah } from '@/services/notifications/planners/taharah';
import { planHilulot } from '@/services/notifications/planners/hilulot';
import { planRoshChodesh } from '@/services/notifications/planners/roshChodesh';
import { planMitzvot } from '@/services/notifications/planners/mitzvot';
import { planHorizonEnd } from '@/services/notifications/planners/horizonEnd';

function guarded(label: string, plan: () => ScheduleCandidate[]): ScheduleCandidate[] {
  try {
    return plan();
  } catch (err) {
    if (__DEV__) console.warn(`[notifications] ${label} failed`, err);
    return [];
  }
}

// Everything the schedule should hold for `input`, soonest first and within the platform's cap.
// A planner that throws loses only its own candidates: cancelAll has already run, so an exception
// that escaped would leave the user with an empty schedule.
export function buildPlan(input: PlanInput): ScheduleCandidate[] {
  if (!input.hasPermission) return [];
  const horizon = horizonFor(input.fromDate, input.location);
  // One slot of the cap belongs to the end notice.
  const room = planCap(input.platform) - 1;
  const others = [
    ...planBlockNotices(input, horizon),
    ...planCheckIns(input, horizon),
    ...guarded('weekly report', () => planReport(input, horizon)),
    ...guarded('taharah reminders', () => planTaharah(input, horizon)),
    ...guarded('hilula notices', () => planHilulot(input, horizon)),
    ...guarded('rosh chodesh notices', () => planRoshChodesh(input, horizon)),
  ];
  let mitzvot = planMitzvot(input, horizon);
  // A plan that does not fit keeps every reminder of the first two days and one per window after.
  if (others.length + mitzvot.length > room) mitzvot = planMitzvot(input, horizon, horizon.days[horizon.thinFromIndex]);
  const candidates = [...others, ...mitzvot];

  // iOS keeps only the 64 soonest pending requests and silently discards the rest. Order by
  // trigger and cap deliberately, so what gets dropped is the furthest away rather than —
  // as with a day-major loop — all of tomorrow.
  candidates.sort((a, b) => a.trigger.getTime() - b.trigger.getTime());
  const kept = candidates.slice(0, room);
  const lastDay = horizon.days[horizon.days.length - 1];
  let lastFullDay = lastDay;
  if (candidates.length > room) {
    console.warn(
      `[notifications] ${candidates.length - room} reminder(s) beyond the ${room} slot cap were not scheduled`,
    );
    const first = DateTime.fromJSDate(candidates[room].trigger).setZone(input.location.tz);
    const before = new Date(first.year, first.month - 1, first.day - 1);
    lastFullDay = new Date(Math.min(Math.max(before.getTime(), horizon.days[0].getTime()), lastDay.getTime()));
  }
  const cut = candidates.length > room;
  kept.push(...planHorizonEnd(input, lastFullDay, cut ? kept[kept.length - 1]?.trigger : undefined));
  return kept.sort((a, b) => a.trigger.getTime() - b.trigger.getTime());
}
