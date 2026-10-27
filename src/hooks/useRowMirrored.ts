import { I18nManager, Platform } from 'react-native';
import { useI18n } from '@/i18n';

export function useRowMirrored(): boolean {
  const { language } = useI18n();
  return Platform.OS === 'web' ? language === 'he' : I18nManager.isRTL;
}
