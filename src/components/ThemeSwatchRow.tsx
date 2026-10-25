import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { THEMES, THEME_NAMES, ThemeName } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

type Props = {
  selected: ThemeName;
  onSelect: (name: ThemeName) => void;
  labelFor: (name: ThemeName) => string;
};

export function ThemeSwatchRow({ selected, onSelect, labelFor }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {THEME_NAMES.map((name) => {
        const palette = THEMES[name];
        const active = name === selected;
        return (
          <Pressable
            key={name}
            onPress={() => onSelect(name)}
            hitSlop={4}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, checked: active }}
            accessibilityLabel={labelFor(name)}
            style={styles.item}
          >
            <View style={[styles.ring, { borderColor: active ? colors.gold : colors.border }]}>
              <View style={[styles.swatch, { backgroundColor: palette.bg }]}>
                <View style={[styles.surface, { backgroundColor: palette.surface }]}>
                  <View style={[styles.dot, { backgroundColor: palette.gold }]} />
                </View>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  item: {
    padding: 1,
  },
  ring: {
    width: 40,
    height: 40,
    borderRadius: radius.xl,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 31,
    height: 31,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: {
    width: 23,
    height: 23,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 15,
    height: 15,
    borderRadius: radius.sm,
  },
});
