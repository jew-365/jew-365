import { RATING_MARKED_DAYS, shouldAskForRating } from '../rating';
import { CITIES } from '@/data/cities';
import { at } from '@/testing/zmanim';
import type { Completions } from '@/stores/useCompletionsStore';

const J = CITIES[0];
const NOW = at(J, '2026-10-28T12:00');
const OPENED = at(J, '2026-10-20T12:00').getTime();

function markedDays(count: number): Completions {
  const completions: Completions = {};
  for (let day = 1; day <= count; day += 1) completions[`2026-10-${String(day).padStart(2, '0')}`] = { tefillin: 1 };
  return completions;
}

const due = {
  completions: markedDays(RATING_MARKED_DAYS),
  askedAt: null,
  firstOpenedAt: OPENED,
  now: NOW,
  location: J,
  appActive: true,
};

describe('shouldAskForRating', () => {
  it('asks once every condition holds', () => {
    expect(RATING_MARKED_DAYS).toBe(7);
    expect(shouldAskForRating(due)).toBe(true);
  });

  it('asks with more marked days than the minimum', () => {
    expect(shouldAskForRating({ ...due, completions: markedDays(20) })).toBe(true);
  });

  it('never asks twice', () => {
    expect(shouldAskForRating({ ...due, askedAt: at(J, '2026-10-27T12:00').getTime() })).toBe(false);
  });

  it('never asks while the app is not active', () => {
    expect(shouldAskForRating({ ...due, appActive: false })).toBe(false);
  });

  it('never asks inside a holy block', () => {
    const shabbat = at(J, '2026-10-31T12:00');
    expect(shouldAskForRating({ ...due, now: shabbat })).toBe(false);
    expect(shouldAskForRating({ ...due, now: at(J, '2026-11-01T12:00') })).toBe(true);
  });

  it('never asks on the install first app day', () => {
    expect(shouldAskForRating({ ...due, firstOpenedAt: at(J, '2026-10-28T08:00').getTime() })).toBe(false);
  });

  it('asks from the next app day on, which turns at alot and not at midnight', () => {
    const lateEvening = at(J, '2026-10-28T22:00').getTime();
    expect(shouldAskForRating({ ...due, firstOpenedAt: lateEvening, now: at(J, '2026-10-29T02:00') })).toBe(false);
    expect(shouldAskForRating({ ...due, firstOpenedAt: lateEvening, now: at(J, '2026-10-29T08:00') })).toBe(true);
  });

  it('never asks without a first-open stamp', () => {
    expect(shouldAskForRating({ ...due, firstOpenedAt: null })).toBe(false);
  });

  it('never asks with fewer than seven marked days', () => {
    expect(shouldAskForRating({ ...due, completions: markedDays(RATING_MARKED_DAYS - 1) })).toBe(false);
  });

  it('counts a day only when it holds a mark', () => {
    const completions = { ...markedDays(RATING_MARKED_DAYS - 1), '2026-10-27': {} };
    expect(shouldAskForRating({ ...due, completions })).toBe(false);
    expect(shouldAskForRating({ ...due, completions: { ...completions, '2026-10-27': { mincha: 1 } } })).toBe(true);
  });

  it('counts a day once however many marks it holds', () => {
    const completions: Completions = {
      '2026-10-01': { tefillin: 1, shacharit: 2, mincha: 3, maariv: 4, a: 5, b: 6, c: 7 },
    };
    expect(shouldAskForRating({ ...due, completions })).toBe(false);
  });
});
