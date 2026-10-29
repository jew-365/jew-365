# AGENTS.md

## Purpose

- Hold the app's local Expo modules, autolinked from this folder by Expo's autolinking, so native code can ship without a published package.

## Ownership

- [power-settings/](power-settings) is the `PowerSettings` module, Android only: `isIgnoringBatteryOptimizations`, `requestIgnoreBatteryOptimizations`, `openSamsungNeverSleeping`, `unusedAppRestrictionsStatus` and `openUnusedAppRestrictions`. It is native, so it ships only in a build.

## Local Contracts

- JS reaches the module only through [../src/services/deviceSettings.ts](../src/services/deviceSettings.ts) with `requireOptionalNativeModule`, so a binary built before the module gets `null` and the wrapper falls back.
- The root [.gitignore](../.gitignore) ignores only `/android/` and `/ios/`; the `android/` folder inside a module is tracked source.
- The module declares no permission of its own: `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` is in `android.permissions` of [../app.json](../app.json).

## Work Guidance

- Mirror an Expo module such as `expo-haptics`: `expo-module.config.json`, `android/build.gradle` with `expo-module-gradle-plugin`, the Kotlin module under `android/src/main/java`.
- A change here needs a build, never an update; [../.claude/skills/android-native-verify/native.ps1](../.claude/skills/android-native-verify/native.ps1) treats `modules/` as native.

## Verification

- `pnpm exec expo-modules-autolinking search --platform android` lists `power-settings`, and `pnpm exec expo-modules-autolinking resolve --platform android` lists `PowerSettingsModule`.
- Then a prebuild and a build (`pnpm prebuild:clean`, an EAS or local Android build).

## Child DOX Index

- No child AGENTS.md files.
