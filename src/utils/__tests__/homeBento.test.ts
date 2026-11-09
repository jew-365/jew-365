import {
  addWidget,
  bentoOf,
  bentoPinsOf,
  BENTO_MAX_TILE_ROWS,
  defaultBento,
  defaultFixed,
  moveWidget,
  packBento,
  periodZmanim,
  pickNext,
  removeWidget,
  replaceZman,
  resizeWidget,
  rowZmanim,
  suggestedPins,
  type BentoWidget,
} from '../homeBento';
import { ARC_ZMANIM, type ZmanId } from '../zmanIds';

const ALL = new Set(['tefillin', 'krias_shma_shacharit', 'shacharit', 'mincha', 'maariv', 'krias_shma_al_hamita']);
const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 9, h, m));
// A plain day's zmanim on a UTC clock, in order.
const TIMES: Record<ZmanId, Date> = {
  alot: at(4, 50),
  misheyakir: at(4, 56),
  netz: at(6, 2),
  sofShma: at(8, 39),
  sofTfila: at(9, 34),
  chatzot: at(11, 23),
  minchaGedola: at(11, 53),
  plag: at(15, 54),
  shkia: at(16, 48),
  tzeit: at(17, 2),
  chatzotLayla: at(23, 23),
};

describe('the default of each zone', () => {
  it('fills the four tiles from the mitzvot the user keeps', () => {
    expect(defaultFixed(ALL)).toEqual(['sofShma', 'sofTfila', 'shkia', 'tzeit']);
    expect(defaultFixed(new Set(['mincha']))).toEqual(['netz', 'chatzot', 'shkia', 'tzeit']);
  });

  it('lays out the next tile, the four tiles and the row', () => {
    const layout = defaultBento(ALL);
    expect(layout[0]).toEqual({ kind: 'next', size: 'b' });
    expect(layout.at(-1)).toEqual({ kind: 'row' });
    const { cells, tileRows, rows } = packBento(layout);
    expect(tileRows).toBe(2);
    expect(rows).toBe(3);
    expect(cells.find((c) => c.key === 'next')).toEqual({ key: 'next', col: 0, row: 0, w: 2, h: 2 });
    expect(cells.filter((c) => c.w === 1).map((c) => [c.col, c.row])).toEqual([
      [2, 0],
      [3, 0],
      [2, 1],
      [3, 1],
    ]);
    expect(cells.at(-1)).toEqual({ key: 'row', col: 0, row: 2, w: 4, h: 1 });
  });
});

describe('a saved layout', () => {
  it('keeps known widgets once each, the row last', () => {
    const saved = [
      { kind: 'row' },
      { kind: 'zman', id: 'plag', size: 'w' },
      { kind: 'zman', id: 'plag', size: 's' },
      { kind: 'zman', id: 'nope', size: 's' },
      { kind: 'next', size: 'x' },
    ];
    expect(bentoOf(saved, ALL)).toEqual([
      { kind: 'zman', id: 'plag', size: 'w' },
      { kind: 'next', size: 'b' },
      { kind: 'row' },
    ]);
  });

  it('reads anything else as the default', () => {
    expect(bentoOf(null, ALL)).toEqual(defaultBento(ALL));
    expect(bentoOf([], ALL)).toEqual(defaultBento(ALL));
    expect(bentoOf([42, 'x'], ALL)).toEqual(defaultBento(ALL));
  });

  it('cleans saved pins to known zmanim in order', () => {
    expect(bentoPinsOf(['plag', 'x', 'alot'])).toEqual(['alot', 'plag']);
    expect(bentoPinsOf('plag')).toEqual([]);
  });
});

