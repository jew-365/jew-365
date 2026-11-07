const FINAL_LETTERS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

// Text as every search in the app compares it: no nikud or accents, lower case, final letters as regular
// ones, no quotes or geresh, and anything that is not a letter or a digit as one space.
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-֑ͯ-ׇ]/g, '')
    .toLowerCase()
    .replace(/[ךםןףץ]/g, (letter) => FINAL_LETTERS[letter])
    .replace(/["'`׳״‘’ʻʼ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
