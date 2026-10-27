import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { appVersionLabel } from '@/services/appUpdates';
import { LocationService } from '@/services/LocationService';
import {
  NotificationScheduler,
  requestNotificationPermissions,
  syncNotificationPermissionStatus,
} from '@/services/NotificationScheduler';
import { AppResetService } from '@/services/AppResetService';
import {
  backupDateLabel,
  backupFailureKey,
  exportBackup,
  pickBackup,
  restoreBackup,
  type Backup,
} from '@/services/BackupService';
import {
  CONTACT_EMAIL,
  CONTACT_MESSAGE_MAX,
  contactFailureKey,
  contactMailUrl,
  contactProblem,
  dataDeletionUrl,
  isContactConfigured,
  PRODUCT_LINKS,
  sendContactMessage,
  storePageUrl,
} from '@/services/ContactService';
import { reportError } from '@/services/errors';
import { reloadApp } from '@/services/appReload';
import { openBatteryOptimizationSettings, supportsBatteryOptimizationSettings } from '@/services/deviceSettings';
import {
  chooseGender,
  chooseMaritalStatus,
  chooseNusach,
  setTaharahTracking,
  taharahOffered,
} from '@/stores/taharahOptIn';
import { useMitzvotStore, type ActiveMitzvahState } from '@/stores/useMitzvotStore';
import { useUserStore, type Gender, type PrayerMode } from '@/stores/useUserStore';
import { useShallow } from 'zustand/react/shallow';
import { BRAND } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipRow } from '@/components/ChipRow';
import { ChokCreditSheet } from '@/components/ChokLicenseNotice';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListRow } from '@/components/ListRow';
import { MitzvahIcon, type IconName } from '@/components/MitzvahIcon';
import { NavBar } from '@/components/NavBar';
import { SectionLabel } from '@/components/SectionLabel';
import { ThemeSwatchRow } from '@/components/ThemeSwatchRow';
import { SettingsSearchBox, SettingsSearchResults, useSettingsSearch } from '@/components/SettingsSearch';
import { SettingsSection } from '@/components/SettingsSection';
import { ScrollSpeedStepper } from '@/components/ScrollSpeedStepper';
import { UI_SCALES, rescaled, scaled } from '@/theme/scale';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useI18n } from '@/i18n';
import { CITIES, cityOf, getLocationName } from '@/data/cities';
import type { ChokThuNightDay } from '@/types/chok';
import { findMitzvah } from '@/data/mitzvot';
import { Nusach } from '@/types/mitzvah';
import type { SiddurVoice } from '@/types/siddur';
import { SETTINGS_SEARCH_ITEMS, type SettingsSearchItem, type SettingsSectionKey } from '@/utils/settingsSearch';

const NUSACHAOT: Nusach[] = ['ashkenaz', 'sefard', 'edot_hamizrach', 'chabad'];
const LANGS = ['he', 'en'] as const;
const OPINIONS = ['GRA', 'MA'] as const;
const GENDERS = ['male', 'female'] as const;
const MARITAL_STATUSES = ['married', 'single'] as const;
const PRAYER_MODES: readonly PrayerMode[] = ['minyan', 'alone'];
const SIDDUR_VOICES: readonly SiddurVoice[] = ['male', 'female'];
const CHOK_THU_NIGHT_DAYS: readonly ChokThuNightDay[] = ['thu', 'fri'];
const CITY_INDEXES = CITIES.map((_, index) => index);

const FOCUS_HIGHLIGHT_MS = 2500;

