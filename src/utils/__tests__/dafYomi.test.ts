import { HebcalService } from '@/services/HebcalService';
import { dafYomiBlocks, dafYomiOn } from '@/utils/dafYomi';

// Calendar days, read on the device clock like every date the app keys by.
const day = (year: number, month: number, date: number) => new Date(year, month - 1, date, 12);

describe('the Daf Yomi of a day', () => {
  it('names the daf in Hebrew and English, with its page and a shiur', () => {
    expect(dafYomiOn(day(2026, 11, 18))).toEqual({
      name: { he: 'בכורות דף ס״א', en: 'Bechorot 61' },
      textUrl: 'https://www.sefaria.org/Bekhorot.61a?lang=bi',
      shiurUrl: 'https://hadran.org.il/daf/bekhorot-61/',
    });
  });

  it('opens a cycle on Berakhot 2 and writes a tractate of two words with a hyphen', () => {
    expect(dafYomiOn(day(2027, 6, 8))).toMatchObject({
      name: { en: 'Berachot 2' },
      textUrl: 'https://www.sefaria.org/Berakhot.2a?lang=bi',
      shiurUrl: 'https://hadran.org.il/daf/berakhot-2/',
    });
    expect(dafYomiOn(day(2021, 3, 23)).shiurUrl).toBe('https://hadran.org.il/daf/shekalim-2/');
    expect(dafYomiOn(day(2025, 6, 20)).shiurUrl).toMatch(/^https:\/\/hadran\.org\.il\/daf\/avodah-zarah-\d+\/$/);
  });

  it('sends the short tractates bound after Meilah to their own pages', () => {
    const midot = dafYomiOn(day(2027, 3, 25));
    expect(midot.name.he).toBe('מדות דף ל״ה');
    expect(midot.shiurUrl).toBe('https://hadran.org.il/daf/middot-35/');
  });

  it('gives the mitzvah screen the name and two links', () => {
    const blocks = dafYomiBlocks(day(2026, 11, 18));
    expect(blocks.map((block) => block.type)).toEqual(['text', 'link', 'link']);
    expect(blocks[0]).toMatchObject({ he: 'הדף של היום: בכורות דף ס״א', en: "Today's daf: Bechorot 61" });
  });

  it('is the daf the calendar service names', () => {
    expect(HebcalService.getDafYomi(day(2026, 11, 18))).toContain('בכורות');
  });
});
