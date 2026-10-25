jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { reconcileEndedCustomMitzvot } from '../customMitzvahLifecycle';
import { useCompletionsStore } from '../useCompletionsStore';
import { useCustomMitzvotStore } from '../useCustomMitzvotStore';
import { useMitzvotStore } from '../useMitzvotStore';
import { useUserStore } from '../useUserStore';
import { CITIES } from '@/data/cities';
import { at } from '@/testing/zmanim';
import { CustomMitzvah, ScheduleEntry } from '@/types/mitzvah';

const J = CITIES[0];
const enabled = (id: string) => Boolean(useMitzvotStore.getState().activeMitzvot[id]?.enabled);

function add(id: string, schedules?: ScheduleEntry[]): CustomMitzvah {
  const custom: CustomMitzvah = {
    id,
    name: 'לימוד',
    startHHMM: '08:00',
    endHHMM: '09:00',
    reminders: [{ anchor: 'start', offsetMin: 0, label: 'א' }],
    skipOn: [],
    createdAt: 1,
    schedules,
  };
  useCustomMitzvotStore.getState().add(custom);
  useMitzvotStore.getState().setEnabled(id, true);
  return custom;
}

const range = (start: string, end: string): ScheduleEntry[] => [
  { from: '2026-10-01', schedule: { mode: 'range', start, end } },
];

describe('reconcileEndedCustomMitzvot', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useMitzvotStore.getState().reset();
    useCustomMitzvotStore.getState().reset();
    useCompletionsStore.getState().reset();
    useUserStore.setState({ location: J });
  });

  it("switches off a range that ended before today's app day, keeping its definition and marks", () => {
    const custom = add('custom_1_a', range('2026-10-20', '2026-10-27'));
    useCompletionsStore.setState({ completions: { '2026-10-27': { custom_1_a: 1 } } });

    expect(reconcileEndedCustomMitzvot(at(J, '2026-10-28T07:00'))).toEqual(['custom_1_a']);
    expect(enabled('custom_1_a')).toBe(false);
    expect(useCustomMitzvotStore.getState().items.custom_1_a).toEqual(custom);
    expect(useCompletionsStore.getState().completions).toEqual({ '2026-10-27': { custom_1_a: 1 } });
  });

  it('leaves a range that ends today on', () => {
    add('custom_1_a', range('2026-10-20', '2026-10-28'));

    expect(reconcileEndedCustomMitzvot(at(J, '2026-10-28T07:00'))).toEqual([]);
    expect(enabled('custom_1_a')).toBe(true);
  });

  it('keeps a range on between midnight and alot of the next day', () => {
    add('custom_1_a', range('2026-10-20', '2026-10-27'));

    expect(reconcileEndedCustomMitzvot(at(J, '2026-10-28T02:00'))).toEqual([]);
    expect(enabled('custom_1_a')).toBe(true);
    expect(reconcileEndedCustomMitzvot(at(J, '2026-10-28T07:00'))).toEqual(['custom_1_a']);
    expect(enabled('custom_1_a')).toBe(false);
  });

  it('switches off an ended streak', () => {
    add('custom_1_a', [{ from: '2026-10-20', schedule: { mode: 'streak', start: '2026-10-20', days: 3 } }]);

    expect(reconcileEndedCustomMitzvot(at(J, '2026-10-28T07:00'))).toEqual(['custom_1_a']);
    expect(enabled('custom_1_a')).toBe(false);
  });

  it('never touches a weekdays or legacy mitzvah, or one already off', () => {
    add('custom_1_legacy');
    add('custom_2_weekdays', [{ from: '2026-10-01', schedule: { mode: 'weekdays', days: [1] } }]);
    add('custom_3_off', range('2026-10-20', '2026-10-27'));
    useMitzvotStore.getState().setEnabled('custom_3_off', false);
    const before = useMitzvotStore.getState().activeMitzvot;

    expect(reconcileEndedCustomMitzvot(at(J, '2026-10-28T07:00'))).toEqual([]);
    expect(useMitzvotStore.getState().activeMitzvot).toEqual(before);
  });
});
