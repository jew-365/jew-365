jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import fs from 'fs';
import path from 'path';
import { STORE_VERSION } from '../persistOptions';
import { MENS_MITZVOT, applyGenderDefaultsToNew, isMensMitzvah } from '../taharahOptIn';
import {
  DEFAULT_ON_MITZVOT,
  enabledSinceOf,
  takeAddedOnHydrate,
  useMitzvotStore,
  type ActiveMitzvahState,
} from '../useMitzvotStore';
import { useUserStore } from '../useUserStore';
import { findCityById } from '@/data/cities';
import { findMitzvah } from '@/data/mitzvot';
import { storage } from '@/services/StorageService';
import { at } from '@/testing/zmanim';
import { computeStats } from '@/utils/historyStats';
import { latestCheckIn } from '@/utils/checkIn';

const JERUSALEM = findCityById('jerusalem')!;
const NOW = at(JERUSALEM, '2026-10-28T10:00');
const LATER = at(JERUSALEM, '2026-10-29T10:00');
const settings = { nusach: 'ashkenaz' as const, halachicOpinions: { ksSofZman: 'GRA' as const }, inIsrael: true };
const ROOT = path.join(__dirname, '..', '..', '..');

const INSTALLED = ['tefillin', 'krias_shma_shacharit', 'shacharit', 'mincha', 'maariv'];
const registered = (ids: readonly string[]) => ids.filter((id) => findMitzvah(id) !== undefined);
const newer = () => registered(DEFAULT_ON_MITZVOT).filter((id) => !INSTALLED.includes(id));
const active = () => useMitzvotStore.getState().activeMitzvot;
const persisted = (): Record<string, ActiveMitzvahState> =>
  JSON.parse(storage.getString('mitzvot-store')!).state.activeMitzvot;
const savedWithout = (ids: readonly string[]) =>
  Object.fromEntries(Object.entries(active()).filter(([id]) => !ids.includes(id)));

async function hydrateAt(instant: Date, saved?: Record<string, ActiveMitzvahState> | null) {
  if (saved) {
    storage.set('mitzvot-store', JSON.stringify({ version: STORE_VERSION, state: { activeMitzvot: saved } }));
  } else if (saved === null) {
    storage.delete('mitzvot-store');
  }
  const clock = jest.spyOn(Date, 'now').mockReturnValue(instant.getTime());
  try {
    await useMitzvotStore.persist.rehydrate();
  } finally {
    clock.mockRestore();
  }
}

