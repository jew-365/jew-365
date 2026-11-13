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
import { appDay, appDayEnd, locationNoon } from '@/utils/locationDay';
import { holyBlockLabelKeys } from '@/utils/skipRules';
import { nextStreakGoal, STREAK_GOALS } from '@/utils/streakGoal';
import { civilHebrewDayAt } from '@/utils/taharah/onot';
import { WHATS_NEW } from '@/data/guide';
import type { WhatsNewState } from '@/utils/discovery';

type Translate = (scope: string, options?: Record<string, unknown>) => string;
type Language = 'he' | 'en';

export type HomeHref = string | { pathname: string; params: Record<string, string> };
export type HomeMessage = {
  id: 'streak' | 'holyBlock' | 'roshChodesh' | 'hilula' | 'whatsNew';
  icon: IconName;
  title: string;
  caption: string;
  href: HomeHref | null;
};

const HOLY_BLOCK_LOOKAHEAD_DAYS = 2;
const ROSH_CHODESH_LOOKAHEAD_DAYS = 7;
const WHATS_NEW_SHOW_DAYS = 3;

export function streakMessage(streak: number, t: Translate): HomeMessage | null {
  if (streak < 1) return null;
  // The day a goal is reached, home says so and opens the achievements tab (spec F1), stateless: the streak
  // grows by at most one a day, so landing exactly on a goal means today is the day it was reached.
  if ((STREAK_GOALS as readonly number[]).includes(streak)) {
    return {
      id: 'streak',
      icon: 'star',
      title: t(streak === 1 ? 'home.streakGoal.title.once' : 'home.streakGoal.title', { count: streak }),
      caption: t('home.streakGoal.caption'),
      href: { pathname: '/(tabs)/history', params: { tab: 'achievements' } },
    };
  }
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

// The newest what's-new label the guide holds, or null when there is none.
export const newestWhatsNewLabel = (): string | null => WHATS_NEW[0]?.label ?? null;

// The discovery `whatsNew` state to store for the newest label: unchanged while it already matches, else a
// fresh stamp, seen at once on an install that stored nothing (so the first run after this ships shows no row)
// and unseen when a newer label arrives (spec C7: the comparison is label to label, never the update number).
export function nextWhatsNew(
  stored: WhatsNewState | null,
  now: number,
  newestLabel: string | null = newestWhatsNewLabel(),
): WhatsNewState | null {
  if (!newestLabel) return stored;
  if (stored?.label === newestLabel) return stored;
  return { label: newestLabel, since: now, seen: stored == null };
}

export function whatsNewMessage(stored: WhatsNewState | null, now: number, t: Translate): HomeMessage | null {
  if (!stored || stored.seen || now - stored.since >= WHATS_NEW_SHOW_DAYS * 86_400_000) return null;
  return {
    id: 'whatsNew',
    icon: 'guide',
    title: t('home.msg.whatsNew.title'),
    caption: t('home.msg.whatsNew.caption'),
    href: '/guide',
  };
}

// The next block shows only from the nightfall before its erev (Thursday night for Shabbat; the owner's
// call, 2026-11-09), or from that day's alot where the sun neither rises nor sets.
function shownFrom(erev: Date, location: Location): Date {
  const before = addDays(erev, -1);
  const z = ZmanimService.getZmanim(locationNoon(before, location), location);
  return z ? HebcalService.nightfall(z, location) : appDayEnd(before, location);
}

// The next Shabbat or Yom Tov while it is "coming": from the nightfall before its erev until candle lighting,
// with its erev's app day; else null. Home's Messages row and the candle-lighting offer share this window.
export function upcomingHolyBlock(
  now: Date,
  location: Location,
): { block: NonNullable<ReturnType<typeof HebcalService.holyBlockOn>>; erev: Date } | null {
  const today = appDay(now, location);
  for (let o = 0; o <= HOLY_BLOCK_LOOKAHEAD_DAYS; o++) {
    const block = HebcalService.holyBlockOn(locationNoon(addDays(today, o), location), location);
    if (!block || block.start.getTime() <= now.getTime()) continue;
    const erev = appDay(block.start, location);
    return now.getTime() < shownFrom(erev, location).getTime() ? null : { block, erev };
  }
  return null;
}

export function holyBlockMessage(now: Date, location: Location, t: Translate): HomeMessage | null {
  const coming = upcomingHolyBlock(now, location);
  if (!coming) return null;
  const { block, erev } = coming;
  const when = dateKey(erev) === dateKey(appDay(now, location)) ? t('common.today') : t('common.tomorrow');
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

// With its notices off, the row also says a reminder is one tap away (spec C3): it opens the Rosh Chodesh screen,
// whose switch turns them on.
export function roshChodeshMessage(
  now: Date,
  location: Location,
  language: Language,
  t: Translate,
  noticesOn = true,
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
    caption: noticesOn ? caption : `${caption} · ${t('home.msg.roshChodesh.noticesOff')}`,
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
