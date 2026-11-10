import React from 'react';
import { AddonCard, AddonSource, addonCaption, useAddonDownloadFlow } from '@/components/AddonCard';
import { useI18n } from '@/i18n';
import {
  HALACHA_ENGLISH_PACK,
  HALACHA_SIZE_ESTIMATE_MB,
  cancelHalachaDownload,
  checkHalachaUpdate,
  deleteHalacha,
  halachaDownloadSupported,
  halachaSpaceNeededMb,
  installHalacha,
  prepareHalachaDownload,
} from '@/services/HalachaContentService';
import { HALACHA_PACKS, HALACHA_STORES, selectHalachaUpdateAvailable } from '@/stores/useHalachaStore';
import { AddonDownload, AddonManifest } from '@/types/addon';
import { HalachaPack, HalachaTrack } from '@/types/halacha';

// One source per pack, built once, so the card's update check runs once per open.
const SOURCES = Object.fromEntries(
  HALACHA_PACKS.map((pack): [HalachaPack, AddonSource<AddonManifest>] => [
    pack,
    {
      supported: halachaDownloadSupported,
      prepare: () => prepareHalachaDownload(pack),
      install: (manifest) => installHalacha(pack, manifest),
      cancel: () => cancelHalachaDownload(pack),
      remove: () => deleteHalacha(pack),
      checkUpdate: (now, force) => checkHalachaUpdate(pack, now, force),
      downloadBytes: (manifest) => manifest.gzipBytes,
    },
  ]),
) as Readonly<Record<HalachaPack, AddonSource<AddonManifest>>>;

type Translate = (key: string, o?: Record<string, unknown>) => string;

const bookOf = (pack: HalachaPack, t: Translate) => ({ book: t(`halacha.book.${pack}`) });

export function halachaAddonCaption(track: HalachaTrack, download: AddonDownload, t: Translate): string {
  return addonCaption('halacha.addon', HALACHA_SIZE_ESTIMATE_MB[track], download, t, bookOf(track, t));
}

export function useHalachaDownloadFlow(track: HalachaTrack): {
  preparing: boolean;
  prepare: () => Promise<void>;
  dialog: React.ReactElement;
} {
  const { t } = useI18n();
  const installed = HALACHA_STORES[track]((s) => s.installed !== null);
  return useAddonDownloadFlow({ copy: 'halacha.addon', source: SOURCES[track], installed, params: bookOf(track, t) });
}

function PackCard({ pack }: { pack: HalachaPack }) {
  const { t } = useI18n();
  const store = HALACHA_STORES[pack];
  const installed = store((s) => s.installed);
  const download = store((s) => s.download);
  const updateAvailable = store(selectHalachaUpdateAvailable);
  return (
    <AddonCard
      copy="halacha.addon"
      source={SOURCES[pack]}
      installed={installed}
      download={download}
      updateAvailable={updateAvailable}
      estimateMb={HALACHA_SIZE_ESTIMATE_MB[pack]}
      spaceNeededMb={halachaSpaceNeededMb(pack)}
      params={bookOf(pack, t)}
    />
  );
}

// The user's track on the halacha mitzvot's screens, and in English, once it is installed, its English beside it.
export function HalachaAddonCard({ track }: { track: HalachaTrack }) {
  const { language } = useI18n();
  const installed = HALACHA_STORES[track]((s) => s.installed !== null);
  const english = HALACHA_ENGLISH_PACK[track];
  return (
    <>
      <PackCard key={track} pack={track} />
      {english && installed && language === 'en' ? <PackCard pack={english} /> : null}
    </>
  );
}
