import React from 'react';
import { AddonCard, AddonSource, addonCaption, useAddonDownloadFlow } from '@/components/AddonCard';
import {
  SHNAYIM_SIZE_ESTIMATE_MB,
  SHNAYIM_SPACE_NEEDED_MB,
  cancelShnayimDownload,
  checkShnayimUpdate,
  deleteShnayim,
  installShnayim,
  prepareShnayimDownload,
  shnayimDownloadSupported,
} from '@/services/ShnayimContentService';
import { selectShnayimUpdateAvailable, useShnayimStore } from '@/stores/useShnayimStore';
import { AddonDownload } from '@/types/addon';
import { ShnayimManifest } from '@/types/shnayim';

const SHNAYIM_SOURCE: AddonSource<ShnayimManifest> = {
  supported: shnayimDownloadSupported,
  prepare: prepareShnayimDownload,
  install: installShnayim,
  cancel: cancelShnayimDownload,
  remove: deleteShnayim,
  checkUpdate: checkShnayimUpdate,
  downloadBytes: (manifest) => manifest.gzipBytes,
};

export function shnayimAddonCaption(
  download: AddonDownload,
  t: (key: string, o?: Record<string, unknown>) => string,
): string {
  return addonCaption('shnayim.addon', SHNAYIM_SIZE_ESTIMATE_MB, download, t);
}

export function useShnayimDownloadFlow(): {
  preparing: boolean;
  prepare: () => Promise<void>;
  dialog: React.ReactElement;
} {
  const installed = useShnayimStore((s) => s.installed !== null);
  return useAddonDownloadFlow({ copy: 'shnayim.addon', source: SHNAYIM_SOURCE, installed });
}

// The Shnayim Mikra add-on on its mitzvah screen. The text is in the public domain, so the card carries no licence.
export function ShnayimAddonCard() {
  const installed = useShnayimStore((s) => s.installed);
  const download = useShnayimStore((s) => s.download);
  const updateAvailable = useShnayimStore(selectShnayimUpdateAvailable);

  return (
    <AddonCard
      copy="shnayim.addon"
      source={SHNAYIM_SOURCE}
      installed={installed}
      download={download}
      updateAvailable={updateAvailable}
      estimateMb={SHNAYIM_SIZE_ESTIMATE_MB}
      spaceNeededMb={SHNAYIM_SPACE_NEEDED_MB}
    />
  );
}