describe('the edit mode', () => {
  const base = defaultBento(ALL);

  it('cycles a tile small, wide, large and back, and the next tile large and wide', () => {
    const w = resizeWidget(base, 'sofShma');
    expect(w.find((x) => x.kind === 'zman' && x.id === 'sofShma')).toEqual({ kind: 'zman', id: 'sofShma', size: 'w' });
    const b = resizeWidget(w, 'sofShma');
    expect(b.find((x) => x.kind === 'zman' && x.id === 'sofShma')).toMatchObject({ size: 'b' });
    expect(resizeWidget(b, 'sofShma').find((x) => x.kind === 'zman' && x.id === 'sofShma')).toMatchObject({
      size: 's',
    });
    expect(resizeWidget(base, 'next')[0]).toEqual({ kind: 'next', size: 'w' });
  });

  it('moves a tile one step and never past the row', () => {
    expect(moveWidget(base, 'sofTfila', -1).map((x) => (x.kind === 'zman' ? x.id : x.kind))).toEqual([
      'next',
      'sofTfila',
      'sofShma',
      'shkia',
      'tzeit',
      'row',
    ]);
    expect(moveWidget(base, 'tzeit', 1)).toBe(base);
    expect(moveWidget(base, 'next', -1)).toBe(base);
  });

  it('replaces, removes and adds, a new tile before the row', () => {
    expect(replaceZman(base, 'shkia', 'plag').map((x) => (x.kind === 'zman' ? x.id : x.kind))).toContain('plag');
    expect(replaceZman(base, 'shkia', 'tzeit')).toBe(base);
    expect(removeWidget(base, 'row').some((x) => x.kind === 'row')).toBe(false);
    const added = addWidget(base, { kind: 'zman', id: 'plag', size: 's' });
    expect(added.at(-2)).toEqual({ kind: 'zman', id: 'plag', size: 's' });
    expect(added.at(-1)).toEqual({ kind: 'row' });
    expect(addWidget(base, { kind: 'zman', id: 'tzeit', size: 's' })).toBe(base);
  });

  it(`refuses an edit that passes ${BENTO_MAX_TILE_ROWS} rows of tiles`, () => {
    let list: BentoWidget[] = base;
    for (const id of ARC_ZMANIM) list = addWidget(list, { kind: 'zman', id, size: 's' });
    expect(packBento(list).tileRows).toBe(BENTO_MAX_TILE_ROWS);
    const full = list;
    expect(resizeWidget(full, 'alot')).toBe(full);
  });
});

describe('the big tile', () => {
  it('takes an open unmarked end within three hours first', () => {
    const now = at(8);
    const chosen = pickNext(
      [
        { kind: 'zman', at: at(8, 10), id: 'x' },
        { kind: 'end', at: at(8, 39), id: 'krias_shma_shacharit' },
        { kind: 'end', at: at(16, 48), id: 'mincha' },
      ],
      now,
    );
    expect(chosen?.id).toBe('krias_shma_shacharit');
  });

  it('falls to a time of the period, then an opening, then the next zman', () => {
    const now = at(13);
    expect(
      pickNext(
        [
          { kind: 'end', at: at(16, 48), id: 'mincha' },
          { kind: 'period', at: at(16, 28), id: 'candle_lighting' },
          { kind: 'opens', at: at(17, 2), id: 'maariv' },
        ],
        now,
      )?.id,
    ).toBe('candle_lighting');
    expect(
      pickNext(
        [
          { kind: 'opens', at: at(17, 2), id: 'maariv' },
          { kind: 'zman', at: at(15, 54), id: 'plag' },
        ],
        now,
      )?.id,
    ).toBe('maariv');
    expect(pickNext([{ kind: 'zman', at: at(12), id: 'x' }], now)).toBeNull();
  });
});

describe('the row', () => {
  it('names the zmanim of each part of the day', () => {
    expect(periodZmanim(at(5, 30), TIMES)).toEqual(['misheyakir', 'netz']);
    expect(periodZmanim(at(8), TIMES)).toEqual(['sofTfila', 'sofShma', 'chatzot']);
    expect(periodZmanim(at(13), TIMES)).toEqual(['minchaGedola', 'plag']);
    expect(periodZmanim(at(16), TIMES)).toEqual(['shkia', 'tzeit']);
    expect(periodZmanim(at(20), TIMES)).toEqual(['chatzotLayla']);
  });

  it('shows the moment, then the pins, then the rest, none of them a tile or hidden', () => {
    const tiles = new Set(['sofShma', 'sofTfila', 'shkia', 'tzeit']);
    const row = rowZmanim(at(8), TIMES, tiles, ['plag', 'sofShma'], ['alot'], null);
    expect(row.now).toEqual(['chatzot']);
    expect(row.mine).toEqual(['plag']);
    expect(row.rest).toEqual(['minchaGedola', 'chatzotLayla', 'misheyakir', 'netz']);
  });

  it('suggests pins with their reasons from the mitzvot kept', () => {
    expect(suggestedPins(ALL).map((s) => s.id)).toEqual(['misheyakir', 'chatzotLayla', 'plag']);
    expect(suggestedPins(new Set())).toEqual([]);
  });
});
