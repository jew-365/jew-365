import { scaled } from './scale';

export const spacing = {
  xs: scaled(4),
  sm: scaled(8),
  md: scaled(12),
  lg: scaled(16),
  xl: scaled(20),
  xxl: scaled(28),
  xxxl: scaled(40),
} as const;

export const radius = {
  xs: scaled(4),
  sm: scaled(8),
  md: scaled(12),
  lg: scaled(16),
  xl: scaled(20),
  xxl: scaled(24),
  full: 999,
} as const;

export const durations = {
  fast: 180,
  base: 250,
  slow: 400,
  stamp: 1300,
} as const;

export const motion = {
  easeOut: [0.23, 1, 0.32, 1],
  easeInOut: [0.77, 0, 0.175, 1],
  streakRingMs: 900,
  periodRingMs: 700,
  periodRingStagger: 90,
  barMs: 360,
  weekBarStagger: 25,
  rowBarStagger: 35,
  tabFadeMs: 200,
  tabSlideMs: 260,
  tabShift: 12,
  indicatorMs: 250,
  pressInMs: 100,
  pressOutMs: 160,
  pressScale: 0.97,
  badgeStagger: 70,
  badgeSpring: { damping: 15, stiffness: 260, mass: 1 },
  badgeFadeMs: 180,
  badgeFrom: 0.9,
  detailFadeMs: 160,
  gridCellMs: 180,
  gridCellFrom: 0.85,
  calCellStagger: 17,
  todayRingMs: 260,
  todayRingFrom: 1.15,
  lineMs: 220,
  sheetMs: 300,
  lineShift: 6,
  chipFrom: 0.9,
  visibleShare: 0.5,
  inViewThrottleMs: 100,
  inViewSettleMs: 120,
  batchWindowMs: 150,
} as const;
