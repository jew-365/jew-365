import type { OfferId } from '@/utils/offers';
import type { TimeStage } from '@/utils/timeLeft';
import type { PlatformOSType } from 'react-native';
import type { AppLanguage } from '@/i18n';
import type { ManualNag, Mitzvah, Reminder, UserSettings } from '@/types/mitzvah';
import type { TaharahEvent, TaharahSettings } from '@/types/taharah';
import type { Location } from '@/types/zmanim';
import type { CheckIns, Completions } from '@/stores/useCompletionsStore';
import type { HilulaNotices, RoshChodeshNotices } from '@/stores/useUserStore';
import type { TaharahLeads } from '@/stores/useTaharahStore';
import type { ANDROID_CHANNELS, PendingNotificationMeta } from '@/services/notifications/ids';
import type { QuietHours } from '@/utils/quietHours';
import type { NagLevel } from '@/utils/nagging';

export type ChannelKey = keyof typeof ANDROID_CHANNELS;

// What a planner decided to schedule, with nothing of expo-notifications in it: the OS adapter maps
// it to a date trigger on `channel`'s Android channel.
export type ScheduleCandidate = {
  id: string;
  trigger: Date;
  channel: ChannelKey;
  categoryIdentifier?: string;
  title: string;
  // The iPhone's bold second line and Android's subText; a mitzvah reminder's time-left line.
  subtitle?: string;
  // Android's accent colour (the small icon, and the app name on Android 11 and older); a reminder's time stage.
  color?: string;
  // A mitzvah reminder's time stage, which picks its sound (orange: the soon sound, red: the last one); a
  // notice has none and takes the plain sound.
  stage?: TimeStage;
  body: string;
  data: PendingNotificationMeta;
};

// Every fact a plan depends on, read once by `readPlanInput()`. Planners compute from this and the
// calendar services alone, so the same input always yields the same plan.
export type PlanInput = {
  now: Date;
  // The device-local instant the horizon starts from (today, for a rebuild).
  fromDate: Date;
  platform: PlatformOSType;
  hasPermission: boolean;
  language: AppLanguage;
  location: Location;
  settings: UserSettings;
  mitzvot: Mitzvah[];
  // A mitzvah's own reminders when the user edited them; absent means its defaults.
  reminderOverrides: Record<string, Reminder[]>;
  // The app's nagging level, and the level of each planned mitzvah that sets its own. Optional so a
  // hand-built input without them plans no repeat (level 1).
  nagLevel?: NagLevel;
  nagLevels?: Record<string, NagLevel>;
  // The nags each planned mitzvah's user placed by hand on its window's axis, sent instead of the smart nag's.
  manualNagsByMitzvah?: Record<string, ManualNag[]>;
  completions: Completions;
  skipped: Completions;
  checkIns: CheckIns;
  enabledSince: Record<string, number>;
  hilulotEnabled: boolean;
  roshChodeshEnabled: boolean;
  hilulaNotices: HilulaNotices;
  roshChodeshNotices: RoshChodeshNotices;
  weeklyReportEnabled: boolean;
  // The weekly report's tip (spec C6): an offer read once per plan, absent in fixtures that do not need it.
  weeklyTip?: OfferId | null;
  quietHours?: QuietHours;
  taharahEnabled: boolean;
  taharah: {
    events: TaharahEvent[];
    settings: TaharahSettings;
    discreet: boolean;
    leads: TaharahLeads;
  };
};
