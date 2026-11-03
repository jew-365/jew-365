import {
  TAHARAH_PRESET_IDS,
  TAHARAH_PRESETS,
  TAHARAH_RULES_VERSION,
  presetForNusach,
  rulesFor,
} from '../taharahPresets';

describe('taharahPresets', () => {
  it('pins the rules of every preset', () => {
    expect(TAHARAH_PRESETS.ashkenaz).toEqual({
      hefsekEarliestDay: 5,
      mochDachuk: 'recommended',
      onahBeinonitDays: [30, 31],
      onahBeinonitSpan: 'onah',
      ohrZarua: false,
      haflagaMethod: 'days',
    });
    expect(TAHARAH_PRESETS.chassidic).toEqual({
      hefsekEarliestDay: 5,
      mochDachuk: 'required',
      onahBeinonitDays: [30, 31],
      onahBeinonitSpan: 'onah',
      ohrZarua: true,
      haflagaMethod: 'days',
    });
    expect(TAHARAH_PRESETS.chabad).toEqual({
      hefsekEarliestDay: 5,
      mochDachuk: 'required',
      onahBeinonitDays: [30],
      onahBeinonitSpan: 'fullDay',
      ohrZarua: true,
      haflagaMethod: 'onot',
    });
    expect(TAHARAH_PRESETS.sephardi_ovadia).toEqual({
      hefsekEarliestDay: 4,
      mochDachuk: 'optional',
      onahBeinonitDays: [30],
      onahBeinonitSpan: 'onah',
      ohrZarua: false,
      haflagaMethod: 'days',
    });
    expect(TAHARAH_PRESETS.sephardi_eliyahu).toEqual({
      hefsekEarliestDay: 5,
      mochDachuk: 'recommended',
      onahBeinonitDays: [30],
      onahBeinonitSpan: 'onah',
      ohrZarua: false,
      haflagaMethod: 'days',
    });
  });

  it('lists exactly the five presets', () => {
    expect([...TAHARAH_PRESET_IDS].sort()).toEqual([
      'ashkenaz',
      'chabad',
      'chassidic',
      'sephardi_eliyahu',
      'sephardi_ovadia',
    ]);
    expect(Object.keys(TAHARAH_PRESETS).sort()).toEqual([...TAHARAH_PRESET_IDS].sort());
  });

  it('suggests a preset from the prayer nusach', () => {
    expect(presetForNusach('ashkenaz')).toBe('ashkenaz');
    expect(presetForNusach('sefard')).toBe('chassidic');
    expect(presetForNusach('chabad')).toBe('chabad');
    expect(presetForNusach('edot_hamizrach')).toBe('sephardi_ovadia');
    // R14.6: Teiman starts from the same Sephardi preset until the rav answers.
    expect(presetForNusach('teiman')).toBe('sephardi_ovadia');
  });

  it('hands out a copy of the rules, so editing one never touches the preset', () => {
    const copy = rulesFor('ashkenaz');
    expect(copy).toEqual(TAHARAH_PRESETS.ashkenaz);
    expect(copy).not.toBe(TAHARAH_PRESETS.ashkenaz);
    expect(copy.onahBeinonitDays).not.toBe(TAHARAH_PRESETS.ashkenaz.onahBeinonitDays);

    (copy.onahBeinonitDays as number[]).push(99);
    copy.ohrZarua = true;
    expect(TAHARAH_PRESETS.ashkenaz.onahBeinonitDays).toEqual([30, 31]);
    expect(TAHARAH_PRESETS.ashkenaz.ohrZarua).toBe(false);
    expect(rulesFor('ashkenaz')).toEqual(TAHARAH_PRESETS.ashkenaz);
  });

  it('copies every preset faithfully', () => {
    for (const id of TAHARAH_PRESET_IDS) expect(rulesFor(id)).toEqual(TAHARAH_PRESETS[id]);
  });

  it('starts at rules version 1', () => {
    expect(TAHARAH_RULES_VERSION).toBe(1);
  });
});
