import { CITIES } from '@/data/cities';
import { HebcalService } from '@/services/HebcalService';
import { at } from '@/testing/zmanim';
import { OFFER_GAP_DAYS, OFFER_SHOW_DAYS, pickOffer, weeklyTip, type OfferInput } from '../offers';

const J = CITIES[0];
const DAY = 86_400_000;
const WEDNESDAY = '2026-11-18T12:00';

// Everything already on: nothing to offer, the baseline every case changes one thing of.
function input(over: Partial<OfferInput> = {}, wallClock = WEDNESDAY): OfferInput {
  return {
    now: at(J, wallClock),
    location: J,
    inIsrael: true,
    firstOpenedAt: at(J, '2026-11-01T12:00').getTime(),
    offers: {},
    enabled: () => true,
    offered: () => true,
    hilulotEnabled: true,
    batteryExempt: null,
    markedDays: 0,
    learningOn: true,
    ...over,
  };
}
const ago = (days: number, wallClock = WEDNESDAY) => at(J, wallClock).getTime() - days * DAY;
// The Tracking tab was offered long ago, so the cases below reach the offers after it.
const SEEN = { tracking: { shownAt: ago(30), closedAt: ago(30) } };
const birchotOff = { enabled: (id: string) => id !== 'birchot_hashachar', markedDays: 2, offers: SEEN };

describe('pickOffer', () => {
  it('offers nothing when everything is on, and nothing before the install is stamped', () => {
    expect(pickOffer(input())).toBeNull();
    expect(pickOffer(input({ firstOpenedAt: null, batteryExempt: false }))).toBeNull();
  });

  it('puts a missing battery exemption first', () => {
    expect(pickOffer(input({ ...birchotOff, batteryExempt: false }))!.id).toBe('battery');
    expect(pickOffer(input({ ...birchotOff, batteryExempt: true }))!.id).toBe('birchot');
  });

  it('offers only the tour and the battery on the install day, and the tour only in its first days', () => {
    const today = at(J, WEDNESDAY).getTime();
    expect(pickOffer(input({ ...birchotOff, firstOpenedAt: today }))!.id).toBe('tour');
    // The tour already closed (a pure input, gap passed): birchot is eligible but waits for the next day.
    expect(
      pickOffer(
        input({ ...birchotOff, firstOpenedAt: today, offers: { tour: { shownAt: ago(9), closedAt: ago(9) } } }),
      ),
    ).toBeNull();
    const tour = pickOffer(input({ firstOpenedAt: ago(1) }))!;
    expect(tour.id).toBe('tour');
    expect(tour.action).toEqual({ kind: 'route', href: { pathname: '/guide', params: { topic: 'home' } } });
    // An install older than the tour's days never sees it.
    expect(pickOffer(input({ firstOpenedAt: ago(2) }))).toBeNull();
  });

  it('offers candle lighting and havdalah from the nightfall before Shabbat, never midweek', () => {
    const candlesOff = { enabled: (id: string) => id !== 'candle_lighting' };
    expect(pickOffer(input(candlesOff))).toBeNull();
    const thursdayNight = '2026-11-19T21:00';
    const offer = pickOffer(input(candlesOff, thursdayNight))!;
    expect(offer.id).toBe('candles');
    expect(offer.action).toEqual({ kind: 'mitzvot', ids: ['candle_lighting', 'havdalah'] });
  });

  it('offers the Omer once a year, in the week before its first night', () => {
    const omerOff = { enabled: (id: string) => id !== 'sefirat_haomer' };
    // 15 Nisan 5787 is 2027-04-22.
    expect(pickOffer(input(omerOff, '2027-04-10T12:00'))).toBeNull();
    const offer = pickOffer(input(omerOff, '2027-04-18T12:00'))!;
    expect(offer).toMatchObject({ id: 'omer', key: 'omer:5787' });
    const closed = {
      'omer:5787': { shownAt: at(J, '2027-04-18T12:00').getTime(), closedAt: at(J, '2027-04-18T12:00').getTime() },
    };
    expect(pickOffer(input({ ...omerOff, offers: closed }, '2027-04-20T12:00'))).toBeNull();
    // The next year's season is a new key.
    expect(pickOffer(input({ ...omerOff, offers: closed }, '2028-04-05T12:00'))).toMatchObject({ key: 'omer:5788' });
  });

  it('keeps an open offer up to its five days, even when a higher one appears', () => {
    const offers = { ...SEEN, birchot: { shownAt: ago(1) } };
    expect(pickOffer(input({ ...birchotOff, offers, batteryExempt: false }))!.id).toBe('birchot');
    const expired = { ...SEEN, birchot: { shownAt: ago(OFFER_SHOW_DAYS) - 60_000 } };
    expect(pickOffer(input({ ...birchotOff, offers: expired }))).toBeNull();
  });

  it('waits two days after an offer ends, and offers each key once', () => {
    const learning = { learningOn: false, markedDays: 5, enabled: (id: string) => id !== 'birchot_hashachar' };
    const recent = { ...SEEN, birchot: { shownAt: ago(3), closedAt: ago(1) } };
    expect(pickOffer(input({ ...learning, offers: recent }))).toBeNull();
    const past = { ...SEEN, birchot: { shownAt: ago(5), closedAt: ago(OFFER_GAP_DAYS) } };
    expect(pickOffer(input({ ...learning, offers: past }))!.id).toBe('learning');
    // Birchot, still off, is never offered a second time.
    const done = {
      ...SEEN,
      birchot: { shownAt: ago(9), closedAt: ago(9) },
      learning: { shownAt: ago(9), closedAt: ago(9) },
    };
    expect(pickOffer(input({ ...learning, offers: done }))).toBeNull();
  });

  it('ends an offer the user took up elsewhere at its first showing', () => {
    // Birchot was shown a day ago and is now on: the gap counts from that showing.
    const offers = { birchot: { shownAt: ago(1) } };
    expect(pickOffer(input({ batteryExempt: false, offers }))).toBeNull();
    expect(pickOffer(input({ batteryExempt: false, offers: { birchot: { shownAt: ago(OFFER_GAP_DAYS) } } }))!.id).toBe(
      'battery',
    );
  });

  it('offers nothing inside a holy block', () => {
    const block = HebcalService.holyBlockOn(at(J, '2026-11-21T12:00'), J)!;
    const inside = new Date(block.start.getTime() + 3_600_000);
    expect(pickOffer({ ...input({ batteryExempt: false }), now: inside })).toBeNull();
  });
});

describe('weeklyTip', () => {
  it('names candle lighting first whenever it is off, whatever the day', () => {
    expect(weeklyTip(input({ enabled: (id) => id !== 'havdalah' }))!.id).toBe('candles');
  });

  it('then the first other offer that applies, never the tour or the battery, nor one the user closed', () => {
    expect(weeklyTip(input({ ...birchotOff, batteryExempt: false, firstOpenedAt: ago(0) }))!.id).toBe('birchot');
    expect(weeklyTip(input({ ...birchotOff, offers: { birchot: { shownAt: ago(9), closedAt: ago(9) } } }))).toBeNull();
    // The report is the tracking itself, so the Tracking tab is never its tip.
    expect(weeklyTip(input({ markedDays: 3 }))).toBeNull();
    expect(weeklyTip(input())).toBeNull();
  });
});
