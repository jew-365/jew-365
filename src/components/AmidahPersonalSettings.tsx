import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { BottomSheet, SheetAction } from './BottomSheet';
import { Button } from './Button';
import { Card } from './Card';
import { ChipRow } from './ChipRow';
import { MitzvahIcon } from './MitzvahIcon';
import { SectionLabel } from './SectionLabel';
import { SegmentedControl } from './SegmentedControl';
import { useI18n } from '@/i18n';
import { loadPersonalVerses } from '@/services/PersonalVerses';
import { useUserStore } from '@/stores/useUserStore';
import { useTheme } from '@/theme/ThemeProvider';
import { scaled } from '@/theme/scale';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import {
  AMIDAH_PRAYER_MAX,
  AMIDAH_VERSE_MAX,
  HEBREW_LETTERS,
  MAX_AMIDAH_VERSES,
  versesFor,
  versesForName,
  type NameMatch,
  type PersonalVerse,
} from '@/utils/personalPrayer';

const RESULTS_SHARE = 0.4;
const RESULTS_MAX = 150;
const DELETE_SIZE = scaled(18);
const DELETE_HIT = scaled(10);
const INPUT_FONT = scaled(16);
const PRAYER_MIN_HEIGHT = scaled(110);

type SearchMode = 'name' | 'letters';

type Loaded = { state: 'idle' | 'loading' | 'failed' } | { state: 'ready'; verses: PersonalVerse[] };

