jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-background-task', () => ({
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
  getStatusAsync: jest.fn(),
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
}));

import { pickBodyForReminder } from '../NotificationScheduler';
import { bodyForReminder } from '@/services/notifications/planners/mitzvot';
import { MITZVOT } from '@/data/mitzvot';
import { setLocale } from '@/i18n';
import { Mitzvah, Reminder } from '@/types/mitzvah';

const MAQAF = '־';

const baseMitzvah: Mitzvah = {
  id: 'test',
  name: { he: 'בדיקה' },
  icon: 'test',
  timeType: 'range-within-day',
  category: 'daily-morning',
  group: 'daily',
  computeWindow: () => null,
  defaultReminders: [],
  skipOn: [],
  nuschaotSupported: ['ashkenaz'],
};

describe('pickBodyForReminder', () => {
  it('rotates variants deterministically by trigger day', () => {
    const reminder: Reminder = {
      anchor: 'start',
      offsetMin: 0,
      label: 'fallback',
      bodyVariants: ['variant-0', 'variant-1', 'variant-2'],
    };
    const triggers = [
      new Date('2026-05-06T00:00:00Z'),
      new Date('2026-05-07T00:00:00Z'),
      new Date('2026-05-08T00:00:00Z'),
    ];

    const result = triggers.map((trigger) => pickBodyForReminder(reminder, baseMitzvah, trigger));
    const expected = triggers.map((trigger) => reminder.bodyVariants![Math.floor(trigger.getTime() / 86_400_000) % 3]);
    expect(result).toEqual(expected);
    expect(new Set(result).size).toBe(3);
  });

  it('returns the same variant for the same trigger', () => {
    const reminder: Reminder = {
      anchor: 'start',
      offsetMin: 0,
      label: 'fallback',
      bodyVariants: ['first', 'second', 'third'],
    };
    const trigger = new Date('2026-05-06T12:00:00Z');
    expect(pickBodyForReminder(reminder, baseMitzvah, trigger)).toBe(
      pickBodyForReminder(reminder, baseMitzvah, trigger),
    );
  });

  it('falls back to the label and appends text content when requested', () => {
    const reminder: Reminder = {
      anchor: 'start',
      offsetMin: 0,
      label: 'fallback',
      includeContentInBody: true,
    };
    const mitzvah: Mitzvah = {
      ...baseMitzvah,
      contentBlocks: [
        { type: 'text', he: 'טקסט' },
        { type: 'blessing', he: 'ברכה' },
        { type: 'link', he: 'קישור', url: 'https://example.com' },
        { type: 'siddur', he: 'אשר יצר', textId: 'asher_yatzar' },
      ],
    };
    expect(pickBodyForReminder(reminder, mitzvah, new Date('2026-05-06T00:00:00Z'))).toBe('fallback\nטקסט\nברכה');
  });
});

