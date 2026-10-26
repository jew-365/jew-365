import { storage } from '@/services/StorageService';

export const UI_SCALES = [0.8, 0.85, 0.9, 0.95, 1, 1.1, 1.2] as const;
export const DEFAULT_UI_SCALE = 1;

export function isUiScale(value: unknown): value is (typeof UI_SCALES)[number] {
  return UI_SCALES.some((step) => step === value);
}

export function readStoredUiScale(read: () => string | null | undefined): number {
  try {
    const raw = read();
    if (!raw) return DEFAULT_UI_SCALE;
    const saved = (JSON.parse(raw) as { state?: { uiScale?: unknown } } | null)?.state?.uiScale;
    return isUiScale(saved) ? saved : DEFAULT_UI_SCALE;
  } catch {
    return DEFAULT_UI_SCALE;
  }
}

const underJest = typeof process !== 'undefined' && Boolean(process.env?.JEST_WORKER_ID);

export let UI_SCALE: number = underJest ? DEFAULT_UI_SCALE : readStoredUiScale(() => storage.getString('user-store'));

export function __setUiScaleForTests(scale: number): void {
  UI_SCALE = scale;
}

export function scaledBy(value: number, scale: number): number {
  return Math.round(value * scale * 2) / 2;
}

export function scaled(value: number): number {
  return scaledBy(value, UI_SCALE);
}

export function rescaled(value: number, scale: number): number {
  return scaledBy(Math.round(value / UI_SCALE), scale);
}
