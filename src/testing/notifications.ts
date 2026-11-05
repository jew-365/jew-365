import type { ScheduleCandidate } from '@/services/notifications/types';

// A mitzvah notification's own message. The iPhone shows the time-left line as the subtitle, and Android, which has no
// room for it there, as the first line of the body; any other notification's body is its message.
export function messageOf(candidate: Pick<ScheduleCandidate, 'body' | 'subtitle' | 'data'>): string {
  if (candidate.subtitle !== undefined || !candidate.data.mitzvahId) return candidate.body;
  return candidate.body.slice(candidate.body.indexOf('\n') + 1);
}
