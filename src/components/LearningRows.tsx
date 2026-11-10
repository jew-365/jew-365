import React from 'react';
import { useRouter } from 'expo-router';
import { chokAddonCaption, useChokDownloadFlow } from '@/components/ChokAddonCard';
import { halachaAddonCaption, useHalachaDownloadFlow } from '@/components/HalachaAddonCard';
import { shnayimAddonCaption, useShnayimDownloadFlow } from '@/components/ShnayimAddonCard';
import { FESTIVAL_NAMES, HALACHA_YOMIT_ID, HILCHOT_HACHAG_ID, effectiveHalachaTrack } from '@/data/halacha';
import { hilchotHachagOn, halachaYomitOn } from '@/data/halachaContent';
import { findMitzvah } from '@/data/mitzvot';
import { useI18n } from '@/i18n';
import { halachaDownloadSupported } from '@/services/HalachaContentService';
import { chokDownloadSupported } from '@/services/ChokContentService';
import { shnayimDownloadSupported } from '@/services/ShnayimContentService';
import { useChokStore } from '@/stores/useChokStore';
import { HALACHA_STORES } from '@/stores/useHalachaStore';
import { useShnayimStore } from '@/stores/useShnayimStore';
import { useUserStore } from '@/stores/useUserStore';
import { CHOK_PROGRAM, LearningProgram, chokPortionAt, chokWeekName } from '@/utils/chok';
import { appDay } from '@/utils/locationDay';
import { SHNAYIM_PROGRAM } from '@/utils/shnayim';

export type LearningRow = {
  id: string;
  title: string;
  caption: string;
  installed: boolean;
  disabled: boolean;
  onPress: () => void;
};

// The learning programs (Chok LeYisrael, Shnayim Mikra, the daily halacha and the halachot of the festival) as rows,
// shared by the More tab and the siddur tab's learning group: installed, the portion of the moment and a press that
// opens the reader; not installed, the add-on's caption and a press that starts the download in place (the mitzvah
// screen while one runs, and on web). The two halacha rows share the user's track and its one download.
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
  const nusach = useUserStore((s) => s.nusach);
  const track = effectiveHalachaTrack(
    useUserStore((s) => s.halachaTrack),
    nusach,
  );
  useUserStore((s) => s.benIshChaiYearSwapped);
  const halachaInstalled = HALACHA_STORES[track]((s) => s.installed !== null);
  const halachaDownload = HALACHA_STORES[track]((s) => s.download);
  const halachaFlow = useHalachaDownloadFlow(track);

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

  const halachaRow = (id: string, caption: () => string): LearningRow => {
    const name = findMitzvah(id)?.name;
    return {
      id,
      title: name ? (language === 'en' && name.en ? name.en : name.he) : id,
      caption: halachaInstalled ? caption() : halachaAddonCaption(track, halachaDownload, t),
      installed: halachaInstalled,
      disabled: halachaFlow.preparing,
      onPress: () => {
        if (halachaInstalled) router.push({ pathname: '/siddur/[id]', params: { id } });
        else if (!halachaDownloadSupported() || halachaDownload.status === 'downloading') router.push(`/mitzvah/${id}`);
        else void halachaFlow.prepare();
      },
    };
  };
  const today = appDay(now, location);
  const yomit = halachaRow(HALACHA_YOMIT_ID, () => {
    const day = halachaYomitOn(today, nusach, inIsrael);
    return day ? `${day.book[language]} · ${day.portion.label[language]}` : t('chok.nothingToday');
  });
  const hachag = halachaRow(HILCHOT_HACHAG_ID, () => {
    const [day] = hilchotHachagOn(today, nusach);
    return day
      ? `${t('halacha.before', { chag: FESTIVAL_NAMES[day.period.festival][language] })} · ${day.portion.label[language]}`
      : t('halacha.hachag.notNow');
  });

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
      yomit,
      hachag,
    ],
    dialogs: (
      <>
        {chokFlow.dialog}
        {shnayimFlow.dialog}
        {halachaFlow.dialog}
      </>
    ),
  };
}
