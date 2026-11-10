import {
  addedZmanimOf,
  ARC_ZMANIM,
  hiddenZmanimOf,
  isCarouselZmanId,
  isZmanId,
  MORE_ZMANIM,
  offeredMoreZmanim,
  withZmanShown,
} from '../zmanIds';

describe('zmanIds', () => {
  it('lists the eleven zmanim of the hero in order', () => {
    expect(ARC_ZMANIM).toEqual([
      'alot',
      'misheyakir',
      'netz',
      'sofShma',
      'sofTfila',
      'chatzot',
      'minchaGedola',
      'plag',
      'shkia',
      'tzeit',
      'chatzotLayla',
    ]);
    expect(isZmanId('plag')).toBe(true);
    expect(isZmanId('sunset')).toBe(false);
  });

  it('cleans a saved list: known ids once each in order, and never every one hidden', () => {
    expect(hiddenZmanimOf(undefined)).toEqual([]);
    expect(hiddenZmanimOf('plag')).toEqual([]);
    expect(hiddenZmanimOf(['shkia', 'bogus', 'alot', 'shkia', 7])).toEqual(['alot', 'shkia']);
    expect(hiddenZmanimOf([...ARC_ZMANIM])).toEqual([]);
  });

  it('hides and shows one zman, in order, and refuses to hide the last one shown', () => {
    const plag = withZmanShown([], 'plag', false);
    expect(plag).toEqual(['plag']);
    expect(withZmanShown(plag, 'alot', false)).toEqual(['alot', 'plag']);
    expect(withZmanShown(['alot', 'plag'], 'alot', true)).toEqual(['plag']);
    expect(withZmanShown(plag, 'plag', false)).toBe(plag);
    expect(withZmanShown(plag, 'alot', true)).toBe(plag);
    const allButTzeit = ARC_ZMANIM.filter((id) => id !== 'tzeit');
    expect(withZmanShown(allButTzeit, 'tzeit', false)).toBe(allButTzeit);
  });

  it('offers the times the circle never shows, one Shema time under the other opinion', () => {
    expect(MORE_ZMANIM).toEqual(['minchaKetana', 'sofShmaMga', 'sofShmaGra']);
    expect(offeredMoreZmanim('GRA')).toEqual(['minchaKetana', 'sofShmaMga']);
    expect(offeredMoreZmanim('MA')).toEqual(['minchaKetana', 'sofShmaGra']);
    expect(addedZmanimOf(['sofShmaGra', 'plag', 'minchaKetana', 'minchaKetana'])).toEqual([
      'minchaKetana',
      'sofShmaGra',
    ]);
    expect(addedZmanimOf(null)).toEqual([]);
    expect(isCarouselZmanId('minchaKetana')).toBe(true);
    expect(isCarouselZmanId('plag')).toBe(true);
    expect(isCarouselZmanId('candleLighting')).toBe(false);
  });
});
