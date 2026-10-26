import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { PickerCard } from '@/components/PickerCard';
import { SectionLabel } from '@/components/SectionLabel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { CHOK_BOOKS, CHOK_PARASHIYOT } from '@/data/chok';
import { scaled } from '@/theme/scale';
import { spacing } from '@/theme/tokens';
import { useI18n } from '@/i18n';
import { ChokDoubleChoice, ChokSlot } from '@/types/chok';
import { chokChosen, chokParashaName, chokWeekName } from '@/utils/chok';

type Props = {
  week: readonly string[];
  browsing: string | null;
  onBrowse: (parasha: string | null) => void;
  offered: readonly string[];
  slots: readonly ChokSlot[];
  slot: ChokSlot;
  onSlot: (slot: ChokSlot) => void;
  names: readonly string[];
  choice: ChokDoubleChoice;
  onChoice: (choice: ChokDoubleChoice) => void;
  asking: boolean;
  onAskClose: () => void;
};

const CHOICES: readonly ChokDoubleChoice[] = ['first', 'second', 'both'];
const BODY_HEIGHT_SHARE = 0.65;
const SELECTED_LEAD = scaled(96);

export function ChokWeekControls({
  week,
  browsing,
  onBrowse,
  offered,
  slots,
  slot,
  onSlot,
  names,
  choice,
  onChoice,
  asking,
  onAskClose,
}: Props) {
  const { language, t } = useI18n();
  const { height: windowHeight } = useWindowDimensions();
  const [picking, setPicking] = useState(false);
  const listRef = useRef<ScrollView>(null);
  const double = names.length > 1;
  const choiceLabel = (value: ChokDoubleChoice) =>
    value === 'both' ? t('chok.both') : names[value === 'first' ? 0 : 1];
  const title = browsing
    ? t('chok.parashaOf', { name: chokParashaName(browsing, language) })
    : t('chok.parashaPicker.current', { name: chokWeekName(week, language) });
  const shown = chokChosen(week, choice);
  const isSelected = (parasha: string) => (browsing === null ? shown.includes(parasha) : browsing === parasha);
  const firstSelected = CHOK_PARASHIYOT.find((parasha) => offered.includes(parasha) && isSelected(parasha));
  const choose = (parasha: string) => {
    setPicking(false);
    onBrowse(shown.includes(parasha) ? null : parasha);
  };
  return (
    <View style={styles.rows}>
      <PickerCard
        title={title}
        accessibilityLabel={`${t('chok.parashaPicker')}: ${title}`}
        onPress={() => setPicking(true)}
      />
      <View accessibilityRole="radiogroup" accessibilityLabel={t('chok.slotPicker')}>
        <SegmentedControl
          options={slots.map((value) => ({
            value,
            label: t(`chok.slotShort.${value}`),
            accessibilityLabel: t(`chok.slot.${value}`),
          }))}
          value={slot}
          onChange={onSlot}
        />
      </View>
      {double ? (
        <View accessibilityRole="radiogroup" accessibilityLabel={t('chok.doubleWeek')}>
          <SegmentedControl
            options={CHOICES.map((value) => ({ value, label: choiceLabel(value) }))}
            value={choice}
            onChange={onChoice}
          />
        </View>
      ) : null}
      <BottomSheet visible={picking} title={t('chok.parashaPicker')} onClose={() => setPicking(false)}>
        <ScrollView ref={listRef} style={{ maxHeight: windowHeight * BODY_HEIGHT_SHARE }}>
          {CHOK_BOOKS.flatMap((book) => {
            const parashiyot = book.parashiyot.filter((parasha) => offered.includes(parasha));
            if (!parashiyot.length) return [];
            return [
              <SectionLabel key={book.key} text={t(`chok.book.${book.key}`)} />,
              ...parashiyot.map((parasha) => {
                const name = chokParashaName(parasha, language);
                return (
                  <SheetAction
                    key={parasha}
                    label={week.includes(parasha) ? t('chok.parashaPicker.thisWeek', { name }) : name}
                    selected={isSelected(parasha)}
                    onLayout={
                      parasha === firstSelected
                        ? (event) =>
                            listRef.current?.scrollTo({
                              y: Math.max(0, event.nativeEvent.layout.y - SELECTED_LEAD),
                              animated: false,
                            })
                        : undefined
                    }
                    onPress={() => choose(parasha)}
                  />
                );
              }),
            ];
          })}
        </ScrollView>
      </BottomSheet>
      {double ? (
        <BottomSheet visible={asking} title={t('chok.askTitle')} caption={t('chok.askCaption')} onClose={onAskClose}>
          <SheetAction label={t('chok.onlyParasha', { name: names[0] })} onPress={() => onChoice('first')} />
          <SheetAction label={t('chok.onlyParasha', { name: names[1] })} onPress={() => onChoice('second')} />
          <SheetAction label={t('chok.bothParashiyot')} onPress={() => onChoice('both')} />
        </BottomSheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: {
    gap: spacing.sm,
  },
});