describe('registry body variants', () => {
  const withVariants = MITZVOT.flatMap((mitzvah) =>
    mitzvah.defaultReminders.filter((r) => r.bodyVariants).map((reminder) => ({ mitzvah, reminder })),
  );

  it('keeps variants on the opening reminder of every daily mitzvah, the Omer, Selichot and the Chanukah candles', () => {
    const ids = withVariants.map(({ mitzvah }) => mitzvah.id);
    for (const id of [
      'tefillin',
      'krias_shma_shacharit',
      'shacharit',
      'mincha',
      'maariv',
      'krias_shma_al_hamita',
      'sefirat_haomer',
      'selichot',
      'chanukah_candles',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it.each(withVariants.map(({ mitzvah, reminder }) => [mitzvah.id, mitzvah, reminder] as const))(
    '%s offers three distinct non-empty variants that rotate day by day',
    (_id, mitzvah, reminder) => {
      const variants = reminder.bodyVariants!;
      expect(variants).toHaveLength(3);
      expect(new Set(variants.map((variant) => variant.trim())).size).toBe(3);
      expect(variants.every((variant) => variant.trim().length > 0)).toBe(true);

      const days = [0, 1, 2].map((offset) => new Date(Date.UTC(2026, 4, 6 + offset)));
      const bodies = days.map((day) => pickBodyForReminder(reminder, mitzvah, day).split('\n')[0]);
      expect(new Set(bodies)).toEqual(new Set(variants));
    },
  );
});

describe('bodyForReminder with bodyParams', () => {
  const nightly: Mitzvah = {
    ...baseMitzvah,
    name: { he: 'בדיקה', en: 'Test' },
    bodyKey: 'notifications.chanukahNight',
    defaultReminders: [
      {
        anchor: 'start',
        offsetMin: 0,
        label: 'זמן הדלקה',
        bodyVariants: ['זמן הדלקה: %{n}', 'הלילה %{n}', 'נר %{n} הלילה'],
      },
    ],
  };
  const days = [0, 1, 2].map((offset) => new Date(Date.UTC(2026, 4, 6 + offset)));

  it('fills the params into every rotating variant', () => {
    const reminder: Reminder = {
      anchor: 'start',
      offsetMin: 0,
      label: 'א',
      bodyVariants: ['א %{n}', 'ב %{n}', 'ג %{n}'],
    };
    const bodies = days.map((day) => bodyForReminder(reminder, nightly, day, false, { n: 4 }));
    expect(new Set(bodies)).toEqual(new Set(['א 4', 'ב 4', 'ג 4']));
  });

  it('fills the params into the label when there are no variants, and leaves the placeholder without them', () => {
    const reminder: Reminder = { anchor: 'start', offsetMin: 0, label: 'נר %{n}' };
    expect(bodyForReminder(reminder, nightly, days[0], false, { n: 5 })).toBe('נר 5');
    expect(bodyForReminder(reminder, nightly, days[0], false)).toBe('נר %{n}');
  });

  it('reads the English body of the mitzvah with the params, or the plain one without a key', () => {
    const reminder: Reminder = { anchor: 'start', offsetMin: 0, label: 'נר %{n}' };
    try {
      setLocale('en');
      expect(bodyForReminder(reminder, nightly, days[0], true, { n: 6 })).toBe('Time for Test: night 6');
      expect(bodyForReminder(reminder, { ...nightly, bodyKey: undefined }, days[0], true, { n: 6 })).toBe(
        'Time for Test',
      );
    } finally {
      setLocale('he');
    }
  });

  describe('a reminder whose text holds no placeholder', () => {
    const registry: Reminder = { anchor: 'start', offsetMin: 15, label: 'זמן הדלקה' };
    const typed: Reminder = { anchor: 'start', offsetMin: 15, label: 'להכין חנוכייה' };
    const keyed = `זמן בדיקה: הנר ה${MAQAF}5`;

    it('reads the keyed Hebrew body for the registry label of an edited default reminder', () => {
      expect(bodyForReminder(registry, nightly, days[0], false, { n: 5 })).toBe(keyed);
    });

    it('reads the keyed Hebrew body for a registry variant without a placeholder', () => {
      const plain: Mitzvah = {
        ...nightly,
        defaultReminders: [{ anchor: 'start', offsetMin: 0, label: 'א', bodyVariants: ['א', 'ב', 'ג'] }],
      };
      const bodies = days.map((day) => bodyForReminder(plain.defaultReminders[0], plain, day, false, { n: 5 }));
      expect(bodies).toEqual([keyed, keyed, keyed]);
    });

    it('reads the keyed Hebrew body for the mitzvah name the editor saves for an empty label, and for an empty label', () => {
      for (const label of ['בדיקה', 'Test', '']) {
        expect(bodyForReminder({ ...typed, label }, nightly, days[0], false, { n: 5 })).toBe(keyed);
      }
    });

    it('sends a label the user typed exactly as typed', () => {
      expect(bodyForReminder(typed, nightly, days[0], false, { n: 5 })).toBe('להכין חנוכייה');
    });

    it('reads Hebrew when the English UI has no English name to use, and still sends a typed label as typed', () => {
      const hebrewOnly: Mitzvah = { ...nightly, name: { he: 'בדיקה' } };
      try {
        setLocale('en');
        expect(bodyForReminder(registry, hebrewOnly, days[0], true, { n: 5 })).toBe(keyed);
        expect(bodyForReminder(typed, hebrewOnly, days[0], true, { n: 5 })).toBe('להכין חנוכייה');
      } finally {
        setLocale('he');
      }
    });

    it('keeps the label without params, without a body key, and on a follow-up reminder', () => {
      expect(bodyForReminder(registry, nightly, days[0], false)).toBe('זמן הדלקה');
      expect(bodyForReminder(registry, { ...nightly, bodyKey: undefined }, days[0], false, { n: 5 })).toBe('זמן הדלקה');
      const followUp: Reminder = { anchor: 'followUp', offsetMin: 30, label: '' };
      expect(bodyForReminder(followUp, nightly, days[0], false, { n: 5 })).toBe('עוד לא סימנת: בדיקה');
    });

    it('leaves a text that holds a placeholder to the plain fill', () => {
      const withPlaceholder: Reminder = { ...typed, label: 'הנר ה%{n}' };
      expect(bodyForReminder(withPlaceholder, nightly, days[0], false, { n: 5 })).toBe('הנר ה5');
    });
  });
});
