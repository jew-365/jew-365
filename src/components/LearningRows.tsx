import React from 'react';
import { useRouter } from 'expo-router';
import { chokAddonCaption, useChokDownloadFlow } from '@/components/ChokAddonCard';
import { shnayimAddonCaption, useShnayimDownloadFlow } from '@/components/ShnayimAddonCard';
import { useI18n } from '@/i18n';
import { chokDownloadSupported } from '@/services/ChokContentService';
import { shnayimDownloadSupported } from '@/services/ShnayimContentService';
import { useChokStore } from '@/stores/useChokStore';
import { useShnayimStore } from '@/stores/useShnayimStore';
import { useUserStore } from '@/stores/useUserStore';
import { CHOK_PROGRAM, LearningProgram, chokPortionAt, chokWeekName } from '@/utils/chok';
import { SHNAYIM_PROGRAM } from '@/utils/shnayim';

export type LearningRow = {
  id: string;
  title: string;
  caption: string;
  installed: boolean;
  disabled: boolean;
  onPress: () => void;
};

// The weekly learning programs (Chok LeYisrael, Shnayim Mikra) as rows, shared by the More tab and the siddur tab's
// learning group: installed, the portion of the moment and a press that opens the reader; not installed, the add-on's
// caption and a press that starts the download in place (the mitzvah screen while one runs, and on web).
export function useLearningRows(now: Date): { rows: LearningRow[]; dialogs: React.ReactElement } {
  const { t, language } = useI18n();
  const router = useRouter();
  const location = useUserStore((s) => s.location);
  const inIsrael = useUserStore((s) => s.inIsrael);
  const chokInstalled = useChokStore((s) => s.installed !== null);
  const chokDownload = useChokStore((s) => s.download);
  const shnayimInstalled = useShnayimStore((s) => s.installed !== null);
  const shnayimDownload = useShnayimStore((s) => s.download);
  const chokFlow = useChokDownloadFlow();
  const shnayimFlow = useShnayimDownloadFlow();

  const row = (
    program: LearningProgram,
    titleKey: string,
    nothingKey: string,
    installed: boolean,
    downloading: boolean,
    supported: boolean,
    flow: { preparing: boolean; prepare: () => Promise<void> },
    addonCaption: string,
  ): LearningRow => {
    const portion = installed ? chokPortionAt(now, location, inIsrael, program) : null;
    return {
      id: program.id,
      title: t(titleKey),
      caption: !installed
        ? addonCaption
        : portion
          ? `${t('chok.parashaOf', { name: chokWeekName(portion.parashiyot, language) })} · ${t(`chok.slot.${portion.slot}`)}`
          : t(nothingKey),
      installed,
      disabled: flow.preparing,
      onPress: () => {
        if (installed) router.push({ pathname: '/siddur/[id]', params: { id: program.id } });
        else if (!supported || downloading) router.push(`/mitzvah/${program.id}`);
        else void flow.prepare();
      },
    };
  };

  return {
    rows: [
      row(
        CHOK_PROGRAM,
        'chok.title',
        'chok.nothingToday',
        chokInstalled,
        chokDownload.status === 'downloading',
        chokDownloadSupported(),
        chokFlow,
        chokAddonCaption(chokDownload, t),
      ),
      row(
        SHNAYIM_PROGRAM,
        'shnayim.title',
        'shnayim.nothingToday',
        shnayimInstalled,
        shnayimDownload.status === 'downloading',
        shnayimDownloadSupported(),
        shnayimFlow,
        shnayimAddonCaption(shnayimDownload, t),
      ),
    ],
    dialogs: (
      <>
        {chokFlow.dialog}
        {shnayimFlow.dialog}
      </>
    ),
  };
}
