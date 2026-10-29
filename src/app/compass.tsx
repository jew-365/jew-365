import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ExpoLocation from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { MitzvahIcon } from '@/components/MitzvahIcon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getLocationName } from '@/data/cities';
import { EASE_OUT, useReduceMotion } from '@/hooks/useMotion';
import { LocationService } from '@/services/LocationService';
import { useUserStore } from '@/stores/useUserStore';
import { blendHex, readableOn, type ThemeColors } from '@/theme/colors';
import { scaled } from '@/theme/scale';
import { shadowPresets, shadowStyle } from '@/theme/shadowStyle';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { fontFamilies, typography } from '@/theme/typography';
import {
  arrowAngle,
  bearingTo,
  compassPrayerOf,
  distanceKm,
  nextFacing,
  normalizeDegrees,
  type GeoPoint,
} from '@/utils/compass';
import { useI18n } from '@/i18n';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const VIEW = 343;
const CENTER = VIEW / 2;
const RADAR_RADIUS = 150;
const RINGS_KM = [5, 20, 60, 200];
const STAGE_MAX = scaled(VIEW);
const SWEEP_MS = 3200;
const SWEEP_TRAIL_DEG = 80;
const SWEEP_SLICES = 8;
const PULSE_MS = 2400;
const WAVE_MS = 900;
const WAVE_GAP_MS = 140;
const GLOW_SIZE = 110;
const CORE_SIZE = 14;
const PILL_SIZE = 22;
const CHECK_SIZE = scaled(22);

// Distances from 0 to 200 km on a log scale, so a nearby Kotel and one across the world both fit.
export function radarRadius(km: number, max = RADAR_RADIUS): number {
  return (max * Math.log10(1 + Math.min(km, 200))) / Math.log10(201);
}

export function signedOffset(angle: number): number {
  const off = normalizeDegrees(angle);
  return off > 180 ? off - 360 : off;
}

const polar = (r: number, degrees: number): [number, number] => {
  const rad = (degrees * Math.PI) / 180;
  return [CENTER + r * Math.sin(rad), CENTER - r * Math.cos(rad)];
};

function sweepSlice(from: number, to: number): string {
  const [x1, y1] = polar(RADAR_RADIUS, from);
  const [x2, y2] = polar(RADAR_RADIUS, to);
  return `M${CENTER} ${CENTER} L${x1} ${y1} A${RADAR_RADIUS} ${RADAR_RADIUS} 0 0 1 ${x2} ${y2} Z`;
}

export type RadarColors = {
  card: string;
  edge: string;
  line: string;
  outer: string;
  ink: string;
  glyph: string;
  sweep: string;
  done: string;
  labelBg: string;
  labelInk: string;
};

export function radarColors(colors: ThemeColors): RadarColors {
  const card = colors.surface;
  const labelBg = colors.goldLight;
  return {
    card,
    edge: colors.border,
    line: blendHex(colors.textSub, card, 0.22),
    outer: blendHex(colors.textSub, card, 0.45),
    ink: readableOn(card, [colors.textSub, colors.text]),
    glyph: colors.text,
    sweep: colors.gold,
    done: colors.safe,
    labelBg,
    labelInk: readableOn(labelBg, [colors.goldText, colors.text]),
  };
}

type Reading = { heading: number; magnetic: boolean; accuracy: number };

function useHeading(granted: boolean | null): { reading: Reading | null; failed: boolean } {
  const [reading, setReading] = useState<Reading | null>(null);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web' || granted !== true) return undefined;
      let active = true;
      let subscription: ExpoLocation.LocationSubscription | null = null;
      const release = (created: ExpoLocation.LocationSubscription) => {
        try {
          created.remove();
        } catch {}
      };
      setFailed(false);
      ExpoLocation.watchHeadingAsync((next) => {
        if (!active) return;
        const magnetic = next.trueHeading < 0;
        setReading({ heading: magnetic ? next.magHeading : next.trueHeading, magnetic, accuracy: next.accuracy });
      })
        .then((created) => {
          if (active) subscription = created;
          else release(created);
        })
        .catch(() => {
          if (active) setFailed(true);
        });
      return () => {
        active = false;
        if (subscription) release(subscription);
        setReading(null);
      };
    }, [granted]),
  );

  return { reading, failed };
}

type RadarProps = {
  size: number;
  heading: number;
  angle: number;
  distance: number;
  facing: boolean;
  live: boolean;
};

