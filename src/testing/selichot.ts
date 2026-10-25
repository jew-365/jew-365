import { SELICHOT_NUSCHAOT } from '@/data/selichot';
import { IDLE_DOWNLOAD } from '@/stores/addonState';
import { useSelichotStore } from '@/stores/useSelichotStore';
import { AddonInstall } from '@/types/addon';
import { Nusach } from '@/types/mitzvah';

export function installSelichotFixture(nuschaot: readonly Nusach[] = SELICHOT_NUSCHAOT, version = 1): AddonInstall {
  const installed: AddonInstall = {
    version,
    bytes: 600_000,
    installedAt: 0,
    files: Object.fromEntries(nuschaot.map((nusach) => [nusach, `${nusach}.fixture.siddur.gz`])),
  };
  useSelichotStore.setState({ installed, latestVersion: version, checkedAt: Date.now(), download: IDLE_DOWNLOAD });
  return installed;
}
