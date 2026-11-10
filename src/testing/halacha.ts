import fs from 'fs';
import path from 'path';
import { HALACHA_STORES } from '@/stores/useHalachaStore';
import { IDLE_DOWNLOAD } from '@/stores/addonState';
import { AddonInstall } from '@/types/addon';
import { HalachaManifest, HalachaScheduleFile, HalachaTrack } from '@/types/halacha';

const SITE = path.join(__dirname, '../../docs/halacha');
const manifests = new Map<HalachaTrack, HalachaManifest>();

// A track's published manifest (docs/halacha), read once per test file.
export function publishedHalachaManifest(track: HalachaTrack): HalachaManifest {
  if (!manifests.has(track)) {
    manifests.set(track, JSON.parse(fs.readFileSync(path.join(SITE, track, 'manifest.json'), 'utf8')));
  }
  return manifests.get(track)!;
}

// What an install of the published track keeps in `schedule.json`.
export function publishedHalachaSchedule(track: HalachaTrack): HalachaScheduleFile {
  const { version, book, credit, credits, units, schedule, festivals } = publishedHalachaManifest(track);
  return { track, version, book, credit, credits, units, schedule, festivals };
}

let installs = 0;

// An install of the published track's units in its store (with `latestVersion` and `checkedAt` set, so no update
// check fires). A suite that reads its schedule mocks `readHalachaScheduleSync()` of the files module with
// `publishedHalachaSchedule()`.
export function installHalachaFixture(track: HalachaTrack): AddonInstall {
  const manifest = publishedHalachaManifest(track);
  const installed: AddonInstall = {
    version: manifest.version,
    bytes: manifest.gzipBytes,
    installedAt: ++installs,
    files: Object.fromEntries(Object.entries(manifest.gz).map(([unit, entry]) => [unit, entry.path])),
  };
  HALACHA_STORES[track].setState({
    installed,
    latestVersion: manifest.version,
    checkedAt: Date.now(),
    download: IDLE_DOWNLOAD,
  });
  return installed;
}