// Settings, Prayer section: the verses said for one's name before the second "יהיו לרצון" of the Amidah (up to three, one
// per name, found by their first and last letter in Tehillim and in Chok LeYisrael's Tanakh, or typed), and a free
// prayer said there too. The reader shows both in place.
export function AmidahPersonalSettings() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const verses = useUserStore((s) => s.amidahVerses);
  const prayer = useUserStore((s) => s.amidahPrayer);
  const setVerses = useUserStore((s) => s.setAmidahVerses);
  const setPrayer = useUserStore((s) => s.setAmidahPrayer);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<SearchMode>('name');
  const [name, setName] = useState('');
  const [first, setFirst] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [loaded, setLoaded] = useState<Loaded>({ state: 'idle' });
  const [draft, setDraft] = useState(prayer);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => setDraft(prayer), [prayer]);
  // A prayer typed and left without a blur (the section closed) is kept.
  useEffect(() => () => setPrayer(draftRef.current), [setPrayer]);

  useEffect(() => {
    if (!adding || loaded.state !== 'idle') return;
    setLoaded({ state: 'loading' });
    loadPersonalVerses().then(
      (all) => setLoaded({ state: 'ready', verses: all }),
      () => setLoaded({ state: 'failed' }),
    );
  }, [adding, loaded.state]);

  // By name, the verses of its first and last letter, those holding the name first and recommended; by letters, the pair.
  const asked = mode === 'name' ? Boolean(name.trim()) : Boolean(first && last);
  const matches = useMemo((): NameMatch[] => {
    if (loaded.state !== 'ready') return [];
    if (mode === 'name') return versesForName(loaded.verses, name);
    return first && last ? versesFor(loaded.verses, first, last).map((v) => ({ ...v, recommended: false })) : [];
  }, [loaded, mode, name, first, last]);
  const recommended = matches.filter((v) => v.recommended).length;
  const full = verses.length >= MAX_AMIDAH_VERSES;
  const inputTone = { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border };

  const close = () => {
    setAdding(false);
    setTyped('');
  };
  const add = (verse: string) => {
    setVerses([...verses, verse]);
    close();
  };

  return (
    <View>
      <SectionLabel variant="field" text={t('amidahPersonal.verses')} />
      <Text style={[typography.small, styles.note, { color: colors.textMuted }]}>{t('amidahPersonal.versesHint')}</Text>
      {verses.length ? (
        <Card divided style={styles.list}>
          {verses.map((verse, index) => (
            <View key={`${index}-${verse}`} testID={`amidah-verse-${index}`} style={styles.verseRow}>
              <Text style={[typography.body, styles.verseText, { color: colors.text }]}>{verse}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('amidahPersonal.delete')}
                hitSlop={DELETE_HIT}
                onPress={() => setVerses(verses.filter((_, i) => i !== index))}
              >
                <MitzvahIcon name="close" size={DELETE_SIZE} color={colors.textSub} />
              </Pressable>
            </View>
          ))}
        </Card>
      ) : null}
      <Button
        variant="secondary"
        icon="plus"
        label={full ? t('amidahPersonal.full', { max: MAX_AMIDAH_VERSES }) : t('amidahPersonal.add')}
        disabled={full}
        onPress={() => setAdding(true)}
        style={styles.addButton}
      />

      <SectionLabel variant="field" text={t('amidahPersonal.prayer')} style={styles.fieldLabel} />
      <Text style={[typography.small, styles.note, { color: colors.textMuted }]}>{t('amidahPersonal.prayerHint')}</Text>
      <TextInput
        testID="amidah-prayer"
        value={draft}
        onChangeText={setDraft}
        onBlur={() => setPrayer(draft)}
        placeholder={t('amidahPersonal.prayerPlaceholder')}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={t('amidahPersonal.prayer')}
        multiline
        maxLength={AMIDAH_PRAYER_MAX}
        style={[styles.input, styles.prayerInput, inputTone]}
      />

      <BottomSheet
        visible={adding}
        title={t('amidahPersonal.add')}
        caption={t('amidahPersonal.addCaption')}
        onClose={close}
      >
        <ScrollView style={{ maxHeight: height * 0.65 }} keyboardShouldPersistTaps="handled">
          <View accessibilityRole="radiogroup" accessibilityLabel={t('amidahPersonal.searchBy')}>
            <SegmentedControl<SearchMode>
              options={[
                { value: 'name', label: t('amidahPersonal.byName') },
                { value: 'letters', label: t('amidahPersonal.byLetters') },
              ]}
              value={mode}
              onChange={setMode}
            />
          </View>
          {mode === 'name' ? (
            <>
              <SectionLabel variant="field" text={t('amidahPersonal.name')} style={styles.fieldLabel} />
              <TextInput
                testID="amidah-verse-name"
                value={name}
                onChangeText={setName}
                placeholder={t('amidahPersonal.namePlaceholder')}
                placeholderTextColor={colors.textMuted}
                accessibilityLabel={t('amidahPersonal.name')}
                style={[styles.input, inputTone]}
              />
              <Text style={[typography.small, styles.note, { color: colors.textMuted }]}>
                {t('amidahPersonal.nameHint')}
              </Text>
            </>
          ) : (
            <>
              <SectionLabel variant="field" text={t('amidahPersonal.firstLetter')} style={styles.fieldLabel} />
              <ChipRow
                values={HEBREW_LETTERS}
                selected={first}
                onSelect={setFirst}
                renderLabel={(l) => l}
                style={styles.letters}
              />
              <SectionLabel variant="field" text={t('amidahPersonal.lastLetter')} style={styles.fieldLabel} />
              <ChipRow
                values={HEBREW_LETTERS}
                selected={last}
                onSelect={setLast}
                renderLabel={(l) => l}
                style={styles.letters}
              />
            </>
          )}
          <View style={styles.results}>
            {loaded.state === 'loading' ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.gold} />
                <Text style={[typography.small, { color: colors.textSub }]}>{t('amidahPersonal.loading')}</Text>
              </View>
            ) : loaded.state === 'failed' ? (
              <Text style={[typography.small, { color: colors.urgent }]}>{t('amidahPersonal.failed')}</Text>
            ) : !asked ? (
              <Text style={[typography.small, { color: colors.textSub }]}>
                {t(mode === 'name' ? 'amidahPersonal.typeName' : 'amidahPersonal.pickLetters')}
              </Text>
            ) : matches.length ? (
              <>
                <Text style={[typography.captionBold, { color: colors.textSub }]}>
                  {t('amidahPersonal.found', { count: matches.length })}
                  {recommended ? ` · ${t('amidahPersonal.foundRecommended', { count: recommended })}` : ''}
                </Text>
                <ScrollView nestedScrollEnabled style={{ maxHeight: height * RESULTS_SHARE }}>
                  {matches.slice(0, RESULTS_MAX).map((verse) => (
                    <SheetAction
                      key={`${verse.source.he}|${verse.text}`}
                      label={verse.text}
                      caption={
                        verse.recommended ? `${t('amidahPersonal.recommended')} · ${verse.source.he}` : verse.source.he
                      }
                      selected={verse.recommended}
                      onPress={() => add(verse.text)}
                    />
                  ))}
                </ScrollView>
              </>
            ) : (
              <Text style={[typography.small, { color: colors.textSub }]}>{t('amidahPersonal.none')}</Text>
            )}
          </View>
          <SectionLabel variant="field" text={t('amidahPersonal.typed')} style={styles.fieldLabel} />
          <TextInput
            testID="amidah-verse-typed"
            value={typed}
            onChangeText={setTyped}
            placeholder={t('amidahPersonal.typedPlaceholder')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('amidahPersonal.typed')}
            multiline
            maxLength={AMIDAH_VERSE_MAX}
            style={[styles.input, inputTone]}
          />
          <Button
            label={t('amidahPersonal.addTyped')}
            disabled={!typed.trim()}
            onPress={() => add(typed.trim())}
            style={styles.addButton}
          />
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: spacing.xs },
  fieldLabel: { marginTop: spacing.lg },
  list: { marginTop: spacing.md },
  verseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  verseText: { flex: 1 },
  addButton: { marginTop: spacing.md },
  input: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: INPUT_FONT,
  },
  prayerInput: { minHeight: PRAYER_MIN_HEIGHT, textAlignVertical: 'top' },
  letters: { marginTop: spacing.sm },
  results: { marginTop: spacing.lg, gap: spacing.sm },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