describe('new default-on mitzvot reaching an existing install', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useMitzvotStore.getState().reset();
    takeAddedOnHydrate();
  });

  it('switches on a default-on mitzvah the saved map lacks, stamped at the hydrate, and keeps every saved entry', async () => {
    await hydrateAt(NOW, savedWithout(['tefillin']));

    expect(active().tefillin).toEqual({ enabled: true, enabledAt: NOW.getTime() });
    expect(active().shacharit).toEqual({ enabled: true });
    expect(active().havdalah).toEqual({ enabled: false });
    expect(takeAddedOnHydrate()).toEqual(['tefillin']);
  });

  it('brings back a default-off mitzvah the map lacks off and unstamped', async () => {
    await hydrateAt(NOW, savedWithout(['havdalah']));

    expect(active().havdalah).toEqual({ enabled: false });
    expect(takeAddedOnHydrate()).toEqual([]);
  });

  it("starts an onboarded install's store nothing was saved to from the old defaults and stamps the newer default-on ones", async () => {
    useUserStore.setState({ isOnboarded: true });
    await hydrateAt(NOW, null);

    expect(newer()).toContain('krias_shma_al_hamita');
    INSTALLED.forEach((id) => expect(active()[id]).toEqual({ enabled: true }));
    newer().forEach((id) => expect(active()[id]).toEqual({ enabled: true, enabledAt: NOW.getTime() }));
    expect(active().havdalah).toEqual({ enabled: false });
    expect(takeAddedOnHydrate().sort()).toEqual([...newer()].sort());
  });

  it("judges none of the 30 days before the hydrate as missed for an onboarded man's install that never saved the store", async () => {
    useUserStore.setState({ gender: 'male', isOnboarded: true });
    await hydrateAt(NOW, null);
    applyGenderDefaultsToNew();
    const ids = registered(DEFAULT_ON_MITZVOT);

    newer().forEach((id) => expect(persisted()[id]).toEqual({ enabled: true, enabledAt: NOW.getTime() }));
    const stats = computeStats(
      ids.map((id) => findMitzvah(id)!),
      {},
      JERUSALEM,
      settings,
      30,
      NOW,
      { enabledSince: enabledSinceOf(active()) },
    );

    newer().forEach((id) => expect(stats.perMitzvah[id].eligible).toBe(0));
    expect(stats.perMitzvah.tefillin.eligible).toBeGreaterThan(0);
    expect(stats.perMitzvah.shacharit.eligible).toBeGreaterThan(0);
  });

  it('writes the stamp only once it is handed over, and a later launch keeps it', async () => {
    await hydrateAt(NOW, savedWithout(['tefillin']));
    expect(persisted()).not.toHaveProperty('tefillin');

    applyGenderDefaultsToNew();
    expect(persisted().tefillin).toEqual({ enabled: true, enabledAt: NOW.getTime() });

    await hydrateAt(LATER);
    expect(active().tefillin.enabledAt).toBe(NOW.getTime());
    expect(takeAddedOnHydrate()).toEqual([]);
  });

  it('judges none of the 30 days before the hydrate as missed for the added mitzvot', async () => {
    const ids = registered(DEFAULT_ON_MITZVOT);
    await hydrateAt(NOW, savedWithout(ids));
    const mitzvot = ids.map((id) => findMitzvah(id)!);

    const stats = computeStats(mitzvot, {}, JERUSALEM, settings, 30, NOW, {
      enabledSince: enabledSinceOf(active()),
    });

    ids.forEach((id) => expect(stats.perMitzvah[id].eligible).toBe(0));
    expect(stats.daily.filter((day) => day.totalCount > 0).map((day) => day.date)).toEqual(['2026-10-28']);

    const unstamped = computeStats(mitzvot, {}, JERUSALEM, settings, 30, NOW);
    expect(unstamped.perMitzvah.tefillin.eligible).toBeGreaterThan(0);
  });

  it("leaves a men's mitzvah added on hydrate off for a woman and the others on", async () => {
    useUserStore.getState().setGender('female');
    const mens = registered(MENS_MITZVOT);
    expect(mens).toContain('tefillin');

    await hydrateAt(NOW, savedWithout([...mens, 'shacharit']));
    applyGenderDefaultsToNew();

    mens.forEach((id) => expect(active()[id].enabled).toBe(false));
    expect(active().shacharit).toEqual({ enabled: true, enabledAt: NOW.getTime() });
  });

  it.each(['male', null] as const)("keeps an added men's mitzvah on for %s", async (gender) => {
    useUserStore.setState({ gender });

    await hydrateAt(NOW, savedWithout(['tefillin']));
    applyGenderDefaultsToNew();

    expect(active().tefillin).toEqual({ enabled: true, enabledAt: NOW.getTime() });
  });

  it('leaves Kiddush Levana off for a woman when the hydrate adds it', async () => {
    useUserStore.getState().setGender('female');
    await hydrateAt(NOW, savedWithout(['kiddush_levana']));
    applyGenderDefaultsToNew();
    expect(active().kiddush_levana.enabled).toBe(false);
    expect(active().shacharit).toEqual({ enabled: true });
  });

  it('switches Kiddush Levana on for a man when the hydrate adds it', async () => {
    useUserStore.getState().setGender('male');
    await hydrateAt(NOW, savedWithout(['kiddush_levana']));
    applyGenderDefaultsToNew();
    expect(active().kiddush_levana).toEqual({ enabled: true, enabledAt: NOW.getTime() });
  });

  it('keeps the bedtime Shema on for a woman when the hydrate adds it', async () => {
    useUserStore.getState().setGender('female');
    await hydrateAt(NOW, savedWithout(['krias_shma_al_hamita']));
    applyGenderDefaultsToNew();
    expect(active().krias_shma_al_hamita).toEqual({ enabled: true, enabledAt: NOW.getTime() });
  });

  it('keeps Selichot on for a woman when the hydrate adds it', async () => {
    useUserStore.getState().setGender('female');
    await hydrateAt(NOW, savedWithout(['selichot']));
    applyGenderDefaultsToNew();
    expect(active().selichot).toEqual({ enabled: true, enabledAt: NOW.getTime() });
  });

  it('keeps the Chanukah candles on for a woman when the hydrate adds them', async () => {
    useUserStore.getState().setGender('female');
    await hydrateAt(NOW, savedWithout(['chanukah_candles']));
    applyGenderDefaultsToNew();
    expect(active().chanukah_candles).toEqual({ enabled: true, enabledAt: NOW.getTime() });
  });

  it('keeps Ushpizin on for a woman when the hydrate adds it', async () => {
    useUserStore.getState().setGender('female');
    await hydrateAt(NOW, savedWithout(['ushpizin']));
    applyGenderDefaultsToNew();
    expect(active().ushpizin).toEqual({ enabled: true, enabledAt: NOW.getTime() });
  });

  it('touches only what the hydrate added, and only once', async () => {
    useUserStore.getState().setGender('female');

    await hydrateAt(NOW, { ...savedWithout(['shacharit']), tefillin: { enabled: true } });
    applyGenderDefaultsToNew();
    expect(active().tefillin.enabled).toBe(true);

    await hydrateAt(NOW, savedWithout(['tefillin']));
    applyGenderDefaultsToNew();
    expect(active().tefillin.enabled).toBe(false);

    useMitzvotStore.getState().setEnabled('tefillin', true);
    applyGenderDefaultsToNew();
    expect(active().tefillin.enabled).toBe(true);
  });

  it("returns every id it took, a men's one it switched off for a woman included, and nothing on a second call", async () => {
    useUserStore.getState().setGender('female');
    await hydrateAt(NOW, savedWithout(['tefillin', 'shacharit']));

    expect(applyGenderDefaultsToNew().sort()).toEqual(['shacharit', 'tefillin']);
    expect(active().tefillin.enabled).toBe(false);
    expect(applyGenderDefaultsToNew()).toEqual([]);
  });

  it("tells a men's mitzvah from the rest", () => {
    expect(['tefillin', 'kiddush_levana', 'shacharit', 'custom_1_a'].map(isMensMitzvah)).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });

  it('the root layout applies it once at load', () => {
    const layout = fs.readFileSync(path.join(ROOT, 'src', 'app', '_layout.tsx'), 'utf8');

    expect(layout).toMatch(/^import \{ applyGenderDefaultsToNew \} from '@\/stores\/taharahOptIn';$/m);
    expect(layout).toMatch(/^applyGenderDefaultsToNew\(\);$/m);
  });
});

