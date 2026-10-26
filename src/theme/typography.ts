import { TextStyle } from 'react-native';
import { scaled } from './scale';

export const fontFamilies = {
  heebo: {
    regular: 'Heebo_400Regular',
    semibold: 'Heebo_600SemiBold',
    bold: 'Heebo_700Bold',
    extrabold: 'Heebo_800ExtraBold',
    black: 'Heebo_900Black',
  },
  siddur: {
    regular: 'NotoSerifHebrew_400Regular',
    bold: 'NotoSerifHebrew_700Bold',
  },
} as const;

type Variant =
  'display' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyBold' | 'caption' | 'captionBold' | 'small' | 'micro';

export const typography: Record<Variant, TextStyle> = {
  display: { fontFamily: fontFamilies.heebo.black, fontSize: scaled(28), lineHeight: scaled(34) },
  title: { fontFamily: fontFamilies.heebo.extrabold, fontSize: scaled(22), lineHeight: scaled(28) },
  heading: { fontFamily: fontFamilies.heebo.bold, fontSize: scaled(17), lineHeight: scaled(24) },
  subheading: { fontFamily: fontFamilies.heebo.semibold, fontSize: scaled(15), lineHeight: scaled(22) },
  body: { fontFamily: fontFamilies.heebo.regular, fontSize: scaled(15), lineHeight: scaled(22) },
  bodyBold: { fontFamily: fontFamilies.heebo.bold, fontSize: scaled(15), lineHeight: scaled(22) },
  caption: { fontFamily: fontFamilies.heebo.regular, fontSize: scaled(13), lineHeight: scaled(18) },
  captionBold: { fontFamily: fontFamilies.heebo.bold, fontSize: scaled(13), lineHeight: scaled(18) },
  small: { fontFamily: fontFamilies.heebo.regular, fontSize: scaled(12), lineHeight: scaled(16) },
  micro: { fontFamily: fontFamilies.heebo.regular, fontSize: scaled(11), lineHeight: scaled(14) },
};

export const APP_FONTS = [
  'Heebo_400Regular',
  'Heebo_600SemiBold',
  'Heebo_700Bold',
  'Heebo_800ExtraBold',
  'Heebo_900Black',
  'NotoSerifHebrew_400Regular',
  'NotoSerifHebrew_700Bold',
] as const;
