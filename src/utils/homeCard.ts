// Home's smart card (the owner's pick of 2026-11-10, "גוון התקופה, קרוסלה חיה"; round 8 of
// design/lab/studies/2026-11-08-home-schedule): three pages in one card, the day, the week and the user's own,
// in the colour of the period. It never prints a clock time the carousel prints: the carousel holds the day's
// times, the card what the day and the week are. Shabbat's entry and exit live on the week page.
import { DateTime } from 'luxon';
import { HDate, HebrewCalendar, Molad, flags, gematriya, months } from '@hebcal/core';
import { HebcalService } from '@/services/HebcalService';
import { ZmanimService } from '@/services/ZmanimService';
import { siddurPlace, standaloneAvailability } from '@/data/siddur';
import { hilulotOn, upcomingHilulot } from '@/data/hilulot';
import { roshChodeshLabel, startsRoshChodesh, roshChodeshMonth } from '@/data/roshChodesh';
import { formatDate, type AppLanguage } from '@/i18n';
import type { IconName } from '@/components/MitzvahIcon';
import type { Nusach } from '@/types/mitzvah';
import type { HolyBlock, Location } from '@/types/zmanim';
import { clockOf, formatRemaining } from './clock';
import { appDay, locationNoon } from './locationDay';
import { chanukahDay, dayFeatures, matchesCondition } from './siddur';
import { MINE_MAX, periodTone, type CardPageId, type Habit, type MineFactId, type PeriodTone } from './homeTimes';

export { CARD_PAGES, DEFAULT_MINE, MINE_FACTS, MINE_MAX, isCardPage, mineFactsOf } from './homeTimes';
export type { CardPageId, MineFactId } from './homeTimes';

type Translate = (scope: string, options?: Record<string, unknown>) => string;

export type CardFact = { label: string; value: string };
export type CardPage = { id: CardPageId; title: string; icon: IconName; facts: CardFact[] };

// The weekly division of Tehillim, the first and last psalm of each day from Sunday.
const TEHILLIM_DAYS: readonly [number, number][] = [
  [1, 29],
  [30, 50],
  [51, 72],
  [73, 89],
  [90, 106],
  [107, 119],
  [120, 150],
];

export type CardInput = {
  now: Date;
  location: Location;
  inIsrael: boolean;
  nusach: Nusach;
  language: AppLanguage;
  t: Translate;
  habit: Habit | null;
  mine: readonly MineFactId[];
  pinNames: readonly string[];
  // The Kiddush Levana window, while the user keeps it: open now, or the next one.
  kiddushLevana: { start: Date; end: Date } | null;
};

export type CardModel = {
  pages: Record<CardPageId, CardPage>;
  smart: CardPageId;
  tone: PeriodTone;
  // The period's own times for the carousel: candle lighting today, the Chanukah candles tonight, a fast's end.
  candleLighting: { at: Date; from: Date } | null;
  fastEnd: { at: Date; from: Date } | null;
};

const addDays = (day: Date, n: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate() + n);

function weekdayOf(instant: Date, tz: string, language: AppLanguage, long = false): string {
  return formatDate(DateTime.fromJSDate(instant, { zone: tz }), long ? 'cccc' : 'ccc', language);
}

function prayerAdditions(features: ReturnType<typeof dayFeatures>, t: Translate): string {
  const f = features.flags;
  const keys: string[] = [];
  if (f.has('roshChodesh') || f.has('cholHamoedPesach') || f.has('cholHamoedSukkot')) keys.push('yaalehVeyavo');
  if (f.has('chanukah') || f.has('purim')) keys.push('alHanissim');
  if (f.has('aseretYemeiTeshuva')) keys.push('hamelech');
  if (f.has('publicFast')) keys.push('aneinu');
  if (f.has('hallelWhole')) keys.push('hallelWhole');
  else if (f.has('hallelHalf')) keys.push('hallelHalf');
  if (f.has('musaf')) keys.push('musaf');
  if (!keys.length && f.has('torahReading')) keys.push('torah');
  if (!keys.length) keys.push(f.has('talUmatar') ? 'talUmatar' : 'veten');
  return keys
    .slice(0, 3)
    .map((key) => t(`home.card.add.${key}`))
    .join(' · ');
}

