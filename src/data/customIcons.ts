import type { IconName } from '@/components/MitzvahIcon';

// The icons a custom mitzvah may take (the owner's request, 2026-11-04), its default (the star) first:
// every drawn icon but the interface ones (chevrons, check, close, plus, minus, undo, warning,
// search, sliders) and `star`, which draws the same star as `custom`.
export const CUSTOM_ICON_CHOICES = [
  'custom',
  'sparkle',
  'tefillin',
  'shema',
  'shacharit',
  'mincha',
  'maariv',
  'siddur',
  'tehillim',
  'chok',
  'guide',
  'brachot',
  'meals',
  'challah',
  'washingCup',
  'waterGlass',
  'apple',
  'sevenSpecies',
  'candles',
  'havdalah',
  'chanukiah',
  'sukkah',
  'shofar',
  'omer',
  'mezuzah',
  'rings',
  'hilula',
  'occasions',
  'calendar',
  'repeat',
  'sun',
  'night',
  'moon',
  'cloud',
  'storm',
  'lyre',
  'eagle',
  'suitcase',
  'compass',
  'bell',
  'chat',
  'phone',
  'user',
  'general',
] as const satisfies readonly IconName[];

export type CustomIconName = (typeof CUSTOM_ICON_CHOICES)[number];

export function customIconFor(icon: string | undefined): CustomIconName {
  return (CUSTOM_ICON_CHOICES as readonly string[]).includes(icon ?? '') ? (icon as CustomIconName) : 'custom';
}
