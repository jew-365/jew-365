import { parsePlaces, PlaceIndex } from '@/data/places';
import { readBundledAsset } from '@/services/bundledAsset';

let loaded: Promise<PlaceIndex> | null = null;

// The places list, read and indexed once per launch, on first use (the picker opening); a failed read is
// tried again on the next call.
export function loadPlaces(): Promise<PlaceIndex> {
  // A bundled asset is reached through require(), as the generated siddur map does.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  loaded ??= readBundledAsset(require('../../assets/places/world.places'))
    .then(parsePlaces)
    .catch((error) => {
      loaded = null;
      throw error;
    });
  return loaded;
}
