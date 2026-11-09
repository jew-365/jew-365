import fs from 'fs';
import path from 'path';
import { CHOK_PARASHIYOT } from '@/data/chok';
import { CITIES } from '@/data/cities';
import { SHNAYIM_MIKRA, findMitzvah } from '@/data/mitzvot';
import { hasSiddurText, siddurPlace } from '@/data/siddur';
import { SHNAYIM_TEXT_ID } from '@/data/shnayim';
import { SHNAYIM_SIZE_ESTIMATE_MB, parseShnayimManifest } from '@/services/ShnayimContentService';
import { IDLE_DOWNLOAD } from '@/stores/addonState';
import { useShnayimStore } from '@/stores/useShnayimStore';
import { at } from '@/testing/zmanim';
import { dayWindow } from '@/utils/buildDayTimeline';
import { chokOpenMakeUps, chokPortionAt, chokPortionOn, chokText } from '@/utils/chok';
import { SHNAYIM_PROGRAM, SHNAYIM_SLOTS, shnayimAsChok, shnayimVerse } from '@/utils/shnayim';
import type { ShnayimAsset } from '@/types/shnayim';

const JERUSALEM = CITIES[0];
const SETTINGS = { nusach: 'ashkenaz' as const, halachicOpinions: { ksSofZman: 'GRA' as const }, inIsrael: true };
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

function install(installed: boolean) {
  useShnayimStore.setState({
    installed: installed
      ? { version: 1, bytes: 1, installedAt: 0, files: Object.fromEntries(CHOK_PARASHIYOT.map((p) => [p, `${p}.gz`])) }
      : null,
    download: IDLE_DOWNLOAD,
  });
}

const ASSET: ShnayimAsset = {
  parasha: 'Noach',
  credits: [
    { title: 'תורה', license: 'Public Domain', url: 'a' },
    { title: 'אונקלוס', license: 'Public Domain', url: 'b' },
  ],
  aliyot: Array.from({ length: 7 }, (_, n) => [
    {
      he: [[{ t: '(א) ', s: 'n' as const }, { t: `פסוק ${n + 1}` }], [{ t: `תרגום ${n + 1}`, s: 't' as const }]],
    },
  ]),
};

describe('the Shnayim Mikra text', () => {
  it('says each verse twice, the second time without its number, then the targum', () => {
    expect(shnayimVerse(ASSET.aliyot[0][0]).he).toEqual([
      [{ t: '(א) ', s: 'n' }, { t: 'פסוק 1' }],
      [{ t: 'פסוק 1' }],
      [{ t: 'תרגום 1', s: 't' }],
    ]);
  });

  it('reads an aliyah a day, Friday the sixth and the seventh, under the aliyah names', () => {
    const chok = shnayimAsChok(ASSET);
    expect(Object.keys(chok.slots)).toEqual([...SHNAYIM_SLOTS]);
    expect(chok.slots.sun!.map((s) => s.heading)).toEqual(['ראשון']);
    expect(chok.slots.thu!.map((s) => s.heading)).toEqual(['חמישי']);
    expect(chok.slots.fri!.map((s) => [s.heading, s.en])).toEqual([
      ['שישי', 'Aliyah 6'],
      ['שביעי', 'Aliyah 7'],
    ]);
    const text = chokText([chok], {
      id: SHNAYIM_TEXT_ID,
      slot: 'fri',
      choice: 'both',
      variant: 'ashkenazi',
      kindNames: {} as never,
      variantNames: {} as never,
    });
    expect(text.id).toBe(SHNAYIM_TEXT_ID);
    expect(text.sections.map((s) => s.title)).toEqual([
      { he: 'שישי', en: 'Aliyah 6' },
      { he: 'שביעי', en: 'Aliyah 7' },
    ]);
    expect(text.credits.map((c) => c.title)).toEqual(['תורה', 'אונקלוס']);
    expect(text.sections[0].segments[0].key).toBe('Noach:fri:שישי:0');
  });
});

