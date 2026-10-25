jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

jest.mock('expo-file-system', () => require('@/testing/expoFileSystem').expoFileSystemMock);

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { createHash } from 'crypto';
import * as Crypto from 'expo-crypto';
import { gunzipSync, strFromU8 } from 'fflate';
import { DOWNLOADED_SIDDUR_TEXT_IDS } from '@/data/siddurAssets.generated';
import { SELICHOT_NUSCHAOT } from '@/data/selichot';
import { AddonFileCorruptError } from '@/services/addons/addonFiles';
import { clearLastError, getLastError } from '@/services/errors';
import { clearSelichotCache, loadSiddurText } from '@/services/SiddurService';
import { useChokStore } from '@/stores/useChokStore';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { fileSystemState, resetFileSystem } from '@/testing/expoFileSystem';
import type { AddonManifest } from '@/types/addon';
import type { Nusach } from '@/types/mitzvah';
import {
  SELICHOT_BASE_URL,
  SELICHOT_MANIFEST_URL,
  SELICHOT_SIZE_ESTIMATE_MB,
  SELICHOT_SPACE_NEEDED_MB,
  deleteSelichot,
  installSelichot,
  parseSelichotManifest,
  reconcileSelichotInstall,
  verifySelichotInstall,
} from '../SelichotContentService';

const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');

const bodyOf = (nusach: Nusach, version: number) => ({
  nusach,
  id: 'selichot',
  sections: [{ title: { he: 'סליחות', en: 'Selichot' }, segments: [{ he: [[{ t: 'אשרי' }]] }] }],
  credits: [],
  ...(version > 1 ? { revision: version } : {}),
});

type Fixture = { manifest: AddonManifest; bodies: Record<string, Uint8Array> };

function buildFixture(version: number): Fixture {
  const bodies: Record<string, Uint8Array> = {};
  const gz: AddonManifest['gz'] = {};
  let gzipBytes = 0;
  for (const nusach of SELICHOT_NUSCHAOT) {
    const packed = Uint8Array.from(zlib.gzipSync(JSON.stringify(bodyOf(nusach, version))));
    const hash = sha256(packed);
    const file = `${nusach}.${hash.slice(0, 8)}.siddur.gz`;
    gz[nusach] = { path: file, sha256: hash, bytes: packed.length };
    bodies[file] = packed;
    gzipBytes += packed.length;
  }
  return { manifest: { format: 1, version, gzipBytes, gz }, bodies };
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
    if (url.startsWith(SELICHOT_MANIFEST_URL)) return reply(JSON.stringify(fixtures[0].manifest));
    for (const { bodies } of fixtures) {
      const file = url.slice(SELICHOT_BASE_URL.length);
      if (file in bodies) return reply(bodies[file]);
    }
    return reply('', 404);
  };
}

async function settle<T>(promise: Promise<T>): Promise<T> {
  await jest.runAllTimersAsync();
  return promise;
}

const fileUrls = () => hits.filter((hit) => !hit.startsWith(SELICHOT_MANIFEST_URL));
const has = (uri: string) => fileSystemState.fs.has(uri);
const store = () => useSelichotStore.getState();
const selichot = () => useMitzvotStore.getState().activeMitzvot.selichot;
const setSelichot = (state: { enabled: boolean; enabledAt?: number }) =>
  useMitzvotStore.setState((s) => ({ activeMitzvot: { ...s.activeMitzvot, selichot: state } }));

let v1: Fixture;
let v2: Fixture;

beforeAll(() => {
  v1 = buildFixture(1);
  v2 = buildFixture(2);
});

