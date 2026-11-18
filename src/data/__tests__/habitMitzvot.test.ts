import { BUNDLES, RECOMMENDED_BUNDLES, bundleSelection } from '@/data/bundles';
import { CAPABILITIES } from '@/data/capabilities';
import { CITIES } from '@/data/cities';
import { HABIT_IDS, LIBRARY_GROUPS, MITZVOT, findMitzvah } from '@/data/mitzvot';
import { MITZVAH_BOOK_TEXT, hasSiddurText, linkedStandaloneText, mitzvahTextEvening, siddurPlace } from '@/data/siddur';
import { bodyForReminder } from '@/services/notifications/planners/mitzvot';
import { readSiddurText } from '@/testing/siddur';
import en from '@/i18n/en.json';
import he from '@/i18n/he.json';
import { isMensMitzvah } from '@/stores/taharahOptIn';
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
const EXPECTED: Record<string, { group: string; hours: [string, string]; days: number[]; friday?: string }> = {
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
  daf_yomi: { group: 'learning', hours: ['07:00', '23:00'], days: SUN_TO_FRI, friday: '13:00' },
  mishna_yomit: { group: 'learning', hours: ['18:00', '23:00'], days: SUN_TO_THU },
  pirkei_avot: { group: 'learning', hours: ['20:00', '22:30'], days: [3] },
  iggeret_haramban: { group: 'learning', hours: ['07:00', '10:00'], days: [0] },
  visit_sick: { group: 'chesed', hours: ['17:00', '21:00'], days: [2] },
  friend_call: { group: 'chesed', hours: ['18:00', '21:00'], days: [1] },
  shabbat_guest: { group: 'chesed', hours: ['18:00', '21:00'], days: [3] },
  kind_word: { group: 'chesed', hours: ['07:00', '10:00'], days: SUN_TO_FRI },
  child_time: { group: 'chesed', hours: ['17:00', '19:30'], days: [0] },
  cheshbon_nefesh: { group: 'daily', hours: ['21:30', '23:30'], days: SUN_TO_THU },
  hitbodedut: { group: 'daily', hours: ['19:30', '22:30'], days: SUN_TO_THU },
  shabbat_shopping: { group: 'weekly', hours: ['16:00', '21:00'], days: [4] },
  mikveh_erev_shabbat: { group: 'weekly', hours: ['08:00', '13:00'], days: [5] },
};

const windowOn = (id: string, dayKey: string, location: Location) => {
  const noon = at(location, `${dayKey}T12:00`);
  const zmanim = ZmanimService.getZmanim(noon, location)!;
  return findMitzvah(id)!.computeWindow({ date: noon, location, settings: SETTINGS, zmanim });
};

const WITH_TEXT = [
  'tehillim_chapter',
  'gratitude',
  'pirkei_avot',
  'iggeret_haramban',
  'cheshbon_nefesh',
  'hitbodedut',
  'visit_sick',
  'kids_learning',
  'kids_story',
  'call_parents',
  'grandparents_call',
  'shabbat_guest',
];

