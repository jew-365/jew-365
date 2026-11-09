import { CHOK_PARASHIYOT } from '@/data/chok';
import { chokParashaFile, readChokAsset } from '@/services/chokFiles';
import { loadSiddurText } from '@/services/SiddurService';
import { useChokStore } from '@/stores/useChokStore';
import { chokParashaName } from '@/utils/chok';
import { chokVerses, tehillimVerses, type PersonalVerse } from '@/utils/personalPrayer';

// Every verse the personal verse search reads: the bundled Tehillim, then, while the add-on is installed, the
// Tanakh verses of every Chok LeYisrael parasha. Built once per installed Chok version, one parasha at a time with
// a yield between them, and never kept in the reader's own cache (the 54 parashiyot would stay in memory).
let built: { key: string; verses: Promise<PersonalVerse[]> } | null = null;

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function build(): Promise<PersonalVerse[]> {
  const verses = tehillimVerses(await loadSiddurText('ashkenaz', 'tehillim'));
  const install = useChokStore.getState().installed;
  if (!install) return verses;
  for (const parasha of CHOK_PARASHIYOT) {
    const file = chokParashaFile(install, parasha);
    if (!file) continue;
    await yieldToUi();
    try {
      const asset = await readChokAsset(file);
      verses.push(...chokVerses(asset, { he: chokParashaName(parasha, 'he'), en: chokParashaName(parasha, 'en') }));
    } catch {
      // A parasha that cannot be read is left out; the reader's own check forgets a damaged install.
    }
  }
  return verses;
}

export function loadPersonalVerses(): Promise<PersonalVerse[]> {
  const key = String(useChokStore.getState().installed?.version ?? 'none');
  if (built?.key !== key) {
    const verses = build();
    built = { key, verses };
    verses.catch(() => {
      if (built?.verses === verses) built = null;
    });
  }
  return built.verses;
}
