jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

jest.mock('@/services/notifications/ids', () => ({
  ...jest.requireActual('@/services/notifications/ids'),
  HORIZON_MAX_DAYS: 2,
}));
jest.mock('@/services/notifications/planners/horizonEnd', () => ({ planHorizonEnd: () => [] }));

import { DateTime } from 'luxon';
import { buildPlan } from '../plan';
import { nagPreview, nextReminderAt, planMitzvot } from '../planners/mitzvot';
import { horizonFor } from '../planners/horizon';
import { parseId } from '../ids';
import type { PlanInput, ScheduleCandidate } from '../types';
import { CITIES } from '@/data/cities';
import { MITZVOT } from '@/data/mitzvot';
import { rulesFor } from '@/data/taharahPresets';
import { DEFAULT_HILULA_NOTICES, DEFAULT_ROSH_CHODESH_NOTICES } from '@/stores/useUserStore';
import { at } from '@/testing/zmanim';
import type { Mitzvah, NagLevel, Reminder, ReminderNag, UserSettings } from '@/types/mitzvah';
import type { QuietHours } from '@/utils/quietHours';

const J = CITIES[0];
const ALL_NUSCHAOT: Mitzvah['nuschaotSupported'] = ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'];
const SETTINGS: UserSettings = { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };
// Wednesday 2026-11-11, a plain weekday in Jerusalem.
const NIGHT_BEFORE = at(J, '2026-11-11T00:30');
const MIN = 60_000;

const registry = (id: string) => MITZVOT.find((m) => m.id === id)!;
const SHACHARIT = registry('shacharit');
const BEDTIME_SHEMA = registry('krias_shma_al_hamita');
const CANDLES = registry('candle_lighting');

const r = (anchor: Reminder['anchor'], offsetMin: number, nag?: ReminderNag | null): Reminder => ({
  anchor,
  offsetMin,
  label: 'x',
  ...(nag !== undefined ? { nag } : {}),
});

// A window from `startMin` to `endMin` minutes after the location's midnight of every day, or of
// `onlyOn` alone.
function fixture(
  id: string,
  startMin: number,
  endMin: number,
  reminders: Reminder[],
  extra: Partial<Mitzvah> & { onlyOn?: string } = {},
): Mitzvah {
  const { onlyOn, ...rest } = extra;
  return {
    id,
    name: { he: id, en: id },
    icon: 'custom',
    timeType: 'range-within-day',
    category: 'daily-morning',
    group: 'mine',
    skipOn: [],
    nuschaotSupported: ALL_NUSCHAOT,
    defaultReminders: reminders,
    computeWindow: ({ zmanim, location }) => {
      const midnight = DateTime.fromJSDate(zmanim.chatzot, { zone: location.tz }).startOf('day');
      if (onlyOn && midnight.toISODate() !== onlyOn) return null;
      return {
        start: midnight.plus({ minutes: startMin }).toJSDate(),
        end: midnight.plus({ minutes: endMin }).toJSDate(),
      };
    },
    ...rest,
  };
}

type Options = {
  level?: NagLevel;
  levels?: Record<string, NagLevel>;
  overrides?: Record<string, Reminder[]>;
  quietHours?: QuietHours;
  completions?: PlanInput['completions'];
  platform?: PlanInput['platform'];
};

function planInput(mitzvot: Mitzvah[], now: Date, options: Options = {}): PlanInput {
  return {
    now,
    fromDate: now,
    platform: options.platform ?? 'android',
    hasPermission: true,
    language: 'he',
    location: J,
    settings: SETTINGS,
    mitzvot,
    reminderOverrides: options.overrides ?? {},
    ...(options.level ? { nagLevel: options.level } : {}),
    ...(options.levels ? { nagLevels: options.levels } : {}),
    completions: options.completions ?? {},
    skipped: {},
    checkIns: {},
    enabledSince: {},
    hilulotEnabled: false,
    roshChodeshEnabled: false,
    hilulaNotices: DEFAULT_HILULA_NOTICES,
    roshChodeshNotices: DEFAULT_ROSH_CHODESH_NOTICES,
    weeklyReportEnabled: false,
    taharahEnabled: false,
    taharah: {
      events: [],
      settings: { preset: 'ashkenaz', rules: rulesFor('ashkenaz'), role: 'woman' },
      discreet: true,
      leads: { hefsekLeadMin: 90, bedikaEveningLeadMin: 60, tevilaPrepLeadMin: 180 },
    },
    ...(options.quietHours ? { quietHours: options.quietHours } : {}),
  };
}

const plan = (mitzvot: Mitzvah[], now: Date, options?: Options) => buildPlan(planInput(mitzvot, now, options));
const of = (candidates: ScheduleCandidate[], id: string, day?: string) =>
  candidates.filter((c) => c.id.startsWith(`${id}__${day ?? ''}`));
