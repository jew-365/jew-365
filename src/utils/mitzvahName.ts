import { Mitzvah, Reminder } from '@/types/mitzvah';
import { t } from '@/i18n';

export function mitzvahName(mitzvah: Pick<Mitzvah, 'name'>, language: 'he' | 'en'): string {
  return language === 'en' && mitzvah.name.en ? mitzvah.name.en : mitzvah.name.he;
}

export function reminderLabel(reminder: Pick<Reminder, 'anchor' | 'label'>, name: string): string {
  if (reminder.label.trim()) return reminder.label.trim();
  return reminder.anchor === 'followUp' ? t('reminder.followUp.label', { name }) : reminder.label;
}
