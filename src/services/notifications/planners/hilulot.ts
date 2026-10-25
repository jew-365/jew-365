import { DateTime } from 'luxon';
import type { HDate } from '@hebcal/core';
import type { HolyBlock, Location } from '@/types/zmanim';
import { Hilula, hilulaDateLabel, hilulotOn } from '@/data/hilulot';
import { isQuietAt } from '@/utils/skipRules';
import { locationNoon } from '@/utils/locationDay';
import { civilHebrewDayAt } from '@/utils/taharah/onot';
import { t } from '@/i18n';
import { HILULA_KIND, type HilulaWhen } from '@/services/notifications/ids';
import type { PlanInput, ScheduleCandidate } from '@/services/notifications/types';
import {
  noticeDayLabel,
  noticePhase,
  noticeTriggerAt,
  type Horizon,
  type NoticePhase,
} from '@/services/notifications/planners/horizon';
import { HILULA_BEFORE_DAYS, noticeDaysBefore, noticeTimingOf, type HilulaNotices } from '@/stores/useUserStore';

type HilulaNotice = {
  trigger: Date;
  day: HDate;
  when: HilulaWhen;
  hilulot: Hilula[];
  eveningsAhead: number;
  phase: NoticePhase;
};

// `day` is a calendar day as the horizon holds it. Its Hebrew day comes from the civil date, not from
// the hour: in an Arctic winter shkia comes before noon.
function hilulaNoticesOn(day: Date, location: Location, inIsrael: boolean, notices: HilulaNotices): HilulaNotice[] {
  const noon = locationNoon(day, location);
  const today = civilHebrewDayAt(noon, location);
  const ahead: [HilulaWhen, number][] = [
    ['evening', 0],
    ['before', noticeDaysBefore(notices.before, HILULA_BEFORE_DAYS)],
  ];
  return ahead.flatMap(([when, eveningsAhead]) => {
    const setting = notices[when];
    if (!setting.enabled) return [];
    const date = today.add(eveningsAhead + 1);
    const hilulot = hilulotOn(date, inIsrael);
    if (!hilulot.length) return [];
    const timing = noticeTimingOf(setting);
    const trigger = noticeTriggerAt(noon, timing, location);
    return trigger
      ? [
          {
            trigger,
            day: date,
            when,
            hilulot,
            eveningsAhead,
            phase: noticePhase(trigger, DateTime.fromJSDate(date.prev().greg()), location),
          },
        ]
      : [];
  });
}

function hilulaNames(hilulot: Hilula[], english: boolean): string {
  return hilulot.map((hilula) => (english ? hilula.name.en : hilula.name.he)).join(', ');
}

function hilulaTexts(notice: HilulaNotice, english: boolean): { title: string; body: string } {
  const names = hilulaNames(notice.hilulot, english);
  const locale = english ? 'en' : 'he';
  const date = hilulaDateLabel(notice.day, locale);
  if (notice.eveningsAhead === 0) {
    if (notice.phase === 'open')
      return {
        title: t('hilulot.notice.evening.titleBegun', { names }),
        body: t('hilulot.notice.evening.bodyBegun', { date }),
      };
    return {
      title: t('hilulot.notice.evening.title', { names }),
      body: t(notice.phase === 'opening' ? 'hilulot.notice.evening.body' : 'hilulot.notice.evening.bodyTonight', {
        date,
      }),
    };
  }
  if (notice.eveningsAhead === 1) {
    return { title: t('hilulot.notice.before.title', { names }), body: t('hilulot.notice.before.body', { date }) };
  }
  const opens = DateTime.fromJSDate(notice.day.prev().greg());
  const day = noticeDayLabel(opens, opens.minus({ days: notice.eveningsAhead }), locale);
  return {
    title: t('hilulot.notice.before.titleOn', { names, day }),
    body: t('hilulot.notice.before.bodyOn', { date, day }),
  };
}

function hilulaCandidate(notice: HilulaNotice, english: boolean): ScheduleCandidate {
  const { day, when } = notice;
  return {
    id: `${HILULA_KIND}:${day.abs()}:${when}`,
    trigger: notice.trigger,
    channel: 'hilulot',
    ...hilulaTexts(notice, english),
    data: { kind: HILULA_KIND, hilula: { day: day.abs(), when } },
  };
}

// A notice that would fire inside a holy block is named in that block's pre-block notice instead.
export function planHilulot(input: PlanInput, horizon: Horizon): ScheduleCandidate[] {
  if (!input.hilulotEnabled) return [];
  const { location, settings, now } = input;
  const english = input.language === 'en';
  return horizon.days
    .flatMap((day) => hilulaNoticesOn(day, location, settings.inIsrael, input.hilulaNotices))
    .filter((notice) => notice.trigger.getTime() > now.getTime() && !isQuietAt(notice.trigger, location))
    .map((notice) => hilulaCandidate(notice, english));
}

// One line per hilula whose notice the block swallows, naming the evening its date opens.
export function hilulaLines(block: HolyBlock, input: PlanInput): string[] {
  const { location, settings } = input;
  const english = input.language === 'en';
  const erev = DateTime.fromISO(block.days[0], { zone: location.tz }).minus({ days: 1 });
  const evenings = [erev, ...block.days.map((day) => DateTime.fromISO(day, { zone: location.tz }))];
  const swallowed = new Map<number, HilulaNotice>();
  for (const evening of evenings) {
    const day = new Date(evening.year, evening.month - 1, evening.day);
    for (const notice of hilulaNoticesOn(day, location, settings.inIsrael, input.hilulaNotices)) {
      if (isQuietAt(notice.trigger, location) && !swallowed.has(notice.day.abs()))
        swallowed.set(notice.day.abs(), notice);
    }
  }
  const locale = english ? 'en' : 'he';
  return [...swallowed.values()].map(({ day, hilulot }) => {
    const opens = DateTime.fromJSDate(day.prev().greg());
    const names = hilulaNames(hilulot, english);
    return opens.toISODate() === erev.toISODate()
      ? t('holyBlock.notice.hilulaTonight', { names })
      : t('holyBlock.notice.hilulaOn', { names, day: noticeDayLabel(opens, erev, locale) });
  });
}
