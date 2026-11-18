import { IDLE_DOWNLOAD } from '@/stores/addonState';
import { useMishnaStore } from '@/stores/useMishnaStore';
import { AddonInstall } from '@/types/addon';
import { MISHNA_TRACTATES } from '@/utils/mishna';

// The Mishnah add-on as installed, every tractate named by a fixture file; a test that reads the text mocks the loader.
export function installMishnaFixture(version = 1): AddonInstall {
  const installed: AddonInstall = {
    version,
    bytes: 3_400_000,
    installedAt: 0,
    files: Object.fromEntries(MISHNA_TRACTATES.map((k, index) => [k, `fixture-${index}.json.gz`])),
  };
  useMishnaStore.setState({ installed, latestVersion: version, checkedAt: Date.now(), download: IDLE_DOWNLOAD });
  return installed;
}
