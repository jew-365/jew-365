import {
  CAPABILITIES,
  CAPABILITY_GOALS,
  capabilityAddon,
  capabilityState,
  findCapability,
  type CapabilityInput,
} from '../capabilities';
import { LIBRARY_GROUPS, MITZVOT } from '../mitzvot';
import { HALACHA_BOOKS, HALACHA_TRACKS } from '../halacha';
import en from '@/i18n/en.json';
import he from '@/i18n/he.json';

const mitzvahIds = (kind: 'mitzvot' | 'addon') =>
  CAPABILITIES.flatMap((c) => (c.action.kind === kind ? [...c.action.ids] : []));

describe('the capability list covers the app', () => {
  it('names every registry mitzvah', () => {
    const covered = new Set([...mitzvahIds('mitzvot'), ...mitzvahIds('addon')]);
    const missing = MITZVOT.map((m) => m.id).filter((id) => !covered.has(id));
    expect(missing).toEqual([]);
  });

  it('has a capability for every library group, the personal one as the custom mitzvah', () => {
    for (const group of LIBRARY_GROUPS) {
      const ids = MITZVOT.filter((m) => m.group === group).map((m) => m.id);
      const covered =
        group === 'mine'
          ? Boolean(findCapability('custom'))
          : CAPABILITIES.some((c) => 'ids' in c.action && c.action.ids.some((id) => ids.includes(id)));
      expect([group, covered]).toEqual([group, true]);
    }
  });

  it('names every add-on: Chok LeYisrael, Shnayim Mikra, Selichot and every halacha book', () => {
    // The halacha capability downloads whichever track the user reads, so ask it for each track.
    const addons = new Set<string>(
      CAPABILITIES.flatMap((c) => HALACHA_TRACKS.map((track) => capabilityAddon(c, track) ?? '')),
    );
    for (const key of ['chok', 'shnayim', 'selichot', ...HALACHA_BOOKS])
      expect([key, addons.has(key)]).toEqual([key, true]);
  });

  it('reaches every destination of the More tab', () => {
    const hrefs = CAPABILITIES.flatMap((c) =>
      c.action.kind === 'route' || c.action.kind === 'notices' ? [JSON.stringify(c.action.href)] : [],
    );
    for (const href of [
      '/schedule',
      { pathname: '/siddur/[id]', params: { id: 'tehillim' } },
      '/hilulot',
      '/rosh-chodesh',
      '/compass',
      '/guide',
      { pathname: '/(tabs)/more', params: { open: 'halacha' } },
    ])
      expect([href, hrefs.includes(JSON.stringify(href))]).toEqual([href, true]);
  });

  it('gives every capability a goal, a unique id and words in both languages', () => {
    const ids = CAPABILITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CAPABILITIES) {
      expect(CAPABILITY_GOALS).toContain(c.goal);
      for (const dict of [he, en] as Record<string, string>[]) {
        expect([c.id, Boolean(dict[`capability.${c.id}.title`])]).toEqual([c.id, true]);
        expect([c.id, Boolean(dict[`capability.${c.id}.benefit`])]).toEqual([c.id, true]);
      }
    }
    for (const goal of CAPABILITY_GOALS)
      for (const dict of [he, en] as Record<string, string>[])
        expect(Boolean(dict[`capability.goal.${goal}`])).toBe(true);
  });
});

describe('capabilityState', () => {
  const base: CapabilityInput = {
    enabled: () => false,
    offered: () => true,
    installed: () => false,
    halachaTrack: 'kitzur',
    notices: { hilulot: false, roshChodesh: false },
    weeklyReport: true,
    quietHours: false,
    batteryExempt: null,
  };
  const state = (id: string, input: Partial<CapabilityInput> = {}) =>
    capabilityState(findCapability(id)!, { ...base, ...input });

  it('is on only when every mitzvah the nusach offers is on', () => {
    expect(state('candles')).toBe('off');
    expect(state('candles', { enabled: (id) => id === 'candle_lighting' })).toBe('off');
    expect(state('candles', { enabled: () => true })).toBe('on');
    // A nusach without Ushpizin has nothing to switch.
    expect(state('ushpizin', { offered: (id) => id !== 'ushpizin' })).toBe('unavailable');
  });

  it('asks for the download before the mitzvah', () => {
    expect(state('chok', { enabled: () => true })).toBe('notInstalled');
    expect(state('chok', { installed: (a) => a === 'chok' })).toBe('off');
    expect(state('chok', { installed: () => true, enabled: () => true })).toBe('on');
  });

  it("reads the halacha capability's add-on from the user's own track", () => {
    expect(capabilityAddon(findCapability('halacha')!, 'rambam')).toBe('rambam');
    expect(state('halacha', { halachaTrack: 'rambam', installed: (a) => a === 'kitzur' })).toBe('notInstalled');
    expect(state('halacha', { halachaTrack: 'rambam', installed: (a) => a === 'rambam' })).toBe('off');
  });

  it('reads notices, settings, the battery and screens', () => {
    expect(state('hilulot', { notices: { hilulot: true, roshChodesh: false } })).toBe('on');
    expect(state('roshChodesh')).toBe('off');
    expect(state('weeklyReport')).toBe('on');
    expect(state('quietHours')).toBe('off');
    expect(state('battery')).toBe('unavailable');
    expect(state('battery', { batteryExempt: false })).toBe('off');
    expect(state('battery', { batteryExempt: true })).toBe('on');
    expect(state('compass')).toBe('on');
  });
});
