import React from 'react';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { useI18n } from '@/i18n';
import type { Offer } from '@/utils/offers';

// An offer's two choices (spec .claude/specs/discoverability.md, C3 and C6): its own action, or "don't suggest",
// each of which closes it for good. The sheet's own close button leaves it as it was. Home's offer and the weekly
// report's tip share it.
export function OfferSheet({
  offer,
  visible,
  onClose,
  onChoose,
}: {
  offer: Offer | null;
  visible: boolean;
  onClose: () => void;
  onChoose: (offer: Offer, accepted: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <BottomSheet
      visible={visible && offer !== null}
      title={offer ? t(`offer.${offer.id}.title`) : ''}
      caption={offer ? t(`offer.${offer.id}.body`) : undefined}
      onClose={onClose}
    >
      {offer ? (
        <>
          <SheetAction label={t(`offer.${offer.id}.accept`)} onPress={() => onChoose(offer, true)} />
          <SheetAction label={t('offer.dismiss')} onPress={() => onChoose(offer, false)} />
        </>
      ) : null}
    </BottomSheet>
  );
}
