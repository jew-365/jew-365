import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useCountUp, useEntrance } from '@/hooks/useMotion';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { motion } from '@/theme/tokens';
import { fontFamilies, typography } from '@/theme/typography';
import { streakGoalProgress } from '@/utils/streakGoal';
import { useI18n } from '@/i18n';

type Common = { size?: number; animate?: boolean; delay?: number; playKey?: unknown };
type Props = Common &
  ({ streak: number; percent?: undefined } | { percent: { done: number; total: number }; streak?: undefined });

const DISC_OPACITY = 0.72;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type BodyProps = {
  size: number;
  stroke: number;
  fraction: number;
  progress: SharedValue<number>;
  main: number;
  initialMain: number;
  initialSecond: number;
  suffix: string;
  second: number | null;
  secondSuffix: string;
  mainFont: { size: number; line: number };
  caption: React.ReactNode;
  label: string;
  emptyText?: string;
};

function RingBody({
  size,
  stroke,
  fraction,
  progress,
  main,
  initialMain,
  initialSecond,
  suffix,
  second,
  secondSuffix,
  mainFont,
  caption,
  label,
  emptyText,
}: BodyProps) {
  const { colors } = useTheme();
  const center = size / 2;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fraction * progress.value),
  }));
  const mainValue = useCountUp(progress, main, initialMain);
  const secondValue = useCountUp(progress, second ?? 0, initialSecond);
  return (
    <View accessible accessibilityLabel={label} style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={center} cy={center} r={r} fill={colors.surface} fillOpacity={DISC_OPACITY} />
        <Circle cx={center} cy={center} r={r} fill="none" stroke={colors.surface2} strokeWidth={stroke} />
        {fraction > 0 ? (
          <AnimatedCircle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={colors.gold}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - fraction)}
            animatedProps={arcProps}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null}
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.number, { fontSize: mainFont.size, lineHeight: mainFont.line, color: colors.text }]}>
          {emptyText ?? `${mainValue}${suffix}`}
        </Text>
        {caption ??
          (second === null ? null : (
            <Text style={[typography.small, { color: colors.textSub }]}>{`${secondValue}${secondSuffix}`}</Text>
          ))}
      </View>
    </View>
  );
}

function StreakBody({
  streak,
  size,
  animate,
  delay,
  playKey,
}: Required<Pick<Common, 'size'>> & Common & { streak: number }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const days = Math.max(0, Math.floor(streak));
  const one = days === 1;
  const entrance = useEntrance(delay ?? 0, motion.streakRingMs, animate, playKey);
  const fixed = useSharedValue(1);
  return (
    <RingBody
      size={size}
      stroke={Math.round(size * 0.055)}
      fraction={streakGoalProgress(days)}
      progress={animate ? entrance : fixed}
      main={days}
      initialMain={animate ? 0 : days}
      initialSecond={0}
      suffix=""
      second={null}
      secondSuffix=""
      mainFont={{ size: Math.round(size * 0.29), line: Math.round(size * 0.33) }}
      caption={
        <Text style={[typography.heading, { color: colors.text }]}>
          {t(one ? 'history.streakDays.once' : 'history.streakDays')}
        </Text>
      }
      label={t(one ? 'history.streak.once' : 'history.streak', { count: days })}
    />
  );
}

function PercentBody({
  percent,
  size,
  animate,
  delay,
  playKey,
}: Required<Pick<Common, 'size'>> & Common & { percent: { done: number; total: number } }) {
  const { t } = useI18n();
  const { done, total } = percent;
  const entrance = useEntrance(delay ?? 0, motion.periodRingMs, animate, playKey);
  const fixed = useSharedValue(1);
  const value = total <= 0 ? 0 : done >= total ? 100 : Math.min(99, Math.round((done / total) * 100));
  const mainFont = { size: Math.round(size * 0.26), line: Math.round(size * 0.3) };
  const stroke = Math.round(size * 0.075);
  if (total <= 0) {
    return (
      <RingBody
        size={size}
        stroke={stroke}
        fraction={0}
        progress={fixed}
        main={0}
        initialMain={0}
        initialSecond={0}
        suffix=""
        second={null}
        secondSuffix=""
        mainFont={mainFont}
        caption={null}
        label={t('history.ring.empty')}
        emptyText={t('history.percentNone')}
      />
    );
  }
  return (
    <RingBody
      size={size}
      stroke={stroke}
      fraction={Math.min(1, done / total)}
      progress={animate ? entrance : fixed}
      main={value}
      initialMain={animate ? 0 : value}
      initialSecond={animate ? 0 : done}
      suffix="%"
      second={done}
      secondSuffix={`/${total}`}
      mainFont={mainFont}
      caption={null}
      label={t('history.ring.percentLabel', { percent: value, done, total })}
    />
  );
}

export function StreakRing(props: Props) {
  const { size = scaled(220), animate = false, delay, playKey } = props;
  if (props.percent) {
    return <PercentBody percent={props.percent} size={size} animate={animate} delay={delay} playKey={playKey} />;
  }
  return <StreakBody streak={props.streak} size={size} animate={animate} delay={delay} playKey={playKey} />;
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontFamily: fontFamilies.heebo.black,
  },
});
