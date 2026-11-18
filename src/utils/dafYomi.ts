// The Daf Yomi of a day and where to learn it (the owner's call of 2026-11-18: links for now, the text inside
// the reader later; .claude/specs/habit-texts.md, section 5). Importing @hebcal/learning also registers the
// daily-learning calendars with @hebcal/core, which `HebcalService.getDafYomi()` reads.
import { HDate } from '@hebcal/core';
import { DafYomi, DafYomiEvent } from '@hebcal/learning';

import type { ContentBlock } from '@/types/mitzvah';

export const DAF_YOMI_ID = 'daf_yomi';

// Hadran's page of a daf, `hadran.org.il/daf/<tractate>-<daf>/` (each tractate's first daf read 200 on
// 2026-11-18). Its tractate is Sefaria's name in lower case with hyphens; the three short tractates the Vilna
// print binds after Meilah have pages of their own there, and Shekalim is not "Jerusalem Talmud Shekalim".
function hadranUrl(sefariaName: string | null, hebcalName: string, blatt: number): string {
  const tractate = sefariaName
    ? sefariaName.replace(/^Jerusalem_Talmud_/, '')
    : /^kin/i.test(hebcalName)
      ? 'Kinnim'
      : /^mid/i.test(hebcalName)
        ? 'Middot'
        : hebcalName;
  return `https://hadran.org.il/daf/${tractate.toLowerCase().replace(/[_ ]/g, '-')}-${blatt}/`;
}

export type DafYomiDay = { name: { he: string; en: string }; textUrl: string; shiurUrl: string };

// `date` is a location date held as a device-local day (`appDay()`), which the cycle counts by.
export function dafYomiOn(date: Date): DafYomiDay {
  const hdate = new HDate(date);
  const daf = new DafYomi(date);
  const event = new DafYomiEvent(hdate);
  const textUrl = event.url() as string;
  const strip = (text: string) => text.replace(/^[^:]*:\s*/, '');
  return {
    name: { he: strip(event.render('he')), en: strip(event.render('en')) },
    textUrl,
    shiurUrl: hadranUrl(/sefaria\.org\/([^.]+)\./.exec(textUrl)?.[1] ?? null, daf.getName(), Number(daf.getBlatt())),
  };
}

// The mitzvah screen's card for the day: the daf by name, its page and a shiur on it.
export function dafYomiBlocks(date: Date): ContentBlock[] {
  const { name, textUrl, shiurUrl } = dafYomiOn(date);
  return [
    { type: 'text', he: `הדף של היום: ${name.he}`, en: `Today's daf: ${name.en}` },
    { type: 'link', he: 'פתיחת הדף', en: 'Open the daf', url: textUrl },
    { type: 'link', he: 'שיעור על הדף באתר הדרן', en: 'A shiur on the daf, at Hadran', url: shiurUrl },
  ];
}
