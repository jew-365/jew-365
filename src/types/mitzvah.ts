import type { SiddurTextId } from './siddur';
import { Location, Zmanim } from './zmanim';

export type Nusach = 'ashkenaz' | 'sefard' | 'edot_hamizrach' | 'chabad';

export type HalachicOpinion = 'GRA' | 'MA';

export type UserSettings = {
  nusach: Nusach;
  halachicOpinions: { ksSofZman: HalachicOpinion };
  inIsrael: boolean;
};

export type TimeType =
  'fixed-moment' | 'range-within-day' | 'sunset-trigger' | 'date-range' | 'monthly-window' | 'annual-seasonal';

export type MitzvahCategory =
  'daily-morning' | 'daily-afternoon' | 'daily-evening' | 'daily-allday' | 'weekly' | 'seasonal' | 'learning';

export type LibraryGroup = 'prayers' | 'daily' | 'weekly' | 'seasonal' | 'other' | 'mine';

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type SkipContext = 'shabbat' | 'yomtov' | 'cholHamoed' | 'fastDay';

// With `clock`, `offsetMin` is minutes after midnight (0-1439) on the location's clock, not an offset from the window; with `followUp`, minutes after the window's end (1-720); with `blockExit`, minutes (0-720) after the exit of each holy block that ends inside the window.
export type ReminderAnchor = 'start' | 'end' | 'clock' | 'followUp' | 'blockExit';

// The nagging level (רמת נודניקיות): a preset nag for every reminder without one of its own.
export type NagLevel = 1 | 2 | 3 | 4;
// Where a nag's repeats fall against their reminder: all before it, all after it, or half and half.
export type NagPlacement = 'before' | 'after' | 'around';
// A reminder's nag (נודניק): `count` repeats, `everyMin` minutes apart, placed by `placement`.
export type ReminderNag = { count: number; everyMin: number; placement: NagPlacement };

export type Reminder = {
  anchor: ReminderAnchor;
  offsetMin: number;
  label: string;
  bodyVariants?: string[];
  includeContentInBody?: boolean;
  skipIfDone?: boolean;
  // An object is this reminder's own nag, `null` exempts it from the level, absent follows the level.
  nag?: ReminderNag | null;
};

export type MitzvahWindow = {
  start: Date;
  end: Date;
} | null;

export type ComputeContext = {
  date: Date;
  location: Location;
  settings: UserSettings;
  zmanim: Zmanim;
};

export type BodyParams = Record<string, string | number | { he: string; en: string }>;

export type ContentBlock =
  | { type: 'text'; he: string; en?: string }
  | { type: 'blessing'; he: string; en?: string }
  | { type: 'link'; he: string; en?: string; url: string }
  | { type: 'siddur'; he: string; en?: string; textId: SiddurTextId };

export type Mitzvah = {
  id: string;
  name: { he: string; en?: string };
  icon: string;
  timeType: TimeType;
  category: MitzvahCategory;
  group: LibraryGroup;
  computeWindow: (ctx: ComputeContext) => MitzvahWindow;
  defaultReminders: Reminder[];
  skipOn: SkipContext[];
  nuschaotSupported: Nusach[];
  description?: { he: string; en?: string };
  contentBlocks?: ContentBlock[];
  bodyParams?: (ctx: ComputeContext) => BodyParams | null;
  bodyKey?: string;
  multiDay?: { maxDays: number };
  isCustom?: boolean;
};

export type CustomMitzvah = {
  id: string;
  name: string;
  startHHMM: string;
  endHHMM: string;
  reminders: Reminder[];
  skipOn: SkipContext[];
  activeDays?: Weekday[];
  schedules?: ScheduleEntry[];
  contentBlocks?: ContentBlock[];
  createdAt: number;
};

export type CustomSchedule =
  | { mode: 'weekdays'; days: Weekday[] }
  | { mode: 'range'; start: string; end: string }
  | { mode: 'streak'; start: string; days: number };

export type ScheduleEntry = { from: string; schedule: CustomSchedule };
