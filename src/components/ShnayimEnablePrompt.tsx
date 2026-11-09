import React from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useI18n } from '@/i18n';
import { switchShnayimOn } from '@/services/ShnayimContentService';
import { useShnayimStore } from '@/stores/useShnayimStore';

// After a first Shnayim Mikra download while its mitzvah is off: switch it on? (as ChokEnablePrompt does).
export function ShnayimEnablePrompt() {
  const { t } = useI18n();
  const pending = useShnayimStore((s) => s.enablePrompt);
  const close = () => useShnayimStore.getState().setEnablePrompt(false);

  return (
    <ConfirmDialog
      visible={pending}
      title={t('shnayim.enablePrompt.title')}
      body={t('shnayim.enablePrompt.body')}
      confirmLabel={t('common.yes')}
      cancelLabel={t('common.no')}
      onConfirm={() => {
        close();
        switchShnayimOn();
      }}
      onCancel={close}
    />
  );
}
