jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

jest.mock('expo-file-system', () => require('@/testing/expoFileSystem').expoFileSystemMock);

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { createHash } from 'crypto';
import {
  HALACHA_BOOKS,
  HALACHA_YOMIT_ID,
  HILCHOT_HACHAG_ID,
  LASHON_HARA_ID,
  SHEMIRAT_HALASHON_ID,
} from '@/data/halacha';
import { halachaScheduleOf, hasHalachaContent } from '@/data/halachaContent';
import { AddonDownloadError } from '@/services/addons/addonContent';
import {
  HALACHA_BASE_URL,
  HALACHA_SIZE_ESTIMATE_MB,
  switchHalachaOn,
  deleteHalacha,
  installHalacha,
  parseHalachaManifest,
  reconcileHalachaInstalls,
} from '@/services/HalachaContentService';
import { HALACHA_SCHEDULE_FILE } from '@/services/halachaFiles';
import { clearHalachaCache, loadHalachaEnglish, loadHalachaUnit } from '@/services/SiddurService';
import { HALACHA_PACKS, HALACHA_STORES, resetHalachaStores } from '@/stores/useHalachaStore';
import { selectActive, useMitzvotStore } from '@/stores/useMitzvotStore';
import { fileSystemState, resetFileSystem } from '@/testing/expoFileSystem';
import type { AddonManifest } from '@/types/addon';
import type { HalachaPack } from '@/types/halacha';

const SITE = path.join(__dirname, '../../../docs/halacha');
const published = (dir: string) => JSON.parse(fs.readFileSync(path.join(SITE, dir, 'manifest.json'), 'utf8'));
const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');

type Fixture = { manifest: AddonManifest; bodies: Record<string, Uint8Array> };

const UNITS = ['simanim-001-010', 'simanim-011-020'];

// A small manifest of a pack in the published shape, its units' bodies by file name.
function fixture(pack: HalachaPack, version: number): Fixture {
  const bodies: Record<string, Uint8Array> = {};
  const gz: AddonManifest['gz'] = {};
  let gzipBytes = 0;
  for (const unit of UNITS) {
    const body =
      pack === 'kitzur_en'
        ? { track: 'kitzur', unit, credits: [], en: [`${unit} in English`] }
        : { track: pack, unit, title: { he: unit, en: unit }, credits: [], sections: [{ ref: unit, segments: [] }] };
    const packed = Uint8Array.from(zlib.gzipSync(JSON.stringify({ ...body, version })));
    const hash = sha256(packed);
    const file = `${unit}.${hash.slice(0, 8)}.json.gz`;
    gz[unit] = { path: file, sha256: hash, bytes: packed.length };
    bodies[file] = packed;
    gzipBytes += packed.length;
  }
  const extra =
    pack === 'kitzur_en'
      ? { track: 'kitzur', credit: { he: 'תרגום', en: 'English' }, credits: [] }
      : {
          track: pack,
          book: { he: 'ספר', en: 'Book' },
          credit: { he: 'קרדיט', en: 'credit' },
          credits: [],
          units: Object.fromEntries(UNITS.map((unit) => [unit, { he: unit, en: unit, count: 1 }])),
          schedule: { kind: 'cycle', anchor: '2026-02-03', days: [] },
          festivals: {},
        };
  return { manifest: { format: 1, version, gzipBytes, gz, ...extra } as AddonManifest, bodies };
}

let served: Fixture[] = [];
const reply = (body: Uint8Array | string, status = 200) => ({
  ok: status < 400,
  status,
  text: async () => (typeof body === 'string' ? body : new TextDecoder().decode(body)),
  arrayBuffer: async () => Uint8Array.from(typeof body === 'string' ? new TextEncoder().encode(body) : body).buffer,
});
const fetchMock = jest.fn(async (url: string) => {
  for (const { bodies } of served) {
    const file = Object.keys(bodies).find((name) => url.endsWith(`/${name}`));
    if (file) return reply(bodies[file]);
  }
  return reply('', 404);
});

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

