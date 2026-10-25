jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

jest.mock('expo-file-system', () => require('@/testing/expoFileSystem').expoFileSystemMock);

import zlib from 'zlib';
import { createHash } from 'crypto';
import { Platform } from 'react-native';
import type { StoreApi } from 'zustand';
import { CHOK_PARASHIYOT } from '@/data/chok';
import { SELICHOT_NUSCHAOT } from '@/data/selichot';
import { ADDON_CHECK_INTERVAL_MS, AddonDownloadError } from '@/services/addons/addonContent';
import {
  CHOK_BASE_URL,
  CHOK_MANIFEST_URL,
  cancelChokDownload,
  checkChokUpdate,
  deleteChok,
  installChok,
  parseChokManifest,
  prepareChokDownload,
  reconcileChokInstall,
  verifyChokInstall,
} from '@/services/ChokContentService';
import {
  SELICHOT_BASE_URL,
  SELICHOT_MANIFEST_URL,
  cancelSelichotDownload,
  checkSelichotUpdate,
  deleteSelichot,
  installSelichot,
  parseSelichotManifest,
  prepareSelichotDownload,
  reconcileSelichotInstall,
  verifySelichotInstall,
} from '@/services/SelichotContentService';
import { clearChokCache, clearSelichotCache } from '@/services/SiddurService';
import { AddonStoreState, selectAddonUpdateAvailable } from '@/stores/addonState';
import { useChokStore } from '@/stores/useChokStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { fileSystemState, resetFileSystem } from '@/testing/expoFileSystem';
import type { AddonManifest } from '@/types/addon';

const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');

type Fixture = { manifest: AddonManifest; bodies: Record<string, Uint8Array> };

type AddonCase = {
  name: string;
  baseUrl: string;
  manifestUrl: string;
  root: string;
  keys: readonly string[];
  wanted: readonly string[];
  extension: string;
  stem: (key: string) => string;
  folder: (version: number) => string;
  extra: Record<string, unknown>;
  store: StoreApi<AddonStoreState>;
  parse: (raw: unknown) => AddonManifest;
  prepare: () => Promise<AddonManifest | null>;
  install: (manifest: AddonManifest) => Promise<boolean>;
  cancel: () => void;
  remove: () => void;
  check: (now: number) => Promise<void>;
  verify: () => boolean;
  reconcile: () => void;
  clearCache: () => void;
};

const chokStem = (parasha: string) =>
  parasha
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const CASES: AddonCase[] = [
  {
    name: 'Chok LeYisrael',
    baseUrl: CHOK_BASE_URL,
    manifestUrl: CHOK_MANIFEST_URL,
    root: 'chok',
    keys: CHOK_PARASHIYOT,
    wanted: CHOK_PARASHIYOT,
    extension: '.json.gz',
    stem: chokStem,
    folder: (version) => `v${version}`,
    extra: {
      credit: { he: 'קרדיט', en: 'credit' },
      license: { name: 'CC BY-NC-SA 2.5', url: 'https://example.org/en', urlHe: 'https://example.org/he' },
    },
    store: useChokStore,
    parse: parseChokManifest,
    prepare: prepareChokDownload,
    install: (manifest) => installChok(manifest as Parameters<typeof installChok>[0]),
    cancel: cancelChokDownload,
    remove: deleteChok,
    check: checkChokUpdate,
    verify: verifyChokInstall,
    reconcile: reconcileChokInstall,
    clearCache: clearChokCache,
  },
  {
    name: 'Selichot',
    baseUrl: SELICHOT_BASE_URL,
    manifestUrl: SELICHOT_MANIFEST_URL,
    root: 'selichot',
    keys: SELICHOT_NUSCHAOT,
    wanted: ['ashkenaz'],
    extension: '.siddur.gz',
    stem: (nusach) => nusach,
    folder: (version) => `ashkenaz-v${version}`,
    extra: {},
    store: useSelichotStore,
    parse: parseSelichotManifest,
    prepare: prepareSelichotDownload,
    install: (manifest) => installSelichot(manifest, 'ashkenaz'),
    cancel: cancelSelichotDownload,
    remove: deleteSelichot,
    check: checkSelichotUpdate,
    verify: verifySelichotInstall,
    reconcile: reconcileSelichotInstall,
    clearCache: clearSelichotCache,
  },
];

function buildFixture(c: AddonCase, version: number): Fixture {
  const bodies: Record<string, Uint8Array> = {};
  const gz: AddonManifest['gz'] = {};
  let gzipBytes = 0;
  for (const key of c.keys) {
    const packed = Uint8Array.from(zlib.gzipSync(JSON.stringify({ key, version })));
    const hash = sha256(packed);
    const file = `${c.stem(key)}.${hash.slice(0, 8)}${c.extension}`;
    gz[key] = { path: file, sha256: hash, bytes: packed.length };
    bodies[file] = packed;
    gzipBytes += packed.length;
  }
  return { manifest: { format: 1, version, gzipBytes, gz, ...c.extra } as AddonManifest, bodies };
}

