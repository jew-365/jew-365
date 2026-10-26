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
