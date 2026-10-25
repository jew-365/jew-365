jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

import { mitzvahName, reminderLabel } from '../mitzvahName';
import { useUserStore } from '@/stores/useUserStore';

describe('mitzvahName', () => {
  const both = { name: { he: 'תפילין', en: 'Tefillin' } };
  const hebrewOnly = { name: { he: 'משימה שלי' } };

  it('gives the English name in English when there is one', () => {
    expect(mitzvahName(both, 'en')).toBe('Tefillin');
  });

  it('gives the Hebrew name in Hebrew', () => {
    expect(mitzvahName(both, 'he')).toBe('תפילין');
  });

  it('falls back to Hebrew in English when the English name is missing or empty', () => {
    expect(mitzvahName(hebrewOnly, 'en')).toBe('משימה שלי');
    expect(mitzvahName({ name: { he: 'משימה שלי', en: '' } }, 'en')).toBe('משימה שלי');
  });
});

describe('reminderLabel', () => {
  afterEach(() => useUserStore.setState({ language: 'he' }));

  it('returns a typed label trimmed, whatever the anchor', () => {
    expect(reminderLabel({ anchor: 'followUp', label: '  חזור ללמוד ' }, 'לימוד')).toBe('חזור ללמוד');
    expect(reminderLabel({ anchor: 'start', label: 'התחלה' }, 'לימוד')).toBe('התחלה');
  });

  it('words an empty follow-up label from the name, in the UI language', () => {
    expect(reminderLabel({ anchor: 'followUp', label: '' }, 'שיעור')).toBe('עוד לא סימנת: שיעור');
    expect(reminderLabel({ anchor: 'followUp', label: '   ' }, 'שיעור')).toBe('עוד לא סימנת: שיעור');

    useUserStore.setState({ language: 'en' });
    expect(reminderLabel({ anchor: 'followUp', label: '' }, 'Study')).toBe('Not marked yet: Study');
  });

  it('leaves an empty label of any other anchor empty', () => {
    expect(reminderLabel({ anchor: 'start', label: '' }, 'לימוד')).toBe('');
    expect(reminderLabel({ anchor: 'clock', label: '' }, 'לימוד')).toBe('');
  });
});
