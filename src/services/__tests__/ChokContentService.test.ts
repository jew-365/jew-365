jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

type FsEntry = { dir: boolean; text?: string; data?: Uint8Array };
const mockState = { space: 1e12, failWrite: false, failCreate: false, fs: new Map<string, FsEntry>() };

jest.mock('expo-file-system', () => {
  const DOCUMENT = 'file:///doc';
  const join = (parts: (string | { uri: string })[]) =>
    parts.map((part) => (typeof part === 'string' ? part : part.uri)).join('/');
  const nameOf = (uri: string) => uri.slice(uri.lastIndexOf('/') + 1);
  const parentOf = (uri: string) => uri.slice(0, uri.lastIndexOf('/'));
  const removeTree = (uri: string) => {
    for (const key of [...mockState.fs.keys()]) {
      if (key === uri || key.startsWith(`${uri}/`)) mockState.fs.delete(key);
    }
  };

  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = join(parts);
    }
    get exists() {
      return mockState.fs.get(this.uri)?.dir === false;
    }
    get name() {
      return nameOf(this.uri);
    }
    write(content: string | Uint8Array) {
      if (mockState.failWrite) throw new Error('disk full');
      mockState.fs.set(
        this.uri,
        typeof content === 'string' ? { dir: false, text: content } : { dir: false, data: content },
      );
    }
    async text() {
      const entry = mockState.fs.get(this.uri);
      return entry?.text ?? (entry?.data ? new TextDecoder().decode(entry.data) : '');
    }
    async bytes() {
      const entry = mockState.fs.get(this.uri);
      return entry?.data ?? new TextEncoder().encode(entry?.text ?? '');
    }
    delete() {
      mockState.fs.delete(this.uri);
    }
  }

  class Directory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = join(parts);
    }
    get exists() {
      return mockState.fs.get(this.uri)?.dir === true;
    }
    get name() {
      return nameOf(this.uri);
    }
    create() {
      if (mockState.failCreate) throw new Error('read only');
      for (let uri = this.uri; uri.startsWith(DOCUMENT); uri = parentOf(uri)) {
        mockState.fs.set(uri, { dir: true });
      }
    }
    delete() {
      removeTree(this.uri);
    }
    rename() {
      throw new Error('rename is never used');
    }
    list() {
      return [...mockState.fs.entries()]
        .filter(([key]) => key.startsWith(`${this.uri}/`) && !key.slice(this.uri.length + 1).includes('/'))
        .map(([key, entry]) => (entry.dir ? new Directory(key) : new File(key)));
    }
  }

  return {
    Directory,
    File,
    Paths: {
      document: { uri: DOCUMENT },
      get availableDiskSpace() {
        return mockState.space;
      },
    },
  };
});

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { createHash } from 'crypto';
import { createElement } from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { gunzipSync, strFromU8 } from 'fflate';
import { ChokEnablePrompt } from '@/components/ChokEnablePrompt';
import { CHOK_PARASHIYOT } from '@/data/chok';
import { CHOK_LEYISRAEL } from '@/data/mitzvot';
import { ChokFileCorruptError } from '@/services/chokFiles';
import { clearChokCache, loadChokParasha } from '@/services/SiddurService';
import { clearLastError, getLastError } from '@/services/errors';
import { useChokStore, selectChokUpdateAvailable } from '@/stores/useChokStore';
import { effectiveReminders, useMitzvotStore } from '@/stores/useMitzvotStore';
import { renderWithTheme } from '@/testing/render';
import type { ChokManifest } from '@/types/chok';
import {
  CHOK_BASE_URL,
  CHOK_CHECK_INTERVAL_MS,
  CHOK_MANIFEST_URL,
  CHOK_SIZE_ESTIMATE_MB,
  CHOK_SPACE_NEEDED_MB,
  ChokDownloadError,
  cancelChokDownload,
  checkChokUpdate,
  chokDownloadSupported,
  deleteChok,
  installChok,
  parseChokManifest,
  prepareChokDownload,
  reconcileChokInstall,
  switchChokOn,
  verifyChokInstall,
} from '../ChokContentService';

const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const slug = (parasha: string) =>
  parasha
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

type FullManifest = ChokManifest & { bytes: number; files: NonNullable<ChokManifest['files']> };

type Fixture = { manifest: FullManifest; bodies: Record<string, string | Uint8Array>; json: Record<string, string> };

