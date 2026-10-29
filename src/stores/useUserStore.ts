import { Appearance } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from './zustandMiddleware';
import { createZustandStorage } from '@/services/StorageService';
import { STORE_VERSION, migrate, onRehydrateStorage } from './persistOptions';
import { Nusach, HalachicOpinion } from '@/types/mitzvah';
import { Location } from '@/types/zmanim';
import { ChokDoubleChoice, ChokThuNightDay } from '@/types/chok';
import type { SiddurVoice } from '@/types/siddur';
import { CITIES, refreshSavedLocation } from '@/data/cities';
import type { LocationSource, LocationStatus } from '@/services/LocationService';
import type { HilulaWhen, RoshChodeshWhen } from '@/services/notifications/ids';
import { THEME_NAMES, ThemeName } from '@/theme/colors';
import { DEFAULT_UI_SCALE, isUiScale } from '@/theme/scale';

export type Language = 'he' | 'en';
export type NotificationPermissionStatus = 'unknown' | 'granted' | 'denied';
export type Gender = 'male' | 'female';
export type MaritalStatus = 'married' | 'single';
export type PrayerMode = 'minyan' | 'alone';

export const SIDDUR_FONT_SIZES = [18, 20, 22, 25, 28, 32] as const;
const DEFAULT_SIDDUR_FONT_SIZE = 22;
// Reading pace of each auto-scroll speed level, in lines per minute, slowest first.
export const SIDDUR_SCROLL_SPEEDS = [5, 7, 9, 12, 15, 19, 24, 30, 38, 48, 60, 75, 95, 120, 150] as const;
const DEFAULT_SIDDUR_SCROLL_SPEED = 5;

export function scrollSpeedLevel(level: number): number {
  if (!Number.isFinite(level)) return DEFAULT_SIDDUR_SCROLL_SPEED;
  return Math.min(SIDDUR_SCROLL_SPEEDS.length, Math.max(1, Math.round(level)));
}

export type NoticeTiming = { anchor: 'shkia'; offsetMin: number } | { anchor: 'clock'; minutes: number };
export type NoticeSetting = { enabled: boolean; daysBefore?: number; timing: NoticeTiming };
export type RoshChodeshNotices = Record<RoshChodeshWhen, NoticeSetting>;
export type HilulaNotices = Record<HilulaWhen, NoticeSetting>;
export type NoticeTopic = 'hilulot' | 'roshChodesh';

export const ROSH_CHODESH_BEFORE_DAYS = 3;
export const HILULA_BEFORE_DAYS = 1;
export const NOTICE_DAYS_BEFORE: readonly number[] = [1, 2, 3, 4, 5, 6, 7];
export const NOTICE_SHKIA_LEADS_MIN: readonly number[] = [0, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180];
const NOTICE_SHKIA_LEAD_MAX_MIN = 180;
const LAST_CLOCK_MINUTE = 1439;

export const DEFAULT_ROSH_CHODESH_NOTICES: RoshChodeshNotices = {
  before: { enabled: true, daysBefore: ROSH_CHODESH_BEFORE_DAYS, timing: { anchor: 'clock', minutes: 20 * 60 } },
  evening: { enabled: true, timing: { anchor: 'shkia', offsetMin: 0 } },
  day: { enabled: true, timing: { anchor: 'clock', minutes: 7 * 60 } },
};
export const DEFAULT_HILULA_NOTICES: HilulaNotices = {
  before: { enabled: true, daysBefore: HILULA_BEFORE_DAYS, timing: { anchor: 'shkia', offsetMin: 0 } },
  evening: { enabled: true, timing: { anchor: 'shkia', offsetMin: 0 } },
};

export function noticeDaysBefore(setting: NoticeSetting, fallback: number): number {
  const days = setting.daysBefore;
  if (days === undefined || !Number.isFinite(days)) return fallback;
  return Math.min(7, Math.max(1, Math.round(days)));
}