describe('the habit mitzvot', () => {
  it('are the twenty-four of the owner’s lists, registry mitzvot off by default, before Kiddush Levana', () => {
    expect([...HABIT_IDS].sort()).toEqual(Object.keys(EXPECTED).sort());
    expect(HABIT_IDS).toHaveLength(24);
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
      // A habit opens a reader text exactly when one is linked to it (.claude/specs/habit-texts.md).
      expect(hasSiddurText(mitzvah, 'ashkenaz', at(JERUSALEM, '2026-11-18T12:00'), siddurPlace(JERUSALEM, true))).toBe(
        WITH_TEXT.includes(id),
      );
      expect(mitzvahTextEvening(id)).toBe(false);
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
            want.hours[0],
            weekday === 5 && want.friday ? want.friday : want.hours[1],
          ]);
        });
      }
    },
  );

  it('links each habit that has a text to it, and Mizmor LeTodah to its psalm in Tehillim', () => {
    expect(WITH_TEXT.map(linkedStandaloneText)).toEqual([
      'tehillim',
      'tehillim',
      'pirkei_avot',
      'iggeret_haramban',
      'cheshbon_nefesh',
      'hitbodedut',
      'bikur_cholim',
      'children_verses',
      'children_verses',
      'elu_devarim',
      'elu_devarim',
      'elu_devarim',
    ]);
    expect(MITZVAH_BOOK_TEXT.gratitude?.section).toBe('פרק ק');
    const tehillim = readSiddurText('ashkenaz', 'tehillim');
    const psalm = tehillim.sections.find((section) => section.title.he === 'פרק ק')!;
    expect(psalm.title.en).toBe('Psalm 100');
    for (const id of HABIT_IDS.filter((habit) => !WITH_TEXT.includes(habit))) {
      expect(linkedStandaloneText(id)).toBeUndefined();
    }
  });

  it('reads Pirkei Avot as six chapters, each between its opening and closing passages, with English', () => {
    const avot = readSiddurText('sefard', 'pirkei_avot');
    expect(avot.sections.map((section) => section.title.he)).toEqual([
      'פרק ראשון',
      'פרק שני',
      'פרק שלישי',
      'פרק רביעי',
      'פרק חמישי',
      'פרק שישי',
    ]);
    expect(avot.sections.map((section) => section.segments.length)).toEqual([20, 18, 20, 24, 25, 13]);
    const text = (segment: { he: { t: string }[][] }) =>
      segment.he
        .flat()
        .map((run) => run.t)
        .join('');
    for (const section of avot.sections) {
      expect(text(section.segments[0])).toMatch(/^כָּל־יִשְׂרָאֵל יֵשׁ לָהֶם חֵלֶק לָעוֹלָם הַבָּא/);
      expect(text(section.segments[section.segments.length - 1])).toMatch(/^רִבִּי חֲנַנְיָא בֶן־עֲקַשְׁיָא אוֹמֵר/);
      // No cantillation mark is left in the verses the frame quotes.
      expect(section.segments.map(text).join('')).not.toMatch(/[\u0591-\u05AF]/);
    }
    expect(text(avot.sections[0].segments[1])).toMatch(/^משֶׁה קִבֵּל תּוֹרָה מִסִּינַי/);
    expect(avot.sections[0].segments[1].en).toMatch(/^Moses received the Torah at Sinai/);
  });

  it('carries the Ramban’s letter, Mesillat Yesharim 3 and the sick, children and parents texts', () => {
    const sections = (id: Parameters<typeof readSiddurText>[1]) =>
      readSiddurText('chabad', id).sections.map((section) => [section.title.he, section.segments.length]);
    expect(sections('iggeret_haramban')).toEqual([['אגרת הרמב״ן', 14]]);
    expect(sections('cheshbon_nefesh')).toEqual([['מסילת ישרים · פרק ג', 32]]);
    expect(sections('hitbodedut')).toEqual([['ליקוטי מוהר״ן תנינא · כה', 12]]);
    expect(sections('bikur_cholim')).toEqual([
      ['בקשת רחמים על החולה', 2],
      ['מי שברך לחולה', 4],
    ]);
    expect(sections('children_verses')).toEqual([['פסוקים לילדים', 3]]);
    expect(sections('elu_devarim')).toEqual([
      ['אלו דברים', 1],
      ['כיבוד אב ואם', 1],
      ['הכנסת אורחים', 8],
    ]);
    const sick = JSON.stringify(readSiddurText('chabad', 'bikur_cholim'));
    expect(sick).toContain('הַמָּקוֹם יְרַחֵם עָלֶיךָ בְּתוֹךְ חוֹלֵי יִשְׂרָאֵל');
    // The Mi Sheberach is the weekday wording: its Shabbat and Yom Tov lines are cut.
    expect(sick).not.toContain('יוֹם טוֹב הוא מִלִזְּעוֹק');
  });

  it('names the day’s daf in the Daf Yomi reminder, and no other habit fills a body', () => {
    const daf = findMitzvah('daf_yomi')!;
    const noon = at(NEW_YORK, '2026-11-18T12:00');
    const ctx = {
      date: noon,
      location: NEW_YORK,
      settings: SETTINGS,
      zmanim: ZmanimService.getZmanim(noon, NEW_YORK)!,
    };
    expect(daf.bodyParams!(ctx)).toEqual({ daf: { he: 'בכורות דף ס״א', en: 'Bechorot 61' } });
    expect(daf.bodyKey).toBe('notifications.dafYomi');
    const params = daf.bodyParams!(ctx);
    expect(bodyForReminder(daf.defaultReminders[0], daf, noon, false, params)).toBe('דף יומי: בכורות דף ס״א');
    expect(bodyForReminder(daf.defaultReminders[0], daf, noon, true, params)).toBe('Daf Yomi: Bechorot 61');
    for (const id of HABIT_IDS.filter((habit) => habit !== 'daf_yomi')) {
      expect(findMitzvah(id)!.bodyParams).toBeUndefined();
    }
  });

  it('keeps the mikveh of erev Shabbat a men’s mitzvah', () => {
    expect(isMensMitzvah('mikveh_erev_shabbat')).toBe(true);
    expect(isMensMitzvah('shabbat_shopping')).toBe(false);
  });

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
    expect(bundleSelection(['prayer'], null, all).mitzvot).not.toContain('hitbodedut');
  });
});
