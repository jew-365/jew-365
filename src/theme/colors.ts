export type ThemeColors = {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  textSub: string;
  textMuted: string;
  border: string;
  gold: string;
  onGold: string;
  goldLight: string;
  goldText: string;
  goldWash: string;
  goldWashStrong: string;
  urgent: string;
  onUrgent: string;
  urgentBg: string;
  urgentBorder: string;
  warning: string;
  safe: string;
  optional: string;
  optionalBg: string;
  minyan: string;
  tabBg: string;
  shadow: string;
  shadowStrong: string;
  overlay: string;
};

export type ThemeName = 'gold' | 'pink' | 'purple' | 'blue' | 'dark' | 'plum';

export const THEME_NAMES: readonly ThemeName[] = ['gold', 'pink', 'purple', 'blue', 'dark', 'plum'];
export const DARK_THEMES: readonly ThemeName[] = ['dark', 'plum'];

export const T_LIGHT: ThemeColors = {
  bg: '#F6F1E8',
  surface: '#FFFDF9',
  surface2: '#F1EADF',
  text: '#1D2240',
  textSub: '#69645D',
  textMuted: '#6A655E',
  border: '#EBE3D6',
  gold: '#F08A3C',
  // White on this orange is 2.6:1, so the label on an orange fill is dark ink.
  onGold: '#2B1608',
  goldLight: '#FDE9D5',
  // The orange reads 2.5:1 on the card, so accent text uses this darker orange-brown.
  goldText: '#A04A0C',
  goldWash: '#F08A3C09',
  goldWashStrong: '#F08A3C18',
  urgent: '#CC2A2A',
  onUrgent: '#FFFFFF',
  urgentBg: '#FEF2F2',
  urgentBorder: '#FECACA',
  warning: '#B7791F',
  safe: '#0F9060',
  optional: '#1F5F6E',
  optionalBg: '#E8F2F4',
  minyan: '#6B3FA0',
  tabBg: '#FFFDF9',
  shadow: 'rgba(94,62,28,0.08)',
  shadowStrong: 'rgba(94,62,28,0.18)',
  overlay: 'rgba(29,34,64,0.45)',
};

export const T_PINK: ThemeColors = {
  bg: '#FAEFEC',
  surface: '#FFFDFC',
  surface2: '#F6E7E4',
  text: '#2E1D2A',
  textSub: '#6E6068',
  textMuted: '#72646C',
  border: '#F1E0DC',
  gold: '#E2617F',
  onGold: '#2A0C15',
  goldLight: '#FBE3E6',
  goldText: '#A8304F',
  goldWash: '#E2617F09',
  goldWashStrong: '#E2617F18',
  urgent: '#CC2A2A',
  onUrgent: '#FFFFFF',
  urgentBg: '#FEF2F2',
  urgentBorder: '#FECACA',
  warning: '#B7791F',
  safe: '#0F9060',
  optional: '#1F5F6E',
  optionalBg: '#E8F2F4',
  minyan: '#6B3FA0',
  tabBg: '#FFFDFC',
  shadow: 'rgba(101,55,54,0.08)',
  shadowStrong: 'rgba(101,55,54,0.18)',
  overlay: 'rgba(46,29,42,0.45)',
};

export const T_PURPLE: ThemeColors = {
  bg: '#F3F0F9',
  surface: '#FDFDFF',
  surface2: '#ECE9F5',
  text: '#261C3F',
  textSub: '#6E6686',
  textMuted: '#746C8C',
  border: '#E6E1F0',
  gold: '#7538E0',
  onGold: '#FFFFFF',
  goldLight: '#EDE4FF',
  goldText: '#6C2BD5',
  goldWash: '#7538E009',
  goldWashStrong: '#7538E018',
  urgent: '#CC2A2A',
  onUrgent: '#FFFFFF',
  urgentBg: '#FEF2F2',
  urgentBorder: '#FECACA',
  warning: '#B7791F',
  safe: '#0F9060',
  optional: '#1F5F6E',
  optionalBg: '#E8F2F4',
  minyan: '#0F766E',
  tabBg: '#FDFDFF',
  shadow: 'rgba(73,62,101,0.08)',
  shadowStrong: 'rgba(73,62,101,0.18)',
  overlay: 'rgba(42,19,102,0.5)',
};

export const T_BLUE: ThemeColors = {
  bg: '#ECF2FB',
  surface: '#FCFDFF',
  surface2: '#E4ECF6',
  text: '#14213D',
  textSub: '#5C6B84',
  textMuted: '#66758C',
  border: '#DCE5F1',
  gold: '#1F5FD0',
  onGold: '#FFFFFF',
  goldLight: '#DEE9FB',
  goldText: '#0F50C0',
  goldWash: '#1F5FD009',
  goldWashStrong: '#1F5FD018',
  urgent: '#CC2A2A',
  onUrgent: '#FFFFFF',
  urgentBg: '#FEF2F2',
  urgentBorder: '#FECACA',
  warning: '#B7791F',
  safe: '#0F9060',
  optional: '#1F5F6E',
  optionalBg: '#E8F2F4',
  minyan: '#6B3FA0',
  tabBg: '#FCFDFF',
  shadow: 'rgba(48,70,105,0.08)',
  shadowStrong: 'rgba(48,70,105,0.18)',
  overlay: 'rgba(11,26,58,0.5)',
};

