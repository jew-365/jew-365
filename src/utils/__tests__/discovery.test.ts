import { discoveryOf, EMPTY_DISCOVERY, withHint } from '../discovery';

describe('discoveryOf', () => {
  it('reads anything that is not an object as empty', () => {
    for (const bad of [null, undefined, 3, 'x', [], true]) expect(discoveryOf(bad)).toEqual(EMPTY_DISCOVERY);
  });

  it('keeps unique non-empty hint strings in order and drops the rest', () => {
    expect(discoveryOf({ hints: ['a', 'a', '', 2, 'b'] }).hints).toEqual(['a', 'b']);
  });

  it('keeps only well-formed offer records', () => {
    expect(
      discoveryOf({
        offers: {
          ok: { shownAt: 5 },
          closed: { shownAt: 5, closedAt: 9 },
          badShown: { shownAt: -1 },
          badClosed: { shownAt: 5, closedAt: 'x' },
          notObject: 7,
        },
      }).offers,
    ).toEqual({ ok: { shownAt: 5 }, closed: { shownAt: 5, closedAt: 9 }, badClosed: { shownAt: 5 } });
  });

  it('keeps whatsNew only when every field is well formed', () => {
    expect(discoveryOf({ whatsNew: { label: 'v', since: 1, seen: true } }).whatsNew).toEqual({
      label: 'v',
      since: 1,
      seen: true,
    });
    expect(discoveryOf({ whatsNew: { label: 'v', since: 1, seen: 'no' } }).whatsNew).toBeNull();
    expect(discoveryOf({ whatsNew: { label: 'v' } }).whatsNew).toBeNull();
  });
});

describe('withHint', () => {
  it('adds a hint once and returns the same object when it is already there', () => {
    const d = withHint(EMPTY_DISCOVERY, 'x');
    expect(d.hints).toEqual(['x']);
    expect(withHint(d, 'x')).toBe(d);
  });
});