export function noticeTimingOf(setting: NoticeSetting): NoticeTiming {
  const timing = setting.timing;
  if (timing?.anchor === 'clock')
    return { anchor: 'clock', minutes: Math.min(LAST_CLOCK_MINUTE, Math.max(0, Math.round(timing.minutes))) || 0 };
  if (timing?.anchor === 'shkia')
    return {
      anchor: 'shkia',
      offsetMin: Math.min(0, Math.max(-NOTICE_SHKIA_LEAD_MAX_MIN, Math.round(timing.offsetMin))) || 0,
    };
  return { anchor: 'shkia', offsetMin: 0 };
}

export function anyNoticeOn(notices: Readonly<Record<string, NoticeSetting>>): boolean {
  return Object.values(notices).some((setting) => setting?.enabled === true);
}

export function noticeChangeAllowed<K extends string>(
  masterOn: boolean,
  notices: Readonly<Record<K, NoticeSetting>>,
  kind: K,
  next: NoticeSetting,
): boolean {
  return !masterOn || anyNoticeOn({ ...notices, [kind]: next });
}

const savedNotices = <K extends string>(
  defaults: Record<K, NoticeSetting>,
  saved: Partial<Record<K, NoticeSetting>> | undefined,
) =>
  Object.fromEntries((Object.keys(defaults) as K[]).map((kind) => [kind, saved?.[kind] ?? defaults[kind]])) as Record<
    K,
    NoticeSetting
  >;

type UserState = {
  nusach: Nusach;
  location: Location;
  locationStatus: LocationStatus;
  locationSource: LocationSource;
  theme: ThemeName;
  uiScale: number;
  language: Language;
  notificationPermission: NotificationPermissionStatus;
  notificationsEnabled: boolean;
  profileName: string;
  profilePhone: string;
  halachicOpinions: { ksSofZman: HalachicOpinion };
  inIsrael: boolean;
  isOnboarded: boolean;
  siddurFontSize: number;
  siddurAutoScroll: boolean;
  siddurCompassPrompt: boolean;
  siddurScrollSpeed: number;
  siddurVoice: SiddurVoice | null;
  prayerMode: PrayerMode;
  hilulotEnabled: boolean;
  roshChodeshEnabled: boolean;
  hilulaNotices: HilulaNotices;
  roshChodeshNotices: RoshChodeshNotices;
  weeklyReportEnabled: boolean;
  chokDoubleChoice: ChokDoubleChoice | null;
  chokCommentaryOpen: boolean;
  chokThuNightDay: ChokThuNightDay | null;
  gender: Gender | null;
  maritalStatus: MaritalStatus | null;
  taharahEnabled: boolean;
  setNusach: (n: Nusach) => void;
  setLocation: (l: Location) => void;
  setLocationState: (l: Location, status: LocationStatus, source: LocationSource) => void;
  setLocationStatus: (status: LocationStatus) => void;
  setTheme: (t: ThemeName) => void;
  setUiScale: (scale: number) => void;
  setLanguage: (l: Language) => void;
  setNotificationPermission: (status: NotificationPermissionStatus) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setProfileName: (v: string) => void;
  setProfilePhone: (v: string) => void;
  setKsOpinion: (o: HalachicOpinion) => void;
  setInIsrael: (v: boolean) => void;
  setOnboarded: (v: boolean) => void;
  setSiddurFontSize: (size: number) => void;
  setSiddurAutoScroll: (v: boolean) => void;
  setSiddurCompassPrompt: (v: boolean) => void;
  setSiddurScrollSpeed: (level: number) => void;
  setSiddurVoice: (voice: SiddurVoice) => void;
  setPrayerMode: (mode: PrayerMode) => void;
  setHilulotEnabled: (v: boolean) => void;
  setRoshChodeshEnabled: (v: boolean) => void;
  setHilulaNotice: (kind: HilulaWhen, setting: NoticeSetting) => void;
  setRoshChodeshNotice: (kind: RoshChodeshWhen, setting: NoticeSetting) => void;
  setWeeklyReportEnabled: (v: boolean) => void;
  setChokDoubleChoice: (choice: ChokDoubleChoice) => void;
  setChokCommentaryOpen: (open: boolean) => void;
  setChokThuNightDay: (day: ChokThuNightDay) => void;
  setGender: (g: Gender | null) => void;
  setMaritalStatus: (m: MaritalStatus | null) => void;
  setTaharahEnabled: (v: boolean) => void;
  reset: () => void;
};