function Radar({ size, heading, angle, distance, facing, live }: RadarProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const reduceMotion = useReduceMotion();
  const scale = size / VIEW;
  const {
    card,
    edge,
    line,
    outer,
    ink,
    glyph,
    sweep: sweepTone,
    done,
    labelBg,
    labelInk,
  } = useMemo(() => radarColors(colors), [colors]);
  const tone = facing ? done : sweepTone;
  const targetRadius = radarRadius(distance);
  const sweeping = live && !reduceMotion;

  const sweep = useSharedValue(0);
  const target = useSharedValue(angle);
  const steady = useSharedValue(1);
  const pulse = useSharedValue(0);
  const wave = useSharedValue(0);
  const echo = useSharedValue(0);
  const wasFacing = useRef(facing);

  useEffect(() => {
    target.value = angle;
    steady.value = facing || !sweeping ? 1 : 0;
  }, [angle, facing, sweeping, target, steady]);

  useEffect(() => {
    if (!sweeping) {
      cancelAnimation(sweep);
      cancelAnimation(pulse);
      sweep.value = normalizeDegrees(angle + 20);
      pulse.value = 0;
      return undefined;
    }
    sweep.value = 0;
    sweep.value = withRepeat(withTiming(360, { duration: SWEEP_MS, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withTiming(1, { duration: PULSE_MS, easing: EASE_OUT }), -1, false);
    return () => {
      cancelAnimation(sweep);
      cancelAnimation(pulse);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the static sweep only needs the angle when motion is off
  }, [sweeping]);

  useEffect(() => {
    if (facing && !wasFacing.current && !reduceMotion) {
      wave.value = 0;
      echo.value = 0;
      wave.value = withTiming(1, { duration: WAVE_MS, easing: EASE_OUT });
      echo.value = withDelay(WAVE_GAP_MS, withTiming(1, { duration: WAVE_MS, easing: EASE_OUT }));
    }
    wasFacing.current = facing;
  }, [facing, reduceMotion, wave, echo]);

  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${sweep.value}deg` }] }));
  const lit = () => {
    'worklet';
    if (steady.value === 1) return 1;
    const since = (((sweep.value - target.value) % 360) + 360) % 360;
    return 0.18 + 0.82 * Math.exp(-since / 110);
  };
  const glowStyle = useAnimatedStyle(() => ({ opacity: lit() }));
  const coreStyle = useAnimatedStyle(() => ({ opacity: 0.35 + 0.65 * lit() }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: sweeping ? 0.8 * (1 - pulse.value) : 0,
    transform: [{ scale: 1 + 3.5 * pulse.value }],
  }));
  const waveStyle = useAnimatedStyle(() => ({
    opacity: wave.value > 0 && wave.value < 1 ? 0.9 * (1 - wave.value) : 0,
    transform: [{ scale: 1 + 8 * wave.value }],
  }));
  const echoStyle = useAnimatedStyle(() => ({
    opacity: echo.value > 0 && echo.value < 1 ? 0.9 * (1 - echo.value) : 0,
    transform: [{ scale: 1 + 8 * echo.value }],
  }));

  const at = (px: number) => px * scale;
  const glow = at(GLOW_SIZE);
  const core = at(CORE_SIZE);
  const pill = at(PILL_SIZE);
  const ring = (dimension: number) => ({
    position: 'absolute' as const,
    width: dimension,
    height: dimension,
    left: -dimension / 2,
    top: -dimension / 2,
    borderRadius: dimension / 2,
  });

  return (
    <View
      testID="compass-radar"
      style={[
        styles.radar,
        shadowStyle(colors.shadow, shadowPresets.cardSoft),
        { width: size, height: size, backgroundColor: card, borderColor: edge },
      ]}
      accessible
      accessibilityLabel={t('compass.a11y', { degrees: Math.round(angle) })}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`} style={StyleSheet.absoluteFill}>
        {RINGS_KM.map((km, index) => {
          const r = radarRadius(km);
          const last = index === RINGS_KM.length - 1;
          return (
            <React.Fragment key={km}>
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={r}
                fill="none"
                stroke={last ? outer : line}
                strokeWidth={last ? 1.5 : 1}
              />
              <SvgText
                x={CENTER}
                y={CENTER + r - 7}
                textAnchor="middle"
                fontSize={10}
                fontFamily={fontFamilies.heebo.semibold}
                fill={ink}
              >
                {t('compass.ringKm', { km })}
              </SvgText>
            </React.Fragment>
          );
        })}
        <Line
          x1={CENTER}
          y1={CENTER}
          x2={CENTER}
          y2={CENTER - RADAR_RADIUS}
          stroke={ink}
          strokeWidth={1.2}
          strokeDasharray="3 5"
          opacity={0.6}
        />
      </Svg>
      <Animated.View testID="compass-sweep" style={[StyleSheet.absoluteFill, sweepStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
          {Array.from({ length: SWEEP_SLICES }, (_, index) => {
            const step = SWEEP_TRAIL_DEG / SWEEP_SLICES;
            const from = -SWEEP_TRAIL_DEG + index * step;
            return (
              <Path
                key={index}
                d={sweepSlice(from, from + step)}
                fill={tone}
                opacity={(0.34 * (index + 1)) / SWEEP_SLICES}
              />
            );
          })}
          <Line x1={CENTER} y1={CENTER} x2={CENTER} y2={CENTER - RADAR_RADIUS} stroke={tone} strokeWidth={2} />
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`} style={StyleSheet.absoluteFill}>
        <Rect
          x={CENTER - 6}
          y={CENTER - 11}
          width={12}
          height={22}
          rx={3.5}
          fill="none"
          stroke={glyph}
          strokeWidth={1.6}
        />
        <Circle cx={CENTER} cy={CENTER - 6.5} r={1.3} fill={glyph} />
      </Svg>

      <View
        testID="compass-dial"
        style={[styles.layer, { transform: [{ rotate: `${-heading}deg` }] }]}
        pointerEvents="none"
      >
        <View style={[styles.pin, { top: at(CENTER - RADAR_RADIUS), transform: [{ rotate: `${heading}deg` }] }]}>
          <View style={[ring(pill), styles.center, { backgroundColor: card, borderColor: line, borderWidth: 1 }]}>
            <Text style={[typography.micro, styles.northText, { color: ink }]}>{t('compass.north')}</Text>
          </View>
        </View>
      </View>

      <View
        testID="compass-arrow"
        style={[styles.layer, { transform: [{ rotate: `${angle}deg` }] }]}
        pointerEvents="none"
      >
        <View style={[styles.pin, { top: at(CENTER - targetRadius), transform: [{ rotate: `${-angle}deg` }] }]}>
          <Animated.View style={[ring(glow), glowStyle]}>
            <Svg width={glow} height={glow}>
              <Defs>
                <RadialGradient id="compass-glow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={tone} stopOpacity={0.55} />
                  <Stop offset="0.68" stopColor={tone} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={glow / 2} cy={glow / 2} r={glow / 2} fill="url(#compass-glow)" />
            </Svg>
          </Animated.View>
          <Animated.View style={[ring(core), { borderWidth: 1.5, borderColor: tone }, pulseStyle]} />
          <Animated.View style={[ring(at(40)), { borderWidth: 2, borderColor: done }, waveStyle]} />
          <Animated.View style={[ring(at(40)), { borderWidth: 2, borderColor: done }, echoStyle]} />
          <Animated.View
            testID="compass-target"
            style={[ring(core), { backgroundColor: tone, borderWidth: at(3), borderColor: card }, coreStyle]}
          />
          <View style={[styles.label, { top: at(13), backgroundColor: labelBg }]}>
            <Text style={[typography.small, styles.labelText, { color: labelInk }]}>{t('compass.kotel')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CompassScreen() {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ prayer?: string; date?: string }>();
  const prayer = compassPrayerOf(typeof params.prayer === 'string' ? params.prayer : undefined);
  const prayerDate = typeof params.date === 'string' && DATE_KEY.test(params.date) ? params.date : undefined;
  const { width } = useWindowDimensions();
  const saved = useUserStore((s) => s.location);
  const [granted, setGranted] = useState<boolean | null>(null);
  const { reading, failed } = useHeading(granted);
  const [fix, setFix] = useState<GeoPoint | null>(null);
  const [lost, setLost] = useState(false);
  const unavailable = Platform.OS === 'web' || failed;
  const needsPermission = !unavailable && granted === false;
  const waiting = !unavailable && granted === true && reading === null;
  const [locating, setLocating] = useState(false);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/more'));

  const locate = useCallback(async () => {
    setLocating(true);
    setLost(false);
    const last = await LocationService.getLastKnownPoint();
    if (last) setFix(last);
    const precise = await LocationService.getPrecisePoint();
    if (precise) setFix(precise);
    setLocating(false);
    setLost(!last && !precise);
  }, []);

  useEffect(() => {
    let active = true;
    LocationService.getPermissionStatus()
      .then((status) => {
        if (!active) return;
        setGranted(status === 'ready');
        if (status === 'ready') void locate();
      })
      .catch(() => {
        if (active) setGranted(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const askPermission = async () => {
    const status = await LocationService.requestPermission();
    if (status === 'ready') {
      setGranted(true);
      void locate();
    } else if (status === 'denied') {
      Linking.openSettings().catch(() => {});
    }
  };

  const point: GeoPoint = fix ?? saved;
  const bearing = useMemo(() => bearingTo(point), [point]);
  const distance = useMemo(() => distanceKm(point), [point]);
  const angle = reading ? arrowAngle(bearing, reading.heading) : 0;
  const [facing, setFacing] = useState(false);
  const wasFacing = useRef(false);

  useEffect(() => {
    setFacing((previous) => reading !== null && nextFacing(previous, angle));
  }, [reading, angle]);

  useEffect(() => {
    if (facing && !wasFacing.current) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    wasFacing.current = facing;
  }, [facing]);

  const [reached, setReached] = useState(false);
  useEffect(() => {
    if (facing) setReached(true);
  }, [facing]);
  const backToPrayer = () => {
    if (!prayer) return;
    if (router.canGoBack()) router.back();
    else
      router.replace({
        pathname: '/siddur/[id]',
        params: { id: prayer, ...(prayerDate ? { date: prayerDate } : {}), fromCompass: '1' },
      });
  };

  const size = Math.min(STAGE_MAX, width - spacing.lg * 2);
  const degrees = Math.round(bearing);
  const km = distance >= 100 ? String(Math.round(distance)) : distance.toFixed(1);
  const offset = signedOffset(angle);
  const turn = t(offset > 0 ? 'compass.turnRight' : 'compass.turnLeft', { degrees: Math.round(Math.abs(offset)) });
  const sourceLine = locating
    ? t('compass.locating')
    : fix
      ? t('compass.fromGps')
      : t('compass.fromCity', { city: getLocationName(saved, language) });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={t('compass.title')} subtitle={t('compass.subtitle')} onBack={goBack} />
      <ScrollView contentContainerStyle={styles.list}>
        {unavailable ? <Banner tone="warning" text={t('compass.unavailable')} /> : null}
        {needsPermission ? <Banner tone="info" text={t('compass.needsPermission')} /> : null}
        {lost && !fix ? (
          <Banner
            tone="warning"
            text={t('compass.noFix', { city: getLocationName(saved, language) })}
            onPress={() => void locate()}
          />
        ) : null}
        {waiting ? <Banner tone="info" text={t('compass.waiting')} /> : null}
        {reading && reading.magnetic ? <Banner tone="info" text={t('compass.magnetic')} /> : null}
        {reading && (reading.accuracy === 0 || reading.accuracy === 1) ? (
          <Banner tone="warning" text={t('compass.calibrate')} />
        ) : null}

        {!unavailable && !needsPermission ? (
          <Radar
            size={size}
            heading={reading?.heading ?? 0}
            angle={angle}
            distance={distance}
            facing={facing}
            live={reading !== null}
          />
        ) : null}

        {reading ? (
          <View style={styles.say} accessibilityLiveRegion="polite">
            {facing ? (
              <>
                <MitzvahIcon name="check" size={CHECK_SIZE} color={colors.safe} />
                <Text style={[typography.title, { color: colors.safe }]}>{t('compass.facing')}</Text>
              </>
            ) : (
              <Text style={[typography.title, { color: colors.text }]}>{turn}</Text>
            )}
          </View>
        ) : null}

        <View style={styles.facts}>
          <Text style={[typography.body, { color: colors.textSub }]}>
            <Text style={[typography.bodyBold, { color: colors.text }]}>{km}</Text> {t('compass.km')}
          </Text>
          <Text style={[typography.body, { color: colors.textSub }]}>
            <Text style={[typography.bodyBold, { color: colors.text }]}>{degrees}°</Text>{' '}
            {t('compass.fromNorth', { wind: t(`compass.wind.${Math.round(bearing / 45) % 8}`) })}
          </Text>
        </View>
        <Text style={[typography.caption, styles.source, { color: colors.textMuted }]}>{sourceLine}</Text>
        {granted === false ? (
          <Button label={t('compass.permission')} variant="secondary" onPress={askPermission} />
        ) : null}
      </ScrollView>
      {prayer && reached ? (
        <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: colors.bg }]}>
          <Button label={t('compass.backToPrayer')} icon="siddur" onPress={backToPrayer} />
        </SafeAreaView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  radar: {
    alignSelf: 'center',
    marginVertical: spacing.md,
    borderRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  pin: {
    position: 'absolute',
    left: '50%',
    width: 0,
    height: 0,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  northText: {
    fontFamily: typography.captionBold.fontFamily,
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    width: scaled(88),
    left: -scaled(44),
    alignItems: 'center',
    borderRadius: radius.full,
    paddingVertical: scaled(3),
  },
  labelText: {
    fontFamily: typography.captionBold.fontFamily,
  },
  say: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  facts: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    columnGap: spacing.lg,
  },
  source: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
