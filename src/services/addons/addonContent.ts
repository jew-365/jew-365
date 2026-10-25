import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import {
  AddonFileCorruptError,
  addonInstallDirectory,
  addonInstallPresent,
  addonRootDirectory,
  deleteAddonFiles,
} from '@/services/addons/addonFiles';
import { reportError } from '@/services/errors';
import { IDLE_DOWNLOAD, AddonStoreApi } from '@/stores/addonState';
import { AddonFailureReason, AddonInstall, AddonManifest, AddonManifestFile } from '@/types/addon';

export const ADDON_FILE_ATTEMPTS = 3;
export const ADDON_RETRY_DELAY_MS = 1000;
export const ADDON_REQUEST_TIMEOUT_MS = 30_000;
export const ADDON_CHECK_INTERVAL_MS = 86_400_000;
export const ADDON_SPACE_MARGIN_BYTES = 50_000_000;

const FILE_REQUEST_HEADERS = { 'Cache-Control': 'no-store', Pragma: 'no-cache' };

const HASH_PATTERN = /^[0-9a-f]{64}$/;

export class AddonDownloadError extends Error {
  constructor(readonly reason: AddonFailureReason | 'cancelled') {
    super(`add-on download ${reason}`);
    this.name = 'AddonDownloadError';
  }
}

export function addonDownloadSupported(): boolean {
  return Platform.OS !== 'web';
}

export function addonMegabytes(bytes: number): string {
  return (bytes / 1_000_000).toFixed(1);
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hexOf = (digest: ArrayBuffer): string =>
  Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');

export function addonEntriesBytes(entries: unknown, keys: readonly string[], pattern: RegExp): number {
  const unavailable = () => new AddonDownloadError('unavailable');
  if (!isRecord(entries)) throw unavailable();
  if (Object.keys(entries).length !== keys.length || !keys.every((key) => key in entries)) throw unavailable();
  let sum = 0;
  for (const key of keys) {
    const entry = entries[key];
    if (
      !isRecord(entry) ||
      typeof entry.path !== 'string' ||
      !pattern.test(entry.path) ||
      typeof entry.sha256 !== 'string' ||
      !HASH_PATTERN.test(entry.sha256) ||
      !Number.isInteger(entry.bytes) ||
      (entry.bytes as number) < 1
    ) {
      throw unavailable();
    }
    sum += entry.bytes as number;
  }
  return sum;
}

export type AddonConfig = {
  baseUrl: string;
  root: string;
  format: number;
  keys: readonly string[];
  gzPath: RegExp;
  parseExtra?: (raw: Record<string, unknown>) => void;
  dirName: (version: number, keys: readonly string[]) => string;
  store: AddonStoreApi;
  clearCache: () => void;
  onForget?: () => void;
  onNothingInstalled?: () => void;
  onInstalled?: (previous: AddonInstall | null, current: AddonInstall) => void;
};

export type AddonContent<M extends AddonManifest> = {
  parseManifest: (raw: unknown) => M;
  fetchManifest: () => Promise<M>;
  prepareDownload: () => Promise<M | null>;
  install: (manifest: M, keys?: readonly string[]) => Promise<boolean>;
  cancel: () => void;
  remove: () => void;
  checkUpdate: (now?: number) => Promise<void>;
  verifyInstall: (readError?: unknown) => boolean;
  reconcile: () => void;
};

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done);
  });
}