beforeEach(() => {
  jest.useRealTimers();
  resetFileSystem();
  hits = [];
  route = serve(v1, v2);
  clearSelichotCache();
  fetchMock.mockClear();
  (global as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
  useSelichotStore.getState().reset();
  useChokStore.getState().reset();
  useMitzvotStore.getState().reset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('installSelichot', () => {
  it('downloads the one nusach asked for into its own folder', async () => {
    let totalBytes = 0;
    const unsubscribe = useSelichotStore.subscribe((state, prev) => {
      if (state.download !== prev.download && state.download.status === 'downloading') {
        totalBytes = state.download.totalBytes;
      }
    });
    await expect(installSelichot(v1.manifest, 'sefard')).resolves.toBe(true);
    unsubscribe();
    expect(fileUrls()).toEqual([SELICHOT_BASE_URL + v1.manifest.gz.sefard.path]);
    expect(has(`file:///doc/selichot/sefard-v1/${v1.manifest.gz.sefard.path}`)).toBe(true);
    expect(store().installed).toEqual({
      version: 1,
      bytes: v1.manifest.gz.sefard.bytes,
      installedAt: expect.any(Number),
      files: { sefard: v1.manifest.gz.sefard.path },
    });
    expect(totalBytes).toBe(v1.manifest.gz.sefard.bytes);
  });

  it('keeps the installed nusach when the new one fails, and deletes it once the new one is installed', async () => {
    await installSelichot(v1.manifest, 'ashkenaz');
    jest.useFakeTimers();
    const bad = v1.manifest.gz.sefard.path;
    route = (url, hit) => (url === SELICHOT_BASE_URL + bad ? reply('tampered') : serve(v1)(url, hit));
    await expect(settle(installSelichot(v1.manifest, 'sefard'))).resolves.toBe(false);
    expect(store().download).toEqual({ status: 'failed', reason: 'integrity' });
    expect(Object.keys(store().installed?.files ?? {})).toEqual(['ashkenaz']);
    expect(has(`file:///doc/selichot/ashkenaz-v1/${v1.manifest.gz.ashkenaz.path}`)).toBe(true);
    expect(has('file:///doc/selichot/sefard-v1')).toBe(false);

    jest.useRealTimers();
    route = serve(v1);
    await expect(installSelichot(v1.manifest, 'sefard')).resolves.toBe(true);
    expect(Object.keys(store().installed?.files ?? {})).toEqual(['sefard']);
    expect(has('file:///doc/selichot/sefard-v1')).toBe(true);
    expect(has('file:///doc/selichot/ashkenaz-v1')).toBe(false);
  });

  it('leaves the Chok enable prompt alone', async () => {
    await installSelichot(v1.manifest, 'ashkenaz');
    expect(useChokStore.getState().enablePrompt).toBe(false);
  });
});

describe('the enabled stamp of the Selichot mitzvah', () => {
  it('restamps when an install makes a nusach available that the previous record lacked, and only then', async () => {
    setSelichot({ enabled: true, enabledAt: 1 });
    const before = Date.now();
    await installSelichot(v1.manifest, 'ashkenaz');
    expect(selichot().enabled).toBe(true);
    expect(selichot().enabledAt).toBeGreaterThanOrEqual(before);

    setSelichot({ enabled: true, enabledAt: 1 });
    await installSelichot(v2.manifest, 'ashkenaz');
    expect(store().installed?.version).toBe(2);
    expect(selichot().enabledAt).toBe(1);

    const beforeSefard = Date.now();
    await installSelichot(v2.manifest, 'sefard');
    expect(selichot().enabledAt).toBeGreaterThanOrEqual(beforeSefard);
  });

  it('leaves a mitzvah that is off off and unstamped', async () => {
    setSelichot({ enabled: false });
    await installSelichot(v1.manifest, 'ashkenaz');
    expect(selichot()).toEqual({ enabled: false });
  });

  it('never switches the mitzvah off when it is deleted, reconciled with nothing installed, or its file is lost', async () => {
    expect(selichot().enabled).toBe(true);
    deleteSelichot();
    reconcileSelichotInstall();
    expect(selichot().enabled).toBe(true);
    await installSelichot(v1.manifest, 'ashkenaz');
    fileSystemState.fs.delete(`file:///doc/selichot/ashkenaz-v1/${v1.manifest.gz.ashkenaz.path}`);
    reconcileSelichotInstall();
    expect(store().installed).toBeNull();
    expect(selichot().enabled).toBe(true);
  });
});

describe('reading the add-on', () => {
  it('serves the installed nusach from its file with no new request, and rejects another', async () => {
    await installSelichot(v1.manifest, 'ashkenaz');
    hits = [];
    await expect(loadSiddurText('ashkenaz', 'selichot')).resolves.toEqual(bodyOf('ashkenaz', 1));
    expect(hits).toEqual([]);
    await expect(loadSiddurText('sefard', 'selichot')).rejects.toThrow('no siddur text sefard/selichot');
  });

  it('rejects before anything is installed', async () => {
    await expect(loadSiddurText('ashkenaz', 'selichot')).rejects.toThrow('no siddur text ashkenaz/selichot');
  });

  it('turns a damaged gzip into a corrupt-file error that forgets the install', async () => {
    await installSelichot(v1.manifest, 'ashkenaz');
    const uri = `file:///doc/selichot/ashkenaz-v1/${v1.manifest.gz.ashkenaz.path}`;
    const damaged = Uint8Array.from(fileSystemState.fs.get(uri)?.data ?? []);
    damaged.fill(0xff, 10, damaged.length - 8);
    fileSystemState.fs.set(uri, { dir: false, data: damaged });
    clearLastError();
    const error = await loadSiddurText('ashkenaz', 'selichot').then(
      () => null,
      (failure: unknown) => failure,
    );
    expect(error).toBeInstanceOf(AddonFileCorruptError);
    expect(verifySelichotInstall(error)).toBe(false);
    expect(store().installed).toBeNull();
    expect(getLastError()?.scope).toBe('storage');
  });
});

describe('the published add-on', () => {
  const DOCS = path.join(process.cwd(), 'docs', 'selichot');
  const ASSETS = path.join(process.cwd(), 'assets', 'siddur');
  const published = JSON.parse(fs.readFileSync(path.join(DOCS, 'manifest.json'), 'utf8')) as AddonManifest;

  it('parses as a manifest of the app', () => {
    expect(parseSelichotManifest(published)).toEqual(published);
  });

  it('holds one file for each nusach, with the size and the SHA-256 the manifest states', async () => {
    expect(Object.keys(published.gz)).toEqual([...SELICHOT_NUSCHAOT]);
    let sum = 0;
    for (const nusach of SELICHOT_NUSCHAOT) {
      const raw = fs.readFileSync(path.join(DOCS, published.gz[nusach].path));
      expect(raw.length).toBe(published.gz[nusach].bytes);
      expect(createHash('sha256').update(raw).digest('hex')).toBe(published.gz[nusach].sha256);
      expect(
        Buffer.from(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(raw))).toString('hex'),
      ).toBe(published.gz[nusach].sha256);
      sum += raw.length;
    }
    expect(published.gzipBytes).toBe(sum);
  });

  it('unpacks to the text of its nusach, with sections and credits', () => {
    for (const nusach of SELICHOT_NUSCHAOT) {
      const text = JSON.parse(
        strFromU8(gunzipSync(new Uint8Array(fs.readFileSync(path.join(DOCS, published.gz[nusach].path))))),
      );
      expect(text).toMatchObject({ id: 'selichot', nusach });
      expect(text.sections.length).toBeGreaterThan(0);
      expect(text.credits.length).toBeGreaterThan(0);
    }
  });

  it('has the size estimate and the free-space need the app shows', () => {
    const largest = Math.max(...Object.values(published.gz).map((file) => file.bytes));
    expect(SELICHOT_SIZE_ESTIMATE_MB).toBe(Math.ceil(largest / 1_000_000));
    expect(SELICHOT_SIZE_ESTIMATE_MB).toBe(1);
    expect(SELICHOT_SPACE_NEEDED_MB).toBe(51);
  });

  it('is out of the bundle', () => {
    for (const nusach of SELICHOT_NUSCHAOT) {
      expect(fs.existsSync(path.join(ASSETS, nusach, 'selichot.siddur'))).toBe(false);
    }
    expect(fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'siddurAssets.generated.ts'), 'utf8')).not.toContain(
      'selichot.siddur',
    );
    expect([...DOWNLOADED_SIDDUR_TEXT_IDS]).toEqual(['selichot']);
  });
});
