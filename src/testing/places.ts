import fs from 'fs';
import path from 'path';
import { parsePlaces, type PlaceIndex } from '@/data/places';

let index: PlaceIndex | null = null;

// The real places list, read from disk once per test file: the `.places` asset is a stub under Jest.
export function placesIndex(): PlaceIndex {
  index ??= parsePlaces(fs.readFileSync(path.join(__dirname, '../../assets/places/world.places'), 'utf8'));
  return index;
}
