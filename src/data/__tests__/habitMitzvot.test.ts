import { BUNDLES, RECOMMENDED_BUNDLES, bundleSelection } from '@/data/bundles';
import { CAPABILITIES } from '@/data/capabilities';
import { CITIES } from '@/data/cities';
import { HABIT_IDS, LIBRARY_GROUPS, MITZVOT, findMitzvah } from '@/data/mitzvot';
import { hasSiddurText, siddurPlace } from '@/data/siddur';
import en from '@/i18n/en.json';
import he from '@/i18n/he.json';
import { DEFAULT_ON_MITZVOT } from '@/stores/useMitzvotStore';
import { ZmanimService } from '@/services/ZmanimService';
import { at } from '@/testing/zmanim';
import type { UserSettings } from '@/types/mitzvah';
import type { Location } from '@/types/zmanim';
import { clockOf } from '@/utils/clock';
import { isSkippedAt } from '@/utils/skipRules';

const JERUSALEM = CITIES[0];
const NEW_YORK = CITIES.find((city) => city.tz === 'America/New_York')!;
const SETTINGS: UserSettings = { nusach: 'ashkenaz', halachicOpinions: { ksSofZman: 'GRA' }, inIsrael: true };
// Sunday 2026-11-15 to Saturday 2026-11-21, by weekday.
const WEEK = ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'];
const SUN_TO_FRI = [0, 1, 2, 3, 4, 5];
const SUN_TO_THU = [0, 1, 2, 3, 4];
const EXPECTED: Record<string, { group: string; hours: [string, string]; days: number[] }> = {
  tehillim_chapter: { group: 'learning', hours: ['09:30', '16:30'], days: SUN_TO_FRI },
  two_mishnayot: { group: 'learning', hours: ['06:30', '08:30'], days: SUN_TO_FRI },
  learning_on_the_way: { group: 'learning', hours: ['07:00', '09:30'], days: SUN_TO_THU },
  torah_class: { group: 'learning', hours: ['20:00', '22:30'], days: SUN_TO_THU },
  daily_tzedakah: { group: 'chesed', hours: ['08:00', '14:00'], days: SUN_TO_FRI },
  call_parents: { group: 'chesed', hours: ['18:00', '21:00'], days: SUN_TO_THU },
  kids_learning: { group: 'chesed', hours: ['17:00', '19:00'], days: SUN_TO_THU },
  kids_story: { group: 'chesed', hours: ['19:00', '20:30'], days: SUN_TO_THU },
  gratitude: { group: 'chesed', hours: ['21:00', '23:30'], days: SUN_TO_THU },
  grandparents_call: { group: 'chesed', hours: ['09:00', '13:00'], days: [5] },
  shabbat_prep: { group: 'weekly', hours: ['08:00', '12:00'], days: [5] },
};

const windowOn = (id: string, dayKey: string, location: Location) => {
  const noon = at(location, `${dayKey}T12:00`);
  const zmanim = ZmanimService.getZmanim(noon, location)!;
  return findMitzvah(id)!.computeWindow({ date: noon, location, settings: SETTINGS, zmanim });
};

describe('the habit mitzvot', () => {
  it('are the eleven of the owner’s list, registry mitzvot off by default, before Kiddush Levana', () => {
    expect([...HABIT_IDS].sort()).toEqual(Object.keys(EXPECTED).sort());
    const ids = MITZVOT.map((mitzvah) => mitzvah.id);
    expect(ids.slice(ids.indexOf(HABIT_IDS[0]), ids.indexOf('kiddush_levana'))).toEqual(HABIT_IDS);
    expect(ids[ids.length - 1]).toBe('chok_leyisrael');
    for (const id of HABIT_IDS) expect(DEFAULT_ON_MITZVOT).not.toContain(id);
  });

  it.each(Object.entries(EXPECTED))(
    '%s sits in its group, for every nusach, with one reminder at its start',
    (id, want) => {
      const mitzvah = findMitzvah(id)!;
      expect(mitzvah.group).toBe(want.group);
      expect(LIBRARY_GROUPS).toContain(mitzvah.group);
      expect(mitzvah.isCustom).toBeUndefined();
      expect(mitzvah.nuschaotSupported).toHaveLength(5);
      expect(mitzvah.skipOn).toEqual(['shabbat', 'yomtov']);
      expect(mitzvah.defaultReminders).toEqual([{ anchor: 'start', offsetMin: 0, label: mitzvah.name.he }]);
      expect(mitzvah.name.en).toBeTruthy();
      expect(mitzvah.description?.he).toBeTruthy();
      expect(hasSiddurText(mitzvah, 'ashkenaz', at(JERUSALEM, '2026-11-18T12:00'), siddurPlace(JERUSALEM, true))).toBe(
        false,
      );
    },
  );

  it.each(Object.entries(EXPECTED))(
    '%s opens on its weekdays at its hours on the location’s clock, in Jerusalem and New York',
    (id, want) => {
      for (const location of [JERUSALEM, NEW_YORK]) {
        WEEK.forEach((dayKey, weekday) => {
          const window = windowOn(id, dayKey, location);
          if (!want.days.includes(weekday)) return expect([dayKey, window]).toEqual([dayKey, null]);
          expect([dayKey, clockOf(window!.start, location.tz), clockOf(window!.end, location.tz)]).toEqual([
            dayKey,
            ...want.hours,
          ]);
        });
      }
    },
  );

  it('is skipped on a Yom Tov that falls on one of its weekdays', () => {
    // Thursday 2027-04-22 is the first day of Pesach.
    const noon = at(JERUSALEM, '2027-04-22T12:00');
    expect(isSkippedAt(findMitzvah('daily_tzedakah')!, noon, JERUSALEM, SETTINGS)).toBe(true);
    expect(isSkippedAt(findMitzvah('daily_tzedakah')!, at(JERUSALEM, '2026-11-18T12:00'), JERUSALEM, SETTINGS)).toBe(
      false,
    );
  });

  it('each has a capability of its own id, with words for the capability, the library row and the offer', () => {
    for (const id of HABIT_IDS) {
      expect(CAPABILITIES.find((cap) => cap.id === id)?.action).toEqual({ kind: 'mitzvot', ids: [id] });
      for (const dict of [he, en] as Record<string, string>[]) {
        for (const key of [
          `capability.${id}.title`,
          `capability.${id}.benefit`,
          `library.benefit.${id}`,
          `offer.${id}.title`,
          `offer.${id}.body`,
          `offer.${id}.accept`,
        ]) {
          expect([key, Boolean(dict[key])]).toEqual([key, true]);
        }
      }
    }
  });

  it('are all in a bundle, none ticked by the recommended bundles, and a ticked habit bundle switches on its recommended members', () => {
    const members = BUNDLES.flatMap((bundle) => bundle.members);
    for (const id of HABIT_IDS) expect(members).toContain(id);
    const all = () => true;
    const recommended = bundleSelection(RECOMMENDED_BUNDLES, null, all).mitzvot;
    for (const id of HABIT_IDS) expect(recommended).not.toContain(id);
    expect(bundleSelection(['habits'], null, all).mitzvot).toEqual(['tehillim_chapter']);
    expect(bundleSelection(['chesed'], null, all).mitzvot).toEqual(['daily_tzedakah', 'call_parents', 'gratitude']);
  });
});
