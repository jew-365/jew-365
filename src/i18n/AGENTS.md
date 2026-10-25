# AGENTS.md

## Purpose

- Own translation dictionaries and locale wrapper behavior.

## Ownership

- [he.json](he.json) is the primary Hebrew dictionary.
- [en.json](en.json) is the English dictionary.
- [index.ts](index.ts) owns `setLocale()`, `translate()`, `t()`, `interpolate()` (the `%{key}` filling `translate()` applies, which the notification planner also applies to a registry reminder body), `formatDate()` and `useI18n()`.
- Translation parity tests live in [__tests__/](__tests__/).

## Local Contracts

- Keep dictionaries flat, with key parity between Hebrew and English.
- Do not replace Hebrew source strings with English.
- Normal route/component copy should use i18n keys rather than local string literals.
- `currentLocale` and `currentGender` track the user store through one subscription, so non-React callers (the notification scheduler) are never a render behind. `useI18n()` returns `{ language, gender, t }`, with `t` bound to the current render's language and gender.
- Gendered copy uses a `.f` sibling key: `translate(scope, options, locale, gender)` reads `<scope>.f` when `gender` is `female` and that key exists in the table, and the base key otherwise. The base key is the masculine or neutral form, so a male, unanswered or neutral case never needs a `.f`. Callers pass the base key and never name a `.f` key. Every `.f` key needs a base key; English `.f` keys repeat the English base text so parity holds.
- Weekday and month names come only from `formatDate(date, pattern, language)`, never from Luxon's `toFormat` or `Intl`. It reads `weekday.long.0`–`6` and `weekday.short.0`–`6` (Sunday first; the Hebrew short names end in the geresh U+05F3, `א׳`, never an ASCII apostrophe) and `month.long.1`–`12` and `month.short.1`–`12` from the dictionaries and the numbers from Luxon's getters. It takes `cccc`, `ccc`, `LLLL`, `LLL`, `d`, `M` and `yyyy`; any other letter run throws and non-letters pass through. A `DateTime` is read in its own zone, a `Date` on the device clock, and an invalid date gives `''`. Luxon builds names from `Intl.DateTimeFormat().formatToParts()`, which Hermes on iOS does not fill, so a `toFormat` name token read "null" on an iPhone in Hebrew (any locale but English; Luxon's own English tables never touch `Intl`); [../../AGENTS.md](../../AGENTS.md) names the scan that forbids one.

## Work Guidance

- Add both Hebrew and English values in the same change.
- Copy that addresses the user in the second person gets a Hebrew `.f` variant; neutral wording needs none.
- Keep app-name and brand strings aligned with [../../app.json](../../app.json) and release docs under [../../release/AGENTS.md](../../release/AGENTS.md).

## Verification

- Run `pnpm test -- src/i18n/__tests__/i18n.test.ts` after any dictionary or locale wrapper change; it pins key parity, non-empty values, the `.f` lookup and interpolation, and that `app.name` matches the native names: `expo.name` and `ios.infoPlist.CFBundleDisplayName` in [../../app.json](../../app.json) and both files in [../../locales/](../../locales), with an Xcode target name that keeps a Latin letter.
- Run `pnpm typecheck` after [index.ts](index.ts) changes.
- Run `pnpm test:tz -- src/i18n/__tests__/i18n.test.ts` after changing `formatDate()` or a weekday or month key.

## Child DOX Index

- No child AGENTS.md files.
