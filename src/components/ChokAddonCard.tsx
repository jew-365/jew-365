import React from 'react';
import { AddonCard, AddonSource, addonCaption, useAddonDownloadFlow } from '@/components/AddonCard';
import { ChokLicenseNotice } from '@/components/ChokLicenseNotice';
import {
  CHOK_SIZE_ESTIMATE_MB,
  CHOK_SPACE_NEEDED_MB,
  cancelChokDownload,
  checkChokUpdate,
  chokDownloadSupported,
  deleteChok,
  installChok,
  prepareChokDownload,
} from '@/services/ChokContentService';
import { selectChokUpdateAvailable, useChokStore } from '@/stores/useChokStore';
import { spacing } from '@/theme/tokens';
import { ChokDownload, ChokManifest } from '@/types/chok';

const CHOK_SOURCE: AddonSource<ChokManifest> = {
  supported: chokDownloadSupported,
  prepare: prepareChokDownload,
  install: installChok,
  cancel: cancelChokDownload,
  remove: deleteChok,
  checkUpdate: checkChokUpdate,
  downloadBytes: (manifest) => manifest.gzipBytes,
};

export function chokAddonCaption(
  download: ChokDownload,
  t: (key: string, o?: Record<string, unknown>) => string,
): string {
  return addonCaption('chok.addon', CHOK_SIZE_ESTIMATE_MB, download, t);
}

export function useChokDownloadFlow(): {
  preparing: boolean;
  prepare: () => Promise<void>;
  dialog: React.ReactElement;
} {
  const installed = useChokStore((s) => s.installed !== null);
  return useAddonDownloadFlow({ copy: 'chok.addon', source: CHOK_SOURCE, installed });
}

export function ChokAddonCard() {
  const installed = useChokStore((s) => s.installed);
  const download = useChokStore((s) => s.download);
  const updateAvailable = useChokStore(selectChokUpdateAvailable);

  return (
    <AddonCard
      copy="chok.addon"
      source={CHOK_SOURCE}
      installed={installed}
      download={download}
      updateAvailable={updateAvailable}
      estimateMb={CHOK_SIZE_ESTIMATE_MB}
      spaceNeededMb={CHOK_SPACE_NEEDED_MB}
      footer={<ChokLicenseNotice compact style={{ marginTop: spacing.md }} />}
    />
  );
}