const pairs = (candidates: ScheduleCandidate[]) => candidates.map((c) => [c.id, c.trigger.getTime()]);
const clock = (instant: string) => at(J, instant).getTime();

describe('a level’s repeats', () => {
  it('nags after Shacharit’s start reminder and before its before-the-end one at level 3', () => {
    const base = of(plan([SHACHARIT], NIGHT_BEFORE), 'shacharit', '2026-11-11');
    expect(base.map((c) => c.id)).toEqual(['shacharit__2026-11-11__0', 'shacharit__2026-11-11__1']);
    const [start, end] = base.map((c) => c.trigger.getTime());

    const nagged = of(plan([SHACHARIT], NIGHT_BEFORE, { level: 3 }), 'shacharit', '2026-11-11');
    expect(pairs(nagged)).toEqual([
      ['shacharit__2026-11-11__0', start],
      ['shacharit__2026-11-11__0~1', start + 5 * MIN],
      ['shacharit__2026-11-11__0~2', start + 10 * MIN],
      ['shacharit__2026-11-11__1~1', end - 10 * MIN],
      ['shacharit__2026-11-11__1~2', end - 5 * MIN],
      ['shacharit__2026-11-11__1', end],
    ]);

    const main = nagged[0];
    const [first, second] = nagged.slice(1, 3);
    expect(first.body).toBe(`${main.body} · תזכורת 1 מתוך 2`);
    expect(second.body).toBe(`${main.body} · תזכורת 2 מתוך 2`);
    expect(first.data).toMatchObject({ reminderIndex: 0, repeat: { k: 1, of: 2 }, dateKey: '2026-11-11' });
    expect(main.data.repeat).toBeUndefined();
    expect(first.categoryIdentifier).toBe(main.categoryIdentifier);
    expect(first.data.hasText).toBe(main.data.hasText);
    expect(first.data.skipIfDone).toBe(main.data.skipIfDone);
    expect(parseId(first.id)).toEqual({ mitzvahId: 'shacharit', date: '2026-11-11', idx: 0 });
  });

  it('takes a mitzvah’s own level over the app’s', () => {
    const own = of(plan([SHACHARIT], NIGHT_BEFORE, { level: 1, levels: { shacharit: 4 } }), 'shacharit', '2026-11-11');
    expect(own).toHaveLength(8);
    const quiet = of(
      plan([SHACHARIT], NIGHT_BEFORE, { level: 4, levels: { shacharit: 1 } }),
      'shacharit',
      '2026-11-11',
    );
    expect(quiet).toHaveLength(2);
  });

  it('nags the bedtime Shema’s 23:00 reminder only before it', () => {
    const shema = of(plan([BEDTIME_SHEMA], NIGHT_BEFORE, { level: 3 }), 'krias_shma_al_hamita', '2026-11-11');
    expect(pairs(shema)).toEqual([
      ['krias_shma_al_hamita__2026-11-11__0~1', clock('2026-11-11T22:50')],
      ['krias_shma_al_hamita__2026-11-11__0~2', clock('2026-11-11T22:55')],
      ['krias_shma_al_hamita__2026-11-11__0', clock('2026-11-11T23:00')],
    ]);
  });

  it('sends nothing more at level 1', () => {
    const level1 = plan([SHACHARIT, BEDTIME_SHEMA], NIGHT_BEFORE, { level: 1 });
    expect(level1.length).toBeGreaterThan(0);
    expect(level1.filter((c) => c.id.includes('~'))).toEqual([]);
    expect(pairs(level1)).toEqual(pairs(plan([SHACHARIT, BEDTIME_SHEMA], NIGHT_BEFORE)));
  });
});

