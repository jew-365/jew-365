import { DateTime } from 'luxon';
import { CustomMitzvah, Mitzvah, MitzvahWindow, Nusach } from '@/types/mitzvah';
import { MITZVOT, findMitzvah as findStaticMitzvah } from '@/data/mitzvot';
import { useCustomMitzvotStore } from '@/stores/useCustomMitzvotStore';
import { dateKey } from '@/stores/useCompletionsStore';
import { appliesOn, categoryForWindow, windowMinutes } from '@/utils/customMitzvah';
import { HebcalService } from '@/services/HebcalService';
import { Location } from '@/types/zmanim';

const ALL_NUSCHAOT: Nusach[] = ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'];

function parseHHMM(value: string): { h: number; m: number } {
  const [hStr, mStr] = (value ?? '').split(':');
  const h = Math.max(0, Math.min(23, Number(hStr) || 0));
  const m = Math.max(0, Math.min(59, Number(mStr) || 0));
  return { h, m };
}

function buildWindow(start: Date, end: Date): MitzvahWindow {
  if (end.getTime() <= start.getTime()) return null;
  return { start, end };
}

function endsBeforeAlot(window: NonNullable<MitzvahWindow>, base: DateTime, location: Location): boolean {
  const alot = HebcalService.dawnAt(base.set({ hour: 12 }).toJSDate(), location);
  return window.end.getTime() <= alot.getTime();
}

export function customToMitzvah(c: CustomMitzvah): Mitzvah {
  const { h: sh, m: sm } = parseHHMM(c.startHHMM);
  const { h: eh, m: em } = parseHHMM(c.endHHMM);
  const windowOn = (base: DateTime): MitzvahWindow => {
    const start = base.set({ hour: sh, minute: sm, second: 0, millisecond: 0 });
    const endsNextDay = eh * 60 + em <= sh * 60 + sm;
    let end = (endsNextDay ? base.plus({ days: 1 }) : base).set({ hour: eh, minute: em, second: 0, millisecond: 0 });
    // On a DST spring-forward day both endpoints can collapse onto the same instant, which used
    // to make the mitzvah silently not exist that day. Preserve the configured duration instead.
    if (end <= start) {
      end = start.plus({ minutes: windowMinutes(c.startHHMM, c.endHHMM) });
    }
    return buildWindow(start.toJSDate(), end.toJSDate());
  };
  return {
    id: c.id,
    name: { he: c.name },
    icon: 'custom',
    timeType: 'range-within-day',
    category: categoryForWindow(c.startHHMM, c.endHHMM),
    group: 'mine',
    skipOn: c.skipOn,
    nuschaotSupported: ALL_NUSCHAOT,
    defaultReminders: c.reminders.map(({ bodyVariants: _dropped, ...reminder }) => reminder),
    contentBlocks: c.contentBlocks,
    isCustom: true,
    computeWindow: ({ date, location }) => {
      // Anchor on the caller's calendar day rather than re-zoning the raw instant: callers pass
      // local midnight (schedule/history) or "now" (home), and re-zoning made those resolve to
      // different days whenever the device zone differed from the location's — so the same custom
      // mitzvah showed up on different days on Home and Schedule.
      if (!appliesOn(c, dateKey(date))) return null;
      const base = DateTime.fromObject(
        { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() },
        { zone: location.tz },
      );
      const own = windowOn(base);
      if (own && !endsBeforeAlot(own, base, location)) return own;
      const nextBase = base.plus({ days: 1 });
      const next = windowOn(nextBase);
      return next && endsBeforeAlot(next, nextBase, location) ? next : null;
    },
  };
}

export function getAllMitzvot(nusach?: Nusach): Mitzvah[] {
  const customs = useCustomMitzvotStore.getState().list().map(customToMitzvah);
  const all = [...MITZVOT, ...customs];
  // `nuschaotSupported` was declared on every mitzvah and read nowhere, so the nusach the user
  // picks in onboarding decided nothing. Honour it wherever the caller knows the nusach.
  return nusach ? all.filter((m) => m.nuschaotSupported.includes(nusach)) : all;
}

export function findAnyMitzvah(id: string): Mitzvah | undefined {
  const fromStatic = findStaticMitzvah(id);
  if (fromStatic) return fromStatic;
  const custom = useCustomMitzvotStore.getState().items[id];
  return custom ? customToMitzvah(custom) : undefined;
}
