jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { DateTime } from 'luxon';
import { IOSConfig } from 'expo/config-plugins';
import appJson from '../../../app.json';
import nativeHe from '../../../locales/he.json';
import nativeEn from '../../../locales/en.json';
import he from '../he.json';
import en from '../en.json';
import { useUserStore } from '@/stores/useUserStore';
import { HIDDEN_INTL_NAMES, hideIntlDateNames } from '@/testing/intl';
import { formatDate, t, translate, setLocale, type AppLanguage } from '../index';

describe('i18n', () => {
  it('0.4.a parity — same keys in he+en', () => {
    const heKeys = Object.keys(he).sort();
    const enKeys = Object.keys(en).sort();
    expect(heKeys).toEqual(enKeys);
    expect(heKeys.length).toBeGreaterThan(100);
  });

  it('0.4.b no key has empty value', () => {
    for (const k of Object.keys(he)) {
      expect((he as Record<string, string>)[k]).toBeTruthy();
      expect((en as Record<string, string>)[k]).toBeTruthy();
    }
  });

  it('15.7.a runtime — t("onboarding.welcomeTitle") must NOT return [missing ...] (BUG-011 regression)', () => {
    setLocale('he');
    const out = t('onboarding.welcomeTitle');
    expect(out).not.toMatch(/^\[missing/);
    expect(out).toBe((he as Record<string, string>)['onboarding.welcomeTitle']);
  });

  it('15.7.b runtime — every single translation key resolves (BUG-011 regression, all keys)', () => {
    setLocale('he');
    const broken: string[] = [];
    for (const k of Object.keys(he)) {
      const out = t(k);
      if (/^\[missing/.test(out)) broken.push(k);
    }
    expect(broken).toEqual([]);
  });

  it('15.7.c setLocale("en") resolves english keys (BUG-011 regression)', () => {
    setLocale('en');
    const out = t('onboarding.welcomeTitle');
    expect(out).not.toMatch(/^\[missing/);
    expect(out).toBe((en as Record<string, string>)['onboarding.welcomeTitle']);
  });

  it('every brand mention in the translations is the app name', () => {
    const heName = (he as Record<string, string>)['app.name'];
    const enName = (en as Record<string, string>)['app.name'];
    expect(heName).toBe('יהודי 365');
    expect(enName).toBe('Jew 365');
    const heBrand = /(^|[^\u0590-\u05FF])יהודי(?![\u0590-\u05FF])/g;
    const enBrand = /\bJew(?:ish)?\b/g;
    for (const value of Object.values(he)) {
      expect(value.match(heBrand)?.length ?? 0).toBe(value.split(heName).length - 1);
    }
    for (const value of Object.values(en)) {
      expect(value.match(enBrand)?.length ?? 0).toBe(value.split(enName).length - 1);
    }
  });

  // Prebuild names the Xcode project and target after expo.name; an all-digit result ("365" from
  // "יהודי 365") is read back as a number and EAS cannot find the target to sign.
  it('the native names show the app name and give Xcode a target it can find', () => {
    const heName = (he as Record<string, string>)['app.name'];
    const enName = (en as Record<string, string>)['app.name'];
    expect(appJson.expo.name).toBe(enName);
    expect(IOSConfig.XcodeUtils.sanitizedName(appJson.expo.name)).toMatch(/[A-Za-z]/);
    expect(appJson.expo.ios.infoPlist.CFBundleDisplayName).toBe(heName);
    expect(nativeHe.ios.CFBundleDisplayName).toBe(heName);
    expect(nativeHe.android.app_name).toBe(heName);
    expect(nativeEn.ios.CFBundleDisplayName).toBe(enName);
    expect(nativeEn.android.app_name).toBe(enName);
  });
});

describe('i18n gender-aware lookup', () => {
  const heTable = he as Record<string, string>;
  const enTable = en as Record<string, string>;
  const feminineKeys = Object.keys(heTable).filter((k) => k.endsWith('.f'));

  beforeEach(() => {
    useUserStore.setState({ language: 'he', gender: null });
  });

  afterAll(() => {
    useUserStore.setState({ language: 'he', gender: null });
  });

  it('every .f key has a base key and says something different in Hebrew', () => {
    expect(feminineKeys.length).toBeGreaterThan(0);
    for (const k of feminineKeys) {
      const base = k.slice(0, -2);
      expect(heTable[base]).toBeTruthy();
      expect(heTable[k]).not.toBe(heTable[base]);
      expect(enTable[k]).toBe(enTable[base]);
    }
  });

  it('a female user reads the .f variant', () => {
    useUserStore.setState({ gender: 'female' });
    expect(t('onboarding.registerTitle')).toBe(heTable['onboarding.registerTitle.f']);
    expect(t('onboarding.registerTitle')).not.toBe(heTable['onboarding.registerTitle']);
    expect(t('checkin.banner', { in: 'x', deadline: 'y' })).toBe('סמני מה עשית x, עד y');
  });

  it('a male or unanswered user reads the base key', () => {
    expect(t('onboarding.registerTitle')).toBe(heTable['onboarding.registerTitle']);
    useUserStore.setState({ gender: 'male' });
    expect(t('onboarding.registerTitle')).toBe(heTable['onboarding.registerTitle']);
  });

  it('a key without a .f variant is unchanged for a female user', () => {
    useUserStore.setState({ gender: 'female' });
    expect(t('home.quick.skipToday')).toBe(heTable['home.quick.skipToday']);
  });

  it('a .f key called directly returns itself', () => {
    for (const gender of [null, 'male', 'female'] as const) {
      useUserStore.setState({ gender });
      expect(t('onboarding.registerTitle.f')).toBe(heTable['onboarding.registerTitle.f']);
    }
  });

  it('translate takes an explicit gender and ignores the store', () => {
    expect(translate('onboarding.locationTitle', undefined, 'he', 'female')).toBe(
      heTable['onboarding.locationTitle.f'],
    );
    useUserStore.setState({ gender: 'female' });
    expect(translate('onboarding.locationTitle', undefined, 'he', 'male')).toBe(heTable['onboarding.locationTitle']);
  });

  it('English follows the same lookup', () => {
    useUserStore.setState({ language: 'en', gender: 'female' });
    expect(t('onboarding.registerTitle')).toBe(enTable['onboarding.registerTitle.f']);
  });
});

describe('formatDate', () => {
  const SATURDAY = new Date(2026, 9, 24);
  const HE_LONG_WEEKDAYS = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
  const EN_LONG_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const HE_SHORT_WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const EN_SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const HE_LONG_MONTHS = [
    'ינואר',
    'פברואר',
    'מרץ',
    'אפריל',
    'מאי',
    'יוני',
    'יולי',
    'אוגוסט',
    'ספטמבר',
    'אוקטובר',
    'נובמבר',
    'דצמבר',
  ];
  const HE_SHORT_MONTHS = [
    'ינו׳',
    'פבר׳',
    'מרץ',
    'אפר׳',
    'מאי',
    'יוני',
    'יולי',
    'אוג׳',
    'ספט׳',
    'אוק׳',
    'נוב׳',
    'דצמ׳',
  ];
  const EN_LONG_MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const EN_SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const range = (count: number) => Array.from({ length: count }, (_, i) => i);

  it('names every weekday from Sunday in both languages', () => {
    const days = range(7).map((i) => new Date(2026, 9, 25 + i));
    expect(days.map((day) => formatDate(day, 'cccc', 'he'))).toEqual(HE_LONG_WEEKDAYS);
    expect(days.map((day) => formatDate(day, 'cccc', 'en'))).toEqual(EN_LONG_WEEKDAYS);
    expect(days.map((day) => formatDate(day, 'ccc', 'he'))).toEqual(HE_SHORT_WEEKDAYS);
    expect(days.map((day) => formatDate(day, 'ccc', 'en'))).toEqual(EN_SHORT_WEEKDAYS);
  });

  it('names every month in both languages', () => {
    const days = range(12).map((i) => new Date(2026, i, 15));
    expect(days.map((day) => formatDate(day, 'LLLL', 'he'))).toEqual(HE_LONG_MONTHS);
    expect(days.map((day) => formatDate(day, 'LLLL', 'en'))).toEqual(EN_LONG_MONTHS);
    expect(days.map((day) => formatDate(day, 'LLL', 'he'))).toEqual(HE_SHORT_MONTHS);
    expect(days.map((day) => formatDate(day, 'LLL', 'en'))).toEqual(EN_SHORT_MONTHS);
  });

  it.each<[string, AppLanguage, string]>([
    ['cccc · d LLLL', 'he', 'יום שבת · 24 אוקטובר'],
    ['cccc · LLL d', 'en', 'Saturday · Oct 24'],
    ['cccc d LLLL', 'he', 'יום שבת 24 אוקטובר'],
    ['cccc, LLL d', 'en', 'Saturday, Oct 24'],
    ['cccc d LLLL yyyy', 'he', 'יום שבת 24 אוקטובר 2026'],
    ['cccc, LLL d yyyy', 'en', 'Saturday, Oct 24 2026'],
    ['d LLLL yyyy', 'he', '24 אוקטובר 2026'],
    ['LLL d, yyyy', 'en', 'Oct 24, 2026'],
    ['cccc d LLL', 'he', 'יום שבת 24 אוק׳'],
    ['ccc LLL d', 'en', 'Sat Oct 24'],
    ['ccc d.M', 'he', 'ש׳ 24.10'],
    ['ccc d.M', 'en', 'Sat 24.10'],
    ['cccc · d.M', 'he', 'יום שבת · 24.10'],
    ['cccc', 'en', 'Saturday'],
    ['d LLLL', 'he', '24 אוקטובר'],
    ['LLLL', 'he', 'אוקטובר'],
    ['LLLL yyyy', 'he', 'אוקטובר 2026'],
    ['LLLL yyyy', 'en', 'October 2026'],
  ])('formats %s in %s', (pattern, language, expected) => {
    expect(formatDate(SATURDAY, pattern, language)).toBe(expected);
  });

  it('reads a DateTime in its own zone and a Date on the device clock', () => {
    expect(formatDate(DateTime.fromISO('2026-10-24T00:30', { zone: 'Pacific/Kiritimati' }), 'cccc d LLLL', 'en')).toBe(
      'Saturday 24 October',
    );
    expect(formatDate(DateTime.fromISO('2026-10-24T23:30', { zone: 'America/Los_Angeles' }), 'cccc d LLLL', 'en')).toBe(
      'Saturday 24 October',
    );
    expect(formatDate(new Date(2026, 9, 24, 23, 59), 'cccc d', 'en')).toBe('Saturday 24');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatDate(DateTime.fromISO('not-a-date'), 'cccc', 'en')).toBe('');
    expect(formatDate(new Date(Number.NaN), 'd LLLL', 'he')).toBe('');
  });

  it('throws on a token it does not support', () => {
    expect(() => formatDate(SATURDAY, 'dd/MM', 'en')).toThrow('Unsupported date token "dd"');
    expect(() => formatDate(SATURDAY, 'EEEE', 'en')).toThrow('Unsupported date token "EEEE"');
  });

  it('hideIntlDateNames("deleted") makes Luxon throw on a Hebrew weekday', () => {
    const restore = hideIntlDateNames('deleted');
    try {
      expect(() => DateTime.fromJSDate(SATURDAY).setLocale('he').toFormat('cccc')).toThrow(TypeError);
    } finally {
      restore();
    }
  });

  it('hideIntlDateNames("nameless") reproduces the iPhone subtitle', () => {
    const restore = hideIntlDateNames('nameless');
    try {
      expect(DateTime.fromJSDate(SATURDAY).setLocale('he').toFormat('cccc · d LLLL')).toBe('null · 24 null');
    } finally {
      restore();
    }
  });

  describe.each(HIDDEN_INTL_NAMES)('without Intl weekday and month names (%s, Hermes on iOS)', (mode) => {
    let restore: () => void;
    beforeAll(() => {
      restore = hideIntlDateNames(mode);
    });
    afterAll(() => restore());

    it('formats the same names', () => {
      expect(formatDate(SATURDAY, 'cccc · d LLLL', 'he')).toBe('יום שבת · 24 אוקטובר');
      expect(formatDate(SATURDAY, 'cccc · LLL d', 'en')).toBe('Saturday · Oct 24');
      expect(
        formatDate(DateTime.fromISO('2026-10-24T12:00', { zone: 'Asia/Jerusalem' }), 'cccc d LLL yyyy', 'he'),
      ).toBe('יום שבת 24 אוק׳ 2026');
    });
  });

  it('names every weekday and month in both dictionaries, with no 0-based month key left', () => {
    for (const table of [he, en] as Record<string, string>[]) {
      for (const i of range(7)) {
        expect(table[`weekday.long.${i}`]).toBeTruthy();
        expect(table[`weekday.short.${i}`]).toBeTruthy();
      }
      for (const i of range(12)) {
        expect(table[`month.long.${i + 1}`]).toBeTruthy();
        expect(table[`month.short.${i + 1}`]).toBeTruthy();
      }
      expect(Object.keys(table).filter((key) => /^month\.\d+$/.test(key))).toEqual([]);
    }
  });
});
