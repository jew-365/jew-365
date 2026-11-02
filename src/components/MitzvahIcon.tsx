import React, { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { AppLanguage } from '@/i18n';
import { scaled } from '@/theme/scale';
import { JEWISH_ICONS, JEWISH_TONES, type JewishColor, type JewishIconNode } from './jewishIcons.generated';

export const ICON_NAMES = [
  'tefillin',
  'shema',
  'shacharit',
  'mincha',
  'maariv',
  'brachot',
  'candles',
  'havdalah',
  'omer',
  'custom',
  'hilula',
  'siddur',
  'meals',
  'general',
  'night',
  'moon',
  'occasions',
  'calendar',
  'chok',
  'tehillim',
  'chanukiah',
  'sukkah',
  'shofar',
  // Rounds 7 and 8 (2026-11-01): icons drawn for the siddur tab's texts.
  'mezuzah',
  'washingCup',
  'challah',
  'sevenSpecies',
  'waterGlass',
  'lyre',
  'eagle',
  'suitcase',
  'apple',
  'storm',
  'rings',
  'chevronLeft',
  'chevronRight',
  'chevronDown',
  'chevronUp',
  'sparkle',
  'check',
  'close',
  'plus',
  'minus',
  'sun',
  'undo',
  'warning',
  'phone',
  'search',
  'user',
  'bell',
  'sliders',
  'star',
  'cloud',
  'chat',
  'guide',
  'compass',
  'repeat',
] as const;

export type IconName = (typeof ICON_NAMES)[number];
export type IconVariant = 'outline' | 'duotone';

// The owner picks the style on the preview board; switching is this one line.
export const ICON_VARIANT: IconVariant = 'outline';

export function iconFor(icon: string): IconName {
  return (ICON_NAMES as readonly string[]).includes(icon) ? (icon as IconName) : 'custom';
}

export const backIcon = (language: AppLanguage): IconName => (language === 'he' ? 'chevronRight' : 'chevronLeft');
export const forwardIcon = (language: AppLanguage): IconName => (language === 'he' ? 'chevronLeft' : 'chevronRight');

type Drawing = { fill: string; sw: number };

const star = ({ fill }: Drawing) => (
  <Path
    d="M12,3.3L14.53,9.32L21.04,9.86L16.09,14.13L17.58,20.49L12,17.1L6.42,20.49L7.91,14.13L2.96,9.86L9.47,9.32Z"
    fill={fill}
  />
);

// Geometry is shared by both variants; `fill` is 'none' in outline and the tint in duotone.
// Stroke colour, width, caps and joins come from the wrapping <G>.
// The Jewish icons are drawn from JEWISH_ICONS (jewishIcons.generated.ts); these are the rest.
const DRAWINGS: Partial<Record<IconName, (p: Drawing) => React.ReactElement>> = {
  custom: star,
  star,
  calendar: ({ fill }) => (
    <>
      <Rect x={3.5} y={5} width={17} height={15.5} rx={2.5} fill={fill} />
      <Line x1={3.5} y1={10} x2={20.5} y2={10} />
      <Line x1={8} y1={3} x2={8} y2={7} />
      <Line x1={16} y1={3} x2={16} y2={7} />
    </>
  ),
  chevronLeft: () => <Path d="M15,6L9,12L15,18" />,
  chevronRight: () => <Path d="M9,6L15,12L9,18" />,
  chevronDown: () => <Path d="M6,9L12,15L18,9" />,
  chevronUp: () => <Path d="M6,15L12,9L18,15" />,
  sparkle: ({ fill }) => (
    <Path d="M12,2.8Q13.66,10.34 21.2,12Q13.66,13.66 12,21.2Q10.34,13.66 2.8,12Q10.34,10.34 12,2.8Z" fill={fill} />
  ),
  check: () => <Path d="M4.5,12.5L9.5,17.5L19.5,6.5" />,
  close: () => <Path d="M6,6L18,18M18,6L6,18" />,
  plus: () => <Path d="M12,5V19M5,12H19" />,
  minus: () => <Path d="M5,12H19" />,
  sun: ({ fill }) => (
    <>
      <Circle cx={12} cy={12} r={4.5} fill={fill} />
      <Path d="M19.5,12H21.8M17.3,6.7L18.93,5.07M12,4.5V2.2M6.7,6.7L5.07,5.07M4.5,12H2.2M6.7,17.3L5.07,18.93M12,19.5V21.8M17.3,17.3L18.93,18.93" />
    </>
  ),
  // Two arrows round a loop: a reminder's nag (the owner's pick of 2026-11-02, the nagging study's board ד).
  repeat: () => (
    <>
      <Path d="M17,2.5L20,5.5L17,8.5" />
      <Path d="M4,11.5V10.5A5,5 0 0 1 9,5.5H20" />
      <Path d="M7,21.5L4,18.5L7,15.5" />
      <Path d="M20,12.5V13.5A5,5 0 0 1 15,18.5H4" />
    </>
  ),
  undo: () => (
    <>
      <Path d="M5,13A7,7 0 1 0 7.05,8.05" />
      <Path d="M7.05,4.05V8.05H11.05" />
    </>
  ),
  warning: ({ fill }) => (
    <>
      <Path d="M10.8,5.28Q12,3.2 13.2,5.28L20.4,17.72Q21.6,19.8 19.2,19.8H4.8Q2.4,19.8 3.6,17.72Z" fill={fill} />
      <Line x1={12} y1={9.8} x2={12} y2={13.8} />
      <Line x1={12} y1={16.7} x2={12} y2={16.8} />
    </>
  ),
  phone: ({ fill }) => (
    <Path
      d="M6.6,3.5H9.4L11,7.6L9,9.1Q10.5,12.6 14.9,15L16.4,13L20.5,14.6V17.4Q20.5,20.5 17.4,20.5Q11,20 7,16Q3,12 3.5,6.6Q3.5,3.5 6.6,3.5Z"
      fill={fill}
    />
  ),
  search: ({ fill }) => (
    <>
      <Circle cx={11} cy={11} r={6.5} fill={fill} />
      <Path d="M15.8,15.8L20.5,20.5" />
    </>
  ),
  user: ({ fill }) => (
    <>
      <Circle cx={12} cy={8} r={4} fill={fill} />
      <Path d="M4.5,20.5C5.4,16.6 8.4,14.5 12,14.5C15.6,14.5 18.6,16.6 19.5,20.5" />
    </>
  ),
  bell: ({ fill }) => (
    <>
      <Path d="M6,16.5V11A6,6 0 0 1 18,11V16.5L19.5,18H4.5Z" fill={fill} />
      <Path d="M10,20.5A2.2,2.2 0 0 0 14,20.5" />
    </>
  ),
  sliders: ({ fill }) => (
    <>
      <Path d="M4,7H7M11,7H20M4,12H13M17,12H20M4,17H6M10,17H20" />
      <Circle cx={9} cy={7} r={2} fill={fill} />
      <Circle cx={15} cy={12} r={2} fill={fill} />
      <Circle cx={8} cy={17} r={2} fill={fill} />
    </>
  ),
  cloud: ({ fill }) => <Path d="M7,19H17A4,4 0 0 0 17.6,11.05A6,6 0 0 0 6.25,10.2A4.5,4.5 0 0 0 7,19Z" fill={fill} />,
  chat: ({ fill }) => (
    <>
      <Path
        d="M6,4.5H18A2.5,2.5 0 0 1 20.5,7V14.5A2.5,2.5 0 0 1 18,17H10.5L6.5,20.5V17H6A2.5,2.5 0 0 1 3.5,14.5V7A2.5,2.5 0 0 1 6,4.5Z"
        fill={fill}
      />
      <Path d="M8,9H16M8,12.5H13" />
    </>
  ),
  guide: ({ fill }) => (
    <>
      <Circle cx={12} cy={12} r={8.5} fill={fill} />
      <Path d="M9.6,9.6A2.4,2.4 0 1 1 12,12V13.6" />
      <Line x1={12} y1={16.6} x2={12} y2={16.7} />
    </>
  ),
  compass: ({ fill }) => (
    <>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M15.6,8.4L13.4,13.4L8.4,15.6L10.6,10.6Z" fill={fill} />
    </>
  ),
};

type Props = {
  name: IconName;
  size?: number;
  color: string;
  tint?: string;
  variant?: IconVariant;
  strokeWidth?: number;
};

// The Jewish icons: the owner's pick of 2026-11-01 (option ב of the icon study), the coloured illustrations drawn in
// tones of the icon colour, so they follow every palette and tile tone. Each colour role is a share of the icon colour
// mixed with white or a deep brown (JEWISH_TONES); the view box trims the 48-unit art's 2-unit margin.
const hex = (value: string) => {
  const h = value.replace('#', '');
  const full = h.length === 3 ? [...h].map((d) => d + d).join('') : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

export function toneOf(color: string, role: string): string {
  const tone = JEWISH_TONES[role];
  const base = hex(color);
  if (!tone || base.some(Number.isNaN)) return color;
  const other = hex(tone.with);
  return `#${base
    .map((c, i) =>
      Math.round(c * tone.share + other[i] * (1 - tone.share))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function JewishNodes({ nodes, color, gradient }: { nodes: JewishIconNode[]; color: string; gradient: string }) {
  const paint = (value: JewishColor | undefined) =>
    value === undefined || value === 'none' ? value : 'url' in value ? `url(#${gradient})` : toneOf(color, value.role);
  return nodes.map(({ t, c, id, fill, stroke, stopColor, ...attrs }, i) => {
    const paints = { fill: paint(fill), stroke: paint(stroke), stopColor: paint(stopColor) };
    const props: Record<string, unknown> = {
      ...attrs,
      ...Object.fromEntries(Object.entries(paints).filter(([, v]) => v !== undefined)),
    };
    if (id) props.id = gradient;
    const children = c && <JewishNodes nodes={c} color={color} gradient={gradient} />;
    const Shape = (
      {
        path: Path,
        rect: Rect,
        circle: Circle,
        ellipse: Ellipse,
        g: G,
        defs: Defs,
        linearGradient: LinearGradient,
        stop: Stop,
      } as Record<JewishIconNode['t'], React.ComponentType<Record<string, unknown>>>
    )[t];
    return (
      <Shape key={i} {...(props as object)}>
        {children}
      </Shape>
    );
  });
}

export function MitzvahIcon({ name, size = scaled(22), color, tint, variant = ICON_VARIANT, strokeWidth }: Props) {
  const jewish = JEWISH_ICONS[name];
  const gradient = `jewish-${useId().replace(/:/g, '')}`;
  if (jewish) {
    return (
      <Svg width={size} height={size} viewBox="2 2 44 44">
        <JewishNodes nodes={jewish} color={color} gradient={gradient} />
      </Svg>
    );
  }
  const duotone = variant === 'duotone';
  const sw = strokeWidth ?? (duotone ? 1.5 : 1.8);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {DRAWINGS[name]?.({ fill: duotone ? (tint ?? 'transparent') : 'none', sw })}
      </G>
    </Svg>
  );
}
