import React, { useMemo } from 'react';
import { AddonCard, AddonSource } from '@/components/AddonCard';
import {
  MISHNA_SIZE_ESTIMATE_MB,
  MISHNA_SPACE_NEEDED_MB,
  cancelMishnaDownload,
  checkMishnaUpdate,
  deleteMishna,
  installMishna,
  mishnaDownloadSupported,
  prepareMishnaDownload,
} from '@/services/MishnaContentService';
import { selectMishnaUpdateAvailable, useMishnaStore } from '@/stores/useMishnaStore';
import { MishnaManifest } from '@/types/mishna';

const mishnaSource = (mitzvahId: string): AddonSource<MishnaManifest> => ({
  supported: mishnaDownloadSupported,
  prepare: prepareMishnaDownload,
  install: (manifest) => installMishna(manifest, mitzvahId),
  cancel: cancelMishnaDownload,
  remove: deleteMishna,
  checkUpdate: checkMishnaUpdate,
  downloadBytes: (manifest) => manifest.gzipBytes,
});

// The Mishnah add-on on the screen of either Mishnah mitzvah. The credit of each source is under the text.
export function MishnaAddonCard({ mitzvahId }: { mitzvahId: string }) {
  const installed = useMishnaStore((s) => s.installed);
  const download = useMishnaStore((s) => s.download);
  const updateAvailable = useMishnaStore(selectMishnaUpdateAvailable);
  const source = useMemo(() => mishnaSource(mitzvahId), [mitzvahId]);

  return (
    <AddonCard
      copy="mishna.addon"
      source={source}
      installed={installed}
      download={download}
      updateAvailable={updateAvailable}
      estimateMb={MISHNA_SIZE_ESTIMATE_MB}
      spaceNeededMb={MISHNA_SPACE_NEEDED_MB}
    />
  );
}
