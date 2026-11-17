import type { CustomIconName } from '@/data/customIcons';
import type { CustomMitzvah, Weekday } from '@/types/mitzvah';
import { firstReminder } from '@/utils/customMitzvah';

// The template gallery of D2 (the owner's pick of 2026-11-17, direction א of design/lab/studies/2026-11-16-templates):
// a personal mitzvah created in one tap with modest hours, its days and one reminder, everything editable in the
// form afterwards. Clock hours only: a template never follows a zman. Names and benefits are `template.<id>.name`
// and `template.<id>.benefit` in both dictionaries.
export type CustomTemplate = {
  id: string;
  icon: CustomIconName;
  startHHMM: string;
  endHHMM: string;
  days: readonly Weekday[];
};

const SUN_TO_FRI: readonly Weekday[] = [0, 1, 2, 3, 4, 5];
const SUN_TO_THU: readonly Weekday[] = [0, 1, 2, 3, 4];
const FRIDAY: readonly Weekday[] = [5];

export const CUSTOM_TEMPLATES: readonly CustomTemplate[] = [
  { id: 'tzedakah', icon: 'sparkle', startHHMM: '08:00', endHHMM: '14:00', days: SUN_TO_FRI },
  { id: 'tehillim', icon: 'tehillim', startHHMM: '09:30', endHHMM: '16:30', days: SUN_TO_FRI },
  { id: 'shiur', icon: 'chok', startHHMM: '20:00', endHHMM: '22:30', days: SUN_TO_THU },
  { id: 'parents', icon: 'phone', startHHMM: '18:00', endHHMM: '21:00', days: SUN_TO_THU },
  { id: 'thanks', icon: 'sun', startHHMM: '21:00', endHHMM: '23:30', days: SUN_TO_THU },
  { id: 'commute', icon: 'suitcase', startHHMM: '07:00', endHHMM: '09:30', days: SUN_TO_THU },
  { id: 'mishnayot', icon: 'siddur', startHHMM: '06:30', endHHMM: '08:30', days: SUN_TO_FRI },
  { id: 'story', icon: 'night', startHHMM: '19:00', endHHMM: '20:30', days: SUN_TO_THU },
  { id: 'kidsLearning', icon: 'user', startHHMM: '17:00', endHHMM: '19:00', days: SUN_TO_THU },
  { id: 'shabbatPrep', icon: 'challah', startHHMM: '08:00', endHHMM: '12:00', days: FRIDAY },
  { id: 'grandparents', icon: 'chat', startHHMM: '09:00', endHHMM: '13:00', days: FRIDAY },
];

export const templateNameKey = (id: string) => `template.${id}.name`;
export const templateBenefitKey = (id: string) => `template.${id}.benefit`;

// The mitzvah one tap creates: the template's hours and days from `todayKey` on, off on Shabbat and Yom Tov, and
// the one reminder every new custom mitzvah starts with.
export function mitzvahFromTemplate(
  template: CustomTemplate,
  name: string,
  todayKey: string,
  id: string,
  createdAt: number,
): CustomMitzvah {
  return {
    id,
    name,
    icon: template.icon,
    startHHMM: template.startHHMM,
    endHHMM: template.endHHMM,
    skipOn: ['shabbat', 'yomtov'],
    schedules: [{ from: todayKey, schedule: { mode: 'weekdays', days: [...template.days] } }],
    reminders: [firstReminder(name)],
    template: template.id,
    createdAt,
  };
}
