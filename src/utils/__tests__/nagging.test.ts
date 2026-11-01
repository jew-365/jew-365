import type { Reminder } from '@/types/mitzvah';
import {
  BEFORE_ONLY_MITZVOT,
  NAG_INTERVALS_MIN,
  NAG_LEVELS,
  NAG_LEVEL_IDS,
  NAG_MAX_COUNT,
  isNagLevel,
  isReminderNag,
  nagFor,
  nagPlacementsFor,
  presetPlacementFor,
  remindersPerDay,
  repeatOffsets,
  repeatsPerReminder,
} from '@/utils/nagging';

const start: Reminder = { anchor: 'start', offsetMin: 0, label: '' };
const end: Reminder = { anchor: 'end', offsetMin: -45, label: '' };
const clock: Reminder = { anchor: 'clock', offsetMin: 23 * 60, label: '' };
const followUp: Reminder = { anchor: 'followUp', offsetMin: 30, label: '' };
const blockExit: Reminder = { anchor: 'blockExit', offsetMin: 0, label: '' };

describe('the level table', () => {
  it('has four levels: none, one every 10, two every 5, three every 5', () => {
    expect(NAG_LEVEL_IDS).toEqual([1, 2, 3, 4]);
    expect(NAG_LEVELS).toEqual({
      1: { count: 0, everyMin: 0 },
      2: { count: 1, everyMin: 10 },
      3: { count: 2, everyMin: 5 },
      4: { count: 3, everyMin: 5 },
    });
    expect(NAG_MAX_COUNT).toBe(5);
    expect(NAG_INTERVALS_MIN).toEqual([3, 5, 10, 15]);
    expect(BEFORE_ONLY_MITZVOT).toEqual(['krias_shma_al_hamita']);
  });

  it('accepts only the four level numbers', () => {
    expect(NAG_LEVEL_IDS.every(isNagLevel)).toBe(true);
    for (const bad of [0, 5, 2.5, '2', null, undefined, NaN]) expect(isNagLevel(bad)).toBe(false);
  });
});

describe('nagPlacementsFor', () => {
  it('offers every placement on a start, clock or follow-up reminder', () => {
    for (const reminder of [start, clock, followUp]) {
      expect(nagPlacementsFor('shacharit', reminder)).toEqual(['before', 'after', 'around']);
      expect(presetPlacementFor('shacharit', reminder)).toBe('after');
    }
  });

  it('offers only before on a before-the-end reminder', () => {
    expect(nagPlacementsFor('shacharit', end)).toEqual(['before']);
    expect(presetPlacementFor('shacharit', end)).toBe('before');
  });

  it('offers only before on every reminder of the bedtime Shema', () => {
    for (const reminder of [start, end, clock, followUp]) {
      expect(nagPlacementsFor('krias_shma_al_hamita', reminder)).toEqual(['before']);
      expect(presetPlacementFor('krias_shma_al_hamita', reminder)).toBe('before');
    }
  });

  it('offers only after on a block-exit reminder', () => {
    expect(nagPlacementsFor('kiddush_levana', blockExit)).toEqual(['after']);
    expect(presetPlacementFor('kiddush_levana', blockExit)).toBe('after');
  });
});

describe('isReminderNag', () => {
  it('accepts a count of 1 to 5, an offered interval and a known placement', () => {
    expect(isReminderNag({ count: 1, everyMin: 3, placement: 'before' })).toBe(true);
    expect(isReminderNag({ count: 5, everyMin: 15, placement: 'around' })).toBe(true);
  });

  it('rejects anything else', () => {
    for (const bad of [
      null,
      undefined,
      3,
      { count: 0, everyMin: 5, placement: 'after' },
      { count: 6, everyMin: 5, placement: 'after' },
      { count: 2.5, everyMin: 5, placement: 'after' },
      { count: 2, everyMin: 7, placement: 'after' },
      { count: 2, everyMin: 5, placement: 'sideways' },
      { count: 2, placement: 'after' },
    ]) {
      expect(isReminderNag(bad)).toBe(false);
    }
  });
});

