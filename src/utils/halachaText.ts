import { HalachaEnglishUnit, HalachaLabel, HalachaPortion, HalachaUnit } from '@/types/halacha';
import { SectionHeading, SiddurCredit, SiddurSection, SiddurSegment, SiddurText } from '@/types/siddur';

// What the halacha reader draws for a day (.claude/specs/halacha-yomit.md, section 9): its portions, each under its
// headings (the festival of an overlap day, then the portion's label), and the closed make-up folds of earlier days.
export type HalachaReading = { headings: SectionHeading[]; portion: HalachaPortion };
export type HalachaMakeUpFold = { dateKey: string; label: HalachaLabel; readings: HalachaReading[] };

export type HalachaTextInput = {
  id: string;
  readings: readonly HalachaReading[];
  makeUps: readonly HalachaMakeUpFold[];
  units: ReadonlyMap<string, HalachaUnit>;
  // The English of each unit, when the app is in English and the track ships it.
  english: ReadonlyMap<string, HalachaEnglishUnit> | null;
};

// The units a list of readings needs, each once, in reading order.
export function halachaUnitsOf(readings: readonly HalachaReading[]): string[] {
  return [...new Set(readings.flatMap((reading) => reading.portion.pieces.map((piece) => piece.u)))];
}

function unitSegments(unit: HalachaUnit, english: HalachaEnglishUnit | undefined) {
  let index = 0;
  return unit.sections.flatMap((section) =>
    section.segments.map((segment) => {
      const en = english?.en[index++] ?? null;
      return { title: section.title, segment: en ? { ...segment, en } : segment };
    }),
  );
}

// A reading's sections: each piece's segments, grouped by the unit section (a siman, a chapter) they belong to.
function readingSections(reading: HalachaReading, input: HalachaTextInput): SiddurSection[] {
  const sections: SiddurSection[] = [];
  for (const piece of reading.portion.pieces) {
    const unit = input.units.get(piece.u);
    if (!unit) throw new Error(`halacha unit ${piece.u} is not loaded`);
    const all = unitSegments(unit, input.english?.get(piece.u));
    for (const { title, segment } of all.slice(piece.from, piece.to + 1)) {
      const last = sections[sections.length - 1];
      if (last && last.title.he === title.he) last.segments.push(segment);
      else sections.push({ title, segments: [segment] });
    }
  }
  if (sections.length) sections[0] = { ...sections[0], headings: reading.headings };
  return sections;
}

// A make-up day as one closed fold: every section's title becomes a bold line inside it, as Chok LeYisrael's do.
function makeUpSection(makeUp: HalachaMakeUpFold, input: HalachaTextInput): SiddurSection {
  return {
    title: makeUp.label,
    optional: makeUp.label,
    segments: makeUp.readings.flatMap((reading) =>
      readingSections(reading, input).flatMap((section): SiddurSegment[] => [
        {
          key: `makeUp:${makeUp.dateKey}:${section.title.he}`,
          he: [[{ t: section.title.he, s: 'b' }]],
          en: section.title.en,
        },
        ...section.segments,
      ]),
    ),
  };
}

export function halachaText(input: HalachaTextInput): SiddurText {
  const credits = new Map<string, SiddurCredit>();
  for (const unit of [...input.units.values(), ...(input.english?.values() ?? [])]) {
    for (const credit of unit.credits) credits.set(credit.title, credit);
  }
  return {
    id: input.id,
    sections: [
      ...input.makeUps.map((makeUp) => makeUpSection(makeUp, input)),
      ...input.readings.flatMap((reading) => readingSections(reading, input)),
    ],
    credits: [...credits.values()],
  };
}