describe('a reminder’s own nag', () => {
  it('splits an around nag of 3 every 5 minutes one before and two after', () => {
    const start = of(plan([SHACHARIT], NIGHT_BEFORE), 'shacharit', '2026-11-11')[0].trigger.getTime();
    const overrides = {
      shacharit: [{ ...SHACHARIT.defaultReminders[0], nag: { count: 3, everyMin: 5, placement: 'around' as const } }],
    };
    expect(pairs(of(plan([SHACHARIT], NIGHT_BEFORE, { overrides }), 'shacharit', '2026-11-11'))).toEqual([
      ['shacharit__2026-11-11__0~1', start - 5 * MIN],
      ['shacharit__2026-11-11__0', start],
      ['shacharit__2026-11-11__0~2', start + 5 * MIN],
      ['shacharit__2026-11-11__0~3', start + 10 * MIN],
    ]);
  });

  it('exempts a reminder whose nag is null from the level', () => {
    const overrides = { shacharit: [{ ...SHACHARIT.defaultReminders[0], nag: null }, SHACHARIT.defaultReminders[1]] };
    const ids = of(plan([SHACHARIT], NIGHT_BEFORE, { level: 4, overrides }), 'shacharit', '2026-11-11').map(
      (c) => c.id,
    );
    expect(ids.filter((id) => id.includes('__0'))).toEqual(['shacharit__2026-11-11__0']);
    expect(ids.filter((id) => id.includes('__1'))).toHaveLength(4);
  });

  it('drops a repeat after the end of the time', () => {
    const late = fixture('late', 300, 360, [r('start', 50, { count: 3, everyMin: 5, placement: 'after' })]);
    expect(pairs(of(plan([late], NIGHT_BEFORE), 'late', '2026-11-11'))).toEqual([
      ['late__2026-11-11__0', clock('2026-11-11T05:50')],
      ['late__2026-11-11__0~1', clock('2026-11-11T05:55')],
      ['late__2026-11-11__0~2', clock('2026-11-11T06:00')],
    ]);
  });

  it('keeps a follow-up’s repeats inside its 720 minutes after the end', () => {
    const follow = fixture('follow', 300, 360, [r('followUp', 30, { count: 3, everyMin: 15, placement: 'before' })]);
    expect(pairs(of(plan([follow], NIGHT_BEFORE), 'follow', '2026-11-11'))).toEqual([
      ['follow__2026-11-11__0~3', clock('2026-11-11T06:15')],
      ['follow__2026-11-11__0', clock('2026-11-11T06:30')],
    ]);
    const after = fixture('after', 300, 360, [r('followUp', 30)]);
    expect(pairs(of(plan([after], NIGHT_BEFORE, { level: 3 }), 'after', '2026-11-11'))).toEqual([
      ['after__2026-11-11__0', clock('2026-11-11T06:30')],
      ['after__2026-11-11__0~1', clock('2026-11-11T06:35')],
      ['after__2026-11-11__0~2', clock('2026-11-11T06:40')],
    ]);
  });

  it('keeps one notification when a repeat lands on another reminder of the mitzvah, the main', () => {
    const twins = fixture('twins', 480, 720, [r('start', 0), r('start', 10)]);
    expect(pairs(of(plan([twins], NIGHT_BEFORE, { level: 3 }), 'twins', '2026-11-11'))).toEqual([
      ['twins__2026-11-11__0', clock('2026-11-11T08:00')],
      ['twins__2026-11-11__0~1', clock('2026-11-11T08:05')],
      ['twins__2026-11-11__1', clock('2026-11-11T08:10')],
      ['twins__2026-11-11__1~1', clock('2026-11-11T08:15')],
      ['twins__2026-11-11__1~2', clock('2026-11-11T08:20')],
    ]);
  });
});

describe('repeats under the engine’s rules', () => {
  it('counts a moved main’s repeats from where it goes out, and folds a before chain into it', () => {
    const quietHours: QuietHours = { before: 420, after: null };
    const morning = fixture('morning', 300, 720, [r('start', 0)]);
    expect(pairs(of(plan([morning], NIGHT_BEFORE, { level: 3, quietHours }), 'morning', '2026-11-11'))).toEqual([
      ['morning__2026-11-11__0', clock('2026-11-11T07:00')],
      ['morning__2026-11-11__0~1', clock('2026-11-11T07:05')],
      ['morning__2026-11-11__0~2', clock('2026-11-11T07:10')],
    ]);
    const closing = fixture('closing', 300, 480, [r('end', -90)]);
    expect(pairs(of(plan([closing], NIGHT_BEFORE, { level: 3, quietHours }), 'closing', '2026-11-11'))).toEqual([
      ['closing__2026-11-11__0', clock('2026-11-11T07:00')],
    ]);
  });

  it('drops a level’s repeats after candle lighting, inside Shabbat, and keeps a before chain', () => {
    const friday = at(J, '2026-11-13T08:00');
    const lighting = of(plan([CANDLES], friday), 'candle_lighting', '2026-11-13');
    expect(lighting).toHaveLength(1);
    expect(of(plan([CANDLES], friday, { level: 4 }), 'candle_lighting', '2026-11-13').map((c) => c.id)).toEqual([
      'candle_lighting__2026-11-13__0',
    ]);
    const lit = lighting[0].trigger.getTime();
    const overrides = { candle_lighting: [r('start', 0, { count: 2, everyMin: 5, placement: 'before' })] };
    expect(pairs(of(plan([CANDLES], friday, { overrides }), 'candle_lighting', '2026-11-13'))).toEqual([
      ['candle_lighting__2026-11-13__0~1', lit - 10 * MIN],
      ['candle_lighting__2026-11-13__0~2', lit - 5 * MIN],
      ['candle_lighting__2026-11-13__0', lit],
    ]);
  });

  it('plans nothing for a marked day', () => {
    const completions = { '2026-11-11': { shacharit: Date.now() } };
    expect(of(plan([SHACHARIT], NIGHT_BEFORE, { level: 4, completions }), 'shacharit', '2026-11-11')).toEqual([]);
    expect(of(plan([SHACHARIT], NIGHT_BEFORE, { level: 4, completions }), 'shacharit', '2026-11-12')).toHaveLength(8);
  });

  it('keeps the repeats still due after the main has gone out', () => {
    const start = of(plan([SHACHARIT], NIGHT_BEFORE), 'shacharit', '2026-11-11')[0].trigger;
    const after = new Date(start.getTime() + 2 * MIN);
    expect(of(plan([SHACHARIT], after, { level: 3 }), 'shacharit', '2026-11-11__0').map((c) => c.id)).toEqual([
      'shacharit__2026-11-11__0~1',
      'shacharit__2026-11-11__0~2',
    ]);
  });

  it('numbers the repeats of every block exit of a multi-day window', () => {
    const month = fixture('month', 300, 300 + 14 * 1440, [r('blockExit', 15)], {
      onlyOn: '2026-11-11',
      multiDay: { maxDays: 16 },
    });
    const ids = of(plan([month], NIGHT_BEFORE, { level: 2 }), 'month').map((c) => c.id);
    expect(ids).toEqual([
      'month__2026-11-11__0',
      'month__2026-11-11__0~1',
      'month__2026-11-11__0.1',
      'month__2026-11-11__0.1~1',
    ]);
  });

  it('keeps mains only where the plan is thinned', () => {
    const input = planInput([SHACHARIT], NIGHT_BEFORE, { level: 4 });
    const horizon = horizonFor(input.fromDate, J);
    const thinned = planMitzvot(input, horizon, horizon.days[0]);
    expect(thinned.length).toBeGreaterThan(0);
    expect(thinned.every((c) => !c.id.includes('~'))).toBe(true);
    expect(new Set(thinned.map((c) => c.data.dateKey)).size).toBe(thinned.length);
  });
});