export const T_DARK: ThemeColors = {
  bg: '#0E1626',
  surface: '#172238',
  surface2: '#222F4A',
  text: '#EEF1F7',
  textSub: '#9DA9BF',
  textMuted: '#A3AEC3',
  border: '#28354F',
  gold: '#F59A4A',
  onGold: '#1E1006',
  goldLight: '#3A2D26',
  goldText: '#F7A65E',
  goldWash: '#F59A4A09',
  goldWashStrong: '#F59A4A18',
  urgent: '#F45F5F',
  onUrgent: '#0E1626',
  urgentBg: '#2A1515',
  urgentBorder: '#7F1D1D',
  warning: '#FBBF24',
  safe: '#10B981',
  optional: '#8FCFDC',
  optionalBg: '#1C3646',
  minyan: '#C9A8EE',
  tabBg: '#172238',
  shadow: 'rgba(0,1,10,0.08)',
  shadowStrong: 'rgba(0,1,10,0.18)',
  overlay: 'rgba(0,0,0,0.6)',
};

export const T_PLUM: ThemeColors = {
  bg: '#1A1026',
  surface: '#261735',
  surface2: '#33224C',
  text: '#F4E9F8',
  textSub: '#BBA3CC',
  textMuted: '#C4AED3',
  border: '#3A2652',
  gold: '#F48FBC',
  onGold: '#2A0F20',
  goldLight: '#3C2238',
  goldText: '#FD97C4',
  goldWash: '#F48FBC09',
  goldWashStrong: '#F48FBC18',
  urgent: '#FF6B6B',
  onUrgent: '#1A1026',
  urgentBg: '#3A1A24',
  urgentBorder: '#7F2A3A',
  warning: '#F5B041',
  safe: '#3DD598',
  optional: '#9DD6E8',
  optionalBg: '#1E3240',
  minyan: '#C9A8EE',
  tabBg: '#261735',
  shadow: 'rgba(3,0,10,0.08)',
  shadowStrong: 'rgba(3,0,10,0.18)',
  overlay: 'rgba(0,0,0,0.6)',
};

export const THEMES: Record<ThemeName, ThemeColors> = {
  gold: T_LIGHT,
  pink: T_PINK,
  purple: T_PURPLE,
  blue: T_BLUE,
  dark: T_DARK,
  plum: T_PLUM,
};

export const BRAND = {
  navy: T_LIGHT.text,
  gold: T_LIGHT.gold,
  onGold: T_LIGHT.onGold,
  parchment: T_LIGHT.bg,
  white: '#FFFFFF',
} as const;

export const isDarkTheme = (name: ThemeName): boolean => DARK_THEMES.includes(name);

export function paletteForGender(gender: 'male' | 'female', current: ThemeName): ThemeName {
  if (isDarkTheme(current)) return gender === 'female' ? 'plum' : 'dark';
  return gender === 'female' ? 'pink' : 'gold';
}

function hexChannels(hex: string): [number, number, number] {
  const body = hex.slice(1);
  const full = body.length === 3 ? [...body].map((c) => c + c).join('') : body;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

export function blendHex(top: string, bottom: string, share: number): string {
  const clamped = Math.min(1, Math.max(0, share));
  const a = hexChannels(top);
  const b = hexChannels(bottom);
  return `#${a
    .map((value, i) => Math.round(value * clamped + b[i] * (1 - clamped)))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexChannels(hex).map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function readableOn(fill: string, candidates: string[]): string {
  if (candidates.length === 0) throw new Error('readableOn needs at least one candidate');
  return candidates.reduce((best, ink) => (contrastRatio(fill, ink) > contrastRatio(fill, best) ? ink : best));
}

export const CALENDAR_PARTIAL_SHARES = { p1: 0.22, p2: 0.4, p3: 0.55 } as const;

export function missedTone(colors: ThemeColors): { fill: string; border: string; ink: string; ring: string } {
  return {
    fill: blendHex(colors.urgent, colors.surface, 0.14),
    border: blendHex(colors.urgent, colors.surface, 0.31),
    ink: blendHex(colors.urgent, colors.text, 0.66),
    ring: blendHex(blendHex(colors.urgent, '#B0683C', 0.8), colors.surface, 0.8),
  };
}

export function doneTone(colors: ThemeColors): { fill: string; ink: string } {
  return {
    fill: blendHex(colors.safe, colors.surface, 0.17),
    ink: blendHex(colors.safe, colors.text, 0.66),
  };
}

// A done mark made after its window had passed: the warning hue, never the done green.
export function lateTone(colors: ThemeColors): { fill: string; ink: string; ring: string } {
  return {
    fill: blendHex(colors.warning, colors.surface, 0.14),
    ink: blendHex(colors.warning, colors.text, 0.45),
    ring: colors.warning,
  };
}
