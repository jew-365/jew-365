import {
  BUNDLES,
  RECOMMENDED_BUNDLES,
  bundleMembers,
  bundleOn,
  bundleSelection,
  findBundle,
  memberMitzvot,
  memberTicked,
} from '../bundles';
import { CAPABILITIES, findCapability, type Capability, type CapabilityState } from '../capabilities';
import { MITZVOT } from '../mitzvot';
import en from '@/i18n/en.json';
import he from '@/i18n/he.json';

const all = () => true;
const stateOf =
  (states: Record<string, CapabilityState>, rest: CapabilityState = 'off') =>
  (cap: Capability): CapabilityState =>
    states[cap.id] ?? rest;

describe('the goal bundles', () => {
  it('are the five of the setup study and the two habit bundles, three of them recommended', () => {
    expect(BUNDLES.map((b) => b.id)).toEqual([
      'prayer',
      'shabbat',
      'calendar',
      'learning',
      'birchot',
      'habits',
      'chesed',
    ]);
    expect(RECOMMENDED_BUNDLES).toEqual(['prayer', 'shabbat', 'calendar']);
  });

  it('name only capabilities that exist, each in one bundle, with words in both languages', () => {
    const members = BUNDLES.flatMap((b) => b.members);
    expect(new Set(members).size).toBe(members.length);
    for (const id of members) expect([id, Boolean(findCapability(id))]).toEqual([id, true]);
    for (const bundle of BUNDLES)
      for (const dict of [he, en] as Record<string, string>[]) {
        expect([bundle.id, Boolean(dict[`bundle.${bundle.id}.title`])]).toEqual([bundle.id, true]);
        expect([bundle.id, Boolean(dict[`bundle.${bundle.id}.caption`])]).toEqual([bundle.id, true]);
      }
  });

  it('hold only add-ons in the pick bundle, and none elsewhere', () => {
    for (const bundle of BUNDLES)
      for (const id of bundle.members)
        expect([id, findCapability(id)!.action.kind === 'addon']).toEqual([id, bundle.pick === true]);
  });

  it('leave out a member the user is not offered', () => {
    const prayer = findBundle('prayer')!;
    expect(bundleMembers(prayer, stateOf({ tefillin: 'unavailable' })).map((c) => c.id)).toEqual([
      'prayers',
      'shema',
      'bedtimeShema',
      'cheshbon_nefesh',
      'hitbodedut',
    ]);
  });

  it('are on only when every offered member is on', () => {
    const prayer = findBundle('prayer')!;
    const on = { prayers: 'on', shema: 'on', bedtimeShema: 'on' } as const;
    expect(bundleOn(prayer, stateOf({ ...on, tefillin: 'on' }))).toBe(true);
    expect(bundleOn(prayer, stateOf({ ...on, tefillin: 'off' }))).toBe(false);
    // A woman is not offered tefillin, so the other three decide.
    expect(bundleOn(prayer, stateOf({ ...on, tefillin: 'unavailable' }))).toBe(true);
    expect(bundleOn(prayer, stateOf({}, 'unavailable'))).toBe(false);
    expect(bundleOn(findBundle('learning')!, stateOf({}, 'notInstalled'))).toBe(false);
  });

  it('tick only the recommended members, and never an add-on', () => {
    const calendar = findBundle('calendar')!;
    expect(memberTicked(calendar, 'roshChodesh')).toBe(true);
    expect(memberTicked(calendar, 'hilulot')).toBe(false);
    expect(memberTicked(findBundle('learning')!, 'chok')).toBe(false);
    expect(memberTicked(findBundle('prayer')!, 'shema')).toBe(true);
    expect(memberTicked(findBundle('prayer')!, 'omer')).toBe(false);
  });
});

describe('the gender rule of 2026-11-15', () => {
  const candles = findCapability('candles')!;

  it('ticks candle lighting for a woman and an unanswered gender, and only havdalah for a man', () => {
    expect(memberMitzvot(candles, 'female')).toEqual(['candle_lighting', 'havdalah']);
    expect(memberMitzvot(candles, null)).toEqual(['candle_lighting', 'havdalah']);
    expect(memberMitzvot(candles, 'male')).toEqual(['havdalah']);
  });

  it('ticks the Omer for everyone', () => {
    for (const gender of ['male', 'female', null] as const)
      expect(memberMitzvot(findCapability('omer')!, gender)).toEqual(['sefirat_haomer']);
  });

  it('gives no mitzvot for a capability that is not a mitzvah', () => {
    expect(memberMitzvot(findCapability('roshChodesh')!, null)).toEqual([]);
    expect(memberMitzvot(findCapability('chok')!, null)).toEqual([]);
  });
});

describe('bundleSelection', () => {
  it('is the recommended set: the prayers, Shabbat and the festivals, and Rosh Chodesh alone of the calendar', () => {
    const { mitzvot, notices } = bundleSelection(RECOMMENDED_BUNDLES, null, all);
    expect(mitzvot).toEqual([
      'shacharit',
      'mincha',
      'maariv',
      'krias_shma_shacharit',
      'tefillin',
      'krias_shma_al_hamita',
      'candle_lighting',
      'havdalah',
      'sefirat_haomer',
      'chanukah_candles',
      'ushpizin',
      'kiddush_levana',
    ]);
    expect(notices).toEqual(['roshChodesh']);
  });

  it('leaves candle lighting out for a man and keeps havdalah', () => {
    const { mitzvot } = bundleSelection(['shabbat'], 'male', all);
    expect(mitzvot).not.toContain('candle_lighting');
    expect(mitzvot).toContain('havdalah');
  });

  it('drops what the user is not offered, and switches on no add-on', () => {
    const offered = (id: string) => id !== 'ushpizin' && id !== 'tefillin';
    const { mitzvot } = bundleSelection(['prayer', 'shabbat', 'learning'], 'female', offered);
    expect(mitzvot).not.toContain('ushpizin');
    expect(mitzvot).not.toContain('tefillin');
    expect(mitzvot).not.toContain('chok_leyisrael');
  });

  it('is empty with nothing ticked, and one mitzvah for the morning blessings', () => {
    expect(bundleSelection([], null, all)).toEqual({ mitzvot: [], notices: [] });
    expect(bundleSelection(['birchot'], null, all)).toEqual({ mitzvot: ['birchot_hashachar'], notices: [] });
  });

  it('names only registry mitzvot', () => {
    const ids = new Set(MITZVOT.map((m) => m.id));
    const everything = bundleSelection(
      BUNDLES.map((b) => b.id),
      null,
      all,
    );
    expect(everything.mitzvot.filter((id) => !ids.has(id))).toEqual([]);
    expect(CAPABILITIES.length).toBeGreaterThan(20);
  });
});

describe('the library captions', () => {
  it('say what the user gets for every registry mitzvah, in both languages', () => {
    for (const mitzvah of MITZVOT)
      for (const dict of [he, en] as Record<string, string>[])
        expect([mitzvah.id, Boolean(dict[`library.benefit.${mitzvah.id}`])]).toEqual([mitzvah.id, true]);
  });
});
