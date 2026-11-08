jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

jest.mock('@/services/notifications/ids', () => ({
  ...jest.requireActual('@/services/notifications/ids'),
  HORIZON_MAX_DAYS: 2,
}));
jest.mock('@/services/notifications/planners/horizonEnd', () => ({ planHorizonEnd: () => [] }));
jest.mock('expo-notifications', () => ({
  ...jest.requireActual('expo-notifications'),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
}));

import * as Notifications from 'expo-notifications';
import { buildPlan } from '../plan';
import { contentHash, schedule } from '../os';
import type { PlanInput, ScheduleCandidate } from '../types';
import { CITIES } from '@/data/cities';
import { MITZVOT } from '@/data/mitzvot';
import { rulesFor } from '@/data/taharahPresets';
import { DEFAULT_HILULA_NOTICES, DEFAULT_ROSH_CHODESH_NOTICES } from '@/stores/useUserStore';
import { setLocale, t } from '@/i18n';
import { at } from '@/testing/zmanim';
import type { NagLevel, UserSettings } from '@/types/mitzvah';
import { TIME_STAGE_COLOR, timeLeftLine } from '@/utils/timeLeft';

const J = CITIES[0];
const SETTINGS: UserSettings = { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };
// Wednesday 2026-11-11, a plain weekday in Jerusalem.
const NIGHT_BEFORE = at(J, '2026-11-11T00:30');
const SHACHARIT = MITZVOT.find((m) => m.id === 'shacharit')!;

function planInput(now: Date, nagLevel?: NagLevel, platform: PlanInput['platform'] = 'android'): PlanInput {
  return {
    now,
    fromDate: now,
    platform,
    hasPermission: true,
    language: 'he',
    location: J,
    settings: SETTINGS,
    mitzvot: [SHACHARIT],
    reminderOverrides: {},
    ...(nagLevel ? { nagLevel } : {}),
    completions: {},
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
  };
}

const day = (candidates: ScheduleCandidate[]) => candidates.filter((c) => c.id.startsWith('shacharit__2026-11-11'));

