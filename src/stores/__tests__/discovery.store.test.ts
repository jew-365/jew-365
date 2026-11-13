jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { useUserStore } from '../useUserStore';
import { discoveryOf, EMPTY_DISCOVERY } from '@/utils/discovery';

const user = () => useUserStore.getState();
const merge = (saved: unknown) => useUserStore.persist.getOptions().merge!(saved, user());

describe('the discovery state of the user store', () => {
  beforeEach(() => user().reset());

  it('starts empty', () => {
    expect(user().discovery).toEqual(EMPTY_DISCOVERY);
  });

  it('learns a hint once, and a second learn changes nothing', () => {
    user().learnHint('dragSun');
    const once = user().discovery;
    user().learnHint('dragSun');
    expect(user().discovery).toBe(once);
    expect(once.hints).toEqual(['dragSun']);
  });

  it('records offers and the what’s-new state beside the hints', () => {
    user().learnHint('dragSun');
    user().recordOffer('battery', { shownAt: 10 });
    user().recordOffer('battery', { shownAt: 10, closedAt: 20 });
    user().setWhatsNew({ label: '1.0.21-81', since: 30, seen: false });
    expect(user().discovery).toEqual({
      hints: ['dragSun'],
      offers: { battery: { shownAt: 10, closedAt: 20 } },
      whatsNew: { label: '1.0.21-81', since: 30, seen: false },
    });
  });

  it('is cleared by reset', () => {
    user().learnHint('dragSun');
    user().setWhatsNew({ label: 'x', since: 1, seen: true });
    user().reset();
    expect(user().discovery).toEqual(EMPTY_DISCOVERY);
  });

  it('merges empty from a payload saved before it existed', () => {
    expect(merge({ nusach: 'sefard' }).discovery).toEqual(EMPTY_DISCOVERY);
  });

  it('keeps the valid parts of a saved value and drops the rest, field by field', () => {
    const merged = merge({
      discovery: {
        hints: ['dragSun', 3, '', 'dragSun', 'checkIn'],
        offers: { a: { shownAt: 5 }, b: { shownAt: 'x' }, c: { shownAt: 6, closedAt: -1 }, d: null },
        whatsNew: { label: 'v', since: 9, seen: 'no' },
      },
    });
    expect(merged.discovery).toEqual({
      hints: ['dragSun', 'checkIn'],
      offers: { a: { shownAt: 5 }, c: { shownAt: 6 } },
      whatsNew: null,
    });
  });

  it('reads anything that is not an object as empty', () => {
    for (const bad of [null, 3, 'x', [], undefined]) expect(discoveryOf(bad)).toEqual(EMPTY_DISCOVERY);
  });
});
