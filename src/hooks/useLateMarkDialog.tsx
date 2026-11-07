import React, { useState } from 'react';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { celebrateMark } from '@/components/MarkCelebration';
import { useI18n } from '@/i18n';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useUserStore } from '@/stores/useUserStore';
import { clockOf } from '@/utils/clock';
import { onTimeMarkAt, windowClosed } from '@/utils/lateMarks';

export type LateMarkTarget = {
  id: string;
  name: string;
  // The day the window was computed for, the key its mark is filed under.
  date: Date;
  window: { start: Date; end: Date } | null;
  // The instant from which the day no longer takes a mark (the check-in's deadline); an answer after it writes nothing.
  until?: Date;
};

// Called once the mark is written, with the completion animation's end: a screen that leaves after a mark leaves then.
type OnMarked = (celebration: Promise<void>) => void;
// `celebrate: false` for a card that answers the mark with its own animation (home's open card).
type MarkOptions = { celebrate?: boolean };

type Pending = LateMarkTarget & { window: { start: Date; end: Date }; onMarked?: OnMarked; celebrate: boolean };

// Every mark of a mitzvah whose window has already closed asks when it was done: in time but
// not marked (filed as a mark in time) or after the time had passed (a late mark).
export function useLateMarkDialog(): {
  mark: (target: LateMarkTarget, onMarked?: OnMarked, options?: MarkOptions) => void;
  open: boolean;
  dialog: React.ReactElement;
} {
  const { t } = useI18n();
  const tz = useUserStore((s) => s.location.tz);
  const [pending, setPending] = useState<Pending | null>(null);

  // Every mark made on a screen plays the completion (the owner's call, 2026-11-07).
  const marked = (onMarked: OnMarked | undefined, celebrate: boolean) => {
    const celebration = celebrate ? celebrateMark() : Promise.resolve();
    onMarked?.(celebration);
  };

  const mark = (target: LateMarkTarget, onMarked?: OnMarked, { celebrate = true }: MarkOptions = {}) => {
    const { window } = target;
    if (!window || !windowClosed(window, new Date())) {
      useCompletionsStore.getState().markDone(target.id, target.date);
      marked(onMarked, celebrate);
      return;
    }
    setPending({ ...target, window, onMarked, celebrate });
  };

  const choose = (late: boolean) => {
    if (!pending) return;
    setPending(null);
    if (pending.until && Date.now() >= pending.until.getTime()) return;
    useCompletionsStore
      .getState()
      .markDone(pending.id, pending.date, late ? { late: true } : { at: onTimeMarkAt(pending.window) });
    marked(pending.onMarked, pending.celebrate);
  };

  const dialog = (
    <BottomSheet
      visible={pending !== null}
      title={t('lateMark.title')}
      caption={
        pending ? t('lateMark.caption', { name: pending.name, time: clockOf(pending.window.end, tz) }) : undefined
      }
      onClose={() => setPending(null)}
    >
      <SheetAction label={t('lateMark.onTime')} caption={t('lateMark.onTimeCaption')} onPress={() => choose(false)} />
      <SheetAction label={t('lateMark.late')} caption={t('lateMark.lateCaption')} onPress={() => choose(true)} />
    </BottomSheet>
  );

  return { mark, open: pending !== null, dialog };
}