type PersistedUserState = Partial<
  Pick<UserState, 'taharahEnabled' | 'maritalStatus' | 'hilulaNotices' | 'roshChodeshNotices'>
> & { theme?: unknown };

const DEFAULT_LOCATION = CITIES[0];
const DEFAULT_THEME: ThemeName = 'gold';

const savedThemeName = (saved: unknown): ThemeName => {
  if (THEME_NAMES.includes(saved as ThemeName)) return saved as ThemeName;
  if (saved === 'system' && Appearance.getColorScheme() === 'dark') return 'dark';
  return DEFAULT_THEME;
};

const mergeSavedUserState = (persisted: unknown, current: UserState): UserState => {
  const { theme, ...saved } = (persisted ?? {}) as PersistedUserState;
  const merged = { ...current, ...saved, theme: theme === undefined ? current.theme : savedThemeName(theme) };
  if (merged.taharahEnabled && merged.maritalStatus == null) merged.maritalStatus = 'married';
  if (!isUiScale(merged.uiScale)) merged.uiScale = DEFAULT_UI_SCALE;
  merged.location = refreshSavedLocation(merged.location, merged.locationSource);
  merged.inIsrael = merged.location.inIsrael;
  merged.hilulaNotices = savedNotices(DEFAULT_HILULA_NOTICES, saved.hilulaNotices);
  merged.roshChodeshNotices = savedNotices(DEFAULT_ROSH_CHODESH_NOTICES, saved.roshChodeshNotices);
  if (merged.hilulotEnabled && !anyNoticeOn(merged.hilulaNotices)) merged.hilulaNotices = DEFAULT_HILULA_NOTICES;
  if (merged.roshChodeshEnabled && !anyNoticeOn(merged.roshChodeshNotices))
    merged.roshChodeshNotices = DEFAULT_ROSH_CHODESH_NOTICES;
  return merged;
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      nusach: 'ashkenaz',
      location: DEFAULT_LOCATION,
      // The default city is a guess until GPS or a city pick confirms it; 'ready' claimed otherwise.
      locationStatus: 'missing',
      locationSource: 'manual',
      theme: DEFAULT_THEME,
      uiScale: DEFAULT_UI_SCALE,
      language: 'he',
      notificationPermission: 'unknown',
      notificationsEnabled: true,
      profileName: '',
      profilePhone: '',
      halachicOpinions: { ksSofZman: 'GRA' },
      inIsrael: true,
      isOnboarded: false,
      siddurFontSize: DEFAULT_SIDDUR_FONT_SIZE,
      siddurAutoScroll: false,
      siddurCompassPrompt: true,
      siddurScrollSpeed: DEFAULT_SIDDUR_SCROLL_SPEED,
      siddurVoice: null,
      prayerMode: 'minyan',
      hilulotEnabled: false,
      roshChodeshEnabled: false,
      hilulaNotices: DEFAULT_HILULA_NOTICES,
      roshChodeshNotices: DEFAULT_ROSH_CHODESH_NOTICES,
      weeklyReportEnabled: true,
      chokDoubleChoice: null,
      chokCommentaryOpen: false,
      chokThuNightDay: null,
      gender: null,
      maritalStatus: null,
      taharahEnabled: false,
      setNusach: (n) => set({ nusach: n }),
      setLocation: (l) => set({ location: l, inIsrael: l.inIsrael }),
      setLocationState: (l, status, source) =>
        set({ location: l, inIsrael: l.inIsrael, locationStatus: status, locationSource: source }),
      // Records that a lookup failed without touching the chosen location.
      setLocationStatus: (status) => set({ locationStatus: status }),
      setTheme: (t) => set({ theme: t }),
      setUiScale: (scale) => set((s) => (isUiScale(scale) ? { uiScale: scale } : s)),
      setLanguage: (l) => set({ language: l }),
      setNotificationPermission: (status) => set({ notificationPermission: status }),
      setNotificationsEnabled: (v) => set({ notificationsEnabled: v }),
      setProfileName: (v) => set({ profileName: v }),
      setProfilePhone: (v) => set({ profilePhone: v }),
      setKsOpinion: (o) => set((s) => ({ halachicOpinions: { ...s.halachicOpinions, ksSofZman: o } })),
      setInIsrael: (v) => set({ inIsrael: v }),
      setOnboarded: (v) => set({ isOnboarded: v }),
      setSiddurFontSize: (size) => set({ siddurFontSize: size }),
      setSiddurAutoScroll: (v) => set({ siddurAutoScroll: v }),
      setSiddurCompassPrompt: (v) => set({ siddurCompassPrompt: v }),
      setSiddurScrollSpeed: (level) => set({ siddurScrollSpeed: scrollSpeedLevel(level) }),
      setSiddurVoice: (voice) => set({ siddurVoice: voice }),
      setPrayerMode: (mode) => set({ prayerMode: mode }),
      setHilulotEnabled: (v) => set((s) => (v && !anyNoticeOn(s.hilulaNotices) ? s : { hilulotEnabled: v })),
      setRoshChodeshEnabled: (v) =>
        set((s) => (v && !anyNoticeOn(s.roshChodeshNotices) ? s : { roshChodeshEnabled: v })),
      setHilulaNotice: (kind, setting) =>
        set((s) =>
          noticeChangeAllowed(s.hilulotEnabled, s.hilulaNotices, kind, setting)
            ? { hilulaNotices: { ...s.hilulaNotices, [kind]: setting } }
            : s,
        ),
      setRoshChodeshNotice: (kind, setting) =>
        set((s) =>
          noticeChangeAllowed(s.roshChodeshEnabled, s.roshChodeshNotices, kind, setting)
            ? { roshChodeshNotices: { ...s.roshChodeshNotices, [kind]: setting } }
            : s,
        ),
      setWeeklyReportEnabled: (v) => set({ weeklyReportEnabled: v }),
      setChokDoubleChoice: (choice) => set({ chokDoubleChoice: choice }),
      setChokCommentaryOpen: (open) => set({ chokCommentaryOpen: open }),
      setChokThuNightDay: (day) => set({ chokThuNightDay: day }),
      setGender: (g) => set({ gender: g }),
      setMaritalStatus: (m) => set({ maritalStatus: m }),
      setTaharahEnabled: (v) => set({ taharahEnabled: v }),
      reset: () =>
        set({
          nusach: 'ashkenaz',
          location: DEFAULT_LOCATION,
          locationStatus: 'missing',
          locationSource: 'manual',
          theme: DEFAULT_THEME,
          uiScale: DEFAULT_UI_SCALE,
          language: 'he',
          notificationPermission: 'unknown',
          notificationsEnabled: true,
          profileName: '',
          profilePhone: '',
          halachicOpinions: { ksSofZman: 'GRA' },
          inIsrael: true,
          isOnboarded: false,
          siddurFontSize: DEFAULT_SIDDUR_FONT_SIZE,
          siddurAutoScroll: false,
          siddurCompassPrompt: true,
          siddurScrollSpeed: DEFAULT_SIDDUR_SCROLL_SPEED,
          siddurVoice: null,
          prayerMode: 'minyan',
          hilulotEnabled: false,
          roshChodeshEnabled: false,
          hilulaNotices: DEFAULT_HILULA_NOTICES,
          roshChodeshNotices: DEFAULT_ROSH_CHODESH_NOTICES,
          weeklyReportEnabled: true,
          chokDoubleChoice: null,
          chokCommentaryOpen: false,
          chokThuNightDay: null,
          gender: null,
          maritalStatus: null,
          taharahEnabled: false,
        }),
    }),
    {
      name: 'user-store',
      storage: createJSONStorage(() => createZustandStorage()),
      version: STORE_VERSION,
      migrate,
      merge: mergeSavedUserState,
      onRehydrateStorage: onRehydrateStorage('user-store'),
    },
  ),
);

export function canEnableNotices(topic: NoticeTopic): boolean {
  const s = useUserStore.getState();
  return anyNoticeOn(topic === 'hilulot' ? s.hilulaNotices : s.roshChodeshNotices);
}
