import { CITIES } from '@/data/cities';
import { HebcalService } from '@/services/HebcalService';
import { at } from '@/testing/zmanim';
import { HABIT_IDS } from '@/data/mitzvot';
import {
  HABIT_AFTER_MARKED_DAYS,
  OFFER_GAP_DAYS,
  OFFER_SHOW_DAYS,
  hubOffers,
  pickOffer,
  weeklyTip,
  type OfferInput,
} from '../offers';

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
    roshChodeshEnabled: true,
    gender: 'female',
    sawNewSetup: true,
    wantsOpen: [],
    maritalStatus: 'single',
    taharahOffered: false,
    taharahEnabled: false,
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

describe('the catch-up of an install that never saw the short setup (A6)', () => {
  const candlesOff = { sawNewSetup: false, enabled: (id: string) => id !== 'candle_lighting', offers: SEEN };

  it('is offered once, ahead of the seasonal offers, and opens the capabilities screen on its bundles', () => {
    const offer = pickOffer(input(candlesOff))!;
    expect(offer.id).toBe('catchUp');
    expect(offer.action).toEqual({ kind: 'route', href: { pathname: '/capabilities', params: { bundles: '1' } } });
    const closed = { ...SEEN, catchUp: { shownAt: ago(9), closedAt: ago(9) } };
    expect(pickOffer(input({ ...candlesOff, offers: closed }))?.id).not.toBe('catchUp');
  });

  it('is not offered after the short setup, nor when every recommended bundle is already on', () => {
    expect(pickOffer(input({ ...candlesOff, sawNewSetup: true }))?.id).not.toBe('catchUp');
    expect(pickOffer(input({ sawNewSetup: false, offers: SEEN }))).toBeNull();
  });

  it('counts Rosh Chodesh notices, and for a man not candle lighting', () => {
    expect(pickOffer(input({ sawNewSetup: false, roshChodeshEnabled: false, offers: SEEN }))!.id).toBe('catchUp');
    expect(pickOffer(input({ ...candlesOff, gender: 'male' }))?.id).not.toBe('catchUp');
    expect(pickOffer(input({ ...candlesOff, gender: 'female' }))!.id).toBe('catchUp');
  });

  it('never comes on the install day, and never as the weekly tip', () => {
    expect(pickOffer(input({ ...candlesOff, offers: {}, firstOpenedAt: ago(0) }))!.id).toBe('tour');
    expect(weeklyTip(input({ sawNewSetup: false, roshChodeshEnabled: false, offers: SEEN }))).toBeNull();
  });
});

describe('hubOffers', () => {
  const several = {
    sawNewSetup: false,
    enabled: (id: string) => !['candle_lighting', 'birchot_hashachar'].includes(id),
    markedDays: 6,
    learningOn: false,
    hilulotEnabled: true,
  };

  it('lists up to three offers that apply, in priority order, whatever the pacing of home', () => {
    // Home showed one yesterday and would wait two days; the More tab does not.
    const offers = { tracking: { shownAt: ago(1), closedAt: ago(1) } };
    expect(hubOffers(input({ ...several, offers })).map((o) => o.id)).toEqual(['catchUp', 'birchot', 'learning']);
    expect(pickOffer(input({ ...several, offers }))).toBeNull();
  });

  it('leaves out an offer the user closed, the tour, and everything inside a holy block', () => {
    const offers = { catchUp: { shownAt: ago(3), closedAt: ago(3) }, tracking: { shownAt: ago(1), closedAt: ago(1) } };
    expect(hubOffers(input({ ...several, offers })).map((o) => o.id)).toEqual(['birchot', 'learning']);
    expect(hubOffers(input({ ...several, firstOpenedAt: ago(0) })).map((o) => o.id)).not.toContain('tour');
    expect(hubOffers(input(several, '2026-11-21T11:00'))).toEqual([]);
  });

  it('is empty before the install is stamped, and with nothing to offer', () => {
    expect(hubOffers(input({ ...several, firstOpenedAt: null }))).toEqual([]);
    expect(hubOffers(input({ offers: SEEN }))).toEqual([]);
  });
});

