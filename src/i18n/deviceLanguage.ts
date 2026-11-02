import { I18nManager, Platform, Settings } from 'react-native';
import type { Language } from '@/stores/useUserStore';

// Core react-native APIs only: this ships over the air to installed binaries that carry no new native module.
function candidates(): unknown[] {
  if (Platform.OS === 'web') {
    return typeof navigator === 'undefined' ? [] : [navigator.languages?.[0], navigator.language];
  }
  const locale = I18nManager.getConstants?.().localeIdentifier;
  if (Platform.OS !== 'ios') return [locale];
  const preferred: unknown = Settings.get('AppleLanguages');
  return [Array.isArray(preferred) ? preferred[0] : undefined, locale];
}

export function deviceLanguage(): Language {
  try {
    const found = candidates().find((c): c is string => typeof c === 'string' && c !== '');
    if (!found) return 'he';
    const code = found.toLowerCase().split(/[-_]/)[0];
    if (!code) return 'he';
    return code === 'he' || code === 'iw' ? 'he' : 'en';
  } catch {
    return 'he';
  }
}
