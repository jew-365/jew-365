import React from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { HALACHA_BOOKS } from '@/data/halacha';
import { useI18n } from '@/i18n';
import { switchHalachaOn } from '@/services/HalachaContentService';
import { HALACHA_STORES } from '@/stores/useHalachaStore';

// After a first download of a halacha book while its mitzvot are off: switch them on? (as ChokEnablePrompt does).
export function HalachaEnablePrompt() {
  const { t } = useI18n();
  const asking = [
    HALACHA_STORES.kitzur((s) => s.enablePrompt),
    HALACHA_STORES.ben_ish_chai((s) => s.enablePrompt),
    HALACHA_STORES.rambam((s) => s.enablePrompt),
    HALACHA_STORES.chafetz_chaim((s) => s.enablePrompt),
  ];
  const pending = HALACHA_BOOKS.find((_, i) => asking[i]);
  const close = () => {
    if (pending) HALACHA_STORES[pending].getState().setEnablePrompt(false);
  };

  return (
    <ConfirmDialog
      visible={Boolean(pending)}
      title={t('halacha.enablePrompt.title', { book: pending ? t(`halacha.book.${pending}`) : '' })}
      body={t(pending === 'chafetz_chaim' ? 'halacha.enablePrompt.bodyLashonHara' : 'halacha.enablePrompt.body')}
      confirmLabel={t('common.yes')}
      cancelLabel={t('common.no')}
      onConfirm={() => {
        close();
        if (pending) switchHalachaOn(pending);
      }}
      onCancel={close}
    />
  );
}
