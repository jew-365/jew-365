import { parshiot } from '@hebcal/core';
import { CHOK_BOOKS, CHOK_PARASHIYOT, CHOK_TEXT_ID, chokAsset, hasChokContent } from '../chok';
import { useChokStore } from '@/stores/useChokStore';

afterEach(() => {
  useChokStore.getState().reset();
});

describe('chok asset registry', () => {
  it('has no content while nothing is installed', () => {
    useChokStore.getState().reset();
    expect(hasChokContent()).toBe(false);
    expect(chokAsset('Noach')).toBeUndefined();
  });

  it('finds the parashiyot the installed add-on lists, and only those', () => {
    useChokStore.setState({
      installed: {
        version: 3,
        bytes: 10,
        installedAt: 1,
        files: { Noach: 'noach.0000000a.json', 'Vezot Haberakhah': 'vezot-haberakhah.0000000b.json' },
      },
    });
    expect(hasChokContent()).toBe(true);
    expect(chokAsset('Noach')).toBe('noach.0000000a.json');
    expect(chokAsset('Vezot Haberakhah')).toBe('vezot-haberakhah.0000000b.json');
    expect(chokAsset('Bo')).toBeUndefined();
  });

  it('names the reader text chok_leyisrael', () => {
    expect(CHOK_TEXT_ID).toBe('chok_leyisrael');
  });

  it('lists the 54 parashiyot of the weekly cycle', () => {
    expect(CHOK_PARASHIYOT).toEqual([...parshiot, 'Vezot Haberakhah']);
    expect(CHOK_PARASHIYOT).toHaveLength(54);
  });
});

describe('the five books of the Torah', () => {
  it('cover the cycle once, in order', () => {
    expect(CHOK_BOOKS.flatMap((book) => book.parashiyot)).toEqual(CHOK_PARASHIYOT);
  });

  it.each([
    ['bereshit', 'Bereshit', 'Vayechi'],
    ['shemot', 'Shemot', 'Pekudei'],
    ['vayikra', 'Vayikra', 'Bechukotai'],
    ['bamidbar', 'Bamidbar', 'Masei'],
    ['devarim', 'Devarim', 'Vezot Haberakhah'],
  ])('%s runs from %s to %s', (key, first, last) => {
    const book = CHOK_BOOKS.find((candidate) => candidate.key === key);
    expect(book?.parashiyot[0]).toBe(first);
    expect(book?.parashiyot[book.parashiyot.length - 1]).toBe(last);
  });

  it('lists the books in the order of the Torah', () => {
    expect(CHOK_BOOKS.map((book) => book.key)).toEqual(['bereshit', 'shemot', 'vayikra', 'bamidbar', 'devarim']);
  });
});
