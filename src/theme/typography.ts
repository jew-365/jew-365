import { TextStyle } from 'react-native';
import { scaled } from './scale';

export const fontFamilies = {
  // The app's face outside the prayer texts: Rubik (the owner's pick, 2026-11-01). Each role is one
  // Rubik weight lighter than its name, because Rubik reads heavier than Heebo did at the same weight.
  ui: {
    regular: 'Rubik_400Regular',
    semibold: 'Rubik_500Medium',
    bold: 'Rubik_600SemiBold',
    extrabold: 'Rubik_700Bold',
    black: 'Rubik_800ExtraBold',
  },
  siddur: {
    regular: 'NotoSerifHebrew_400Regular',
    bold: 'NotoSerifHebrew_700Bold',
  },
} as const;

type Variant =
  'display' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyBold' | 'caption' | 'captionBold' | 'small' | 'micro';

export const typography: Record<Variant, TextStyle> = {
  display: { fontFamily: fontFamilies.ui.black, fontSize: scaled(28), lineHeight: scaled(34) },
  title: { fontFamily: fontFamilies.ui.extrabold, fontSize: scaled(22), lineHeight: scaled(28) },
  heading: { fontFamily: fontFamilies.ui.bold, fontSize: scaled(17), lineHeight: scaled(24) },
  subheading: { fontFamily: fontFamilies.ui.semibold, fontSize: scaled(15), lineHeight: scaled(22) },
  body: { fontFamily: fontFamilies.ui.regular, fontSize: scaled(15), lineHeight: scaled(22) },
  bodyBold: { fontFamily: fontFamilies.ui.bold, fontSize: scaled(15), lineHeight: scaled(22) },
  caption: { fontFamily: fontFamilies.ui.regular, fontSize: scaled(13), lineHeight: scaled(18) },
  captionBold: { fontFamily: fontFamilies.ui.bold, fontSize: scaled(13), lineHeight: scaled(18) },
  small: { fontFamily: fontFamilies.ui.regular, fontSize: scaled(12), lineHeight: scaled(16) },
  micro: { fontFamily: fontFamilies.ui.regular, fontSize: scaled(11), lineHeight: scaled(14) },
};

export const APP_FONTS = [
  'Rubik_400Regular',
  'Rubik_500Medium',
  'Rubik_600SemiBold',
  'Rubik_700Bold',
  'Rubik_800ExtraBold',
  'NotoSerifHebrew_400Regular',
  'NotoSerifHebrew_700Bold',
] as const;
