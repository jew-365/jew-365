import React, { useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { BottomSheet, SheetAction } from './BottomSheet';
import { ChoiceRow } from './ChoiceRow';
import { MitzvahIcon } from './MitzvahIcon';
import { SectionLabel } from './SectionLabel';

const SHEET_HEIGHT_SHARE = 0.6;
const CHEVRON_SIZE = scaled(16);
const CHEVRON_STROKE = 2.5;

type Option<T extends string> = { value: T; title: string; caption?: string };

type Props<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  inline?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function OptionSelect<T extends string>({ label, options, value, onChange, inline = false, style }: Props<T>) {
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  if (inline) {
    return (
      <View style={style}>
        <SectionLabel variant="field" text={label} />
        <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
          {options.map((option) => (
            <ChoiceRow
              key={option.value}
              label={option.title}
              caption={option.caption}
              selected={option.value === value}
              onPress={() => onChange(option.value)}
            />
          ))}
        </View>
      </View>
    );
  }

  const openSheet = () => {
    Keyboard.dismiss();
    setOpen(true);
  };
  const choose = (next: T) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <View style={style}>
      <SectionLabel variant="field" text={label} />
      <Pressable
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected.title}`}
        style={[styles.box, { backgroundColor: colors.surface2, borderColor: colors.border }]}
      >
        <View style={styles.text}>
          <Text style={[typography.bodyBold, { color: colors.text }]}>{selected.title}</Text>
          {selected.caption ? (
            <Text style={[typography.small, { color: colors.textSub }]}>{selected.caption}</Text>
          ) : null}
        </View>
        <MitzvahIcon name="chevronDown" size={CHEVRON_SIZE} color={colors.textMuted} strokeWidth={CHEVRON_STROKE} />
      </Pressable>
      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        <ScrollView style={{ maxHeight: windowHeight * SHEET_HEIGHT_SHARE }}>
          {options.map((option) => (
            <SheetAction
              key={option.value}
              label={option.title}
              caption={option.caption}
              selected={option.value === value}
              onPress={() => choose(option.value)}
            />
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  text: {
    flex: 1,
  },
  group: {
    gap: spacing.sm,
  },
});