function buildFixture(version = 1): Fixture {
  const bodies: Record<string, string | Uint8Array> = {};
  const json: Record<string, string> = {};
  const files: FullManifest['files'] = {};
  const gz: ChokManifest['gz'] = {};
  let total = 0;
  let gzipTotal = 0;
  for (const parasha of CHOK_PARASHIYOT) {
    const body = JSON.stringify({
      parasha,
      credit: { title: 't', license: 'l', url: 'u' },
      dedication: null,
      slots: {},
      version,
    });
    const hash = sha256(body);
    const bytes = Buffer.byteLength(body, 'utf8');
    const file = `${slug(parasha)}.${hash.slice(0, 8)}.json`;
    files[parasha] = { path: file, sha256: hash, bytes };
    bodies[file] = body;
    json[parasha] = body;
    total += bytes;
    const packed = Uint8Array.from(zlib.gzipSync(Buffer.from(body, 'utf8')));
    const packedHash = sha256(packed);
    const gzPath = `${slug(parasha)}.${packedHash.slice(0, 8)}.json.gz`;
    gz[parasha] = { path: gzPath, sha256: packedHash, bytes: packed.length };
    bodies[gzPath] = packed;
    gzipTotal += packed.length;
  }
  const manifest: FullManifest = {
    format: 1,
    version,
    credit: { he: 'קרדיט', en: 'credit' },
    license: { name: 'CC BY-NC-SA 2.5', url: 'https://example.org/en', urlHe: 'https://example.org/he' },
    bytes: total,
    gzipBytes: gzipTotal,
    files,
    gz,
  };
  return { manifest, bodies, json };
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

function serve(...fixtures: Fixture[]): Route {
  return (url) => {
    if (url.startsWith(CHOK_MANIFEST_URL)) return reply(JSON.stringify(fixtures[0].manifest));
    for (const { bodies } of fixtures) {
      const file = url.slice(CHOK_BASE_URL.length);
      if (file in bodies) return reply(bodies[file]);
    }
    return reply('', 404);
  };
}

const fileUrls = () => hits.filter((hit) => !hit.startsWith(CHOK_MANIFEST_URL));
const hitsOf = (file: string) => hits.filter((hit) => hit === CHOK_BASE_URL + file);
const has = (uri: string) => mockState.fs.has(uri);
const failedReason = () => {
  const { download } = useChokStore.getState();
  return download.status === 'failed' ? download.reason : download.status;
};

async function settle<T>(promise: Promise<T>): Promise<T> {
  await jest.runAllTimersAsync();
  return promise;
}

function expectUnavailable(run: () => unknown) {
  let thrown: unknown;
  try {
    run();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(ChokDownloadError);
  expect((thrown as ChokDownloadError).reason).toBe('unavailable');
}

let v1: Fixture;
let v2: Fixture;

beforeAll(() => {
  v1 = buildFixture(1);
  v2 = buildFixture(2);
});

beforeEach(() => {
  jest.useRealTimers();
  mockState.fs.clear();
  mockState.space = 1e12;
  mockState.failWrite = false;
  mockState.failCreate = false;
  hits = [];
  route = serve(v1, v2);
  clearChokCache();
  fetchMock.mockClear();
  (global as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
  useChokStore.getState().reset();
  useMitzvotStore.getState().reset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('parseChokManifest', () => {
  it('accepts a valid manifest as it is', () => {
    expect(parseChokManifest(v1.manifest)).toEqual(v1.manifest);
  });

  it('refuses a wrong format, a missing parasha, a bad path and a bytes sum that is off by one', () => {
    const clone = (): FullManifest => JSON.parse(JSON.stringify(v1.manifest));
    expectUnavailable(() => parseChokManifest({ ...clone(), format: 2 }));
    const missing = clone();
    delete missing.files.Noach;
    expectUnavailable(() => parseChokManifest(missing));
    const badPath = clone();
    badPath.files.Noach.path = '../noach.json';
    expectUnavailable(() => parseChokManifest(badPath));
    const badHash = clone();
    badHash.files.Noach.sha256 = 'abc';
    expectUnavailable(() => parseChokManifest(badHash));
    expectUnavailable(() => parseChokManifest({ ...clone(), bytes: v1.manifest.bytes + 1 }));
    expectUnavailable(() => parseChokManifest(null));
  });

  it('accepts a manifest without files and bytes, and still checks a files it has', () => {
    const clone = (): FullManifest => JSON.parse(JSON.stringify(v1.manifest));
    const { files: _files, bytes: _bytes, ...bare } = clone();
    expect(parseChokManifest(bare)).toEqual(bare);

    const { bytes: _total, ...withFiles } = clone();
    expectUnavailable(() => parseChokManifest(withFiles));
    expectUnavailable(() => parseChokManifest({ ...clone(), files: null }));
    expectUnavailable(() => parseChokManifest({ ...clone(), files: {} }));
    expectUnavailable(() => parseChokManifest({ ...clone(), files: 'Noach' }));
    const badFile = clone();
    badFile.files.Noach.bytes = 0;
    expectUnavailable(() => parseChokManifest(badFile));
    const { gz: _gz, ...noGz } = clone();
    expectUnavailable(() => parseChokManifest(noGz));
  });

  it('refuses a manifest without its gzip files, or with a bad gzip entry or total', () => {
    const clone = (): FullManifest => JSON.parse(JSON.stringify(v1.manifest));
    const noGz: Partial<ChokManifest> = clone();
    delete noGz.gz;
    expectUnavailable(() => parseChokManifest(noGz));
    const noTotal: Partial<ChokManifest> = clone();
    delete noTotal.gzipBytes;
    expectUnavailable(() => parseChokManifest(noTotal));
    const plainPath = clone();
    plainPath.gz.Noach.path = v1.manifest.files.Noach.path;
    expectUnavailable(() => parseChokManifest(plainPath));
    const badHash = clone();
    badHash.gz.Noach.sha256 = 'abc';
    expectUnavailable(() => parseChokManifest(badHash));
    const missing = clone();
    delete missing.gz.Noach;
    expectUnavailable(() => parseChokManifest(missing));
    expectUnavailable(() => parseChokManifest({ ...clone(), gzipBytes: v1.manifest.gzipBytes + 1 }));
  });
});

describe('prepareChokDownload', () => {
  it('fails offline when the request rejects', async () => {
    route = () => Promise.reject(new Error('network'));
    await expect(prepareChokDownload()).resolves.toBeNull();
    expect(useChokStore.getState().download).toEqual({ status: 'failed', reason: 'offline' });
  });

  it('fails unavailable on a 404', async () => {
    route = () => reply('', 404);
    await expect(prepareChokDownload()).resolves.toBeNull();
    expect(useChokStore.getState().download).toEqual({ status: 'failed', reason: 'unavailable' });
  });

  it('returns the manifest, records the latest version and busts the cache of the manifest URL', async () => {
    await expect(prepareChokDownload()).resolves.toEqual(v1.manifest);
    const state = useChokStore.getState();
    expect(state.latestVersion).toBe(1);
    expect(state.checkedAt).not.toBeNull();
    expect(hits[0].startsWith(`${CHOK_MANIFEST_URL}?t=`)).toBe(true);
  });
});

describe('installChok', () => {
  it('downloads every file, checks it, switches it in and reports the progress', async () => {
    const dones: number[] = [];
    let lastBytes = 0;
    const unsubscribe = useChokStore.subscribe((state, prev) => {
      if (state.download !== prev.download && state.download.status === 'downloading' && state.download.done > 0) {
        dones.push(state.download.done);
        lastBytes = state.download.bytes;
      }
    });
    await expect(installChok(v1.manifest)).resolves.toBe(true);
    unsubscribe();
    expect(fileUrls()).toEqual(CHOK_PARASHIYOT.map((parasha) => CHOK_BASE_URL + v1.manifest.gz[parasha].path));
    for (const file of Object.values(v1.manifest.gz)) expect(has(`file:///doc/chok/v1/${file.path}`)).toBe(true);
    expect(useChokStore.getState().installed).toEqual({
      version: 1,
      bytes: v1.manifest.gzipBytes,
      installedAt: expect.any(Number),
      files: Object.fromEntries(CHOK_PARASHIYOT.map((parasha) => [parasha, v1.manifest.gz[parasha].path])),
    });
    expect(useChokStore.getState().download).toEqual({ status: 'idle' });
    expect(dones).toEqual(Array.from({ length: 54 }, (_, index) => index + 1));
    expect(lastBytes).toBe(v1.manifest.gzipBytes);
    expect(mockState.fs.get(`file:///doc/chok/v1/${v1.manifest.gz.Noach.path}`)?.data).toEqual(
      v1.bodies[v1.manifest.gz.Noach.path],
    );
  });

  it('sends every file request with no-store headers, so the platform HTTP cache keeps no second copy', async () => {
    await expect(installChok(v1.manifest)).resolves.toBe(true);
    const fileCalls = fetchMock.mock.calls.filter(([url]) => !url.startsWith(CHOK_MANIFEST_URL));
    expect(fileCalls).toHaveLength(CHOK_PARASHIYOT.length);
    for (const [, init] of fileCalls) {
      expect(init?.headers).toEqual({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
    }
  });

  it('sends the no-store headers again on a retry of a file', async () => {
    jest.useFakeTimers();
    const flaky = v1.manifest.gz.Bo.path;
    route = (url, hit) => (url === CHOK_BASE_URL + flaky && hit === 1 ? reply('', 503) : serve(v1)(url, hit));
    await expect(settle(installChok(v1.manifest))).resolves.toBe(true);
    const attempts = fetchMock.mock.calls.filter(([url]) => url === CHOK_BASE_URL + flaky);
    expect(attempts).toHaveLength(2);
    for (const [, init] of attempts) {
      expect(init?.headers).toEqual({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
    }
  });

  it('downloads and installs a manifest that has no files and no bytes', async () => {
    const { files: _files, bytes: _bytes, ...manifest } = v1.manifest;
    route = (url, hit) => (url.startsWith(CHOK_MANIFEST_URL) ? reply(JSON.stringify(manifest)) : serve(v1)(url, hit));

    const prepared = await prepareChokDownload();
    expect(prepared).toEqual(manifest);
    await expect(installChok(prepared!)).resolves.toBe(true);

    expect(fileUrls()).toEqual(CHOK_PARASHIYOT.map((parasha) => CHOK_BASE_URL + v1.manifest.gz[parasha].path));
    expect(useChokStore.getState().installed).toEqual({
      version: 1,
      bytes: v1.manifest.gzipBytes,
      installedAt: expect.any(Number),
      files: Object.fromEntries(CHOK_PARASHIYOT.map((parasha) => [parasha, v1.manifest.gz[parasha].path])),
    });
  });

  it('keeps nothing when a file always fails its hash', async () => {
    jest.useFakeTimers();
    const bad = v1.manifest.gz.Bo.path;
    route = (url, hit) => (url === CHOK_BASE_URL + bad ? reply('tampered') : serve(v1)(url, hit));
    await expect(settle(installChok(v1.manifest))).resolves.toBe(false);
    expect(failedReason()).toBe('integrity');
    expect(useChokStore.getState().installed).toBeNull();
    expect(has('file:///doc/chok/v1')).toBe(false);
    expect(hitsOf(bad)).toHaveLength(3);
  });

  it('checks the hash of the compressed bytes, not of the JSON', async () => {
    jest.useFakeTimers();
    const packed = v1.manifest.gz.Bo.path;
    route = (url, hit) => (url === CHOK_BASE_URL + packed ? reply(v1.json.Bo) : serve(v1)(url, hit));
    await expect(settle(installChok(v1.manifest))).resolves.toBe(false);
    expect(failedReason()).toBe('integrity');
    expect(hitsOf(packed)).toHaveLength(3);
  });

  it('retries a file whose first body fails its hash', async () => {
    jest.useFakeTimers();
    const flaky = v1.manifest.gz.Bo.path;
    route = (url, hit) => (url === CHOK_BASE_URL + flaky && hit === 1 ? reply('tampered') : serve(v1)(url, hit));
    await expect(settle(installChok(v1.manifest))).resolves.toBe(true);
    expect(hitsOf(flaky)).toHaveLength(2);
  });

  it('retries a file after an HTTP 503', async () => {
    jest.useFakeTimers();
    const flaky = v1.manifest.gz.Bo.path;
    route = (url, hit) => (url === CHOK_BASE_URL + flaky && hit === 1 ? reply('', 503) : serve(v1)(url, hit));
    await expect(settle(installChok(v1.manifest))).resolves.toBe(true);
    expect(hitsOf(flaky)).toHaveLength(2);
  });

  it('leaves the installed version untouched when an update goes offline', async () => {
    await installChok(v1.manifest);
    jest.useFakeTimers();
    const lost = v2.manifest.gz.Bo.path;
    route = (url, hit) => (url === CHOK_BASE_URL + lost ? Promise.reject(new Error('network')) : serve(v2)(url, hit));
    await expect(settle(installChok(v2.manifest))).resolves.toBe(false);
    expect(failedReason()).toBe('offline');
    expect(useChokStore.getState().installed?.version).toBe(1);
    for (const file of Object.values(v1.manifest.gz)) expect(has(`file:///doc/chok/v1/${file.path}`)).toBe(true);
    expect(has('file:///doc/chok/v2')).toBe(false);
  });

  it('fails with space when the disk is too small, before any file is fetched', async () => {
    mockState.space = v1.manifest.gzipBytes;
    await expect(installChok(v1.manifest)).resolves.toBe(false);
    expect(failedReason()).toBe('space');
    expect(fileUrls()).toEqual([]);
  });

  it('fails with storage when a write fails, and removes its directory', async () => {
    mockState.failWrite = true;
    await expect(installChok(v1.manifest)).resolves.toBe(false);
    expect(failedReason()).toBe('storage');
    expect(useChokStore.getState().installed).toBeNull();
    expect(has('file:///doc/chok/v1')).toBe(false);
  });

  it('fails with storage when the directory cannot be created', async () => {
    mockState.failCreate = true;
    await expect(installChok(v1.manifest)).resolves.toBe(false);
    expect(failedReason()).toBe('storage');
    expect(fileUrls()).toEqual([]);
  });

  it('downloads again over a damaged install of the same version and keeps the mitzvah as it was', async () => {
    await installChok(v1.manifest);
    useMitzvotStore.getState().setEnabled('chok_leyisrael', true);
    mockState.fs.delete(`file:///doc/chok/v1/${v1.manifest.gz.Bo.path}`);
    await expect(installChok(v1.manifest)).resolves.toBe(true);
    expect(useChokStore.getState().installed?.version).toBe(1);
    expect(verifyChokInstall()).toBe(true);
    expect(useMitzvotStore.getState().activeMitzvot.chok_leyisrael.enabled).toBe(true);
  });

  it('lets a cancel after the last file win over the switch', async () => {
    const last = v1.manifest.gz[CHOK_PARASHIYOT[CHOK_PARASHIYOT.length - 1]].path;
    route = (url, hit) =>
      url === CHOK_BASE_URL + last
        ? {
            ok: true,
            status: 200,
            text: async () => '',
            arrayBuffer: async () => {
              cancelChokDownload();
              return Uint8Array.from(v1.bodies[last] as Uint8Array).buffer;
            },
          }
        : serve(v1)(url, hit);
    await expect(installChok(v1.manifest)).resolves.toBe(false);
    expect(useChokStore.getState().installed).toBeNull();
    expect(useChokStore.getState().download).toEqual({ status: 'idle' });
    expect(has('file:///doc/chok/v1')).toBe(false);
  });

  it('never renames a directory, in a first install or an update', async () => {
    await expect(installChok(v1.manifest)).resolves.toBe(true);
    await expect(installChok(v2.manifest)).resolves.toBe(true);
  });

  it('stops quietly on cancel and removes its directory', async () => {
    const unsubscribe = useChokStore.subscribe((state, prev) => {
      if (state.download !== prev.download && state.download.status === 'downloading' && state.download.done === 1) {
        cancelChokDownload();
      }
    });
    await expect(installChok(v1.manifest)).resolves.toBe(false);
    unsubscribe();
    expect(useChokStore.getState().download).toEqual({ status: 'idle' });
    expect(useChokStore.getState().installed).toBeNull();
    expect(fileUrls()).toHaveLength(1);
    expect(has('file:///doc/chok/v1')).toBe(false);
  });

  it('runs once for two concurrent calls', async () => {
    const first = installChok(v1.manifest);
    const second = installChok(v1.manifest);
    expect(second).toBe(first);
    await first;
    for (const file of Object.values(v1.manifest.gz)) expect(hitsOf(file.path)).toHaveLength(1);
  });

  it('replaces an older version and deletes it', async () => {
    await installChok(v1.manifest);
    await expect(installChok(v2.manifest)).resolves.toBe(true);
    expect(useChokStore.getState().installed?.version).toBe(2);
    expect(has('file:///doc/chok/v2')).toBe(true);
    expect(has('file:///doc/chok/v1')).toBe(false);
  });
});

describe('deleteChok', () => {
  it('removes the files and the install and switches the mitzvah off', async () => {
    await installChok(v1.manifest);
    useMitzvotStore.getState().setEnabled('chok_leyisrael', true);
    deleteChok();
    expect(useChokStore.getState().installed).toBeNull();
    expect(has('file:///doc/chok')).toBe(false);
    expect(useMitzvotStore.getState().activeMitzvot.chok_leyisrael.enabled).toBe(false);
  });
});

describe('the enable prompt', () => {
  const prompt = () => useChokStore.getState().enablePrompt;
  const enabled = () => useMitzvotStore.getState().activeMitzvot.chok_leyisrael.enabled;

  it('raises it when a first download installs the add-on while the mitzvah is off, and leaves the mitzvah off', async () => {
    expect(prompt()).toBe(false);
    await expect(installChok(v1.manifest)).resolves.toBe(true);
    expect(prompt()).toBe(true);
    expect(enabled()).toBe(false);
  });

  it('does not raise it for an update download', async () => {
    await installChok(v1.manifest);
    useChokStore.getState().setEnablePrompt(false);
    await expect(installChok(v2.manifest)).resolves.toBe(true);
    expect(prompt()).toBe(false);
    expect(enabled()).toBe(false);
  });

  it('does not raise it for a download of the installed version again', async () => {
    await installChok(v1.manifest);
    useChokStore.getState().setEnablePrompt(false);
    mockState.fs.delete(`file:///doc/chok/v1/${v1.manifest.gz.Bo.path}`);
    await expect(installChok(v1.manifest)).resolves.toBe(true);
    expect(prompt()).toBe(false);
  });

  it('does not raise it when a first download fails', async () => {
    mockState.failWrite = true;
    await expect(installChok(v1.manifest)).resolves.toBe(false);
    expect(prompt()).toBe(false);
    mockState.failWrite = false;
    mockState.space = v1.manifest.gzipBytes;
    await expect(installChok(v1.manifest)).resolves.toBe(false);
    expect(failedReason()).toBe('space');
    expect(prompt()).toBe(false);
  });

  it('does not raise it when a first download is cancelled', async () => {
    const unsubscribe = useChokStore.subscribe((state, prev) => {
      if (state.download !== prev.download && state.download.status === 'downloading' && state.download.done === 1) {
        cancelChokDownload();
      }
    });
    await expect(installChok(v1.manifest)).resolves.toBe(false);
    unsubscribe();
    expect(prompt()).toBe(false);
  });

  it('does not raise it when the mitzvah is already on', async () => {
    useMitzvotStore.getState().setEnabled('chok_leyisrael', true);
    await expect(installChok(v1.manifest)).resolves.toBe(true);
    expect(prompt()).toBe(false);
    expect(enabled()).toBe(true);
  });

  it('raises it again after the add-on was deleted and downloaded anew', async () => {
    await installChok(v1.manifest);
    useChokStore.getState().setEnablePrompt(false);
    deleteChok();
    await expect(installChok(v1.manifest)).resolves.toBe(true);
    expect(prompt()).toBe(true);
  });

  it('drops a pending prompt when the install is forgotten', async () => {
    await installChok(v1.manifest);
    expect(prompt()).toBe(true);
    deleteChok();
    expect(prompt()).toBe(false);
  });

  describe('on screen', () => {
    const TITLE = 'חק לישראל הותקן';
    const download = async (manifest: ChokManifest) => {
      await act(async () => {
        await installChok(manifest);
      });
    };

    it('asks when a first download ends, and "כן" switches the mitzvah on with its default reminder', async () => {
      renderWithTheme(createElement(ChokEnablePrompt));
      expect(screen.queryByText(TITLE)).toBeNull();
      await download(v1.manifest);
      expect(screen.getByText(TITLE)).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: 'כן' }));
      expect(screen.queryByText(TITLE)).toBeNull();
      expect(enabled()).toBe(true);
      expect(effectiveReminders('chok_leyisrael')).toEqual(CHOK_LEYISRAEL.defaultReminders);
    });

    it('asks nothing when an update download ends', async () => {
      await installChok(v1.manifest);
      useChokStore.getState().setEnablePrompt(false);
      renderWithTheme(createElement(ChokEnablePrompt));
      await download(v2.manifest);
      expect(useChokStore.getState().installed?.version).toBe(2);
      expect(screen.queryByText(TITLE)).toBeNull();
    });

    it('asks nothing when a first download fails', async () => {
      mockState.failWrite = true;
      renderWithTheme(createElement(ChokEnablePrompt));
      await download(v1.manifest);
      expect(useChokStore.getState().installed).toBeNull();
      expect(screen.queryByText(TITLE)).toBeNull();
    });

    it('asks nothing when the mitzvah is already on', async () => {
      useMitzvotStore.getState().setEnabled('chok_leyisrael', true);
      renderWithTheme(createElement(ChokEnablePrompt));
      await download(v1.manifest);
      expect(useChokStore.getState().installed?.version).toBe(1);
      expect(screen.queryByText(TITLE)).toBeNull();
    });
  });
});

describe('switchChokOn', () => {
  const state = () => useMitzvotStore.getState().activeMitzvot.chok_leyisrael;

  it('switches the mitzvah on with its default reminder and stamps when', () => {
    const before = Date.now();
    switchChokOn();
    expect(state().enabled).toBe(true);
    expect(state().enabledAt).toBeGreaterThanOrEqual(before);
    expect(state().customReminders).toBeUndefined();
    expect(effectiveReminders('chok_leyisrael')).toEqual(CHOK_LEYISRAEL.defaultReminders);
  });

  it('keeps the reminders the user set', () => {
    const mine = [{ anchor: 'clock' as const, offsetMin: 420, label: 'בוקר' }];
    useMitzvotStore.getState().setReminders('chok_leyisrael', mine);
    switchChokOn();
    expect(state().enabled).toBe(true);
    expect(effectiveReminders('chok_leyisrael')).toEqual(mine);
  });

  it('restores the default reminder when every reminder was deleted while it was off', () => {
    useMitzvotStore.getState().setReminders('chok_leyisrael', []);
    expect(effectiveReminders('chok_leyisrael')).toEqual([]);
    switchChokOn();
    expect(state().enabled).toBe(true);
    expect(effectiveReminders('chok_leyisrael')).toEqual(CHOK_LEYISRAEL.defaultReminders);
  });
});

describe('checkChokUpdate', () => {
  const NOW = 1_800_000_000_000;

  it('does nothing while nothing is installed', async () => {
    await checkChokUpdate(NOW);
    expect(hits).toEqual([]);
  });

  it('does nothing within a day of the last check', async () => {
    await installChok(v1.manifest);
    hits = [];
    useChokStore.setState({ checkedAt: NOW - 1000 });
    await checkChokUpdate(NOW);
    expect(hits).toEqual([]);
  });

  it('records a newer version once the day has passed', async () => {
    await installChok(v1.manifest);
    useChokStore.setState({ checkedAt: NOW - CHOK_CHECK_INTERVAL_MS - 1 });
    route = serve(v2);
    await checkChokUpdate(NOW);
    expect(useChokStore.getState().latestVersion).toBe(2);
    expect(useChokStore.getState().checkedAt).toBe(NOW);
    expect(selectChokUpdateAvailable(useChokStore.getState())).toBe(true);
  });

  it('swallows a failure, stamps the attempt and asks again only after a day', async () => {
    await installChok(v1.manifest);
    useChokStore.setState({ checkedAt: NOW - CHOK_CHECK_INTERVAL_MS - 1 });
    route = () => Promise.reject(new Error('network'));
    await expect(checkChokUpdate(NOW)).resolves.toBeUndefined();
    expect(useChokStore.getState().checkedAt).toBe(NOW);
    expect(useChokStore.getState().latestVersion).toBe(1);
    hits = [];
    await checkChokUpdate(NOW + 1000);
    expect(hits).toEqual([]);
  });
});

describe('verifyChokInstall', () => {
  it('keeps an install whose files are all there', async () => {
    await installChok(v1.manifest);
    expect(verifyChokInstall()).toBe(true);
    expect(useChokStore.getState().installed).not.toBeNull();
  });

  it('drops an install with a missing file and switches the mitzvah off', async () => {
    await installChok(v1.manifest);
    useMitzvotStore.getState().setEnabled('chok_leyisrael', true);
    mockState.fs.delete(`file:///doc/chok/v1/${v1.manifest.gz.Bo.path}`);
    expect(verifyChokInstall()).toBe(false);
    expect(useChokStore.getState().installed).toBeNull();
    expect(useMitzvotStore.getState().activeMitzvot.chok_leyisrael.enabled).toBe(false);
  });

  it('reports false when nothing is installed', () => {
    expect(verifyChokInstall()).toBe(false);
  });
});

describe('reconcileChokInstall', () => {
  const enabled = () => useMitzvotStore.getState().activeMitzvot.chok_leyisrael.enabled;

  it('forgets an install whose files are gone and switches the mitzvah off', async () => {
    await installChok(v1.manifest);
    useMitzvotStore.getState().setEnabled('chok_leyisrael', true);
    mockState.fs.delete(`file:///doc/chok/v1/${v1.manifest.gz.Bo.path}`);
    reconcileChokInstall();
    expect(useChokStore.getState().installed).toBeNull();
    expect(enabled()).toBe(false);
  });

  it('switches the mitzvah off while nothing is installed', () => {
    useMitzvotStore.getState().setEnabled('chok_leyisrael', true);
    reconcileChokInstall();
    expect(enabled()).toBe(false);
  });

  it('deletes every leftover of chok and keeps the installed version', async () => {
    await installChok(v1.manifest);
    await installChok(v2.manifest);
    useMitzvotStore.getState().setEnabled('chok_leyisrael', true);
    mockState.fs.set('file:///doc/chok/staging', { dir: true });
    mockState.fs.set('file:///doc/chok/staging/x.json', { dir: false, text: 'x' });
    mockState.fs.set('file:///doc/chok/v1', { dir: true });
    mockState.fs.set('file:///doc/chok/v1/y.json', { dir: false, text: 'y' });
    reconcileChokInstall();
    expect(has('file:///doc/chok/staging')).toBe(false);
    expect(has('file:///doc/chok/v1')).toBe(false);
    expect(has('file:///doc/chok/v1/y.json')).toBe(false);
    expect(has('file:///doc/chok/v2')).toBe(true);
    expect(useChokStore.getState().installed?.version).toBe(2);
    expect(enabled()).toBe(true);
  });

  it('changes nothing while a download is in flight', async () => {
    useMitzvotStore.getState().setEnabled('chok_leyisrael', true);
    mockState.fs.set('file:///doc/chok/old', { dir: true });
    const running = installChok(v1.manifest);
    reconcileChokInstall();
    expect(enabled()).toBe(true);
    expect(has('file:///doc/chok/old')).toBe(true);
    expect(has('file:///doc/chok/v1')).toBe(true);
    await running;
  });

  it('does nothing on the web', () => {
    const replaced = jest.replaceProperty(Platform, 'OS', 'web');
    useMitzvotStore.getState().setEnabled('chok_leyisrael', true);
    expect(() => reconcileChokInstall()).not.toThrow();
    expect(enabled()).toBe(true);
    replaced.restore();
  });
});

describe('reading the add-on', () => {
  const enabled = () => useMitzvotStore.getState().activeMitzvot.chok_leyisrael.enabled;
  const plainNoach = () => `file:///doc/chok/v1/${v1.manifest.files.Noach.path}`;

  function installLegacy(text: string) {
    mockState.fs.set('file:///doc/chok/v1', { dir: true });
    mockState.fs.set(plainNoach(), { dir: false, text });
    useChokStore
      .getState()
      .setInstalled({ version: 1, bytes: 1, installedAt: 0, files: { Noach: v1.manifest.files.Noach.path } });
  }

  const failureOf = (promise: Promise<unknown>) =>
    promise.then(
      () => null,
      (error: unknown) => error,
    );

  it('reads a compressed install through gunzip', async () => {
    await installChok(v1.manifest);
    const stored = mockState.fs.get(`file:///doc/chok/v1/${v1.manifest.gz.Noach.path}`)?.data;
    expect([...(stored ?? []).slice(0, 2)]).toEqual([0x1f, 0x8b]);
    await expect(loadChokParasha('Noach')).resolves.toEqual(JSON.parse(v1.json.Noach));
  });

  it('reads a legacy install of plain JSON files', async () => {
    installLegacy(v1.json.Noach);
    await expect(loadChokParasha('Noach')).resolves.toEqual(JSON.parse(v1.json.Noach));
  });

  it('turns a corrupt compressed file into a download again', async () => {
    await installChok(v1.manifest);
    useMitzvotStore.getState().setEnabled('chok_leyisrael', true);
    const uri = `file:///doc/chok/v1/${v1.manifest.gz.Noach.path}`;
    const damaged = Uint8Array.from(mockState.fs.get(uri)?.data ?? []);
    damaged.fill(0xff, 10, damaged.length - 8);
    mockState.fs.set(uri, { dir: false, data: damaged });
    clearLastError();
    const error = await failureOf(loadChokParasha('Noach'));
    expect(error).toBeInstanceOf(ChokFileCorruptError);
    expect(verifyChokInstall(error)).toBe(false);
    expect(useChokStore.getState().installed).toBeNull();
    expect(enabled()).toBe(false);
    expect(getLastError()?.scope).toBe('storage');
  });

  it('turns a legacy file that does not parse into a download again', async () => {
    installLegacy('{"parasha":');
    const error = await failureOf(loadChokParasha('Noach'));
    expect(error).toBeInstanceOf(ChokFileCorruptError);
    expect(verifyChokInstall(error)).toBe(false);
  });

  it('keeps the install when a read fails for another reason', async () => {
    await installChok(v1.manifest);
    useMitzvotStore.getState().setEnabled('chok_leyisrael', true);
    expect(verifyChokInstall(new Error('disk'))).toBe(true);
    expect(useChokStore.getState().installed?.version).toBe(1);
    expect(enabled()).toBe(true);
  });

  it('keeps the install when the compressed file itself cannot be read', async () => {
    await installChok(v1.manifest);
    useMitzvotStore.getState().setEnabled('chok_leyisrael', true);
    const failure = new Error('disk');
    const read = jest.spyOn(File.prototype, 'bytes').mockRejectedValueOnce(failure);
    const error = await failureOf(loadChokParasha('Noach'));
    read.mockRestore();
    expect(error).toBe(failure);
    expect(error).not.toBeInstanceOf(ChokFileCorruptError);
    expect(verifyChokInstall(error)).toBe(true);
    expect(useChokStore.getState().installed?.version).toBe(1);
    expect(enabled()).toBe(true);
  });

  it('keeps a legacy install when its plain file itself cannot be read', async () => {
    installLegacy(v1.json.Noach);
    useMitzvotStore.getState().setEnabled('chok_leyisrael', true);
    const failure = new Error('disk');
    const read = jest.spyOn(File.prototype, 'text').mockRejectedValueOnce(failure);
    const error = await failureOf(loadChokParasha('Noach'));
    read.mockRestore();
    expect(error).toBe(failure);
    expect(verifyChokInstall(error)).toBe(true);
    expect(useChokStore.getState().installed?.version).toBe(1);
    expect(enabled()).toBe(true);
  });
});

describe('on the web', () => {
  it('supports no download', async () => {
    const replaced = jest.replaceProperty(Platform, 'OS', 'web');
    expect(chokDownloadSupported()).toBe(false);
    await expect(prepareChokDownload()).resolves.toBeNull();
    await expect(installChok(v1.manifest)).resolves.toBe(false);
    expect(hits).toEqual([]);
    expect(useChokStore.getState().enablePrompt).toBe(false);
    replaced.restore();
  });
});

describe('the published add-on', () => {
  const DOCS = path.join(process.cwd(), 'docs', 'chok');
  const published = JSON.parse(fs.readFileSync(path.join(DOCS, 'manifest.json'), 'utf8')) as FullManifest;

  it('has the size estimate the app shows', () => {
    expect(CHOK_SIZE_ESTIMATE_MB).toBe(Math.ceil(published.gzipBytes / 1_000_000));
  });

  it('asks for the size plus the free-space margin', () => {
    expect(CHOK_SPACE_NEEDED_MB).toBe(55);
  });

  it('parses as a manifest of the app', () => {
    expect(parseChokManifest(published)).toEqual(published);
  });

  it('hashes the same in node and in the app', async () => {
    const [first] = Object.values(published.gz);
    const raw = fs.readFileSync(path.join(DOCS, first.path));
    expect(createHash('sha256').update(raw).digest('hex')).toBe(first.sha256);
    expect(
      Buffer.from(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(raw))).toString('hex'),
    ).toBe(first.sha256);
  });

  it('publishes a gzip of every plain file, which the app reads back to the same JSON', () => {
    let sum = 0;
    for (const parasha of CHOK_PARASHIYOT) {
      const packed = fs.readFileSync(path.join(DOCS, published.gz[parasha].path));
      expect(packed.length).toBe(published.gz[parasha].bytes);
      expect(createHash('sha256').update(packed).digest('hex')).toBe(published.gz[parasha].sha256);
      expect(strFromU8(gunzipSync(new Uint8Array(packed)))).toBe(
        fs.readFileSync(path.join(DOCS, published.files[parasha].path), 'utf8'),
      );
      sum += packed.length;
    }
    expect(published.gzipBytes).toBe(sum);
  });
});