describe('the offers that follow the short setup', () => {
  it('offers the learning programs asked for in setup first, on the install day too, until they are on', () => {
    const today = at(J, WEDNESDAY).getTime();
    const wanted = pickOffer(input({ firstOpenedAt: today, wantsOpen: ['chok'] }))!;
    expect(wanted.id).toBe('wanted');
    expect(wanted.action).toEqual({ kind: 'route', href: { pathname: '/capabilities', params: { goal: 'learning' } } });
    // Before the tour, after a missing battery exemption.
    expect(pickOffer(input({ firstOpenedAt: today, wantsOpen: ['chok'], batteryExempt: false }))!.id).toBe('battery');
    expect(pickOffer(input({ firstOpenedAt: today, wantsOpen: [] }))!.id).toBe('tour');
    expect(weeklyTip(input({ wantsOpen: ['chok'] }))).toBeNull();
  });

  it('asks the profile questions the setup left out, never on the install day', () => {
    const profile = pickOffer(input({ maritalStatus: null }))!;
    expect(profile.id).toBe('profile');
    expect(profile.action).toEqual({
      kind: 'route',
      href: { pathname: '/(tabs)/settings', params: { focus: 'gender' } },
    });
    expect(pickOffer(input({ gender: null }))!.id).toBe('profile');
    expect(pickOffer(input({ maritalStatus: null, firstOpenedAt: at(J, WEDNESDAY).getTime() }))!.id).toBe('tour');
    expect(weeklyTip(input({ maritalStatus: null }))).toBeNull();
  });

  it('offers family purity tracking only to a user it is offered to, while it is off', () => {
    expect(pickOffer(input({ maritalStatus: 'married', taharahOffered: true }))!.id).toBe('taharah');
    expect(pickOffer(input({ maritalStatus: 'married', taharahOffered: true, taharahEnabled: true }))).toBeNull();
    // A single user, or one who did not answer, is never offered it.
    expect(pickOffer(input({ maritalStatus: 'single', taharahOffered: false }))).toBeNull();
    expect(hubOffers(input({ maritalStatus: null })).map((o) => o.id)).not.toContain('taharah');
    expect(weeklyTip(input({ maritalStatus: 'married', taharahOffered: true }))).toBeNull();
  });
});

describe('the habit mitzvot offers', () => {
  const habitOff = (id: string, over: Partial<OfferInput> = {}) =>
    input({ enabled: (m: string) => m !== id, markedDays: HABIT_AFTER_MARKED_DAYS, offers: SEEN, ...over });

  it('offers a habit that is off, with its own switch-on, only to a user who already marks', () => {
    const offer = pickOffer(habitOff('daily_tzedakah'))!;
    expect(offer).toMatchObject({
      id: 'daily_tzedakah',
      key: 'daily_tzedakah',
      action: { kind: 'mitzvot', ids: ['daily_tzedakah'] },
    });
    expect(pickOffer(habitOff('daily_tzedakah', { markedDays: HABIT_AFTER_MARKED_DAYS - 1 }))).toBeNull();
    expect(pickOffer(habitOff('daily_tzedakah', { offered: (m) => m !== 'daily_tzedakah' }))).toBeNull();
    expect(pickOffer(input({ markedDays: 30, offers: SEEN }))).toBeNull();
  });

  it('never offers one again once it was closed, and moves on to the next habit after the gap', () => {
    const off = { enabled: (m: string) => !HABIT_IDS.includes(m), markedDays: 30 };
    expect(pickOffer(input({ ...off, offers: SEEN }))!.id).toBe('tehillim_chapter');
    const closed = { ...SEEN, tehillim_chapter: { shownAt: ago(9), closedAt: ago(9) } };
    expect(pickOffer(input({ ...off, offers: closed }))!.id).toBe('two_mishnayot');
    const justClosed = { ...SEEN, tehillim_chapter: { shownAt: ago(1), closedAt: ago(1) } };
    expect(pickOffer(input({ ...off, offers: justClosed }))).toBeNull();
  });

  it('offers the two about children only to a married user', () => {
    expect(pickOffer(habitOff('kids_story'))).toBeNull();
    expect(pickOffer(habitOff('kids_story', { maritalStatus: null }))?.id).not.toBe('kids_story');
    expect(pickOffer(habitOff('kids_story', { maritalStatus: 'married' }))!.id).toBe('kids_story');
    expect(pickOffer(habitOff('kids_learning', { maritalStatus: 'married' }))!.id).toBe('kids_learning');
    expect(pickOffer(habitOff('call_parents'))!.id).toBe('call_parents');
  });

  it('comes after every other offer, and may be the weekly tip', () => {
    const off = { enabled: (m: string) => m !== 'daily_tzedakah' && m !== 'birchot_hashachar', markedDays: 30 };
    expect(pickOffer(input({ ...off, offers: SEEN }))!.id).toBe('birchot');
    expect(weeklyTip(habitOff('daily_tzedakah'))!.id).toBe('daily_tzedakah');
  });

  it('has an offer for every habit mitzvah', () => {
    for (const id of HABIT_IDS) {
      expect(pickOffer(habitOff(id, { maritalStatus: 'married' }))!.id).toBe(id);
    }
  });
});
