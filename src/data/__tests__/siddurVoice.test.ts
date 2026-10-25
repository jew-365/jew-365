jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

jest.setTimeout(60000);

import { createHash } from 'crypto';
import { HDate, months } from '@hebcal/core';
import { SIDDUR_TEXT_IDS } from '../siddur';
import { readSiddurText, shippedTextIds, siddurAssetFolder } from '@/testing/siddur';
import { dayFeatures, forVoice, resolveSiddurText } from '@/utils/siddur';
import type { Nusach } from '@/types/mitzvah';
import type { DayFeatures, PassageLabel, Run, SiddurSection, SiddurText } from '@/types/siddur';

const NUSCHAOT: Nusach[] = ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'];
const ISRAEL = { inIsrael: true, jerusalem: false };
const DIASPORA = { inIsrael: false, jerusalem: false };

function day(date: number, month: number, year: number, place = ISRAEL): DayFeatures {
  return dayFeatures(new HDate(date, month, year), place);
}

const PRINTED_DAYS = [
  day(9, months.CHESHVAN, 5787),
  day(13, months.CHESHVAN, 5787),
  day(1, months.TEVET, 5787),
  day(14, months.ADAR_II, 5787),
  day(15, months.NISAN, 5787),
  day(18, months.NISAN, 5787, DIASPORA),
  day(25, months.NISAN, 5787),
  day(17, months.TAMUZ, 5787),
];

function assets(): { key: string; text: SiddurText }[] {
  const seen = new Map<string, SiddurText>();
  for (const nusach of NUSCHAOT) {
    for (const id of shippedTextIds(nusach, SIDDUR_TEXT_IDS)) {
      const key = `${siddurAssetFolder(nusach, id)}/${id}`;
      if (!seen.has(key)) seen.set(key, readSiddurText(nusach, id));
    }
  }
  return [...seen].map(([key, text]) => ({ key, text }));
}

function voiceMarks(text: SiddurText): string[] {
  const marks = new Set<string>();
  const label = (passage?: PassageLabel) => {
    if (passage?.voice) marks.add(`voice ${passage.he} ${passage.voice}`);
    if (passage?.foldsFor) marks.add(`folds ${passage.he} ${passage.foldsFor}`);
  };
  for (const section of text.sections) {
    label(section.optional);
    for (const segment of section.segments) {
      label(segment.optional);
      label(segment.minyan);
      for (const run of segment.he.flat()) {
        if (run.voice) marks.add('runs');
        if (run.marriedOnly) marks.add('married');
      }
    }
  }
  return [...marks].sort();
}

const WOMEN = 'voice נשים אומרות female';
const HALLEL = 'folds נשים אומרות בלי ברכה female';
const OMER = 'folds נשים סופרות בלי ברכה female';
const VOICED: Record<string, string[]> = {
  'ashkenaz/birchot_hashachar': ['runs', WOMEN],
  'ashkenaz/shacharit': ['runs', WOMEN],
  'ashkenaz/tefillin': ['runs'],
  'ashkenaz/sefirat_haomer': ['runs'],
  'ashkenaz/maariv': ['runs'],
  'ashkenaz/kriat_shema_al_hamita': ['runs'],
  'ashkenaz/birkat_hamazon': ['married', 'runs'],
  'sefard/birchot_hashachar': ['runs', WOMEN],
  'sefard/shacharit': ['runs', WOMEN],
  'sefard/tefillin': ['runs'],
  'sefard/sefirat_haomer': ['runs'],
  'sefard/maariv': ['runs'],
  'sefard/kriat_shema_al_hamita': ['runs'],
  'sefard/birkat_hamazon': ['married', 'runs'],
  'sefard/chanukah_candles': ['runs'],
  'edot_hamizrach/birchot_hashachar': ['runs'],
  'edot_hamizrach/shacharit': [HALLEL, 'runs'],
  'edot_hamizrach/tefillin': ['runs'],
  'edot_hamizrach/sefirat_haomer': [OMER, 'runs'],
  'edot_hamizrach/maariv': [OMER, 'runs'],
  'edot_hamizrach/kriat_shema_al_hamita': ['runs'],
  'edot_hamizrach/birchot_hanehenin': ['runs'],
  'edot_hamizrach/mezuzah': ['runs'],
  'edot_hamizrach/candle_lighting': ['runs'],
  'chabad/birchot_hashachar': ['runs'],
  'chabad/shacharit': ['runs'],
  'chabad/tefillin': ['runs'],
  'chabad/kriat_shema_al_hamita': ['runs'],
  'shared/tikkun_haklali': ['runs'],
};

const printedLabel = (label?: PassageLabel) =>
  label && { he: label.he, en: label.en, when: label.when, alone: label.alone, marriedOnly: label.marriedOnly };
const printedRun = (run: Run) => ({ t: run.t, s: run.s, when: run.when });
const printedReading = (sections: SiddurSection[]) =>
  sections.map((section) => ({
    title: section.title,
    headings: section.headings,
    chapter: section.chapter,
    optional: printedLabel(section.optional),
    minyanOnly: section.minyanOnly,
    segments: section.segments.map((segment) => ({
      he: segment.he.map((runs) => runs.map(printedRun)),
      en: segment.en,
      when: segment.when,
      optional: printedLabel(segment.optional),
      minyan: printedLabel(segment.minyan),
    })),
  }));

describe('siddur voice in the generated assets', () => {
  it('carries a voice only where the women’s liturgy puts one', () => {
    const found = Object.fromEntries(
      assets()
        .map(({ key, text }) => [key, voiceMarks(text)] as const)
        .filter(([, marks]) => marks.length),
    );
    expect(found).toEqual(VOICED);
  });

  it('reads every asset as printed for a reader with no voice, on every sample day', () => {
    const digests = Object.fromEntries(
      assets().map(({ key, text }) => [
        key,
        createHash('sha256')
          .update(
            JSON.stringify(
              PRINTED_DAYS.map((features) => printedReading(forVoice(resolveSiddurText(text, features), null))),
            ),
          )
          .digest('hex'),
      ]),
    );
    expect(digests).toMatchSnapshot();
  });
});