beforeEach(() => {
  resetFileSystem();
  resetHalachaStores();
  for (const pack of HALACHA_PACKS) clearHalachaCache(pack);
  served = [];
  fetchMock.mockClear();
  (global as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
});

describe('the published halacha manifests', () => {
  it.each(HALACHA_BOOKS)('accepts the published %s manifest', (track) => {
    const manifest = published(track);
    expect(parseHalachaManifest(track, manifest)).toBe(manifest);
  });

  it("accepts the Kitzur's and the Chofetz Chaim's published English manifests, each only for its own book", () => {
    const manifest = published('kitzur/en');
    expect(parseHalachaManifest('kitzur_en', manifest)).toBe(manifest);
    const chafetzChaim = published('chafetz_chaim/en');
    expect(parseHalachaManifest('chafetz_chaim_en', chafetzChaim)).toBe(chafetzChaim);
    expectUnavailable(() => parseHalachaManifest('chafetz_chaim_en', manifest));
    const shemiratHaLashon = published('shemirat_halashon/en');
    expect(parseHalachaManifest('shemirat_halashon_en', shemiratHaLashon)).toBe(shemiratHaLashon);
    expectUnavailable(() => parseHalachaManifest('shemirat_halashon_en', chafetzChaim));
  });

  it.each([
    ['kitzur', 'kitzur'],
    ['kitzur_en', 'kitzur/en'],
    ['ben_ish_chai', 'ben_ish_chai'],
    ['rambam', 'rambam'],
    ['chafetz_chaim', 'chafetz_chaim'],
    ['chafetz_chaim_en', 'chafetz_chaim/en'],
    ['shemirat_halashon', 'shemirat_halashon'],
    ['shemirat_halashon_en', 'shemirat_halashon/en'],
  ] as const)('estimates the %s download within 0.1 MB of its manifest', (pack, dir) => {
    expect(Math.abs(HALACHA_SIZE_ESTIMATE_MB[pack] - published(dir).gzipBytes / 1e6)).toBeLessThanOrEqual(0.1);
  });

  it('downloads from the folder of each pack on Pages', () => {
    expect(HALACHA_BASE_URL).toEqual({
      kitzur: 'https://jew-365.github.io/jew-365/halacha/kitzur/',
      kitzur_en: 'https://jew-365.github.io/jew-365/halacha/kitzur/en/',
      ben_ish_chai: 'https://jew-365.github.io/jew-365/halacha/ben_ish_chai/',
      rambam: 'https://jew-365.github.io/jew-365/halacha/rambam/',
      chafetz_chaim: 'https://jew-365.github.io/jew-365/halacha/chafetz_chaim/',
      chafetz_chaim_en: 'https://jew-365.github.io/jew-365/halacha/chafetz_chaim/en/',
      shemirat_halashon: 'https://jew-365.github.io/jew-365/halacha/shemirat_halashon/',
      shemirat_halashon_en: 'https://jew-365.github.io/jew-365/halacha/shemirat_halashon/en/',
    });
  });
});

describe('a halacha manifest', () => {
  it("refuses another track's manifest, units that are not its files, a schedule of no known kind and no credit", () => {
    const { manifest } = fixture('kitzur', 1);
    expect(parseHalachaManifest('kitzur', manifest)).toBe(manifest);
    expectUnavailable(() => parseHalachaManifest('rambam', manifest));
    expectUnavailable(() =>
      parseHalachaManifest('kitzur', { ...manifest, units: { [UNITS[0]]: { he: '', en: '', count: 1 } } }),
    );
    expectUnavailable(() => parseHalachaManifest('kitzur', { ...manifest, schedule: { kind: 'weekly' } }));
    expectUnavailable(() => parseHalachaManifest('kitzur', { ...manifest, credit: 'none' }));
  });

  it("takes the English manifest's files as its keys, for the Kitzur only", () => {
    const { manifest } = fixture('kitzur_en', 1);
    expect(parseHalachaManifest('kitzur_en', manifest)).toBe(manifest);
    expectUnavailable(() => parseHalachaManifest('kitzur_en', { ...manifest, track: 'rambam' }));
  });
});

describe('a halacha install', () => {
  it('keeps the schedule beside the units, which the windows and the reader read', async () => {
    const v1 = fixture('rambam', 1);
    served = [v1];
    expect(hasHalachaContent('rambam')).toBe(false);
    await expect(installHalacha('rambam', v1.manifest)).resolves.toBe(true);
    expect(fileSystemState.fs.has(`file:///doc/halacha-rambam/v1/${HALACHA_SCHEDULE_FILE}`)).toBe(true);
    expect(hasHalachaContent('rambam')).toBe(true);
    expect(halachaScheduleOf('rambam')).toEqual({
      track: 'rambam',
      version: 1,
      book: { he: 'ספר', en: 'Book' },
      credit: { he: 'קרדיט', en: 'credit' },
      credits: [],
      units: (v1.manifest as unknown as { units: unknown }).units,
      schedule: { kind: 'cycle', anchor: '2026-02-03', days: [] },
      festivals: {},
    });
    await expect(loadHalachaUnit('rambam', UNITS[1])).resolves.toMatchObject({ unit: UNITS[1], version: 1 });
    expect(hasHalachaContent('kitzur')).toBe(false);
  });

  it('reads the new schedule after an update, and nothing after a delete', async () => {
    const v1 = fixture('rambam', 1);
    const v2 = fixture('rambam', 2);
    served = [v1, v2];
    await installHalacha('rambam', v1.manifest);
    await installHalacha('rambam', v2.manifest);
    expect(halachaScheduleOf('rambam')?.version).toBe(2);
    await expect(loadHalachaUnit('rambam', UNITS[0])).resolves.toMatchObject({ version: 2 });
    deleteHalacha('rambam');
    expect(hasHalachaContent('rambam')).toBe(false);
    await expect(loadHalachaUnit('rambam', UNITS[0])).rejects.toThrow();
  });

  it('asks to switch the mitzvot on after a first download only', async () => {
    const v1 = fixture('kitzur', 1);
    const v2 = fixture('kitzur', 2);
    served = [v1, v2];
    await installHalacha('kitzur', v1.manifest);
    expect(HALACHA_STORES.kitzur.getState().enablePrompt).toBe(true);
    HALACHA_STORES.kitzur.getState().setEnablePrompt(false);
    await installHalacha('kitzur', v2.manifest);
    expect(HALACHA_STORES.kitzur.getState().enablePrompt).toBe(false);
  });

  it("installs the Kitzur's English beside its Hebrew, each removed alone", async () => {
    const he = fixture('kitzur', 1);
    const en = fixture('kitzur_en', 1);
    served = [he, en];
    await installHalacha('kitzur', he.manifest);
    await installHalacha('kitzur_en', en.manifest);
    expect(HALACHA_STORES.kitzur_en.getState().enablePrompt).toBe(false);
    expect(fileSystemState.fs.has(`file:///doc/halacha-kitzur-en/v1/${HALACHA_SCHEDULE_FILE}`)).toBe(false);
    await expect(loadHalachaEnglish('kitzur_en', UNITS[0])).resolves.toMatchObject({ en: [`${UNITS[0]} in English`] });
    deleteHalacha('kitzur_en');
    expect(HALACHA_STORES.kitzur_en.getState().installed).toBeNull();
    expect(HALACHA_STORES.kitzur.getState().installed?.version).toBe(1);
    expect(hasHalachaContent('kitzur')).toBe(true);
  });

  it('keeps every pack in its own folder, so a reconcile clears none of the others', async () => {
    served = [fixture('kitzur', 1), fixture('rambam', 1)];
    await installHalacha('kitzur', served[0].manifest);
    await installHalacha('rambam', served[1].manifest);
    reconcileHalachaInstalls();
    expect(HALACHA_STORES.kitzur.getState().installed?.version).toBe(1);
    expect(HALACHA_STORES.rambam.getState().installed?.version).toBe(1);
    expect(hasHalachaContent('kitzur') && hasHalachaContent('rambam')).toBe(true);
  });
});

describe("the enable prompt's yes", () => {
  const on = (id: string) => selectActive(id)(useMitzvotStore.getState()).enabled;
  beforeEach(() => useMitzvotStore.getState().reset());

  it('switches on the mitzvot its book serves, and only those', () => {
    switchHalachaOn('chafetz_chaim');
    expect([on(LASHON_HARA_ID), on(HALACHA_YOMIT_ID), on(HILCHOT_HACHAG_ID)]).toEqual([true, false, false]);
    switchHalachaOn('shemirat_halashon');
    expect([on(SHEMIRAT_HALASHON_ID), on(HALACHA_YOMIT_ID)]).toEqual([true, false]);
    switchHalachaOn('rambam');
    expect([on(HALACHA_YOMIT_ID), on(HILCHOT_HACHAG_ID)]).toEqual([true, true]);
  });
});