describe('the previews agree with the plan', () => {
  it('names a repeat as the next reminder once its main has gone out', () => {
    const start = of(plan([SHACHARIT], NIGHT_BEFORE), 'shacharit', '2026-11-11')[0].trigger;
    const now = new Date(start.getTime() + MIN);
    const input = planInput([SHACHARIT], now, { level: 3 });
    const first = of(buildPlan(input), 'shacharit')[0];
    const scope = { ...input, nagLevel: 3 as const };
    expect(nextReminderAt(SHACHARIT, SHACHARIT.defaultReminders, scope)).toEqual(first.trigger);
    expect(first.id).toBe('shacharit__2026-11-11__0~1');
    expect(nextReminderAt(SHACHARIT, SHACHARIT.defaultReminders, { ...input, nagLevel: 1 })).toEqual(
      of(buildPlan({ ...input, nagLevel: 1 }), 'shacharit')[0].trigger,
    );
  });

  it('lists the plan’s repeats and flags the one the plan drops', () => {
    const draft = r('start', 50, { count: 3, everyMin: 5, placement: 'after' });
    const late = fixture('late', 300, 360, [draft]);
    const input = planInput([late], NIGHT_BEFORE);
    expect(nagPreview(late, draft, input)).toEqual([
      { trigger: at(J, '2026-11-11T05:55'), fires: true, afterEnd: false },
      { trigger: at(J, '2026-11-11T06:00'), fires: true, afterEnd: false },
      { trigger: at(J, '2026-11-11T06:05'), fires: false, afterEnd: true },
    ]);
    const kept = of(buildPlan(input), 'late', '2026-11-11').filter((c) => c.data.repeat);
    expect(kept.map((c) => c.trigger)).toEqual(
      nagPreview(late, draft, input)
        .filter((entry) => entry.fires)
        .map((entry) => entry.trigger),
    );
  });

  it('previews a level’s preset, a folded repeat, and nothing without a nag', () => {
    const closing = fixture('closing', 300, 480, [r('end', -90)]);
    const scope = {
      ...planInput([closing], NIGHT_BEFORE),
      quietHours: { before: 420, after: null },
      nagLevel: 3 as const,
    };
    expect(nagPreview(closing, closing.defaultReminders[0], scope)).toEqual([
      { trigger: at(J, '2026-11-11T07:00'), fires: false, afterEnd: false },
      { trigger: at(J, '2026-11-11T07:00'), fires: false, afterEnd: false },
    ]);
    expect(nagPreview(closing, closing.defaultReminders[0], { ...scope, nagLevel: 1 })).toEqual([]);
    const never = fixture('never', 300, 360, [r('start', 120)]);
    expect(nagPreview(never, never.defaultReminders[0], { ...scope, nagLevel: 4 })).toEqual([]);
  });
});