describe('the Shnayim Mikra week', () => {
  it('keeps Thursday through Thursday night, where Chok LeYisrael turns to ליל שישי', () => {
    const night = at(JERUSALEM, '2026-11-19T22:30');
    expect(chokPortionAt(night, JERUSALEM, true)?.slot).toBe('thuNight');
    expect(chokPortionAt(night, JERUSALEM, true, SHNAYIM_PROGRAM)?.slot).toBe('thu');
    expect(chokPortionAt(at(JERUSALEM, '2026-11-20T10:00'), JERUSALEM, true, SHNAYIM_PROGRAM)?.slot).toBe('fri');
    expect(chokPortionAt(at(JERUSALEM, '2026-11-21T12:00'), JERUSALEM, true, SHNAYIM_PROGRAM)).toBeNull();
  });

  it("has Friday's portion in a Vezot Haberakhah week too, where Chok LeYisrael has none", () => {
    // The Friday of Chol HaMoed Sukkot 5787, a Vezot Haberakhah week.
    const friday = day(2026, 10, 2);
    expect(chokPortionOn(friday, JERUSALEM, true)).toBeNull();
    expect(chokPortionOn(friday, JERUSALEM, true, SHNAYIM_PROGRAM)).toEqual(
      expect.objectContaining({ parashiyot: ['Vezot Haberakhah'], slot: 'fri' }),
    );
  });

  it('lists the earlier unmarked days of the week by its own marks', () => {
    const makeUps = chokOpenMakeUps(
      day(2026, 11, 18),
      JERUSALEM,
      true,
      { '2026-11-16': { shnayim_mikra: 1 }, '2026-11-17': { chok_leyisrael: 1 } },
      undefined,
      SHNAYIM_PROGRAM,
    );
    expect(makeUps.map((m) => m.dateKey)).toEqual(['2026-11-15', '2026-11-17']);
  });
});

describe('the Shnayim Mikra mitzvah', () => {
  afterEach(() => install(false));

  it('is a learning mitzvah, off by default, right before Chok LeYisrael', () => {
    expect(findMitzvah(SHNAYIM_TEXT_ID)).toBe(SHNAYIM_MIKRA);
    expect(SHNAYIM_MIKRA.category).toBe('learning');
    expect(SHNAYIM_MIKRA.defaultReminders).toEqual([expect.objectContaining({ anchor: 'clock', offsetMin: 1200 })]);
  });

  it('has no window until the add-on is installed, then the learning day on a weekday and none on Shabbat', () => {
    expect(dayWindow(SHNAYIM_MIKRA, day(2026, 11, 18), JERUSALEM, SETTINGS)).toBeNull();
    install(true);
    const window = dayWindow(SHNAYIM_MIKRA, day(2026, 11, 18), JERUSALEM, SETTINGS)!;
    expect(window.start.getTime()).toBeLessThan(at(JERUSALEM, '2026-11-18T06:00').getTime());
    expect(window.end.getTime()).toBeGreaterThan(at(JERUSALEM, '2026-11-19T03:00').getTime());
    expect(dayWindow(SHNAYIM_MIKRA, day(2026, 11, 21), JERUSALEM, SETTINGS)).toBeNull();
    const place = siddurPlace(JERUSALEM, true);
    expect(hasSiddurText(SHNAYIM_MIKRA, 'ashkenaz', day(2026, 11, 18), place)).toBe(true);
    expect(hasSiddurText(SHNAYIM_MIKRA, 'ashkenaz', day(2026, 11, 21), place)).toBe(false);
  });
});

describe('the published Shnayim Mikra add-on', () => {
  const dir = path.join(__dirname, '..', '..', '..', 'docs', 'shnayim');
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));

  it('is a manifest the app accepts, every file present, and the size the screens quote', () => {
    expect(parseShnayimManifest(manifest)).toBe(manifest);
    for (const parasha of CHOK_PARASHIYOT) {
      expect(fs.statSync(path.join(dir, manifest.gz[parasha].path)).size).toBe(manifest.gz[parasha].bytes);
    }
    expect(SHNAYIM_SIZE_ESTIMATE_MB).toBe(Math.round(manifest.gzipBytes / 100_000) / 10);
  });

  it('refuses a manifest that lacks a parasha', () => {
    const { Bereshit: _gone, ...rest } = manifest.gz;
    expect(() => parseShnayimManifest({ ...manifest, gz: rest })).toThrow();
  });
});
