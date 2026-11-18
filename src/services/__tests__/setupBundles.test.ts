jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { BUNDLES, findBundle } from '@/data/bundles';
import { findCapability } from '@/data/capabilities';
import { capabilityInputNow } from '@/services/capabilityInput';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useUserStore } from '@/stores/useUserStore';
import { setupBundlesHint } from '@/utils/discovery';
import { applyRecommendedBundlesOnce, bundleDefaultMembers, memberOn, memberTarget } from '../setupBundles';

const on = (id: string) => useMitzvotStore.getState().activeMitzvot[id]?.enabled === true;
const user = () => useUserStore.getState();
const offered = (id: string) => capabilityInputNow().offered(id);
const cap = (id: string) => findCapability(id)!;

describe('the bundles step over the stores', () => {
  beforeEach(() => {
    user().reset();
    // An install that switched both notice topics off, so the step's own switching is what is read.
    useUserStore.setState({ hilulotEnabled: false, roshChodeshEnabled: false });
    useMitzvotStore.getState().reset();
  });

  it('applies the recommended bundles once per gender answer and never switches anything off', () => {
    expect(applyRecommendedBundlesOnce(null, offered)).toBe(true);
    expect(on('candle_lighting')).toBe(true);
    expect(on('havdalah')).toBe(true);
    expect(on('sefirat_haomer')).toBe(true);
    expect(user().roshChodeshEnabled).toBe(true);
    expect(user().hilulotEnabled).toBe(true);
    expect(user().discovery.hints).toContain(setupBundlesHint(null));

    // The user's own change survives a second visit.
    useMitzvotStore.getState().setEnabled('sefirat_haomer', false);
    expect(applyRecommendedBundlesOnce(null, offered)).toBe(false);
    expect(on('sefirat_haomer')).toBe(false);

    // A new gender answer starts from its recommendation; candle lighting, already on, is left alone.
    expect(applyRecommendedBundlesOnce('male', offered)).toBe(true);
    expect(on('sefirat_haomer')).toBe(true);
    expect(on('candle_lighting')).toBe(true);
  });

  it('leaves a topic alone when it cannot be switched on, instead of throwing or forcing it', () => {
    for (const kind of ['before', 'evening', 'day'] as const) {
      useUserStore.setState((s) => ({
        roshChodeshNotices: { ...s.roshChodeshNotices, [kind]: { ...s.roshChodeshNotices[kind], enabled: false } },
      }));
    }
    expect(applyRecommendedBundlesOnce(null, offered)).toBe(true);
    expect(user().roshChodeshEnabled).toBe(false);
    expect(on('havdalah')).toBe(true);
  });

  it('reads a member as its mitzvot for this gender, its notice topic, or a wish to download', () => {
    const input = capabilityInputNow();
    expect(memberTarget(cap('candles'), 'male', input)).toEqual({ kind: 'mitzvot', ids: ['havdalah'] });
    expect(memberTarget(cap('candles'), 'female', input)).toEqual({
      kind: 'mitzvot',
      ids: ['candle_lighting', 'havdalah'],
    });
    expect(memberTarget(cap('roshChodesh'), null, input)).toEqual({ kind: 'notices', topic: 'roshChodesh' });
    expect(memberTarget(cap('chok'), null, input)).toEqual({ kind: 'want', id: 'chok' });
    expect(memberTarget(cap('schedule'), null, input)).toBeNull();

    expect(memberOn({ kind: 'mitzvot', ids: [] }, input, [])).toBe(false);
    expect(memberOn({ kind: 'mitzvot', ids: ['shacharit'] }, input, [])).toBe(true);
    expect(memberOn({ kind: 'mitzvot', ids: ['shacharit', 'havdalah'] }, input, [])).toBe(false);
    expect(memberOn({ kind: 'notices', topic: 'hilulot' }, input, [])).toBe(false);
    expect(memberOn({ kind: 'want', id: 'chok' }, input, ['chok'])).toBe(true);
    expect(memberOn(null, input, ['chok'])).toBe(false);
  });

  it('a bundle’s own tick switches on its recommended members, and never an add-on', () => {
    expect(bundleDefaultMembers(findBundle('calendar')!)).toEqual(['roshChodesh', 'hilulot']);
    expect(bundleDefaultMembers(findBundle('learning')!)).toEqual([]);
    expect(bundleDefaultMembers(findBundle('birchot')!)).toEqual(['birchot']);
    for (const bundle of BUNDLES) {
      for (const id of bundleDefaultMembers(bundle)) expect(findCapability(id)!.action.kind).not.toBe('addon');
    }
  });
});
