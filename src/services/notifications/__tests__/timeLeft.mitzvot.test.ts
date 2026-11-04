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

  it('colours and marks each reminder by its place in the window, its repeats with it', () => {
    const candidates = day(buildPlan(planInput(NIGHT_BEFORE, 3)));
    expect(candidates.length).toBe(6);
    const window = SHACHARIT.computeWindow({
      date: at(J, '2026-11-11T12:00'),
      location: J,
      settings: SETTINGS,
      zmanim: require('@/services/ZmanimService').ZmanimService.getZmanim(at(J, '2026-11-11T12:00'), J),
    })!;
    // The start reminder and its two repeats, then the before-the-end reminder after its two repeats: two reminders,
    // so the first is green and the last red, repeats included.
    const stages = ['green', 'green', 'green', 'red', 'red', 'red'] as const;
    candidates.forEach((c, i) => {
      expect(c.color).toBe(TIME_STAGE_COLOR[stages[i]]);
      expect(c.subtitle).toBe(timeLeftLine(c.trigger, window, J.tz, t, stages[i]));
    });
    expect(candidates[0].subtitle).toMatch(/^נשארו .* · עד \d\d:\d\d$/);
    expect(candidates[3].subtitle).toMatch(/^❗ נשארו .* · עד \d\d:\d\d$/);
    // Shacharit's last reminder, 45 minutes before its end.
    expect(candidates[5].subtitle).toMatch(/^❗ נשארו 45 דק' · עד \d\d:\d\d$/);
  });

  it('is the same on the iPhone and Android, and keeps the places once some are past or marked', () => {
    const lastAt = day(buildPlan(planInput(NIGHT_BEFORE, 3)))[5].trigger;
    for (const platform of ['ios', 'android'] as const) {
      const later = day(buildPlan(planInput(new Date(lastAt.getTime() - 60_000), 3, platform)));
      expect(later).toHaveLength(1);
      expect(later[0].subtitle?.startsWith('❗ ')).toBe(true);
      expect(later[0].color).toBe(TIME_STAGE_COLOR.red);
    }
  });

  it('marks the one before the last of three reminders orange, with its repeats, and never names a repeat in the body', () => {
    const reminders = [
      { anchor: 'start' as const, offsetMin: 0, label: 'x' },
      { anchor: 'start' as const, offsetMin: 60, label: 'y' },
      { anchor: 'end' as const, offsetMin: -10, label: 'z' },
    ];
    const input = { ...planInput(NIGHT_BEFORE, 2), reminderOverrides: { shacharit: reminders } };
    const candidates = day(buildPlan(input));
    // Level 2: each reminder and one repeat (after a start reminder, before the end one).
    expect(candidates.map((c) => c.color)).toEqual(
      ['green', 'green', 'orange', 'orange', 'red', 'red'].map((s) => TIME_STAGE_COLOR[s as 'green']),
    );
    expect(candidates.filter((c) => c.subtitle?.startsWith('⚠️ '))).toHaveLength(2);
    for (const c of candidates) expect(c.body).not.toMatch(/מתוך/);
  });

  it('makes a mitzvah with one notification red', () => {
    const input = {
      ...planInput(NIGHT_BEFORE, 1),
      reminderOverrides: { shacharit: [{ anchor: 'start' as const, offsetMin: 0, label: 'x' }] },
    };
    const [only] = day(buildPlan(input));
    expect(only.color).toBe(TIME_STAGE_COLOR.red);
    expect(only.subtitle?.startsWith('❗ ')).toBe(true);
  });

  it('is part of what the hash covers and is handed to expo as the subtitle', async () => {
    const [candidate] = day(buildPlan(planInput(NIGHT_BEFORE)));
    expect(contentHash(candidate)).not.toBe(contentHash({ ...candidate, subtitle: 'other' }));
    expect(contentHash(candidate)).not.toBe(contentHash({ ...candidate, color: '#000000' }));
    await schedule([candidate]);
    const request = (Notifications.scheduleNotificationAsync as jest.Mock).mock
      .calls[0][0] as Notifications.NotificationRequestInput;
    expect(request.content.subtitle).toBe(candidate.subtitle);
    expect(request.content.color).toBe(candidate.color);
    expect(request.content.title).toBe(candidate.title);
  });
});
