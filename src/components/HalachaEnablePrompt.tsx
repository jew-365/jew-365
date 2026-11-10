import React from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useI18n } from '@/i18n';
import { switchHalachaOn } from '@/services/HalachaContentService';
import { HALACHA_STORES } from '@/stores/useHalachaStore';
import { HalachaTrack } from '@/types/halacha';

// After a first download of a halacha track while its mitzvot are off: switch both on? (as ChokEnablePrompt does).
export function HalachaEnablePrompt() {
  const { t } = useI18n();
  const kitzur = HALACHA_STORES.kitzur((s) => s.enablePrompt);
  const benIshChai = HALACHA_STORES.ben_ish_chai((s) => s.enablePrompt);
  const rambam = HALACHA_STORES.rambam((s) => s.enablePrompt);
  const pending: HalachaTrack | null = kitzur ? 'kitzur' : benIshChai ? 'ben_ish_chai' : rambam ? 'rambam' : null;
  const close = () => {
    if (pending) HALACHA_STORES[pending].getState().setEnablePrompt(false);
  };

  return (
    <ConfirmDialog
      visible={pending !== null}
      title={t('halacha.enablePrompt.title', { book: pending ? t(`halacha.book.${pending}`) : '' })}
      body={t('halacha.enablePrompt.body')}
      confirmLabel={t('common.yes')}
      cancelLabel={t('common.no')}
      onConfirm={() => {
        close();
        switchHalachaOn();
      }}
      onCancel={close}
    />
  );
}
