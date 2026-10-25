import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { DOWNLOADED_SIDDUR_TEXT_IDS, SHARED_SIDDUR_TEXT_IDS } from '@/data/siddurAssets.generated';
import { Nusach } from '@/types/mitzvah';
import { SiddurText, SiddurTextId } from '@/types/siddur';

const ASSET_DIR = path.join(__dirname, '..', '..', 'assets', 'siddur');
const DOCS_DIR = path.join(__dirname, '..', '..', 'docs');

export const TEXTS_NOT_SHIPPED: Partial<Record<SiddurTextId, readonly Nusach[]>> = { ushpizin: ['chabad'] };

export function shipsText(nusach: Nusach, id: SiddurTextId): boolean {
  return !TEXTS_NOT_SHIPPED[id]?.includes(nusach);
}

export function shippedTextIds<T extends SiddurTextId>(nusach: Nusach, ids: readonly T[]): T[] {
  return ids.filter((id) => shipsText(nusach, id));
}

export function siddurAssetFolder(nusach: Nusach, id: SiddurTextId): string {
  return (SHARED_SIDDUR_TEXT_IDS as readonly string[]).includes(id) ? 'shared' : nusach;
}

export function readSiddurText(nusach: Nusach, id: SiddurTextId): SiddurText {
  if ((DOWNLOADED_SIDDUR_TEXT_IDS as readonly string[]).includes(id)) {
    const dir = path.join(DOCS_DIR, id);
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')) as {
      gz: Record<string, { path: string }>;
    };
    return JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, manifest.gz[nusach].path))).toString('utf8'));
  }
  return JSON.parse(fs.readFileSync(path.join(ASSET_DIR, siddurAssetFolder(nusach, id), `${id}.siddur`), 'utf8'));
}
