# AGENTS.md

## Purpose

- Own the first-run onboarding flow for welcome, profile, nusach, mitzvot, location setup, the permissions step, and ready state.

## Ownership

- [index.tsx](index.tsx) owns the onboarding entry route. Under the full [AppLogo](../../components/AppLogo.tsx) mark (112 points) it shows the app name (`onboarding.welcomeTitle`) and its tagline (`onboarding.welcomeBody`), then the smaller registration heading (`onboarding.registerTitle`, gender-aware) with `onboarding.registerBody` above the name and phone fields. Under Continue, off web, `onboarding.restore` picks a backup file and restores it with no confirmation (there is nothing to lose yet) through `restoreBackup(backup, { reload: false })`, then asks for notification permission and rebuilds once granted, and only then calls `reloadIfScaleChanged()`: a restored display size reloads the app after that follow-up, never inside the restore, which would cut it short; the restored profile is onboarded, so the root layout's guard moves to home. A rejected file shows its `backupFailureKey()` message. The registration heading, body and fields sit on a padded [Card](../../components/Card.tsx).
- [profile.tsx](profile.tsx) owns the second step: gender, marital status, and the opt-in to taharat hamishpacha tracking. Choosing a gender goes through `chooseGender()`, which also sets the library defaults for it (no tefillin for a woman) and the starting palette (`paletteForGender()`: gold for a man, pink for a woman, plum or dark inside a dark palette), so the step never writes the mitzvot store or the theme itself and the palette follows the gender chosen here.
- [mitzvot.tsx](mitzvot.tsx) owns the fourth step, between nusach and location.
  - **Content:** `onboarding.mitzvot.title` and `onboarding.mitzvot.hint` over a `ScrollView` holding [MitzvahLibraryList](../../components/MitzvahLibraryList.tsx) with neither `showMine` nor `navigable`. It lists the registry mitzvot of the nusach chosen a step earlier (Chok LeYisrael only once its add-on is installed), with the defaults `chooseGender()` set on the profile step, plus the hilulot and Rosh Chodesh rows and the at-least-one-reminder rule. It opens no screen outside onboarding and has no add button.
  - **Continue** pushes `/onboarding/location`, or goes back when the ready step opened the step (`from=ready`).
  - **Existing users:** an onboarded user never sees it, because the root layout's guard sends every onboarding route home.
- The location step shows the default city with `settings.locationStatus.missing` until GPS or a city chip confirms it; the status never reads "ready" for a guess.
- [permissions.tsx](permissions.tsx) owns the sixth step, after location: `onboarding.permissionsTitle` and `onboarding.permissionsBody` over a `ScrollView` holding [PermissionsList](../../components/PermissionsList.tsx), then the dots and a Continue that is never disabled and pushes `/onboarding/ready`.
- [nusach.tsx](nusach.tsx), [location.tsx](location.tsx), and [ready.tsx](ready.tsx) own their respective onboarding steps. The nusach step's Continue pushes `/onboarding/mitzvot`, the location step's `/onboarding/permissions`. The ready step's mark is an [IconTile](../../components/IconTile.tsx) (`check`, size 64), never a text glyph. It also lists what the app will remind about: the names of the enabled mitzvot of `useDayModel()` (filtered by nusach, localized by `nameFor()`, joined with " · ") under `onboarding.readyList`. Its link `onboarding.readyEdit` pushes `/onboarding/mitzvot` with `from=ready`, because `/mitzvot` is outside onboarding and the guard would send a user who is not onboarded yet back to the welcome step.
- Every step draws its progress with [OnboardingDots](../../components/OnboardingDots.tsx) and `ONBOARDING_STEPS`; a new step raises that constant and shifts the later steps' indexes (seven: welcome 0, profile 1, nusach 2, mitzvot 3, location 4, permissions 5, ready 6). Where a step's list `ScrollView` sits right above the dots (welcome, profile, nusach and mitzvot), the dots take `marginTop: spacing.lg` and the list's content container `paddingBottom: spacing.lg`, so a scrolling row never sits flush against them (the user's call, 2026-10-26).

## Local Contracts

- Onboarding state is stored through [../../stores/AGENTS.md](../../stores/AGENTS.md).
- Continue on the profile step stays disabled until a gender and a marital status are both chosen. The status label follows the gender, the key `profile.maritalStatus.<status>.<gender>`, with `neutral` in place of the gender until one is chosen. The opt-in card shows only while `taharahOffered()` holds, so a single user never sees it. The gender, the marital status, the tracking switch and the nusach choice go through [taharahOptIn.ts](../../stores/taharahOptIn.ts) (`chooseGender`, `chooseMaritalStatus`, `setTaharahTracking`, `chooseNusach`), never straight to the stores: choosing single while tracking is on switches it off; switching tracking on sets the taharah role from the gender and the preset from the nusach chosen so far; changing the gender while tracking is on updates the role; picking a nusach with tracking on adopts its preset. The guard that protects a worked preset lives in `useTaharahStore` (no events and rules identical to the current preset's), so a later nusach pick never overwrites a recorded cycle or a hand-edited rule.
- `chooseGender()` also sets `siddurVoice` to the gender chosen on every change of gender, the first answer included; choosing the same gender again keeps a voice chosen in Settings. The step has no voice control of its own.
- Location and permission behavior must use [../../services/AGENTS.md](../../services/AGENTS.md) wrappers.
- Continue on the location step stays disabled (dimmed, `accessibilityState.disabled`) while `locationStatus` is not `ready`, with `onboarding.locationRequired` under it: the default city is a guess, so the step cannot be passed until a GPS fix or a city chip writes `ready`.
- User-facing copy must stay in [../../i18n/AGENTS.md](../../i18n/AGENTS.md).

## Work Guidance

- Keep permission explanations accurate to [../../../app.json](../../../app.json) native permission strings and actual behavior.
- Do not assume Expo Go can verify native notification/MMKV behavior.
- The mitzvot step's rows are the shared [MitzvahLibraryList](../../components/MitzvahLibraryList.tsx), never [ChoiceRow](../../components/ChoiceRow.tsx) or a local list.
- A selectable option on a step is [ChoiceRow](../../components/ChoiceRow.tsx), as the profile and nusach steps use it, each set inside a `radiogroup` view named by its heading (`profile.gender`, `profile.maritalStatus`, `onboarding.nusachTitle`); the location step's city picker is [ChipRow](../../components/ChipRow.tsx). No step hand-rolls either.
- Every step's Continue, the ready step's finish and the location refresh are the shared [Button](../../components/Button.tsx), disabled through its `disabled` prop; An accent card (the taharah opt-in) is `goldLight` with no border. The labels above the welcome fields and the profile's two choice groups are `field` [SectionLabel](../../components/SectionLabel.tsx)s.

## Verification

- Run `pnpm test -- src/app/__tests__/routes.test.ts` after onboarding route changes.
- Run `pnpm test -- src/app/__tests__/onboarding` after a step's layout, navigation or list changes.
- Run `pnpm test -- src/i18n/__tests__/i18n.test.ts` after onboarding copy changes.
- Run `pnpm typecheck` after onboarding state or service changes.

## Child DOX Index

- No child AGENTS.md files.
