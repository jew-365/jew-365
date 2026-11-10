import type { PeriodTone } from '@/utils/homeTimes';

// Home's smart card takes the colour of the part of the day (the owner's pick of 2026-11-10, round 8 of the
// home-schedule study, softened the same day: "not an opaque colour that stands out too much"): a muted
// gradient laid at CARD_ALPHA over the hero's land, so the sky's own colour shows through it. White text holds
// 4.5:1 on that glass at every hour (pinned in the theme suite), and the lighter fill and bar mark the live chip
// of the carousel.
export type ToneColors = { from: string; to: string; fill: string; bar: string };

export const PERIOD_TONES: Record<PeriodTone, ToneColors> = {
  dawn: { from: '#51467E', to: '#754A6A', fill: '#C68CE6', bar: '#C68CE6' },
  morning: { from: '#834E2E', to: '#743E37', fill: '#F2845A', bar: '#F2845A' },
  noon: { from: '#2D5479', to: '#233E61', fill: '#4696E1', bar: '#3B8FD9' },
  evening: { from: '#7B4054', to: '#593E7B', fill: '#E0607E', bar: '#E0607E' },
  night: { from: '#272B51', to: '#13152C', fill: '#6E78E6', bar: '#8A93F0' },
};

// The card's gradient is drawn at this opacity over the land.
export const CARD_ALPHA = 0.72;

// The share of the live chip's background the fill covers is drawn at this opacity over the chip's glass.
export const TONE_FILL_ALPHA = 0.45;
