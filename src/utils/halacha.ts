import { HDate, gematriya, months } from '@hebcal/core';
import { FESTIVAL_KEYS, FESTIVAL_PERIOD_DAYS } from '@/data/halacha';
import { FestivalKey, FestivalPeriod, HalachaManifest, HalachaPiece, HalachaPortion } from '@/types/halacha';
import { chokParashiyot } from '@/utils/chok';

// Which halacha a Hebrew day reads (.claude/specs/halacha-yomit.md, sections 6 and 7), pure over a track's manifest.
// The caller turns a location day into its Hebrew day (`civilHebrewDayAt(locationNoon(day))`), as Chok LeYisrael does.

export type BenIshChaiYear = 1 | 2;

type Schedule = Pick<HalachaManifest, 'schedule' | 'units'>;

const SATURDAY = 6;
const WEEK_DAYS = 7;

const number = (n: number) => gematriya(n).replace(/[׳״]/g, '');

// Two portions read on one day (the 29th of a short Kislev reads the 30th too): their pieces in order, a run of one
// unit joined.
function joined(first: HalachaPortion, second: HalachaPortion): HalachaPortion {
  const pieces: HalachaPiece[] = first.pieces.map((piece) => ({ ...piece }));
  for (const piece of second.pieces) {
    const last = pieces[pieces.length - 1];
    if (last && last.u === piece.u && last.to === piece.from - 1) last.to = piece.to;
    else pieces.push({ ...piece });
  }
  return {
    label: { he: `${first.label.he}; ${second.label.he}`, en: `${first.label.en}; ${second.label.en}` },
    pieces,
  };
}

// The Kitzur luach by Hebrew month and day (spec 6.1): a leap year reads its review in Adar I and the luach's Adar in
// Adar II; a short Kislev reads days 29 and 30 together; a long Cheshvan's 30th and 15 Elul read nothing.
function luachPortion(day: HDate, schedule: Extract<HalachaManifest['schedule'], { kind: 'hebrew' }>) {
  const month = day.getMonth();
  const date = day.getDate();
  const leap = day.isLeapYear();
  const list =
    leap && month === months.ADAR_I
      ? schedule.leapReview
      : schedule.months[leap && month === months.ADAR_II ? 'Adar' : day.getMonthName()];
  const portion = list?.[date - 1] ?? null;
  const shortKislev = month === months.KISLEV && HDate.daysInMonth(months.KISLEV, day.getFullYear()) === 29;
  const next = shortKislev && date === 29 ? list?.[29] : null;
  return portion && next ? joined(portion, next) : portion;
}

// The Daily Rambam: the cycle's day counted from its anchor (a `YYYY-MM-DD` civil date).
function cyclePortion(day: HDate, schedule: Extract<HalachaManifest['schedule'], { kind: 'cycle' }>) {
  const [y, m, d] = schedule.anchor.split('-').map(Number);
  const anchor = new HDate(new Date(y, m - 1, d)).abs();
  const length = schedule.days.length;
  return schedule.days[(((day.abs() - anchor) % length) + length) % length] ?? null;
}

// Ben Ish Chai: the halachot of the week's parasha (both, in a double week) of the year chosen, spread evenly over the
// week, Sunday to Shabbat (spec 6.2). A parasha the year lacks reads the first year's (Q30's proposal).
function parashaPortion(
  day: HDate,
  { schedule, units }: Schedule,
  inIsrael: boolean,
  year: BenIshChaiYear,
): HalachaPortion | null {
  if (schedule.kind !== 'parasha') return null;
  const ids: string[] = [];
  for (const parasha of chokParashiyot(day.onOrAfter(SATURDAY), inIsrael)) {
    const entry = schedule.parashiyot[parasha];
    const id = entry?.[`${year}`] ?? entry?.['1'];
    if (id && !ids.includes(id) && units[id]) ids.push(id);
  }
  const total = ids.reduce((sum, id) => sum + units[id].count, 0);
  const weekday = day.getDay();
  const from = Math.floor((weekday * total) / WEEK_DAYS);
  const to = Math.floor(((weekday + 1) * total) / WEEK_DAYS) - 1;
  if (to < from) return null;
  const pieces: HalachaPiece[] = [];
  let offset = 0;
  for (const id of ids) {
    const count = units[id].count;
    const a = Math.max(from, offset);
    const b = Math.min(to, offset + count - 1);
    if (a <= b) pieces.push({ u: id, from: a - offset, to: b - offset });
    offset += count;
  }
  const first = pieces[0];
  const last = pieces[pieces.length - 1];
  const at = (index: number) => ({ he: number(index + 1), en: `${index + 1}` });
  if (first.u === last.u) {
    const one = first.from === last.to;
    const unit = units[first.u];
    return {
      label: {
        he: `${unit.he}, ${one ? 'הלכה' : 'הלכות'} ${number(first.from + 1)}${one ? '' : `–${number(last.to + 1)}`}`,
        en: `${unit.en}, ${one ? 'halacha' : 'halachot'} ${first.from + 1}${one ? '' : `–${last.to + 1}`}`,
      },
      pieces,
    };
  }
  const a = at(first.from);
  const b = at(last.to);
  return {
    label: {
      he: `${units[first.u].he} ${a.he} – ${units[last.u].he} ${b.he}`,
      en: `${units[first.u].en} ${a.en} – ${units[last.u].en} ${b.en}`,
    },
    pieces,
  };
}

