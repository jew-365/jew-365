import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import * as ExpoLocation from 'expo-location';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getLocationName } from '@/data/cities';
import { LocationService } from '@/services/LocationService';
import { useUserStore } from '@/stores/useUserStore';
import { scaled } from '@/theme/scale';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { arrowAngle, bearingTo, distanceKm, nextFacing, type GeoPoint } from '@/utils/compass';
import { useI18n } from '@/i18n';

const DIAL_MAX = scaled(280);
const TICKS = 36;

type Reading = { heading: number; magnetic: boolean; accuracy: number };

type Fix = { point: GeoPoint; name: string } | null;

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

export default function CompassScreen() {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const saved = useUserStore((s) => s.location);
  const [granted, setGranted] = useState<boolean | null>(null);
  const { reading, failed } = useHeading(granted);
  const [fix, setFix] = useState<Fix>(null);
  const unavailable = Platform.OS === 'web' || failed;
  const needsPermission = !unavailable && granted === false;
  const waiting = !unavailable && granted === true && reading === null;
  const [locating, setLocating] = useState(false);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/more'));

  const locate = useCallback(async () => {
    setLocating(true);
    const { location } = await LocationService.getCurrentLocation();
    setLocating(false);
    if (location)
      setFix({ point: { lat: location.lat, lng: location.lng }, name: getLocationName(location, language) });
  }, [language]);

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

  const point: GeoPoint = fix?.point ?? saved;
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

  const size = Math.min(DIAL_MAX, width - spacing.xxxl * 2);
  const degrees = Math.round(bearing);
  const km = distance >= 100 ? String(Math.round(distance)) : distance.toFixed(1);
  const sourceLine = locating
    ? t('compass.locating')
    : fix
      ? t('compass.fromGps')
      : t('compass.fromCity', { city: getLocationName(saved, language) });
  const dial = { width: size, height: size };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={t('compass.title')} subtitle={t('compass.subtitle')} onBack={goBack} />
      <ScrollView contentContainerStyle={styles.list}>
        {unavailable ? <Banner tone="warning" text={t('compass.unavailable')} /> : null}
        {needsPermission ? <Banner tone="info" text={t('compass.needsPermission')} /> : null}
        {waiting ? <Banner tone="info" text={t('compass.waiting')} /> : null}
        {reading && reading.magnetic ? <Banner tone="info" text={t('compass.magnetic')} /> : null}
        {reading && (reading.accuracy === 0 || reading.accuracy === 1) ? (
          <Banner tone="warning" text={t('compass.calibrate')} />
        ) : null}
        {facing ? <Banner tone="safe" text={t('compass.facing')} /> : null}

        {!unavailable && !needsPermission ? (
          <View
            style={[styles.dial, dial]}
            accessible
            accessibilityLabel={t('compass.a11y', { degrees: Math.round(angle) })}
          >
            <View
              testID="compass-dial"
              style={[styles.layer, { transform: [{ rotate: `${-(reading?.heading ?? 0)}deg` }] }]}
            >
              <Svg width={size} height={size} viewBox="0 0 100 100">
                <Circle cx={50} cy={50} r={46} stroke={colors.border} strokeWidth={2} fill={colors.surface} />
                {Array.from({ length: TICKS }, (_, index) => {
                  const long = index % 3 === 0;
                  const inner = long ? 38 : 41;
                  const radians = (index * 360) / TICKS;
                  const rad = (radians * Math.PI) / 180;
                  return (
                    <Line
                      key={index}
                      x1={50 + 44 * Math.sin(rad)}
                      y1={50 - 44 * Math.cos(rad)}
                      x2={50 + inner * Math.sin(rad)}
                      y2={50 - inner * Math.cos(rad)}
                      stroke={colors.textMuted}
                      strokeWidth={long ? 1.4 : 0.8}
                    />
                  );
                })}
              </Svg>
              <Text style={[typography.heading, styles.north, { color: colors.goldText }]}>{t('compass.north')}</Text>
            </View>
            <View testID="compass-arrow" style={[styles.layer, { transform: [{ rotate: `${angle}deg` }] }]}>
              <Svg width={size} height={size} viewBox="0 0 100 100">
                <Path d="M50,14L58,50L50,44L42,50Z" fill={facing ? colors.safe : colors.gold} />
                <Line x1={50} y1={50} x2={50} y2={64} stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </View>
            <View style={styles.layer} pointerEvents="none">
              <Svg width={size} height={size} viewBox="0 0 100 100">
                <Path d="M46,1L54,1L50,7Z" fill={colors.text} />
              </Svg>
            </View>
          </View>
        ) : null}

        <Card padded style={styles.info}>
          <Text style={[typography.title, { color: colors.text }]}>{t('compass.bearing', { degrees })}</Text>
          <Text style={[typography.body, { color: colors.textSub }]}>{t('compass.distance', { km })}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>{sourceLine}</Text>
        </Card>
        {granted === false ? (
          <Button label={t('compass.permission')} variant="secondary" onPress={askPermission} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  dial: {
    alignSelf: 'center',
    marginVertical: spacing.xl,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  north: {
    position: 'absolute',
    top: scaled(22),
  },
  info: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
});
