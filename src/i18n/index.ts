import { useCallback } from 'react';
import { DateTime } from 'luxon';
import { useUserStore, type Gender } from '@/stores/useUserStore';
import heTable from './he.json';
import enTable from './en.json';

export type AppLanguage = 'he' | 'en';

type Dict = Record<string, string>;
const tables: Record<AppLanguage, Dict> = {
  he: heTable as Dict,
  en: enTable as Dict,
};

const defaultLocale: AppLanguage = 'he';
let currentLocale: AppLanguage = useUserStore.getState().language;
let currentGender: Gender | null = useUserStore.getState().gender;

export function setLocale(language: AppLanguage): void {
  currentLocale = language;
}

// Non-React callers (the notification scheduler, most of all) read `currentLocale` and `currentGender`
// directly, so they have to track the store rather than wait for a component effect to push them.
useUserStore.subscribe((state) => {
  setLocale(state.language);
  currentGender = state.gender;
});

export function interpolate(str: string, options?: Record<string, unknown>): string {
  if (!options) return str;
  return str.replace(/%\{(\w+)\}/g, (_, key) => (options[key] !== undefined ? String(options[key]) : `%{${key}}`));
}

// A female user reads `<scope>.f` when the table has one; every other case reads the base key.
function lookup(locale: AppLanguage, scope: string, gender: Gender | null): string | undefined {
  const table = tables[locale];
  const feminine = gender === 'female' ? table?.[`${scope}.f`] : undefined;
  return typeof feminine === 'string' ? feminine : table?.[scope];
}

export function translate(
  scope: string,
  options?: Record<string, unknown>,
  locale: AppLanguage = currentLocale,
  gender: Gender | null = currentGender,
): string {
  const primary = lookup(locale, scope, gender);
  if (typeof primary === 'string') return interpolate(primary, options);
  const fallback = lookup(defaultLocale, scope, gender);
  if (typeof fallback === 'string') return interpolate(fallback, options);
  return `[missing "${locale}.${scope}" translation]`;
}

export function t(scope: string, options?: Record<string, unknown>): string {
  return translate(scope, options, currentLocale, currentGender);
}

const DATE_TOKEN = /([A-Za-z])\1*/g;

export function formatDate(date: Date | DateTime, pattern: string, language: AppLanguage): string {
  const value = date instanceof Date ? DateTime.fromJSDate(date) : date;
  if (!value.isValid) return '';
  const name = (scope: string) => translate(scope, undefined, language, null);
  return pattern.replace(DATE_TOKEN, (token) => {
    switch (token) {
      case 'cccc':
        return name(`weekday.long.${value.weekday % 7}`);
      case 'ccc':
        return name(`weekday.short.${value.weekday % 7}`);
      case 'LLLL':
        return name(`month.long.${value.month}`);
      case 'LLL':
        return name(`month.short.${value.month}`);
      case 'd':
        return String(value.day);
      case 'M':
        return String(value.month);
      case 'yyyy':
        return String(value.year);
      default:
        throw new Error(`Unsupported date token "${token}"`);
    }
  });
}

export function useI18n() {
  const language = useUserStore((s) => s.language);
  const gender = useUserStore((s) => s.gender);
  // Bound to this render's language and gender, so a switch cannot render one frame of stale copy,
  // and `useMemo`s keyed on `t` actually refresh.
  const boundT = useCallback(
    (scope: string, options?: Record<string, unknown>) => translate(scope, options, language, gender),
    [language, gender],
  );
  return { language, gender, t: boundT };
}
