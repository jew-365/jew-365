jest.mock('react-native-mmkv', () => {
  const { createMockMMKV } = require('react-native-mmkv/lib/commonjs/createMMKV.mock');
  return { MMKV: jest.fn(() => createMockMMKV()) };
});

jest.setTimeout(60000);

import { HDate, months } from '@hebcal/core';
import { SIDDUR_TEXT_IDS } from '../siddur';
import { readSiddurText, shippedTextIds, siddurAssetFolder } from '@/testing/siddur';
import { dayFeatures, resolveSiddurText } from '@/utils/siddur';
import type { Nusach } from '@/types/mitzvah';
import type { SiddurSection, SiddurText } from '@/types/siddur';

const NUSCHAOT: Nusach[] = ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'];
const ISRAEL = { inIsrael: true, jerusalem: false };
const KEY = /^[A-Za-z0-9_-]{10}(\.[1-9]\d*)?$/;
const DAYS = [
  dayFeatures(new HDate(9, months.CHESHVAN, 5787), ISRAEL),
  dayFeatures(new HDate(1, months.TEVET, 5787), ISRAEL),
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

const keysOf = (sections: SiddurSection[]) =>
  sections.flatMap((section) => section.segments.map((segment) => segment.key));

function isSubsequence(part: (string | undefined)[], whole: (string | undefined)[]): boolean {
  let matched = 0;
  for (const key of whole) if (matched < part.length && part[matched] === key) matched += 1;
  return matched === part.length;
}

describe('siddur segment keys', () => {
  it('gives every segment of every asset a key, unique within its text', () => {
    const offenders: string[] = [];
    for (const { key, text } of assets()) {
      const keys = keysOf(text.sections);
      const malformed = keys.filter((segmentKey) => !segmentKey || !KEY.test(segmentKey)).length;
      const repeated = keys.length - new Set(keys).size;
      if (malformed || repeated) offenders.push(`${key}: ${malformed} malformed, ${repeated} repeated`);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the asset keys, in order, on a resolved day', () => {
    const offenders: string[] = [];
    for (const { key, text } of assets()) {
      const all = keysOf(text.sections);
      DAYS.forEach((day, index) => {
        if (!isSubsequence(keysOf(resolveSiddurText(text, day)), all)) offenders.push(`${key}: day ${index}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
