import { CITIES } from '@/data/cities';
import { MISHNA_MITZVOT, MISHNA_YOMIT_ID, TWO_MISHNAYOT_ID, mishnaMakeUpDays, mishnaReadingOn } from '@/data/mishna';
import { findMitzvah } from '@/data/mitzvot';
import { hasSiddurText, nextMitzvahTextWindow, siddurPlace } from '@/data/siddur';
import { ZmanimService } from '@/services/ZmanimService';
import { dateKey } from '@/stores/useCompletionsStore';
import { useMishnaStore } from '@/stores/useMishnaStore';
import { installMishnaFixture } from '@/testing/mishna';
import { at } from '@/testing/zmanim';
import type { UserSettings } from '@/types/mitzvah';
import { clockOf } from '@/utils/clock';
import { MISHNA_TRACTATES, mishnaYomitOn } from '@/utils/mishna';
import { MISHNA_SIZE_ESTIMATE_MB, parseMishnaManifest } from '@/services/MishnaContentService';

const JERUSALEM = CITIES[0];
const SETTINGS: UserSettings = { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };
const day = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const windowOn = (id: string, iso: string) => {
  const noon = at(JERUSALEM, `${iso}T12:00`);
  const zmanim = ZmanimService.getZmanim(noon, JERUSALEM)!;
  return findMitzvah(id)!.computeWindow({ date: noon, location: JERUSALEM, settings: SETTINGS, zmanim });
};

describe('the Mishnah mitzvot', () => {
  beforeEach(() => useMishnaStore.getState().reset());

  it.each(MISHNA_MITZVOT)('%s has no window and no text until the add-on is installed', (id) => {
    expect(windowOn(id, '2026-11-18')).toBeNull();
    installMishnaFixture();
    const window = windowOn(id, '2026-11-18');
    expect(window).not.toBeNull();
    expect(
      hasSiddurText(findMitzvah(id)!, 'ashkenaz', at(JERUSALEM, '2026-11-18T12:00'), siddurPlace(JERUSALEM, true)),
    ).toBe(true);
  });

  it('opens Mishna Yomit on Sunday from Shabbat, off season, once installed', () => {
    installMishnaFixture();
    const next = nextMitzvahTextWindow(
      findMitzvah(MISHNA_YOMIT_ID)!,
      'ashkenaz',
      JERUSALEM,
      SETTINGS,
      siddurPlace(JERUSALEM, true),
      at(JERUSALEM, '2026-11-21T12:00'),
    );
    expect(next && [dateKey(next.date), clockOf(next.start, JERUSALEM.tz)]).toEqual(['2026-11-22', '18:00']);
  });

  it("reads Mishna Yomit's two of the day and two mishnayot from the user's place", () => {
    expect(mishnaReadingOn(MISHNA_YOMIT_ID, day('2026-11-18'), {}, {}).label.en).toBe('Negaim 1:2–3');
    const completions = { '2026-11-16': { two_mishnayot: 1 }, '2026-11-17': { two_mishnayot: 1 } };
    // Two days marked before, and three pruned by retention: the eleventh and twelfth mishnayot (Berakhot 1 has five).
    expect(mishnaReadingOn(TWO_MISHNAYOT_ID, day('2026-11-18'), completions, { two_mishnayot: 3 }).label.en).toBe(
      'Berakhot 2:6–7',
    );
    // A day's own mark does not move its reading.
    const marked = { ...completions, '2026-11-18': { two_mishnayot: 1 } };
    expect(mishnaReadingOn(TWO_MISHNAYOT_ID, day('2026-11-18'), marked, {}).label.en).toBe(
      'Berakhot 1:5 – Berakhot 2:1',
    );
  });

  it('offers the unmarked days of the last week as make-ups, Shabbat included, none before the switch-on', () => {
    const today = day('2026-11-22');
    const completions = { '2026-11-19': { mishna_yomit: 1 } };
    const all = mishnaMakeUpDays(MISHNA_YOMIT_ID, today, completions, undefined, JERUSALEM);
    expect(all.map(({ date }) => dateKey(date))).toEqual([
      '2026-11-21',
      '2026-11-20',
      '2026-11-18',
      '2026-11-17',
      '2026-11-16',
      '2026-11-15',
    ]);
    expect(all[0].reading).toEqual(mishnaYomitOn(day('2026-11-21')));
    const since = at(JERUSALEM, '2026-11-20T12:00').getTime();
    expect(
      mishnaMakeUpDays(MISHNA_YOMIT_ID, today, completions, since, JERUSALEM).map(({ date }) => dateKey(date)),
    ).toEqual(['2026-11-21', '2026-11-20']);
    expect(mishnaMakeUpDays(TWO_MISHNAYOT_ID, today, {}, undefined, JERUSALEM)).toEqual([]);
  });
});

describe('the Mishnah add-on', () => {
  it('estimates its size from the published manifest, every tractate a key', () => {
    const manifest = JSON.parse(
      require('fs').readFileSync(
        require('path').join(__dirname, '..', '..', '..', 'docs', 'mishna', 'manifest.json'),
        'utf8',
      ),
    );
    expect(MISHNA_SIZE_ESTIMATE_MB).toBe(Math.round(manifest.gzipBytes / 100_000) / 10);
    expect(parseMishnaManifest(manifest).version).toBe(manifest.version);
    expect(Object.keys(manifest.gz)).toEqual(MISHNA_TRACTATES);
  });
});