// The portion a Hebrew day reads in a track, or `null` on a day the schedule gives nothing. Ben Ish Chai needs its
// year, which waits for Q30 (`null` reads nothing).
export function halachaPortion(
  day: HDate,
  manifest: Schedule,
  inIsrael: boolean,
  benIshChaiYear: BenIshChaiYear | null = null,
): HalachaPortion | null {
  const { schedule } = manifest;
  if (schedule.kind === 'hebrew') return luachPortion(day, schedule);
  if (schedule.kind === 'cycle') return cyclePortion(day, schedule);
  return benIshChaiYear ? parashaPortion(day, manifest, inIsrael, benIshChaiYear) : null;
}

// A fast moved off Shabbat: deferred to Sunday, or Ta'anit Esther brought forward to Thursday.
function offShabbat(day: HDate, forward: boolean): HDate {
  if (day.getDay() !== SATURDAY) return day;
  return new HDate(day.abs() + (forward ? -2 : 1));
}

// The day of each festival (the observed day of a fast) in a Hebrew year. Purim is 14 Adar everywhere (Adar II in a
// leap year); Shushan Purim has no period of its own.
export function festivalDays(year: number): Record<FestivalKey, HDate> {
  const adar = HDate.isLeapYear(year) ? months.ADAR_II : months.ADAR_I;
  return {
    pesach: new HDate(15, months.NISAN, year),
    shavuot: new HDate(6, months.SIVAN, year),
    sukkot: new HDate(15, months.TISHREI, year),
    rosh_hashanah: new HDate(1, months.TISHREI, year),
    yom_kippur: new HDate(10, months.TISHREI, year),
    chanukah: new HDate(25, months.KISLEV, year),
    purim: new HDate(14, adar, year),
    tisha_bav: offShabbat(new HDate(9, months.AV, year), false),
    tzom_gedaliah: offShabbat(new HDate(3, months.TISHREI, year), false),
    asara_betevet: new HDate(10, months.TEVET, year),
    taanit_esther: offShabbat(new HDate(13, adar, year), true),
    shiva_asar_betammuz: offShabbat(new HDate(17, months.TAMUZ, year), false),
  };
}

// The festival periods a Hebrew day is in (spec 7.1): the days before each festival, ending on its erev, nearest
// festival first.
export function festivalPeriodsOn(day: HDate): FestivalPeriod[] {
  const periods: FestivalPeriod[] = [];
  for (const year of [day.getFullYear(), day.getFullYear() + 1]) {
    const dates = festivalDays(year);
    for (const festival of FESTIVAL_KEYS) {
      const days = FESTIVAL_PERIOD_DAYS[festival];
      const daysLeft = dates[festival].abs() - day.abs();
      if (daysLeft >= 1 && daysLeft <= days) periods.push({ festival, day: days - daysLeft, days, daysLeft });
    }
  }
  return periods.sort((a, b) => a.daysLeft - b.daysLeft);
}

// The festival portions a day reads in a track: each period the track covers, with that day's portion, nearest
// festival first. Material shorter than its period fills the period's last days.
export function festivalPortion(
  day: HDate,
  manifest: Pick<HalachaManifest, 'festivals'>,
): { period: FestivalPeriod; portion: HalachaPortion }[] {
  return festivalPeriodsOn(day).flatMap((period) => {
    const portions = manifest.festivals[period.festival];
    if (!portions?.length) return [];
    const index = period.day - (period.days - portions.length);
    return index >= 0 ? [{ period, portion: portions[index] }] : [];
  });
}