describe('a fresh install', () => {
  const SUNDAY = at(JERUSALEM, '2026-11-15T09:00');
  const defaultOn = () => registered(DEFAULT_ON_MITZVOT);
  const checkInOnSunday = () =>
    latestCheckIn(
      {
        mitzvot: defaultOn().map((id) => findMitzvah(id)!),
        completions: {},
        checkIns: {},
        location: JERUSALEM,
        settings,
        enabledSince: enabledSinceOf(active()),
      },
      SUNDAY,
    );

  beforeEach(() => {
    useUserStore.getState().reset();
    useMitzvotStore.getState().reset();
    takeAddedOnHydrate();
  });

  it('stamps every default-on mitzvah with its first launch and leaves the default-off ones off and unstamped', async () => {
    await hydrateAt(NOW, null);

    defaultOn().forEach((id) => expect(active()[id]).toEqual({ enabled: true, enabledAt: NOW.getTime() }));
    expect(active().havdalah).toEqual({ enabled: false });
    expect(takeAddedOnHydrate().sort()).toEqual([...defaultOn()].sort());
  });

  it('writes the first-launch stamps once they are handed over, and a later launch keeps them', async () => {
    await hydrateAt(NOW, null);
    applyGenderDefaultsToNew();
    INSTALLED.forEach((id) => expect(persisted()[id]).toEqual({ enabled: true, enabledAt: NOW.getTime() }));

    await hydrateAt(LATER);

    INSTALLED.forEach((id) => expect(active()[id].enabledAt).toBe(NOW.getTime()));
    expect(takeAddedOnHydrate()).toEqual([]);
  });

  it.each([false, true])('keeps a saved map without enabledAt unstamped (onboarded: %s)', async (isOnboarded) => {
    useUserStore.setState({ isOnboarded });
    await hydrateAt(NOW, savedWithout([]));

    defaultOn().forEach((id) => expect(active()[id]).toEqual({ enabled: true }));
    expect(takeAddedOnHydrate()).toEqual([]);
  });

  it('has no check-in on Sunday for the Shabbat before the install', async () => {
    await hydrateAt(SUNDAY, null);
    expect(checkInOnSunday()).toBeNull();
  });

  it('still asks an onboarded install that never saved the store about that Shabbat', async () => {
    useUserStore.setState({ isOnboarded: true });
    await hydrateAt(SUNDAY, null);
    expect(checkInOnSunday()?.id).toBe('2026-11-14');
  });

  it('judges none of the 30 days before the first launch', async () => {
    await hydrateAt(NOW, null);
    const ids = defaultOn();

    const stats = computeStats(
      ids.map((id) => findMitzvah(id)!),
      {},
      JERUSALEM,
      settings,
      30,
      NOW,
      { enabledSince: enabledSinceOf(active()) },
    );

    ids.forEach((id) => expect(stats.perMitzvah[id].eligible).toBe(0));
    expect(stats.daily.filter((day) => day.totalCount > 0).map((day) => day.date)).toEqual(['2026-10-28']);
  });

  it.each([
    [true, undefined],
    [false, NOW.getTime()],
  ] as const)('reads the user store, hydrated first, at a cold start (onboarded: %s)', (isOnboarded, enabledAt) => {
    let tefillin: ActiveMitzvahState | undefined;
    jest.isolateModules(() => {
      const { storage: coldStorage } = require('@/services/StorageService');
      coldStorage.set('user-store', JSON.stringify({ version: STORE_VERSION, state: { isOnboarded } }));
      const clock = jest.spyOn(Date, 'now').mockReturnValue(NOW.getTime());
      try {
        tefillin = require('../useMitzvotStore').useMitzvotStore.getState().activeMitzvot.tefillin;
      } finally {
        clock.mockRestore();
      }
    });
    expect(tefillin).toEqual(enabledAt === undefined ? { enabled: true } : { enabled: true, enabledAt });
  });
});