export function createAddonContent<M extends AddonManifest>(config: AddonConfig): AddonContent<M> {
  const { baseUrl, root, store } = config;
  let running: Promise<boolean> | null = null;
  let controller: AbortController | null = null;

  const dirOf = (install: AddonInstall): string => config.dirName(install.version, Object.keys(install.files));

  function parseManifest(raw: unknown): M {
    const unavailable = () => new AddonDownloadError('unavailable');
    if (!isRecord(raw) || raw.format !== config.format) throw unavailable();
    const { version, gzipBytes, gz } = raw;
    if (!Number.isInteger(version) || (version as number) < 1) throw unavailable();
    if (gzipBytes !== addonEntriesBytes(gz, config.keys, config.gzPath)) throw unavailable();
    config.parseExtra?.(raw);
    return raw as unknown as M;
  }

  async function fetchManifest(): Promise<M> {
    const aborter = new AbortController();
    const timer = setTimeout(() => aborter.abort(), ADDON_REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}manifest.json?t=${Date.now()}`, { signal: aborter.signal });
    } catch {
      throw new AddonDownloadError('offline');
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw new AddonDownloadError('unavailable');
    let parsed: unknown;
    try {
      parsed = JSON.parse(await response.text());
    } catch {
      throw new AddonDownloadError('unavailable');
    }
    return parseManifest(parsed);
  }

  function failWith(error: unknown): void {
    if (error instanceof AddonDownloadError && error.reason !== 'cancelled') {
      store.getState().setDownload({ status: 'failed', reason: error.reason });
      return;
    }
    reportError('storage', error);
    store.getState().setDownload({ status: 'failed', reason: 'unavailable' });
  }

  async function prepareDownload(): Promise<M | null> {
    const state = store.getState();
    if (!addonDownloadSupported() || state.download.status === 'downloading') return null;
    state.setDownload(IDLE_DOWNLOAD);
    try {
      const manifest = await fetchManifest();
      store.getState().setChecked(manifest.version, Date.now());
      return manifest;
    } catch (error) {
      failWith(error);
      return null;
    }
  }

  async function fetchOnce(file: AddonManifestFile, signal: AbortSignal): Promise<Uint8Array> {
    const request = new AbortController();
    const timer = setTimeout(() => request.abort(), ADDON_REQUEST_TIMEOUT_MS);
    const onAbort = () => request.abort();
    signal.addEventListener('abort', onAbort);
    try {
      let response: Response;
      try {
        response = await fetch(baseUrl + file.path, { headers: FILE_REQUEST_HEADERS, signal: request.signal });
      } catch {
        throw new AddonDownloadError(signal.aborted ? 'cancelled' : 'offline');
      }
      if (!response.ok) throw new AddonDownloadError('unavailable');
      let data: Uint8Array<ArrayBuffer>;
      try {
        data = new Uint8Array(await response.arrayBuffer());
      } catch {
        throw new AddonDownloadError('offline');
      }
      if (hexOf(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data)) !== file.sha256) {
        throw new AddonDownloadError('integrity');
      }
      return data;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
    }
  }

  async function fetchVerified(file: AddonManifestFile, signal: AbortSignal): Promise<Uint8Array> {
    let failure = new AddonDownloadError('offline');
    for (let attempt = 1; attempt <= ADDON_FILE_ATTEMPTS; attempt++) {
      if (attempt > 1) await pause(ADDON_RETRY_DELAY_MS * (attempt - 1), signal);
      if (signal.aborted) throw new AddonDownloadError('cancelled');
      try {
        return await fetchOnce(file, signal);
      } catch (error) {
        if (!(error instanceof AddonDownloadError)) throw error;
        if (signal.aborted || error.reason === 'cancelled') throw new AddonDownloadError('cancelled');
        failure = error;
      }
    }
    throw failure;
  }

  function forget(): void {
    store.getState().clearInstalled();
    config.clearCache();
    config.onForget?.();
  }

  function discardPartial(name: string): void {
    const current = store.getState().installed;
    if (current && dirOf(current) === name) return;
    try {
      const directory = addonInstallDirectory(root, name);
      if (directory.exists) directory.delete();
    } catch {}
  }

  async function run(manifest: M, keys: readonly string[], signal: AbortSignal): Promise<void> {
    const { setDownload, setInstalled, setChecked } = store.getState();
    const total = keys.length;
    const totalBytes = keys.reduce((sum, key) => sum + manifest.gz[key].bytes, 0);
    setDownload({ status: 'downloading', done: 0, total, bytes: 0, totalBytes });
    if (Paths.availableDiskSpace < totalBytes + ADDON_SPACE_MARGIN_BYTES) throw new AddonDownloadError('space');
    const name = config.dirName(manifest.version, keys);
    const target = addonInstallDirectory(root, name);
    const current = store.getState().installed;
    if (current && dirOf(current) === name) {
      store.getState().clearInstalled();
      config.clearCache();
    }
    try {
      if (target.exists) target.delete();
      target.create({ intermediates: true });
    } catch {
      throw new AddonDownloadError('storage');
    }
    let bytes = 0;
    for (const [index, key] of keys.entries()) {
      const file = manifest.gz[key];
      const data = await fetchVerified(file, signal);
      try {
        new File(target, file.path).write(data);
      } catch {
        throw new AddonDownloadError('storage');
      }
      bytes += file.bytes;
      setDownload({ status: 'downloading', done: index + 1, total, bytes, totalBytes });
    }
    if (signal.aborted) throw new AddonDownloadError('cancelled');
    setInstalled({
      version: manifest.version,
      bytes: totalBytes,
      installedAt: Date.now(),
      files: Object.fromEntries(keys.map((key) => [key, manifest.gz[key].path])),
    });
    setChecked(manifest.version, Date.now());
    for (const entry of addonRootDirectory(root).list()) {
      if (entry.name === name) continue;
      try {
        entry.delete();
      } catch (error) {
        reportError('storage', error);
      }
    }
    config.clearCache();
    setDownload(IDLE_DOWNLOAD);
  }

  async function guardedRun(manifest: M, keys: readonly string[], signal: AbortSignal): Promise<boolean> {
    const previous = store.getState().installed;
    try {
      await run(manifest, keys, signal);
      const installed = store.getState().installed;
      if (installed) config.onInstalled?.(previous, installed);
      return true;
    } catch (error) {
      discardPartial(config.dirName(manifest.version, keys));
      if (error instanceof AddonDownloadError && error.reason === 'cancelled') {
        store.getState().setDownload(IDLE_DOWNLOAD);
      } else {
        failWith(error);
      }
      return false;
    }
  }

  function install(manifest: M, keys: readonly string[] = config.keys): Promise<boolean> {
    if (running) return running;
    if (!addonDownloadSupported()) return Promise.resolve(false);
    const aborter = new AbortController();
    controller = aborter;
    running = guardedRun(manifest, keys, aborter.signal).finally(() => {
      running = null;
      controller = null;
    });
    return running;
  }

  function cancel(): void {
    controller?.abort();
  }

  function remove(): void {
    cancel();
    forget();
    try {
      deleteAddonFiles(root);
    } catch (error) {
      reportError('storage', error);
    }
  }

  async function checkUpdate(now: number = Date.now()): Promise<void> {
    const { installed, download, checkedAt } = store.getState();
    if (!addonDownloadSupported() || installed === null || download.status === 'downloading') return;
    if (checkedAt !== null && now - checkedAt < ADDON_CHECK_INTERVAL_MS) return;
    try {
      const manifest = await fetchManifest();
      store.getState().setChecked(manifest.version, now);
    } catch {
      const state = store.getState();
      if (state.installed) state.setChecked(state.latestVersion ?? state.installed.version, now);
    }
  }

  function verifyInstall(readError?: unknown): boolean {
    const { installed } = store.getState();
    if (installed === null) return false;
    const corrupt = readError instanceof AddonFileCorruptError;
    if (!corrupt && addonInstallPresent(root, dirOf(installed), installed)) return true;
    if (corrupt) reportError('storage', readError);
    forget();
    return false;
  }

  function reconcile(): void {
    try {
      if (running !== null || !addonDownloadSupported()) return;
      const { installed } = store.getState();
      if (installed !== null && !addonInstallPresent(root, dirOf(installed), installed)) forget();
      const current = store.getState().installed;
      if (current === null) config.onNothingInstalled?.();
      const directory = addonRootDirectory(root);
      if (!directory.exists) return;
      for (const entry of directory.list()) {
        if (current !== null && entry.name === dirOf(current)) continue;
        try {
          entry.delete();
        } catch (error) {
          reportError('storage', error);
        }
      }
    } catch (error) {
      reportError('storage', error);
    }
  }

  return {
    parseManifest,
    fetchManifest,
    prepareDownload,
    install,
    cancel,
    remove,
    checkUpdate,
    verifyInstall,
    reconcile,
  };
}
