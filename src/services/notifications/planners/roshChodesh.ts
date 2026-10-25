import { DateTime } from 'luxon';
import type { HDate } from '@hebcal/core';
import type { HolyBlock, Location } from '@/types/zmanim';
import { isRoshChodeshDay, roshChodeshLabel, roshChodeshMonth, startsRoshChodesh } from '@/data/roshChodesh';
import { isQuietAt } from '@/utils/skipRules';
import { locationNoon } from '@/utils/locationDay';
import { civilHebrewDayAt } from '@/utils/taharah/onot';
import { formatDate, t } from '@/i18n';
import { ROSH_CHODESH_KIND, type RoshChodeshWhen } from '@/services/notifications/ids';
import type { PlanInput, ScheduleCandidate } from '@/services/notifications/types';
import {
  noticeDayLabel,
  noticePhase,
  noticeTriggerAt,
  type Horizon,
  type NoticePhase,
} from '@/services/notifications/planners/horizon';
import {
  ROSH_CHODESH_BEFORE_DAYS,
  noticeDaysBefore,
  noticeTimingOf,
  type NoticeSetting,
  type RoshChodeshNotices,
} from '@/stores/useUserStore';

type RoshChodeshNotice = {
  trigger: Date;
  when: RoshChodeshWhen;
  id: number;
  month: HDate;
  date: DateTime;
  daysBefore: number;
  phase: NoticePhase;
};

const civilDate = (hebrewDay: HDate) => DateTime.fromJSDate(hebrewDay.greg());

function roshChodeshNoticesOn(day: Date, location: Location, notices: RoshChodeshNotices): RoshChodeshNotice[] {
  const noon = locationNoon(day, location);
  const today = civilHebrewDayAt(noon, location);
  const triggerOf = (setting: NoticeSetting) => noticeTriggerAt(noon, noticeTimingOf(setting), location);
  const found: RoshChodeshNotice[] = [];

  const daysBefore = noticeDaysBefore(notices.before, ROSH_CHODESH_BEFORE_DAYS);
  const entering = today.add(daysBefore);
  const beforeAt = notices.before.enabled && startsRoshChodesh(entering) ? triggerOf(notices.before) : null;
  if (beforeAt) {
    const month = roshChodeshMonth(entering);
    const date = civilDate(entering.prev());
    found.push({
      trigger: beforeAt,
      when: 'before',
      id: month.abs(),
      month,
      date,
      daysBefore,
      phase: noticePhase(beforeAt, date, location),
    });
  }

  const tonight = today.next();
  const eveningAt = notices.evening.enabled && startsRoshChodesh(tonight) ? triggerOf(notices.evening) : null;
  if (eveningAt) {
    const month = roshChodeshMonth(tonight);
    const date = civilDate(today);
    found.push({
      trigger: eveningAt,
      when: 'evening',
      id: month.abs(),
      month,
      date,
      daysBefore,
      phase: noticePhase(eveningAt, date, location),
    });
  }

  const dayAt = notices.day.enabled && isRoshChodeshDay(today) ? triggerOf(notices.day) : null;
  if (dayAt) {
    found.push({
      trigger: dayAt,
      when: 'day',
      id: today.abs(),
      month: roshChodeshMonth(today),
      date: civilDate(today),
      daysBefore,
      phase: 'open',
    });
  }
  return found;
}

function weekdayOf(date: DateTime, language: PlanInput['language']): string {
  return formatDate(date, 'cccc', language);
}

function roshChodeshTexts(notice: RoshChodeshNotice, params: Record<string, string>): { title: string; body: string } {
  if (notice.when !== 'day' && notice.phase === 'open')
    return { title: t('roshChodesh.notice.begun.title', params), body: t('roshChodesh.notice.begun.body', params) };
  const body = notice.when === 'before' && notice.daysBefore === 1 ? 'before.bodyTonight' : `${notice.when}.body`;
  return { title: t(`roshChodesh.notice.${notice.when}.title`, params), body: t(`roshChodesh.notice.${body}`, params) };
}

function roshChodeshCandidate(notice: RoshChodeshNotice, language: PlanInput['language']): ScheduleCandidate {
  const params = {
    month: roshChodeshLabel(notice.month, language),
    day: weekdayOf(notice.date, language),
    when: t(`roshChodesh.notice.inDays.${notice.daysBefore}`),
  };
  return {
    id: `${ROSH_CHODESH_KIND}:${notice.id}:${notice.when}`,
    trigger: notice.trigger,
    channel: 'roshChodesh',
    ...roshChodeshTexts(notice, params),
    data: { kind: ROSH_CHODESH_KIND, roshChodesh: { day: notice.id, when: notice.when } },
  };
}

export function planRoshChodesh(input: PlanInput, horizon: Horizon): ScheduleCandidate[] {
  if (!input.roshChodeshEnabled) return [];
  const { location, language, now } = input;
  return horizon.days
    .flatMap((day) => roshChodeshNoticesOn(day, location, input.roshChodeshNotices))
    .filter((notice) => notice.trigger.getTime() > now.getTime() && !isQuietAt(notice.trigger, location))
    .map((notice) => roshChodeshCandidate(notice, language));
}

export function roshChodeshLines(block: HolyBlock, input: PlanInput): string[] {
  const { location, language } = input;
  const erev = DateTime.fromISO(block.days[0], { zone: location.tz }).minus({ days: 1 });
  const evenings = [erev, ...block.days.map((day) => DateTime.fromISO(day, { zone: location.tz }))];
  const swallowed = new Map<string, RoshChodeshNotice>();
  for (const evening of evenings) {
    const day = new Date(evening.year, evening.month - 1, evening.day);
    for (const notice of roshChodeshNoticesOn(day, location, input.roshChodeshNotices)) {
      const key = `${notice.when === 'day' ? 'day' : 'month'}:${notice.id}`;
      if (isQuietAt(notice.trigger, location) && !swallowed.has(key)) swallowed.set(key, notice);
    }
  }
  return [...swallowed.values()]
    .sort((a, b) => a.trigger.getTime() - b.trigger.getTime())
    .map((notice) => {
      const month = roshChodeshLabel(notice.month, language);
      if (notice.when === 'day')
        return t('holyBlock.notice.roshChodeshDay', { month, day: weekdayOf(notice.date, language) });
      return notice.date.toISODate() === erev.toISODate()
        ? t('holyBlock.notice.roshChodeshTonight', { month })
        : t('holyBlock.notice.roshChodeshOn', { month, day: noticeDayLabel(notice.date, erev, language) });
    });
}
