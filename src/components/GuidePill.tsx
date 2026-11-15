import React from 'react';
import { useRouter } from 'expo-router';
import { HeaderPill } from '@/components/ScreenHeader';
import type { GuideTopicId } from '@/data/guide';
import { useI18n } from '@/i18n';

// The guide button of a complex screen's header (spec .claude/specs/discoverability.md, E2): an icon-only pill
// that opens the user guide on the screen's own topic, so help is where the question arises.
export function GuidePill({ topic }: { topic: GuideTopicId }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <HeaderPill
      icon="guide"
      accessibilityLabel={t('guide.pillLabel')}
      onPress={() => router.push({ pathname: '/guide', params: { topic } })}
    />
  );
}
