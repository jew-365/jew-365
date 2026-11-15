import { Nusach } from '@/types/mitzvah';

export const NUSCHAOT: { id: Nusach; he: string }[] = [
  { id: 'ashkenaz', he: 'אשכנז' },
  { id: 'sefard', he: 'ספרד' },
  { id: 'edot_hamizrach', he: 'עדות המזרח' },
  { id: 'chabad', he: 'חב״ד' },
  { id: 'teiman', he: 'תימן בלדי' },
];

export const NUSACH_IDS: readonly Nusach[] = NUSCHAOT.map(({ id }) => id);