function tehillimRange(weekday: number, language: AppLanguage, t: Translate): string {
  const [from, to] = TEHILLIM_DAYS[weekday];
  const show = (n: number) => (language === 'he' ? gematriya(n).replace(/[׳״']/g, '') : String(n));
  return t('home.card.tehillimRange', { from: show(from), to: show(to) });
}

// The next Shabbat or Yom Tov that has not ended, within a week.
function nextBlock(now: Date, location: Location): HolyBlock | null {
  const today = appDay(now, location);
  for (let i = 0; i < 8; i++) {
    const block = HebcalService.holyBlockOn(locationNoon(addDays(today, i), location), location);
    if (block && block.end.getTime() > now.getTime()) return block;
  }
  return null;
}

const blockSaturday = (block: HolyBlock): Date | null => {
  const key = block.days.find((k) => new Date(`${k}T12:00:00`).getDay() === 6);
  return key ? new Date(`${key}T00:00:00`) : null;
};

export function homeCard(input: CardInput): CardModel {
  const { now, location, language, t } = input;
  const tz = location.tz;
  const place = siddurPlace(location, input.inIsrael);
  const today = appDay(now, location);
  const z = ZmanimService.getZmanim(locationNoon(today, location), location);
  const hd = HebcalService.hebrewDayAt(now, location);
  const features = dayFeatures(hd, place);
  const night = z ? now.getTime() >= z.shkia.getTime() : false;
  const locale = language === 'he' ? 'he-x-NoNikud' : 'en';

  // The day.
  const block = nextBlock(now, location);
  const startsToday = (b: HolyBlock) =>
    DateTime.fromJSDate(b.start, { zone: tz }).toISODate() ===
    DateTime.fromJSDate(locationNoon(today, location), { zone: tz }).toISODate();
  const erev = block && startsToday(block) && now.getTime() < block.start.getTime() ? block : null;
  const erevSat = erev ? blockSaturday(erev) : null;
  // The day's occasion by the location's date, so tonight's Chanukah candles keep their count after shkia.
  const holiday = (HebcalService.getHolidays(today, location, locale)[0] ?? null)?.replace(': ', ' · ') ?? null;
  const omer = features.omerDay ?? null;
  const selichot = matchesCondition(
    standaloneAvailability('selichot', input.nusach).available,
    dayFeatures(HebcalService.hebrewNightAt(now, location), place),
  );
  const hilulot = hilulotOn(hd, input.inIsrael).map((h) => h.name[language]);
  let title: string;
  let icon: IconName = 'calendar';
  let special = true;
  if (erev) {
    const parasha = erevSat ? HebcalService.getParasha(erevSat, location, locale) : undefined;
    title = parasha ? t('home.card.erevShabbat', { parasha }) : t('home.card.erevYomTov');
    icon = 'candles';
  } else if (holiday) {
    title = holiday;
    icon = features.flags.has('chanukah') ? 'chanukiah' : features.flags.has('roshChodesh') ? 'moon' : 'calendar';
  } else if (omer) {
    title = t(night ? 'home.card.omerTonight' : 'home.card.omerToday', { n: omer });
    icon = 'omer';
  } else if (selichot) {
    title = t('home.card.selichot');
    icon = 'shofar';
  } else if (hilulot.length) {
    title = t('home.card.hilula', { names: hilulot.join(language === 'he' ? ' ו' : ' and ') });
    icon = 'hilula';
  } else {
    title = weekdayOf(now, tz, language, true);
    special = false;
  }
  const klOpen =
    input.kiddushLevana && input.kiddushLevana.start.getTime() <= now.getTime() ? input.kiddushLevana : null;
  const second: CardFact = input.habit
    ? {
        label: t(`home.card.learned.${input.habit.id}`),
        value: t(`home.card.learned.${input.habit.id}.value`, input.habit),
      }
    : klOpen
      ? {
          label: t('home.card.kl'),
          value: t('home.card.klOpenUntil', { weekday: weekdayOf(klOpen.end, tz, language) }),
        }
      : omer && title !== t(night ? 'home.card.omerTonight' : 'home.card.omerToday', { n: omer })
        ? { label: t('home.card.omer'), value: String(omer) }
        : { label: t('home.card.tehillim'), value: tehillimRange(hd.getDay(), language, t) };
  const day: CardPage = {
    id: 'day',
    title,
    icon,
    facts: [{ label: t('home.card.prayer'), value: prayerAdditions(features, t) }, second],
  };

  // The week: the parasha, Shabbat's entry and exit, then Mevarchim, the Shabbat's name or what comes this week.
  const sat = block ? blockSaturday(block) : null;
  const parasha = sat ? HebcalService.getParasha(sat, location, locale) : undefined;
  const weekFacts: CardFact[] = [];
  if (block) {
    const entry = erev
      ? t('home.card.in', { time: formatRemaining(block.start.getTime() - now.getTime(), t) })
      : t('home.card.dayTime', { weekday: weekdayOf(block.start, tz, language), time: clockOf(block.start, tz) });
    weekFacts.push(
      { label: t('home.card.entry'), value: entry },
      {
        label: t('home.card.exit'),
        value: t('home.card.dayTime', { weekday: weekdayOf(block.end, tz, language), time: clockOf(block.end, tz) }),
      },
    );
  }
  let extra: CardFact | null = null;
  if (sat) {
    const satHd = new HDate(sat);
    for (let i = 1; i <= 7 && !extra; i++) {
      const d = satHd.add(i, 'd');
      if (!startsRoshChodesh(d)) continue;
      const first = roshChodeshMonth(d);
      if (first.getMonth() === months.TISHREI) break;
      const molad = new Molad(first.getFullYear(), first.getMonth());
      const weekday = t(`weekday.long.${molad.getDow()}`).replace(/^יום /, '');
      extra = {
        label: t('home.card.mevarchim'),
        value: t('home.card.molad', {
          month: roshChodeshLabel(first, language),
          weekday,
          time: `${String(molad.getHour()).padStart(2, '0')}:${String(molad.getMinutes()).padStart(2, '0')}`,
          chalakim: molad.getChalakim(),
        }),
      };
    }
    if (!extra) {
      const named = HebrewCalendar.calendar({ start: sat, end: sat, il: location.inIsrael }).find(
        (e) => e.getFlags() & flags.SPECIAL_SHABBAT,
      );
      if (named) extra = { label: t('home.card.special'), value: named.render(locale) };
    }
  }
  for (let i = 1; i <= 7 && !extra; i++) {
    const date = addDays(today, i);
    const dHd = new HDate(date);
    const f = dayFeatures(dHd, place).flags;
    const weekday = formatDate(date, 'cccc', language);
    if (startsRoshChodesh(dHd))
      extra = {
        label: t('home.card.soon.rc'),
        value: t('home.card.soonOn', { name: roshChodeshLabel(roshChodeshMonth(dHd), language), weekday }),
      };
    else if (chanukahDay(dHd) === 1)
      extra = {
        label: t('home.card.soon.chanukah'),
        value: t('home.card.soonChanukah', { weekday: formatDate(addDays(date, -1), 'cccc', language) }),
      };
    else if (f.has('publicFast')) {
      const name = HebcalService.getHolidays(date, location, locale)[0];
      if (name) extra = { label: t('home.card.soon.fast'), value: t('home.card.soonOn', { name, weekday }) };
    }
  }
  if (extra) weekFacts.push(extra);
  const week: CardPage = {
    id: 'week',
    title:
      parasha ??
      (block
        ? (HebcalService.getHolidays(new Date(`${block.days[0]}T00:00:00`), location, locale)[0] ??
          t('home.card.weekPlain'))
        : t('home.card.weekPlain')),
    icon: 'calendar',
    facts: weekFacts.slice(0, 3),
  };

  // Mine: every fact the user chose shows, with a plain value when it has nothing near (the owner's report of
  // 2026-11-10: a chosen fact that only showed when relevant looked like a choice that did not work).
  const mineFact = (id: MineFactId): CardFact | null => {
    switch (id) {
      case 'toShabbat':
        return block && block.start.getTime() > now.getTime()
          ? { label: t('home.card.mine.toShabbat'), value: formatRemaining(block.start.getTime() - now.getTime(), t) }
          : null;
      case 'kiddushLevana':
        return {
          label: t('home.card.kl'),
          value: klOpen
            ? t('home.card.klOpenUntil', { weekday: weekdayOf(klOpen.end, tz, language) })
            : input.kiddushLevana
              ? t('home.card.klOpens', { weekday: weekdayOf(input.kiddushLevana.start, tz, language, true) })
              : t('home.card.klNone'),
        };
      case 'hilula': {
        const next = upcomingHilulot(hd, input.inIsrael).find((h) => !hilulot.includes(h.hilula.name[language]));
        if (!next) return null;
        const days = next.day.abs() - hd.abs();
        const when =
          days === 0
            ? t('home.card.today')
            : days < 7
              ? formatDate(next.day.greg(), 'cccc', language)
              : formatDate(next.day.greg(), language === 'he' ? 'd LLLL' : 'LLLL d', language);
        return {
          label: t('home.card.mine.hilula'),
          value: t('home.card.soonOn', { name: next.hilula.name[language], weekday: when }),
        };
      }
      case 'tehillim':
        return { label: t('home.card.tehillim'), value: tehillimRange(hd.getDay(), language, t) };
      case 'pins':
        return {
          label: t('home.card.mine.pins'),
          value: input.pinNames.length ? input.pinNames.join(' · ') : t('home.card.pinsNone'),
        };
    }
  };
  const mineFacts = input.mine
    .map(mineFact)
    .filter((f): f is CardFact => f !== null)
    .slice(0, MINE_MAX);
  const mine: CardPage = {
    id: 'mine',
    title: t('home.card.page.mine'),
    icon: 'star',
    facts: mineFacts.length ? mineFacts : [{ label: t('home.card.mineEmpty'), value: t('home.card.mineHint') }],
  };

  // The smart page: the day when it is special or the marks taught something, the week from Thursday night.
  const civilWeekday = DateTime.fromJSDate(now, { zone: tz }).weekday % 7;
  const thursdayNight = civilWeekday === 4 && z !== null && now.getTime() >= z.tzeitHakochavim.getTime();
  const smart: CardPageId = special || input.habit ? 'day' : thursdayNight || civilWeekday === 5 ? 'week' : 'day';

  const tone = z
    ? periodTone(
        now,
        { netz: z.netzHaChama, chatzot: z.chatzot, plag: z.plagHaMincha, tzeit: z.tzeitHakochavim },
        {
          erev: erev !== null,
          chanukah: features.flags.has('chanukah'),
          fast: features.flags.has('publicFast'),
          roshChodesh: features.flags.has('roshChodesh'),
        },
      )
    : 'night';

  return {
    pages: { day, week, mine },
    smart,
    tone,
    candleLighting: erev && z ? { at: erev.start, from: z.plagHaMincha } : null,
    fastEnd:
      features.flags.has('publicFast') && !features.flags.has('yomKippur') && z && !night
        ? { at: z.tzeitTaanit, from: z.alotHaShachar }
        : null,
  };
}

// The marks of the last days, for the habits: when each Shacharit and Mincha was marked against that day's time.
export function markHistory(
  completions: Readonly<Record<string, Readonly<Record<string, number>>>>,
  now: Date,
  location: Location,
  ks: 'GRA' | 'MA',
  days = 7,
): {
  shacharit: { mark: number | undefined; after: Date | null }[];
  mincha: { mark: number | undefined; after: Date | null }[];
} {
  const today = appDay(now, location);
  const shacharit: { mark: number | undefined; after: Date | null }[] = [];
  const mincha: { mark: number | undefined; after: Date | null }[] = [];
  for (let i = 1; i <= days; i++) {
    const day = addDays(today, -i);
    const key = DateTime.fromJSDate(day).toISODate() ?? '';
    const z = ZmanimService.getZmanim(locationNoon(day, location), location);
    shacharit.push({
      mark: completions[key]?.shacharit,
      after: z ? (ks === 'MA' ? z.sofZmanShmaMA : z.sofZmanShmaGra) : null,
    });
    mincha.push({ mark: completions[key]?.mincha, after: z ? z.plagHaMincha : null });
  }
  return { shacharit, mincha };
}
