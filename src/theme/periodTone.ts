import type { PeriodTone } from '@/utils/homeTimes';

// Home's smart card takes the colour of the period (the owner's pick of 2026-11-10, round 8 of the
// home-schedule study): a fixed scene palette like the sky's (sky.ts), deep enough that white text holds 4.5:1
// on both stops, and a lighter fill for the live chip of the carousel and its bar.
export type ToneColors = { from: string; to: string; fill: string; bar: string };

export const PERIOD_TONES: Record<PeriodTone, ToneColors> = {
  dawn: { from: '#5A47A8', to: '#9A4F86', fill: '#C68CE6', bar: '#C68CE6' },
  morning: { from: '#B65A22', to: '#9E3F33', fill: '#F2845A', bar: '#F2845A' },
  noon: { from: '#2367A8', to: '#1B4A86', fill: '#4696E1', bar: '#3B8FD9' },
  evening: { from: '#A63E62', to: '#6A3BA6', fill: '#E0607E', bar: '#E0607E' },
  night: { from: '#252B6E', to: '#10143D', fill: '#6E78E6', bar: '#8A93F0' },
  shabbat: { from: '#4A2350', to: '#7A3552', fill: '#F6C453', bar: '#F6C453' },
  chanukah: { from: '#0E2A6E', to: '#2152B5', fill: '#5082F0', bar: '#F6C453' },
  fast: { from: '#4B5563', to: '#1F2937', fill: '#8C96A5', bar: '#9CA3AF' },
  roshChodesh: { from: '#2E3C74', to: '#56679E', fill: '#A0B4EB', bar: '#A9B9E8' },
};

// The share of the live chip's background the fill covers is drawn at this opacity over the chip's glass.
export const TONE_FILL_ALPHA = 0.45;