describe('nagFor', () => {
  const own = { count: 3, everyMin: 3, placement: 'around' as const };

  it('takes the reminder’s own nag over any level', () => {
    for (const level of NAG_LEVEL_IDS) expect(nagFor('shacharit', { ...start, nag: own }, level)).toEqual(own);
  });

  it('sends no repeat for an exempt reminder, whatever the level', () => {
    expect(nagFor('shacharit', { ...start, nag: null }, 4)).toBeNull();
  });

  it('takes the level’s preset, placed by the anchor, when the reminder has none', () => {
    expect(nagFor('shacharit', start, 1)).toBeNull();
    expect(nagFor('shacharit', start, undefined)).toBeNull();
    expect(nagFor('shacharit', start, 3)).toEqual({ count: 2, everyMin: 5, placement: 'after' });
    expect(nagFor('shacharit', end, 3)).toEqual({ count: 2, everyMin: 5, placement: 'before' });
    expect(nagFor('krias_shma_al_hamita', clock, 4)).toEqual({ count: 3, everyMin: 5, placement: 'before' });
    expect(nagFor('maariv', clock, 2)).toEqual({ count: 1, everyMin: 10, placement: 'after' });
  });

  it('reads a malformed nag as absent', () => {
    const broken = { ...start, nag: { count: 9, everyMin: 5, placement: 'after' } } as unknown as Reminder;
    expect(nagFor('shacharit', broken, 2)).toEqual({ count: 1, everyMin: 10, placement: 'after' });
    expect(nagFor('shacharit', broken, 1)).toBeNull();
  });

  it('coerces a placement the reminder may not take to the first it may', () => {
    expect(nagFor('shacharit', { ...end, nag: { ...own, placement: 'after' } }, 1)).toEqual({
      ...own,
      placement: 'before',
    });
    expect(nagFor('krias_shma_al_hamita', { ...clock, nag: own }, 1)?.placement).toBe('before');
    expect(nagFor('kiddush_levana', { ...blockExit, nag: { ...own, placement: 'before' } }, 1)?.placement).toBe(
      'after',
    );
  });
});

describe('repeatOffsets', () => {
  const offsets = (count: number, placement: 'before' | 'after' | 'around', everyMin = 5) =>
    repeatOffsets({ count, everyMin, placement });

  it('puts every repeat before the main for before', () => {
    expect(offsets(1, 'before')).toEqual([-5]);
    expect(offsets(2, 'before')).toEqual([-10, -5]);
    expect(offsets(5, 'before', 3)).toEqual([-15, -12, -9, -6, -3]);
  });

  it('puts every repeat after the main for after', () => {
    expect(offsets(1, 'after')).toEqual([5]);
    expect(offsets(3, 'after', 10)).toEqual([10, 20, 30]);
    expect(offsets(5, 'after', 15)).toEqual([15, 30, 45, 60, 75]);
  });

  it('splits half and half with the odd one after', () => {
    expect(offsets(1, 'around')).toEqual(offsets(1, 'after'));
    expect(offsets(2, 'around')).toEqual([-5, 5]);
    expect(offsets(3, 'around')).toEqual([-5, 5, 10]);
    expect(offsets(4, 'around')).toEqual([-10, -5, 5, 10]);
    expect(offsets(5, 'around')).toEqual([-10, -5, 5, 10, 15]);
  });
});

describe('the per-day estimate', () => {
  it('counts each reminder once plus its repeats', () => {
    const shacharit = [start, end];
    expect(remindersPerDay('shacharit', shacharit, 1)).toBe(2);
    expect(remindersPerDay('shacharit', shacharit, 2)).toBe(4);
    expect(remindersPerDay('shacharit', shacharit, 3)).toBe(6);
    expect(remindersPerDay('shacharit', shacharit, 4)).toBe(8);
    expect(remindersPerDay('shacharit', [{ ...start, nag: null }, end], 4)).toBe(5);
    expect(remindersPerDay('shacharit', [{ ...start, nag: { count: 5, everyMin: 3, placement: 'after' } }], 1)).toBe(6);
    expect(repeatsPerReminder('shacharit', end, 2)).toBe(1);
    expect(remindersPerDay('shacharit', [], 4)).toBe(0);
  });
});