// Returns a number, so the subscription re-renders only when the count itself changes. A registry
// mitzvah the nusach does not offer (Ushpizin for Chabad) is not counted, as the library does not show it.
const selectEnabledCount =
  (nusach: Nusach) =>
  (state: { activeMitzvot: Record<string, ActiveMitzvahState> }): number =>
    Object.entries(state.activeMitzvot).filter(
      ([id, active]) => active.enabled && (findMitzvah(id)?.nuschaotSupported.includes(nusach) ?? true),
    ).length;

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  // One shallow slice: subscribing to the whole store re-rendered every section on each permission
  // sync, font-size tap or scroll-speed step.
  const user = useUserStore(
    useShallow((s) => ({
      profileName: s.profileName,
      profilePhone: s.profilePhone,
      gender: s.gender,
      maritalStatus: s.maritalStatus,
      notificationsEnabled: s.notificationsEnabled,
      notificationPermission: s.notificationPermission,
      nusach: s.nusach,
      siddurAutoScroll: s.siddurAutoScroll,
      siddurScrollSpeed: s.siddurScrollSpeed,
      prayerMode: s.prayerMode,
      siddurVoice: s.siddurVoice,
      chokCommentaryOpen: s.chokCommentaryOpen,
      chokThuNightDay: s.chokThuNightDay,
      taharahEnabled: s.taharahEnabled,
      weeklyReportEnabled: s.weeklyReportEnabled,
      location: s.location,
      inIsrael: s.inIsrael,
      locationStatus: s.locationStatus,
      theme: s.theme,
      uiScale: s.uiScale,
      language: s.language,
      halachicOpinions: s.halachicOpinions,
      setLocationState: s.setLocationState,
      setLocationStatus: s.setLocationStatus,
      setNotificationsEnabled: s.setNotificationsEnabled,
      setProfileName: s.setProfileName,
      setProfilePhone: s.setProfilePhone,
      setSiddurAutoScroll: s.setSiddurAutoScroll,
      setSiddurScrollSpeed: s.setSiddurScrollSpeed,
      setPrayerMode: s.setPrayerMode,
      setSiddurVoice: s.setSiddurVoice,
      setChokCommentaryOpen: s.setChokCommentaryOpen,
      setChokThuNightDay: s.setChokThuNightDay,
      setWeeklyReportEnabled: s.setWeeklyReportEnabled,
      setTheme: s.setTheme,
      setUiScale: s.setUiScale,
      setLanguage: s.setLanguage,
      setKsOpinion: s.setKsOpinion,
    })),
  );
  const enabledMitzvotCount = useMitzvotStore(selectEnabledCount(user.nusach));
  const savedCityId = cityOf(user.location)?.cityId;
  // Held locally and committed on blur. Bound straight to the store, every keystroke serialised
  // the whole user store to MMKV and re-rendered the entire settings tree.
  const [nameDraft, setNameDraft] = useState(user.profileName);
  const [phoneDraft, setPhoneDraft] = useState(user.profilePhone);
  const [statusText, setStatusText] = useState('');
  const [resetVisible, setResetVisible] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<Backup | null>(null);
  const [backupStatus, setBackupStatus] = useState<{ text: string; failed: boolean } | null>(null);
  const [contactName, setContactName] = useState(user.profileName);
  const [contactPhone, setContactPhone] = useState(user.profilePhone);
  const [contactMessage, setContactMessage] = useState('');
  const [contactBusy, setContactBusy] = useState(false);
  const [contactStatus, setContactStatus] = useState<{ text: string; failed: boolean } | null>(null);
  const [open, setOpen] = useState<ReadonlySet<SettingsSectionKey>>(() => new Set());
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const [creditOpen, setCreditOpen] = useState(false);
  const focusCount = useRef(0);
  const { query, setQuery, searching, results, tiers, pending } = useSettingsSearch(focusCount.current);
  const params = useLocalSearchParams<{ focus?: string }>();
  const focusParam = useRef<string | undefined>(undefined);
  const routerRef = useRef(router);
  routerRef.current = router;
  focusParam.current = typeof params.focus === 'string' ? params.focus : undefined;
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const seedContactRef = useRef<() => void>(() => {});

  useFocusEffect(
    useCallback(() => {
      setOpen(new Set());
      setQuery('');
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      focusCount.current += 1;
      setFocusTarget(null);
      // The More tab's search sends a setting here as `focus`: open its section and land on it.
      const target = focusParam.current;
      const section = target ? SETTINGS_SEARCH_ITEMS.find((item) => item.id === target)?.section : undefined;
      if (target) {
        if (section) setOpen(new Set([section]));
        if (section === 'contact') seedContactRef.current();
        setFocusTarget(target);
        routerRef.current.setParams({ focus: undefined });
      }
      syncNotificationPermissionStatus().catch((error) => reportError('schedule', error));
    }, [setQuery]),
  );

  useEffect(() => {
    if (!focusTarget) return;
    const timer = setTimeout(() => setFocusTarget(null), FOCUS_HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [focusTarget]);

  const taharahVisible = taharahOffered(user);
  const storeUrl = storePageUrl();
  const commitProfileDrafts = () => {
    user.setProfileName(nameDraft.trim());
    user.setProfilePhone(phoneDraft.trim());
  };

  const seedContact = () => {
    setContactName((current) => current.trim() || nameDraft.trim());
    setContactPhone((current) => current.trim() || phoneDraft.trim());
    setContactStatus(null);
  };
  seedContactRef.current = seedContact;

  const openSection = (key: SettingsSectionKey) => {
    if (open.has(key)) return;
    if (key === 'contact') seedContact();
    setOpen((current) => new Set(current).add(key));
  };

  const toggle = (key: SettingsSectionKey) => {
    if (!open.has(key)) {
      openSection(key);
      return;
    }
    if (key === 'profile') commitProfileDrafts();
    setOpen((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  };

  const changeQuery = (next: string) => {
    if (!searching && next.trim()) commitProfileDrafts();
    setQuery(next);
  };

  const chooseResult = (item: SettingsSearchItem) => {
    Keyboard.dismiss();
    setQuery('');
    if (item.kind) {
      router.push(item.href);
      return;
    }
    if (item.route) {
      router.push(item.route);
      return;
    }
    if (item.section) {
      openSection(item.section);
      setFocusTarget(item.id);
    }
  };

  const reveal = useCallback((target: View) => {
    const content = contentRef.current;
    if (!content) return;
    target.measureLayout(
      content,
      (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.xl), animated: true }),
      () => {},
    );
  }, []);

  const anchor = (id: string) => ({ id, focus: focusTarget, onReveal: reveal });

  const collapsible = (key: SettingsSectionKey) => ({
    collapsible: true,
    expanded: open.has(key),
    onToggle: () => toggle(key),
  });

  const performReset = async () => {
    setResetting(true);
    try {
      await AppResetService.reset();
      setResetVisible(false);
      router.replace('/onboarding');
    } finally {
      setResetting(false);
    }
  };

  const runBackupStep = async (step: () => Promise<void>) => {
    if (backupBusy) return;
    setBackupBusy(true);
    setBackupStatus(null);
    try {
      await step();
    } catch (error) {
      setPendingBackup(null);
      setBackupStatus({ text: t(backupFailureKey(error)), failed: true });
    } finally {
      setBackupBusy(false);
    }
  };

  const exportBackupFile = () =>
    runBackupStep(async () => {
      commitProfileDrafts();
      await exportBackup();
    });

  const chooseBackupFile = () =>
    runBackupStep(async () => {
      setPendingBackup(await pickBackup());
    });

  const confirmRestore = () =>
    runBackupStep(async () => {
      if (!pendingBackup) return;
      await restoreBackup(pendingBackup);
      const restored = useUserStore.getState();
      setNameDraft(restored.profileName);
      setPhoneDraft(restored.profilePhone);
      setPendingBackup(null);
      setBackupStatus({ text: t('settings.backupRestored'), failed: false });
    });

  const submitContact = async () => {
    if (contactBusy) return;
    const input = { name: contactName, phone: contactPhone, message: contactMessage };
    const problem = contactProblem(input);
    if (problem) {
      setContactStatus({
        text: t(problem === 'missing' ? 'settings.contactMissing' : 'settings.contactPhoneInvalid'),
        failed: true,
      });
      return;
    }
    setContactBusy(true);
    setContactStatus(null);
    try {
      await sendContactMessage(input, language);
      setContactMessage('');
      setContactStatus({ text: t('settings.contactSent'), failed: false });
    } catch (error) {
      setContactStatus({ text: t(contactFailureKey(error)), failed: true });
    } finally {
      setContactBusy(false);
    }
  };

  const [locating, setLocating] = useState(false);

  const refreshLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const resolved = await LocationService.getCurrentLocation();
      // Only commit a location the lookup actually produced. A failed refresh must keep the city
      // the user chose, not silently move them to the default.
      if (resolved.location) {
        user.setLocationState(resolved.location, resolved.status, resolved.source);
      } else {
        user.setLocationStatus(resolved.status);
      }
      setStatusText(resolved.location ? t('settings.gpsUpdated') : t('settings.gpsFallback'));
    } finally {
      setLocating(false);
    }
  };

  const openOsSettings = () => {
    Linking.openSettings().catch(() => {});
  };

  const onToggleNotifications = async (next: boolean) => {
    if (next) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        user.setNotificationsEnabled(false);
        openOsSettings();
        return;
      }
      user.setNotificationsEnabled(true);
      NotificationScheduler.rebuild().catch((error) => reportError('schedule', error));
    } else {
      user.setNotificationsEnabled(false);
      NotificationScheduler.cancelAll().catch((error) => reportError('schedule', error));
    }
  };

  const permGranted = user.notificationPermission === 'granted';
  const notifActive = user.notificationsEnabled && permGranted;
  const subHeadingTone = { color: colors.goldText, borderTopColor: colors.border };
  const inputTone = {
    backgroundColor: colors.surface2,
    color: colors.text,
    borderColor: colors.border,
    writingDirection: language === 'he' ? ('rtl' as const) : ('ltr' as const),
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar title={t('settings.title')} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View ref={contentRef}>
          <SettingsSearchBox
            query={query}
            onChangeQuery={changeQuery}
            onSubmit={() => {
              if (results[0]) chooseResult(results[0]);
            }}
          />

          {searching ? (
            <SettingsSearchResults query={query} tiers={tiers} pending={pending} onChoose={chooseResult} />
          ) : (
            <>
              <Card style={styles.mitzvotGap}>
                <ListRow
                  icon="star"
                  title={t('settings.mitzvot')}
                  caption={t('settings.mitzvotCaption', { count: enabledMitzvotCount })}
                  onPress={() => router.push('/mitzvot')}
                  chevron
                />
              </Card>

              <SettingsSection
                title={t('settings.profile')}
                subtitle={t(taharahVisible ? 'settings.profileSummaryTaharah' : 'settings.profileSummary')}
                icon="user"
                {...collapsible('profile')}
              >
                <Anchor {...anchor('profileName')}>
                  <SectionLabel variant="field" text={t('settings.profileName')} />
                  <TextInput
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    onBlur={commitProfileDrafts}
                    placeholder={t('settings.profileNamePlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, inputTone]}
                    autoCapitalize="words"
                  />
                </Anchor>
                <Anchor {...anchor('profilePhone')}>
                  <SectionLabel variant="field" text={t('settings.profilePhone')} style={styles.fieldLabel} />
                  <TextInput
                    value={phoneDraft}
                    onChangeText={setPhoneDraft}
                    onBlur={commitProfileDrafts}
                    placeholder={t('settings.profilePhonePlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    style={[styles.input, inputTone]}
                  />
                </Anchor>
                <Anchor {...anchor('gender')}>
                  <SectionLabel variant="field" text={t('profile.gender')} style={styles.fieldLabel} />
                  <ChipRow
                    values={GENDERS}
                    selected={user.gender}
                    onSelect={chooseGender}
                    renderLabel={(value) => t(`profile.gender.${value}`)}
                  />
                </Anchor>
                <Anchor {...anchor('maritalStatus')}>
                  <SectionLabel variant="field" text={t('profile.maritalStatus')} style={styles.fieldLabel} />
                  <ChipRow
                    values={MARITAL_STATUSES}
                    selected={user.maritalStatus}
                    onSelect={chooseMaritalStatus}
                    renderLabel={(value) => t(`profile.maritalStatus.${value}.${user.gender ?? 'neutral'}`)}
                  />
                </Anchor>
                {taharahVisible ? (
                  <Anchor {...anchor('taharah')}>
                    <TaharahBlock
                      enabled={user.taharahEnabled}
                      gender={user.gender}
                      onOpen={() => router.push('/taharah/settings')}
                    />
                  </Anchor>
                ) : null}
              </SettingsSection>

              <SettingsSection
                title={t('settings.prayer')}
                subtitle={t('settings.prayerSummary')}
                icon="siddur"
                {...collapsible('prayer')}
              >
                <Anchor {...anchor('nusach')}>
                  <SectionLabel variant="field" text={t('settings.nusach')} />
                  <ChipRow
                    values={NUSACHAOT}
                    selected={user.nusach}
                    onSelect={chooseNusach}
                    renderLabel={(value) => t(`nusach.${value}`)}
                  />
                </Anchor>
                <Anchor {...anchor('opinion')}>
                  <SectionLabel variant="field" text={t('settings.opinion')} style={styles.fieldLabel} />
                  <ChipRow
                    values={OPINIONS}
                    selected={user.halachicOpinions.ksSofZman}
                    onSelect={(value) => user.setKsOpinion(value)}
                    renderLabel={(value) => t(`settings.opinion.${value}`)}
                  />
                </Anchor>
                <Anchor {...anchor('prayerMode')}>
                  <SectionLabel variant="field" text={t('settings.prayerMode')} style={styles.fieldLabel} />
                  <ChipRow
                    values={PRAYER_MODES}
                    selected={user.prayerMode}
                    onSelect={user.setPrayerMode}
                    renderLabel={(value) => t(`prayerMode.${value}`)}
                  />
                  <Text style={[typography.small, styles.note, { color: colors.textMuted }]}>
                    {t('settings.prayerModeHint')}
                  </Text>
                </Anchor>
                <Anchor {...anchor('siddurVoice')}>
                  <SectionLabel variant="field" text={t('settings.siddurVoice')} style={styles.fieldLabel} />
                  <ChipRow
                    values={SIDDUR_VOICES}
                    selected={user.siddurVoice}
                    onSelect={user.setSiddurVoice}
                    renderLabel={(value) => t(`settings.siddurVoice.${value}`)}
                  />
                </Anchor>
                <Anchor {...anchor('reading')}>
                  <SectionLabel variant="field" text={t('settings.reading')} style={styles.fieldLabel} />
                  <SwitchRow
                    label={t('settings.autoScroll')}
                    hint={t('settings.autoScrollHint')}
                    value={user.siddurAutoScroll}
                    onValueChange={user.setSiddurAutoScroll}
                  />
                  <View style={[styles.row, styles.speedRow]}>
                    <Text style={[typography.bodyBold, { color: colors.text }]}>{t('settings.autoScrollSpeed')}</Text>
                    <ScrollSpeedStepper level={user.siddurScrollSpeed} onChange={user.setSiddurScrollSpeed} />
                  </View>
                </Anchor>
                <Anchor {...anchor('chokCommentary')}>
                  <SwitchRow
                    label={t('settings.chokCommentaryOpen')}
                    hint={t('settings.chokCommentaryOpenHint')}
                    value={user.chokCommentaryOpen}
                    onValueChange={user.setChokCommentaryOpen}
                    style={styles.groupGap}
                  />
                </Anchor>
                <Anchor {...anchor('chokThuNightDay')}>
                  <SectionLabel variant="field" text={t('settings.chokThuNightDay')} style={styles.fieldLabel} />
                  <ChipRow
                    values={CHOK_THU_NIGHT_DAYS}
                    selected={user.chokThuNightDay}
                    onSelect={user.setChokThuNightDay}
                    renderLabel={(value) => t(`chok.thuNight.${value}`)}
                  />
                </Anchor>
              </SettingsSection>

              <SettingsSection
                title={t('settings.device')}
                subtitle={t(taharahVisible ? 'settings.deviceSummaryTaharah' : 'settings.deviceSummary')}
                icon="bell"
                {...collapsible('device')}
              >
                <Anchor {...anchor('location')}>
                  <SectionLabel
                    text={t('settings.zmanim')}
                    style={[styles.subHeading, styles.firstSubHeading, subHeadingTone]}
                  />
                  <Text style={[typography.bodyBold, { color: colors.text }]}>
                    {getLocationName(user.location, language)}
                  </Text>
                  <Text style={[typography.small, styles.hint, { color: colors.textMuted }]}>
                    {t(`settings.locationStatus.${user.locationStatus}`)}
                  </Text>
                  <Button label={t('settings.useCurrentLocation')} onPress={refreshLocation} style={styles.buttonGap} />
                  {statusText ? (
                    <Text style={[typography.small, styles.note, { color: colors.textMuted }]}>{statusText}</Text>
                  ) : null}
                  <SectionLabel variant="field" text={t('settings.pickCity')} style={styles.fieldLabel} />
                  <ChipRow
                    values={CITY_INDEXES}
                    selected={CITIES.findIndex((city) => city.cityId === savedCityId)}
                    onSelect={(index) => user.setLocationState(CITIES[index], 'ready', 'manual')}
                    renderLabel={(index) => getLocationName(CITIES[index], language)}
                  />
                </Anchor>

                <SectionLabel text={t('settings.notifications')} style={[styles.subHeading, subHeadingTone]} />
                <Anchor {...anchor('notifications')}>
                  <SwitchRow
                    label={t('settings.notificationsToggle')}
                    hint={
                      notifActive
                        ? t('settings.notificationsActiveHint')
                        : user.notificationsEnabled && !permGranted
                          ? t('settings.notificationsBlockedHint')
                          : t('settings.notificationsOffHint')
                    }
                    value={user.notificationsEnabled}
                    onValueChange={onToggleNotifications}
                  />
                </Anchor>
                <Anchor {...anchor('weeklyReport')}>
                  <SwitchRow
                    label={t('settings.weeklyReport')}
                    hint={t('settings.weeklyReportHint')}
                    value={user.weeklyReportEnabled}
                    onValueChange={user.setWeeklyReportEnabled}
                    style={styles.groupGap}
                  />
                </Anchor>
                <Anchor {...anchor('permission')}>
                  <Row
                    label={t('settings.notificationsOsStatus')}
                    value={permGranted ? t('settings.notificationsGranted') : t('settings.notificationsDenied')}
                  />
                  {!permGranted ? (
                    <Button label={t('settings.openOsSettings')} onPress={openOsSettings} style={styles.buttonGap} />
                  ) : null}
                </Anchor>
                {/* Exact alarms are declared in the manifest, but OEM battery managers can still defer
                    them. Exempting the app is the one part only the user can do. */}
                {supportsBatteryOptimizationSettings() ? (
                  <Anchor {...anchor('battery')}>
                    <Text style={[typography.small, styles.groupGap, { color: colors.textMuted }]}>
                      {t('settings.batteryHint')}
                    </Text>
                    <Button
                      label={t('settings.batteryAction')}
                      onPress={() => openBatteryOptimizationSettings()}
                      style={styles.buttonGap}
                    />
                  </Anchor>
                ) : null}
                <Text style={[typography.small, styles.note, { color: colors.textMuted }]}>
                  {Platform.OS === 'ios' ? t('settings.iosHint') : t('settings.androidHint')}
                </Text>
                {taharahVisible ? (
                  <Anchor {...anchor('taharahDevice')}>
                    <TaharahBlock
                      enabled={user.taharahEnabled}
                      gender={user.gender}
                      onOpen={() => router.push('/taharah/settings')}
                    />
                  </Anchor>
                ) : null}

                <SectionLabel text={t('settings.display')} style={[styles.subHeading, subHeadingTone]} />
                <Anchor {...anchor('theme')}>
                  <SectionLabel variant="field" text={t('settings.theme')} />
                  <ThemeSwatchRow
                    selected={user.theme}
                    onSelect={(value) => user.setTheme(value)}
                    labelFor={(value) => t(`settings.theme.${value}`)}
                  />
                </Anchor>
                <Anchor {...anchor('uiScale')}>
                  <DisplaySizeBlock stored={user.uiScale} onApply={user.setUiScale} />
                </Anchor>
                <Anchor {...anchor('language')}>
                  <SectionLabel variant="field" text={t('settings.language')} style={styles.fieldLabel} />
                  <ChipRow
                    values={LANGS}
                    selected={user.language}
                    onSelect={(value) => user.setLanguage(value)}
                    renderLabel={(value) => t(`settings.language.${value}`)}
                  />
                </Anchor>
              </SettingsSection>

              <SettingsSection
                title={t('settings.backup')}
                subtitle={t(Platform.OS !== 'web' ? 'settings.backupSummary' : 'settings.backupSummaryWeb')}
                icon="cloud"
                {...collapsible('backup')}
              >
                {Platform.OS !== 'web' ? (
                  <View style={styles.backupFiles}>
                    <Text style={[typography.small, { color: colors.textMuted }]}>
                      {t(Platform.OS === 'ios' ? 'settings.backupHint.ios' : 'settings.backupHint.android')}
                    </Text>
                    {user.taharahEnabled ? (
                      <Text style={[typography.small, styles.note, { color: colors.textMuted }]}>
                        {t('settings.backupTaharah')}
                      </Text>
                    ) : null}
                    <Anchor {...anchor('backupExport')}>
                      <Button label={t('settings.backupExport')} onPress={exportBackupFile} style={styles.buttonGap} />
                    </Anchor>
                    <Anchor {...anchor('backupImport')}>
                      <Button label={t('settings.backupImport')} onPress={chooseBackupFile} style={styles.buttonGap} />
                    </Anchor>
                    {backupStatus ? (
                      <Text
                        accessibilityLiveRegion="polite"
                        style={[
                          typography.small,
                          styles.note,
                          { color: backupStatus.failed ? colors.urgent : colors.textMuted },
                        ]}
                      >
                        {backupStatus.text}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                <Anchor {...anchor('reset')}>
                  <Button variant="danger" label={t('settings.logout')} onPress={() => setResetVisible(true)} />
                  <Pressable
                    onPress={() => openLink(dataDeletionUrl(language))}
                    accessibilityRole="link"
                    style={[styles.link, styles.buttonGap]}
                  >
                    <Text style={[typography.bodyBold, { color: colors.goldText }]}>{t('settings.deleteData')}</Text>
                  </Pressable>
                </Anchor>
              </SettingsSection>

              <SettingsSection
                title={t('settings.contact')}
                subtitle={t('settings.contactSummary')}
                icon="chat"
                {...collapsible('contact')}
              >
                <Anchor {...anchor('version')}>
                  <Text style={[typography.small, styles.versionText, { color: colors.textMuted }]}>
                    {t('settings.version', { version: appVersionLabel() })}
                  </Text>
                </Anchor>
                <Anchor {...anchor('contact')}>
                  <Text style={[typography.small, { color: colors.textMuted }]}>{t('settings.contactHint')}</Text>
                  {isContactConfigured() ? (
                    <>
                      <SectionLabel variant="field" text={t('settings.profileName')} style={styles.fieldLabel} />
                      <TextInput
                        value={contactName}
                        onChangeText={setContactName}
                        placeholder={t('settings.profileNamePlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        accessibilityLabel={t('settings.profileName')}
                        style={[styles.input, inputTone]}
                        autoCapitalize="words"
                      />
                      <SectionLabel variant="field" text={t('settings.profilePhone')} style={styles.fieldLabel} />
                      <TextInput
                        value={contactPhone}
                        onChangeText={setContactPhone}
                        placeholder={t('settings.profilePhonePlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        accessibilityLabel={t('settings.profilePhone')}
                        keyboardType="phone-pad"
                        style={[styles.input, inputTone]}
                      />
                      <SectionLabel variant="field" text={t('settings.contactMessage')} style={styles.fieldLabel} />
                      <TextInput
                        value={contactMessage}
                        onChangeText={setContactMessage}
                        placeholder={t('settings.contactMessagePlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        accessibilityLabel={t('settings.contactMessage')}
                        multiline
                        maxLength={CONTACT_MESSAGE_MAX}
                        textAlignVertical="top"
                        style={[styles.input, styles.messageInput, inputTone]}
                      />
                      <Text style={[typography.small, styles.note, { color: colors.textMuted }]}>
                        {t('settings.contactPrivacy')}
                      </Text>
                      <Button
                        label={t(contactBusy ? 'settings.contactSending' : 'settings.contactSend')}
                        onPress={submitContact}
                        busy={contactBusy}
                        style={styles.buttonGap}
                      />
                      {contactStatus ? (
                        <Text
                          accessibilityLiveRegion="polite"
                          style={[
                            typography.small,
                            styles.note,
                            { color: contactStatus.failed ? colors.urgent : colors.textMuted },
                          ]}
                        >
                          {contactStatus.text}
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                  <Text style={[typography.small, styles.groupGap, { color: colors.textMuted }]}>
                    {t('settings.contactEmail')}
                  </Text>
                  <Pressable onPress={() => openLink(contactMailUrl())} accessibilityRole="link" style={styles.link}>
                    <Text style={[typography.bodyBold, { color: colors.goldText }]}>{CONTACT_EMAIL}</Text>
                  </Pressable>
                </Anchor>
                <Anchor {...anchor('links')}>
                  <SectionLabel variant="field" text={t('settings.links')} style={styles.fieldLabel} />
                  <Card divided>
                    <ListRow
                      icon="guide"
                      title={t('guide.title')}
                      caption={t('settings.linkGuideCaption')}
                      onPress={() => router.push('/guide')}
                      chevron
                    />
                    <ListRow
                      icon="chat"
                      title={t('settings.linkSupport')}
                      caption={t('settings.linkSupportCaption')}
                      onPress={() => openLink(PRODUCT_LINKS.support)}
                      chevron
                    />
                    <ListRow
                      icon="user"
                      title={t('settings.linkPrivacy')}
                      caption={t('settings.linkPrivacyCaption')}
                      onPress={() => openLink(PRODUCT_LINKS.privacy[language])}
                      chevron
                    />
                    {storeUrl ? (
                      <ListRow
                        icon="star"
                        title={t(Platform.OS === 'ios' ? 'settings.linkStore.ios' : 'settings.linkStore.android')}
                        caption={t('settings.linkStoreCaption')}
                        onPress={() => openLink(storeUrl)}
                        chevron
                      />
                    ) : null}
                    <ListRow
                      icon="chok"
                      title={t('settings.linkChok')}
                      caption={t('settings.linkChokCaption')}
                      onPress={() => setCreditOpen(true)}
                      chevron
                    />
                  </Card>
                </Anchor>
              </SettingsSection>
            </>
          )}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={resetVisible}
        title={t('settings.logoutConfirmTitle')}
        body={t('settings.logoutConfirmBody')}
        confirmLabel={t('settings.logoutConfirmAction')}
        destructive
        busy={resetting}
        onConfirm={performReset}
        onCancel={() => setResetVisible(false)}
      />

      <ConfirmDialog
        visible={pendingBackup !== null}
        title={t('settings.backupConfirmTitle')}
        body={pendingBackup ? t('settings.backupConfirmBody', { date: backupDateLabel(pendingBackup, language) }) : ''}
        confirmLabel={t('settings.backupConfirmAction')}
        destructive
        busy={backupBusy}
        onConfirm={confirmRestore}
        onCancel={() => setPendingBackup(null)}
      />

      <ChokCreditSheet visible={creditOpen} onClose={() => setCreditOpen(false)} />
    </SafeAreaView>
  );
}

type TaharahBlockProps = { enabled: boolean; gender: Gender | null; onOpen: () => void };

function TaharahBlock({ enabled, gender, onOpen }: TaharahBlockProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <>
      <SectionLabel variant="field" text={t('settings.taharah')} style={styles.fieldLabel} />
      <SwitchRow
        label={t('settings.taharahEnabled')}
        hint={t(gender === 'female' ? 'taharah.optIn.woman.body' : 'taharah.optIn.husband.body')}
        value={enabled}
        onValueChange={setTaharahTracking}
      />
      {enabled ? <Button label={t('settings.taharahOpen')} onPress={onOpen} style={styles.buttonGap} /> : null}
      <Text style={[typography.small, styles.note, { color: colors.textMuted }]}>{t('taharah.disclaimer')}</Text>
    </>
  );
}

type DisplaySizeBlockProps = { stored: number; onApply: (scale: number) => void };

function DisplaySizeBlock({ stored, onApply }: DisplaySizeBlockProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [pending, setPending] = useState(stored);
  const [confirming, setConfirming] = useState(false);
  const index = UI_SCALES.findIndex((value) => value === pending);
  const percent = `${Math.round(pending * 100)}%`;

  const step = (icon: IconName, accessibilityLabel: string, next: number | undefined) => {
    const disabled = next === undefined;
    return (
      <Pressable
        onPress={() => {
          if (next !== undefined) setPending(next);
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        hitSlop={scaled(6)}
        style={({ pressed }) => [styles.sizeStep, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
      >
        <MitzvahIcon name={icon} size={scaled(16)} color={colors.text} strokeWidth={2.8} />
      </Pressable>
    );
  };

  const apply = () => {
    onApply(pending);
    setConfirming(false);
    reloadApp();
  };

  return (
    <>
      <SectionLabel variant="field" text={t('settings.uiScale')} style={styles.fieldLabel} />
      <Text style={[typography.small, styles.hint, { color: colors.textMuted }]}>{t('settings.uiScaleHint')}</Text>
      <View style={[styles.sizeGroup, { backgroundColor: colors.surface2 }]}>
        {step('minus', t('settings.uiScaleSmaller'), UI_SCALES[index - 1])}
        <Text style={[typography.bodyBold, styles.sizeValue, { color: colors.text }]}>{percent}</Text>
        {step('plus', t('settings.uiScaleLarger'), UI_SCALES[index + 1])}
      </View>
      <Card padded style={[styles.sizeSample, { backgroundColor: colors.surface2 }]}>
        <Text
          style={[
            typography.body,
            {
              color: colors.text,
              fontSize: rescaled(typography.body.fontSize!, pending),
              lineHeight: rescaled(typography.body.lineHeight!, pending),
            },
          ]}
        >
          {t('settings.uiScaleSample')}
        </Text>
      </Card>
      {pending !== stored ? (
        <Button label={t('settings.uiScaleApply')} onPress={() => setConfirming(true)} style={styles.buttonGap} />
      ) : null}
      <ConfirmDialog
        visible={confirming}
        title={t('settings.uiScaleConfirmTitle')}
        body={t('settings.uiScaleConfirmBody')}
        confirmLabel={t('settings.uiScaleConfirmAction')}
        onConfirm={apply}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

type AnchorProps = { id: string; focus: string | null; onReveal: (target: View) => void; children: React.ReactNode };

// A search result opens its section and lands here: scrolled into view and briefly highlighted.
function Anchor({ id, focus, onReveal, children }: AnchorProps) {
  const { colors } = useTheme();
  const ref = useRef<View>(null);
  const focused = focus === id;
  useEffect(() => {
    if (!focused) return;
    const frame = requestAnimationFrame(() => {
      if (ref.current) onReveal(ref.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [focused, onReveal]);
  return (
    <View
      ref={ref}
      testID={`settings-anchor-${id}`}
      style={focused ? [styles.focused, { backgroundColor: colors.goldWashStrong }] : undefined}
    >
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, styles.statusRow]}>
      <Text style={[typography.bodyBold, { color: colors.text }]}>{label}</Text>
      <Text style={[typography.body, { color: colors.goldText }]}>{value}</Text>
    </View>
  );
}

type SwitchRowProps = {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

function SwitchRow({ label, hint, value, onValueChange, style }: SwitchRowProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.switchRow, style]}>
      <View style={styles.switchMeta}>
        <Text style={[typography.bodyBold, { color: colors.text }]}>{label}</Text>
        <Text style={[typography.small, styles.hint, { color: colors.textMuted }]}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        thumbColor={BRAND.white}
        trackColor={{ false: colors.border, true: colors.gold }}
      />
    </View>
  );
}

function openLink(url: string) {
  Linking.openURL(url).catch(() => {});
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  buttonGap: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusRow: {
    marginTop: spacing.md,
  },
  speedRow: {
    marginTop: spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchMeta: {
    flex: 1,
    paddingEnd: spacing.md,
  },
  hint: {
    marginTop: spacing.xs,
  },
  note: {
    marginTop: spacing.sm,
  },
  groupGap: {
    marginTop: spacing.lg,
  },
  fieldLabel: {
    marginTop: spacing.lg,
  },
  subHeading: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingTop: spacing.lg,
    paddingHorizontal: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  firstSubHeading: {
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  sizeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    borderRadius: radius.full,
  },
  sizeStep: {
    minWidth: scaled(44),
    minHeight: scaled(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeValue: {
    minWidth: scaled(56),
    textAlign: 'center',
  },
  sizeSample: {
    marginTop: spacing.md,
  },
  mitzvotGap: {
    marginBottom: spacing.md,
  },
  focused: {
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: scaled(16),
  },
  messageInput: {
    minHeight: scaled(120),
  },
  link: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  backupFiles: {
    marginBottom: spacing.lg,
  },
  versionText: {
    marginBottom: spacing.md,
  },
});
