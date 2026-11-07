import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { CITIES, getLocationName } from '@/data/cities';
import { Place, placeCaption, placeLocation, placeName, PlaceIndex, searchPlaces } from '@/data/places';
import { useI18n } from '@/i18n';
import { loadPlaces } from '@/services/PlacesService';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { Location } from '@/types/zmanim';
import { BottomSheet, SheetAction } from './BottomSheet';
import { Card } from './Card';
import { ListRow } from './ListRow';
import { SettingsSearchBox } from './SettingsSearch';

const RESULTS_HEIGHT_SHARE = 0.45;

// Whether the keyboard is up: the sheet then drops its hint and its sources line, so the results keep the
// room left above the keyboard.
function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setShown(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}

const sameLocation = (a: Location, b: Location) =>
  a.placeId !== undefined
    ? a.placeId === b.placeId
    : a.cityId !== undefined
      ? a.cityId === b.cityId
      : a.lat === b.lat && a.lng === b.lng;

// A request from the app search to open the sheet on one place; a new `key` opens it again.
export type PlaceRequest = { placeId: string; key: number };

// The one place picker: a row showing the chosen place, which opens a sheet that searches every
// locality of Israel and every city of the world by name, in Hebrew or English. With an empty query the
// sheet offers the curated cities. A `request` opens the sheet searching that place's name, the place
// first; without `showField` only the sheet is drawn, for a request alone.
export function PlacePicker({
  location,
  onPick,
  request = null,
  showField = true,
  style,
}: {
  location: Location;
  onPick: (location: Location) => void;
  request?: PlaceRequest | null;
  showField?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<PlaceIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [pinned, setPinned] = useState<Place | null>(null);
  const deferredQuery = useDeferredValue(query);
  const keyboardShown = useKeyboardShown();

  useEffect(() => {
    if (!request) return;
    setOpen(true);
    let alive = true;
    loadPlaces().then(
      (loaded) => {
        if (!alive) return;
        setIndex(loaded);
        const place = loaded.places.find((candidate) => candidate.id === request.placeId) ?? null;
        setPinned(place);
        if (place) setQuery(placeName(place, language));
      },
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a request is answered once, in the language of the moment
  }, [request]);

  useEffect(() => {
    if (!open || index) return;
    let alive = true;
    setFailed(false);
    loadPlaces().then(
      (loaded) => alive && setIndex(loaded),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [open, index]);

  const results = useMemo(() => {
    if (!index || !deferredQuery.trim()) return [];
    const found = searchPlaces(index, deferredQuery);
    return pinned && deferredQuery === placeName(pinned, language)
      ? [pinned, ...found.filter((place) => place.id !== pinned.id)]
      : found;
  }, [index, deferredQuery, pinned, language]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setPinned(null);
  };
  const pick = (next: Location) => {
    onPick(next);
    close();
  };
  const searching = query.trim() !== '';

  return (
    <>
      {showField ? (
        <Card style={style}>
          <ListRow
            icon="search"
            title={getLocationName(location, language)}
            caption={t('location.pick.caption')}
            accessibilityLabel={t('location.pick.open', { place: getLocationName(location, language) })}
            onPress={() => setOpen(true)}
            chevron
          />
        </Card>
      ) : null}
      <BottomSheet
        visible={open}
        title={t('location.pick.title')}
        caption={keyboardShown ? undefined : t('location.pick.hint')}
        onClose={close}
      >
        <SettingsSearchBox
          query={query}
          onChangeQuery={setQuery}
          onSubmit={() => {
            if (index && results[0]) pick(placeLocation(results[0]));
          }}
          labelKey="location.pick.search"
          placeholderKey="location.pick.placeholder"
        />
        <ScrollView
          style={[styles.results, { maxHeight: height * RESULTS_HEIGHT_SHARE }]}
          keyboardShouldPersistTaps="handled"
          testID="place-results"
        >
          {searching && failed ? (
            <Text style={[typography.body, styles.note, { color: colors.urgent }]}>{t('location.pick.error')}</Text>
          ) : searching && !index ? (
            <ActivityIndicator color={colors.gold} style={styles.note} />
          ) : searching && index ? (
            results.length ? (
              results.map((place) => {
                const next = placeLocation(place);
                const caption = placeCaption(index, place, language);
                return (
                  <SheetAction
                    key={place.id}
                    label={placeName(place, language)}
                    caption={caption || undefined}
                    selected={sameLocation(next, location)}
                    onPress={() => pick(next)}
                  />
                );
              })
            ) : (
              <Text style={[typography.body, styles.note, { color: colors.textSub }]}>{t('location.pick.none')}</Text>
            )
          ) : (
            <View>
              <Text style={[typography.captionBold, styles.note, { color: colors.textSub }]}>
                {t('location.pick.popular')}
              </Text>
              {CITIES.map((city) => (
                <SheetAction
                  key={city.cityId}
                  label={getLocationName(city, language)}
                  selected={sameLocation(city, location)}
                  onPress={() => pick(city)}
                />
              ))}
            </View>
          )}
        </ScrollView>
        {keyboardShown ? null : (
          <Text style={[typography.micro, styles.credit, { color: colors.textMuted }]}>
            {t('location.pick.credit')}
          </Text>
        )}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  // The one part of the sheet that gives way when the keyboard leaves little room.
  results: {
    flexGrow: 0,
    flexShrink: 1,
  },
  credit: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  note: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
