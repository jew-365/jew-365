import React, { useMemo } from 'react';
import { AddonCard, AddonSource, addonCaption, useAddonDownloadFlow } from '@/components/AddonCard';
import { useI18n } from '@/i18n';
import {
  SELICHOT_SIZE_ESTIMATE_MB,
  SELICHOT_SPACE_NEEDED_MB,
  cancelSelichotDownload,
  checkSelichotUpdate,
  deleteSelichot,
  installSelichot,
  prepareSelichotDownload,
  selichotDownloadSupported,
} from '@/services/SelichotContentService';
import { selectAddonUpdateAvailable } from '@/stores/addonState';
import { selectSelichotInstalledFor, useSelichotStore } from '@/stores/useSelichotStore';
import { useUserStore } from '@/stores/useUserStore';
import { AddonDownload, AddonManifest } from '@/types/addon';
import { Nusach } from '@/types/mitzvah';

function useSelichotSource(nusach: Nusach): AddonSource<AddonManifest> {
  return useMemo(
    () => ({
      supported: selichotDownloadSupported,
      prepare: prepareSelichotDownload,
      install: (manifest) => installSelichot(manifest, nusach),
      cancel: cancelSelichotDownload,
      remove: deleteSelichot,
      checkUpdate: checkSelichotUpdate,
      downloadBytes: (manifest) => manifest.gz[nusach]?.bytes ?? manifest.gzipBytes,
    }),
    [nusach],
  );
}

export function selichotAddonCaption(
  download: AddonDownload,
  nusachLabel: string,
  t: (key: string, o?: Record<string, unknown>) => string,
): string {
  return addonCaption('selichot.addon', SELICHOT_SIZE_ESTIMATE_MB, download, t, { nusach: nusachLabel });
}

export function useSelichotDownloadFlow(opts: { cancelLabel?: string; onCancel?: () => void } = {}): {
  preparing: boolean;
  prepare: () => Promise<void>;
  dialog: React.ReactElement;
} {
  const { t } = useI18n();
  const nusach = useUserStore((s) => s.nusach);
  const installed = useSelichotStore(selectSelichotInstalledFor(nusach));
  const source = useSelichotSource(nusach);
  return useAddonDownloadFlow({
    copy: 'selichot.addon',
    source,
    installed,
    params: { nusach: t(`nusach.${nusach}`) },
    ...opts,
  });
}

export function SelichotAddonCard() {
  const { t } = useI18n();
  const nusach = useUserStore((s) => s.nusach);
  const stored = useSelichotStore((s) => s.installed);
  const download = useSelichotStore((s) => s.download);
  const latestVersion = useSelichotStore((s) => s.latestVersion);
  const source = useSelichotSource(nusach);
  const installed = stored?.files[nusach] !== undefined ? stored : null;

  return (
    <AddonCard
      copy="selichot.addon"
      source={source}
      installed={installed}
      download={download}
      updateAvailable={installed !== null && selectAddonUpdateAvailable({ installed, latestVersion })}
      estimateMb={SELICHOT_SIZE_ESTIMATE_MB}
      spaceNeededMb={SELICHOT_SPACE_NEEDED_MB}
      params={{ nusach: t(`nusach.${nusach}`) }}
    />
  );
}