type Reply = { ok: boolean; status: number; text: () => Promise<string>; arrayBuffer: () => Promise<ArrayBuffer> };
type Route = (url: string, hit: number) => Reply | Promise<Reply>;

const reply = (body: string | Uint8Array, status = 200): Reply => ({
  ok: status < 400,
  status,
  text: async () => (typeof body === 'string' ? body : new TextDecoder().decode(body)),
  arrayBuffer: async () => Uint8Array.from(typeof body === 'string' ? new TextEncoder().encode(body) : body).buffer,
});

let hits: string[] = [];
let route: Route;
const fetchMock = jest.fn<Promise<Reply>, [string, RequestInit?]>(async (url) => {
  hits.push(url);
  return route(url, hits.filter((hit) => hit === url).length);
});

async function settle<T>(promise: Promise<T>): Promise<T> {
  await jest.runAllTimersAsync();
  return promise;
}

const has = (uri: string) => fileSystemState.fs.has(uri);

describe.each(CASES)('the add-on core with $name', (c) => {
  let v1: Fixture;
  let v2: Fixture;

  const serve =
    (...fixtures: Fixture[]): Route =>
    (url) => {
      if (url.startsWith(c.manifestUrl)) return reply(JSON.stringify(fixtures[0].manifest));
      const file = url.slice(c.baseUrl.length);
      for (const { bodies } of fixtures) if (file in bodies) return reply(bodies[file]);
      return reply('', 404);
    };
  const fileUrls = () => hits.filter((hit) => !hit.startsWith(c.manifestUrl));
  const hitsOf = (file: string) => hits.filter((hit) => hit === c.baseUrl + file);
  const state = () => c.store.getState();
  const pathOf = (fixture: Fixture, key: string) => fixture.manifest.gz[key].path;
  const wantedPaths = (fixture: Fixture) => c.wanted.map((key) => pathOf(fixture, key));
  const wantedBytes = (fixture: Fixture) => c.wanted.reduce((sum, key) => sum + fixture.manifest.gz[key].bytes, 0);
  const uriOf = (version: number, file: string) => `file:///doc/${c.root}/${c.folder(version)}/${file}`;
  const folderUri = (version: number) => `file:///doc/${c.root}/${c.folder(version)}`;
  const failedReason = () => {
    const { download } = state();
    return download.status === 'failed' ? download.reason : download.status;
  };
  const clone = (): AddonManifest => JSON.parse(JSON.stringify(v1.manifest));

  function expectUnavailable(run: () => unknown) {
    let thrown: unknown;
    try {
      run();
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(AddonDownloadError);
    expect((thrown as AddonDownloadError).reason).toBe('unavailable');
  }

  beforeAll(() => {
    v1 = buildFixture(c, 1);
    v2 = buildFixture(c, 2);
  });

  beforeEach(() => {
    jest.useRealTimers();
    resetFileSystem();
    hits = [];
    route = serve(v1, v2);
    c.clearCache();
    fetchMock.mockClear();
    (global as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
    useChokStore.getState().reset();
    useSelichotStore.getState().reset();
    useMitzvotStore.getState().reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refuses a wrong format, a deleted key, a path outside the folder and a gzip total that is off by one, and accepts the fixture', () => {
    expect(c.parse(v1.manifest)).toEqual(v1.manifest);
    expectUnavailable(() => c.parse({ ...clone(), format: 2 }));
    const missing = clone();
    delete missing.gz[c.keys[0]];
    expectUnavailable(() => c.parse(missing));
    const badPath = clone();
    badPath.gz[c.keys[0]].path = '../x';
    expectUnavailable(() => c.parse(badPath));
    expectUnavailable(() => c.parse({ ...clone(), gzipBytes: v1.manifest.gzipBytes + 1 }));
  });

  it('downloads the wanted files, checks them, switches them in and reports the progress', async () => {
    const dones: number[] = [];
    const unsubscribe = c.store.subscribe((next, prev) => {
      if (next.download !== prev.download && next.download.status === 'downloading' && next.download.done > 0) {
        dones.push(next.download.done);
      }
    });
    await expect(c.install(v1.manifest)).resolves.toBe(true);
    unsubscribe();
    expect(fileUrls()).toEqual(wantedPaths(v1).map((file) => c.baseUrl + file));
    for (const file of wantedPaths(v1)) expect(has(uriOf(1, file))).toBe(true);
    expect(state().installed).toEqual({
      version: 1,
      bytes: wantedBytes(v1),
      installedAt: expect.any(Number),
      files: Object.fromEntries(c.wanted.map((key) => [key, pathOf(v1, key)])),
    });
    expect(state().download).toEqual({ status: 'idle' });
    expect(dones).toEqual(Array.from({ length: c.wanted.length }, (_, index) => index + 1));
  });

  it('sends every file request with no-store headers', async () => {
    await expect(c.install(v1.manifest)).resolves.toBe(true);
    const fileCalls = fetchMock.mock.calls.filter(([url]) => !url.startsWith(c.manifestUrl));
    expect(fileCalls).toHaveLength(c.wanted.length);
    for (const [, init] of fileCalls) {
      expect(init?.headers).toEqual({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
    }
  });

  it('keeps nothing when a file always fails its hash', async () => {
    jest.useFakeTimers();
    const bad = pathOf(v1, c.wanted[0]);
    route = (url, hit) => (url === c.baseUrl + bad ? reply('tampered') : serve(v1)(url, hit));
    await expect(settle(c.install(v1.manifest))).resolves.toBe(false);
    expect(failedReason()).toBe('integrity');
    expect(state().installed).toBeNull();
    expect(has(folderUri(1))).toBe(false);
    expect(hitsOf(bad)).toHaveLength(3);
  });

  it('fails with space when the disk holds only the files, before any file is fetched', async () => {
    fileSystemState.space = wantedBytes(v1);
    await expect(c.install(v1.manifest)).resolves.toBe(false);
    expect(failedReason()).toBe('space');
    expect(fileUrls()).toEqual([]);
  });

  it('stops quietly on cancel at the first progress and removes its folder', async () => {
    const unsubscribe = c.store.subscribe((next, prev) => {
      if (next.download !== prev.download && next.download.status === 'downloading' && next.download.done === 1) {
        c.cancel();
      }
    });
    await expect(c.install(v1.manifest)).resolves.toBe(false);
    unsubscribe();
    expect(state().download).toEqual({ status: 'idle' });
    expect(state().installed).toBeNull();
    expect(fileUrls()).toHaveLength(1);
    expect(has(folderUri(1))).toBe(false);
  });

  it('runs once for two concurrent calls', async () => {
    const first = c.install(v1.manifest);
    const second = c.install(v1.manifest);
    expect(second).toBe(first);
    await first;
    for (const file of wantedPaths(v1)) expect(hitsOf(file)).toHaveLength(1);
  });

  it('replaces version 1 with version 2 and deletes the old folder', async () => {
    await c.install(v1.manifest);
    await expect(c.install(v2.manifest)).resolves.toBe(true);
    expect(state().installed?.version).toBe(2);
    expect(has(folderUri(2))).toBe(true);
    expect(has(folderUri(1))).toBe(false);
  });

  it('removes the install and the whole root', async () => {
    await c.install(v1.manifest);
    c.remove();
    expect(state().installed).toBeNull();
    expect(has(`file:///doc/${c.root}`)).toBe(false);
  });

  it('forgets an install with a deleted file when it is verified', async () => {
    await c.install(v1.manifest);
    expect(c.verify()).toBe(true);
    fileSystemState.fs.delete(uriOf(1, pathOf(v1, c.wanted[0])));
    expect(c.verify()).toBe(false);
    expect(state().installed).toBeNull();
  });

  it('forgets an install with a deleted file when it is reconciled', async () => {
    await c.install(v1.manifest);
    fileSystemState.fs.delete(uriOf(1, pathOf(v1, c.wanted[0])));
    c.reconcile();
    expect(state().installed).toBeNull();
  });

  it('deletes a stray folder when it is reconciled and keeps the installed one', async () => {
    await c.install(v1.manifest);
    fileSystemState.fs.set(`file:///doc/${c.root}/staging`, { dir: true });
    fileSystemState.fs.set(`file:///doc/${c.root}/staging/x`, { dir: false, text: 'x' });
    c.reconcile();
    expect(has(`file:///doc/${c.root}/staging`)).toBe(false);
    expect(has(`file:///doc/${c.root}/staging/x`)).toBe(false);
    expect(has(folderUri(1))).toBe(true);
    expect(state().installed?.version).toBe(1);
  });

  it('checks for an update at most once a day and offers the newer version', async () => {
    const NOW = 1_800_000_000_000;
    await c.install(v1.manifest);
    hits = [];
    c.store.setState({ checkedAt: NOW - 1000 });
    await c.check(NOW);
    expect(hits).toEqual([]);
    c.store.setState({ checkedAt: NOW - ADDON_CHECK_INTERVAL_MS - 1 });
    route = serve(v2);
    await c.check(NOW);
    expect(hits).toHaveLength(1);
    expect(state().latestVersion).toBe(2);
    expect(state().checkedAt).toBe(NOW);
    expect(selectAddonUpdateAvailable(state())).toBe(true);
  });

  it('supports no download on the web, and reconciles without throwing', async () => {
    const replaced = jest.replaceProperty(Platform, 'OS', 'web');
    await expect(c.prepare()).resolves.toBeNull();
    await expect(c.install(v1.manifest)).resolves.toBe(false);
    expect(hits).toEqual([]);
    expect(() => c.reconcile()).not.toThrow();
    replaced.restore();
  });
});
