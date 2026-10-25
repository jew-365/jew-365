jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import type { AddonInstall } from '@/types/addon';

type SelichotStoreModule = typeof import('../useSelichotStore');

const INSTALL: AddonInstall = {
  version: 1,
  bytes: 100,
  installedAt: 7,
  files: { ashkenaz: 'ashkenaz.0000000a.siddur.gz' },
};

function hydrate(present: boolean): SelichotStoreModule {
  let loaded!: SelichotStoreModule;
  jest.isolateModules(() => {
    jest.doMock('@/services/selichotFiles', () => ({ selichotInstallPresent: () => present }));
    const { storage } = require('@/services/StorageService');
    storage.set(
      'selichot-store',
      JSON.stringify({
        state: { installed: INSTALL, latestVersion: 2, checkedAt: 5, dismissedSeason: 5788 },
        version: 1,
      }),
    );
    loaded = require('../useSelichotStore');
  });
  return loaded;
}

describe('useSelichotStore', () => {
  it('drops an install whose file is gone on hydrate, and keeps what it last saw and the dismissed season', () => {
    const { useSelichotStore } = hydrate(false);
    const state = useSelichotStore.getState();
    expect(state.installed).toBeNull();
    expect(state.latestVersion).toBe(2);
    expect(state.checkedAt).toBe(5);
    expect(state.dismissedSeason).toBe(5788);
    expect(state.download).toEqual({ status: 'idle' });
  });

  it('keeps an install whose file is there', () => {
    expect(hydrate(true).useSelichotStore.getState().installed).toEqual(INSTALL);
  });

  it('restores the defaults on reset', () => {
    const { useSelichotStore } = hydrate(true);
    useSelichotStore.getState().setDownload({ status: 'failed', reason: 'offline' });
    useSelichotStore.getState().reset();
    expect(useSelichotStore.getState()).toMatchObject({
      installed: null,
      latestVersion: null,
      checkedAt: null,
      dismissedSeason: null,
      download: { status: 'idle' },
    });
  });

  it('persists the install, the check and the dismissed season, never the download', () => {
    const { useSelichotStore } = hydrate(true);
    useSelichotStore.getState().setDownload({ status: 'downloading', done: 0, total: 1, bytes: 1, totalBytes: 2 });
    const partialize = useSelichotStore.persist.getOptions().partialize!;
    const saved = partialize(useSelichotStore.getState());
    expect(saved).not.toHaveProperty('download');
    expect(Object.keys(saved as object).sort()).toEqual(['checkedAt', 'dismissedSeason', 'installed', 'latestVersion']);
  });

  it('answers whether the nusach is installed, and which nusach is', () => {
    const { selectSelichotInstalledFor, selectSelichotNusach, useSelichotStore } = hydrate(true);
    const state = useSelichotStore.getState();
    expect(selectSelichotInstalledFor('ashkenaz')(state)).toBe(true);
    expect(selectSelichotInstalledFor('sefard')(state)).toBe(false);
    expect(selectSelichotNusach(state)).toBe('ashkenaz');
    expect(selectSelichotNusach({ installed: null })).toBeNull();
  });

  it('records the dismissed season', () => {
    const { useSelichotStore } = hydrate(true);
    useSelichotStore.getState().reset();
    useSelichotStore.getState().dismissSeason(5788);
    expect(useSelichotStore.getState().dismissedSeason).toBe(5788);
  });
});
