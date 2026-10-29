import { DateTime } from 'luxon';
import type { IconName } from '@/components/MitzvahIcon';
import { hilulaDateLabel, hilulaNames, hilulotOn } from '@/data/hilulot';
import { roshChodeshLabel, upcomingRoshChodesh } from '@/data/roshChodesh';
import { HebcalService } from '@/services/HebcalService';
import { ZmanimService } from '@/services/ZmanimService';
import { dateKey } from '@/stores/useCompletionsStore';
import { formatDate } from '@/i18n';
import type { Location } from '@/types/zmanim';
import { clockOf } from '@/utils/clock';
import { addDays } from '@/utils/historyStats';
import { appDay, locationNoon } from '@/utils/locationDay';
import { holyBlockLabelKeys } from '@/utils/skipRules';
import { nextStreakGoal } from '@/utils/streakGoal';
import { civilHebrewDayAt } from '@/utils/taharah/onot';

type Translate = (scope: string, options?: Record<string, unknown>) => string;
type Language = 'he' | 'en';

export type HomeHref = string | { pathname: string; params: Record<string, string> };
export type HomeMessage = {
  id: 'streak' | 'holyBlock' | 'roshChodesh' | 'hilula';
  icon: IconName;
  title: string;
  caption: string;
  href: HomeHref | null;
};

const HOLY_BLOCK_LOOKAHEAD_DAYS = 8;
const ROSH_CHODESH_LOOKAHEAD_DAYS = 7;

export function streakMessage(streak: number, t: Translate): HomeMessage | null {
  if (streak < 1) return null;
  const goal = nextStreakGoal(streak);
  const rem = goal - streak;
  return {
    id: 'streak',
    icon: 'star',
    title: t(streak === 1 ? 'history.streak.once' : 'history.streak', { count: streak }),
    caption: t(rem === 1 ? 'history.goalCaption.once' : 'history.goalCaption', { count: rem, goal }),
    href: '/(tabs)/history',
  };
}

export function holyBlockMessage(now: Date, location: Location, language: Language, t: Translate): HomeMessage | null {
  const today = appDay(now, location);
  for (let o = 0; o <= HOLY_BLOCK_LOOKAHEAD_DAYS; o++) {
    const block = HebcalService.holyBlockOn(locationNoon(addDays(today, o), location), location);
    if (!block || block.start.getTime() <= now.getTime()) continue;
    const erev = appDay(block.start, location);
    const ahead = Math.round(
      DateTime.fromISO(dateKey(erev), { zone: 'utc' }).diff(DateTime.fromISO(dateKey(today), { zone: 'utc' }), 'days')
        .days,
    );
    const when =
      ahead === 0 ? t('common.today') : ahead === 1 ? t('common.tomorrow') : formatDate(erev, 'cccc', language);
    const labels = holyBlockLabelKeys(block);
    const times = t('holyBlock.notice.body', {
      start: clockOf(block.start, location.tz),
      exit: t(labels.exit),
      end: clockOf(block.end, location.tz),
    });
    return {
      id: 'holyBlock',
      icon: 'candles',
      title: t(`home.msg.block.${block.kind}`),
      caption: `${when} · ${times}`,
      href: null,
    };
  }
  return null;
}

export function roshChodeshMessage(
  now: Date,
  location: Location,
  language: Language,
  t: Translate,
): HomeMessage | null {
  const today = appDay(now, location);
  const ref = civilHebrewDayAt(locationNoon(today, location), location);
  const shkia = ZmanimService.getZmanim(locationNoon(today, location), location)?.shkia;
  const after = shkia ? now.getTime() >= shkia.getTime() : false;
  const occ = upcomingRoshChodesh(ref, 1)[0];
  const n = occ.first.abs() - ref.abs();
  const last = occ.first.abs() + occ.days - 1;
  const month = roshChodeshLabel(occ.month, language);
  const message = (title: string, caption: string): HomeMessage => ({
    id: 'roshChodesh',
    icon: 'moon',
    title,
    caption,
    href: '/rosh-chodesh',
  });
  if (n <= 0) {
    if (ref.abs() === last && after) return null;
    return message(t('roshChodesh.notice.day.title', { month }), t('roshChodesh.notice.day.body', { month }));
  }
  if (n === 1) {
    if (after)
      return message(t('roshChodesh.notice.begun.title', { month }), t('roshChodesh.notice.begun.body', { month }));
    return message(
      t('roshChodesh.notice.before.title', { month, when: t('roshChodesh.notice.inDays.1') }),
      t('roshChodesh.notice.before.bodyTonight', { month }),
    );
  }
  if (n <= ROSH_CHODESH_LOOKAHEAD_DAYS)
    return message(
      t('roshChodesh.notice.before.title', { month, when: t(`roshChodesh.notice.inDays.${n}`) }),
      t('roshChodesh.notice.before.body', { month, day: formatDate(addDays(today, n - 1), 'cccc', language) }),
    );
  return null;
}

export function hilulaMessage(
  now: Date,
  location: Location,
  inIsrael: boolean,
  enabled: boolean,
  language: Language,
  t: Translate,
): HomeMessage | null {
  if (!enabled) return null;
  const today = appDay(now, location);
  const ref = civilHebrewDayAt(locationNoon(today, location), location);
  const shkia = ZmanimService.getZmanim(locationNoon(today, location), location)?.shkia;
  const after = shkia ? now.getTime() >= shkia.getTime() : false;
  let list = hilulotOn(ref.next(), inIsrael);
  let title: (names: string) => string;
  let caption: string;
  if (after) {
    title = (names) => t('hilulot.notice.evening.titleBegun', { names });
    caption = t('hilulot.notice.evening.bodyBegun', { date: hilulaDateLabel(ref.next(), language) });
  } else if (hilulotOn(ref, inIsrael).length) {
    list = hilulotOn(ref, inIsrael);
    title = (names) => t('home.msg.hilulaToday', { names });
    caption = hilulaDateLabel(ref, language);
  } else {
    title = (names) => t('hilulot.notice.evening.title', { names });
    caption = t('hilulot.notice.evening.bodyTonight', { date: hilulaDateLabel(ref.next(), language) });
  }
  if (!list.length) return null;
  return {
    id: 'hilula',
    icon: 'hilula',
    title: title(hilulaNames(list, language)),
    caption,
    href: {
      pathname: '/hilula/[id]',
      params: list.length > 1 ? { id: list[0].id, ids: list.map((h) => h.id).join(',') } : { id: list[0].id },
    },
  };
}