describe('the time-left line of a mitzvah reminder', () => {
  beforeAll(() => setLocale('he'));

  const window = () =>
    SHACHARIT.computeWindow({
      date: at(J, '2026-11-11T12:00'),
      location: J,
      settings: SETTINGS,
      zmanim: require('@/services/ZmanimService').ZmanimService.getZmanim(at(J, '2026-11-11T12:00'), J),
    })!;
  const stageOf = (c: ScheduleCandidate) =>
    (Object.keys(TIME_STAGE_COLOR) as (keyof typeof TIME_STAGE_COLOR)[]).find((s) => TIME_STAGE_COLOR[s] === c.color);

  it('colours the red last point red, the minyan point orange and every other send green, and marks the line to match', () => {
    const candidates = day(buildPlan(planInput(NIGHT_BEFORE, 3, 'ios')));
    const last = candidates[candidates.length - 1];
    expect(last.data.nag?.lastChance).toBe('alone');
    for (const c of candidates) {
      const stage = c === last ? 'red' : c.data.nag?.lastChance ? 'orange' : 'green';
      expect(stageOf(c)).toBe(stage);
      expect(c.subtitle).toBe(timeLeftLine(c.trigger, window(), J.tz, t, stage));
    }
    expect(candidates.some((c) => c.data.nag?.kind === 'zone')).toBe(true);
    expect(candidates.filter((c) => stageOf(c) === 'orange')).toHaveLength(1);
    expect(candidates[0].subtitle).toMatch(/^נשארו .* · עד \d\d:\d\d$/);
    // Shacharit alone takes 20 minutes: its last-chance point is 20 minutes before the end.
    expect(last.subtitle).toMatch(/^❗ נשארו 20 דק' · עד \d\d:\d\d$/);
    expect(last.body).toBe('הזמן האחרון להתחיל להתפלל');
    // A nag's body does not repeat the mitzvah's name, which is its title.
    for (const c of candidates.filter((n) => n.data.nag?.kind === 'zone')) expect(c.body).toBe('עוד לא סימנת');
  });

  it('opens the body on Android, which sends no subtitle, and is the subtitle on the iPhone (round 4 א+ב)', () => {
    const ios = day(buildPlan(planInput(NIGHT_BEFORE, 3, 'ios')));
    const android = day(buildPlan(planInput(NIGHT_BEFORE, 3, 'android')));
    expect(android.map((c) => c.id)).toEqual(ios.map((c) => c.id));
    android.forEach((c, i) => {
      expect(c.subtitle).toBeUndefined();
      expect(c.body).toBe(`${ios[i].subtitle}\n${ios[i].body}`);
      expect(c.color).toBe(ios[i].color);
    });
    expect(android[android.length - 1].body).toMatch(/^❗ נשארו 20 דק' · עד \d\d:\d\d\nהזמן האחרון להתחיל להתפלל$/);
  });

  it('keeps the stages on both platforms once some are past or marked', () => {
    const all = day(buildPlan(planInput(NIGHT_BEFORE, 3)));
    const lastAt = all[all.length - 1].trigger;
    for (const platform of ['ios', 'android'] as const) {
      const later = day(buildPlan(planInput(new Date(lastAt.getTime() - 60_000), 3, platform)));
      expect(later).toHaveLength(1);
      expect((platform === 'ios' ? later[0].subtitle : later[0].body)?.startsWith('❗ ')).toBe(true);
      expect(later[0].color).toBe(TIME_STAGE_COLOR.red);
    }
  });

  it('marks the minyan point orange and the point alone red, and leaves a reminder after them plain', () => {
    const single = {
      ...planInput(NIGHT_BEFORE, 1, 'ios'),
      reminderOverrides: { shacharit: [{ anchor: 'start' as const, offsetMin: 0, label: 'x' }] },
    };
    const [reminder, opener, minyan, alone] = day(buildPlan(single));
    expect(opener.data.nag?.kind).toBe('open');
    expect([reminder, opener, minyan, alone].map(stageOf)).toEqual(['green', 'green', 'orange', 'red']);
    expect(minyan.body).toBe('הזמן האחרון להתחיל להתפלל במניין');
    expect(minyan.subtitle).toMatch(/^⚠️ נשארו 45 דק'/);

    const late = {
      ...planInput(NIGHT_BEFORE, 1, 'ios'),
      reminderOverrides: {
        shacharit: [
          { anchor: 'start' as const, offsetMin: 0, label: 'x' },
          { anchor: 'end' as const, offsetMin: -5, label: 'y' },
        ],
      },
    };
    const candidates = day(buildPlan(late));
    expect(candidates.map(stageOf)).toEqual(['green', 'green', 'orange', 'red', 'green']);
    expect(candidates[4].data.nag).toBeUndefined();
    for (const c of candidates) expect(c.body).not.toMatch(/מתוך/);
  });

  it('is part of what the hash covers and is handed to expo as the subtitle', async () => {
    const [candidate] = day(buildPlan(planInput(NIGHT_BEFORE, undefined, 'ios')));
    expect(contentHash(candidate)).not.toBe(contentHash({ ...candidate, subtitle: 'other' }));
    expect(contentHash(candidate)).not.toBe(contentHash({ ...candidate, color: '#000000' }));
    await schedule([candidate]);
    const request = (Notifications.scheduleNotificationAsync as jest.Mock).mock
      .calls[0][0] as Notifications.NotificationRequestInput;
    expect(request.content.subtitle).toBe(candidate.subtitle);
    expect(request.content.color).toBe(candidate.color);
    expect(request.content.title).toBe(candidate.title);

    const [android] = day(buildPlan(planInput(NIGHT_BEFORE)));
    await schedule([android]);
    const sent = (Notifications.scheduleNotificationAsync as jest.Mock).mock
      .calls[1][0] as Notifications.NotificationRequestInput;
    expect('subtitle' in sent.content).toBe(false);
    expect(sent.content.body).toBe(android.body);
  });
});
