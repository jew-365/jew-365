export type AddonManifestFile = { path: string; sha256: string; bytes: number };

export type AddonManifest = {
  format: number;
  version: number;
  gzipBytes: number;
  gz: Record<string, AddonManifestFile>;
};

export type AddonInstall = { version: number; bytes: number; installedAt: number; files: Record<string, string> };

export type AddonFailureReason = 'offline' | 'unavailable' | 'integrity' | 'space' | 'storage';

export type AddonDownload =
  | { status: 'idle' }
  | { status: 'downloading'; done: number; total: number; bytes: number; totalBytes: number }
  | { status: 'failed'; reason: AddonFailureReason };
