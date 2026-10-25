import React, { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useI18n } from '@/i18n';
import { canEnable, useMitzvotStore } from '@/stores/useMitzvotStore';
import { canEnableNotices, useUserStore, type NoticeTopic } from '@/stores/useUserStore';

const MITZVAH_BODY = 'mitzvah.needsReminder.body';
const NOTICES_BODY = 'notices.needsReminder.body';

export function useNeedsReminderDialog(): {
  ask: (onSettings: () => void) => void;
  setMitzvahEnabled: (id: string, enabled: boolean, onSettings: () => void) => void;
  setNoticesEnabled: (topic: NoticeTopic, enabled: boolean, onSettings: () => void) => void;
  dialog: React.ReactElement;
} {
  const { t } = useI18n();
  const [onSettings, setOnSettings] = useState<(() => void) | null>(null);
  const [body, setBody] = useState(MITZVAH_BODY);
  const open = (next: () => void, bodyKey: string) => {
    setBody(bodyKey);
    setOnSettings(() => next);
  };
  const ask = (next: () => void) => open(next, MITZVAH_BODY);
  const setMitzvahEnabled = (id: string, enabled: boolean, next: () => void) => {
    if (enabled && !canEnable(id)) ask(next);
    else useMitzvotStore.getState().setEnabled(id, enabled);
  };
  const setNoticesEnabled = (topic: NoticeTopic, enabled: boolean, next: () => void) => {
    if (enabled && !canEnableNotices(topic)) {
      open(next, NOTICES_BODY);
      return;
    }
    const user = useUserStore.getState();
    if (topic === 'hilulot') user.setHilulotEnabled(enabled);
    else user.setRoshChodeshEnabled(enabled);
  };
  const dialog = (
    <ConfirmDialog
      visible={onSettings !== null}
      title={t('mitzvah.needsReminder.title')}
      body={t(body)}
      confirmLabel={t('mitzvah.needsReminder.settings')}
      onConfirm={() => {
        const action = onSettings;
        setOnSettings(null);
        action?.();
      }}
      onCancel={() => setOnSettings(null)}
    />
  );
  return { ask, setMitzvahEnabled, setNoticesEnabled, dialog };
}
