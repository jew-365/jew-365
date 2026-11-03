import { HalachicOpinion, Nusach } from '@/types/mitzvah';

export const NUSCHAOT: { id: Nusach; he: string; defaultKsOpinion: HalachicOpinion }[] = [
  { id: 'ashkenaz', he: 'אשכנז', defaultKsOpinion: 'GRA' },
  { id: 'sefard', he: 'ספרד', defaultKsOpinion: 'GRA' },
  { id: 'edot_hamizrach', he: 'עדות המזרח', defaultKsOpinion: 'GRA' },
  { id: 'chabad', he: 'חב״ד', defaultKsOpinion: 'MA' },
  { id: 'teiman', he: 'תימן בלדי', defaultKsOpinion: 'GRA' },
];

export const NUSACH_IDS: readonly Nusach[] = NUSCHAOT.map(({ id }) => id);

export function defaultOpinionFor(nusach: Nusach): HalachicOpinion {
  return NUSCHAOT.find((n) => n.id === nusach)?.defaultKsOpinion ?? 'GRA';
}
