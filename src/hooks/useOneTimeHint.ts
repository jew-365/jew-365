import { useCallback } from 'react';
import { useUserStore } from '@/stores/useUserStore';

// A hint that shows once (spec .claude/specs/discoverability.md, E1): `show` holds until `learn()` records the
// id in `useUserStore.discovery.hints`, which rides the backup and the reset. The caller decides what counts as
// learned: the gesture itself (the sun's drag), or a tap on the hint.
export function useOneTimeHint(id: string): { show: boolean; learn: () => void } {
  const learned = useUserStore((s) => s.discovery.hints.includes(id));
  const learn = useCallback(() => useUserStore.getState().learnHint(id), [id]);
  return { show: !learned, learn };
}
